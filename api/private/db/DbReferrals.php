<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once 'DbBase.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

class DbReferrals extends DbBase {

    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------
    # Role: manager, coordinator
    # Mandatory: org_id, referral, referral_at
    # Optional: contact_id

    public function add_referral(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['org_id', 'referral', 'referral_at'];
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

            if (empty(trim($params['referral']))) {
                return new Status(false, 400, ['message' => 'Referral cannot be empty']);
            }
            
            $sql = 'INSERT INTO referrals (org_id, contact_id, by_id, referral, referral_at) 
                    VALUES (:org_id, :contact_id, :by_id, :referral, :referral_at)';

            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare referral insert query');
            }
            $result = $stmt->execute([
                ':org_id'       => $org_id,
                ':contact_id'   => $params['contact_id'] ?? null,
                ':by_id'        => $this->user_id,
                ':referral'     => $params['referral'],
                ':referral_at'  => $params['referral_at']
            ]);
            if (!$result) {
                throw new Exception('Failed to insert referral record');
            }

            $referral_id = $this->conn->lastInsertId();
            
            $caller_affiliate_id = $this->get_user_affiliate_id($this->user_id, $this->role);
            $this->add_audit(AuditType::REFERRAL_ADDED, "Referral added: ID {$referral_id}", 
                            $this->user_id, $caller_affiliate_id);
            
            $status = new Status(true, 200, ['referral_id' => (int)$referral_id]);
            
        } catch (Exception $e) {
            $this->logger->error('add_referral: ' . $e->getMessage());
            $status = new Status(false, 500, 
                ['message' => 'Error occurred (add_referral): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator
    # Mandatory: referral_id
    # Optional: contact_id, status, referral, referral_at

    public function edit_referral(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['referral_id'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            if (!is_numeric($params['referral_id']) || $params['referral_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid referral_id']);
            }

            $referral_id = (int)$params['referral_id'];

            $sql = 'SELECT r.*, o.affiliate_id FROM referrals r 
                    JOIN orgs o ON r.org_id = o.org_id 
                    WHERE r.referral_id = :referral_id LIMIT 1';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':referral_id' => $referral_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                return new Status(false, 404, ['message' => 'Referral not found']);
            }

            if (!$this->has_affiliate_access($result['affiliate_id'])) {
                return new Status(false, 403, ['message' => 'Access denied to this referral']);
            }

            $contact_id = array_key_exists('contact_id', $params) ? $params['contact_id'] : $result['contact_id'];
            $status_val = $params['status'] ?? $result['status'];
            $referral = $params['referral'] ?? $result['referral'];
            $referral_at = $params['referral_at'] ?? $result['referral_at'];

            $sql = 'UPDATE referrals SET contact_id = :contact_id, status = :status, referral = :referral, 
                    referral_at = :referral_at WHERE referral_id = :referral_id';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':contact_id'   => $contact_id,
                ':status'       => $status_val,
                ':referral'     => $referral,
                ':referral_at'  => $referral_at,
                ':referral_id'  => $referral_id
            ]);
            
            $caller_affiliate_id = $this->get_user_affiliate_id($this->user_id, $this->role);
            $this->add_audit(AuditType::REFERRAL_EDITED, "Referral updated: ID {$referral_id}", 
                            $this->user_id, $caller_affiliate_id);

            $status = new Status(true, 200, ['message' => 'Referral updated successfully']);
            
        } catch (Exception $e) {
            $this->logger->error('edit_referral: ' . $e->getMessage());
            $status = new Status(false, 500, 
                ['message' => 'Error occurred (edit_referral): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, viewer
    # Mandatory: n/a
    # Optional: org_id, start_date, end_date

    public function get_referrals(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 'viewer']);
            if (!$status->success) { 
                return $status; 
            }
            
            $params = $this->sanitise_array($request->getQueryParams());
            
            $sql = 'SELECT r.*, o.name as org_name, c.name as contact_name, u.first_name, u.last_name, a.name as area_name, rd.name as reader_name 
                    FROM referrals r 
                    JOIN orgs o ON r.org_id = o.org_id 
                    LEFT JOIN contacts c ON r.contact_id = c.contact_id 
                    JOIN users u ON r.by_id = u.user_id 
                    LEFT JOIN areas a ON o.area_id = a.area_id 
                    LEFT JOIN readers rd ON r.referral_id = rd.referral_id 
                    WHERE ' . $this->get_affiliate_filter();
            
            $query_params = [];
            $this->add_affiliate_params($query_params);
            
            if (isset($params['org_id'])) {
                $sql .= ' AND r.org_id = :org_id';
                $query_params[':org_id'] = (int)$params['org_id'];
            }
            
            if (isset($params['start_date'])) {
                $sql .= ' AND r.referral_at >= :start';
                $query_params[':start'] = $params['start_date'];
            }
            if (isset($params['end_date'])) {
                $sql .= ' AND DATE(r.referral_at) <= :end';
                $query_params[':end'] = $params['end_date'];
            }
            
            $sql .= ' ORDER BY r.referral_at DESC';
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($query_params);
            $referrals = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($referrals as &$referral) {
                $referral['contact_name'] = $this->decrypt_field($referral['contact_name']);
            }
            
            $status = new Status(true, 200, $referrals);
            
        } catch (Exception $e) {
            $this->logger->error('get_referrals: ' . $e->getMessage());
            $status = new Status(false, 500, 
                ['message' => 'Error occurred (get_referrals): ' . $e->getMessage()]);
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
}
# ------------------------------------------------------------------------------

/*
End
*/
