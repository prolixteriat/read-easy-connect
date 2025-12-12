<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/../../private/db/DbReviews.php';

# ------------------------------------------------------------------------------
# Implements non-endpoint review database functionality for testing purposes

class TstDbReviews extends DbReviews {

    # ----------------------------------------------------------------------
    
    public function test_delete(int $review_id): bool {

        try {
            $this->conn->beginTransaction();
            $queries = [
                'DELETE FROM audit WHERE description LIKE :description',
                'DELETE FROM reviews WHERE review_id = :review_id'
            ];
            
            $stmt = $this->conn->prepare($queries[0]);
            $stmt->execute([':description' => "%review%"]);
            
            $stmt = $this->conn->prepare($queries[1]);
            $stmt->execute([':review_id' => $review_id]);
            
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