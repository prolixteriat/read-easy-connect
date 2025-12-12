<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/../../private/db/DbLessons.php';

# ------------------------------------------------------------------------------
# Implements non-endpoint lesson database functionality for testing purposes

class TstDbLessons extends DbLessons {

    # ----------------------------------------------------------------------
    
    public function test_delete(int $lesson_id): bool {

        try {
            $this->conn->beginTransaction();
            $queries = [
                'DELETE FROM audit WHERE description LIKE :description',
                'DELETE FROM lessons WHERE lesson_id = :lesson_id'
            ];
            
            $stmt = $this->conn->prepare($queries[0]);
            $stmt->execute([':description' => "%lesson%"]);
            
            $stmt = $this->conn->prepare($queries[1]);
            $stmt->execute([':lesson_id' => $lesson_id]);
            
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