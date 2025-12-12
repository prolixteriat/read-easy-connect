<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/tst/TstDbLessons.php';
require_once __DIR__ . '/utils/creds.php';

# ------------------------------------------------------------------------------

use PHPUnit\Framework\TestCase;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\StreamFactory;

# ------------------------------------------------------------------------------

class LessonsTest extends TestCase {

    protected Slim\App $app;
    protected TstDbLessons $db;
    protected string $jwt_token;
    protected ServerRequestFactory $request_factory;
    protected StreamFactory $stream_factory;
    protected array $tokens;

    # --------------------------------------------------------------------------

    protected function setUp(): void {
        
        $this->tokens = TestTokens::get();
        $this->db = new TstDbLessons();
        $this->app = AppFactory::create();
        $this->jwt_token = $this->tokens['manager']; 
        $this->request_factory = new ServerRequestFactory();
        $this->stream_factory = new StreamFactory();

        $this->add_routes();
    }
    # --------------------------------------------------------------------------

    public function test_add_lesson(): void {

        $payload = ['coach_id' => '6', 
                    'reader_id' => '1',
                    'date' => '2024-01-15',
                    'venue_id' => 1];
        $lesson_id = null;
        try {
            $this->jwt_token = $this->tokens['coach'];
            $request = $this->create_request('POST', '/lessons/add-lesson', 
                                            $payload);
            $response = $this->app->handle($request);
            $this->assertEquals(200, $response->getStatusCode());
            $body = (string) $response->getBody();
            $data = json_decode($body, true);
            $lesson_id = $data['lesson_id'] ?? null;
        } finally {
            if ($lesson_id) {
                $this->db->test_delete((int)$lesson_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_edit_lesson(): void {

        $lesson_id = null;
        try {
            $this->jwt_token = $this->tokens['coordinator'];
            
            # Add new test lesson
            $add_payload = [
                'coach_id' => TEST_COACH_ID,
                'reader_id' => '1',
                'date' => '2024-01-15',
                'venue_id' => 1
            ];
            $add_request = $this->create_request('POST', '/lessons/add-lesson', 
                                                $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            $add_data = json_decode((string) $add_response->getBody(), true);
            $lesson_id = $add_data['lesson_id'];
            
            # Retrieve and check initial venue_id
            $get_request = $this->create_request('GET', 
                        '/lessons/get-lessons-coach?coach_id=' . TEST_COACH_ID);
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $lessons = json_decode((string) $get_response->getBody(), true);
            $found_lesson = array_filter($lessons, 
                                    fn($l) => $l['lesson_id'] == $lesson_id);
            $this->assertNotEmpty($found_lesson);
            $this->assertEquals(1, 
                                    array_values($found_lesson)[0]['venue_id']);
            
            # Update lesson venue_id
            $edit_payload = [
                'lesson_id' => $lesson_id,
                'venue_id' => 2
            ];
            $edit_request = $this->create_request('POST', '/lessons/edit-lesson', 
                                                $edit_payload);
            $edit_response = $this->app->handle($edit_request);
            $this->assertEquals(200, $edit_response->getStatusCode());
            
            # Retrieve and check updated venue_id
            $get_request2 = $this->create_request('GET', 
                        '/lessons/get-lessons-coach?coach_id='. TEST_COACH_ID);
            $get_response2 = $this->app->handle($get_request2);
            $this->assertEquals(200, $get_response2->getStatusCode());
            $lessons2 = json_decode((string) $get_response2->getBody(), true);
            $found_lesson2 = array_filter($lessons2, 
                                    fn($l) => $l['lesson_id'] == $lesson_id);
            $this->assertNotEmpty($found_lesson2);
            $this->assertEquals(2, 
                                    array_values($found_lesson2)[0]['venue_id']);
            
        } finally {
            if ($lesson_id) {
                $this->db->test_delete((int)$lesson_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_get_lessons_coach(): void {

        $this->jwt_token = $this->tokens['coach'];
        $request = $this->create_request('GET', 
                        '/lessons/get-lessons-coach?coach_id=' . TEST_COACH_ID);
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
    }
    # --------------------------------------------------------------------------

    public function test_get_lessons_reader(): void {

        $this->jwt_token = $this->tokens['coach'];
        $request = $this->create_request('GET', 
                                    '/lessons/get-lessons-reader?reader_id=1');
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
    }
    # --------------------------------------------------------------------------

    public function test_get_lessons(): void {

        $this->jwt_token = $this->tokens['manager'];
        $request = $this->create_request('GET', '/lessons/get-lessons');
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

        $this->app->post('/lessons/add-lesson', function ($request, $response) {
            $status = $this->db->add_lesson($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/lessons/edit-lesson', function ($request, $response) {
            $status = $this->db->edit_lesson($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/lessons/get-lessons-coach', function ($request, $response) {
            $status = $this->db->get_lessons_coach($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/lessons/get-lessons-reader', function ($request, $response) {
            $status = $this->db->get_lessons_reader($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/lessons/get-lessons', function ($request, $response) {
            $status = $this->db->get_lessons($request);
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