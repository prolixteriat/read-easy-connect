<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/db/DbUsers.php';
require_once __DIR__ . '/db/DbLogin.php';
require_once __DIR__ . '/utils/helper.php';

# ------------------------------------------------------------------------------

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

# ------------------------------------------------------------------------------

$app->get('/', function (Request $request, Response $response) {
    $response->getBody()->write('404 Not Found');
    return $response
        ->withHeader('Content-Type', 'text/html')
        ->withStatus(404);
});
# ------------------------------------------------------------------------------

$app->get('/hello-world', function (Request $request, Response $response) {
    $response->getBody()->write('Hello world!');
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(200);
});
# ------------------------------------------------------------------------------

$app->post('/users/add-user', function (Request $request, Response $response) {

    $db = new DbUsers();
    $status = $db->add_user($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->post('/users/complete-mfa-setup', function (Request $request, Response $response) {

    $db = new DbLogin();
    $status = $db->complete_mfa_setup($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->post('/users/create-reset-token', function (Request $request, Response $response) {

    $db = new DbLogin();
    $status = $db->create_reset_token($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->post('/users/edit-profile', function (Request $request, Response $response) {

    $db = new DbUsers();
    $status = $db->edit_profile($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->post('/users/edit-user', function (Request $request, Response $response) {

    $db = new DbUsers();
    $status = $db->edit_user($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->get('/users/get-reset-form', function (Request $request, Response $response) {
    $db = new DbLogin();
    $status = $db->get_reset_form($request);

    if ($status->success === false) {
        $json_data = json_decode($status->message, true);
        $response->getBody()->write($json_data['message']);
    } else {
        $response->getBody()->write($status->data);
    }

    return $response
        ->withHeader('Content-Type', 'text/html')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->get('/users/get-users', function (Request $request, Response $response) {

    $db = new DbUsers();
    $status = $db->get_users($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->post('/users/is-valid-token', function (Request $request, Response $response) {
    $db = new DbLogin();
    $status = $db->is_valid_token($request);
    $response->getBody()->write($status->message);
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->post('/users/login', function (Request $request, Response $response) {

    $db = new DbLogin();
    $status = $db->login($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->post('/users/logout', function (Request $request, Response $response) {

    $db = new DbLogin();
    $status = $db->logout($request);
    $response->getBody()->write($status->message);
	return $response
			->withHeader('Content-Type', 'application/json')
            ->withStatus($status->code);   	
});
# ------------------------------------------------------------------------------

$app->get('/users/password-reset', function (Request $request, Response $response) {
    $db = new DbLogin();
    $status = $db->password_reset($request);
    
    if ($status->success === false) {
        $json_data = json_decode($status->message, true);
        $response->getBody()->write($json_data['message']);
    } else {
        $response->getBody()->write($status->data);
    }
    
    return $response
        ->withHeader('Content-Type', 'text/html')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

$app->post('/users/submit-reset', function (Request $request, Response $response) {
    $db = new DbLogin();
    $status = $db->submit_reset($request);
    
    if ($status->code === 202 && $status->data) {
        $response->getBody()->write(json_encode($status->data));
    } else {
        $response->getBody()->write($status->message);
    }
    
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status->code);
});
# ------------------------------------------------------------------------------

/*
End
*/
