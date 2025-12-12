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
            die('Database connection failed');
        }
    }
    # --------------------------------------------------------------------------

    function __destruct() {
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
    
    protected function create_iwt(int $user_id, string $email, string $role): string {
        $iat = time();
        $payload = [
            'iat' => $iat,
            'nbf' => $iat - 30,
            'exp' => $iat + (90 * 24 * 3600), 
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
    }
    # ------------------------------------------------------------------------------

    protected function get_user_id(string $email): int {
        $stmt = $this->conn->prepare('
                    SELECT user_id 
                    FROM users 
                    WHERE email = :email 
                    LIMIT 1        
                ');
        $stmt->bindValue(':email', $email);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        # Will intentionally throw an exception if no matching user found
        return (int)$result['user_id'];
    }
    # ------------------------------------------------------------------------------

    protected function get_user_affiliate_id(int $user_id, string $role): int|null {
        if ($role === 'manager') {
            $stmt = $this->conn->prepare(
                'SELECT affiliate_id FROM managers WHERE manager_id = ?');
        } elseif ($role === 'coordinator') {
            $stmt = $this->conn->prepare(
                'SELECT affiliate_id FROM coordinators WHERE coordinator_id = ?');
        } else {
            return null;
        }
        $stmt->execute([$user_id]);
        return $stmt->fetchColumn() ?: null;
    }
    # ------------------------------------------------------------------------------

    protected function is_validusername(string $username): bool {
        $valid = filter_var($username, FILTER_VALIDATE_EMAIL);
        return $valid;
    }
    # ------------------------------------------------------------------------------

    protected function run_query_param(string $sql, $param): mixed {
        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':param', $param);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $this->logger->error('run_query_param: ' . $e->getMessage());
            $result = null;
        }           
        return $result;
    }
     # ------------------------------------------------------------------------------
    
    protected function sanitise_array(?array $data): array {
        if ($data === null) {
            return [];
        }
        $sanitised = $data;
        /*
        $sanitised = [];
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $sanitised[$key] = $this->sanitise_array($value);
            } else {
                $sanitised[$key] = htmlspecialchars((string) $value, 
                    ENT_QUOTES | ENT_SUBSTITUTE,  'UTF-8');
            }
        }
        */
        return $sanitised;
    }
    # ------------------------------------------------------------------------------

    protected function update_login_timestamps(int $user_id): void {
        $stmt = $this->conn->prepare('
                    UPDATE users 
                    SET last_login = NOW(), 
                    jwt_iat = NOW()
                    WHERE user_id = :user_id        
                ');
        $stmt->bindValue(':user_id', $user_id);
        $stmt->execute();
        return;
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
        try {
            # Step 1: Validate token
            $authHeader = $request->getHeaderLine('Authorization');
            if (!$authHeader) {
                $authArray = $request->getHeader('Authorization');
                $authHeader = $authArray[0] ?? '';
            }
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
            } else {
                throw new \Exception('Authorization header not found or malformed');
            }
            $decoded = JWT::decode($token, new Key(JWT_KEY, 'HS256'));
            $this->email = $decoded->email ?? null;
            $this->iat = $decoded->iat ?? null;
            $this->role = $decoded->role ?? null;
            $this->user_id = $decoded->user_id ?? null;

            if (!$this->email ||  !$this->iat || !$this->role || !$this->user_id) {
                return new Status(false, 401, ['message' => 'Invalid token payload']);
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
                return new Status(false, 403, ['message' => 'User not found or change in role']);
            }

            if ((int)$row['disabled'] === 1) {
                return new Status(false, 403, ['message' => 'Account disabled']);
            }

            if ((int)$row['password_reset'] === 1) {
                return new Status(false, 403, ['message' => 'Password reset required']);
            }

            # Step 4: Ensure last_logout does not invalidate the JWT
            if ($row['last_logout'] !== null) {
                $last_logout = strtotime($row['last_logout']);
                if ($this->iat <= $last_logout) {
                    return new Status(false, 401, ['message' => 'Token invalidated by logout']);
                }
            }

            # All checks passed
            return new Status(true, 200, ['message' => 'Token is valid']);

        } catch (ExpiredException $e) {
            return new Status(false, 401, ['message' => 'Token has expired']);
        } catch (SignatureInvalidException $e) {
            return new Status(false, 401, ['message' => 'Invalid token signature']);
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
        
        $data = base64_decode($value);
        if ($data === false || strlen($data) < 16) {
            return null;
        }
        
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        
        $decrypted = openssl_decrypt($encrypted, 'AES-256-CBC', 
                        DATA_ENCRYPTION_KEY, 0, $iv);
        return $decrypted !== false ? $decrypted : null;
    }
    # --------------------------------------------------------------------------
    
    protected function encrypt_field(?string $value): ?string {
        if ($value === null || $value === '') {
            return null;
        }
        
        $iv = openssl_random_pseudo_bytes(16);
        $encrypted = openssl_encrypt($value, 'AES-256-CBC', 
                        DATA_ENCRYPTION_KEY, 0, $iv);
        
        if ($encrypted === false) {
            return null;
        }
        
        return base64_encode($iv . $encrypted);
    }
    # --------------------------------------------------------------------------
}
# ------------------------------------------------------------------------------

/*
End
*/
