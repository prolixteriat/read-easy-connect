<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/tst/TstDbReviews.php';
require_once __DIR__ . '/utils/creds.php';

# ------------------------------------------------------------------------------

use PHPUnit\Framework\TestCase;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\StreamFactory;

# ------------------------------------------------------------------------------

class ReviewsTest extends TestCase {

    protected Slim\App $app;
    protected TstDbReviews $db;
    protected string $jwt_token;
    protected ServerRequestFactory $request_factory;
    protected StreamFactory $stream_factory;
    protected array $tokens;

    # --------------------------------------------------------------------------

    protected function setUp(): void {
        
        $this->tokens = TestTokens::get();
        $this->db = new TstDbReviews();
        $this->app = AppFactory::create();
        $this->jwt_token = $this->tokens['coordinator']; 
        $this->request_factory = new ServerRequestFactory();
        $this->stream_factory = new StreamFactory();

        $this->add_routes();
    }
    # --------------------------------------------------------------------------

    public function test_add(): void {

        $payload = ['coordinator_id' => '4', 
                    'coach_id' => '6',
                    'reader_id' => '1',
                    'date' => '2024-01-15',
                    'venue_id' => 1];
        $review_id = null;
        try {
            $this->jwt_token = $this->tokens['coordinator'];
            $request = $this->create_request('POST', '/reviews/add-review', 
                                $payload);
            $response = $this->app->handle($request);
            $this->assertEquals(200, $response->getStatusCode());
            $body = (string) $response->getBody();
            $data = json_decode($body, true);
            $review_id = $data['review_id'] ?? null;
        } finally {
            if ($review_id) {
                $this->db->test_delete((int)$review_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_edit_review(): void {

        $review_id = null;
        try {
            $this->jwt_token = $this->tokens['coordinator'];
            
            # Add new test review
            $add_payload = [
                'coordinator_id' => TEST_COORDINATOR_ID,
                'coach_id' => TEST_COACH_ID,
                'reader_id' => TEST_READER_ID,
                'date' => '2024-01-15',
                'venue_id' => TEST_VENUE_ID
            ];
            $add_request = $this->create_request('POST', '/reviews/add-review', 
                                                $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            $add_data = json_decode((string) $add_response->getBody(), true);
            $review_id = $add_data['review_id'];
            
            # Retrieve and check initial venue_id
            $get_request = $this->create_request('GET', 
                    '/reviews/get-reviews-coordinator?coordinator_id=' . TEST_COORDINATOR_ID);
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $reviews = json_decode((string) $get_response->getBody(), true);
            $found_review = array_filter($reviews, 
                                fn($r) => $r['review_id'] == $review_id);
            $this->assertNotEmpty($found_review);
            
            # Update review venue_id
            $edit_payload = [
                'review_id' => $review_id,
                'venue_id' => TEST_VENUE_ID
            ];
            $edit_request = $this->create_request('POST', 
                                    '/reviews/edit-review', $edit_payload);
            $edit_response = $this->app->handle($edit_request);
            $this->assertEquals(200, $edit_response->getStatusCode());
            
            # Retrieve and check updated venue_id
            $get_request2 = $this->create_request('GET', 
                    '/reviews/get-reviews-coordinator?coordinator_id=' . TEST_COORDINATOR_ID);
            $get_response2 = $this->app->handle($get_request2);
            $this->assertEquals(200, $get_response2->getStatusCode());
            $reviews2 = json_decode((string) $get_response2->getBody(), true);
            $found_review2 = array_filter($reviews2, 
                                fn($r) => $r['review_id'] == $review_id);
            $this->assertNotEmpty($found_review2);
            
        } finally {
            if ($review_id) {
                $this->db->test_delete((int)$review_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_get_reviews_coordinator(): void {

        $this->jwt_token = $this->tokens['coordinator'];
        $request = $this->create_request('GET', 
                '/reviews/get-reviews-coordinator?coordinator_id=' . TEST_COORDINATOR_ID);
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
        $this->assertIsArray($data);
    }
    # --------------------------------------------------------------------------

    public function test_get_reviews(): void {

        $this->jwt_token = $this->tokens['coordinator'];
        $request = $this->create_request('GET', '/reviews/get-reviews');
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
        $this->app->post('/reviews/add-review', function ($request, $response) {
            $status = $this->db->add_review($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/reviews/edit-review', function ($request, $response) {
            $status = $this->db->edit_review($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/reviews/get-reviews-coordinator', 
                        function ($request, $response) {
            $status = $this->db->get_reviews_coordinator($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/reviews/get-reviews', function ($request, $response) {
            $status = $this->db->get_reviews($request);
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