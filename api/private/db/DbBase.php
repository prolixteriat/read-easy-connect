<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/../utils/creds.php';
require_once __DIR__ . '/../utils/helper.php';

# ------------------------------------------------------------------------------

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use Monolog\Logger;
use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------
# Implements base database functionality (DB connection, JWT management).

class DbBase  {
    # Properties
    protected PDO|null $conn;
    protected Jwt $jwt_factory;
    protected Logger $logger;
    protected string|null $email;
    protected int|null $iat;
    protected string|null $role;
    protected int|null $user_id;
    
    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------

    function __construct() {
        $this->logger = get_logger('DbInterface');
        $this->jwt_factory = new Jwt();
        $this->email = null;
        $this->iat = null;
        $this->role = null;
        $this->user_id = null;
        
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4',
                        DB['host'], DB['dbname']);
        try {
            $this->conn = new PDO(
                $dsn, DB['user'], DB['password'],
                [   PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, 
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,      
                    PDO::ATTR_EMULATE_PREPARES   => false,                 
                ]
            );
        } catch (PDOException $e) {
            $this->logger->error('Database connection failed: ' . $e->getMessage());
            throw new Exception('Database connection failed: ' . $e->getMessage());
        }
    }
    # --------------------------------------------------------------------------

    function __destruct() {
        # Safely close database connection
        $this->conn = null;
    } 
    # --------------------------------------------------------------------------

    protected function add_audit(AuditType $type, string $description, 
                            int|null $user_id=null, int|null $affiliate_id=null, 
                            int|null $performed_on_id=null): bool {
        try {
            $query = '
                INSERT INTO audit (affiliate_id, performed_by_id, performed_on_id, type, description) VALUES 
                (:affiliate_id, :performed_by_id, :performed_on_id, :type, :description)
                ';
            $stmt = $this->conn->prepare($query);
            $status = $stmt->execute([
                ':affiliate_id' => $affiliate_id,
                ':performed_by_id' => $user_id,
                ':performed_on_id' => $performed_on_id,
                ':type' => $type->value,
                ':description' => $description,
            ]);
        } catch (Exception $e) {
            $this->logger->error('add_audit: ' . $e->getMessage());
            $status = false;
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    
    protected function create_jwt(int $user_id, string $email, string $role): string {
        try {
            $expiry_period = 90 * 24 * 3600;
            $iat = time();
            $payload = [
                'iat' => $iat,
                'nbf' => $iat - 30,
                'exp' => $iat + $expiry_period, 
                'user_id' => $user_id,
                'role' => $role,
                'email' => $email
            ];
            $stmt = $this->conn->prepare('
                UPDATE users 
                SET jwt_iat = :iat
                WHERE user_id = :user_id
            ');
            $stmt->execute([
                ':iat' => date('Y-m-d H:i:s', $iat),
                ':user_id' => $user_id
            ]);
            $token = JWT::encode($payload, JWT_KEY, 'HS256');
            return $token;
        } catch (Exception $e) {
            $this->logger->error('create_jwt: ' . $e->getMessage());
            throw $e;
        }
    }
    # ------------------------------------------------------------------------------

    protected function get_user_id(string $email): int {
        try {
            $stmt = $this->conn->prepare('
                        SELECT user_id 
                        FROM users 
                        WHERE email = :email 
                        LIMIT 1        
                    ');
            $stmt->bindValue(':email', $email);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result === false || !isset($result['user_id'])) {
                throw new Exception('User not found');
            }
            
            return (int)$result['user_id'];
        } catch (Exception $e) {
            $this->logger->error('get_user_id: ' . $e->getMessage());
            throw $e;
        }
    }
    # ------------------------------------------------------------------------------

    protected function get_user_affiliate_id(int $user_id, string $role): int|null {
        if ($role === 'manager') {
            $stmt = $this->conn->prepare(
                'SELECT affiliate_id FROM managers WHERE manager_id = ?');
        } elseif ($role === 'viewer') {
            $stmt = $this->conn->prepare(
                'SELECT affiliate_id FROM viewers WHERE viewer_id = ?');
        } elseif ($role === 'coordinator') {
            $stmt = $this->conn->prepare(
                'SELECT affiliate_id FROM coordinators WHERE coordinator_id = ?');
        } elseif ($role === 'coach') {
            $stmt = $this->conn->prepare(
                'SELECT affiliate_id FROM coaches WHERE coach_id = ?');
        } else {
            return null;
        }
        if (!$stmt) {
            $this->logger->error('get_user_affiliate_id: Failed to prepare query');
            return null;
        }
        
        $result = $stmt->execute([$user_id]);
        if (!$result) {
            $this->logger->error('get_user_affiliate_id: Failed to execute query');
            return null;
        }
        
        return $stmt->fetchColumn() ?: null;
    }
    # ------------------------------------------------------------------------------

    protected function is_validusername(string $username): bool {
        try {
            if (empty($username)) {
                return false;
            }
            return filter_var($username, FILTER_VALIDATE_EMAIL) !== false;
        } catch (Exception $e) {
            $this->logger->error('is_validusername: ' . $e->getMessage());
            return false;
        }
    }
    # ------------------------------------------------------------------------------

    protected function run_query_param(string $sql, $param): mixed {
        try {
            # Validate SQL contains exactly one parameter placeholder
            if (substr_count($sql, ':param') !== 1) {
                throw new Exception('SQL must contain exactly one :param placeholder');
            }
            
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare SQL statement');
            }
            
            $stmt->bindValue(':param', $param);
            $result = $stmt->execute();
            if (!$result) {
                throw new Exception('Failed to execute SQL statement');
            }
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $this->logger->error('run_query_param: ' . $e->getMessage());
            throw $e;
        }
    }
     # ------------------------------------------------------------------------------
    
    protected function sanitise_array(?array $data): array {
        if ($data === null) {
            return [];
        }
        
        try {
            $sanitised = [];
            foreach ($data as $key => $value) {
                # Sanitise key
                $clean_key = preg_replace('/[^a-zA-Z0-9_-]/', '', (string)$key);
                if ($clean_key === null || empty($clean_key)) {
                    continue; # Skip invalid keys
                }
                
                if (is_array($value)) {
                    $sanitised[$clean_key] = $this->sanitise_array($value);
                } elseif (is_string($value)) {
                    # Remove null bytes and control characters
                    $value = str_replace("\0", '', $value);
                    $cleaned_value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value);
                    if ($cleaned_value === null) {
                        $cleaned_value = $value; # Fallback if preg_replace fails
                    }
                    $sanitised[$clean_key] = trim($cleaned_value);
                } else {
                    $sanitised[$clean_key] = $value;
                }
            }
            
            return $sanitised;
        } catch (Exception $e) {
            $this->logger->error('sanitise_array: ' . $e->getMessage());
            return [];
        }
    }
    # ------------------------------------------------------------------------------

    protected function update_login_timestamps(int $user_id): void {
        try {
            $stmt = $this->conn->prepare('
                        UPDATE users 
                        SET last_login = NOW(), 
                        jwt_iat = NOW()
                        WHERE user_id = :user_id        
                    ');
            if (!$stmt) {
                throw new Exception('Failed to prepare login timestamp update query');
            }
            $stmt->bindValue(':user_id', $user_id);
            $result = $stmt->execute();
            if (!$result) {
                throw new Exception('Failed to update login timestamps');
            }
        } catch (Exception $e) {
            $this->logger->error('update_login_timestamps: ' . $e->getMessage());
            throw $e;
        }
    }
    # ------------------------------------------------------------------------------
    
    protected function validate_params(array $params, array $required_params): Status {
        foreach ($required_params as $param) {
            if (!array_key_exists($param, $params)) {
                return new Status (false, 400, 
                    ['message' => 'Incorrectly formatted query. Must supply all parameters: ' . 
                    implode(', ', $required_params)]);
            }
        }
        return new Status (true, 200, ['message' => 'Valid paramters']);
    }
    # --------------------------------------------------------------------------

    protected function validate_token(Request $request, 
                            string|array|null $required_role=null): Status {
        $msg = '. Please logout and then login again.';
        try {
            # Step 1: Validate token
            $authHeader = $request->getHeaderLine('Authorization');
            if (!$authHeader) {
                $authArray = $request->getHeader('Authorization');
                $authHeader = $authArray[0] ?? '';
            }
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = trim($matches[1]);
                if (empty($token)) {
                    throw new \Exception('Empty JWT token' . $msg);
                }
                # Basic JWT format validation
                if (substr_count($token, '.') !== 2) {
                    throw new \Exception('Invalid JWT token format' . $msg);
                }
            } else {
                throw new \Exception('Authorization header not found or malformed' . $msg);
            }
            $decoded = JWT::decode($token, new Key(JWT_KEY, 'HS256'));
            $this->email = $decoded->email ?? null;
            $this->iat = $decoded->iat ?? null;
            $this->role = $decoded->role ?? null;
            $this->user_id = $decoded->user_id ?? null;

            if (!$this->email ||  !$this->iat || !$this->role || !$this->user_id) {
                return new Status(false, 401, ['message' => 'Invalid token payload . $msg']);
            }
            # Step 2: Validate role
            if (is_null($required_role)) {
                $role_ok = True;
            } elseif (is_array($required_role)) {
                $role_ok = in_array($this->role, $required_role, true);
            } else {
                $role_ok = $this->role === $required_role;
            }
            if (!$role_ok) {
                return new Status(false, 403, ['message' => 'Role not authorised for this request']);
            }
            # Step 3: Fetch user from database
            $query = '
                SELECT disabled, password_reset, last_logout
                FROM users
                WHERE user_id = :user_id
                AND role = :role
                LIMIT 1
            ';
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                    ':user_id' => $this->user_id, 
                    ':role' => $this->role]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                return new Status(false, 403, ['message' => 'User not found or change in role' . $msg]);
            }

            if ((int)$row['disabled'] === 1) {
                return new Status(false, 403, ['message' => 'Account disabled']);
            }

            if ((int)$row['password_reset'] === 1) {
                return new Status(false, 403, [
                    'message' => 'Password reset required. Please logout, then login and select Forgotten Password.']);
            }

            # Step 4: Ensure last_logout does not invalidate the JWT
            if ($row['last_logout'] !== null) {
                $last_logout = strtotime($row['last_logout']);
                if ($this->iat <= $last_logout) {
                    return new Status(false, 401, ['message' => 'Token invalidated by logout' . $msg]);
                }
            }

            # All checks passed
            return new Status(true, 200, ['message' => 'Token is valid']);

        } catch (ExpiredException $e) {
            return new Status(false, 401, ['message' => 'Token has expired' . $msg]);
        } catch (SignatureInvalidException $e) {
            return new Status(false, 401, ['message' => 'Invalid token signature' . $msg]);
        } catch (\Exception $e) {
            $this->logger->error('validate_token: ' . $e->getMessage());
            return new Status(false, 500, 
                    ['message' => 'Error validating token: '. $e->getMessage()]);
        }
    }
    # --------------------------------------------------------------------------
    
    protected function decrypt_field(?string $value): ?string {
        if ($value === null || $value === '') {
            return null;
        }
        
        try {
            $data = base64_decode($value, true);
            if ($data === false || strlen($data) < 16) {
                $this->logger->warning('decrypt_field: Invalid base64 data or insufficient length');
                return null;
            }
            
            $iv = substr($data, 0, 16);
            $encrypted = substr($data, 16);
            
            $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', 
                            DATA_ENCRYPTION_KEY, OPENSSL_RAW_DATA, $iv);
            
            if ($decrypted === false) {
                $this->logger->warning('decrypt_field: Decryption failed');
                return null;
            }
            
            return $decrypted;
        } catch (Exception $e) {
            $this->logger->error('decrypt_field: ' . $e->getMessage());
            return null;
        }
    }
    # --------------------------------------------------------------------------
    
    protected function encrypt_field(?string $value): ?string {
        if ($value === null || $value === '') {
            return null;
        }
        
        try {
            $iv = random_bytes(16);
            if ($iv === false || strlen($iv) !== 16) {
                $this->logger->error('encrypt_field: Failed to generate secure IV');
                return null;
            }
            
            $encrypted = openssl_encrypt($value, 'AES-256-CBC', 
                            DATA_ENCRYPTION_KEY, OPENSSL_RAW_DATA, $iv);
            
            if ($encrypted === false) {
                $this->logger->error('encrypt_field: Encryption failed');
                return null;
            }
            
            return base64_encode($iv . $encrypted);
        } catch (Exception $e) {
            $this->logger->error('encrypt_field: ' . $e->getMessage());
            return null;
        }
    }
    # --------------------------------------------------------------------------

    protected function ok_email_coach(int $coach_id): bool {
        $sql = 'SELECT use_email FROM coaches WHERE coach_id = ?';
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$coach_id]);
        $result = $stmt->fetchColumn();
        return (bool)$result;
    }
    # --------------------------------------------------------------------------
}
# ------------------------------------------------------------------------------

/*
End
*/
