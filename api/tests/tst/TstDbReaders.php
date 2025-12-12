<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/../../private/db/DbReaders.php';

# ------------------------------------------------------------------------------
# Implements non-endpoint reader database functionality for testing purposes

class TstDbReaders extends DbReaders {

    # ----------------------------------------------------------------------
    
    public function test_delete(string $name): bool {

        try {
            $sql = 'SELECT reader_id FROM readers WHERE name = :name LIMIT 1';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':name' => $name]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result) {
                return true; # Already deleted or doesn't exist
            }
            
            $reader_id = $result['reader_id'];
            
            $this->conn->beginTransaction();
            $queries = [
                'DELETE FROM audit WHERE description LIKE :description',
                'DELETE FROM readers WHERE reader_id = :reader_id'
            ];
            
            $stmt = $this->conn->prepare($queries[0]);
            $stmt->execute([':description' => "%Reader added: {$name}%"]);
            
            $stmt = $this->conn->prepare($queries[1]);
            $stmt->execute([':reader_id' => $reader_id]);
            
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