<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/../../private/db/DbNotes.php';

# ------------------------------------------------------------------------------
# Implements non-endpoint notes database functionality for testing purposes

class TstDbNotes extends DbNotes {

    # ----------------------------------------------------------------------
    
    public function test_delete_coach_note(int $note_id): bool {

        try {
            $this->conn->beginTransaction();
            
            $sql = 'DELETE FROM coach_notes WHERE note_id = :note_id';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':note_id' => $note_id]);
            
            $this->conn->commit();
            return true;

        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->logger->error('test_delete_coach_note failed: ' . $e->getMessage());
            return false;
        }         
    }
    # ----------------------------------------------------------------------

    public function test_delete_reader_note(int $note_id): bool {

        try {
            $this->conn->beginTransaction();
            
            $sql = 'DELETE FROM reader_notes WHERE note_id = :note_id';
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':note_id' => $note_id]);
            
            $this->conn->commit();
            return true;

        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->logger->error('test_delete_reader_note failed: ' . $e->getMessage());
            return false;
        }         
    }
    # ----------------------------------------------------------------------

}

# ------------------------------------------------------------------------------

/*
End
*/
