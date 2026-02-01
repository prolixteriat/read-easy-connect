<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once 'DbBase.php';
require_once __DIR__ . '/../utils/MFAService.php';
require_once __DIR__ . '/../utils/mailer.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ServerRequestInterface as Request;
use MFA\MFAService;

# ------------------------------------------------------------------------------

class DbLogin extends DbBase {

    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------
    /* Usage flow:
    1. User submits password reset with token.
    2. If MFA setup required, receives 202 status with QR code data.
    3. User scans QR code and enters verification code.
    4. Frontend calls complete_mfa_setup with code, secret, password, and token.
    5. System verifies MFA code and completes password reset.
    */
    private function check_mfa_requirement(string $email): Status {
        try {
            $sql = 'SELECT mfa_enabled, mfa_secret FROM users WHERE email = :email';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':email' => $email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user && $user['mfa_enabled'] && $user['mfa_secret'] === null) {
                $mfaService = new MFAService();
                $secret = $mfaService->generate_secret();
                $uri = $mfaService->get_provisioning_uri($secret, $email, 
                                                        MFA_LABEL);
                $qrCode = base64_encode($mfaService->generate_qr_code($uri));
                
                $status = new Status(false, 202, ['message' => 'MFA setup required']);
                $status->data = [
                    'mfa_setup_required' => true,
                    'secret' => $secret,
                    'qr_code' => $qrCode,
                    'email' => $email
                ];
                return $status;
            }
            return new Status(true, 200, ['message' => 'No MFA setup required']);
        } catch (Exception $e) {
            $this->logger->error('check_mfa_requirement: ' . $e->getMessage());
            return new Status(false, 500, ['message' => 'Error checking MFA requirement: ' . 
                                $e->getMessage()]);
        }
    }
    # --------------------------------------------------------------------------
    # Mandatory: email, secret, code, password, token
    # Optional : n/a

    public function complete_mfa_setup(Request $request): Status {
        $required_params = ['email', 'secret', 'code', 'password', 'token'];
        $params = $this->sanitise_array($request->getParsedBody());
        $status = $this->validate_params($params, $required_params);
        if (!$status->success) {
            return $status;
        }
        try {
            $mfa_service = new MFAService();
            if (!$mfa_service->verify_code($params['secret'], $params['code'])) {
                return new Status(false, 400, ['message' => 'Invalid MFA code']);
            }
            # Verify the reset token is still valid (without deleting)
            $token_status = $this->validate_reset_token($params['token'], false);
            if (!$token_status->success) {
                return $token_status;
            }

            # Delete the token now that we're completing the process
            $this->delete_reset_token($params['token']);
            # Update user with MFA secret and reset password
            $sql = 'UPDATE users 
                    SET mfa_secret = :secret, password = :password, password_reset = FALSE 
                    WHERE email = :email';
            $stmt = $this->conn->prepare($sql);
            $hash = password_hash($params['password'], PASSWORD_DEFAULT);
            $stmt->execute([
                ':secret' => $params['secret'],
                ':password' => $hash,
                ':email' => $params['email']
            ]);
            $status = new Status(true, 200, ['message' => 'MFA setup completed and password updated successfully. ' .
                                'You can now return to the <a href="' . HOME_URL . 
                                '" class="text-blue-500 hover:text-blue-700 underline">' .
                                'login page</a>.']);
            $this->add_audit(AuditType::OTHER, "MFA setup completed for email: {$params['email']}");
            
        } catch (Exception $e) {
            $this->logger->error('complete_mfa_setup: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error completing MFA setup: ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Mandatory: email
    # Optional: expiry (hrs)

    public function create_reset_token(Request $request): Status {

        $required_params = ['email'];
        $params = $this->sanitise_array($request->getParsedBody());
        $status_params = $this->validate_params($params, $required_params );
        if (!$status_params->success) {
            return $status_params;
        }
        $email = $params['email'];
        try {
            $this->logger->info('create password reset token attempt: ' . $email);
            # Ensure email address exists and is not a Coach
            $account = $this->run_query_param(
                'SELECT user_id, role FROM users WHERE email=:param', $email);
            if (!$account || ($account['role'] === 'coach' )) {
                # Don't return 404 to avoid email address discovery
                return new Status(true, 200, ['message' => '']);
            }
            # Use default expiry of 1hr if not supplied
            $expiry = isset($params['expiry']) ? (int)$params['expiry'] : 1;
            $token = $this->make_token($email, $expiry);
            $mailer = new Mailer();
            $mailer->send_reset($email, $token, $expiry);
            $status = new Status(true, 200, ['message' => '']);
            $this->add_audit(AuditType::OTHER, 
                    "Password reset token created for email: $email");
        } catch (Exception $e) {
            $this->logger->error('password_reset: '. $e->getMessage());
            $status = new Status(false, 500, 
                        ['message' => 'Error occurred (password_reset)' . $e->getMessage()]);
        }
        return $status;
    }
    # --------------------------------------------------------------------------

    public function make_token(string $email, int $expiry): string {
        # Generate URL-safe token
        $token = random_bytes(32);
        $token = rtrim(strtr(base64_encode($token), '+/', '-_'), '=');
        $token_hash = password_hash($token, PASSWORD_DEFAULT);
        $sql = 'INSERT INTO password_reset (email, token, expiry) 
                VALUES (:email, :token, DATE_ADD(NOW(), INTERVAL :expiry HOUR))';
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            throw new Exception('Failed to prepare password reset token query');
        }
        $result = $stmt->execute([
            ':email' => $email,
            ':token' => $token_hash,
            ':expiry' => $expiry,
        ]);
        if (!$result) {
            throw new Exception('Failed to insert password reset token');
        }
        return $token;
    } 
    # --------------------------------------------------------------------------

    private function delete_reset_token(string $token): void {
        try {
            $sql = 'SELECT token FROM password_reset WHERE expiry > NOW()';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($records as $record) {
                if (password_verify($token, $record['token'])) {
                    $sql = 'DELETE FROM password_reset WHERE token = :token';
                    $delete = $this->conn->prepare($sql);
                    $delete->execute([':token' => $record['token']]);
                    break;
                }
            }
        } catch (Exception $e) {
            $this->logger->error('delete_reset_token: ' . $e->getMessage());
        }
    }
    # --------------------------------------------------------------------------
    # Mandatory: token
    # Optional : n/a

    public function get_reset_form(Request $request): Status {

        $required_params = ['token', 'csp_nonce'];
        $params = $this->sanitise_array($request->getQueryParams());
        $status = $this->validate_params($params, $required_params );
        if (!$status->success) {
            return $status;
        }
        $html = get_password_reset_form($params['token'], $params['csp_nonce']);
        $status = new Status(true, 200, ['message' => 'Reset form']);
        $status->data = $html;
        return $status;
    }   
    # --------------------------------------------------------------------------
    # Mandatory: token
    # Optional : n/a

    public function is_valid_token(Request $request): Status {
        $required_params = ['token'];
        $params = $this->sanitise_array($request->getParsedBody());
        $status = $this->validate_params($params, $required_params);
        if (!$status->success) {
            return $status;
        }
        
        return $this->validate_token($request);
    }
    # ----------------------------------------------------------------------
    # Mandatory: email, password
    # Optional : mfa_code

    public function login(Request $request): Status {
        
        $required_params = ['email', 'password'];
        $params = $this->sanitise_array($request->getParsedBody());
        $status_params = $this->validate_params($params, $required_params );
        if (!$status_params->success) {
            return $status_params;
        }
        $email = $params['email'];
        $password = $params['password'];
        $mfa_code = $params['mfa_code'] ?? null;
        
        try {
            $this->logger->info('login attempt: ' . $email);
            # Rate limit check (progressive backoff)
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $attempt_info = get_attempts($this->conn, $ip, $email);
            if ($attempt_info) {
                $delay = calculate_delay((int)$attempt_info['attempts']);
                $elapsed = time() - strtotime($attempt_info['last_attempt']);
                if ($elapsed < $delay) {
                    $wait = $delay - $elapsed;
                    $msg = "Too many failed attempts. Try again in {$wait} seconds";
                    $status = new Status(false, 429, ['message' => $msg]);
                    return $status;
                }
            }
            
            $sql = 'SELECT user_id, password, password_reset, disabled, role, mfa_enabled, mfa_secret
                    FROM users 
                    WHERE email = :email';

            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare login query');
            }
            $stmt->execute([':email' => $email]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($row) {
                if (password_verify($password, $row['password'])) {
                    if ((int)$row['disabled'] === 1) {
                        $status = new Status(false, 403, ['message' => 'Account is disabled']);
                    } else {
                        clear_fail($this->conn, $ip, $email);
                        # Check MFA requirements
                        if ($row['mfa_enabled'] && $row['mfa_secret']) {
                            if (!$mfa_code) {
                                $status = new Status(false, 202, ['message' => 'mfa_required']);
                            } else {
                                $mfaService = new MFAService();
                                if ($mfaService->verify_code($row['mfa_secret'], $mfa_code)) {
                                    $token = $this->create_jwt($row['user_id'], $email, $row['role']);
                                    $status = new Status(true, 200, ['token' => $token]);
                                    $this->add_audit(AuditType::LOGIN, $email, $row['user_id']);
                                } else {
                                    $status = new Status(false, 401, ['message' => 'Invalid MFA code']);
                                }
                            }
                        } else {
                            $token = $this->create_jwt($row['user_id'], $email, $row['role']);
                            $status = new Status(true, 200, ['token' => $token]);
                            $status->data = $token;
                            $this->add_audit(AuditType::LOGIN, $email, $row['user_id']);
                        }
                    }
                } else {
                    # Wrong password
                    $this->logger->warning('login: Incorrect password for ' . $email);
                    $status = new Status(false, 401, 
                        ['message' => 'Failed to login. Please check email and password are correct.']);
                }
            } else {
                # No user found
                $this->logger->warning('login: No user found for ' . $email);
                $status = new Status(false, 401, 
                    ['message' => 'Failed to login. Please check email and password are correct.']);
            }

        } catch (Exception $e) {
            $this->logger->error('login: ' . $e->getMessage());
            $status = new Status(false, 500, 
                ['message' => 'Error occurred (login): ' . $e->getMessage()]);
        }
        if ($status->success) {
            clear_fail($this->conn, $ip, $email);
        } else {
            record_fail($this->conn, $ip, $email);
        }
        return $status;
    }        
    # ----------------------------------------------------------------------
    # Mandatory: n/a
    # Optional : n/a
    
    public function logout(Request $request): Status {

        $status = $this->validate_token($request);
        if (!$status->success) { 
            return $status; 
        }
        try {
            $sql = 'UPDATE users
                    SET last_logout = NOW()
                    WHERE user_id = :user_id';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':user_id' => $this->user_id]);            
            $status = new Status(true, 200, ['message' => "User logged out: $this->email"]);
            $this->add_audit(AuditType::LOGOUT, $this->email, $this->user_id);            
        } catch (Exception $e) {
            $this->logger->error('logout: ' . $e->getMessage());
            $status = new Status(false, 500, 
                ['message' => 'Error occurred (logout): ' . $e->getMessage()]);
        }        
        return $status;
    }
    # --------------------------------------------------------------------------
    # Mandatory: token
    # Optional : n/a

    public function password_reset(Request $request): Status {
        $required_params = ['token', 'csp_nonce'];
        $raw_params = $request->getQueryParams();
        $raw_params['csp_nonce'] = $request->getAttribute('csp_nonce');
        $params = $this->sanitise_array($raw_params);        
        $status = $this->validate_params($params, $required_params);
        if (!$status->success) {
            return $status;
        }
        
        $token_status = $this->validate_reset_token($params['token'], false);
        if (!$token_status->success) {
            $data = json_decode($token_status->message, true);
            $msg = $data['message'] ?? 'Failed to validate token';
            $token_status->data = $msg;
            return $token_status;
        }
        
        $html = get_password_reset_form($params['token'], $params['csp_nonce']);
        $status = new Status(true, 200, ['message' => 'Password reset form']);
        $status->data = $html;
        return $status;
    }
    # --------------------------------------------------------------------------
    # Mandatory: password, token
    # Optional : n/a

    public function submit_reset(Request $request): Status {
        try{
            $required_params = ['password', 'token'];
            $params = $this->sanitise_array($request->getParsedBody());
            $status = $this->validate_params($params, $required_params );
            if (!$status->success) {
                return $status;
            }
            
            # Validate password strength
            if (!is_valid_password($params['password'])) {
                return new Status(false, 400, ['message' => 'Password does not meet complexity requirements']);
            }
            $status = $this->validate_reset_token($params['token'], false);
            if ($status->success) {
                $email = $status->data;
                $mfa_status = $this->check_mfa_requirement($email);
                if ($mfa_status->code === 202) {
                    # MFA setup required - don't delete token yet
                    return $mfa_status;
                }
                # No MFA required - delete token and update password
                $this->delete_reset_token($params['token']);
                $status = $this->update_password($email, $params['password']);
            }
        } catch (Exception $e) {
            $this->logger->error('submit_reset: ' . $e->getMessage());
            $status = new Status(false, 500, 
                    ['message' => 'Error occurred (submit_reset): '. $e->getMessage()]);
        }
        return $status;
    } 
    # --------------------------------------------------------------------------

    private function update_password(string $email, string $password): Status {  
        try {
            if (!is_valid_password($password)) {
                $status = new Status(false, 400, 
                            ['message' => 'Password does not meet complexity requirements']);
            } else {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $sql = 'UPDATE users 
                        SET password = :password, password_reset = FALSE
                        WHERE email = :email';
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([
                    ':password' => $hash,
                    ':email'    => $email,
                ]);
                $status = new Status(true, 200, ['message' => 'Password updated successfully. ' .
                                'You can now return to the <a href="' . HOME_URL . 
                                '" class="text-blue-500 hover:text-blue-700 underline">' .
                                'login page</a>.']);
                $this->add_audit(AuditType::PASSWORD_RESET, "Password reset for email: $email");
            }

        } catch (Exception $e) {
            $this->logger->error('update_password: ' . $e->getMessage());
            $status = new Status(false, 500, 
                    ['message' => 'Error occurred (update_password): '. $e->getMessage()]);
        }
        return $status;
    }   
   
    # --------------------------------------------------------------------------

    private function validate_reset_token(string $token, bool $delete_token = true): Status {
        try {
            # Rate limit check (progressive backoff)
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $attempt_info = get_attempts($this->conn, $ip, $token);
            if ($attempt_info) {
                $delay = calculate_delay((int)$attempt_info['attempts']);
                $elapsed = time() - strtotime($attempt_info['last_attempt']);
                if ($elapsed < $delay) {
                    $wait = $delay - $elapsed;
                    $msg = "Too many failed attempts. Try again in {$wait} seconds";
                    $status = new Status(false, 429, ['message' => $msg]);
                    return $status;
                }
            }
            # Select all unexpired records
            $sql = 'SELECT email, token, expiry 
                    FROM password_reset 
                    WHERE expiry > NOW() 
                    ORDER BY expiry DESC 
                    LIMIT 100';
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare password reset validation query');
            }
            $result = $stmt->execute();
            if (!$result) {
                throw new Exception('Failed to execute password reset validation query');
            }
            $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if ($records === false) {
                throw new Exception('Failed to fetch password reset records');
            }
            $status = new Status(false, 401, ['message' => 'Token is invalid']);
            if ($records) {
                foreach ($records as $record) {
                    if (password_verify($token, $record['token'])) {
                        if ($delete_token) {
                            $this->delete_reset_token($token);
                        }
                        $status = new Status(true, 200, ['message' => 'Token is valid']);
                        $status->data = $record['email'];
                        break;
                    }
                }
            }
        } catch (Exception $e) {
            $this->logger->error('validate_reset_token: ' . $e->getMessage());
            $status = new Status(false, 500, 
                    ['message' => 'Error validating reset token: '. $e->getMessage()]);
        }
        if ($status->success) {
            clear_fail($this->conn, $ip, $token);
        } else {
            record_fail($this->conn, $ip, $token);
        }        
        return $status;
    } 
    # --------------------------------------------------------------------------
}
# ------------------------------------------------------------------------------

/*
End
*/
