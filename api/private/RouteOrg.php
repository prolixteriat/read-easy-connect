<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/db/DbOrg.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

$app->post('/org/add-affiliate', function (Request $request, Response $response) {
    $db = new DbOrg();
    $status = $db->add_affiliate($request);
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->post('/org/add-area', function (Request $request, Response $response) {
    $db = new DbOrg();
    $status = $db->add_area($request);
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->post('/org/add-region', function (Request $request, Response $response) {
    $db = new DbOrg();
    $status = $db->add_region($request);
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->post('/org/edit-affiliate', function (Request $request, Response $response) {
    $db = new DbOrg();
    $status = $db->edit_affiliate($request);
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->post('/org/edit-area', function (Request $request, Response $response) {
    $db = new DbOrg();
    $status = $db->edit_area($request);
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->post('/org/edit-region', function (Request $request, Response $response) {
    $db = new DbOrg();
    $status = $db->edit_region($request);
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/org/get-affiliates', function (Request $request, Response $response) {
    $db = new DbOrg();
    $status = $db->get_affiliates($request);
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/org/get-areas', function (Request $request, Response $response) {
    $db = new DbOrg();
    $status = $db->get_areas($request);
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/org/get-regions', function (Request $request, Response $response) {
    $db = new DbOrg();
    $status = $db->get_regions($request);
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->post('/org/add-venue', function (Request $request, Response $response) {
    $db = new DbOrg();
    $status = $db->add_venue($request);
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->post('/org/edit-venue', function (Request $request, Response $response) {
    $db = new DbOrg();
    $status = $db->edit_venue($request);
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/org/get-venues', function (Request $request, Response $response) {
    $db = new DbOrg();
    $status = $db->get_venues($request);
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

/*
End
*/
