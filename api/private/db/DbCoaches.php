<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once 'DbBase.php';
require_once __DIR__ . '/../utils/creds.php';
require_once __DIR__ . '/../utils/helper.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------
# Implements coach database functionality.

class DbCoaches extends DbBase {

    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------
    # Roles: manager, coordinator
    # Mandatory: first_name, last_name, email
    # Optional: coordinator_id, address, telephone, nok_name, nok_telephone, 
    #    nok_relationship, area_id, status, email_consent, whatsapp_consent, 
    #    dbs_completed, ref_completed, commitment_completed, training, 
    #    edib_training, consol_training, consol_training_at, availability, 
    #    preferences, notes
    
    public function add_coach(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['first_name', 'last_name', 'email'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            # Get caller's affiliate_id
            $caller_affiliate_id = $this->get_user_affiliate_id($this->user_id, 
                                        $this->role);
            if (!$caller_affiliate_id) {
                return new Status(false, 403, ['message' => 'Unable to determine caller affiliate']);
            }
            
            # Check preconditions when setting coach status
            $status_value = $params['status'] ?? 'unchecked';
            if ($status_value !== 'unchecked') {
                $status_check = $this->validate_coach_status(null, $status_value, $params);
                if (!$status_check->success) {
                    return $status_check;
                }
            }
            
            # Create user record using DbUsers::add_user
            $user_params = [
                'first_name' => $params['first_name'],
                'last_name' => $params['last_name'],
                'email' => $params['email'],
                'role' => 'coach',
                'coordinator_id' => $params['coordinator_id'] ?? null,
                'status' => $params['user_status'] ?? null
            ];
            
            # Create new request with user params
            $user_request = $request->withParsedBody($user_params);
            $db_users = new DbUsers();
            $user_status = $db_users->add_user($user_request);
            if (!$user_status->success) {
                return $user_status;
            }
            
            $coach_id = $this->get_user_id($params['email']);
            if (!$coach_id || !is_numeric($coach_id)) {
                return new Status(false, 500, ['message' => 'Failed to retrieve valid coach ID']);
            }
            
            # Update coach-specific data
            $sql = 'UPDATE coaches SET 
                        address = :address,
                        telephone = :telephone,
                        nok_name = :nok_name,
                        nok_telephone = :nok_telephone,
                        nok_relationship = :nok_relationship,
                        area_id = :area_id,
                        status = :status,
                        email_consent = :email_consent,
                        whatsapp_consent = :whatsapp_consent,
                        use_email = :use_email,
                        dbs_completed = :dbs_completed,
                        ref_completed = :ref_completed,
                        commitment_completed = :commitment_completed,
                        training = :training,
                        edib_training = :edib_training,
                        consol_training = :consol_training,
                        consol_training_at = :consol_training_at,
                        availability = :availability,
                        preferences = :preferences,
                        notes = :notes
                    WHERE coach_id = :coach_id';
            
            $stmt = $this->conn->prepare($sql);
            
            $stmt->execute([
                ':coach_id' => $coach_id,
                ':address' => $this->encrypt_field($params['address'] ?? null),
                ':telephone' => $this->encrypt_field($params['telephone'] ?? null),
                ':nok_name' => $this->encrypt_field($params['nok_name'] ?? null),
                ':nok_telephone' => $this->encrypt_field($params['nok_telephone'] ?? null),
                ':nok_relationship' => $this->encrypt_field($params['nok_relationship'] ?? null),
                ':area_id' => $params['area_id'] ?? null,
                ':status' => $status_value,
                ':email_consent' => $params['email_consent'] ?? false,
                ':whatsapp_consent' => $params['whatsapp_consent'] ?? false,
                ':use_email' => $params['use_email'] ?? false,
                ':dbs_completed' => $params['dbs_completed'] ?? false,
                ':ref_completed' => $params['ref_completed'] ?? false,
                ':commitment_completed' => $params['commitment_completed'] ?? false,
                ':training' => $params['training'] ?? 'not_booked',
                ':edib_training' => $params['edib_training'] ?? 'not_booked',
                ':consol_training' => $params['consol_training'] ?? 'not_booked',
                ':consol_training_at' => $params['consol_training_at'] ?? null,
                ':availability' => $params['availability'] ?? null,
                ':preferences' => $params['preferences'] ?? null,
                ':notes' => $params['notes'] ?? null
            ]);
            
            $status = new Status(true, 200, 
                    ['user_id' => $coach_id]);
            $description = "Coach added: {$params['email']}";
        } 
        catch (Exception $e) {
            $this->logger->error('add_coach: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (add_coach): ' . 
                                $e->getMessage()]);
        }
        
        return $status;
    }
    # --------------------------------------------------------------------------
    # Roles: manager, coordinator
    # Mandatory: coach_id
    # Optional: address, telephone, nok_name, nok_telephone, nok_relationship, status, etc.
    
    public function edit_coach(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['coach_id'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            # Validate coach_id is numeric and positive
            if (!is_numeric($params['coach_id']) || $params['coach_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid coach_id']);
            }
            
            $coach_id = (int)$params['coach_id'];
            
            # Verify coach belongs to same affiliate
            $caller_affiliate_id = $this->get_user_affiliate_id($this->user_id, 
                                                    $this->role);
            $coach_affiliate_id = $this->get_coach_affiliate_id($coach_id);
            
            if (!$coach_affiliate_id) {
                return new Status(false, 404, ['message' => 'Coach not found or invalid']);
            }
            
            if ($caller_affiliate_id !== $coach_affiliate_id) {
                return new Status(false, 403, 
                        ['message' => 'Access denied: coach not in your affiliate']);
            }
            
            # Handle user-related fields via edit_user
            $user_fields = ['first_name', 'last_name', 'disabled', 'password_reset'];
            $user_params = ['user_id' => $coach_id];
            $has_user_updates = false;
            
            foreach ($user_fields as $field) {
                if (isset($params[$field])) {
                    $user_params[$field] = $params[$field];
                    $has_user_updates = true;
                }
            }
            
            # Handle user_status parameter (rename to status for edit_user)
            if (isset($params['user_status'])) {
                $user_params['status'] = $params['user_status'];
                $has_user_updates = true;
            }
            
            if ($has_user_updates) {
                $user_request = $request->withParsedBody($user_params);
                $db_users = new DbUsers();
                $user_status = $db_users->edit_user($user_request);
                if (!$user_status->success) {
                    return $user_status;
                }
            }
            
            # Check preconditions when setting coach status
            if (isset($params['status'])) {
                $status_check = $this->validate_coach_status($coach_id, $params['status'], $params);
                if (!$status_check->success) {
                    return $status_check;
                }
            }
            
            # Update coach-specific fields using individual queries
            $has_coach_updates = false;
            
            if (isset($params['address'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET address = :address WHERE coach_id = :coach_id');
                $stmt->execute([':address' => $this->encrypt_field($params['address']), ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['telephone'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET telephone = :telephone WHERE coach_id = :coach_id');
                $stmt->execute([':telephone' => $this->encrypt_field($params['telephone']), ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['nok_name'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET nok_name = :nok_name WHERE coach_id = :coach_id');
                $stmt->execute([':nok_name' => $this->encrypt_field($params['nok_name']), ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['nok_telephone'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET nok_telephone = :nok_telephone WHERE coach_id = :coach_id');
                $stmt->execute([':nok_telephone' => $this->encrypt_field($params['nok_telephone']), ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['nok_relationship'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET nok_relationship = :nok_relationship WHERE coach_id = :coach_id');
                $stmt->execute([':nok_relationship' => $this->encrypt_field($params['nok_relationship']), ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (array_key_exists('coordinator_id', $params)) {
                $stmt = $this->conn->prepare('UPDATE coaches SET coordinator_id = :coordinator_id WHERE coach_id = :coach_id');
                $stmt->execute([':coordinator_id' => $params['coordinator_id'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['affiliate_id'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET affiliate_id = :affiliate_id WHERE coach_id = :coach_id');
                $stmt->execute([':affiliate_id' => $params['affiliate_id'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['status'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET status = :status WHERE coach_id = :coach_id');
                $stmt->execute([':status' => $params['status'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['email_consent'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET email_consent = :email_consent WHERE coach_id = :coach_id');
                $stmt->execute([':email_consent' => $params['email_consent'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['whatsapp_consent'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET whatsapp_consent = :whatsapp_consent WHERE coach_id = :coach_id');
                $stmt->execute([':whatsapp_consent' => $params['whatsapp_consent'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['use_email'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET use_email = :use_email WHERE coach_id = :coach_id');
                $stmt->execute([':use_email' => $params['use_email'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['dbs_completed'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET dbs_completed = :dbs_completed WHERE coach_id = :coach_id');
                $stmt->execute([':dbs_completed' => $params['dbs_completed'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['ref_completed'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET ref_completed = :ref_completed WHERE coach_id = :coach_id');
                $stmt->execute([':ref_completed' => $params['ref_completed'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['commitment_completed'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET commitment_completed = :commitment_completed WHERE coach_id = :coach_id');
                $stmt->execute([':commitment_completed' => $params['commitment_completed'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['training'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET training = :training WHERE coach_id = :coach_id');
                $stmt->execute([':training' => $params['training'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['edib_training'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET edib_training = :edib_training WHERE coach_id = :coach_id');
                $stmt->execute([':edib_training' => $params['edib_training'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['consol_training'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET consol_training = :consol_training WHERE coach_id = :coach_id');
                $stmt->execute([':consol_training' => $params['consol_training'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['consol_training_at'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET consol_training_at = :consol_training_at WHERE coach_id = :coach_id');
                $stmt->execute([':consol_training_at' => $params['consol_training_at'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['availability'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET availability = :availability WHERE coach_id = :coach_id');
                $stmt->execute([':availability' => $params['availability'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['preferences'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET preferences = :preferences WHERE coach_id = :coach_id');
                $stmt->execute([':preferences' => $params['preferences'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (isset($params['notes'])) {
                $stmt = $this->conn->prepare('UPDATE coaches SET notes = :notes WHERE coach_id = :coach_id');
                $stmt->execute([':notes' => $params['notes'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            if (array_key_exists('area_id', $params)) {
                $stmt = $this->conn->prepare('UPDATE coaches SET area_id = :area_id WHERE coach_id = :coach_id');
                $stmt->execute([':area_id' => $params['area_id'], ':coach_id' => $coach_id]);
                $has_coach_updates = true;
            }
            
            if ($has_user_updates || $has_coach_updates) {
                # $description = "Coach edited: $coach_id";            
                # $this->add_audit(AuditType::COACH_EDITED, $description, $this->user_id, $caller_affiliate_id, $coach_id);
                $status = new Status(true, 200, ['message' => 'Coach updated successfully']);

            } else {
                $status = new Status(false, 400, ['message' => 'No valid fields to update']);
            }
            
        } catch (Exception $e) {
            $this->logger->error('edit_coach: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (edit_coach): ' . 
                                $e->getMessage()]);
        }
        
        return $status;
    }
    # --------------------------------------------------------------------------
    # Roles: manager, coordinator
    # Mandatory: coach_id
    # Optional: n/a
    
    public function get_coach(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            
            $params = $this->sanitise_array($request->getQueryParams());
            if (!isset($params['coach_id'])) {
                return new Status(false, 400, ['message' => 'coach_id parameter required']);
            }
            
            # Validate coach_id is numeric and positive
            if (!is_numeric($params['coach_id']) || $params['coach_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid coach_id']);
            }
            
            $coach_id = (int)$params['coach_id'];
            
            # Verify coach belongs to same affiliate
            $caller_affiliate_id = $this->get_user_affiliate_id($this->user_id, $this->role);
            $coach_affiliate_id = $this->get_coach_affiliate_id($coach_id);
            
            if (!$coach_affiliate_id) {
                return new Status(false, 404, ['message' => 'Coach not found or invalid']);
            }
            
            if ($caller_affiliate_id !== $coach_affiliate_id) {
                return new Status(false, 403, ['message' => 'Access denied: coach not in your affiliate']);
            }
            
            $sql = 'SELECT c.*, u.first_name, u.last_name, u.email, 
                        u.status as user_status, u.disabled, u.password_reset, 
                        u.last_login, u.created_at as user_created_at,
                        coord_u.first_name as coordinator_first_name, 
                        coord_u.last_name as coordinator_last_name,
                        a.name as area_name
                    FROM coaches c
                    JOIN users u ON c.coach_id = u.user_id
                    LEFT JOIN users coord_u ON c.coordinator_id = coord_u.user_id
                    LEFT JOIN areas a ON c.area_id = a.area_id
                    WHERE c.coach_id = :coach_id';
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':coach_id' => $coach_id]);
            $coach = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$coach) {
                return new Status(false, 404, ['message' => 'Coach not found']);
            }
            
            # Decrypt personal data
            $coach['address'] = $this->decrypt_field($coach['address']);
            $coach['telephone'] = $this->decrypt_field($coach['telephone']);
            $coach['nok_name'] = $this->decrypt_field($coach['nok_name']);
            $coach['nok_telephone'] = $this->decrypt_field($coach['nok_telephone']);
            $coach['nok_relationship'] = $this->decrypt_field($coach['nok_relationship']);
            
            $status = new Status(true, 200, $coach);
            
        } catch (Exception $e) {
            $this->logger->error('get_coach: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_coach): ' . 
                                $e->getMessage()]);
        }
        
        return $status;
    }
    # --------------------------------------------------------------------------
    # Roles: manager, coordinator
    # Mandatory: n/a
    # Optional: n/a
    
    public function get_coaches(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            
            $caller_affiliate_id = $this->get_user_affiliate_id($this->user_id, $this->role);
            if (!$caller_affiliate_id) {
                return new Status(false, 403, ['message' => 'Unable to determine caller affiliate']);
            }
            
            $sql = 'SELECT c.coach_id, u.first_name, u.last_name, u.email, c.status,
                        u.status as user_status, u.disabled, u.password_reset,
                        c.email_consent, c.whatsapp_consent, c.use_email, c.dbs_completed, 
                        c.ref_completed, c.commitment_completed, c.training, 
                        c.edib_training, c.consol_training, c.consol_training_at,
                        c.availability, c.preferences, c.notes, c.created_at, 
                        c.coordinator_id, c.area_id,
                        coord_u.first_name as coordinator_first_name, 
                        coord_u.last_name as coordinator_last_name,
                        a.name as area_name
                    FROM coaches c
                    LEFT JOIN users u ON c.coach_id = u.user_id
                    LEFT JOIN users coord_u ON c.coordinator_id = coord_u.user_id
                    LEFT JOIN areas a ON c.area_id = a.area_id
                    WHERE c.affiliate_id = :affiliate_id
                    ORDER BY COALESCE(u.last_name, ""), COALESCE(u.first_name, "")';
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':affiliate_id' => $caller_affiliate_id]);
            $coaches = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $status = new Status(true, 200, $coaches);
            
        } catch (Exception $e) {
            $this->logger->error('get_coaches: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_coaches): ' . 
                                $e->getMessage()]);
        }
        
        return $status;
    }

    # --------------------------------------------------------------------------
    
    private function validate_coach_status(?int $coach_id, string $status, array $params): Status {
        $current = null;
        
        # Get current values from database if coach exists
        if ($coach_id !== null) {
            $sql_current = 'SELECT c.dbs_completed, c.ref_completed, c.commitment_completed, 
                                   c.edib_training, c.consol_training, u.status as user_status
                            FROM coaches c
                            JOIN users u ON c.coach_id = u.user_id
                            WHERE c.coach_id = :coach_id';
            $stmt_current = $this->conn->prepare($sql_current);
            $stmt_current->execute([':coach_id' => $coach_id]);
            $current = $stmt_current->fetch(PDO::FETCH_ASSOC);
            
            if (!$current) {
                return new Status(false, 404, ['message' => 'Coach not found']);
            }
        }
        
        # Check values from params or current database values (defaults for new coaches)
        $dbs_completed = $params['dbs_completed'] ?? ($current['dbs_completed'] ?? false);
        $ref_completed = $params['ref_completed'] ?? ($current['ref_completed'] ?? false);
        $commitment_completed = $params['commitment_completed'] ?? ($current['commitment_completed'] ?? false);
        $edib_training = $params['edib_training'] ?? ($current['edib_training'] ?? 'not_booked');
        $training = $params['training'] ?? ($current['training'] ?? 'not_booked');
        
        $check_refs_ok = $dbs_completed && $ref_completed;
        $check_train_ok = $check_refs_ok && $commitment_completed &&
                        $edib_training === 'completed' &&
                        $training === 'completed';
        
        if ($status === 'untrained') {
            if (!$check_refs_ok) {
                return new Status(false, 403, 
                    ['message' => 'Coach does not meet requirements to be set as untrained. ' .
                    'Ensure DBS check and references are completed.']);
            }
        } elseif ($status === 'trained' || $status === 'paired') {
            if (!$check_train_ok) {
                return new Status(false, 403, 
                    ['message' => "Coach does not meet requirements to be set as {$status}. " .
                    'Ensure all checks and training are completed.']);
            }
        }
        
        return new Status(true, 200, ['message' => 'Status requirements validated']);
    }
    # --------------------------------------------------------------------------
    
    private function get_coach_affiliate_id(int $coach_id): ?int {
        $sql = 'SELECT affiliate_id FROM coaches WHERE coach_id = :coach_id';
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':coach_id' => $coach_id]);
        return $stmt->fetchColumn() ?: null;
    }
    # --------------------------------------------------------------------------
    
    public function redact(int $coach_id): void {        
        $sql = 'UPDATE coaches SET 
                    address = :address,
                    telephone = :telephone,
                    nok_name = :nok_name,
                    nok_telephone = :nok_telephone,
                    nok_relationship = :nok_relationship
                WHERE coach_id = :coach_id';
        
        $stmt = $this->conn->prepare($sql);
        $plain_text = 'REDACTED';
        $redacted = $this->encrypt_field($plain_text);
        $stmt->execute([
            ':coach_id' => $coach_id,
            ':address' => $redacted,
            ':telephone' => $redacted,
            ':nok_name' => $redacted,
            ':nok_telephone' => $redacted,
            ':nok_relationship' => $redacted
        ]);

        $this->logger->info("Coach data redacted: $coach_id");
    }
    #---------------------------------------------------------------------------

}
# ------------------------------------------------------------------------------

/*
End
*/