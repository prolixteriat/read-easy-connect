<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once 'DbBase.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

class DbOrg extends DbBase {

    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------
    # Role: director
    # Mandatory: name, region_id
    # Optional : n/a

    public function add_affiliate(Request $request): Status {
        $status = $this->validate_token($request, ['director']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getParsedBody());
        $status = $this->validate_params($data, ['name', 'region_id']);
        if (!$status->success) { 
            return $status; 
        }

        try {
            $stmt = $this->conn->prepare(
                'INSERT INTO affiliates (name, region_id) VALUES (:name, :region_id)'
            );
            $stmt->execute([
                ':name' => $data['name'], 
                ':region_id' => $data['region_id']
            ]);
            $status = new Status(true, 200, ['affiliate_id' => $this->conn->lastInsertId()]);
        } catch (Exception $e) {
            $this->logger->error('add_affiliate: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (add_affiliate)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager
    # Mandatory: name
    # Optional : n/a

    public function add_area(Request $request): Status {
        $status = $this->validate_token($request, ['manager']);
        if (!$status->success) {
            return $status; 
        }

        $data = $this->sanitise_array($request->getParsedBody());
        $status = $this->validate_params($data, ['name']);
        if (!$status->success) { 
            return $status; 
        }

        try {
            # Get caller's affiliate_id
            $affiliate_stmt = $this->conn->prepare(
                'SELECT affiliate_id FROM managers WHERE manager_id = :user_id');
            $affiliate_stmt->execute([':user_id' => $this->user_id]);
            $affiliate_id = $affiliate_stmt->fetchColumn();
            
            $stmt = $this->conn->prepare(
                'INSERT INTO areas (name, affiliate_id) VALUES (:name, :affiliate_id)'
            );
            $stmt->execute([
                ':name' => $data['name'], 
                ':affiliate_id' => $affiliate_id
            ]);
            $area_id = $this->conn->lastInsertId();
            $this->add_audit(AuditType::OTHER, 
                "Area added: {$data['name']} (ID: {$area_id})", 
                $this->user_id, $affiliate_id);
            $status = new Status(true, 200, ['area_id' => $area_id]);
        } catch (Exception $e) {
            $this->logger->error('add_area: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (add_area)']);
        }
        return $status;
    }    
    # ----------------------------------------------------------------------
    # Role: director
    # Mandatory: name
    # Optional : n/a

    public function add_region(Request $request): Status {
        $status = $this->validate_token($request, ['director']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getParsedBody());
        $status = $this->validate_params($data, ['name']);
        if (!$status->success) { 
            return $status; 
        }

        try {
            $stmt = $this->conn->prepare(
                'INSERT INTO regions (name) VALUES (:name)');
            $stmt->execute([':name' => $data['name']]);
            $status = new Status(true, 200, ['region_id' => $this->conn->lastInsertId()]);
        } catch (Exception $e) {
            $this->logger->error('add_region: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (add_region)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager
    # Mandatory: name, affiliate_id
    # Optional : address, contact_name, contact_email, contact_telephone, notes

    public function add_venue(Request $request): Status {
        $status = $this->validate_token($request, ['manager']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getParsedBody());
        $status = $this->validate_params($data, ['name']);
        if (!$status->success) { 
            return $status; 
        }

        try {
            # Get caller's affiliate_id
            $manager_stmt = $this->conn->prepare(
                'SELECT affiliate_id FROM managers WHERE manager_id = :user_id');
            $manager_stmt->execute([':user_id' => $this->user_id]);
            $affiliate_id = $manager_stmt->fetchColumn();
            
            $stmt = $this->conn->prepare('
                INSERT INTO venues (name, affiliate_id, address, contact_name, 
                                  contact_email, contact_telephone, notes) 
                VALUES (:name, :affiliate_id, :address, :contact_name, 
                       :contact_email, :contact_telephone, :notes)
            ');
            $stmt->execute([
                ':name' => $data['name'],
                ':affiliate_id' => $affiliate_id,
                ':address' => $data['address'] ?? null,
                ':contact_name' => $this->encrypt_field($data['contact_name'] ?? null),
                ':contact_email' => $this->encrypt_field($data['contact_email'] ?? null),
                ':contact_telephone' => $this->encrypt_field($data['contact_telephone'] ?? null),
                ':notes' => $data['notes'] ?? null
            ]);
            
            $venue_id = $this->conn->lastInsertId();
            $this->add_audit(AuditType::OTHER, "Venue added: {$data['name']}", 
                            $this->user_id, $affiliate_id);
            $status = new Status(true, 200, ['venue_id' => $venue_id]);
        } catch (Exception $e) {
            $this->logger->error('add_venue: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (add_venue)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: director
    # Mandatory: affiliate_id
    # Optional : name, region_id, disabled

    public function edit_affiliate(Request $request): Status {
        $status = $this->validate_token($request, ['director']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getParsedBody());
        $status = $this->validate_params($data, ['affiliate_id']);
        if (!$status->success) { 
            return $status; 
        }

        try {
            $updates = [];
            $params = [':affiliate_id' => $data['affiliate_id']];
            
            if (isset($data['name'])) {
                $updates[] = 'name = :name';
                $params[':name'] = $data['name'];
            }
            if (isset($data['region_id'])) {
                $updates[] = 'region_id = :region_id';
                $params[':region_id'] = $data['region_id'];
            }
            if (isset($data['disabled'])) {
                $updates[] = 'disabled = :disabled';
                $params[':disabled'] = $data['disabled'];
            }

            if (empty($updates)) {
                return new Status(false, 400, ['message' => 'No fields to update']);
            }

            $query = 'UPDATE affiliates SET ' . implode(', ', $updates) . 
                    ' WHERE affiliate_id = :affiliate_id';
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            
            $status = new Status(true, 200, ['message' => 'Affiliate updated successfully']);
        } catch (Exception $e) {
            $this->logger->error('edit_affiliate: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (edit_affiliate)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager
    # Mandatory: area_id
    # Optional : name, disabled

    public function edit_area(Request $request): Status {
        $status = $this->validate_token($request, ['manager']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getParsedBody());
        $status = $this->validate_params($data, ['area_id']);
        if (!$status->success) { 
            return $status; 
        }

        try {
            # Get manager's affiliate_id
            $manager_stmt = $this->conn->prepare(
                'SELECT affiliate_id FROM managers WHERE manager_id = :user_id');
            $manager_stmt->execute([':user_id' => $this->user_id]);
            $manager_affiliate_id = $manager_stmt->fetchColumn();
            
            # Check if area belongs to manager's affiliate
            $area_stmt = $this->conn->prepare(
                'SELECT affiliate_id FROM areas WHERE area_id = :area_id');
            $area_stmt->execute([':area_id' => $data['area_id']]);
            $area_affiliate_id = $area_stmt->fetchColumn();
            
            if ($area_affiliate_id !== $manager_affiliate_id) {
                return new Status(false, 403, ['message' => 'Access denied']);
            }
            
            $updates = [];
            $params = [':area_id' => $data['area_id']];
            
            if (isset($data['name'])) {
                $updates[] = 'name = :name';
                $params[':name'] = $data['name'];
            }

            if (isset($data['disabled'])) {
                $updates[] = 'disabled = :disabled';
                $params[':disabled'] = $data['disabled'];
            }

            if (empty($updates)) {
                return new Status(false, 400, ['message' => 'No fields to update']);
            }

            $query = 'UPDATE areas SET ' . implode(', ', $updates) . 
                     ' WHERE area_id = :area_id';
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            
            $this->add_audit(AuditType::OTHER, "Area updated: ID {$data['area_id']}", 
                            $this->user_id, $manager_affiliate_id);
            $status = new Status(true, 200, ['message' => 'Area updated successfully']);
        } catch (Exception $e) {
            $this->logger->error('edit_area: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (edit_area)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: director
    # Mandatory: region_id
    # Optional : name, disabled

    public function edit_region(Request $request): Status {
        $status = $this->validate_token($request, ['director']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getParsedBody());
        $status = $this->validate_params($data, ['region_id']);
        if (!$status->success) { 
            return $status; 
        }

        try {
            $updates = [];
            $params = [':region_id' => $data['region_id']];
            
            if (isset($data['name'])) {
                $updates[] = 'name = :name';
                $params[':name'] = $data['name'];
            }
            if (isset($data['disabled'])) {
                $updates[] = 'disabled = :disabled';
                $params[':disabled'] = $data['disabled'];
            }

            if (empty($updates)) {
                return new Status(false, 400, ['message' => 'No fields to update']);
            }

            $query = 'UPDATE regions SET ' . implode(', ', $updates) . 
                     ' WHERE region_id = :region_id';
            $stmt = $this->conn->prepare($query);
            if (!$stmt) {
                throw new Exception('Failed to prepare region update query');
            }
            
            $result = $stmt->execute($params);
            if (!$result) {
                throw new Exception('Failed to execute region update query');
            }
            
            $status = new Status(true, 200, ['message' => 'Region updated successfully']);
        } catch (Exception $e) {
            $this->logger->error('edit_region: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (edit_region)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager
    # Mandatory: venue_id
    # Optional : name, address, contact_name, contact_email, contact_telephone, 
    #               notes, disabled

    public function edit_venue(Request $request): Status {
        $status = $this->validate_token($request, ['manager']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getParsedBody());
        $status = $this->validate_params($data, ['venue_id']);
        if (!$status->success) { 
            return $status; 
        }

        try {
            # Get manager's affiliate_id
            $manager_stmt = $this->conn->prepare(
                'SELECT affiliate_id FROM managers WHERE manager_id = :user_id');
            $manager_stmt->execute([':user_id' => $this->user_id]);
            $manager_affiliate_id = $manager_stmt->fetchColumn();
            
            # Check if venue belongs to manager's affiliate
            $venue_stmt = $this->conn->prepare(
                'SELECT affiliate_id FROM venues WHERE venue_id = :venue_id');
            $venue_stmt->execute([':venue_id' => $data['venue_id']]);
            $venue_affiliate_id = $venue_stmt->fetchColumn();
            
            if ($venue_affiliate_id !== $manager_affiliate_id) {
                return new Status(false, 403, ['message' => 'Access denied']);
            }
            
            $updates = [];
            $params = [':venue_id' => $data['venue_id']];
            
            if (isset($data['name'])) {
                $updates[] = 'name = :name';
                $params[':name'] = $data['name'];
            }
            if (isset($data['address'])) {
                $updates[] = 'address = :address';
                $params[':address'] = $data['address'];
            }
            if (isset($data['contact_name'])) {
                $updates[] = 'contact_name = :contact_name';
                $params[':contact_name'] = $this->encrypt_field($data['contact_name']);
            }
            if (isset($data['contact_email'])) {
                $updates[] = 'contact_email = :contact_email';
                $params[':contact_email'] = $this->encrypt_field($data['contact_email']);
            }
            if (isset($data['contact_telephone'])) {
                $updates[] = 'contact_telephone = :contact_telephone';
                $params[':contact_telephone'] = $this->encrypt_field($data['contact_telephone']);
            }
            if (isset($data['notes'])) {
                $updates[] = 'notes = :notes';
                $params[':notes'] = $data['notes'];
            }
            if (isset($data['disabled'])) {
                $updates[] = 'disabled = :disabled';
                $params[':disabled'] = $data['disabled'];
            }

            if (empty($updates)) {
                return new Status(false, 400, ['message' => 'No fields to update']);
            }

            $query = 'UPDATE venues SET ' . implode(', ', $updates) . 
                     ' WHERE venue_id = :venue_id';
            $stmt = $this->conn->prepare($query);
            if (!$stmt) {
                throw new Exception('Failed to prepare venue update query');
            }
            
            $result = $stmt->execute($params);
            if (!$result) {
                throw new Exception('Failed to execute venue update query');
            }
            
            $this->add_audit(AuditType::OTHER, "Venue updated: ID {$data['venue_id']}", 
                            $this->user_id, $manager_affiliate_id);
            $status = new Status(true, 200, ['message' => 'Venue updated successfully']);
        } catch (Exception $e) {
            $this->logger->error('edit_venue: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (edit_venue)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: director
    # Mandatory: region_id
    # Optional : n/a

    public function get_affiliates(Request $request): Status {
        $status = $this->validate_token($request, ['director']);
        if (!$status->success) { 
            return $status; 
        }

        $queryParams = $this->sanitise_array($request->getQueryParams());
        $data = $this->sanitise_array($queryParams);
        $status = $this->validate_params($data, ['region_id']);
        if (!$status->success) { 
            return $status; 
        }

        try {
            $stmt = $this->conn->prepare('
                SELECT a.*, r.name as region_name 
                FROM affiliates a 
                JOIN regions r ON a.region_id = r.region_id 
                WHERE a.region_id = :region_id 
                ORDER BY a.name
            ');
            $stmt->execute([':region_id' => $data['region_id']]);
            $affiliates = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $status = new Status(true, 200, $affiliates);
        } catch (Exception $e) {
            $this->logger->error('get_affiliates: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_affiliates)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator
    # Mandatory: n/a
    # Optional : n/a

    public function get_areas(Request $request): Status {
        $status = $this->validate_token($request, ['manager', 'coordinator']);
        if (!$status->success) { 
            return $status; 
        }
        
        try {
            $affiliate_id = $this->get_user_affiliate_id($this->user_id, $this->role);
            if (!$affiliate_id) {
                return new Status(false, 403, ['message' => 'User not associated with any affiliate']);
            }

            $stmt = $this->conn->prepare('
                SELECT ar.*, af.name as affiliate_name 
                FROM areas ar 
                JOIN affiliates af ON ar.affiliate_id = af.affiliate_id 
                WHERE ar.affiliate_id = :affiliate_id 
                ORDER BY ar.name
            ');
            $stmt->execute([':affiliate_id' => $affiliate_id]);
            $areas = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $status = new Status(true, 200, $areas);
        } catch (Exception $e) {
            $this->logger->error('get_areas: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_areas)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: director
    # Mandatory: n/a
    # Optional : n/a

    public function get_regions(Request $request): Status {
        $status = $this->validate_token($request, ['director']);
        if (!$status->success) { 
            return $status; 
        }

        try {
            $stmt = $this->conn->prepare('SELECT * FROM regions ORDER BY name');
            $stmt->execute();
            $regions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $status = new Status(true, 200, $regions);
        } catch (Exception $e) {
            $this->logger->error('get_regions: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_regions)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, 'viewer'
    # Mandatory: n/a
    # Optional : n/a

    public function get_venues(Request $request): Status {
        $status = $this->validate_token($request, ['manager', 'coordinator', 'viewer']);
        if (!$status->success) { 
            return $status; 
        }
        
        try {
            $affiliate_id = $this->get_user_affiliate_id($this->user_id, $this->role);
            if (!$affiliate_id) {
                return new Status(false, 403, ['message' => 'User not associated with any affiliate']);
            }

            $stmt = $this->conn->prepare('
                SELECT v.*, af.name as affiliate_name 
                FROM venues v 
                JOIN affiliates af ON v.affiliate_id = af.affiliate_id 
                WHERE v.affiliate_id = :affiliate_id 
                ORDER BY v.name
            ');
            $stmt->execute([':affiliate_id' => $affiliate_id]);
            $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            # Decrypt contact fields
            foreach ($venues as &$venue) {
                try {
                    $venue['contact_name'] = $this->decrypt_field($venue['contact_name']);
                    $venue['contact_email'] = $this->decrypt_field($venue['contact_email']);
                    $venue['contact_telephone'] = $this->decrypt_field($venue['contact_telephone']);
                } catch (Exception $e) {
                    $this->logger->error('get_venues decryption failed: ' . $e->getMessage());
                    $venue['contact_name'] = null;
                    $venue['contact_email'] = null;
                    $venue['contact_telephone'] = null;
                }
            }
            
            $status = new Status(true, 200, $venues);
        } catch (Exception $e) {
            $this->logger->error('get_venues: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_venues)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
}
# ------------------------------------------------------------------------------

/*
End
*/
