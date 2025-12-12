<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once 'DbBase.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

class DbReports extends DbBase {

    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------
    # Role     : admin, director, manager
    # Mandatory: n/a
    # Optional : start_date, end_date, type
    
    public function get_audit_logs(Request $request): Status {        
        try {
            $status = $this->validate_token($request, ['admin', 'director', 'manager']);
            if (!$status->success) { 
                return $status; 
            }

            $data = $this->sanitise_array($request->getQueryParams());
            $query = '
                SELECT a.*, 
                       pb.first_name as performed_by_first_name, 
                       pb.last_name as performed_by_last_name,
                       po.first_name as performed_on_first_name, 
                       po.last_name as performed_on_last_name,
                       af.name as affiliate_name
                FROM audit a
                LEFT JOIN users pb ON a.performed_by_id = pb.user_id
                LEFT JOIN users po ON a.performed_on_id = po.user_id
                LEFT JOIN affiliates af ON a.affiliate_id = af.affiliate_id
                WHERE 1=1
            ';
            $params = [];
            
            if (isset($data['start_date'])) {
                $query .= ' AND a.created_at >= :start_date';
                $params[':start_date'] = $data['start_date'];
            }
            if (isset($data['end_date'])) {
                $query .= ' AND a.created_at <= :end_date';
                $params[':end_date'] = $data['end_date'];
            }
            if (isset($data['type'])) {
                $query .= ' AND a.type = :type';
                $params[':type'] = $data['type'];
            }
            
            # Role-based filtering - restrict to user's affiliate if they have one
            if (in_array($this->role, ['manager', 'coordinator'])) {
                $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
                if ($user_affiliate) {
                    $query .= ' AND a.affiliate_id = :affiliate_id';
                    $params[':affiliate_id'] = $user_affiliate;
                }
            }
            
            $query .= ' ORDER BY a.created_at DESC LIMIT 1000';
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $status = new Status(true, 200, $logs);
        } catch (Exception $e) {
            $this->logger->error('get_audit_logs: ' . $e->getMessage());
            $status = new Status(false, 500, 'Error occurred (get_audit_logs)');
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role     : manager, coordinator
    # Mandatory: n/a
    # Optional : n/a
    
    public function get_coaches_summary(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
                        
            # Get user's affiliate
            $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
            if (!$user_affiliate) {
                return new Status(false, 403, 'User not associated with affiliate');
            }
            
            $query = '
                SELECT 
                    COALESCE(c.coordinator_id, 0) as user_id,
                    CASE WHEN c.coordinator_id IS NULL THEN "Unassigned" 
                         ELSE CONCAT(coord_user.first_name, " ", coord_user.last_name) END as coordinator_name,
                    SUM(CASE WHEN coach_user.status != "onhold" AND c.status = "paired" THEN 1 ELSE 0 END) as paired,
                    SUM(CASE WHEN coach_user.status != "onhold" AND c.status = "trained" THEN 1 ELSE 0 END) as waiting_pairing,
                    SUM(CASE WHEN coach_user.status != "onhold" AND c.status = "untrained" THEN 1 ELSE 0 END) as waiting_training,
                    SUM(CASE WHEN coach_user.status != "onhold" AND c.status = "unchecked" THEN 1 ELSE 0 END) as waiting_checks,
                    SUM(CASE WHEN coach_user.status = "onhold" THEN 1 ELSE 0 END) as on_break
                FROM coaches c
                JOIN users coach_user ON c.coach_id = coach_user.user_id
                LEFT JOIN users coord_user ON c.coordinator_id = coord_user.user_id
                WHERE c.affiliate_id = :affiliate_id
                  AND coach_user.status != "leaver"
                  AND (c.coordinator_id IS NULL OR (coord_user.disabled = FALSE AND coord_user.status != "leaver"))
            ';
            $params = [':affiliate_id' => $user_affiliate];            
            $query .= ' GROUP BY COALESCE(c.coordinator_id, 0), coordinator_name ORDER BY coordinator_name';
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            # Ensure 'Unassigned' row exists even if no unassigned coaches
            $has_unassigned = false;
            foreach ($rows as $row) {
                if ($row['coordinator_name'] === 'Unassigned') {
                    $has_unassigned = true;
                    break;
                }
            }
            
            if (!$has_unassigned) {
                $rows[] = [
                    'user_id' => 0,
                    'coordinator_name' => 'Unassigned',
                    'paired' => 0,
                    'waiting_pairing' => 0,
                    'waiting_training' => 0,
                    'waiting_checks' => 0,
                    'on_break' => 0
                ];
            }
            
            # Calculate row totals
            $total_rows = [
                'coordinator_name' => 'TOTAL_ROWS',
                'paired' => 0,
                'waiting_pairing' => 0,
                'waiting_training' => 0,
                'waiting_checks' => 0,
                'on_break' => 0
            ];
            
            foreach ($rows as $row) {
                $total_rows['paired'] += $row['paired'];
                $total_rows['waiting_pairing'] += $row['waiting_pairing'];
                $total_rows['waiting_training'] += $row['waiting_training'];
                $total_rows['waiting_checks'] += $row['waiting_checks'];
                $total_rows['on_break'] += $row['on_break'];
            }
            
            # Add row totals to each row
            foreach ($rows as &$row) {
                $row['total'] = $row['paired'] + $row['waiting_pairing'] + 
                                $row['waiting_training'] + $row['waiting_checks'] + 
                                $row['on_break'];
            }
            unset($row); # Clear reference to prevent issues
            
            # Add total to total_rows
            $total_rows['total'] = $total_rows['paired'] + 
                                $total_rows['waiting_pairing'] + 
                                $total_rows['waiting_training']  + 
                                $total_rows['waiting_checks'] + 
                                $total_rows['on_break'];
            
            # Calculate column totals
            $total_columns = ['coordinator_name' => 'TOTAL_COLUMNS'];
            foreach ($rows as $row) {
                if ($row['coordinator_name'] !== 'TOTAL_ROWS') {
                    $total_columns[$row['coordinator_name']] = $row['total'];
                }
            }
            
            # Add totals rows
            $rows[] = $total_rows;
            $rows[] = $total_columns;
            
            $status = new Status(true, 200, $rows);
        } catch (Exception $e) {
            $this->logger->error('get_coaches_summary: ' . $e->getMessage());
            $status = new Status(false, 500, 'Error occurred (get_coaches_summary)');
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role     : manager, coordinator
    # Mandatory: n/a
    # Optional : n/a
    
    public function get_readers_detail(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            
            # Get user's affiliate
            $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
            if (!$user_affiliate) {
                return new Status(false, 403, 'User not associated with affiliate');
            }
            
            $query = '
                SELECT 
                    r.area_id,
                    a.name as area_name,
                    c.coordinator_id,
                    CONCAT(coord_user.first_name, " ", coord_user.last_name) as coordinator_name,
                    r.reader_id,
                    r.name as reader_name,
                    r.level as reader_level,
                    r.status as reader_status,
                    r.notes as reader_notes,
                    (r.TP1_completion_at IS NOT NULL) as TP1,
                    (r.TP2_completion_at IS NOT NULL) as TP2,
                    (r.TP3_completion_at IS NOT NULL) as TP3,
                    (r.TP4_completion_at IS NOT NULL) as TP4,
                    (r.TP5_completion_at IS NOT NULL) as TP5
                FROM readers r
                LEFT JOIN areas a ON r.area_id = a.area_id
                LEFT JOIN coaches c ON r.coach_id = c.coach_id
                LEFT JOIN users coord_user ON c.coordinator_id = coord_user.user_id
                WHERE r.affiliate_id = :affiliate_id
                  AND (a.area_id IS NULL OR a.disabled = FALSE)
                  AND (coord_user.user_id IS NULL OR coord_user.status != "leaver")
            ';
            $params = [':affiliate_id' => $user_affiliate];            
            $query .= ' ORDER BY a.name, coordinator_name, r.name';
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $status = new Status(true, 200, $rows);
        } catch (Exception $e) {
            $this->logger->error('get_readers_detail: ' . $e->getMessage());
            $status = new Status(false, 500, 'Error occurred (get_readers_detail)');
        }
        return $status;
    }    # --------------------------------------------------------------------------
}
# ------------------------------------------------------------------------------

/*
End
*/
