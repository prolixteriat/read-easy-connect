<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once 'DbBase.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

class DbLessons extends DbBase {

    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------
    # Roles: manager, coordinator, coach
    # Mandatory: coach_id, reader_id, date, venue_id
    # Optional : n/a

    public function add_lesson(Request $request): Status {
        $status = $this->validate_token($request, ['coach', 'coordinator', 'manager']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getParsedBody());
        $required = ['coach_id', 'reader_id', 'date', 'venue_id'];
        $status = $this->validate_params($data, $required);
        if (!$status->success) {
            return $status;
        }

        try {
            $query = '
                INSERT INTO lessons (coach_id, reader_id, date, venue_id, status, attention, notes)
                VALUES (:coach_id, :reader_id, :date, :venue_id, :status, :attention, :notes)
            ';
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':coach_id' => $data['coach_id'],
                ':reader_id' => $data['reader_id'],
                ':date' => $data['date'],
                ':venue_id' => $data['venue_id'],
                ':status' => $data['status'] ?? 'scheduled',
                ':attention' => $data['attention'] ?? false,
                ':notes' => $data['notes'] ?? null
            ]);
            $lesson_id = $this->conn->lastInsertId();
            $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
            $this->add_audit(AuditType::LESSON_ADDED, "Lesson added: ID {$lesson_id}", 
                            $this->user_id, $user_affiliate);
            $status = new Status(true, 200, ['lesson_id' => $lesson_id]);
        } catch (Exception $e) {
            $this->logger->error('lessons_add: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (lessons_add)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Mandatory: lesson_id
    # Optional : coach_id, reader_id, date, venue_id, status, attention, notes

    public function edit_lesson(Request $request): Status {
        # TODO: Send email to coach if date or venue is changed. Include .ICS attachment
        $status = $this->validate_token($request, ['coach', 'coordinator', 'manager']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getParsedBody());
        $required = ['lesson_id'];
        $status = $this->validate_params($data, $required);
        if (!$status->success) {
            return $status;
        }

        try {
            $updates = [];
            $params = [':lesson_id' => $data['lesson_id']];
            
            if (isset($data['coach_id'])) {
                $updates[] = 'coach_id = :coach_id';
                $params[':coach_id'] = $data['coach_id'];
            }
            if (isset($data['reader_id'])) {
                $updates[] = 'reader_id = :reader_id';
                $params[':reader_id'] = $data['reader_id'];
            }
            if (isset($data['date'])) {
                $updates[] = 'date = :date';
                $params[':date'] = $data['date'];
            }
            if (isset($data['venue_id'])) {
                $updates[] = 'venue_id = :venue_id';
                $params[':venue_id'] = $data['venue_id'];
            }
            if (isset($data['status'])) {
                $updates[] = 'status = :status';
                $params[':status'] = $data['status'];
            }
            if (isset($data['attention'])) {
                $updates[] = 'attention = :attention';
                $params[':attention'] = $data['attention'];
            }
            if (isset($data['notes'])) {
                $updates[] = 'notes = :notes';
                $params[':notes'] = $data['notes'];
            }

            if (empty($updates)) {
                return new Status(false, 400, ['message' => 'No fields to update']);
            }

            $query = 'UPDATE lessons SET ' . implode(', ', $updates) . 
                        ' WHERE lesson_id = :lesson_id';
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            
            $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
            $this->add_audit(AuditType::LESSON_EDITED, "Lesson updated: ID {$data['lesson_id']}", 
                            $this->user_id, $user_affiliate);
            $status = new Status(true, 200, ['message' => 'Lesson updated successfully']);
        } catch (Exception $e) {
            $this->logger->error('lessons_edit: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (lessons_edit)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator
    # Mandatory: n/a
    # Optional : start_date, end_date
    
    public function get_lessons(Request $request): Status {
        $status = $this->validate_token($request, ['manager', 'coordinator']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getQueryParams());

        try {
            $user_role = $this->role;
            $user_id = $this->user_id;
            
            # Get caller's affiliate_id based on role
            if ($user_role === 'manager') {
                $auth_query = 'SELECT affiliate_id FROM managers WHERE manager_id = :user_id';
                $auth_stmt = $this->conn->prepare($auth_query);
                $auth_stmt->execute([':user_id' => $user_id]);
                $affiliate_id = $auth_stmt->fetchColumn();
            } elseif ($user_role === 'coordinator') {
                $auth_query = 'SELECT affiliate_id FROM coordinators WHERE coordinator_id = :user_id';
                $auth_stmt = $this->conn->prepare($auth_query);
                $auth_stmt->execute([':user_id' => $user_id]);
                $affiliate_id = $auth_stmt->fetchColumn();
            }

            $query = '
                SELECT l.*, r.name as reader_name, u.first_name, u.last_name
                FROM lessons l
                JOIN readers r ON l.reader_id = r.reader_id
                JOIN users u ON l.coach_id = u.user_id
                WHERE r.affiliate_id = :affiliate_id
            ';
            $params = [':affiliate_id' => $affiliate_id];
            
            if (isset($data['start_date'])) {
                $query .= ' AND l.date >= :start';
                $params[':start'] = $data['start_date'];
            }
            if (isset($data['end_date'])) {
                $query .= ' AND l.date <= :end';
                $params[':end'] = $data['end_date'];
            }
            
            $query .= ' ORDER BY l.date DESC';
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $lessons = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $status = new Status(true, 200, $lessons);
        } catch (Exception $e) {
            $this->logger->error('lessons_get_affiliate: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (lessons_get_affiliate)']);
        }
        return $status;
    }
    
    # --------------------------------------------------------------------------
    # Mandatory: coach_id
    # Optional : start_date, end_date

    public function get_lessons_coach(Request $request): Status {
        $status = $this->validate_token($request, ['coach', 'coordinator', 'manager']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getQueryParams());
        $required = ['coach_id'];
        $status = $this->validate_params($data, $required);
        if (!$status->success) {
            return $status;
        }

        try {
            $user_role = $this->role;
            $user_id = $this->user_id;
            
            # Check authorisation based on role
            if ($user_role === 'coach' && $user_id != $data['coach_id']) {
                return new Status(false, 403, ['message' => 'Access denied']);
            } elseif ($user_role === 'coordinator') {
                $auth_query = 'SELECT coach_id FROM coaches WHERE coordinator_id = :user_id AND coach_id = :coach_id';
                $auth_stmt = $this->conn->prepare($auth_query);
                $auth_stmt->execute([':user_id' => $user_id, ':coach_id' => $data['coach_id']]);
                if (!$auth_stmt->fetchColumn()) {
                    return new Status(false, 403, ['message' => 'Access denied']);
                }
            } elseif ($user_role === 'manager') {
                $auth_query = '
                    SELECT c.coach_id 
                    FROM coaches c
                    JOIN coordinators co ON c.coordinator_id = co.coordinator_id
                    JOIN managers m ON co.affiliate_id = m.affiliate_id
                    WHERE m.manager_id = :user_id AND c.coach_id = :coach_id
                ';
                $auth_stmt = $this->conn->prepare($auth_query);
                $auth_stmt->execute([':user_id' => $user_id, ':coach_id' => $data['coach_id']]);
                if (!$auth_stmt->fetchColumn()) {
                    return new Status(false, 403, ['message' => 'Access denied']);
                }
            }

            $query = '
                SELECT l.*, r.name as reader_name
                FROM lessons l
                JOIN readers r ON l.reader_id = r.reader_id
                WHERE l.coach_id = :coach_id
            ';
            $params = [':coach_id' => $data['coach_id']];
            
            if (isset($data['start_date'])) {
                $query .= ' AND l.date >= :start';
                $params[':start'] = $data['start_date'];
            }
            if (isset($data['end_date'])) {
                $query .= ' AND l.date <= :end';
                $params[':end'] = $data['end_date'];
            }
            
            $query .= ' ORDER BY l.date DESC';
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $lessons = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $status = new Status(true, 200, $lessons);
        } catch (Exception $e) {
            $this->logger->error('lessons_get_coach: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (lessons_get_coach)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Mandatory: reader_id
    # Optional : start_date, end_date

    public function get_lessons_reader(Request $request): Status {
        $status = $this->validate_token($request, ['coach', 'coordinator', 'manager']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getQueryParams());
        $required = ['reader_id'];
        $status = $this->validate_params($data, $required);
        if (!$status->success) {
            return $status;
        }

        try {
            $user_role = $this->role;
            $user_id = $this->user_id;
            
            # Check authorisation based on role
            if ($user_role === 'coach') {
                $auth_query = 'SELECT reader_id FROM readers WHERE coach_id = :user_id AND reader_id = :reader_id';
                $auth_stmt = $this->conn->prepare($auth_query);
                $auth_stmt->execute([':user_id' => $user_id, ':reader_id' => $data['reader_id']]);
                if (!$auth_stmt->fetchColumn()) {
                    return new Status(false, 403, ['message' => 'Access denied']);
                }
            } elseif ($user_role === 'coordinator') {
                $auth_query = '
                    SELECT r.reader_id 
                    FROM readers r
                    JOIN coaches c ON r.coach_id = c.coach_id
                    WHERE c.coordinator_id = :user_id AND r.reader_id = :reader_id
                ';
                $auth_stmt = $this->conn->prepare($auth_query);
                $auth_stmt->execute([':user_id' => $user_id, ':reader_id' => $data['reader_id']]);
                if (!$auth_stmt->fetchColumn()) {
                    return new Status(false, 403, ['message' => 'Access denied']);
                }
            } elseif ($user_role === 'manager') {
                $auth_query = '
                    SELECT r.reader_id 
                    FROM readers r
                    JOIN managers m ON r.affiliate_id = m.affiliate_id
                    WHERE m.manager_id = :user_id AND r.reader_id = :reader_id
                ';
                $auth_stmt = $this->conn->prepare($auth_query);
                $auth_stmt->execute([':user_id' => $user_id, ':reader_id' => $data['reader_id']]);
                if (!$auth_stmt->fetchColumn()) {
                    return new Status(false, 403, ['message' => 'Access denied']);
                }
            }

            $query = '
                SELECT l.*, u.first_name, u.last_name
                FROM lessons l
                JOIN users u ON l.coach_id = u.user_id
                WHERE l.reader_id = :reader_id
            ';
            $params = [':reader_id' => $data['reader_id']];
            
            if (isset($data['start_date'])) {
                $query .= ' AND l.date >= :start';
                $params[':start'] = $data['start_date'];
            }
            if (isset($data['end_date'])) {
                $query .= ' AND l.date <= :end';
                $params[':end'] = $data['end_date'];
            }
            
            $query .= ' ORDER BY l.date DESC';
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $lessons = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $status = new Status(true, 200, $lessons);
        } catch (Exception $e) {
            $this->logger->error('lessons_get_reader: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (lessons_get_reader)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
}
# ------------------------------------------------------------------------------

/*
End
*/
