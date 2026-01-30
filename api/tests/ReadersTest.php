<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/tst/TstDbBase.php';
require_once __DIR__ . '/tst/TstDbReaders.php';

# ------------------------------------------------------------------------------

use PHPUnit\Framework\TestCase;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\StreamFactory;

# ------------------------------------------------------------------------------

class ReadersTest extends TestCase {

    protected TstDbBase $base;
    protected TstDbReaders $db;
    protected Slim\App $app;
    protected string|null $jwt_token;
    protected ServerRequestFactory $request_factory;
    protected StreamFactory $stream_factory;

    # --------------------------------------------------------------------------

    protected function setUp(): void {
        $this->base = new TstDbBase();
        $this->db = new TstDbReaders();
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

    public function test_add_reader(): void {
        $payload = [];
        try {
            $this->jwt_token = $this->base->test_manager_jwt;
            $request = $this->create_request('POST', '/readers/add-reader', $payload);
            $response = $this->app->handle($request);
            $this->assertEquals(200, $response->getStatusCode());
            $body = (string) $response->getBody();
            $data = json_decode($body, true);
            $this->assertArrayHasKey('reader_id', $data);
            
            # Test get-reader to confirm creation
            $reader_id = $data['reader_id'];
            $get_request = $this->create_request('GET', '/readers/get-reader?reader_id=' . $reader_id);
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $get_body = (string) $get_response->getBody();
            $get_data = json_decode($get_body, true);
            $this->assertArrayHasKey('name', $get_data);
        } finally {
            if (isset($data['name'])) {
                $this->db->test_delete($data['name']);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_edit_reader(): void {
        $reader_id = null;
        $initial_name = null;
        try {
            $this->jwt_token = $this->base->test_manager_jwt;
            
            # Add new test reader
            $add_payload = [];
            $add_request = $this->create_request('POST', '/readers/add-reader', $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            $add_data = json_decode((string) $add_response->getBody(), true);
            $reader_id = $add_data['reader_id'];
            $initial_name = $add_data['name'];
            
            # Retrieve and check initial name
            $get_request = $this->create_request('GET', '/readers/get-reader?reader_id=' . $reader_id);
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $reader_data = json_decode((string) $get_response->getBody(), true);
            $this->assertEquals($initial_name, $reader_data['name']);
            
            # Update reader status
            $edit_payload = [
                'reader_id' => $reader_id,
                'coach_id' => $this->base->test_coach_id,
                'status' => 'S',
                'coaching_start_at' => '2026-01-27',
                'TP1_completion_at' => '2026-01-27',
                'TP3_completion_at' => '2026-01-27',
                'TP5_completion_at' => '2026-01-27'
            ];
            $edit_request = $this->create_request('POST', '/readers/edit-reader', $edit_payload);
            $edit_response = $this->app->handle($edit_request);
            $this->assertEquals(200, $edit_response->getStatusCode());
            
            # Retrieve and check updated status
            $get_request2 = $this->create_request('GET', '/readers/get-reader?reader_id=' . $reader_id);
            $get_response2 = $this->app->handle($get_request2);
            $this->assertEquals(200, $get_response2->getStatusCode());
            $reader_data2 = json_decode((string) $get_response2->getBody(), true);
            $this->assertEquals('S', $reader_data2['status']);
            
        } finally {
            if ($initial_name) {
                $this->db->test_delete($initial_name);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_get_readers(): void {
        $this->jwt_token = $this->base->test_manager_jwt;
        $request = $this->create_request('GET', '/readers/get-readers');
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
    }
    # --------------------------------------------------------------------------

    private function create_request(string $method, string $uri, 
                        ?array $payload=null): Slim\Psr7\Request {
        $request = $this->request_factory->createServerRequest($method, $uri)
            ->withHeader('Authorization', 'Bearer ' . $this->jwt_token);
        if (!is_null($payload)) {
            $request = $request->withParsedBody($payload);
        }
        return $request;
    }
    # --------------------------------------------------------------------------

    private function add_routes(): void {
        $this->app->post('/readers/add-reader', function ($request, $response) {
            $status = $this->db->add_reader($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/readers/edit-reader', function ($request, $response) {
            $status = $this->db->edit_reader($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/readers/get-readers', function ($request, $response) {
            $status = $this->db->get_readers($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/readers/get-reader', function ($request, $response) {
            $status = $this->db->get_reader($request);
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