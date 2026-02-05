<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once 'DbBase.php';
require_once 'DbCoaches.php';
require_once 'DbLogin.php';
require_once __DIR__ . '/../utils/creds.php';
require_once __DIR__ . '/../utils/helper.php';
require_once __DIR__ . '/../utils/ratelimit.php';
require_once __DIR__ . '/../utils/mailer.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------
# Implements user database functionality.

class DbUsers extends DbBase {

    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------
    # Role: admin, director, manager, coordinator
    # Mandatory: first_name, last_name, email, role
    # Optional : affiliate_id, coordinator_id, manager_id, status, skip_email
    
    public function add_user(Request $request): Status {
        try {
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['first_name', 'last_name', 'email', 'role'];
            # Initial check to ensure that 'role' is present
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            # Validate email format
            if (!$this->is_validusername($params['email'])) {
                return new Status(false, 400, ['message' => 'Invalid email format']);
            }
            
            # Validate name lengths
            if (strlen($params['first_name']) > 50 || strlen($params['last_name']) > 50) {
                return new Status(false, 400, ['message' => 'Names must be 50 characters or less']);
            }
            
            if (empty(trim($params['first_name'])) || empty(trim($params['last_name']))) {
                return new Status(false, 400, ['message' => 'First name and last name cannot be empty']);
            }
            
            # Check if email already exists
            $email_check = $this->conn->prepare('SELECT user_id FROM users WHERE email = :email');
            $email_check->execute([':email' => $params['email']]);
            if ($email_check->fetchColumn()) {
                return new Status(false, 409, ['message' => 'Email already exists']);
            }
            
            $role = $params['role'];
            $email = $params['email'];
            $required_roles = [];
            switch ($role) {
                case 'admin':
                    $required_roles[] = 'admin';
                    break;
                case 'director':
                    array_push($required_roles, 'admin', 'director');
                    break;
                case 'manager':
                    array_push($required_roles, 'director', 'manager');
                    # $required_params[] = 'affiliate_id';
                    break;
                case 'coordinator':
                case 'viewer':
                    $required_roles[] = 'manager';
                    break;
                case 'coach':
                    array_push($required_roles, 'manager', 'coordinator');
                    break;
                default:
                    throw new Exception("Invalid role: $role");
            }
            $status = $this->validate_token($request, $required_roles);
            if (!$status->success) { 
                return $status; 
            }
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            $affiliate_id = in_array($this->role, ['manager', 'coordinator']) 
                        ? $this->get_user_affiliate_id($this->user_id, $this->role) 
                        : $params['affiliate_id'];            
            $this->add_base_user($params, $role);
            switch ($role) {
                case 'manager':
                    $manager_id = $this->get_user_id($email);
                    $sql = 'INSERT INTO managers (manager_id, affiliate_id)
                            VALUES (:manager_id, :affiliate_id)';
                    $stmt = $this->conn->prepare($sql);
                    $stmt->execute([
                        ':manager_id'   => $manager_id,
                        ':affiliate_id' => $affiliate_id
                    ]);
                    if (!isset($params['skip_email']) || !$params['skip_email']) {
                        $this->send_invitation_email($email, $role);
                    }
                    break;
                case 'coordinator':
                    $coordinator_id = $this->get_user_id($email);
                    $sql = 'INSERT INTO coordinators (coordinator_id, affiliate_id)
                            VALUES (:coordinator_id, :affiliate_id)';
                    $stmt = $this->conn->prepare($sql);
                    $stmt->execute([
                        ':coordinator_id' => $coordinator_id,
                        ':affiliate_id'   => $affiliate_id
                    ]);
                    if (!isset($params['skip_email']) || !$params['skip_email']) {
                        $this->send_invitation_email($email, $role);
                    }
                    break;
                case 'viewer':
                    $viewer_id = $this->get_user_id($email);
                    $sql = 'INSERT INTO viewers (viewer_id, affiliate_id)
                            VALUES (:viewer_id, :affiliate_id)';
                    $stmt = $this->conn->prepare($sql);
                    $stmt->execute([
                        ':viewer_id'    => $viewer_id,
                        ':affiliate_id' => $affiliate_id
                    ]);
                    if (!isset($params['skip_email']) || !$params['skip_email']) {
                        $this->send_invitation_email($email, $role);
                    }
                    break;
                case 'coach':
                    $coach_id = $this->get_user_id($email);
                    $sql = 'INSERT INTO coaches (coach_id, coordinator_id, affiliate_id)
                            VALUES (:coach_id, :coordinator_id, :affiliate_id)';
                    $stmt = $this->conn->prepare($sql);
                    $stmt->execute([
                        ':coach_id'       => $coach_id,
                        ':coordinator_id' => $params['coordinator_id'] ?? null,
                        ':affiliate_id'   => $affiliate_id
                    ]);                    
                    break;
                case 'admin':
                case 'director':
                    break;
                default:
                    throw new Exception("Invalid role: $role");
            }
            $new_user_id = $this->get_user_id($email);
            $description = "User added ($role): $email";
            $status = new Status(true, 200, ['user_id' => $new_user_id]);
            $this->add_audit(AuditType::USER_ADDED, $description, $this->user_id, 
                    $affiliate_id, $new_user_id);
            
        } catch (Exception $e) {
            $this->logger->error('add_user: ' . $e->getMessage());
            $status = new Status(false, 500, 
                        ['message' => 'Error occurred (add_user): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
     
    private function add_base_user(array $params, string $role): void {

        $sql = 'INSERT INTO users (first_name, last_name, email, password, role, status) 
                VALUES (:first_name, :last_name, :email, :password, :role, :status)';

        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            throw new Exception('Failed to prepare user insert query');
        }
        
        $random_password = bin2hex(random_bytes(16));
        if (strlen($random_password) < 16) {
            throw new Exception('Failed to generate secure random password');
        }
        
        $result = $stmt->execute([
            ':first_name' => $params['first_name'],
            ':last_name'  => $params['last_name'],
            ':email'      => $params['email'],
            ':password'   => password_hash($random_password, PASSWORD_DEFAULT), 
            ':role'       => $role,
            ':status'     => $params['status'] ?? 'active'
        ]);
        
        if (!$result) {
            throw new Exception('Failed to insert user record');
        }
    }   
    # --------------------------------------------------------------------------
    # Role: admin, director, manager, coordinator
    # Mandatory: user_id
    # Optional : first_name, last_name, disabled, password_reset, status
     
    public function edit_user(Request $request): Status {
        try {
            $status = $this->validate_token($request, 
                    ['admin', 'director', 'manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['user_id'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            # Validate user_id is numeric and positive
            if (!is_numeric($params['user_id']) || $params['user_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid user_id']);
            }
            
            $user_id = (int)$params['user_id'];
            $this->is_allowed_change($this->user_id, $user_id);
            $sql = 'SELECT disabled, password_reset, status, role, email, 
                        first_name, last_name 
                   FROM users 
                   WHERE user_id = :user_id 
                   LIMIT 1';
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':user_id', $user_id);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            $disabled = $params['disabled'] ?? $result['disabled'];
            $password_reset = $params['password_reset'] ?? $result['password_reset'];
            $user_status = $params['status'] ?? $result['status'];
            $new_email = $result['email'];
            $first_name = $params['first_name'] ?? $result['first_name'];
            $last_name = $params['last_name'] ?? $result['last_name'];

            # Set disabled = TRUE when any user status changes to 'leaver'
            if ($user_status === 'leaver' && $result['status'] !== 'leaver') {
                $disabled = TRUE;
                # Check if coach is being changed to leaver status
                if ($result['role'] === 'coach') {
                    $new_email = "REDACTED_{$user_id}";
                    # Redact coach personal data
                    $db_coaches = new DbCoaches();
                    $db_coaches->redact($user_id);
                }                
            }

            $sql = 'UPDATE users
                    SET disabled = :disabled,
                        password_reset = :password_reset,
                        status = :status,
                        email = :email,
                        first_name = :first_name,
                        last_name = :last_name
                    WHERE user_id = :user_id';
            $stmt = $this->conn->prepare($sql);                    
            $stmt->execute([
                ':disabled'       => (int)$disabled,
                ':password_reset' => (int)$password_reset,
                ':status'         => $user_status,
                ':email'          => $new_email,
                ':first_name'     => $first_name,
                ':last_name'      => $last_name,
                ':user_id'        => $user_id
            ]);
            
            $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
            $this->add_audit(AuditType::USER_EDITED, "User edited: ID {$user_id}", 
                        $this->user_id, $user_affiliate, $user_id);
            
            if ($result['status'] !== $user_status) {
                $this->add_audit(AuditType::STATUS_CHANGE, 
                    "Status changed from '{$result['status']}' to '{$user_status}' for user ID {$user_id}", 
                    $this->user_id, $user_affiliate, $user_id);
            }
            $status = new Status(true, 200, ['message' => 'User edited']);
            
        } catch (Exception $e) {
            $this->logger->error('edit_user: ' . $e->getMessage());
            $status = new Status(false, 500, 
                        ['message' => 'Error occurred (edit_user): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: admin, director, manager, coordinator
    # Mandatory: n/a
    # Optional : n/a
     
    public function get_users(Request $request): Status {
        try {
            $status = $this->validate_token($request, 
                ['admin', 'director', 'manager', 'coordinator', 'coach', 'viewer']);
            if (!$status->success) { 
                return $status; 
            }
            $users = [];
            $user_fields = 'u.user_id, u.first_name, u.last_name, ' . 
                            'u.email, u.disabled, u.role, u.status';
            if (in_array($this->role, ['admin', 'director'])) {
            # Admins and directors see all users
                $stmt = $this->conn->prepare("
                    SELECT 
                        $user_fields,
                        COALESCE(
                            cntr.affiliate_id,       
                            mngr.affiliate_id,       
                            v.affiliate_id,
                            coach_cntr.affiliate_id  
                        ) AS affiliate_id
                    FROM users u
                    LEFT JOIN coordinators cntr 
                        ON u.user_id = cntr.coordinator_id
                    LEFT JOIN managers mngr
                        ON u.user_id = mngr.manager_id
                    LEFT JOIN viewers v
                        ON u.user_id = v.viewer_id
                    LEFT JOIN coaches c
                        ON u.user_id = c.coach_id
                    LEFT JOIN coordinators coach_cntr
                        ON c.coordinator_id = coach_cntr.coordinator_id
                ");
                $stmt->execute();
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            } elseif ($this->role === 'manager') {
                # Managers see users linked by their affiliate (coordinators, viewers and coaches) + themselves
                $stmt = $this->conn->prepare("
                    SELECT 
                        $user_fields,
                        COALESCE(
                            cntr.affiliate_id,       -- coordinator
                            mngr.affiliate_id,       -- manager
                            v.affiliate_id,          -- viewer
                            c.affiliate_id           -- coach direct affiliate
                        ) AS affiliate_id
                    FROM users u
                    LEFT JOIN coordinators cntr 
                        ON u.user_id = cntr.coordinator_id
                    LEFT JOIN managers mngr
                        ON u.user_id = mngr.manager_id
                    LEFT JOIN viewers v
                        ON u.user_id = v.viewer_id
                    LEFT JOIN coaches c
                        ON u.user_id = c.coach_id
                    WHERE COALESCE(
                            cntr.affiliate_id,
                            mngr.affiliate_id,
                            v.affiliate_id,
                            c.affiliate_id
                        ) = (
                            -- get the affiliate_id for the target user
                            SELECT COALESCE(
                                cntr2.affiliate_id,
                                mngr2.affiliate_id,
                                v2.affiliate_id,
                                c2.affiliate_id
                            )
                            FROM users u2
                            LEFT JOIN coordinators cntr2 
                                ON u2.user_id = cntr2.coordinator_id
                            LEFT JOIN managers mngr2
                                ON u2.user_id = mngr2.manager_id
                            LEFT JOIN viewers v2
                                ON u2.user_id = v2.viewer_id
                            LEFT JOIN coaches c2
                                ON u2.user_id = c2.coach_id
                            WHERE u2.user_id = :target_user_id
                        )
                        OR u.user_id = :calling_user_id
                ");
                $stmt->execute([
                    'target_user_id' => $this->user_id,
                    'calling_user_id' => $this->user_id                        
                ]);
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            } elseif ($this->role === 'coordinator') {
                # Coordinators see all coaches, viewers and coordinators in their affiliate
                $coordinator_affiliate_id = $this->get_user_affiliate_id($this->user_id, $this->role);
                $stmt = $this->conn->prepare("
                    SELECT $user_fields, c.affiliate_id
                    FROM users u
                    LEFT JOIN coaches c ON u.user_id = c.coach_id
                    WHERE c.coach_id IS NOT NULL AND c.affiliate_id = :affiliate_id1
                    UNION
                    SELECT $user_fields, co.affiliate_id
                    FROM users u
                    LEFT JOIN coordinators co ON u.user_id = co.coordinator_id
                    WHERE co.coordinator_id IS NOT NULL AND co.affiliate_id = :affiliate_id2
                    UNION
                    SELECT $user_fields, v.affiliate_id
                    FROM users u
                    LEFT JOIN viewers v ON u.user_id = v.viewer_id
                    WHERE v.viewer_id IS NOT NULL AND v.affiliate_id = :affiliate_id3
                ");
                $stmt->execute([
                    'affiliate_id1' => $coordinator_affiliate_id,
                    'affiliate_id2' => $coordinator_affiliate_id,
                    'affiliate_id3' => $coordinator_affiliate_id
                ]);
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } elseif (in_array($this->role, ['coach', 'viewer'])) {
                # Coaches and viewers see only their own record
                if ($this->role === 'coach') {
                    $stmt = $this->conn->prepare("
                        SELECT $user_fields, c.affiliate_id
                        FROM users u
                        LEFT JOIN coaches c ON u.user_id = c.coach_id
                        WHERE u.user_id = :user_id
                    ");
                } else { # viewer
                    $stmt = $this->conn->prepare("
                        SELECT $user_fields, v.affiliate_id
                        FROM users u
                        LEFT JOIN viewers v ON u.user_id = v.viewer_id
                        WHERE u.user_id = :user_id
                    ");
                }
                $stmt->execute(['user_id' => $this->user_id]);
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            $status = new Status(true, 200, $users);
            
        } catch (Exception $e) {
            $this->logger->error('get_users: ' . $e->getMessage());
            $status = new Status(false, 500, 
                        ['message' => 'Error occurred (get_users): ' . $e->getMessage()]);
        }
        return $status;
    }
    # --------------------------------------------------------------------------

    private function is_allowed_change(int $master_id, int $slave_id): void {
        # Rule 1: cannot act on self
        if ($master_id === $slave_id) {
            throw new Exception('Cannot make change to self');
        }
        # Get master role
        $stmt = $this->conn->prepare('SELECT role FROM users WHERE user_id = ?');
        $stmt->execute([$master_id]);
        $master_role = $stmt->fetchColumn();
        # Get slave role
        $stmt = $this->conn->prepare('SELECT role FROM users WHERE user_id = ?');
        $stmt->execute([$slave_id]);
        $slave_role = $stmt->fetchColumn();
        if (!$master_role || !$slave_role) {
            throw new Exception('Failed to get role');
        }
        # Rule 2: admin or director can change anyone
        if (in_array($master_role, ['admin', 'director'])) {
            return;
        }
        # Rule 3: manager can change managers, coordinators, viewers or coaches in same affiliate
        if ($master_role === 'manager') {
            if (!in_array($slave_role, ['manager', 'coordinator', 'viewer', 'coach'])) {
                throw new Exception('Role not permitted to make change');
            }
            # get master affiliate
            $stmt = $this->conn->prepare(
                'SELECT affiliate_id FROM managers WHERE manager_id = ?');
            $stmt->execute([$master_id]);
            $master_affiliate = $stmt->fetchColumn();
            if (!$master_affiliate) {
                throw new Exception('Not in same organisation affiliate');
            }
            if ($slave_role === 'manager') {
                $stmt = $this->conn->prepare(
                    'SELECT affiliate_id FROM managers WHERE manager_id = ?');
            } elseif ($slave_role === 'coordinator') {
                $stmt = $this->conn->prepare(
                    'SELECT affiliate_id FROM coordinators WHERE coordinator_id = ?');
            } elseif ($slave_role === 'viewer') { 
                $stmt = $this->conn->prepare(
                    'SELECT affiliate_id FROM viewers WHERE viewer_id = ?');
            } elseif ($slave_role === 'coach') { 
                $stmt = $this->conn->prepare(
                    'SELECT affiliate_id FROM coaches WHERE coach_id = ?');
            } else {
                throw new Exception('Unknown role: ' . $slave_role);
            }
            $stmt->execute([$slave_id]);
            $slave_affiliate = $stmt->fetchColumn();
            if (!$slave_affiliate || $master_affiliate !== $slave_affiliate) {
                throw new Exception('Insufficient organisation authority');
            }
        }
        /*
        # Rule 4: coordinator can only change linked coaches
        if ($master_role === 'coordinator' && $slave_role === 'coach') {
            $stmt = $this->conn->prepare(
                'SELECT COUNT(*) FROM coaches WHERE coach_id = ? AND coordinator_id = ?');
            $stmt->execute([$slave_id, $master_id]);
            if ($stmt->fetchColumn() === 0) {
                throw new Exception('Coach not assigned to Coordinator');
            }            
        }
        */
    }
    # --------------------------------------------------------------------------
    # Role: any
    # Mandatory: n/a
    # Optional : first_name, last_name
     
    public function edit_profile(Request $request): Status {
        try {
            $status = $this->validate_token($request);
            if (!$status->success) { 
                return $status; 
            }
            
            $params = $this->sanitise_array($request->getParsedBody());
            
            $updates = [];
            $bind_params = [':user_id' => $this->user_id];
            
            if (isset($params['first_name'])) {
                $updates[] = 'first_name = :first_name';
                $bind_params[':first_name'] = $params['first_name'];
            }
            
            if (isset($params['last_name'])) {
                $updates[] = 'last_name = :last_name';
                $bind_params[':last_name'] = $params['last_name'];
            }
            
            if (empty($updates)) {
                return new Status(false, 400, ['message' => 'No valid parameters provided']);
            }
            
            $sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE user_id = :user_id';
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare profile update query');
            }
            
            $result = $stmt->execute($bind_params);
            if (!$result) {
                throw new Exception('Failed to execute profile update query');
            }
            
            $status = new Status(true, 200, ['message' => 'Profile updated successfully']);
            
        } catch (Exception $e) {
            $this->logger->error('edit_profile: ' . $e->getMessage());
            $status = new Status(false, 500, 
                        ['message' => 'Error occurred (edit_profile): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    
    private function send_invitation_email(string $email, string $role): void {
        
        $system = MFA_LABEL; 
        $subject = "{$system} Invitation";
        $expiry = 24;
        $salutation = 'Dear ' . ucfirst($role);
        $db = new DbLogin();
        $token = $db->make_token($email, $expiry); 
        $mailer = new Mailer();
        $connect_url = HOME_URL;
        $video_url = LOGIN_VIDEO_URL;
        $reset_url = $mailer->get_reset_url($token);
            $body = "<p>{$salutation},</p>
                <p>You have been invited to join the {$system} system.</p>
                <p>Please click the following link to set your password:
                <a href='{$reset_url}'>set password</a></p>
                <p>This link expires in {$expiry} hours. If you find that the link 
                has expired, you can generate a new link from within 
                <a href='{$connect_url}'>{$system}</a> by selecting <strong>Login</strong>, 
                choosing the <strong>Forgotten password?</strong> option and
                entering your email address ({$email}).</p>
                <p>In addition to your password, you will need to use a multi-factor 
                authenticator (MFA) app such as Google Authenticator or Authy.</p>
                <p>Once you have set your password and configured your authenticator 
                app, please select the <strong>Login</strong> option within 
                <a href='{$connect_url}'>{$system}</a> then enter your email
                address and password.</p>
                <p>If you find that you need additional help, 
                <a href='{$video_url}'>this video</a> demonstrates how to login 
                for the first time.</p>
                <p>Thank you for joining the {$system} system.</p>";

        $success = $mailer->send_email($email, $subject, $body);
        
        if (!$success) {
            throw new Exception("Failed to send review invitation email to: {$email}");
        }
    }
    # --------------------------------------------------------------------------

}
# ------------------------------------------------------------------------------

/*
End
*/
