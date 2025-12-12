<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

# user IDs must match those used to create tokens
define('TEST_COACH_ID', );        # `user_id` from `users` table
define('TEST_COORDINATOR_ID', );   # `user_id` from `users` table
define('TEST_READER_ID', );        # `reader_id` from `readers` table
define('TEST_REGION_ID', );        # `region_id` from `regions` table
define('TEST_VENUE_ID', );        # `venue_id` from `venues` table

# ------------------------------------------------------------------------------
# Use /test/api-test.html > Login to generate a token for each role
class TestTokens {
    
    public static function get(): array {
        return [
            'admin' => '',
            'director' => '',
            'manager' => '',
            'coordinator' => '',
            'coach' => ''
        ];
    }
}
# ------------------------------------------------------------------------------

/*
End
*/