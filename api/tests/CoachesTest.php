<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/tst/TstDbBase.php';
require_once __DIR__ . '/tst/TstDbCoaches.php';
require_once __DIR__ . '/../private/db/DbUsers.php';

# ------------------------------------------------------------------------------

use PHPUnit\Framework\TestCase;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\StreamFactory;

# ------------------------------------------------------------------------------

class CoachesTest extends TestCase {

    protected TstDbBase $base;
    protected TstDbCoaches $db;
    protected Slim\App $app;
    protected string|null $jwt_token;
    protected ServerRequestFactory $request_factory;
    protected StreamFactory $stream_factory;

    # --------------------------------------------------------------------------

    protected function setUp(): void {
        $this->base = new TstDbBase();
        $this->db = new TstDbCoaches();
        $this->app = AppFactory::create();
        $this->jwt_token = $this->base->test_manager_jwt;
        $this->request_factory = new ServerRequestFactory();
        $this->stream_factory = new StreamFactory();
        $this->add_routes();
    }
    # --------------------------------------------------------------------------

    protected function tearDown(): void {
        $this->base->cleanup();
        unset($this->base);
    }
    # --------------------------------------------------------------------------

    public function test_add_coach(): void {
        $payload = [
            'first_name' => 'Test',
            'last_name' => 'Coach',
            'email' => 'testcoach2@test.com',
            'coordinator_id' => $this->base->test_coordinator_id,
            'address' => '123 Test St',
            'telephone' => '555-1234'
        ];
        
        try {
            $this->jwt_token = $this->base->test_coordinator_jwt;
            $request = $this->create_request('POST', '/coaches/add-coach', $payload);
            $response = $this->app->handle($request);
            $this->assertEquals(200, $response->getStatusCode());
            $body = (string) $response->getBody();
            $data = json_decode($body, true);
            $this->assertArrayHasKey('user_id', $data);
        } finally {
            $this->db->test_delete($payload['email']);
        }
    }
    # --------------------------------------------------------------------------

    public function test_edit_coach(): void {
        $test_email = 'testeditcoach@test.com';
        $coach_id = null;
        try {
            $this->jwt_token = $this->base->test_coordinator_jwt;
            
            # Add new test coach
            $add_payload = [
                'first_name' => 'Test',
                'last_name' => 'EditCoach',
                'email' => $test_email,
                'coordinator_id' => $this->base->test_coordinator_id,
                'address' => '123 Test St',
                'telephone' => '555-1234',
                'nok_name' => 'This is personal data'
            ];
            $add_request = $this->create_request('POST', '/coaches/add-coach', 
                                                    $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            $add_data = json_decode((string) $add_response->getBody(), true);
            $coach_id = $add_data['user_id'];
            
            # Set initial notes
            $initial_edit_payload = [
                'coach_id' => $coach_id,
                'notes' => 'Original notes'
            ];
            $initial_edit_request = $this->create_request('POST', '/coaches/edit-coach', 
                                    $initial_edit_payload);
            $initial_edit_response = $this->app->handle($initial_edit_request);
            $this->assertEquals(200, $initial_edit_response->getStatusCode());
            
            # Retrieve and check initial notes
            $get_request = $this->create_request('GET', 
                                    '/coaches/get-coach?coach_id=' . $coach_id);
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $coach_data = json_decode((string) $get_response->getBody(), true);
            $this->assertEquals('Original notes', $coach_data['notes']);
            
            # Update coach notes
            $edit_payload = [
                'coach_id' => $coach_id,
                'notes' => 'Updated notes'
            ];
            $edit_request = $this->create_request('POST', '/coaches/edit-coach', 
                                    $edit_payload);
            $edit_response = $this->app->handle($edit_request);
            $this->assertEquals(200, $edit_response->getStatusCode());
            
            # Retrieve and check updated notes
            $get_request = $this->create_request('GET', 
                                    '/coaches/get-coach?coach_id=' . $coach_id);
            $get_response2 = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response2->getStatusCode());
            $coach_data2 = json_decode((string) $get_response2->getBody(), true);
            $this->assertEquals('Updated notes', $coach_data2['notes']);
            
            # Test leaver status - set user status to 'leaver'
            $leaver_payload = [
                'user_id' => $coach_id,
                'status' => 'leaver'
            ];
            $leaver_request = $this->create_request('POST', '/users/edit-user', 
                                                    $leaver_payload);
            $leaver_response = $this->app->handle($leaver_request);
            $this->assertEquals(200, $leaver_response->getStatusCode());
            
            # Check that nok_name has been redacted and user is disabled
            $get_request3 = $this->create_request('GET', 
                                    '/coaches/get-coach?coach_id=' . $coach_id);
            $get_response3 = $this->app->handle($get_request3);
            $this->assertEquals(200, $get_response3->getStatusCode());
            $coach_data3 = json_decode((string) $get_response3->getBody(), true);
            $this->assertEquals('REDACTED', $coach_data3['nok_name']);
            $this->assertEquals(1, $coach_data3['disabled']);
            
        } finally {
            if ($coach_id) {
                $this->db->test_delete($test_email);
                $this->db->test_delete($coach_data3['email']);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_get_coaches(): void {
        $this->jwt_token = $this->base->test_coordinator_jwt;
        $request = $this->create_request('GET', '/coaches/get-coaches');
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
        $this->assertIsArray($data);
    }
    # --------------------------------------------------------------------------

    public function test_get_coach(): void {
        $this->jwt_token = $this->base->test_coordinator_jwt;
        $request = $this->create_request('GET', "/coaches/get-coach?coach_id=" . $this->base->test_coach_id);
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
        $this->assertArrayHasKey('coach_id', $data);
    }
    # --------------------------------------------------------------------------

    public function test_unauthorized_access(): void {
        $this->jwt_token = $this->base->test_coach_jwt;
        $request = $this->create_request('GET', '/coaches/get-coaches');
        $response = $this->app->handle($request);
        $this->assertEquals(403, $response->getStatusCode());
    }
    # --------------------------------------------------------------------------

    private function create_request(string $method, string $uri, ?array $payload=null): Slim\Psr7\Request {
        $request = $this->request_factory->createServerRequest($method, $uri)
            ->withHeader('Authorization', 'Bearer ' . $this->jwt_token);
        if (!is_null($payload)) {
            $request = $request->withParsedBody($payload);
        }
        return $request;
    }
    # --------------------------------------------------------------------------

    private function add_routes(): void {
        $this->app->post('/coaches/add-coach', function ($request, $response) {
            $status = $this->db->add_coach($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
        });

        $this->app->post('/coaches/edit-coach', function ($request, $response) {
            $status = $this->db->edit_coach($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
        });

        $this->app->get('/coaches/get-coaches', function ($request, $response) {
            $status = $this->db->get_coaches($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
        });

        $this->app->get('/coaches/get-coach', function ($request, $response) {
            $status = $this->db->get_coach($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
        });

        $this->app->post('/users/edit-user', function ($request, $response) {
            $db_users = new DbUsers();
            $status = $db_users->edit_user($request);
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