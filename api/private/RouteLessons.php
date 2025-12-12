<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/db/DbLessons.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

$app->post('/lessons/add-lesson', function (Request $request, Response $response) {
    $db = new DbLessons();
    $status = $db->add_lesson($request);
    
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->post('/lessons/edit-lesson', function (Request $request, Response $response) {
    $db = new DbLessons();
    $status = $db->edit_lesson($request);
    
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/lessons/get-lessons', function (Request $request, Response $response) {
    $db = new DbLessons();
    $status = $db->get_lessons($request);
    
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/lessons/get-lessons-coach', function (Request $request, Response $response) {
    $db = new DbLessons();
    $status = $db->get_lessons_coach($request);
    
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/lessons/get-lessons-reader', function (Request $request, Response $response) {
    $db = new DbLessons();
    $status = $db->get_lessons_reader($request);
    
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

/*
End
*/
