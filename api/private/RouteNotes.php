<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/db/DbNotes.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

$app->post('/notes/add-coach-note', function (Request $request, Response $response) {

    $db = new DbNotes();
    $status = $db->add_coach_note($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->post('/notes/add-reader-note', function (Request $request, Response $response) {

    $db = new DbNotes();
    $status = $db->add_reader_note($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->post('/notes/edit-coach-note', function (Request $request, Response $response) {

    $db = new DbNotes();
    $status = $db->edit_coach_note($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->post('/notes/edit-reader-note', function (Request $request, Response $response) {

    $db = new DbNotes();
    $status = $db->edit_reader_note($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->get('/notes/get-coach-notes', function (Request $request, Response $response) {

    $db = new DbNotes();
    $status = $db->get_coach_notes($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->get('/notes/get-reader-notes', function (Request $request, Response $response) {

    $db = new DbNotes();
    $status = $db->get_reader_notes($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

/*
End
*/
