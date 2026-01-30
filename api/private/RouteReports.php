<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/db/DbReports.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

$app->get('/reports/get-audit-logs', function (Request $request, Response $response) {
    $db = new DbReports();
    $status = $db->get_audit_logs($request);
    
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/reports/get-coach-detail', function (Request $request, Response $response) {
    $db = new DbReports();
    $status = $db->get_coach_detail($request);
    
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/reports/get-reader-detail', function (Request $request, Response $response) {
    $db = new DbReports();
    $status = $db->get_reader_detail($request);
    
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/reports/get-dashboard', function (Request $request, Response $response) {
    $db = new DbReports();
    $status = $db->get_dashboard($request);
    
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

/*
End
*/
