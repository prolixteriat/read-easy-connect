<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/../../private/db/DbUsers.php';

# ------------------------------------------------------------------------------
# Implements non-endpoint user database functionality for testing purposes

class TstDbUsers extends DbUsers {

    # ----------------------------------------------------------------------
    
    public function test_delete(string $email): bool {

        try {
            $stmt = $this->conn->prepare('SELECT user_id FROM users WHERE email = :email LIMIT 1');
            $stmt->execute([':email' => $email]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result) {
                return true; # User doesn't exist, nothing to delete
            }
            
            $user_id = (int)$result['user_id'];
            $this->conn->beginTransaction();
            $queries = [
                'DELETE FROM coaches WHERE coach_id = :user_id',
                'DELETE FROM coaches WHERE coordinator_id = :user_id',
                'DELETE FROM coordinators WHERE coordinator_id = :user_id',
                'DELETE FROM readers WHERE coach_id = :user_id',
                'DELETE FROM managers WHERE manager_id = :user_id',
                'DELETE FROM password_reset WHERE email = :email',
                'DELETE FROM audit WHERE performed_by_id = :user_id1 OR performed_on_id = :user_id2',
                'DELETE FROM users WHERE user_id = :user_id'
            ];
            foreach ($queries as $sql) {
                $stmt = $this->conn->prepare($sql);
                if (strpos($sql, 'audit') !== false) {
                    $stmt->execute([':user_id1' => $user_id, ':user_id2' => $user_id]);
                } elseif (strpos($sql, 'password_reset') !== false) {
                    $stmt->execute([':email' => $email]);
                } else {
                    $stmt->execute([':user_id' => $user_id]);
                }
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
