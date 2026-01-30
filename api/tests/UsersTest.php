<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/tst/TstDbUsers.php';
require_once __DIR__ . '/tst/TstDbBase.php';
require_once __DIR__ . '/../private/db/DbLogin.php';

# ------------------------------------------------------------------------------

use PHPUnit\Framework\TestCase;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\StreamFactory;

# ------------------------------------------------------------------------------

class UsersTest extends TestCase {

    protected Slim\App $app;
    protected TstDbUsers $db;
    protected TstDbBase $base;
    protected string $jwt_token;
    protected ServerRequestFactory $request_factory;
    protected StreamFactory $stream_factory;

    # --------------------------------------------------------------------------

    protected function setUp(): void {
        
        $this->base = new TstDbBase();
        $this->db = new TstDbUsers();
        $this->app = AppFactory::create();
        $this->jwt_token = $this->base->test_manager_jwt; 
        $this->request_factory = new ServerRequestFactory();
        $this->stream_factory = new StreamFactory();

        $this->add_routes();
    }
    # --------------------------------------------------------------------------

    protected function tearDown(): void {
        $this->base->cleanup();
    }
    # --------------------------------------------------------------------------

    public function test_add_user(): void {

        $payload = ['first_name' => 'Unit', 
                    'last_name' => 'Test', 
                    'email' => 'unittest@example.com',
                    'role' => 'coach',
                    'coordinator_id' => $this->base->test_coordinator_id];
        try {
            $this->jwt_token = $this->base->test_coordinator_jwt;
            $request = $this->create_request('POST', '/users/add-user', $payload);
            $response = $this->app->handle($request);
            $this->assertEquals(200, $response->getStatusCode());
            $body = (string) $response->getBody();
            $data = json_decode($body, true);
        } finally {
            $this->db->test_delete($payload['email']);
        }
    }

    # --------------------------------------------------------------------------

    public function test_complete_mfa_setup(): void {

        $test_email = 'testmfa@test.com';
        try {
            # This test would require setting up MFA prerequisites
            # For now, just test the endpoint exists and handles missing params
            $this->jwt_token = $this->base->test_coordinator_jwt;
            $payload = ['email' => $test_email];
            $request = $this->create_request('POST', '/users/complete-mfa-setup', 
                                            $payload);
            $response = $this->app->handle($request);
            # Intentionally missing required params
            $this->assertEquals(400, $response->getStatusCode()); 
        } finally {
            # No cleanup needed for this test
        }
    }
    # --------------------------------------------------------------------------

    public function test_create_reset_token(): void {

        $test_email = 'testreset@test.com';
        try {
            # Add a test user first
            $this->jwt_token = $this->base->test_coordinator_jwt;
            $add_payload = [
                'first_name' => 'Test',
                'last_name' => 'Reset',
                'email' => $test_email,
                'role' => 'coach',
                'coordinator_id' => $this->base->test_coordinator_id
            ];
            $add_request = $this->create_request('POST', '/users/add-user', 
                                                $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            
            # Test create reset token
            $payload = ['email' => $test_email];
            $request = $this->create_request('POST', '/users/create-reset-token', 
                                                $payload);
            $response = $this->app->handle($request);
            $this->assertEquals(200, $response->getStatusCode());
            
        } finally {
            $this->db->test_delete($test_email);
        }
    }
    # --------------------------------------------------------------------------

    public function test_edit_user(): void {

        $test_email = 'testedituser@test.com';
        $user_id = null;
        try {
            $this->jwt_token = $this->base->test_coordinator_jwt;
            
            # Add new test user
            $add_payload = [
                'first_name' => 'Original',
                'last_name' => 'TestUser',
                'email' => $test_email,
                'role' => 'coach',
                'coordinator_id' => $this->base->test_coordinator_id
            ];
            $add_request = $this->create_request('POST', '/users/add-user', 
                                                $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            $add_data = json_decode((string) $add_response->getBody(), true);
            $user_id = $add_data['user_id'];
            
            # Retrieve and check initial first_name
            $get_request = $this->create_request('GET', '/users/get-users');
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $users = json_decode((string) $get_response->getBody(), true);
            $found_user = array_filter($users, fn($u) => $u['user_id'] == $user_id);
            $this->assertNotEmpty($found_user);
            $this->assertEquals('Original', 
                                array_values($found_user)[0]['first_name']);
            
            # Update user first_name
            $edit_payload = [
                'user_id' => $user_id,
                'first_name' => 'Updated',
                'status' => 'active'
            ];
            $edit_request = $this->create_request('POST', '/users/edit-user', 
                                                    $edit_payload);
            $edit_response = $this->app->handle($edit_request);
            $this->assertEquals(200, $edit_response->getStatusCode());
            
            # Verify first_name was updated
            $get_request2 = $this->create_request('GET', '/users/get-users');
            $get_response2 = $this->app->handle($get_request2);
            $this->assertEquals(200, $get_response2->getStatusCode());
            $users2 = json_decode((string) $get_response2->getBody(), true);
            $updated_user = array_filter($users2, fn($u) => $u['user_id'] == $user_id);
            $this->assertNotEmpty($updated_user);
            $this->assertEquals('Updated', 
                                array_values($updated_user)[0]['first_name']);
            
        } finally {
            if ($user_id) {
                $this->db->test_delete($test_email);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_get_reset_form(): void {

        $test_email = 'testresetform@test.com';
        try {
            # Add test user
            $this->jwt_token = $this->base->test_coordinator_jwt;
            $add_payload = [
                'first_name' => 'Test',
                'last_name' => 'ResetForm',
                'email' => $test_email,
                'role' => 'coach',
                'coordinator_id' => $this->base->test_coordinator_id
            ];
            $add_request = $this->create_request('POST', '/users/add-user', 
                                                $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            
            # Create reset token
            $token_payload = ['email' => $test_email];
            $token_request = $this->create_request('POST', 
                                    '/users/create-reset-token', $token_payload);
            $token_response = $this->app->handle($token_request);
            $this->assertEquals(200, $token_response->getStatusCode());
            /*
            # Following tests no longer relevant since token is now emailed:
            $token_body = (string) $token_response->getBody();
            $token_data = json_decode($token_body, true);
            
            # Test get reset form with valid token
            $token = $token_data['token'] ?? null;
            if ($token === null) {
                # Token might be in the message field, extract it
                if (isset($token_data['message'])) {
                    $message_data = json_decode($token_data['message'], true);
                    $token = $message_data['token'] ?? null;
                }
            }
            $this->assertNotNull($token, 'Token should not be null');
            $form_request = $this->create_request('GET', 
                        '/users/get-reset-form?token=' . urlencode($token));
            $form_response = $this->app->handle($form_request);
            $this->assertEquals(200, $form_response->getStatusCode());
            */
            
        } finally {
            $this->db->test_delete($test_email);
        }
    }
    # --------------------------------------------------------------------------

    public function test_get_users(): void {
        $this->jwt_token = $this->base->test_coordinator_jwt;
        $request = $this->create_request('GET', '/users/get-users');
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
        $this->assertIsArray($data);
    }
    # --------------------------------------------------------------------------

    public function test_login(): void {

        # Test with invalid credentials
        $payload = [
            'email' => 'nonexistent@test.com',
            'password' => 'wrongpassword'
        ];
        $request = $this->create_request('POST', '/users/login', $payload);
        $response = $this->app->handle($request);
        $this->assertEquals(401, $response->getStatusCode());
        
        # Test with valid credentials after password reset
        $test_email = 'testloginreset@test.com';
        try {
            # Add test user
            $this->jwt_token = $this->base->test_coordinator_jwt;
            $add_payload = [
                'first_name' => 'Test',
                'last_name' => 'LoginReset',
                'email' => $test_email,
                'role' => 'coach',
                'coordinator_id' => $this->base->test_coordinator_id
            ];
            $add_request = $this->create_request('POST', '/users/add-user', $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            
            # Create reset token
            $token_payload = ['email' => $test_email];
            $token_request = $this->create_request('POST', 
                                    '/users/create-reset-token', $token_payload);
            $token_response = $this->app->handle($token_request);
            $this->assertEquals(200, $token_response->getStatusCode());
            
            # Mock token since it's now emailed instead of returned
            $token = base64_encode(random_bytes(32));
            
            # Skip password reset test since we can't get the real token
            # This test now only verifies that create-reset-token works
            # The actual password reset flow would need integration testing
            
        } finally {
            $this->db->test_delete($test_email);
        }
    }
    # --------------------------------------------------------------------------

    public function test_edit_profile(): void {
        $this->jwt_token = $this->base->test_coordinator_jwt;
        
        # Get original user data
        $get_request = $this->create_request('GET', '/users/get-users');
        $get_response = $this->app->handle($get_request);
        $this->assertEquals(200, $get_response->getStatusCode());
        $users = json_decode((string) $get_response->getBody(), true);
        
        # Find current user (coordinator should be in the list)
        $current_user = null;
        foreach ($users as $user) {
            if ($user['user_id'] === $this->base->test_coordinator_id) {
                $current_user = $user;
                break;
            }
        }
        $this->assertNotNull($current_user, 'Coordinator user not found');
        $original_first_name = $current_user['first_name'];
        $original_last_name = $current_user['last_name'];
        
        # Update profile
        $payload = [
            'first_name' => 'UpdatedFirst',
            'last_name' => 'UpdatedLast'
        ];
        $request = $this->create_request('POST', '/users/edit-profile', $payload);
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        
        # Verify changes
        $get_request2 = $this->create_request('GET', '/users/get-users');
        $get_response2 = $this->app->handle($get_request2);
        $users2 = json_decode((string) $get_response2->getBody(), true);
        $updated_user = null;
        foreach ($users2 as $user) {
            if ($user['user_id'] == $current_user['user_id']) {
                $updated_user = $user;
                break;
            }
        }
        $this->assertNotNull($updated_user, 'Updated user not found');
        $this->assertEquals('UpdatedFirst', $updated_user['first_name']);
        $this->assertEquals('UpdatedLast', $updated_user['last_name']);
        
        # Reset to original values
        $reset_payload = [
            'first_name' => $original_first_name,
            'last_name' => $original_last_name
        ];
        $reset_request = $this->create_request('POST', '/users/edit-profile', $reset_payload);
        $reset_response = $this->app->handle($reset_request);
        $this->assertEquals(200, $reset_response->getStatusCode());
        
        # Test with no parameters
        $empty_payload = [];
        $empty_request = $this->create_request('POST', '/users/edit-profile', $empty_payload);
        $empty_response = $this->app->handle($empty_request);
        $this->assertEquals(400, $empty_response->getStatusCode());
    }
    # --------------------------------------------------------------------------

    private function create_request(string $method, string $uri, 
                        ?array $payload=null): Slim\Psr7\Request {
        $request = $this->request_factory->createServerRequest($method, $uri);
        if ($this->jwt_token) {
            $request = $request->withHeader('Authorization', 
                                            'Bearer ' . $this->jwt_token);
        }
        if (!is_null($payload)) {
            if ($method === 'GET') {
                $request = $request->withQueryParams($payload);
            } else {
                $request = $request->withParsedBody($payload);
            }
        }
        return $request;
    }
    # --------------------------------------------------------------------------

    private function add_routes(): void {
        $this->app->post('/users/add-user', function ($request, $response) {
            $status = $this->db->add_user($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/users/edit-user', function ($request, $response) {
            $status = $this->db->edit_user($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/users/edit-profile', function ($request, $response) {
            $status = $this->db->edit_profile($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/users/get-users', function ($request, $response) {
            $status = $this->db->get_users($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        # Login/Auth routes using DbLogin
        $this->app->post('/users/complete-mfa-setup', function ($request, $response) {
            $db_login = new DbLogin();
            $status = $db_login->complete_mfa_setup($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/users/create-reset-token', function ($request, $response) {
            $db_login = new DbLogin();
            $status = $db_login->create_reset_token($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/users/get-reset-form', function ($request, $response) {
            $db_login = new DbLogin();
            $status = $db_login->get_reset_form($request);
            $response->getBody()->write($status->data ?? $status->message);
            return $response
                    ->withHeader('Content-Type', 'text/html')
                    ->withStatus($status->code);
                });

        $this->app->post('/users/login', function ($request, $response) {
            $db_login = new DbLogin();
            $status = $db_login->login($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/users/logout', function ($request, $response) {
            $db_login = new DbLogin();
            $status = $db_login->logout($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/users/submit-reset', function ($request, $response) {
            $db_login = new DbLogin();
            $status = $db_login->submit_reset($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

    }
    # --------------------------------------------------------------------------

}
# ------------------------------------------------------------------------------

/*
End
*/
