<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/../../private/db/DbBase.php';
require_once __DIR__ . '/../../private/db/DbLogin.php';
require_once __DIR__ . '/../../private/db/DbOrg.php';
require_once __DIR__ . '/../../private/db/DbUsers.php';
require_once __DIR__ . '/../../private/db/DbReaders.php';

use Slim\Psr7\Factory\ServerRequestFactory;
use Psr\Http\Message\ServerRequestInterface;

# ------------------------------------------------------------------------------
# Base class for test classes - creates temporary database records

class TstDbBase extends DbBase {

    public string $test_director_email = 'test_director@example.com';
    public string $test_director_password = 'TestPassword123';
    public int|null $test_director_id = null;
    public string|null $test_director_jwt = null;
    public int|null $test_region_id = null;
    public int|null $test_affiliate_id = null;
    public string $test_manager_email = 'test_manager@example.com';
    public string $test_manager_password = 'TestPassword123';
    public int|null $test_manager_id = null;
    public string|null $test_manager_jwt = null;
    public int|null $test_area_id = null;
    public int|null $test_venue_id = null;
    public string $test_coordinator_email = 'test_coordinator@example.com';
    public string $test_coordinator_password = 'TestPassword123';
    public int|null $test_coordinator_id = null;
    public string|null $test_coordinator_jwt = null;
    public string $test_coach_email = 'test_coach@example.com';
    public string $test_coach_password = 'TestPassword123';
    public int|null $test_coach_id = null;
    public string|null $test_coach_jwt = null;
    public string $test_viewer_email = 'test_viewer@example.com';
    public string $test_viewer_password = 'TestPassword123';
    public int|null $test_viewer_id = null;
    public string|null $test_viewer_jwt = null;
    public int|null $test_reader_id = null;

    # --------------------------------------------------------------------------

    function __construct() {
        parent::__construct();
        $this->setup_test_data();
    }

    # --------------------------------------------------------------------------

    function __destruct() {
        $this->cleanup_test_data();
        parent::__destruct();
    }

    # --------------------------------------------------------------------------

    private function setup_test_data(): void {
        try {
            # Create test director user
            $sql = 'INSERT INTO users (first_name, last_name, email, password, role, status, password_reset) 
                    VALUES (:first_name, :last_name, :email, :password, :role, :status, :password_reset)';
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':first_name' => 'Test',
                ':last_name'  => 'Director',
                ':email'      => $this->test_director_email,
                ':password'   => password_hash($this->test_director_password, PASSWORD_DEFAULT),
                ':role'       => 'director',
                ':status'     => 'active',
                ':password_reset' => false
            ]);

            # Get the created user ID
            $this->test_director_id = $this->get_user_id($this->test_director_email);

            # Login to create JWT
            $dbLogin = new DbLogin();
            $mockRequest = $this->create_mock_request([
                'email' => $this->test_director_email,
                'password' => $this->test_director_password
            ]);
            
            $loginStatus = $dbLogin->login($mockRequest);
            if ($loginStatus->success) {
                $this->test_director_jwt = $loginStatus->data;
            }

            # Create test region
            $dbOrg = new DbOrg();
            $regionRequest = $this->create_mock_request(
                ['name' => 'Test Region'],
                ['Authorization' => 'Bearer ' . $this->test_director_jwt]
            );
            
            $regionStatus = $dbOrg->add_region($regionRequest);
            if ($regionStatus->success) {
                $data = json_decode($regionStatus->message, true);
                $this->test_region_id = (int)$data['region_id'];
            }

            # Create test affiliate
            $affiliateRequest = $this->create_mock_request(
                ['name' => 'Test Affiliate', 'region_id' => $this->test_region_id],
                ['Authorization' => 'Bearer ' . $this->test_director_jwt]
            );
            
            $affiliateStatus = $dbOrg->add_affiliate($affiliateRequest);
            if ($affiliateStatus->success) {
                $data = json_decode($affiliateStatus->message, true);
                $this->test_affiliate_id = (int)$data['affiliate_id'];
            }

            # Create test manager user
            $dbUsers = new DbUsers();
            $managerRequest = $this->create_mock_request(
                [
                    'first_name' => 'Test',
                    'last_name' => 'Manager',
                    'email' => $this->test_manager_email,
                    'role' => 'manager',
                    'affiliate_id' => $this->test_affiliate_id,
                    'skip_email' => true
                ],
                ['Authorization' => 'Bearer ' . $this->test_director_jwt]
            );
            
            $managerStatus = $dbUsers->add_user($managerRequest);
            if ($managerStatus->success) {
                $data = json_decode($managerStatus->message, true);
                $this->test_manager_id = (int)$data['user_id'];
                
                # Update manager password to known value and set password_reset to false
                $stmt = $this->conn->prepare(
                    'UPDATE users SET password = :password, password_reset = :password_reset WHERE user_id = :user_id'
                );
                $stmt->execute([
                    ':password' => password_hash($this->test_manager_password, PASSWORD_DEFAULT),
                    ':password_reset' => false,
                    ':user_id' => $this->test_manager_id
                ]);
                
                # Login as manager to create JWT
                $managerLoginRequest = $this->create_mock_request([
                    'email' => $this->test_manager_email,
                    'password' => $this->test_manager_password
                ]);
                
                $managerLoginStatus = $dbLogin->login($managerLoginRequest);
                if ($managerLoginStatus->success) {
                    $this->test_manager_jwt = $managerLoginStatus->data;
                }
            }

            # Create test area
            $areaRequest = $this->create_mock_request(
                ['name' => 'Test Area'],
                ['Authorization' => 'Bearer ' . $this->test_manager_jwt]
            );
            
            $areaStatus = $dbOrg->add_area($areaRequest);
            if ($areaStatus->success) {
                $data = json_decode($areaStatus->message, true);
                $this->test_area_id = (int)$data['area_id'];
            }

            # Create test venue
            $venueRequest = $this->create_mock_request(
                ['name' => 'Test Venue'],
                ['Authorization' => 'Bearer ' . $this->test_manager_jwt]
            );
            
            $venueStatus = $dbOrg->add_venue($venueRequest);
            if ($venueStatus->success) {
                $data = json_decode($venueStatus->message, true);
                $this->test_venue_id = (int)$data['venue_id'];
            }

            # Create test coordinator user
            $coordinatorRequest = $this->create_mock_request(
                [
                    'first_name' => 'Test',
                    'last_name' => 'Coordinator',
                    'email' => $this->test_coordinator_email,
                    'role' => 'coordinator',
                    'affiliate_id' => $this->test_affiliate_id,
                    'skip_email' => true

                ],
                ['Authorization' => 'Bearer ' . $this->test_manager_jwt]
            );
            
            $coordinatorStatus = $dbUsers->add_user($coordinatorRequest);
            if ($coordinatorStatus->success) {
                $data = json_decode($coordinatorStatus->message, true);
                $this->test_coordinator_id = (int)$data['user_id'];
                
                # Update coordinator password to known value and set password_reset to false
                $stmt = $this->conn->prepare(
                    'UPDATE users SET password = :password, password_reset = :password_reset WHERE user_id = :user_id'
                );
                $stmt->execute([
                    ':password' => password_hash($this->test_coordinator_password, PASSWORD_DEFAULT),
                    ':password_reset' => false,
                    ':user_id' => $this->test_coordinator_id
                ]);
                
                # Login as coordinator to create JWT
                $coordinatorLoginRequest = $this->create_mock_request([
                    'email' => $this->test_coordinator_email,
                    'password' => $this->test_coordinator_password
                ]);
                
                $coordinatorLoginStatus = $dbLogin->login($coordinatorLoginRequest);
                if ($coordinatorLoginStatus->success) {
                    $this->test_coordinator_jwt = $coordinatorLoginStatus->data;
                }
            }

            # Create test coach user
            $coachRequest = $this->create_mock_request(
                [
                    'first_name' => 'Test',
                    'last_name' => 'Coach',
                    'email' => $this->test_coach_email,
                    'role' => 'coach',
                    'affiliate_id' => $this->test_affiliate_id,
                    'coordinator_id' => $this->test_coordinator_id,
                    'skip_email' => true
                ],
                ['Authorization' => 'Bearer ' . $this->test_manager_jwt]
            );
            
            $coachStatus = $dbUsers->add_user($coachRequest);
            if ($coachStatus->success) {
                $data = json_decode($coachStatus->message, true);
                $this->test_coach_id = (int)$data['user_id'];
                
                # Update coach password to known value and set password_reset to false
                $stmt = $this->conn->prepare(
                    'UPDATE users 
                     SET password = :password, password_reset = :password_reset
                     WHERE user_id = :user_id'
                );
                $stmt->execute([
                    ':password' => password_hash($this->test_coach_password, PASSWORD_DEFAULT),
                    ':password_reset' => false,
                    ':user_id' => $this->test_coach_id
                ]);
                
                # Set use_email to 1 for test coach
                $stmt = $this->conn->prepare(
                    'UPDATE coaches SET use_email = 1 WHERE coach_id = :coach_id'
                );
                $stmt->execute([':coach_id' => $this->test_coach_id]);
                
                # Login as coach to create JWT
                $coachLoginRequest = $this->create_mock_request([
                    'email' => $this->test_coach_email,
                    'password' => $this->test_coach_password
                ]);
                
                $coachLoginStatus = $dbLogin->login($coachLoginRequest);
                if ($coachLoginStatus->success) {
                    $this->test_coach_jwt = $coachLoginStatus->data;
                }
            }

            # Create test viewer user
            $viewerRequest = $this->create_mock_request(
                [
                    'first_name' => 'Test',
                    'last_name' => 'Viewer',
                    'email' => $this->test_viewer_email,
                    'role' => 'viewer',
                    'affiliate_id' => $this->test_affiliate_id,
                    'skip_email' => true
                ],
                ['Authorization' => 'Bearer ' . $this->test_manager_jwt]
            );
            
            $viewerStatus = $dbUsers->add_user($viewerRequest);
            if ($viewerStatus->success) {
                $data = json_decode($viewerStatus->message, true);
                $this->test_viewer_id = (int)$data['user_id'];
                
                # Update viewer password to known value and set password_reset to false
                $stmt = $this->conn->prepare(
                    'UPDATE users SET password = :password, password_reset = :password_reset WHERE user_id = :user_id'
                );
                $stmt->execute([
                    ':password' => password_hash($this->test_viewer_password, PASSWORD_DEFAULT),
                    ':password_reset' => false,
                    ':user_id' => $this->test_viewer_id
                ]);
                
                # Login as viewer to create JWT
                $viewerLoginRequest = $this->create_mock_request([
                    'email' => $this->test_viewer_email,
                    'password' => $this->test_viewer_password
                ]);
                
                $viewerLoginStatus = $dbLogin->login($viewerLoginRequest);
                if ($viewerLoginStatus->success) {
                    $this->test_viewer_jwt = $viewerLoginStatus->data;
                }
            }

            # Create test reader
            $dbReaders = new DbReaders();
            $readerRequest = $this->create_mock_request(
                ['coach_id' => $this->test_coach_id],
                ['Authorization' => 'Bearer ' . $this->test_manager_jwt]
            );
            
            $readerStatus = $dbReaders->add_reader($readerRequest);
            if ($readerStatus->success) {
                $data = json_decode($readerStatus->message, true);
                $this->test_reader_id = (int)$data['reader_id'];
            }

        } catch (Exception $e) {
            $this->logger->error('setup_test_data: ' . $e->getMessage());
            throw $e;
        }
    }

    # --------------------------------------------------------------------------

    public function cleanup(): void {
        if ($this->conn !== null) {
            $this->cleanup_test_data();
        }
    }

    # --------------------------------------------------------------------------

    private function cleanup_test_data(): void {
        if ($this->conn === null) {
            return;
        }
        try {
            # Delete test reader
            if ($this->test_reader_id !== null) {
                $stmt = $this->conn->prepare('DELETE FROM readers WHERE reader_id = :reader_id');
                $stmt->execute([':reader_id' => $this->test_reader_id]);
            }

            # Delete test coach (before coordinator due to FK)
            if ($this->test_coach_id !== null) {
                $stmt = $this->conn->prepare('DELETE FROM coaches WHERE coach_id = :coach_id');
                $stmt->execute([':coach_id' => $this->test_coach_id]);
                
                $stmt = $this->conn->prepare(
                    'DELETE FROM audit WHERE performed_by_id = :user_id1 OR performed_on_id = :user_id2'
                );
                $stmt->execute([':user_id1' => $this->test_coach_id, ':user_id2' => $this->test_coach_id]);
                
                $stmt = $this->conn->prepare('DELETE FROM users WHERE user_id = :user_id');
                $stmt->execute([':user_id' => $this->test_coach_id]);
            }

            # Delete test viewer
            if ($this->test_viewer_id !== null) {
                $stmt = $this->conn->prepare('DELETE FROM viewers WHERE viewer_id = :viewer_id');
                $stmt->execute([':viewer_id' => $this->test_viewer_id]);
                
                $stmt = $this->conn->prepare(
                    'DELETE FROM audit WHERE performed_by_id = :user_id1 OR performed_on_id = :user_id2'
                );
                $stmt->execute([':user_id1' => $this->test_viewer_id, ':user_id2' => $this->test_viewer_id]);
                
                $stmt = $this->conn->prepare('DELETE FROM users WHERE user_id = :user_id');
                $stmt->execute([':user_id' => $this->test_viewer_id]);
            }

            # Delete test coordinator (after coach)
            if ($this->test_coordinator_id !== null) {
                # Update any coaches that reference this coordinator
                $stmt = $this->conn->prepare('UPDATE coaches SET coordinator_id = NULL WHERE coordinator_id = :coordinator_id');
                $stmt->execute([':coordinator_id' => $this->test_coordinator_id]);
                
                $stmt = $this->conn->prepare('DELETE FROM coordinators WHERE coordinator_id = :coordinator_id');
                $stmt->execute([':coordinator_id' => $this->test_coordinator_id]);
                
                $stmt = $this->conn->prepare(
                    'DELETE FROM audit WHERE performed_by_id = :user_id1 OR performed_on_id = :user_id2'
                );
                $stmt->execute([':user_id1' => $this->test_coordinator_id, ':user_id2' => $this->test_coordinator_id]);
                
                $stmt = $this->conn->prepare('DELETE FROM users WHERE user_id = :user_id');
                $stmt->execute([':user_id' => $this->test_coordinator_id]);
            }

            # Delete test venue
            if ($this->test_venue_id !== null) {
                $stmt = $this->conn->prepare('DELETE FROM venues WHERE venue_id = :venue_id');
                $stmt->execute([':venue_id' => $this->test_venue_id]);
            }

            # Delete test area
            if ($this->test_area_id !== null) {
                $stmt = $this->conn->prepare('DELETE FROM areas WHERE area_id = :area_id');
                $stmt->execute([':area_id' => $this->test_area_id]);
            }

            # Delete test manager
            if ($this->test_manager_id !== null) {
                $stmt = $this->conn->prepare('DELETE FROM managers WHERE manager_id = :manager_id');
                $stmt->execute([':manager_id' => $this->test_manager_id]);
                
                $stmt = $this->conn->prepare(
                    'DELETE FROM audit WHERE performed_by_id = :user_id1 OR performed_on_id = :user_id2'
                );
                $stmt->execute([':user_id1' => $this->test_manager_id, ':user_id2' => $this->test_manager_id]);
                
                $stmt = $this->conn->prepare('DELETE FROM users WHERE user_id = :user_id');
                $stmt->execute([':user_id' => $this->test_manager_id]);
            }

            # Delete test affiliate
            if ($this->test_affiliate_id !== null) {
                # Delete any coaches, coordinators, managers, viewers, readers, areas, venues that reference this affiliate
                $stmt = $this->conn->prepare('DELETE FROM coaches WHERE affiliate_id = :affiliate_id');
                $stmt->execute([':affiliate_id' => $this->test_affiliate_id]);
                
                $stmt = $this->conn->prepare('DELETE FROM coordinators WHERE affiliate_id = :affiliate_id');
                $stmt->execute([':affiliate_id' => $this->test_affiliate_id]);
                
                $stmt = $this->conn->prepare('DELETE FROM managers WHERE affiliate_id = :affiliate_id');
                $stmt->execute([':affiliate_id' => $this->test_affiliate_id]);
                
                $stmt = $this->conn->prepare('DELETE FROM viewers WHERE affiliate_id = :affiliate_id');
                $stmt->execute([':affiliate_id' => $this->test_affiliate_id]);
                
                $stmt = $this->conn->prepare('DELETE FROM readers WHERE affiliate_id = :affiliate_id');
                $stmt->execute([':affiliate_id' => $this->test_affiliate_id]);
                
                $stmt = $this->conn->prepare('DELETE FROM areas WHERE affiliate_id = :affiliate_id');
                $stmt->execute([':affiliate_id' => $this->test_affiliate_id]);
                
                $stmt = $this->conn->prepare('DELETE FROM venues WHERE affiliate_id = :affiliate_id');
                $stmt->execute([':affiliate_id' => $this->test_affiliate_id]);
                
                $stmt = $this->conn->prepare('DELETE FROM affiliates WHERE affiliate_id = :affiliate_id');
                $stmt->execute([':affiliate_id' => $this->test_affiliate_id]);
            }

            # Delete test region
            if ($this->test_region_id !== null) {
                $stmt = $this->conn->prepare('DELETE FROM regions WHERE region_id = :region_id');
                $stmt->execute([':region_id' => $this->test_region_id]);
            }

            # Delete test director
            if ($this->test_director_id !== null) {
                # Delete audit records
                $stmt = $this->conn->prepare(
                    'DELETE FROM audit WHERE performed_by_id = :user_id1 OR performed_on_id = :user_id2'
                );
                $stmt->execute([':user_id1' => $this->test_director_id, ':user_id2' => $this->test_director_id]);

                # Delete user
                $stmt = $this->conn->prepare('DELETE FROM users WHERE user_id = :user_id');
                $stmt->execute([':user_id' => $this->test_director_id]);
            }
        } catch (Exception $e) {
            $this->logger->error('cleanup_test_data: ' . $e->getMessage());
        }
    }

    # --------------------------------------------------------------------------

    protected function create_mock_request(array $body = [], array $headers = []): ServerRequestInterface {
        $factory = new ServerRequestFactory();
        $request = $factory->createServerRequest('POST', '/');
        
        if (!empty($body)) {
            $request = $request->withParsedBody($body);
        }
        
        foreach ($headers as $name => $value) {
            $request = $request->withHeader($name, $value);
        }
        
        return $request;
    }

    # --------------------------------------------------------------------------
}

# ------------------------------------------------------------------------------

/*
End
*/
