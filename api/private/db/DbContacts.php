<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once 'DbBase.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

class DbContacts extends DbBase {

    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, viewer
    # Mandatory: org_id, name
    # Optional: role, email, telephone, notes, marketing_consent, marketing_consent_at, marketing_consent_source

    public function add_contact(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 'viewer']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['org_id', 'name'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            if (!is_numeric($params['org_id']) || $params['org_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid org_id']);
            }

            $org_id = (int)$params['org_id'];
            if (!$this->has_org_access($org_id)) {
                return new Status(false, 403, ['message' => 'Access denied to this organization']);
            }

            if (empty(trim($params['name']))) {
                return new Status(false, 400, ['message' => 'Contact name cannot be empty']);
            }
            
            $sql = 'INSERT INTO contacts (org_id, name, role, email, telephone, notes, marketing_consent, marketing_consent_at, marketing_consent_source) 
                    VALUES (:org_id, :name, :role, :email, :telephone, :notes, :marketing_consent, :marketing_consent_at, :marketing_consent_source)';

            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare contact insert query');
            }
            $result = $stmt->execute([
                ':org_id'                       => $org_id,
                ':name'                         => $this->encrypt_field($params['name']),
                ':role'                         => $this->encrypt_field($params['role'] ?? null),
                ':email'                        => $this->encrypt_field($params['email'] ?? null),
                ':telephone'                    => $this->encrypt_field($params['telephone'] ?? null),
                ':notes'                        => $this->encrypt_field($params['notes'] ?? null),
                ':marketing_consent'            => $params['marketing_consent'] ?? false,
                ':marketing_consent_at'         => $params['marketing_consent_at'] ?? null,
                ':marketing_consent_source'     => $params['marketing_consent_source'] ?? null
            ]);
            if (!$result) {
                throw new Exception('Failed to insert contact record');
            }

            $contact_id = $this->conn->lastInsertId();
            
            $caller_affiliate_id = $this->get_user_affiliate_id($this->user_id, $this->role);
            $this->add_audit(AuditType::CONTACT_ADDED, "Contact added: {$params['name']} (ID: {$contact_id})", 
                            $this->user_id, $caller_affiliate_id);
            
            $status = new Status(true, 200, ['contact_id' => (int)$contact_id]);
            
        } catch (Exception $e) {
            $this->logger->error('add_contact: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (add_contact): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, viewer
    # Mandatory: contact_id
    # Optional: name, role, email, telephone, notes, marketing_consent, marketing_consent_at, marketing_consent_source, disabled

    public function edit_contact(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 'viewer']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['contact_id'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            if (!is_numeric($params['contact_id']) || $params['contact_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid contact_id']);
            }

            $contact_id = (int)$params['contact_id'];

            $sql = 'SELECT c.*, o.affiliate_id FROM contacts c 
                    JOIN orgs o ON c.org_id = o.org_id 
                    WHERE c.contact_id = :contact_id LIMIT 1';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':contact_id' => $contact_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                return new Status(false, 404, ['message' => 'Contact not found']);
            }

            if (!$this->has_affiliate_access($result['affiliate_id'])) {
                return new Status(false, 403, ['message' => 'Access denied to this contact']);
            }

            $name = $params['name'] ?? $result['name'];
            $role = $params['role'] ?? $result['role'];
            $email = $params['email'] ?? $result['email'];
            $telephone = $params['telephone'] ?? $result['telephone'];
            $notes = $params['notes'] ?? $result['notes'];
            $marketing_consent = $params['marketing_consent'] ?? $result['marketing_consent'];
            $marketing_consent_at = $params['marketing_consent_at'] ?? $result['marketing_consent_at'];
            $marketing_consent_source = $params['marketing_consent_source'] ?? $result['marketing_consent_source'];
            $disabled = $params['disabled'] ?? $result['disabled'];

            if ($disabled && !$result['disabled']) {
                $this->redact($contact_id);
            }

            $sql = 'UPDATE contacts SET name = :name, role = :role, email = :email, telephone = :telephone, 
                    notes = :notes, marketing_consent = :marketing_consent, marketing_consent_at = :marketing_consent_at, 
                    marketing_consent_source = :marketing_consent_source, disabled = :disabled WHERE contact_id = :contact_id';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':name'                         => $this->encrypt_field($name),
                ':role'                         => $this->encrypt_field($role),
                ':email'                        => $this->encrypt_field($email),
                ':telephone'                    => $this->encrypt_field($telephone),
                ':notes'                        => $this->encrypt_field($notes),
                ':marketing_consent'            => $marketing_consent,
                ':marketing_consent_at'         => $marketing_consent_at,
                ':marketing_consent_source'     => $marketing_consent_source,
                ':disabled'                     => $disabled,
                ':contact_id'                   => $contact_id
            ]);
            
            $caller_affiliate_id = $this->get_user_affiliate_id($this->user_id, $this->role);
            $this->add_audit(AuditType::CONTACT_EDITED, "Contact updated: ID {$contact_id}", 
                            $this->user_id, $caller_affiliate_id);

            $status = new Status(true, 200, ['message' => 'Contact updated successfully']);
            
        } catch (Exception $e) {
            $this->logger->error('edit_contact: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (edit_contact): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, viewer
    # Mandatory: n/a
    # Optional: org_id

    public function get_contacts(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 'viewer']);
            if (!$status->success) { 
                return $status; 
            }
            
            $params = $this->sanitise_array($request->getQueryParams());
            
            $sql = 'SELECT c.*, o.name as org_name FROM contacts c 
                    JOIN orgs o ON c.org_id = o.org_id 
                    WHERE ' . $this->get_affiliate_filter();
            
            $query_params = [];
            $this->add_affiliate_params($query_params);
            
            if (isset($params['org_id'])) {
                $sql .= ' AND c.org_id = :org_id';
                $query_params[':org_id'] = (int)$params['org_id'];
            }
            
            $sql .= ' ORDER BY c.name ASC';
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($query_params);
            $contacts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($contacts as &$contact) {
                $contact['name'] = $this->decrypt_field($contact['name']);
                $contact['role'] = $this->decrypt_field($contact['role']);
                $contact['email'] = $this->decrypt_field($contact['email']);
                $contact['telephone'] = $this->decrypt_field($contact['telephone']);
                $contact['notes'] = $this->decrypt_field($contact['notes']);
            }
            
            $status = new Status(true, 200, $contacts);
            
        } catch (Exception $e) {
            $this->logger->error('get_contacts: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_contacts): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------

    private function has_org_access(int $org_id): bool {
        $sql = 'SELECT affiliate_id FROM orgs WHERE org_id = :org_id';
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':org_id' => $org_id]);
        $affiliate_id = $stmt->fetchColumn();
        
        return $affiliate_id && $this->has_affiliate_access($affiliate_id);
    }
    # --------------------------------------------------------------------------

    private function has_affiliate_access(int $affiliate_id): bool {
        $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
        return $user_affiliate === $affiliate_id;
    }
    # --------------------------------------------------------------------------

    private function get_affiliate_filter(): string {
        return 'o.affiliate_id = :affiliate_id';
    }
    # --------------------------------------------------------------------------

    private function add_affiliate_params(array &$params): void {
        $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
        $params[':affiliate_id'] = $user_affiliate;
    }
    # --------------------------------------------------------------------------

    public function redact(int $contact_id): void {
        $sql = 'UPDATE contacts SET 
                    name = :name,
                    role = :role,
                    email = :email,
                    telephone = :telephone,
                    notes = :notes
                WHERE contact_id = :contact_id';
        
        $stmt = $this->conn->prepare($sql);
        $plain_text = 'REDACTED';
        $redacted = $this->encrypt_field($plain_text);
        $stmt->execute([
            ':contact_id' => $contact_id,
            ':name' => $redacted,
            ':role' => $redacted,
            ':email' => $redacted,
            ':telephone' => $redacted,
            ':notes' => $redacted
        ]);

        $this->logger->info("Contact data redacted: $contact_id");
    }
    # --------------------------------------------------------------------------
}
# ------------------------------------------------------------------------------

/*
End
*/
