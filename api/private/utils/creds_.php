<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once 'config.php';

# ------------------------------------------------------------------------------
# Crypto values.
# 'JWT'- Key for signing of JWT tokens.

if ((ENVIRONMENT === DEV) || (ENVIRONMENT === TEST)) {
       define('JWT_KEY', '');
       define('DATA_ENCRYPTION_KEY', '');
} else if (ENVIRONMENT === PROD) {
       define('JWT_KEY', '');
       define('DATA_ENCRYPTION_KEY', '');
} else {
       die('Invalid environment');
}
# ------------------------------------------------------------------------------
# Database credentials.

if (ENVIRONMENT === DEV) {
       define('DB', array(
              'host'     => '',
              'user'     => '',	
              'password' => '',
              'dbname'   => ''));
} else if (ENVIRONMENT === PROD) {
       define('DB', array(
              'host'     => '',
              'user'     => '',	
              'password' => '',
              'dbname'   => ''));
} else if (ENVIRONMENT === TEST) {
       define('DB', array(
              'host'     => '',
              'user'     => '',	
              'password' => '',
              'dbname'   => ''));       
} else {
       die('Invalid environment');
}
# ------------------------------------------------------------------------------
# Email credentials.

if ((ENVIRONMENT === DEV) || (ENVIRONMENT === TEST) ){
       define('MAIL', array(
              'host'     => '',
              'username' => '',
              'password' => ''));     
} else if (ENVIRONMENT === PROD) {
       define('MAIL', array(
              'host'     => '',
              'username' => '',
              'password' => ''));
} else {
       die('Invalid environment');
}
# ------------------------------------------------------------------------------

/*
End
*/