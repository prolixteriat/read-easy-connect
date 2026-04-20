<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once 'DbBase.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

class DbNotes extends DbBase {

    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------
    # Role: manager, coordinator
    # Mandatory: about_id, note
    # Optional: note_at

    public function add_coach_note(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['about_id', 'note'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            if (!is_numeric($params['about_id']) || $params['about_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid about_id']);
            }

            $about_id = (int)$params['about_id'];
            if (!$this->has_coach_access($about_id)) {
                return new Status(false, 403, ['message' => 'Access denied to this coach']);
            }

            if (empty(trim($params['note']))) {
                return new Status(false, 400, ['message' => 'Note cannot be empty']);
            }
            
            $sql = 'INSERT INTO coach_notes (about_id, by_id, note, note_at) 
                    VALUES (:about_id, :by_id, :note, :note_at)';

            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare coach note insert query');
            }
            $result = $stmt->execute([
                ':about_id' => $about_id,
                ':by_id'    => $this->user_id,
                ':note'     => $params['note'],
                ':note_at'  => $params['note_at'] ?? date('Y-m-d H:i:s')
            ]);
            if (!$result) {
                throw new Exception('Failed to insert coach note record');
            }

            $note_id = $this->conn->lastInsertId();
            $status = new Status(true, 200, ['note_id' => (int)$note_id]);
            
        } catch (Exception $e) {
            $this->logger->error('add_coach_note: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (add_coach_note): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator
    # Mandatory: about_id, note
    # Optional: note_at

    public function add_reader_note(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['about_id', 'note'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            if (!is_numeric($params['about_id']) || $params['about_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid about_id']);
            }

            $about_id = (int)$params['about_id'];
            if (!$this->has_reader_access($about_id)) {
                return new Status(false, 403, ['message' => 'Access denied to this reader']);
            }

            if (empty(trim($params['note']))) {
                return new Status(false, 400, ['message' => 'Note cannot be empty']);
            }
            
            $sql = 'INSERT INTO reader_notes (about_id, by_id, note, note_at) 
                    VALUES (:about_id, :by_id, :note, :note_at)';

            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare reader note insert query');
            }
            $result = $stmt->execute([
                ':about_id' => $about_id,
                ':by_id'    => $this->user_id,
                ':note'     => $params['note'],
                ':note_at'  => $params['note_at'] ?? date('Y-m-d H:i:s')
            ]);
            if (!$result) {
                throw new Exception('Failed to insert reader note record');
            }

            $note_id = $this->conn->lastInsertId();
            $status = new Status(true, 200, ['note_id' => (int)$note_id]);
            
        } catch (Exception $e) {
            $this->logger->error('add_reader_note: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (add_reader_note): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator
    # Mandatory: note_id
    # Optional: note, note_at

    public function edit_coach_note(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['note_id'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            if (!is_numeric($params['note_id']) || $params['note_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid note_id']);
            }

            $note_id = (int)$params['note_id'];

            $sql = 'SELECT cn.*, c.affiliate_id FROM coach_notes cn 
                    JOIN coaches c ON cn.about_id = c.coach_id 
                    WHERE cn.note_id = :note_id LIMIT 1';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':note_id' => $note_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                return new Status(false, 404, ['message' => 'Coach note not found']);
            }

            if (!$this->has_affiliate_access($result['affiliate_id'])) {
                return new Status(false, 403, ['message' => 'Access denied to this coach note']);
            }

            if ($result['by_id'] != $this->user_id) {
                return new Status(false, 403, ['message' => 'Only the note creator can edit this note']);
            }

            $note = $params['note'] ?? $result['note'];
            $note_at = $params['note_at'] ?? $result['note_at'];

            $sql = 'UPDATE coach_notes SET note = :note, note_at = :note_at WHERE note_id = :note_id';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':note'     => $note,
                ':note_at'  => $note_at,
                ':note_id'  => $note_id
            ]);

            $status = new Status(true, 200, ['message' => 'Coach note updated successfully']);
            
        } catch (Exception $e) {
            $this->logger->error('edit_coach_note: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (edit_coach_note): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator
    # Mandatory: note_id
    # Optional: note, note_at

    public function edit_reader_note(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['note_id'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            if (!is_numeric($params['note_id']) || $params['note_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid note_id']);
            }

            $note_id = (int)$params['note_id'];

            $sql = 'SELECT rn.*, r.affiliate_id FROM reader_notes rn 
                    JOIN readers r ON rn.about_id = r.reader_id 
                    WHERE rn.note_id = :note_id LIMIT 1';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':note_id' => $note_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                return new Status(false, 404, ['message' => 'Reader note not found']);
            }

            if (!$this->has_affiliate_access($result['affiliate_id'])) {
                return new Status(false, 403, ['message' => 'Access denied to this reader note']);
            }

            if ($result['by_id'] != $this->user_id) {
                return new Status(false, 403, ['message' => 'Only the note creator can edit this note']);
            }

            $note = $params['note'] ?? $result['note'];
            $note_at = $params['note_at'] ?? $result['note_at'];

            $sql = 'UPDATE reader_notes SET note = :note, note_at = :note_at WHERE note_id = :note_id';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':note'     => $note,
                ':note_at'  => $note_at,
                ':note_id'  => $note_id
            ]);

            $status = new Status(true, 200, ['message' => 'Reader note updated successfully']);
            
        } catch (Exception $e) {
            $this->logger->error('edit_reader_note: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (edit_reader_note): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator
    # Mandatory: n/a
    # Optional: about_id

    public function get_coach_notes(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            
            $params = $this->sanitise_array($request->getQueryParams());
            
            if (isset($params['about_id'])) {
                $about_id = (int)$params['about_id'];
                
                if (!$this->has_coach_access($about_id)) {
                    return new Status(false, 403, ['message' => 'Access denied to this coach']);
                }
                
                $sql = 'SELECT cn.*, 
                        CONCAT(u_about.first_name, " ", u_about.last_name) as about_name,
                        CONCAT(u_by.first_name, " ", u_by.last_name) as by_name
                        FROM coach_notes cn 
                        JOIN users u_about ON cn.about_id = u_about.user_id
                        JOIN users u_by ON cn.by_id = u_by.user_id 
                        WHERE cn.about_id = :about_id 
                        ORDER BY cn.note_at DESC';
                
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([':about_id' => $about_id]);
            } else {
                $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
                
                $sql = 'SELECT cn.*, 
                        CONCAT(u_about.first_name, " ", u_about.last_name) as about_name,
                        CONCAT(u_by.first_name, " ", u_by.last_name) as by_name
                        FROM coach_notes cn 
                        JOIN users u_about ON cn.about_id = u_about.user_id
                        JOIN users u_by ON cn.by_id = u_by.user_id 
                        JOIN coaches c ON cn.about_id = c.coach_id 
                        WHERE c.affiliate_id = :affiliate_id 
                        ORDER BY cn.note_at DESC';
                
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([':affiliate_id' => $user_affiliate]);
            }
            
            $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $status = new Status(true, 200, $notes);
            
        } catch (Exception $e) {
            $this->logger->error('get_coach_notes: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_coach_notes): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator
    # Mandatory: n/a
    # Optional: about_id

    public function get_reader_notes(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator']);
            if (!$status->success) { 
                return $status; 
            }
            
            $params = $this->sanitise_array($request->getQueryParams());
            
            if (isset($params['about_id'])) {
                $about_id = (int)$params['about_id'];
                
                if (!$this->has_reader_access($about_id)) {
                    return new Status(false, 403, ['message' => 'Access denied to this reader']);
                }
                
                $sql = 'SELECT rn.*, 
                        r.name as about_name,
                        CONCAT(u_by.first_name, " ", u_by.last_name) as by_name
                        FROM reader_notes rn 
                        JOIN readers r ON rn.about_id = r.reader_id
                        JOIN users u_by ON rn.by_id = u_by.user_id 
                        WHERE rn.about_id = :about_id 
                        ORDER BY rn.note_at DESC';
                
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([':about_id' => $about_id]);
            } else {
                $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
                
                $sql = 'SELECT rn.*, 
                        r.name as about_name,
                        CONCAT(u_by.first_name, " ", u_by.last_name) as by_name
                        FROM reader_notes rn 
                        JOIN readers r ON rn.about_id = r.reader_id
                        JOIN users u_by ON rn.by_id = u_by.user_id 
                        WHERE r.affiliate_id = :affiliate_id 
                        ORDER BY rn.note_at DESC';
                
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([':affiliate_id' => $user_affiliate]);
            }
            
            $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $status = new Status(true, 200, $notes);
            
        } catch (Exception $e) {
            $this->logger->error('get_reader_notes: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_reader_notes): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, viewer
    # Mandatory: about_id, note
    # Optional: note_at, type

    public function add_org_note(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 'viewer']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['about_id', 'note'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            if (!is_numeric($params['about_id']) || $params['about_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid about_id']);
            }

            $about_id = (int)$params['about_id'];
            if (!$this->has_org_access($about_id)) {
                return new Status(false, 403, ['message' => 'Access denied to this org']);
            }

            if (empty(trim($params['note']))) {
                return new Status(false, 400, ['message' => 'Note cannot be empty']);
            }
            
            $sql = 'INSERT INTO org_notes (about_id, by_id, note, note_at, type) 
                    VALUES (:about_id, :by_id, :note, :note_at, :type)';

            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare org note insert query');
            }
            $result = $stmt->execute([
                ':about_id' => $about_id,
                ':by_id'    => $this->user_id,
                ':note'     => $params['note'],
                ':note_at'  => $params['note_at'] ?? date('Y-m-d H:i:s'),
                ':type'     => $params['type'] ?? null
            ]);
            if (!$result) {
                throw new Exception('Failed to insert org note record');
            }

            $note_id = $this->conn->lastInsertId();
            $status = new Status(true, 200, ['note_id' => (int)$note_id]);
            
        } catch (Exception $e) {
            $this->logger->error('add_org_note: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (add_org_note): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, viewer
    # Mandatory: note_id
    # Optional: note, note_at, type

    public function edit_org_note(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 'viewer']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['note_id'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            if (!is_numeric($params['note_id']) || $params['note_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid note_id']);
            }

            $note_id = (int)$params['note_id'];

            $sql = 'SELECT on_tbl.*, o.affiliate_id FROM org_notes on_tbl 
                    JOIN orgs o ON on_tbl.about_id = o.org_id 
                    WHERE on_tbl.note_id = :note_id LIMIT 1';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':note_id' => $note_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                return new Status(false, 404, ['message' => 'Org note not found']);
            }

            if (!$this->has_affiliate_access($result['affiliate_id'])) {
                return new Status(false, 403, ['message' => 'Access denied to this org note']);
            }

            if ($result['by_id'] != $this->user_id) {
                return new Status(false, 403, ['message' => 'Only the note creator can edit this note']);
            }

            $note = $params['note'] ?? $result['note'];
            $note_at = $params['note_at'] ?? $result['note_at'];
            $type = array_key_exists('type', $params) ? $params['type'] : $result['type'];

            $sql = 'UPDATE org_notes SET note = :note, note_at = :note_at, type = :type WHERE note_id = :note_id';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':note'     => $note,
                ':note_at'  => $note_at,
                ':type'     => $type,
                ':note_id'  => $note_id
            ]);

            $status = new Status(true, 200, ['message' => 'Org note updated successfully']);
            
        } catch (Exception $e) {
            $this->logger->error('edit_org_note: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (edit_org_note): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, viewer
    # Mandatory: n/a
    # Optional: about_id

    public function get_org_notes(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 'viewer']);
            if (!$status->success) { 
                return $status; 
            }
            
            $params = $this->sanitise_array($request->getQueryParams());
            
            if (isset($params['about_id'])) {
                $about_id = (int)$params['about_id'];
                
                if (!$this->has_org_access($about_id)) {
                    return new Status(false, 403, ['message' => 'Access denied to this org']);
                }
                
                $sql = 'SELECT on_tbl.*, 
                        o.name as about_name,
                        CONCAT(u_by.first_name, " ", u_by.last_name) as by_name
                        FROM org_notes on_tbl 
                        JOIN orgs o ON on_tbl.about_id = o.org_id
                        JOIN users u_by ON on_tbl.by_id = u_by.user_id 
                        WHERE on_tbl.about_id = :about_id 
                        ORDER BY on_tbl.note_at DESC';
                
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([':about_id' => $about_id]);
            } else {
                $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
                
                $sql = 'SELECT on_tbl.*, 
                        o.name as about_name,
                        CONCAT(u_by.first_name, " ", u_by.last_name) as by_name
                        FROM org_notes on_tbl 
                        JOIN orgs o ON on_tbl.about_id = o.org_id
                        JOIN users u_by ON on_tbl.by_id = u_by.user_id 
                        WHERE o.affiliate_id = :affiliate_id 
                        ORDER BY on_tbl.note_at DESC';
                
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([':affiliate_id' => $user_affiliate]);
            }
            
            $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $status = new Status(true, 200, $notes);
            
        } catch (Exception $e) {
            $this->logger->error('get_org_notes: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_org_notes): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, viewer
    # Mandatory: about_id, note
    # Optional: note_at

    public function add_referral_note(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 'viewer']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['about_id', 'note'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            if (!is_numeric($params['about_id']) || $params['about_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid about_id']);
            }

            $about_id = (int)$params['about_id'];
            if (!$this->has_referral_access($about_id)) {
                return new Status(false, 403, ['message' => 'Access denied to this referral']);
            }

            if (empty(trim($params['note']))) {
                return new Status(false, 400, ['message' => 'Note cannot be empty']);
            }
            
            $sql = 'INSERT INTO referral_notes (about_id, by_id, note, note_at) 
                    VALUES (:about_id, :by_id, :note, :note_at)';

            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare referral note insert query');
            }
            $result = $stmt->execute([
                ':about_id' => $about_id,
                ':by_id'    => $this->user_id,
                ':note'     => $params['note'],
                ':note_at'  => $params['note_at'] ?? date('Y-m-d H:i:s')
            ]);
            if (!$result) {
                throw new Exception('Failed to insert referral note record');
            }

            $note_id = $this->conn->lastInsertId();
            $status = new Status(true, 200, ['note_id' => (int)$note_id]);
            
        } catch (Exception $e) {
            $this->logger->error('add_referral_note: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (add_referral_note): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, viewer
    # Mandatory: note_id
    # Optional: note, note_at

    public function edit_referral_note(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 'viewer']);
            if (!$status->success) { 
                return $status; 
            }
            $params = $this->sanitise_array($request->getParsedBody());
            $required_params = ['note_id'];
            $status = $this->validate_params($params, $required_params);
            if (!$status->success) { 
                return $status; 
            }
            
            if (!is_numeric($params['note_id']) || $params['note_id'] <= 0) {
                return new Status(false, 400, ['message' => 'Invalid note_id']);
            }

            $note_id = (int)$params['note_id'];

            $sql = 'SELECT rn.*, o.affiliate_id FROM referral_notes rn 
                    JOIN referrals r ON rn.about_id = r.referral_id 
                    JOIN orgs o ON r.org_id = o.org_id 
                    WHERE rn.note_id = :note_id LIMIT 1';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':note_id' => $note_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                return new Status(false, 404, ['message' => 'Referral note not found']);
            }

            if (!$this->has_affiliate_access($result['affiliate_id'])) {
                return new Status(false, 403, ['message' => 'Access denied to this referral note']);
            }

            if ($result['by_id'] != $this->user_id) {
                return new Status(false, 403, ['message' => 'Only the note creator can edit this note']);
            }

            $note = $params['note'] ?? $result['note'];
            $note_at = $params['note_at'] ?? $result['note_at'];

            $sql = 'UPDATE referral_notes SET note = :note, note_at = :note_at WHERE note_id = :note_id';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':note'     => $note,
                ':note_at'  => $note_at,
                ':note_id'  => $note_id
            ]);

            $status = new Status(true, 200, ['message' => 'Referral note updated successfully']);
            
        } catch (Exception $e) {
            $this->logger->error('edit_referral_note: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (edit_referral_note): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, viewer
    # Mandatory: n/a
    # Optional: about_id

    public function get_referral_notes(Request $request): Status {
        try {
            $status = $this->validate_token($request, ['manager', 'coordinator', 'viewer']);
            if (!$status->success) { 
                return $status; 
            }
            
            $params = $this->sanitise_array($request->getQueryParams());
            
            if (isset($params['about_id'])) {
                $about_id = (int)$params['about_id'];
                
                if (!$this->has_referral_access($about_id)) {
                    return new Status(false, 403, ['message' => 'Access denied to this referral']);
                }
                
                $sql = 'SELECT rn.*, 
                        o.name as about_name,
                        CONCAT(u_by.first_name, " ", u_by.last_name) as by_name
                        FROM referral_notes rn 
                        JOIN referrals r ON rn.about_id = r.referral_id
                        JOIN orgs o ON r.org_id = o.org_id
                        JOIN users u_by ON rn.by_id = u_by.user_id 
                        WHERE rn.about_id = :about_id 
                        ORDER BY rn.note_at DESC';
                
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([':about_id' => $about_id]);
            } else {
                $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
                
                $sql = 'SELECT rn.*, 
                        o.name as about_name,
                        CONCAT(u_by.first_name, " ", u_by.last_name) as by_name
                        FROM referral_notes rn 
                        JOIN referrals r ON rn.about_id = r.referral_id
                        JOIN orgs o ON r.org_id = o.org_id
                        JOIN users u_by ON rn.by_id = u_by.user_id 
                        WHERE o.affiliate_id = :affiliate_id 
                        ORDER BY rn.note_at DESC';
                
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([':affiliate_id' => $user_affiliate]);
            }
            
            $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $status = new Status(true, 200, $notes);
            
        } catch (Exception $e) {
            $this->logger->error('get_referral_notes: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_referral_notes): ' . $e->getMessage()]);
        }

        return $status;
    }
    # --------------------------------------------------------------------------

    private function has_coach_access(int $coach_id): bool {
        $sql = 'SELECT affiliate_id FROM coaches WHERE coach_id = :coach_id';
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':coach_id' => $coach_id]);
        $affiliate_id = $stmt->fetchColumn();
        
        return $affiliate_id && $this->has_affiliate_access($affiliate_id);
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

    private function has_org_access(int $org_id): bool {
        $sql = 'SELECT affiliate_id FROM orgs WHERE org_id = :org_id';
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':org_id' => $org_id]);
        $affiliate_id = $stmt->fetchColumn();
        
        return $affiliate_id && $this->has_affiliate_access($affiliate_id);
    }
    # --------------------------------------------------------------------------

    private function has_referral_access(int $referral_id): bool {
        $sql = 'SELECT o.affiliate_id FROM referrals r 
                JOIN orgs o ON r.org_id = o.org_id 
                WHERE r.referral_id = :referral_id';
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':referral_id' => $referral_id]);
        $affiliate_id = $stmt->fetchColumn();
        
        return $affiliate_id && $this->has_affiliate_access($affiliate_id);
    }
    # --------------------------------------------------------------------------

    private function has_affiliate_access(int $affiliate_id): bool {
        $user_affiliate = $this->get_user_affiliate_id($this->user_id, $this->role);
        return $user_affiliate === $affiliate_id;
    }
    # --------------------------------------------------------------------------
}
# ------------------------------------------------------------------------------

/*
End
*/
