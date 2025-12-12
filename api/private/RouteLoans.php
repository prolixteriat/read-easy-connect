<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/db/DbLoans.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

$app->post('/loans/add-loan', function (Request $request, Response $response) {

    $db = new DbLoans();
    $status = $db->add_loan($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->post('/loans/edit-loan', function (Request $request, Response $response) {

    $db = new DbLoans();
    $status = $db->edit_loan($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->get('/loans/get-loan', function (Request $request, Response $response) {

    $db = new DbLoans();
    $status = $db->get_loan($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->get('/loans/get-loans', function (Request $request, Response $response) {

    $db = new DbLoans();
    $status = $db->get_loans($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

/*
End
*/
