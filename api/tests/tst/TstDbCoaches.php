<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/../../private/db/DbCoaches.php';
require_once __DIR__ . '/../../private/db/DbUsers.php';

# ------------------------------------------------------------------------------
# Implements non-endpoint coach database functionality for testing purposes

class TstDbCoaches extends DbCoaches {

    # ----------------------------------------------------------------------
    
    public function test_delete(string $email): bool {
        try {
            $user_id = $this->get_user_id($email);
            $this->conn->beginTransaction();
            $queries = [
                'DELETE FROM audit WHERE performed_on_id = :user_id',
                'DELETE FROM coaches WHERE coach_id = :user_id',
                'DELETE FROM users WHERE user_id = :user_id'
            ];
            foreach ($queries as $sql) {
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([':user_id' => $user_id]);
            }
            $this->conn->commit();
            return true;

        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->logger->error('test_delete failed: ' . $e->getMessage());
            return false;
        }         
    }
    # ----------------------------------------------------------------------

}

# ------------------------------------------------------------------------------

/*
End
*/