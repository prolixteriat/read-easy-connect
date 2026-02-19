<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once 'DbBase.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

class DbLoans extends DbBase {

    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, coach
    # Mandatory: reader_id, item
    # Optional: loan_date, return_date, status

    public function add_loan(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 'coach']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['reader_id', 'item'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            # Validate reader_id is numeric and positive
            if (!is_numeric($params['reader_id']) || $params['reader_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid reader_id']);
            }

            # Check if user has access to this reader
            $reader_id = (int)$params['reader_id'];
            if (!$this->has_reader_access($reader_id)) {
                return new Status(false, 403, ['message' => 'Access denied to this reader']);
            }

            # Validate item name is not empty
            if (empty(trim($params['item']))) {
                return new Status(false, 400, ['message' => 'Item name cannot be empty']);
            }
            
            $sql = 'INSERT INTO loans (reader_id, item, loan_date, return_date, status) 
                    VALUES (:reader_id, :item, :loan_date, :return_date, :status)';

            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare loan insert query');
            }
            $result = $stmt->execute([
                ':reader_id'    => $reader_id,
                ':item'         => $params['item'],
                ':loan_date'    => $params['loan_date'] ?? date('Y-m-d H:i:s'),
                ':return_date'  => $params['return_date'] ?? null,
                ':status'       => $params['status'] ?? 'loaned'
            ]);
            if (!$result) {
                throw new Exception('Failed to insert loan record');
            }

            $loan_id = $this->conn->lastInsertId();
            $status = new Status(true, 200, ['loan_id' => (int)$loan_id]);
            
        } catch (Exception $e) {
            $this->logger->error('add_loan: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (add_loan): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, coach
    # Mandatory: loan_id
    # Optional: item, loan_date, return_date, status

    public function edit_loan(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 'coach']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['loan_id'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            # Validate loan_id is numeric and positive
            if (!is_numeric($params['loan_id']) || $params['loan_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid loan_id']);
            }

            $loan_id = (int)$params['loan_id'];

            # Get current loan and check access
            $sql = 'SELECT l.*, r.affiliate_id FROM loans l 
                    JOIN readers r ON l.reader_id = r.reader_id 
                    WHERE l.loan_id = :loan_id LIMIT 1';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':loan_id' => $loan_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                return new Status(false, 404, ['message' => 'Loan not found']);
            }

            if (!$this->has_affiliate_access($result['affiliate_id'])) {
                return new Status(false, 403, ['message' => 'Access denied to this loan']);
            }

            $item = $params['item'] ?? $result['item'];
            $loan_date = $params['loan_date'] ?? $result['loan_date'];
            $return_date = $params['return_date'] ?? $result['return_date'];
            $loan_status = $params['status'] ?? $result['status'];

            $sql = 'UPDATE loans SET item = :item, loan_date = :loan_date, 
                    return_date = :return_date, status = :status WHERE loan_id = :loan_id';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':item'         => $item,
                ':loan_date'    => $loan_date,
                ':return_date'  => $return_date,
                ':status'       => $loan_status,
                ':loan_id'      => $loan_id
            ]);

            $status = new Status(true, 200, ['message' => 'Loan updated successfully']);
            
        } catch (Exception $e) {
            $this->logger->error('edit_loan: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (edit_loan): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, coach
    # Mandatory: loan_id
    # Optional: n/a

    public function get_loan(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 'coach']);
            if (!$status->success) { 
                return $status; 
            }
            
            $params = $this->sanitise_array($request->getQueryParams());
            $status = $this->validate_params($params, ['loan_id']);
            if (!$status->success) {
                return $status;
            }
            
            $loan_id = (int)$params['loan_id'];
            $sql = 'SELECT l.*, r.name as reader_name FROM loans l 
                    JOIN readers r ON l.reader_id = r.reader_id 
                    WHERE l.loan_id = :loan_id AND ' . $this->get_affiliate_filter();
            
            $query_params = [':loan_id' => $loan_id];
            $this->add_affiliate_params($query_params);
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($query_params);
            $loan = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$loan) {
                return new Status(false, 404, ['message' => 'Loan not found or access denied']);
            }
            
            $status = new Status(true, 200, $loan);
            
        } catch (Exception $e) {
            $this->logger->error('get_loan: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_loan): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, coach
    # Mandatory: n/a
    # Optional: reader_id, start_date, end_date

    public function get_loans(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 'coach']);
            if (!$status->success) { 
                return $status; 
            }
            
            $params = $this->sanitise_array($request->getQueryParams());
            
            $sql = 'SELECT l.*, r.name as reader_name FROM loans l 
                    JOIN readers r ON l.reader_id = r.reader_id 
                    WHERE ' . $this->get_affiliate_filter();
            
            $query_params = [];
            $this->add_affiliate_params($query_params);
            
            if (isset($params['reader_id'])) {
                $sql .= ' AND l.reader_id = :reader_id';
                $query_params[':reader_id'] = (int)$params['reader_id'];
            }
            
            if (isset($params['start_date'])) {
                $sql .= ' AND l.loan_date >= :start_date';
                $query_params[':start_date'] = $params['start_date'];
            }
            
            if (isset($params['end_date'])) {
                $sql .= ' AND DATE(l.loan_date) <= :end_date';
                $query_params[':end_date'] = $params['end_date'];
            }
            
            $sql .= ' ORDER BY l.loan_date DESC';
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($query_params);
            $loans = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $status = new Status(true, 200, $loans);
            
        } catch (Exception $e) {
            $this->logger->error('get_loans: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_loans): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------

    private function has_reader_access(int $reader_id): bool {
        $sql = 'SELECT affiliate_id FROM readers WHERE reader_id = :reader_id';
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':reader_id' => $reader_id]);
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
        if ($this->role === 'manager') {
            return 'r.affiliate_id = :affiliate_id';
        } elseif ($this->role === 'coordinator') {
            return 'r.affiliate_id = :affiliate_id AND (r.coach_id IS NULL OR r.coach_id IN (SELECT coach_id FROM coaches WHERE coordinator_id = :coordinator_id))';
        } elseif ($this->role === 'coach') {
            return 'r.coach_id = :coach_id';
        }
        return '1=0';
    }
    # --------------------------------------------------------------------------

    private function add_affiliate_params(array &$params): void {
        if ($this->role === 'manager' || $this->role === 'coordinator') {
            $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
            $params[':affiliate_id'] = $user_affiliate;
            if ($this->role === 'coordinator') {
                $params[':coordinator_id'] = $this->user_id;
            }
        } elseif ($this->role === 'coach') {
            $params[':coach_id'] = $this->user_id;
        }
    }
    # --------------------------------------------------------------------------
}
# ------------------------------------------------------------------------------

/*
End
*/
