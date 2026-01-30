<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/tst/TstDbOrg.php';
require_once __DIR__ . '/tst/TstDbBase.php';

# ------------------------------------------------------------------------------

use PHPUnit\Framework\TestCase;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\StreamFactory;

# ------------------------------------------------------------------------------

class OrgTest extends TestCase {

    protected Slim\App $app;
    protected TstDbOrg $db;
    protected TstDbBase $base;
    protected string $jwt_token;
    protected ServerRequestFactory $request_factory;
    protected StreamFactory $stream_factory;

    # --------------------------------------------------------------------------

    protected function setUp(): void {
        
        $this->base = new TstDbBase();
        $this->db = new TstDbOrg();
        $this->app = AppFactory::create();
        $this->jwt_token = $this->base->test_director_jwt; 
        $this->request_factory = new ServerRequestFactory();
        $this->stream_factory = new StreamFactory();

        $this->add_routes();
    }
    # --------------------------------------------------------------------------

    protected function tearDown(): void {
        $this->base->cleanup();
    }
    # --------------------------------------------------------------------------

    public function test_add_region(): void {

        $payload = ['name' => 'Test Add Region'];
        $region_id = null;
        try {
            $this->jwt_token = $this->base->test_director_jwt;
            $request = $this->create_request('POST', '/org/add-region', $payload);
            $response = $this->app->handle($request);
            $this->assertEquals(200, $response->getStatusCode());
            $body = (string) $response->getBody();
            $data = json_decode($body, true);
            $region_id = $data['region_id'] ?? null;
        } finally {
            if ($region_id) {
                $this->db->test_delete_region((int)$region_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_edit_region(): void {

        $region_id = null;
        try {
            $this->jwt_token = $this->base->test_director_jwt;
            
            # Add new test region
            $add_payload = ['name' => 'Test Region Original'];
            $add_request = $this->create_request('POST', '/org/add-region', $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            $add_data = json_decode((string) $add_response->getBody(), true);
            $region_id = $add_data['region_id'];
            
            # Retrieve and check initial name
            $get_request = $this->create_request('GET', '/org/get-regions');
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $regions = json_decode((string) $get_response->getBody(), true);
            $found_region = array_filter($regions, 
                                fn($r) => $r['region_id'] == $region_id);
            $this->assertNotEmpty($found_region);
            $this->assertEquals('Test Region Original', 
                                array_values($found_region)[0]['name']);
            
            # Update region name
            $edit_payload = ['region_id' => $region_id, 'name' => 'Test Region Updated'];
            $edit_request = $this->create_request('POST', '/org/edit-region', $edit_payload);
            $edit_response = $this->app->handle($edit_request);
            $this->assertEquals(200, $edit_response->getStatusCode());
            
            # Retrieve and check updated name
            $get_request2 = $this->create_request('GET', '/org/get-regions');
            $get_response2 = $this->app->handle($get_request2);
            $this->assertEquals(200, $get_response2->getStatusCode());
            $regions2 = json_decode((string) $get_response2->getBody(), true);
            $found_region2 = array_filter($regions2, 
                                fn($r) => $r['region_id'] == $region_id);
            $this->assertNotEmpty($found_region2);
            $this->assertEquals('Test Region Updated', 
                                array_values($found_region2)[0]['name']);
            
        } finally {
            if ($region_id) {
                $this->db->test_delete_region((int)$region_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_get_regions(): void {

        $this->jwt_token = $this->base->test_director_jwt;
        $request = $this->create_request('GET', '/org/get-regions');
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
    }
    # --------------------------------------------------------------------------

    public function test_add_affiliate(): void {

        $payload = ['name' => 'Test Add Affiliate', 
                    'region_id' => $this->base->test_region_id];
        $affiliate_id = null;
        try {
            $this->jwt_token = $this->base->test_director_jwt;
            $request = $this->create_request('POST', '/org/add-affiliate', $payload);
            $response = $this->app->handle($request);
            $this->assertEquals(200, $response->getStatusCode());
            $body = (string) $response->getBody();
            $data = json_decode($body, true);
            $affiliate_id = $data['affiliate_id'] ?? null;
        } finally {
            if ($affiliate_id) {
                $this->db->test_delete_affiliate((int)$affiliate_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_edit_affiliate(): void {

        $affiliate_id = null;
        try {
            $this->jwt_token = $this->base->test_director_jwt;
            
            # Add new test affiliate
            $add_payload = ['name' => 'Test Affiliate Original', 'region_id' => $this->base->test_region_id];
            $add_request = $this->create_request('POST', '/org/add-affiliate', $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            $add_data = json_decode((string) $add_response->getBody(), true);
            $affiliate_id = $add_data['affiliate_id'];
            
            # Retrieve and check initial name
            $get_request = $this->create_request('GET', '/org/get-affiliates?region_id=' . $this->base->test_region_id);
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $affiliates = json_decode((string) $get_response->getBody(), true);
            $found_affiliate = array_filter($affiliates, fn($a) => 
                                            $a['affiliate_id'] == $affiliate_id);
            $this->assertNotEmpty($found_affiliate);
            $this->assertEquals('Test Affiliate Original', 
                                array_values($found_affiliate)[0]['name']);
            
            # Update affiliate name
            $edit_payload = ['affiliate_id' => $affiliate_id, 
                             'name' => 'Test Affiliate Updated'];
            $edit_request = $this->create_request('POST', '/org/edit-affiliate', 
                                $edit_payload);
            $edit_response = $this->app->handle($edit_request);
            $this->assertEquals(200, $edit_response->getStatusCode());
            
            # Retrieve and check updated name
            $get_request2 = $this->create_request('GET', '/org/get-affiliates?region_id=' . $this->base->test_region_id);
            $get_response2 = $this->app->handle($get_request2);
            $this->assertEquals(200, $get_response2->getStatusCode());
            $affiliates2 = json_decode((string) $get_response2->getBody(), true);
            $found_affiliate2 = array_filter($affiliates2, 
                                fn($a) => $a['affiliate_id'] == $affiliate_id);
            $this->assertNotEmpty($found_affiliate2);
            $this->assertEquals('Test Affiliate Updated', 
                        array_values($found_affiliate2)[0]['name']);
            
        } finally {
            if ($affiliate_id) {
                $this->db->test_delete_affiliate((int)$affiliate_id);
            }
        }
    }  
    # --------------------------------------------------------------------------

    public function test_get_affiliates(): void {

        $this->jwt_token = $this->base->test_director_jwt;
        $request = $this->create_request('GET', 
            '/org/get-affiliates?region_id=' . $this->base->test_region_id);
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
        $this->assertCount(1, $data);
        $this->assertEquals('Test Affiliate', $data[0]['name']);
    }
    # --------------------------------------------------------------------------

    public function test_add_area(): void {

        $payload = ['name' => 'Test Area2'];
        $area_id = null;
        try {
            $this->jwt_token = $this->base->test_manager_jwt;
            $request = $this->create_request('POST', '/org/add-area', $payload);
            $response = $this->app->handle($request);
            $this->assertEquals(200, $response->getStatusCode());
            $body = (string) $response->getBody();
            $data = json_decode($body, true);
            $area_id = $data['area_id'] ?? null;
        } finally {
            if ($area_id) {
                $this->db->test_delete_area((int)$area_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_edit_area(): void {

        $area_id = null;
        try {
            $this->jwt_token = $this->base->test_manager_jwt;
            
            # Add new test area
            $add_payload = ['name' => 'Test Area Original'];
            $add_request = $this->create_request('POST', '/org/add-area', $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            $add_data = json_decode((string) $add_response->getBody(), true);
            $area_id = $add_data['area_id'];
            
            # Retrieve and check initial name
            $get_request = $this->create_request('GET', '/org/get-areas');
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $areas = json_decode((string) $get_response->getBody(), true);
            $found_area = array_filter($areas, fn($a) => $a['area_id'] == $area_id);
            $this->assertNotEmpty($found_area);
            $this->assertEquals('Test Area Original', array_values($found_area)[0]['name']);
            
            # Update area name
            $edit_payload = ['area_id' => $area_id, 'name' => 'Test Area Updated'];
            $edit_request = $this->create_request('POST', '/org/edit-area', $edit_payload);
            $edit_response = $this->app->handle($edit_request);
            $this->assertEquals(200, $edit_response->getStatusCode());
            
            # Retrieve and check updated name
            $get_request2 = $this->create_request('GET', '/org/get-areas');
            $get_response2 = $this->app->handle($get_request2);
            $this->assertEquals(200, $get_response2->getStatusCode());
            $areas2 = json_decode((string) $get_response2->getBody(), true);
            $found_area2 = array_filter($areas2, fn($a) => $a['area_id'] == $area_id);
            $this->assertNotEmpty($found_area2);
            $this->assertEquals('Test Area Updated', array_values($found_area2)[0]['name']);
            
        } finally {
            if ($area_id) {
                $this->db->test_delete_area((int)$area_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_get_areas(): void {

        $this->jwt_token = $this->base->test_coordinator_jwt;
        $request = $this->create_request('GET', '/org/get-areas');
        $response = $this->app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
        $body = (string) $response->getBody();
        $data = json_decode($body, true);
    }
    # --------------------------------------------------------------------------

    public function test_add_venue(): void {

        $payload = ['name' => 'Test Add Venue'];
        $venue_id = null;
        try {
            $this->jwt_token = $this->base->test_manager_jwt;
            $request = $this->create_request('POST', '/org/add-venue', $payload);
            $response = $this->app->handle($request);
            $this->assertEquals(200, $response->getStatusCode());
            $body = (string) $response->getBody();
            $data = json_decode($body, true);
            $venue_id = $data['venue_id'] ?? null;
        } finally {
            if ($venue_id) {
                $this->db->test_delete_venue((int)$venue_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_edit_venue(): void {

        $venue_id = null;
        try {
            $this->jwt_token = $this->base->test_manager_jwt;
            
            # Add new test venue
            $add_payload = ['name' => 'Test Venue Original'];
            $add_request = $this->create_request('POST', '/org/add-venue', $add_payload);
            $add_response = $this->app->handle($add_request);
            $this->assertEquals(200, $add_response->getStatusCode());
            $add_data = json_decode((string) $add_response->getBody(), true);
            $venue_id = $add_data['venue_id'];
            
            # Retrieve and check initial name
            $get_request = $this->create_request('GET', '/org/get-venues');
            $get_response = $this->app->handle($get_request);
            $this->assertEquals(200, $get_response->getStatusCode());
            $venues = json_decode((string) $get_response->getBody(), true);
            $found_venue = array_filter($venues, fn($v) => $v['venue_id'] == $venue_id);
            $this->assertNotEmpty($found_venue);
            $this->assertEquals('Test Venue Original', array_values($found_venue)[0]['name']);
            
            # Update venue name
            $edit_payload = ['venue_id' => $venue_id, 'name' => 'Test Venue Updated'];
            $edit_request = $this->create_request('POST', '/org/edit-venue', $edit_payload);
            $edit_response = $this->app->handle($edit_request);
            $this->assertEquals(200, $edit_response->getStatusCode());
            
            # Retrieve and check updated name
            $get_request2 = $this->create_request('GET', '/org/get-venues');
            $get_response2 = $this->app->handle($get_request2);
            $this->assertEquals(200, $get_response2->getStatusCode());
            $venues2 = json_decode((string) $get_response2->getBody(), true);
            $found_venue2 = array_filter($venues2, fn($v) => $v['venue_id'] == $venue_id);
            $this->assertNotEmpty($found_venue2);
            $this->assertEquals('Test Venue Updated', array_values($found_venue2)[0]['name']);
            
        } finally {
            if ($venue_id) {
                $this->db->test_delete_venue((int)$venue_id);
            }
        }
    }
    # --------------------------------------------------------------------------

    public function test_get_venues(): void {

        $this->jwt_token = $this->base->test_coordinator_jwt;
        $request = $this->create_request('GET', '/org/get-venues');
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
        $this->app->post('/org/add-region', function ($request, $response) {
            $status = $this->db->add_region($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/org/edit-region', function ($request, $response) {
            $status = $this->db->edit_region($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/org/get-regions', function ($request, $response) {
            $status = $this->db->get_regions($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/org/add-affiliate', function ($request, $response) {
            $status = $this->db->add_affiliate($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/org/edit-affiliate', function ($request, $response) {
            $status = $this->db->edit_affiliate($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/org/get-affiliates', function ($request, $response) {
            $status = $this->db->get_affiliates($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/org/add-area', function ($request, $response) {
            $status = $this->db->add_area($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/org/edit-area', function ($request, $response) {
            $status = $this->db->edit_area($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/org/get-areas', function ($request, $response) {
            $status = $this->db->get_areas($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/org/add-venue', function ($request, $response) {
            $status = $this->db->add_venue($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->post('/org/edit-venue', function ($request, $response) {
            $status = $this->db->edit_venue($request);
            $response->getBody()->write($status->message);
            return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus($status->code);
                });

        $this->app->get('/org/get-venues', function ($request, $response) {
            $status = $this->db->get_venues($request);
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