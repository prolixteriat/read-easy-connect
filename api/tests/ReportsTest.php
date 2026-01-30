<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/tst/TstDbReports.php';
require_once __DIR__ . '/tst/TstDbBase.php';

# ------------------------------------------------------------------------------

use PHPUnit\Framework\TestCase;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\StreamFactory;

# ------------------------------------------------------------------------------

class ReportsTest extends TestCase {

    protected Slim\App $app;
    protected TstDbReports $db;
    protected TstDbBase $base;
    protected string $jwt_token;
    protected ServerRequestFactory $request_factory;
    protected StreamFactory $stream_factory;

    # --------------------------------------------------------------------------

    protected function setUp(): void {
        $this->base = new TstDbBase();
        $this->db = new TstDbReports();
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

    public function test_get_audit_logs(): void {
        $this->jwt_token = $this->base->test_manager_jwt;
        $request = $this->create_request('GET', '/reports/get-audit-logs');
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
        $this->assertIsArray($data);
    }
    # --------------------------------------------------------------------------

    public function test_get_coach_detail(): void {
        $this->jwt_token = $this->base->test_manager_jwt;
        $request = $this->create_request('GET', '/reports/get-coach-detail');
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
        $this->assertIsArray($data);
    }
    # --------------------------------------------------------------------------

    public function test_get_reader_detail(): void {
        $this->jwt_token = $this->base->test_manager_jwt;
        $request = $this->create_request('GET', '/reports/get-reader-detail');
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
        $this->assertIsArray($data);
    }
    # --------------------------------------------------------------------------

    public function test_unauthorised_access(): void {
        $this->jwt_token = $this->base->test_coach_jwt;
        $request = $this->create_request('GET', '/reports/get-coach-detail');
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
        $this->app->get('/reports/get-audit-logs', function ($request, $response) {
            $status = $this->db->get_audit_logs($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
        });

        $this->app->get('/reports/get-coach-detail', function ($request, $response) {
            $status = $this->db->get_coach_detail($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
        });

        $this->app->get('/reports/get-reader-detail', function ($request, $response) {
            $status = $this->db->get_reader_detail($request);
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