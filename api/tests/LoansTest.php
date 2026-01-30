<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/tst/TstDbLoans.php';
require_once __DIR__ . '/tst/TstDbBase.php';

# ------------------------------------------------------------------------------

use PHPUnit\Framework\TestCase;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\StreamFactory;

# ------------------------------------------------------------------------------

class LoansTest extends TestCase {

    protected Slim\App $app;
    protected TstDbLoans $db;
    protected TstDbBase $base;
    protected string $jwt_token;
    protected ServerRequestFactory $request_factory;
    protected StreamFactory $stream_factory;

    # --------------------------------------------------------------------------

    protected function setUp(): void {
        
        $this->base = new TstDbBase();
        $this->db = new TstDbLoans();
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

    public function test_add_loan(): void {

        $payload = [
            'reader_id' => $this->base->test_reader_id,
            'item' => 'Test Book'
        ];
        $loan_id = null;
        
        try {
            $this->jwt_token = $this->base->test_manager_jwt;
            $request = $this->create_request('POST', '/loans/add-loan', $payload);
            $response = $this->app->handle($request);
            $this->assertEquals(200, $response->getStatusCode());
            $body = (string) $response->getBody();
            $data = json_decode($body, true);
            $this->assertArrayHasKey('loan_id', $data);
            $loan_id = $data['loan_id'];
            
            # Test get-loan to confirm correct data
            $get_request = $this->create_request('GET', '/loans/get-loan?loan_id=' . $loan_id);
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $get_body = (string) $get_response->getBody();
            $get_data = json_decode($get_body, true);
            $this->assertEquals($payload['item'], $get_data['item']);
            $this->assertEquals($payload['reader_id'], $get_data['reader_id']);
        } finally {
            if ($loan_id) {
                $this->db->test_delete($loan_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_edit_loan(): void {

        $loan_id = null;
        
        try {
            $this->jwt_token = $this->base->test_manager_jwt;
            
            # Add new test loan
            $add_payload = [
                'reader_id' => $this->base->test_reader_id,
                'item' => 'Test Edit Book'
            ];
            $add_request = $this->create_request('POST', '/loans/add-loan', $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            $add_data = json_decode((string) $add_response->getBody(), true);
            $loan_id = $add_data['loan_id'];
            
            # Retrieve and check initial item
            $get_request = $this->create_request('GET', '/loans/get-loan?loan_id=' . $loan_id);
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $loan_data = json_decode((string) $get_response->getBody(), true);
            $this->assertEquals('Test Edit Book', $loan_data['item']);
            
            # Update loan item
            $edit_payload = [
                'loan_id' => $loan_id,
                'item' => 'Updated Book Title',
                'status' => 'returned'
            ];
            $edit_request = $this->create_request('POST', '/loans/edit-loan', $edit_payload);
            $edit_response = $this->app->handle($edit_request);
            $this->assertEquals(200, $edit_response->getStatusCode());
            
            # Retrieve and check updated data
            $get_request2 = $this->create_request('GET', '/loans/get-loan?loan_id=' . $loan_id);
            $get_response2 = $this->app->handle($get_request2);
            $this->assertEquals(200, $get_response2->getStatusCode());
            $loan_data2 = json_decode((string) $get_response2->getBody(), true);
            $this->assertEquals('Updated Book Title', $loan_data2['item']);
            $this->assertEquals('returned', $loan_data2['status']);
            
        } finally {
            if ($loan_id) {
                $this->db->test_delete($loan_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_get_loans(): void {

        $request = $this->create_request('GET', '/loans/get-loans');
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
        $this->assertIsArray($data);
    }
    # --------------------------------------------------------------------------

    public function test_get_loans_with_filters(): void {

        # Test with reader_id filter
        $request = $this->create_request('GET', '/loans/get-loans?reader_id=' . $this->base->test_reader_id);
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
        $this->assertIsArray($data);
        
        # Test with date filters
        $start_date = '2024-01-01';
        $end_date = '2024-12-31';
        $request2 = $this->create_request('GET', '/loans/get-loans?start_date=' . $start_date . '&end_date=' . $end_date);
        $response2 = $this->app->handle($request2);
        $this->assertEquals(200, $response2->getStatusCode());
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
        $this->app->post('/loans/add-loan', function ($request, $response) {
            $status = $this->db->add_loan($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/loans/edit-loan', function ($request, $response) {
            $status = $this->db->edit_loan($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/loans/get-loans', function ($request, $response) {
            $status = $this->db->get_loans($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/loans/get-loan', function ($request, $response) {
            $status = $this->db->get_loan($request);
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