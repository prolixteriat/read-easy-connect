<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

require_once __DIR__ . '/../../private/db/DbOrg.php';

# ------------------------------------------------------------------------------
# Implements non-endpoint organization database functionality for testing purposes

class TstDbOrg extends DbOrg {

    # ----------------------------------------------------------------------
    
    public function test_delete_region(int $region_id): bool {
        try {
            $this->conn->beginTransaction();
            $queries = [
                'DELETE FROM areas WHERE affiliate_id IN (SELECT affiliate_id FROM affiliates WHERE region_id = :region_id)',
                'DELETE FROM affiliates WHERE region_id = :region_id',
                'DELETE FROM regions WHERE region_id = :region_id'
            ];
            
            foreach ($queries as $sql) {
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([':region_id' => $region_id]);
            }
            
            $this->conn->commit();
            return true;
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->logger->error('test_delete_region failed: ' . $e->getMessage());
            return false;
        }         
    }

    public function test_delete_affiliate(int $affiliate_id): bool {
        try {
            $this->conn->beginTransaction();
            $queries = [
                'DELETE FROM areas WHERE affiliate_id = :affiliate_id',
                'DELETE FROM affiliates WHERE affiliate_id = :affiliate_id'
            ];
            
            foreach ($queries as $sql) {
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([':affiliate_id' => $affiliate_id]);
            }
            
            $this->conn->commit();
            return true;
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->logger->error('test_delete_affiliate failed: ' . $e->getMessage());
            return false;
        }         
    }

    public function test_delete_area(int $area_id): bool {
        try {
            $stmt = $this->conn->prepare('DELETE FROM areas WHERE area_id = :area_id');
            $stmt->execute([':area_id' => $area_id]);
            return true;
        } catch (Exception $e) {
            $this->logger->error('test_delete_area failed: ' . $e->getMessage());
            return false;
        }         
    }

    public function test_delete_venue(int $venue_id): bool {
        try {
            $stmt = $this->conn->prepare('DELETE FROM venues WHERE venue_id = :venue_id');
            $stmt->execute([':venue_id' => $venue_id]);
            return true;
        } catch (Exception $e) {
            $this->logger->error('test_delete_venue failed: ' . $e->getMessage());
            return false;
        }         
    }
    # ----------------------------------------------------------------------

}

# ------------------------------------------------------------------------------

/*
End
*/