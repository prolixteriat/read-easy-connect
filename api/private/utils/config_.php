<?php declare (strict_types=1);

# ------------------------------------------------------------------------------
# Define constants for different build environments.
define('DEV', 'dev');
define('PROD', 'prod');
define('TEST', 'test');

# Set the current environment.
define('ENVIRONMENT', DEV);

# ------------------------------------------------------------------------------
# Path constants.

if (ENVIRONMENT === DEV) {
    define('BASE_URL', '');
    define('API_URL', '');
    define('HOME_URL', '');
    define('MFA_LABEL', '');
    define('CREDS_PATH', '');

} else if (ENVIRONMENT === PROD) {
    define('BASE_URL', '');
    define('API_URL', '');
    define('HOME_URL', '');
    define('MFA_LABEL', '');
    define('CREDS_PATH', '');
    
} else if (ENVIRONMENT === TEST) {
    define('BASE_URL', '');
    define('API_URL', '');
    define('HOME_URL', '');
    define('MFA_LABEL', '');
    define('CREDS_PATH', '');

} else {
    die('Invalid environment');
}  

define('LOGBASE', '../logs');
define('LOGPATH', LOGBASE . '/api.log');

# ------------------------------------------------------------------------------

/*
End
*/