<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/db/DbReviews.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

$app->post('/reviews/add-review', function (Request $request, Response $response) {
    $db = new DbReviews();
    $status = $db->add_review($request);
    
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->post('/reviews/edit-review', function (Request $request, Response $response) {
    $db = new DbReviews();
    $status = $db->edit_review($request);
    
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/reviews/get-reviews-coordinator', function (Request $request, Response $response) {
    $db = new DbReviews();
    $status = $db->get_reviews_coordinator($request);
    
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/reviews/get-reviews', function (Request $request, Response $response) {
    $db = new DbReviews();
    $status = $db->get_reviews($request);
    
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

/*
End
*/
