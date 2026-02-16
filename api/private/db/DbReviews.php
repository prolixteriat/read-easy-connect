<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once 'DbBase.php';
require_once __DIR__ . '/../utils/mailer.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

class DbReviews extends DbBase {

    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------
    # Mandatory: coordinator_id, coach_id, reader_id, date, venue_id
    # Optional : status, notes

    public function add_review(Request $request): Status {
        $status = $this->validate_token($request, ['coordinator', 'manager']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getParsedBody());
        $required = ['coordinator_id', 'coach_id', 'reader_id', 'date', 'venue_id'];
        $status = $this->validate_params($data, $required);
        if (!$status->success) {
            return $status;
        }
        
        # Validate numeric IDs
        foreach (['coordinator_id', 'coach_id', 'reader_id', 'venue_id'] as $id_field) {
            if (!is_numeric($data[$id_field]) || $data[$id_field] <= 0) {
                return new Status(false, 400, ['message' => "Invalid {$id_field}"]);
            }
        }

        try {
            # Validate access to all referenced entities
            $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
            if (!$user_affiliate) {
                return new Status(false, 403, ['message' => 'User not associated with any affiliate']);
            }
            
            # Role-specific access control: coordinators can only add reviews for themselves
            if ($this->role === 'coordinator' && (int)$data['coordinator_id'] !== $this->user_id) {
                return new Status(false, 403, ['message' => 'Coordinators can only add reviews for themselves']);
            }
            
            # Verify coordinator belongs to same affiliate
            $coord_check = $this->conn->prepare('SELECT affiliate_id FROM coordinators WHERE coordinator_id = :coordinator_id');
            $coord_check->execute([':coordinator_id' => $data['coordinator_id']]);
            $coord_affiliate = $coord_check->fetchColumn();
            if (!$coord_affiliate || $coord_affiliate !== $user_affiliate) {
                return new Status(false, 403, ['message' => 'Access denied to this coordinator']);
            }
            
            # Verify coach belongs to same affiliate
            $coach_check = $this->conn->prepare('SELECT affiliate_id FROM coaches WHERE coach_id = :coach_id');
            $coach_check->execute([':coach_id' => $data['coach_id']]);
            $coach_affiliate = $coach_check->fetchColumn();
            if (!$coach_affiliate || $coach_affiliate !== $user_affiliate) {
                return new Status(false, 403, ['message' => 'Access denied to this coach']);
            }
            
            # Verify reader belongs to same affiliate
            $reader_check = $this->conn->prepare('SELECT affiliate_id FROM readers WHERE reader_id = :reader_id');
            $reader_check->execute([':reader_id' => $data['reader_id']]);
            $reader_affiliate = $reader_check->fetchColumn();
            if (!$reader_affiliate || $reader_affiliate !== $user_affiliate) {
                return new Status(false, 403, ['message' => 'Access denied to this reader']);
            }
            
            $query = '
                INSERT INTO reviews (coordinator_id, coach_id, reader_id, date, venue_id, status, notes)
                VALUES (:coordinator_id, :coach_id, :reader_id, :date, :venue_id, :status, :notes)
            ';
            $stmt = $this->conn->prepare($query);
            if (!$stmt) {
                throw new Exception('Failed to prepare review insert query');
            }
            $result = $stmt->execute([
                ':coordinator_id' => $data['coordinator_id'],
                ':coach_id' => $data['coach_id'],
                ':reader_id' => $data['reader_id'],
                ':date' => $data['date'],
                ':venue_id' => $data['venue_id'],
                ':status' => $data['status'] ?? 'scheduled',
                ':notes' => $data['notes'] ?? null
            ]);
            if (!$result) {
                throw new Exception('Failed to insert review record');
            }
            $review_id = $this->conn->lastInsertId();
            $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
            # $this->add_audit(AuditType::REVIEW_ADDED, "Review added: ID {$review_id}", $this->user_id, $user_affiliate);
            
            # Send review invitation email
            $this->send_review_invitation_email((int)$review_id, 
                            (int)$data['coordinator_id'], (int)$data['coach_id'], 
                            (int)$data['reader_id'], (int)$data['venue_id'], $data['date']);
            
            $status = new Status(true, 200, ['review_id' => $review_id]);
        } catch (Exception $e) {
            $this->logger->error('reviews_add: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (reviews_add)']);
        }
        return $status;
    }
    
    # --------------------------------------------------------------------------
    # Role: coordinator
    # Mandatory: review_id
    # Optional : coordinator_id, coach_id, reader_id, date, venue_id, status, notes

    public function edit_review(Request $request): Status {
        $status = $this->validate_token($request, ['coordinator']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getParsedBody());
        $required = ['review_id'];
        $status = $this->validate_params($data, $required);
        if (!$status->success) {
            return $status;
        }
        
        # Validate review_id is numeric and positive
        if (!is_numeric($data['review_id']) || $data['review_id'] <= 0) {
            return new Status(false, 400, ['message' => 'Invalid review_id']);
        }

        try {
            # Check if review belongs to calling coordinator
            $auth_stmt = $this->conn->prepare(
                'SELECT coordinator_id FROM reviews WHERE review_id = :review_id');
            $auth_stmt->execute([':review_id' => $data['review_id']]);
            $review_coordinator_id = $auth_stmt->fetchColumn();
            
            if (!$review_coordinator_id || $review_coordinator_id != $this->user_id) {
                return new Status(false, 403, ['message' => 'Access denied']);
            }
            
            $updates = [];
            $params = [':review_id' => $data['review_id']];
            
            if (isset($data['coordinator_id'])) {
                $updates[] = 'coordinator_id = :coordinator_id';
                $params[':coordinator_id'] = $data['coordinator_id'];
            }
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
            if (isset($data['notes'])) {
                $updates[] = 'notes = :notes';
                $params[':notes'] = $data['notes'];
            }

            if (empty($updates)) {
                return new Status(false, 400, ['message' => 'No fields to update']);
            }

            $query = 'UPDATE reviews SET ' . implode(', ', $updates) . 
                        ' WHERE review_id = :review_id';
            $stmt = $this->conn->prepare($query);
            if (!$stmt) {
                throw new Exception('Failed to prepare review update query');
            }
            
            $result = $stmt->execute($params);
            if (!$result) {
                throw new Exception('Failed to execute review update query');
            }
            
            # Send review update or cancellation email
            if (isset($data['status'])) {
                if ($data['status'] === 'cancelled') {
                $this->send_review_cancellation_email((int)$data['review_id']);
                } elseif ($data['status'] === 'scheduled') {
                    $this->send_review_update_email((int)$data['review_id']);
                }
            }
            
            $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
            # $this->add_audit(AuditType::REVIEW_EDITED, "Review updated: ID {$data['review_id']}", $this->user_id, $user_affiliate);
            $status = new Status(true, 200, ['message' => 'Review updated successfully']);
        } catch (Exception $e) {
            $this->logger->error('reviews_edit: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (reviews_edit)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role : manager, coordinator
    # Mandatory: coordinator_id
    # Optional : start_date, end_date
    
    public function get_reviews_coordinator(Request $request): Status {
        $status = $this->validate_token($request, ['coordinator', 'manager']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getQueryParams());
        $required = ['coordinator_id'];
        $status = $this->validate_params($data, $required);
        if (!$status->success) {
            return $status;
        }

        try {
            $user_role = $this->role;
            $user_id = $this->user_id;
            
            # Check authorization
            if ($user_role === 'coordinator' && $user_id != $data['coordinator_id']) {
                return new Status(false, 403, ['message' => 'Access denied']);
            }

            $query = '
                SELECT r.*, rd.name as reader_name, u.first_name, u.last_name
                FROM reviews r
                JOIN readers rd ON r.reader_id = rd.reader_id
                JOIN users u ON r.coach_id = u.user_id
                WHERE r.coordinator_id = :coordinator_id
            ';
            $params = [':coordinator_id' => $data['coordinator_id']];
            
            if (isset($data['start_date'])) {
                $query .= ' AND r.date >= :start';
                $params[':start'] = $data['start_date'];
            }
            if (isset($data['end_date'])) {
                $query .= ' AND r.date <= :end';
                $params[':end'] = $data['end_date'];
            }
            
            $query .= ' ORDER BY r.date DESC';
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $status = new Status(true, 200, $reviews);
        } catch (Exception $e) {
            $this->logger->error('reviews_get_coordinator: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (reviews_get_coordinator)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator
    # Mandatory: n/a
    # Optional : n/a
    
    public function get_reviews(Request $request): Status {
        $status = $this->validate_token($request, ['manager', 'coordinator']);
        if (!$status->success) { 
            return $status; 
        }

        try {
            $user_role = $this->role;
            $user_id = $this->user_id;
            
            if ($user_role === 'manager') {
                $query = '
                    SELECT r.*, rd.name as reader_name, u.first_name, u.last_name
                    FROM reviews r
                    JOIN readers rd ON r.reader_id = rd.reader_id
                    JOIN users u ON r.coach_id = u.user_id
                    JOIN coordinators c ON r.coordinator_id = c.coordinator_id
                    JOIN managers m ON c.affiliate_id = m.affiliate_id
                    WHERE m.manager_id = :user_id
                ';
                $params = [':user_id' => $user_id];
            } else { # coordinator
                $query = '
                    SELECT r.*, rd.name as reader_name, u.first_name, u.last_name
                    FROM reviews r
                    JOIN readers rd ON r.reader_id = rd.reader_id
                    JOIN users u ON r.coach_id = u.user_id
                    WHERE r.coordinator_id = :user_id
                ';
                $params = [':user_id' => $user_id];
            }
            
            $query .= ' ORDER BY r.date DESC';
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $status = new Status(true, 200, $reviews);
        } catch (Exception $e) {
            $this->logger->error('reviews_get_all: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (reviews_get_all)']);
        }
        return $status;        
    }
    # --------------------------------------------------------------------------
    
    private function build_email_body(string $type, array $data): ?string {
        $date_obj = new DateTime($data['date']);
        if ($date_obj < new DateTime()) {
            return null;
        }
        $format_date = $date_obj->format('d-M-Y \a\t H:i');
        
        $messages = [
            'invitation' => 'You have been invited to a reader review meeting:',
            'update' => 'The reader review meeting has been updated:',
            'cancelled' => 'The reader review meeting has been cancelled:'
        ];
        
        $body = "<p>{$messages[$type]}</p>
            <p style='padding-left: 5ch;'>Date: <strong>{$format_date}</strong></p>
            <p style='padding-left: 5ch;'>Reader: <strong>{$data['reader_name']}</strong></p>
            <p style='padding-left: 5ch;'>Coach: <strong>{$data['coach_name']}</strong></p>
            <p style='padding-left: 5ch;'>Coordinator: <strong>{$data['coordinator_name']}</strong></p>";
        
        if ($type !== 'cancelled') {
            $body .= "<p style='padding-left: 5ch;'>Venue: <strong>{$data['venue_name']}</strong></p>
                <p style='padding-left: 5ch;'>Address: <strong>{$data['venue_address']}</strong></p>";
        }
        
        return $body;
    }
    # --------------------------------------------------------------------------
    
    private function build_ics_content(string $uid, int $sequence, string $reader_name, 
                        string $coach_name, string $coordinator_name, string $venue_name, 
                        string $venue_address, string $date, string $coordinator_email, 
                        string $coach_email): string {
        $date_obj = new DateTime($date);
        $start_time = $date_obj->format('Ymd\THis\Z');
        $end_time = $date_obj->add(new DateInterval('PT1H'))->format('Ymd\THis\Z');
        
        return "BEGIN:VCALENDAR\r\n" .
            "VERSION:2.0\r\n" .
            "METHOD:REQUEST\r\n" .
            "PRODID:-//Read Easy Connect//Review//EN\r\n" .
            "BEGIN:VEVENT\r\n" .
            "UID:{$uid}\r\n" .
            "SEQUENCE:{$sequence}\r\n" .
            "DTSTAMP:" . gmdate('Ymd\THis\Z') . "\r\n" .
            "DTSTART:{$start_time}\r\n" .
            "DTEND:{$end_time}\r\n" .
            "SUMMARY:Reader Review - {$reader_name}\r\n" .
            "DESCRIPTION:Reader Review meeting for {$reader_name}. Coach: {$coach_name}. Coordinator: {$coordinator_name}.\r\n" .
            "LOCATION:{$venue_name}, {$venue_address}\r\n" .
            "ORGANIZER;CN={$coordinator_name}:mailto:noreply@hcreadeasy.org.uk\r\n" .
            "ATTENDEE;CN={$coordinator_name};RSVP=TRUE:mailto:{$coordinator_email}\r\n" .
            "ATTENDEE;CN={$coach_name};RSVP=TRUE:mailto:{$coach_email}\r\n" .
            "END:VEVENT\r\n" .
            "END:VCALENDAR";
    }
    # --------------------------------------------------------------------------
    
    private function create_ics_invitation(int $review_id, string $reader_name, 
                        string $coach_name, string $coordinator_name, string $venue_name, 
                        string $venue_address, string $date, 
                        string $coordinator_email, string $coach_email): string {
        $uid = uniqid("{$review_id}_") . '@hcreadeasy.org.uk';
        
        # Update reviews table with ics_uid
        $stmt = $this->conn->prepare(
                'UPDATE reviews SET ics_uid = :ics_uid WHERE review_id = :review_id');
        $stmt->execute([':ics_uid' => $uid, ':review_id' => $review_id]);
        
        return $this->build_ics_content($uid, 0, $reader_name, $coach_name, 
                        $coordinator_name, $venue_name, $venue_address, $date, 
                        $coordinator_email, $coach_email);
    }
    # --------------------------------------------------------------------------
    
    private function create_ics_update(string $uid, int $sequence, string $reader_name, 
                        string $coach_name, string $coordinator_name, 
                        string $venue_name, string $venue_address, string $date, 
                        string $coordinator_email, string $coach_email): string {
        return $this->build_ics_content($uid, $sequence, $reader_name, $coach_name, 
                            $coordinator_name, $venue_name, $venue_address, 
                            $date, $coordinator_email, $coach_email);
    }
    # --------------------------------------------------------------------------
    
    private function get_invitation_data(int $coordinator_id, int $coach_id, 
                        int $reader_id, int $venue_id, string $date): ?array {
        try {
            $sql = 'SELECT uc.email as coordinator_email, uc.first_name as coordinator_first_name, uc.last_name as coordinator_last_name,
                           uco.email as coach_email, uco.first_name as coach_first_name, uco.last_name as coach_last_name,
                           r.name as reader_name, v.name as venue_name, v.address as venue_address
                    FROM users uc
                    JOIN users uco ON uco.user_id = :coach_id
                    JOIN readers r ON r.reader_id = :reader_id
                    JOIN venues v ON v.venue_id = :venue_id
                    WHERE uc.user_id = :coordinator_id';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':coordinator_id' => $coordinator_id, 
                            ':coach_id' => $coach_id, 
                            ':reader_id' => $reader_id, 
                            ':venue_id' => $venue_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result) return null;
            
            return [
                'coordinator_email' => $result['coordinator_email'],
                'coordinator_name' => $result['coordinator_first_name'] . ' ' . 
                                        $result['coordinator_last_name'],
                'coach_email' => $result['coach_email'],
                'coach_name' => $result['coach_first_name'] . ' ' . 
                                        $result['coach_last_name'],
                'reader_name' => $result['reader_name'],
                'venue_name' => $result['venue_name'],
                'venue_address' => $result['venue_address'] ?? '',
                'date' => $date
            ];
        } catch (Exception $e) {
            $this->logger->error('get_invitation_data: ' . $e->getMessage());
            return null;
        }
    }
    # --------------------------------------------------------------------------
    
    private function get_review_data(int $review_id, bool $include_ics): ?array {
        try {
            $ics_fields = $include_ics ? ', r.ics_uid, r.ics_sequence' : '';
            $sql = "SELECT r.date, r.coach_id{$ics_fields},
                           uc.email as coordinator_email, uc.first_name as coordinator_first_name, uc.last_name as coordinator_last_name,
                           uco.email as coach_email, uco.first_name as coach_first_name, uco.last_name as coach_last_name,
                           rd.name as reader_name, v.name as venue_name, v.address as venue_address
                    FROM reviews r
                    JOIN users uc ON r.coordinator_id = uc.user_id
                    JOIN users uco ON r.coach_id = uco.user_id
                    JOIN readers rd ON r.reader_id = rd.reader_id
                    JOIN venues v ON r.venue_id = v.venue_id
                    WHERE r.review_id = :review_id";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':review_id' => $review_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result) return null;
            
            return [
                'coordinator_email' => $result['coordinator_email'],
                'coordinator_name' => $result['coordinator_first_name'] . ' ' . 
                                        $result['coordinator_last_name'],
                'coach_email' => $result['coach_email'],
                'coach_name' => $result['coach_first_name'] . ' ' . 
                                        $result['coach_last_name'],
                'reader_name' => $result['reader_name'],
                'venue_name' => $result['venue_name'],
                'venue_address' => $result['venue_address'] ?? '',
                'date' => $result['date'],
                'coach_id' => $result['coach_id'],
                'ics_uid' => $result['ics_uid'] ?? null,
                'ics_sequence' => $result['ics_sequence'] ?? 0
            ];
        } catch (Exception $e) {
            $this->logger->error('get_review_data: ' . $e->getMessage());
            return null;
        }
    }
    # --------------------------------------------------------------------------
    
    private function increment_ics_sequence(int $review_id): int {
        try {
            $stmt = $this->conn->prepare(
                    'SELECT ics_sequence FROM reviews WHERE review_id = :review_id');
            $stmt->execute([':review_id' => $review_id]);
            $current_sequence = $stmt->fetchColumn() ?: 0;
            
            $new_sequence = $current_sequence + 1;
            $update_stmt = $this->conn->prepare(
                'UPDATE reviews SET ics_sequence = :sequence WHERE review_id = :review_id');
            $update_stmt->execute([':sequence' => $new_sequence, 
                                   ':review_id' => $review_id]);
            
            return $new_sequence;
        } catch (Exception $e) {
            $this->logger->error('increment_ics_sequence: ' . $e->getMessage());
            return 1;
        }
    }
    # --------------------------------------------------------------------------
    
    private function send_review_cancellation_email(int $review_id): void {
        $data = $this->get_review_data($review_id, false);
        if (!$data) {
            throw new Exception("Failed to get review data for review ID: {$review_id}");
        }
        
        $this->increment_ics_sequence($review_id);
        $subject = 'Reader Review Cancelled';
        $body = $this->build_email_body('cancelled', $data);
        if ($body === null) {
            return;
        }
        
        $mailer = new Mailer();
        $coach_email = $this->ok_email_coach($data['coach_id']) ? $data['coach_email'] : null;
        $success = $mailer->send_email($data['coordinator_email'], $subject, $body, 
                            $coach_email);
        if (!$success) {
            throw new Exception("Failed to send review cancellation email for review ID: {$review_id}");
        }                            
    }
    # --------------------------------------------------------------------------
        
    private function send_review_invitation_email(int $review_id, 
                        int $coordinator_id, int $coach_id, int $reader_id, 
                        int $venue_id, string $date): void {
        $data = $this->get_invitation_data($coordinator_id, $coach_id, 
                                            $reader_id, $venue_id, $date);
        if (!$data) {
            throw new Exception("Failed to get invitation data for review ID: {$review_id}");
        }
        
        $subject = 'Reader Review Invitation';
        $body = $this->build_email_body('invitation', $data);
        if ($body === null) {
            return;
        }
        $ics_content = $this->create_ics_invitation($review_id, $data['reader_name'], 
                    $data['coach_name'], $data['coordinator_name'], 
                    $data['venue_name'], $data['venue_address'], $date, 
                    $data['coordinator_email'], $data['coach_email']);
        
        $mailer = new Mailer();
        $coach_email = $this->ok_email_coach($coach_id) ? $data['coach_email'] : null;        
        $success = $mailer->send_email_with_attachment($data['coordinator_email'], $subject, $body, 
                    $ics_content, 'review_invitation.ics', $coach_email);
        
        if (!$success) {
            throw new Exception("Failed to send review invitation email for review ID: {$review_id}");
        }
    }
    # --------------------------------------------------------------------------
    
    private function send_review_update_email(int $review_id): void {
        $data = $this->get_review_data($review_id, true);
        if (!$data) {
            throw new Exception("Failed to get review data for review ID: {$review_id}");
        }
        
        $body = $this->build_email_body('update', $data);
        if ($body === null) {
            return;
        }
        $new_sequence = $this->increment_ics_sequence($review_id);
        $ics_content = $data['ics_uid'] === null ?
                        $this->create_ics_invitation($review_id, $data['reader_name'], 
                            $data['coach_name'], $data['coordinator_name'], 
                            $data['venue_name'], $data['venue_address'], $data['date'], 
                            $data['coordinator_email'], $data['coach_email']) :
                        $this->create_ics_update($data['ics_uid'], $new_sequence, 
                            $data['reader_name'], $data['coach_name'], $data['coordinator_name'], 
                            $data['venue_name'], $data['venue_address'], $data['date'], 
                            $data['coordinator_email'], $data['coach_email']);
        
        $mailer = new Mailer();
        $subject = 'Reader Review Update';
        $coach_email = $this->ok_email_coach($data['coach_id']) ? $data['coach_email'] : null;
        $mailer->send_email_with_attachment($data['coordinator_email'], $subject, $body, 
                    $ics_content, 'review_update.ics', $coach_email);
    }
    # --------------------------------------------------------------------------
}
# ------------------------------------------------------------------------------

/*
End
*/
