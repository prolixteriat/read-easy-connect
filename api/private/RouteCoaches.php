<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/db/DbCoaches.php';
require_once __DIR__ . '/utils/helper.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

$app->post('/coaches/add-coach', function (Request $request, Response $response) {
    $db = new DbCoaches();
    $status = $db->add_coach($request);   
    $response->getBody()->write($status->message);
    
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->post('/coaches/edit-coach', function (Request $request, Response $response) {
    $db = new DbCoaches();
    $status = $db->edit_coach($request);
    $response->getBody()->write($status->message);
    
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/coaches/get-coach', function (Request $request, Response $response) {
    $db = new DbCoaches();
    $status = $db->get_coach($request);
    $response->getBody()->write($status->message);
    
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/coaches/get-coaches', function (Request $request, Response $response) {
    $db = new DbCoaches();
    $status = $db->get_coaches($request);
    $response->getBody()->write($status->message);
    
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

/*
End
*/
