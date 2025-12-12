<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/db/DbReaders.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

$app->post('/readers/add-reader', function (Request $request, Response $response) {

    $db = new DbReaders();
    $status = $db->add_reader($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->post('/readers/edit-reader', function (Request $request, Response $response) {

    $db = new DbReaders();
    $status = $db->edit_reader($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->get('/readers/get-reader', function (Request $request, Response $response) {

    $db = new DbReaders();
    $status = $db->get_reader($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->get('/readers/get-readers', function (Request $request, Response $response) {

    $db = new DbReaders();
    $status = $db->get_readers($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

/*
End
*/
