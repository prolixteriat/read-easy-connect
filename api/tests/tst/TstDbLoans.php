<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/../../private/db/DbLoans.php';

# ------------------------------------------------------------------------------
# Implements non-endpoint loan database functionality for testing purposes

class TstDbLoans extends DbLoans {

    # ----------------------------------------------------------------------
    
    public function test_delete(int $loan_id): bool {

        try {
            $this->conn->beginTransaction();
            
            $sql = 'DELETE FROM loans WHERE loan_id = :loan_id';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':loan_id' => $loan_id]);
            
            $this->conn->commit();
            return true;

        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->logger->error('test_delete failed: ' . $e->getMessage());
            return false;
        }         
    }
    # ----------------------------------------------------------------------

    public function test_get_reader_id(): int {
        $sql = 'SELECT reader_id FROM readers LIMIT 1';
        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        return (int)$stmt->fetchColumn();
    }
    # ----------------------------------------------------------------------

}

# ------------------------------------------------------------------------------

/*
End
*/