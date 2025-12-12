<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

error_reporting(E_ALL);
ini_set('error_log', __DIR__ . '/../logs/php-errors.log');
ini_set('log_errors', 1);
# TODO: Set next value to zero in production code
ini_set('display_errors', 1);
date_default_timezone_set('Europe/London');

# ------------------------------------------------------------------------------

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../private/utils/config.php';
require_once __DIR__ . '/../private/utils/helper.php';

# ------------------------------------------------------------------------------

use Selective\BasePath\BasePathMiddleware;
use Slim\Factory\AppFactory;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Exception\HttpNotFoundException;

# ------------------------------------------------------------------------------

$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();
$app->add(new BasePathMiddleware($app));

$customErrorHandler = new CustomErrorHandler(
    $app->getCallableResolver(),
    $app->getResponseFactory()
);

# TODO: Set first boolean to false in production code
$errorMiddleware = $app->addErrorMiddleware(true, true, true);
$errorMiddleware->setDefaultErrorHandler($customErrorHandler);

# ------------------------------------------------------------------------------
# Include API routes.

require_once __DIR__ . '/../private/RouteCoaches.php';
require_once __DIR__ . '/../private/RouteLoans.php';
require_once __DIR__ . '/../private/RouteLessons.php';
require_once __DIR__ . '/../private/RouteOrg.php';
require_once __DIR__ . '/../private/RouteReaders.php';
require_once __DIR__ . '/../private/RouteReports.php';
require_once __DIR__ . '/../private/RouteReviews.php';
require_once __DIR__ . '/../private/RouteUsers.php';

# ------------------------------------------------------------------------------
# Handle OPTIONS preflight requests for CORS on all routes.

$app->options('/{routes:.+}', 
    function (Request $request, Response $response, $args) {
        return $response;
    }
);
# ------------------------------------------------------------------------------
# Log all unmatched calls. Must come last in route chain.

$app->map(['CONNECT', 'DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'TRACE'], 
            '/{routes:.+}', 
    function (Request$request, Response$response) {
        $logger = get_logger('UnmatchedRequests');
        $logger->warning('Unmatched request: ' . (string)$request->getMethod());
        throw new HttpNotFoundException($request);
    }
);
# ------------------------------------------------------------------------------

$app->run();

# ------------------------------------------------------------------------------

/*
End
*/