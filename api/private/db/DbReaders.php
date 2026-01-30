<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once 'DbBase.php';
require_once __DIR__ . '/../utils/mailer.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

class DbReaders extends DbBase {

    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------
    # Role: manager, coordinator
    # Mandatory: n/a
    # Optional : area_id, coach_id, level, status, referrer_name, referrer_org, 
    #   availability, notes, enrolment_at, coaching_start_at, graduation_at, 
    #   TP1_start_at, TP2_start_at, TP3_start_at, TP4_start_at, TP5_start_at, 
    #   TP1_completion_at, TP2_completion_at, TP3_completion_at, TP4_completion_at, 
    #  TP5_completion_at, ons4_1, ons4_2, ons4_3

    public function add_reader(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            /*
            $required_params = ['name'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            # Validate reader name is not empty
            if (empty(trim($params['name']))) {
                return new Status(false, 400, ['message' => 'Reader name cannot be empty']);
            }
            */
            $name = $this->create_reader_name();
            # Validate coach_id if provided
            if (isset($params['coach_id']) && $params['coach_id']) {
                $coach_check = $this->conn->prepare('SELECT coach_id FROM coaches WHERE coach_id = :coach_id');
                $coach_check->execute([':coach_id' => $params['coach_id']]);
                if (!$coach_check->fetchColumn()) {
                    return new Status(false, 400, ['message' => 'Invalid coach_id']);
                }
            }

            $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
            
            if (!$user_affiliate) {
                return new Status(false, 403, ['message' => 'Manager not associated with any affiliate']);
            }

            $sql = 'INSERT INTO readers (name, affiliate_id, area_id, coach_id, 
                        referrer_name, referrer_org, level, status, availability, 
                        notes, enrolment_at, coaching_start_at, graduation_at, 
                        TP1_start_at, TP2_start_at, TP3_start_at, TP4_start_at, 
                        TP5_start_at, TP1_completion_at, TP2_completion_at,
                        TP3_completion_at, TP4_completion_at, TP5_completion_at, 
                        ons4_1, ons4_2, ons4_3) 
                    VALUES (:name, :affiliate_id, :area_id, :coach_id, 
                        :referrer_name, :referrer_org, :level, :status, :availability, 
                        :notes, :enrolment_at, :coaching_start_at, :graduation_at, 
                        :TP1_start_at, :TP2_start_at, :TP3_start_at, :TP4_start_at, 
                        :TP5_start_at, :TP1_completion_at, :TP2_completion_at, 
                        :TP3_completion_at, :TP4_completion_at, :TP5_completion_at, 
                        :ons4_1, :ons4_2, :ons4_3)';

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':name'               => $name,
                ':affiliate_id'       => $user_affiliate,
                ':area_id'            => $params['area_id'] ?? null,
                ':coach_id'           => $params['coach_id'] ?? null,
                ':referrer_name'      => $params['referrer_name'] ?? null,
                ':referrer_org'       => $params['referrer_org'] ?? null,
                ':level'              => $params['level'] ?? 'TP1',
                ':status'             => $params['status'] ?? 'NYS',
                ':availability'       => $params['availability'] ?? null,
                ':notes'              => $params['notes'] ?? null,
                ':enrolment_at'       => $params['enrolment_at'] ?? null,
                ':coaching_start_at'  => $params['coaching_start_at'] ?? null,
                ':graduation_at'      => $params['graduation_at'] ?? null,
                ':TP1_start_at'       => $params['TP1_start_at'] ?? null,
                ':TP2_start_at'       => $params['TP2_start_at'] ?? null,
                ':TP3_start_at'       => $params['TP3_start_at'] ?? null,
                ':TP4_start_at'       => $params['TP4_start_at'] ?? null,
                ':TP5_start_at'       => $params['TP5_start_at'] ?? null,
                ':TP1_completion_at'  => $params['TP1_completion_at'] ?? null,
                ':TP2_completion_at'  => $params['TP2_completion_at'] ?? null,
                ':TP3_completion_at'  => $params['TP3_completion_at'] ?? null,
                ':TP4_completion_at'  => $params['TP4_completion_at'] ?? null,
                ':TP5_completion_at'  => $params['TP5_completion_at'] ?? null,
                ':ons4_1'             => $params['ons4_1'] ?? false,
                ':ons4_2'             => $params['ons4_2'] ?? false,
                ':ons4_3'             => $params['ons4_3'] ?? false
            ]);

            $reader_id = $this->conn->lastInsertId();

            # Update coach status to 'paired' if coach_id is provided
            if (isset($params['coach_id']) && $params['coach_id']) {
                $update_sql = 'UPDATE coaches SET status = "paired" WHERE coach_id = :coach_id';
                $update_stmt = $this->conn->prepare($update_sql);
                $update_stmt->execute([':coach_id' => $params['coach_id']]);
            }
            $status = new Status(true, 200, 
                ['reader_id' => (int)$reader_id,
                 'name' => $name]);
            $this->add_audit(AuditType::OTHER, "Reader added: {$name}", $this->user_id, $user_affiliate);
            
        } catch (Exception $e) {
            $this->logger->error('add_reader: ' . $e->getMessage());
            $status = new Status(false, 500, 
                        ['message' => 'Error occurred (add_reader): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator
    # Mandatory: reader_id
    # Optional : area_id, coach_id, level, status, referrer_name, referrer_org, availability, notes, enrolment_at, coaching_start_at, graduation_at, TP1_start_at, TP2_start_at, TP3_start_at, TP4_start_at, TP5_start_at, TP1_completion_at, TP2_completion_at, TP3_completion_at, TP4_completion_at, TP5_completion_at, ons4_1, ons4_2, ons4_3 

    public function edit_reader(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['reader_id'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            # Validate reader_id is numeric and positive
            if (!is_numeric($params['reader_id']) || $params['reader_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid reader_id']);
            }

            $reader_id = (int)$params['reader_id'];

            $sql = 'SELECT name, affiliate_id, area_id, coach_id, referrer_name, 
                    referrer_org, level, status, availability, notes, enrolment_at, 
                    coaching_start_at, graduation_at, TP1_start_at, TP2_start_at, 
                    TP3_start_at, TP4_start_at, TP5_start_at, TP1_completion_at, 
                    TP2_completion_at, TP3_completion_at, TP4_completion_at, 
                    TP5_completion_at, ons4_1, ons4_2, ons4_3
                   FROM readers 
                   WHERE reader_id = :reader_id 
                   LIMIT 1';
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':reader_id', $reader_id);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                return new Status(false, 404, ['message' => 'Reader not found']);
            }

            $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
            
            if (!$user_affiliate || $user_affiliate != $result['affiliate_id']) {
                return new Status(false, 403, ['message' => 'Can only edit readers in your affiliate']);
            }

            $name = $result['name'];
            $affiliate_id = $result['affiliate_id'];
            $area_id = array_key_exists('area_id', $params) ? $params['area_id'] : $result['area_id'];
            $coach_id = array_key_exists('coach_id', $params) ? $params['coach_id'] : $result['coach_id'];
            $referrer_name = array_key_exists('referrer_name', $params) ? $params['referrer_name'] : $result['referrer_name'];
            $referrer_org = array_key_exists('referrer_org', $params) ? $params['referrer_org'] : $result['referrer_org'];
            $level = $params['level'] ?? $result['level'];
            $reader_status = $params['status'] ?? $result['status'];
            $availability = array_key_exists('availability', $params) ? $params['availability'] : $result['availability'];
            $notes = array_key_exists('notes', $params) ? $params['notes'] : $result['notes'];
            $enrolment_at = array_key_exists('enrolment_at', $params) ? $params['enrolment_at'] : $result['enrolment_at'];
            $coaching_start_at = array_key_exists('coaching_start_at', $params) ? $params['coaching_start_at'] : $result['coaching_start_at'];
            $graduation_at = array_key_exists('graduation_at', $params) ? $params['graduation_at'] : $result['graduation_at'];
            $TP1_start_at = array_key_exists('TP1_start_at', $params) ? $params['TP1_start_at'] : $result['TP1_start_at'];
            $TP2_start_at = array_key_exists('TP2_start_at', $params) ? $params['TP2_start_at'] : $result['TP2_start_at'];
            $TP3_start_at = array_key_exists('TP3_start_at', $params) ? $params['TP3_start_at'] : $result['TP3_start_at'];
            $TP4_start_at = array_key_exists('TP4_start_at', $params) ? $params['TP4_start_at'] : $result['TP4_start_at'];
            $TP5_start_at = array_key_exists('TP5_start_at', $params) ? $params['TP5_start_at'] : $result['TP5_start_at'];
            $TP1_completion_at = array_key_exists('TP1_completion_at', $params) ? $params['TP1_completion_at'] : $result['TP1_completion_at'];
            $TP2_completion_at = array_key_exists('TP2_completion_at', $params) ? $params['TP2_completion_at'] : $result['TP2_completion_at'];
            $TP3_completion_at = array_key_exists('TP3_completion_at', $params) ? $params['TP3_completion_at'] : $result['TP3_completion_at'];
            $TP4_completion_at = array_key_exists('TP4_completion_at', $params) ? $params['TP4_completion_at'] : $result['TP4_completion_at'];
            $TP5_completion_at = array_key_exists('TP5_completion_at', $params) ? $params['TP5_completion_at'] : $result['TP5_completion_at'];
            $ons4_1 = $params['ons4_1'] ?? $result['ons4_1'];
            $ons4_2 = $params['ons4_2'] ?? $result['ons4_2'];
            $ons4_3 = $params['ons4_3'] ?? $result['ons4_3'];

            # Handle coach status updates
            $original_coach_id = $result['coach_id'];
            
            $sql = 'UPDATE readers
                    SET affiliate_id = :affiliate_id,
                        area_id = :area_id,
                        coach_id = :coach_id,
                        referrer_name = :referrer_name,
                        referrer_org = :referrer_org,
                        level = :level,
                        status = :status,
                        availability = :availability,
                        notes = :notes,
                        enrolment_at = :enrolment_at,
                        coaching_start_at = :coaching_start_at,
                        graduation_at = :graduation_at,
                        TP1_start_at = :TP1_start_at,
                        TP2_start_at = :TP2_start_at,
                        TP3_start_at = :TP3_start_at,
                        TP4_start_at = :TP4_start_at,
                        TP5_start_at = :TP5_start_at,
                        TP1_completion_at = :TP1_completion_at,
                        TP2_completion_at = :TP2_completion_at,
                        TP3_completion_at = :TP3_completion_at,
                        TP4_completion_at = :TP4_completion_at,
                        TP5_completion_at = :TP5_completion_at,
                        ons4_1 = :ons4_1,
                        ons4_2 = :ons4_2,
                        ons4_3 = :ons4_3
                    WHERE reader_id = :reader_id';
            $stmt = $this->conn->prepare($sql);                    
            $stmt->execute([
                ':affiliate_id'       => $affiliate_id,
                ':area_id'            => $area_id,
                ':coach_id'           => $coach_id,
                ':referrer_name'      => $referrer_name,
                ':referrer_org'       => $referrer_org,
                ':level'              => $level,
                ':status'             => $reader_status,
                ':availability'       => $availability,
                ':notes'              => $notes,
                ':enrolment_at'       => $enrolment_at,
                ':coaching_start_at'  => $coaching_start_at,
                ':graduation_at'      => $graduation_at,
                ':TP1_start_at'       => $TP1_start_at,
                ':TP2_start_at'       => $TP2_start_at,
                ':TP3_start_at'       => $TP3_start_at,
                ':TP4_start_at'       => $TP4_start_at,
                ':TP5_start_at'       => $TP5_start_at,
                ':TP1_completion_at'  => $TP1_completion_at,
                ':TP2_completion_at'  => $TP2_completion_at,
                ':TP3_completion_at'  => $TP3_completion_at,
                ':TP4_completion_at'  => $TP4_completion_at,
                ':TP5_completion_at'  => $TP5_completion_at,
                ':ons4_1'             => $ons4_1,
                ':ons4_2'             => $ons4_2,
                ':ons4_3'             => $ons4_3,
                ':reader_id'          => $reader_id
            ]);

            # Update new coach status to 'paired' if coach_id is provided
            if ($coach_id) {
                $update_sql = 'UPDATE coaches SET status = "paired" WHERE coach_id = :coach_id';
                $update_stmt = $this->conn->prepare($update_sql);
                $update_stmt->execute([':coach_id' => $coach_id]);
            }

            # Check if original coach should be set back to 'trained'
            if ($original_coach_id && $original_coach_id != $coach_id) {
                $check_sql = 'SELECT COUNT(*) FROM readers WHERE coach_id = :original_coach_id';
                $check_stmt = $this->conn->prepare($check_sql);
                $check_stmt->execute([':original_coach_id' => $original_coach_id]);
                if ($check_stmt->fetchColumn() == 0) {
                    $revert_sql = 'UPDATE coaches SET status = "trained" WHERE coach_id = :original_coach_id';
                    $revert_stmt = $this->conn->prepare($revert_sql);
                    $revert_stmt->execute([':original_coach_id' => $original_coach_id]);
                }
            }

            # Send emails for field changes from null to valid date
            if (isset($params['coaching_start_at']) && 
                $result['coaching_start_at'] === null && 
                $params['coaching_start_at'] !== null) {
                $this->send_tp_completion_email($coach_id, $name, 'pre-TP1');
            }
            
            if (isset($params['TP1_completion_at']) && 
                $result['TP1_completion_at'] === null && 
                $params['TP1_completion_at'] !== null) {
                $this->send_tp_completion_email($coach_id, $name, 'post-TP1');
            }

            if (isset($params['TP3_completion_at']) && 
                $result['TP3_completion_at'] === null && 
                $params['TP3_completion_at'] !== null) {
                $this->send_tp_completion_email($coach_id, $name, 'post-TP3');
            }
            
            if (isset($params['TP5_completion_at']) && 
                $result['TP5_completion_at'] === null && 
                $params['TP5_completion_at'] !== null) {
                $this->send_tp_completion_email($coach_id, $name, 'post-TP5');
            }
            
            $this->add_audit(AuditType::READER_EDITED, 
                    "Reader updated: {$name} (ID: {$reader_id})", 
                    $this->user_id, $user_affiliate);
            $status = new Status(true, 200, ['message' => 'Reader edited']);
            
        } catch (Exception $e) {
            $this->logger->error('edit_reader: ' . $e->getMessage());
            $status = new Status(false, 500, 
                        ['message' => 'Error occurred (edit_reader): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, coach
    # Mandatory: reader_id
    # Optional : n/a

    public function get_reader(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 
                                            'coach']);
            if (!$status->success) { 
                return $status; 
            }
            
            $queryParams = $this->sanitise_array($request->getQueryParams());
            $data = $this->sanitise_array($queryParams);
            $status = $this->validate_params($data, ['reader_id']);
            if (!$status->success) {
                return $status;
            }
            
            # Validate reader_id is numeric and positive
            if (!is_numeric($data['reader_id']) || $data['reader_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid reader_id']);
            }
            
            $reader_id = (int)$data['reader_id'];
            $query = $this->build_reader_query($reader_id);
            $stmt = $this->conn->prepare($query['sql']);
            $stmt->execute($query['params']);
            $reader = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$reader) {
                return new Status(false, 404, ['message' => 'Reader not found or access denied']);
            }
            
            $status = new Status(true, 200, $reader);
            
        } catch (Exception $e) {
            $this->logger->error('get_reader: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_reader): ' . 
                                $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, coach
    # Mandatory: reader_id
    # Optional : n/a

    public function get_readers(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 
                                            'coach']);
            if (!$status->success) { 
                return $status; 
            }
            
            $query = $this->build_reader_query();
            $stmt = $this->conn->prepare($query['sql']);
            $stmt->execute($query['params']);
            $readers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $status = new Status(true, 200, $readers);
            
        } catch (Exception $e) {
            $this->logger->error('get_readers: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_readers): ' . 
                                $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------

    private function build_reader_query(?int $reader_id = null): array {
        if ($this->role === 'manager') {
            $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
            if (!$user_affiliate) {
                throw new Exception('Manager affiliate not found');
            }
            $sql = 'SELECT r.*, a.name as area_name, u.first_name as coach_first_name, u.last_name as coach_last_name 
                    FROM readers r 
                    LEFT JOIN areas a ON r.area_id = a.area_id 
                    LEFT JOIN users u ON r.coach_id = u.user_id 
                    WHERE r.affiliate_id = :affiliate_id';
            $params = [':affiliate_id' => $user_affiliate];
            if ($reader_id) {
                $sql .= ' AND r.reader_id = :reader_id';
                $params[':reader_id'] = $reader_id;
            }

        } elseif ($this->role === 'coordinator') {
            $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
            if (!$user_affiliate) {
                throw new Exception('Coordinator affiliate not found');
            }
            $sql = 'SELECT r.*, a.name as area_name, u.first_name as coach_first_name, u.last_name as coach_last_name 
                    FROM readers r
                    LEFT JOIN coaches c ON r.coach_id = c.coach_id
                    LEFT JOIN areas a ON r.area_id = a.area_id 
                    LEFT JOIN users u ON r.coach_id = u.user_id
                    WHERE r.affiliate_id = :affiliate_id 
                    AND (r.coach_id IS NULL OR c.coordinator_id = :coordinator_id)';
            $params = [':affiliate_id' => $user_affiliate, ':coordinator_id' => $this->user_id];
            if ($reader_id) {
                $sql .= ' AND r.reader_id = :reader_id';
                $params[':reader_id'] = $reader_id;
            }

        } elseif ($this->role === 'coach') {
            $sql = 'SELECT r.*, a.name as area_name, u.first_name as coach_first_name, u.last_name as coach_last_name 
                    FROM readers r 
                    LEFT JOIN areas a ON r.area_id = a.area_id 
                    LEFT JOIN users u ON r.coach_id = u.user_id 
                    WHERE r.coach_id = :coach_id';
            $params = [':coach_id' => $this->user_id];
            if ($reader_id) {
                $sql .= ' AND r.reader_id = :reader_id';
                $params[':reader_id'] = $reader_id;
            }
        }

        return ['sql' => $sql, 'params' => $params];
    }
    # --------------------------------------------------------------------------

    private function create_reader_name(): string {
        $stmt = $this->conn->prepare('
            SELECT first_name, last_name 
            FROM users 
            WHERE user_id = ?');
        $stmt->execute([$this->user_id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $first_initial = strtoupper(substr($user['first_name'], 0, 1));
        $last_initial = strtoupper(substr($user['last_name'], 0, 1));
        
        $stmt = $this->conn->query('
            SELECT AUTO_INCREMENT 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "readers"');
        $next_reader_id = $stmt->fetchColumn();
        $reader_name = "{$first_initial}{$last_initial}{$this->user_id}-{$next_reader_id}";
        return $reader_name;
    }
    # --------------------------------------------------------------------------

    private function send_tp_completion_email(?int $coach_id, string $reader_name, 
                                            string $level): void {
        if (!$coach_id) return;
        
        try {
            # Get coach and coordinator emails
            $sql = 'SELECT u.email as coach_email, uc.email as coordinator_email
                    FROM users u
                    JOIN coaches c ON u.user_id = c.coach_id
                    JOIN users uc ON c.coordinator_id = uc.user_id
                    WHERE c.coach_id = :coach_id';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':coach_id' => $coach_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result) return;
            
            $use_coach_email = $this->ok_email_coach($coach_id);
            $to_email = $use_coach_email ? $result['coach_email'] : $result['coordinator_email'];
            $cc_email = $use_coach_email ? $result['coordinator_email'] : null;
            $salutation = $use_coach_email ? 'Dear Coach,' : 'Dear Coordinator,';

            $text = '';
            if ($level === 'pre-TP1') {
                $text .= '<p>Please now complete the ONS4 survey.</p>';
            } elseif ($level === 'post-TP1') {
                $text .= '<p>Please contact your Coordinator to book you in for 
                        the Coach consolidation training if not previously 
                        undertaken.</p>';
            } elseif ($level === 'post-TP3')  {
                $text .= '<p>Please now complete the ONS4 survey as well as the 
                        Coach and Reader feedback discussion paperwork.</p>';
            } elseif ($level === 'post-TP5')  {
                $text .= '<p>Please now complete the ONS4 survey as well as the 
                        Reader finisher paperwork.</p>';
            }        
            $subject = "Reader Progress Update - {$level} reached";
            $body = "
                <p>{$salutation}</p>
                <p>Reader <strong>{$reader_name}</strong> has reached the <strong>{$level}</strong> level.</p>
                {$text}";
            
            $mailer = new Mailer();
            $mailer->send_email($to_email, $subject, $body, $cc_email);
            
        } catch (Exception $e) {
            $this->logger->error('send_tp_completion_email: ' . $e->getMessage());
        }
    }
    # --------------------------------------------------------------------------
}
# ------------------------------------------------------------------------------

/*
End
*/
