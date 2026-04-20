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
            $status = new Status(false, 500, 
                ['message' => "Error occurred (add_affiliate): {$e->getMessage()}"]);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager
    # Mandatory: name, reader_area, org_area
    # Optional : n/a

    public function add_area(Request $request): Status {
        $status = $this->validate_token($request, ['manager']);
        if (!$status->success) {
            return $status; 
        }

        $data = $this->sanitise_array($request->getParsedBody());
        $status = $this->validate_params($data, ['name', 'reader_area', 'org_area']);
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
                'INSERT INTO areas (name, affiliate_id, reader_area, org_area) VALUES (:name, :affiliate_id, :reader_area, :org_area)'
            );
            $stmt->execute([
                ':name' => $data['name'], 
                ':affiliate_id' => (int)$affiliate_id,
                ':reader_area' => (int)$data['reader_area'],
                ':org_area' => (int)$data['org_area']
            ]);
            $area_id = $this->conn->lastInsertId();
            $this->add_audit(AuditType::OTHER, 
                "Area added: {$data['name']} (ID: {$area_id})", 
                $this->user_id, $affiliate_id);
            $status = new Status(true, 200, ['area_id' => $area_id]);
        } catch (Exception $e) {
            $this->logger->error('add_area: ' . $e->getMessage());
            $status = new Status(false, 500, 
                ['message' => "Error occurred (add_area): {$e->getMessage()}"]);
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
            $status = new Status(false, 500, 
                ['message' => "Error occurred (add_region): {$e->getMessage()}"]);
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
            $this->add_audit(AuditType::ORG_ADDED, "Venue added: {$data['name']}", 
                            $this->user_id, $affiliate_id);
            $status = new Status(true, 200, ['venue_id' => $venue_id]);
        } catch (Exception $e) {
            $this->logger->error('add_venue: ' . $e->getMessage());
            $status = new Status(false, 500, 
                ['message' => "Error occurred (add_venue): {$e->getMessage()}"]);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager (for role_venue), all roles (for other org types)
    # Mandatory: name
    # Optional : area_id, role_civic, role_donor, role_network, role_referrer, 
    #            role_supplier, role_supporter, role_venue, role_volunteer,
    #            reader_venue, general_venue, address, description, url, 
    #            status, summary, action

    public function add_org(Request $request): Status {
        $status = $this->validate_token($request, ['manager', 'coordinator', 'viewer']);
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
            $affiliate_id = $this->get_user_affiliate_id($this->user_id, $this->role);
            if (!$affiliate_id) {
                return new Status(false, 403, ['message' => 'User not associated with any affiliate']);
            }

            # Check role_venue restrictions
            $role_venue = isset($data['role_venue']) ? (bool)$data['role_venue'] : false;
            if ($role_venue) {
                # Only manager role can add venues
                if ($this->role !== 'manager') {
                    return new Status(false, 403, ['message' => 'Only managers can add venues']);
                }
                # reader_venue and/or general_venue must be true
                $reader_venue = isset($data['reader_venue']) ? (bool)$data['reader_venue'] : false;
                $general_venue = isset($data['general_venue']) ? (bool)$data['general_venue'] : false;
                if (!$reader_venue && !$general_venue) {
                    return new Status(false, 400, ['message' => 'For venues, reader_venue and/or general_venue must be true']);
                }
            }
            
            $stmt = $this->conn->prepare('
                INSERT INTO orgs (name, affiliate_id, area_id, role_civic, role_donor, 
                                role_network, role_referrer, role_supplier, role_supporter, 
                                role_venue, role_volunteer, reader_venue, general_venue, 
                                address, description, url, status, summary, action) 
                VALUES (:name, :affiliate_id, :area_id, :role_civic, :role_donor, 
                       :role_network, :role_referrer, :role_supplier, :role_supporter, 
                       :role_venue, :role_volunteer, :reader_venue, :general_venue, 
                       :address, :description, :url, :status, :summary, :action)
            ');
            $stmt->execute([
                ':name' => $data['name'],
                ':affiliate_id' => $affiliate_id,
                ':area_id' => $data['area_id'] ?? null,
                ':role_civic' => isset($data['role_civic']) ? (int)(bool)$data['role_civic'] : 0,
                ':role_donor' => isset($data['role_donor']) ? (int)(bool)$data['role_donor'] : 0,
                ':role_network' => isset($data['role_network']) ? (int)(bool)$data['role_network'] : 0,
                ':role_referrer' => isset($data['role_referrer']) ? (int)(bool)$data['role_referrer'] : 0,
                ':role_supplier' => isset($data['role_supplier']) ? (int)(bool)$data['role_supplier'] : 0,
                ':role_supporter' => isset($data['role_supporter']) ? (int)(bool)$data['role_supporter'] : 0,
                ':role_venue' => isset($data['role_venue']) ? (int)(bool)$data['role_venue'] : 0,
                ':role_volunteer' => isset($data['role_volunteer']) ? (int)(bool)$data['role_volunteer'] : 0,
                ':reader_venue' => isset($data['reader_venue']) ? (int)(bool)$data['reader_venue'] : 0,
                ':general_venue' => isset($data['general_venue']) ? (int)(bool)$data['general_venue'] : 0,
                ':address' => $data['address'] ?? null,
                ':description' => $data['description'] ?? null,
                ':url' => $data['url'] ?? null,
                ':status' => $data['status'] ?? null,
                ':summary' => $data['summary'] ?? null,
                ':action' => isset($data['action']) ? (int)(bool)$data['action'] : 0
            ]);
            
            $org_id = $this->conn->lastInsertId();
            $this->add_audit(AuditType::ORG_ADDED, "Org added: {$data['name']} (ID: {$org_id})", 
                            $this->user_id, $affiliate_id);
            $status = new Status(true, 200, ['org_id' => $org_id]);
        } catch (Exception $e) {
            $this->logger->error('add_org: ' . $e->getMessage());
            $status = new Status(false, 500, 
                ['message' => "Error occurred (add_org): {$e->getMessage()}"]);
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
            $status = new Status(false, 500, 
                ['message' => "Error occurred (edit_affiliate): {$e->getMessage()}"]);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager
    # Mandatory: area_id
    # Optional : name, disabled, reader_area, org_area

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

            if (isset($data['reader_area'])) {
                $updates[] = 'reader_area = :reader_area';
                $params[':reader_area'] = $data['reader_area'];
            }

            if (isset($data['org_area'])) {
                $updates[] = 'org_area = :org_area';
                $params[':org_area'] = $data['org_area'];
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
            $status = new Status(false, 500, 
                ['message' => "Error occurred (edit_area): {$e->getMessage()}"]);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager (for role_venue), all roles (for other org types)
    # Mandatory: org_id
    # Optional : name, area_id, role_civic, role_donor, role_network, role_referrer,
    #            role_supplier, role_supporter, role_venue, role_volunteer,
    #            reader_venue, general_venue, address, description, url,
    #            status, summary, action, disabled

    public function edit_org(Request $request): Status {
        $status = $this->validate_token($request, ['manager', 'coordinator', 'viewer']);
        if (!$status->success) { 
            return $status; 
        }

        $data = $this->sanitise_array($request->getParsedBody());
        $status = $this->validate_params($data, ['org_id']);
        if (!$status->success) { 
            return $status; 
        }

        try {
            # Get caller's affiliate_id
            $affiliate_id = $this->get_user_affiliate_id($this->user_id, $this->role);
            if (!$affiliate_id) {
                return new Status(false, 403, ['message' => 'User not associated with any affiliate']);
            }
            
            # Check if org belongs to user's affiliate
            $org_stmt = $this->conn->prepare(
                'SELECT affiliate_id, role_venue FROM orgs WHERE org_id = :org_id');
            $org_stmt->execute([':org_id' => $data['org_id']]);
            $org_data = $org_stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$org_data || $org_data['affiliate_id'] != $affiliate_id) {
                return new Status(false, 403, ['message' => 'Access denied']);
            }
            
            # Coordinators cannot change role_venue, reader_venue, or general_venue
            if ($this->role === 'coordinator') {
                if (isset($data['role_venue']) && (bool)$data['role_venue'] !== (bool)$org_data['role_venue']) {
                    return new Status(false, 403, ['message' => 'Coordinators cannot edit role_venue']);
                }
                if (isset($data['reader_venue']) || isset($data['general_venue'])) {
                    $check_stmt = $this->conn->prepare(
                        'SELECT reader_venue, general_venue FROM orgs WHERE org_id = :org_id');
                    $check_stmt->execute([':org_id' => $data['org_id']]);
                    $current_venue_data = $check_stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if (isset($data['reader_venue']) && (bool)$data['reader_venue'] !== (bool)$current_venue_data['reader_venue']) {
                        return new Status(false, 403, ['message' => 'Coordinators cannot edit reader_venue']);
                    }
                    if (isset($data['general_venue']) && (bool)$data['general_venue'] !== (bool)$current_venue_data['general_venue']) {
                        return new Status(false, 403, ['message' => 'Coordinators cannot edit general_venue']);
                    }
                }
            }
            
            # Check role_venue restrictions for managers
            $new_role_venue = isset($data['role_venue']) ? (bool)$data['role_venue'] : (bool)$org_data['role_venue'];
            
            if ($new_role_venue && $this->role === 'manager') {
                # reader_venue and/or general_venue must be true
                $reader_venue = isset($data['reader_venue']) ? (bool)$data['reader_venue'] : false;
                $general_venue = isset($data['general_venue']) ? (bool)$data['general_venue'] : false;
                
                # If not updating venue flags, check existing values
                if (!isset($data['reader_venue']) && !isset($data['general_venue'])) {
                    $check_stmt = $this->conn->prepare(
                        'SELECT reader_venue, general_venue FROM orgs WHERE org_id = :org_id');
                    $check_stmt->execute([':org_id' => $data['org_id']]);
                    $venue_data = $check_stmt->fetch(PDO::FETCH_ASSOC);
                    $reader_venue = (bool)$venue_data['reader_venue'];
                    $general_venue = (bool)$venue_data['general_venue'];
                }
                
                if (!$reader_venue && !$general_venue) {
                    return new Status(false, 400, ['message' => 'For venues, reader_venue and/or general_venue must be true']);
                }
            }
            
            $updates = [];
            $params = [':org_id' => $data['org_id']];
            
            if (isset($data['name'])) {
                $updates[] = 'name = :name';
                $params[':name'] = $data['name'];
            }
            if (array_key_exists('area_id', $data)) {
                $updates[] = 'area_id = :area_id';
                $params[':area_id'] = $data['area_id'];
            }
            if (isset($data['role_civic'])) {
                $updates[] = 'role_civic = :role_civic';
                $params[':role_civic'] = (int)(bool)$data['role_civic'];
            }
            if (isset($data['role_donor'])) {
                $updates[] = 'role_donor = :role_donor';
                $params[':role_donor'] = (int)(bool)$data['role_donor'];
            }
            if (isset($data['role_network'])) {
                $updates[] = 'role_network = :role_network';
                $params[':role_network'] = (int)(bool)$data['role_network'];
            }
            if (isset($data['role_referrer'])) {
                $updates[] = 'role_referrer = :role_referrer';
                $params[':role_referrer'] = (int)(bool)$data['role_referrer'];
            }
            if (isset($data['role_supplier'])) {
                $updates[] = 'role_supplier = :role_supplier';
                $params[':role_supplier'] = (int)(bool)$data['role_supplier'];
            }
            if (isset($data['role_supporter'])) {
                $updates[] = 'role_supporter = :role_supporter';
                $params[':role_supporter'] = (int)(bool)$data['role_supporter'];
            }
            if (isset($data['role_venue'])) {
                $updates[] = 'role_venue = :role_venue';
                $params[':role_venue'] = (int)(bool)$data['role_venue'];
            }
            if (isset($data['role_volunteer'])) {
                $updates[] = 'role_volunteer = :role_volunteer';
                $params[':role_volunteer'] = (int)(bool)$data['role_volunteer'];
            }
            if (isset($data['reader_venue'])) {
                $updates[] = 'reader_venue = :reader_venue';
                $params[':reader_venue'] = (int)(bool)$data['reader_venue'];
            }
            if (isset($data['general_venue'])) {
                $updates[] = 'general_venue = :general_venue';
                $params[':general_venue'] = (int)(bool)$data['general_venue'];
            }
            if (isset($data['address'])) {
                $updates[] = 'address = :address';
                $params[':address'] = $data['address'];
            }
            if (isset($data['description'])) {
                $updates[] = 'description = :description';
                $params[':description'] = $data['description'];
            }
            if (isset($data['url'])) {
                $updates[] = 'url = :url';
                $params[':url'] = $data['url'];
            }
            if (isset($data['status'])) {
                $updates[] = 'status = :status';
                $params[':status'] = $data['status'];
            }
            if (isset($data['summary'])) {
                $updates[] = 'summary = :summary';
                $params[':summary'] = $data['summary'];
            }
            if (isset($data['action'])) {
                $updates[] = 'action = :action';
                $params[':action'] = (int)(bool)$data['action'];
            }
            if (isset($data['disabled'])) {
                $updates[] = 'disabled = :disabled';
                $params[':disabled'] = (int)(bool)$data['disabled'];
            }

            if (empty($updates)) {
                return new Status(false, 400, ['message' => 'No fields to update']);
            }

            $query = 'UPDATE orgs SET ' . implode(', ', $updates) . 
                     ' WHERE org_id = :org_id';
            $stmt = $this->conn->prepare($query);
            if (!$stmt) {
                throw new Exception('Failed to prepare org update query');
            }
            
            $result = $stmt->execute($params);
            if (!$result) {
                throw new Exception('Failed to execute org update query');
            }
            
            $this->add_audit(AuditType::ORG_EDITED, "Org updated: ID {$data['org_id']}", 
                            $this->user_id, $affiliate_id);
            $status = new Status(true, 200, ['message' => 'Org updated successfully']);
        } catch (Exception $e) {
            $this->logger->error('edit_org: ' . $e->getMessage());
            $status = new Status(false, 500, 
                ['message' => "Error occurred (edit_org): {$e->getMessage()}"]);
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
            $status = new Status(false, 500, 
                ['message' => "Error occurred (edit_region): {$e->getMessage()}"]);
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
            
            $this->add_audit(AuditType::ORG_EDITED, "Venue updated: ID {$data['venue_id']}", 
                            $this->user_id, $manager_affiliate_id);
            $status = new Status(true, 200, ['message' => 'Venue updated successfully']);
        } catch (Exception $e) {
            $this->logger->error('edit_venue: ' . $e->getMessage());
            $status = new Status(false, 500, 
                ['message' => "Error occurred (edit_venue): {$e->getMessage()}"]);
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
    # Role: manager, coordinator, viewer
    # Mandatory: n/a
    # Optional : reader_area (default: TRUE), org_area (default: TRUE)

    public function get_areas(Request $request): Status {
        $status = $this->validate_token($request, ['manager', 'coordinator', 'viewer']);
        if (!$status->success) { 
            return $status; 
        }
        
        try {
            $affiliate_id = $this->get_user_affiliate_id($this->user_id, $this->role);
            if (!$affiliate_id) {
                return new Status(false, 403, ['message' => 'User not associated with any affiliate']);
            }

            $queryParams = $this->sanitise_array($request->getQueryParams());
            $reader_area = isset($queryParams['reader_area']) ? 
                    filter_var($queryParams['reader_area'], FILTER_VALIDATE_BOOLEAN) : true;
            $org_area = isset($queryParams['org_area']) ? 
                    filter_var($queryParams['org_area'], FILTER_VALIDATE_BOOLEAN) : true;

            $whereConditions = ['ar.affiliate_id = :affiliate_id'];
            $params = [':affiliate_id' => $affiliate_id];

            if ($reader_area && $org_area) {
                $whereConditions[] = '(ar.reader_area = TRUE OR ar.org_area = TRUE)';
            } elseif ($reader_area) {
                $whereConditions[] = 'ar.reader_area = TRUE';
            } elseif ($org_area) {
                $whereConditions[] = 'ar.org_area = TRUE';
            } else {
                $whereConditions[] = '(ar.reader_area = FALSE AND ar.org_area = FALSE)';
            }

            $query = '
                SELECT ar.*, af.name as affiliate_name 
                FROM areas ar 
                JOIN affiliates af ON ar.affiliate_id = af.affiliate_id 
                WHERE ' . implode(' AND ', $whereConditions) . ' 
                ORDER BY ar.name
            ';
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $areas = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $status = new Status(true, 200, $areas);
        } catch (Exception $e) {
            $this->logger->error('get_areas: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_areas)']);
        }
        return $status;
    }
    # --------------------------------------------------------------------------
    # Role: manager, coordinator, viewer
    # Mandatory: n/a
    # Optional : n/a

    public function get_orgs(Request $request): Status {
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
                SELECT o.*, ar.name as area_name 
                FROM orgs o 
                LEFT JOIN areas ar ON o.area_id = ar.area_id 
                WHERE o.affiliate_id = :affiliate_id 
                ORDER BY o.name
            ');
            $stmt->execute([':affiliate_id' => $affiliate_id]);
            $orgs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $status = new Status(true, 200, $orgs);
        } catch (Exception $e) {
            $this->logger->error('get_orgs: ' . $e->getMessage());
            $status = new Status(false, 500, ['message' => 'Error occurred (get_orgs)']);
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
