<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/tst/TstDbNotes.php';
require_once __DIR__ . '/tst/TstDbBase.php';

# ------------------------------------------------------------------------------

use PHPUnit\Framework\TestCase;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\StreamFactory;

# ------------------------------------------------------------------------------

class NotesTest extends TestCase {

    protected Slim\App $app;
    protected TstDbNotes $db;
    protected TstDbBase $base;
    protected string $jwt_token;
    protected ServerRequestFactory $request_factory;
    protected StreamFactory $stream_factory;

    # --------------------------------------------------------------------------

    protected function setUp(): void {
        
        $this->base = new TstDbBase();
        $this->db = new TstDbNotes();
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

    public function test_add_coach_note(): void {

        $payload = [
            'about_id' => $this->base->test_coach_id,
            'note' => 'Test coach note'
        ];
        $note_id = null;
        
        try {
            $this->jwt_token = $this->base->test_manager_jwt;
            $request = $this->create_request(
                'POST', '/notes/add-coach-note', $payload);
            $response = $this->app->handle($request);
            $this->assertEquals(200, $response->getStatusCode());
            $body = (string) $response->getBody();
            $data = json_decode($body, true);
            $this->assertArrayHasKey('note_id', $data);
            $note_id = $data['note_id'];
            
            # Test get-coach-notes to confirm correct data
            $get_request = $this->create_request(
                'GET', '/notes/get-coach-notes?about_id=' . $this->base->test_coach_id);
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $get_body = (string) $get_response->getBody();
            $get_data = json_decode($get_body, true);
            $this->assertIsArray($get_data);
            $this->assertGreaterThan(0, count($get_data));
            $found = false;
            foreach ($get_data as $note) {
                if ($note['note_id'] == $note_id) {
                    $this->assertEquals($payload['note'], $note['note']);
                    $found = true;
                    break;
                }
            }
            $this->assertTrue($found);
        } finally {
            if ($note_id) {
                $this->db->test_delete_coach_note($note_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_add_reader_note(): void {

        $payload = [
            'about_id' => $this->base->test_reader_id,
            'note' => 'Test reader note'
        ];
        $note_id = null;
        
        try {
            $this->jwt_token = $this->base->test_manager_jwt;
            $request = $this->create_request(
                'POST', '/notes/add-reader-note', $payload);
            $response = $this->app->handle($request);
            $this->assertEquals(200, $response->getStatusCode());
            $body = (string) $response->getBody();
            $data = json_decode($body, true);
            $this->assertArrayHasKey('note_id', $data);
            $note_id = $data['note_id'];
            
            # Test get-reader-notes to confirm correct data
            $get_request = $this->create_request(
                'GET', '/notes/get-reader-notes?about_id=' . $this->base->test_reader_id);
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $get_body = (string) $get_response->getBody();
            $get_data = json_decode($get_body, true);
            $this->assertIsArray($get_data);
            $this->assertGreaterThan(0, count($get_data));
            $found = false;
            foreach ($get_data as $note) {
                if ($note['note_id'] == $note_id) {
                    $this->assertEquals($payload['note'], $note['note']);
                    $found = true;
                    break;
                }
            }
            $this->assertTrue($found);
        } finally {
            if ($note_id) {
                $this->db->test_delete_reader_note($note_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_edit_coach_note(): void {

        $note_id = null;
        
        try {
            $this->jwt_token = $this->base->test_manager_jwt;
            
            # Add new test coach note
            $add_payload = [
                'about_id' => $this->base->test_coach_id,
                'note' => 'Original coach note'
            ];
            $add_request = $this->create_request(
                'POST', '/notes/add-coach-note', $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            $add_data = json_decode((string) $add_response->getBody(), true);
            $note_id = $add_data['note_id'];
            
            # Update note
            $edit_payload = [
                'note_id' => $note_id,
                'note' => 'Updated coach note'
            ];
            $edit_request = $this->create_request(
                'POST', '/notes/edit-coach-note', $edit_payload);
            $edit_response = $this->app->handle($edit_request);
            $this->assertEquals(200, $edit_response->getStatusCode());
            
            # Retrieve and check updated data
            $get_request = $this->create_request(
                'GET', '/notes/get-coach-notes?about_id=' . $this->base->test_coach_id);
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $get_data = json_decode((string) $get_response->getBody(), true);
            $found = false;
            foreach ($get_data as $note) {
                if ($note['note_id'] == $note_id) {
                    $this->assertEquals('Updated coach note', $note['note']);
                    $found = true;
                    break;
                }
            }
            $this->assertTrue($found);
            
        } finally {
            if ($note_id) {
                $this->db->test_delete_coach_note($note_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_edit_reader_note(): void {

        $note_id = null;
        
        try {
            $this->jwt_token = $this->base->test_manager_jwt;
            
            # Add new test reader note
            $add_payload = [
                'about_id' => $this->base->test_reader_id,
                'note' => 'Original reader note'
            ];
            $add_request = $this->create_request(
                'POST', '/notes/add-reader-note', $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            $add_data = json_decode((string) $add_response->getBody(), true);
            $note_id = $add_data['note_id'];
            
            # Update note
            $edit_payload = [
                'note_id' => $note_id,
                'note' => 'Updated reader note'
            ];
            $edit_request = $this->create_request(
                'POST', '/notes/edit-reader-note', $edit_payload);
            $edit_response = $this->app->handle($edit_request);
            $this->assertEquals(200, $edit_response->getStatusCode());
            
            # Retrieve and check updated data
            $get_request = $this->create_request(
                'GET', '/notes/get-reader-notes?about_id=' . $this->base->test_reader_id);
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $get_data = json_decode((string) $get_response->getBody(), true);
            $found = false;
            foreach ($get_data as $note) {
                if ($note['note_id'] == $note_id) {
                    $this->assertEquals('Updated reader note', $note['note']);
                    $found = true;
                    break;
                }
            }
            $this->assertTrue($found);
            
        } finally {
            if ($note_id) {
                $this->db->test_delete_reader_note($note_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_get_coach_notes(): void {

        $request = $this->create_request(
            'GET', '/notes/get-coach-notes?about_id=' . $this->base->test_coach_id);
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
        $this->assertIsArray($data);
    }
    # --------------------------------------------------------------------------

    public function test_get_coach_notes_all(): void {

        # Test without about_id to get all coach notes in affiliate
        $request = $this->create_request(
            'GET', '/notes/get-coach-notes');
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
        $this->assertIsArray($data);
    }
    # --------------------------------------------------------------------------

    public function test_get_reader_notes(): void {

        $request = $this->create_request(
            'GET', '/notes/get-reader-notes?about_id=' . $this->base->test_reader_id);
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
        $this->assertIsArray($data);
    }
    # --------------------------------------------------------------------------

    public function test_get_reader_notes_all(): void {

        # Test without about_id to get all reader notes in affiliate
        $request = $this->create_request('GET', '/notes/get-reader-notes');
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
        $this->assertIsArray($data);
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
        $this->app->post('/notes/add-coach-note', function ($request, $response) {
            $status = $this->db->add_coach_note($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/notes/add-reader-note', function ($request, $response) {
            $status = $this->db->add_reader_note($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/notes/edit-coach-note', function ($request, $response) {
            $status = $this->db->edit_coach_note($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/notes/edit-reader-note', function ($request, $response) {
            $status = $this->db->edit_reader_note($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/notes/get-coach-notes', function ($request, $response) {
            $status = $this->db->get_coach_notes($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/notes/get-reader-notes', function ($request, $response) {
            $status = $this->db->get_reader_notes($request);
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
