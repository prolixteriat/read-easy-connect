<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/../private/utils/creds.php';

# ------------------------------------------------------------------------------

use PHPUnit\Framework\TestCase;

# ------------------------------------------------------------------------------
# Check that creds constants have been properly defined.

final class CredsTest extends TestCase {

    # --------------------------------------------------------------------------

    public function setUp(): void {
        return;
    }
    # --------------------------------------------------------------------------
    
    public function tearDown(): void {
        return;
    }
    # --------------------------------------------------------------------------

    public function test_has_creds_db(): void {
        $ok = isset(DB['host']) and (strlen(DB['host']) > 0) and
              isset(DB['user']) and (strlen(DB['user']) > 0) and
              isset(DB['password']) and (strlen(DB['password']) > 0) and
              isset(DB['dbname']) and (strlen(DB['dbname']) > 0);
        $this->assertTrue($ok);
    }
    # --------------------------------------------------------------------------
    
    public function test_has_creds_mail(): void {
        $ok = isset(MAIL['host']) and (strlen(MAIL['host']) > 0) and
              isset(MAIL['username']) and (strlen(MAIL['username']) > 0) and
              isset(MAIL['password']) and (strlen(MAIL['password']) > 0);
        $this->assertTrue($ok);
    }
    # --------------------------------------------------------------------------
    
    public function test_has_creds_other(): void {
        $ok = (strlen(JWT_KEY) > 0) and
              (strlen(EMAIL_SALT) > 0) and 
              (strlen(DATA_ENCRYPTION_KEY) > 0) and 
              (strlen(ENVIRONMENT) > 0);
        $this->assertTrue($ok);
    }    
    # --------------------------------------------------------------------------
}
# ------------------------------------------------------------------------------

/*
End
*/
