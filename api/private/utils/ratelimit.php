<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

function calculate_delay(int $attempts): int {
    if ($attempts <= 2) {
        # first 2 attempts no delay
        return 0; 
    }
    $delay = pow(2, $attempts - 2); # exponential backoff
    return min($delay, 32); # cap at 32s
}
# ------------------------------------------------------------------------------

function clear_fail(PDO $pdo, string $ip, ?string $username): void {
    $sql = 'DELETE FROM login_attempts 
            WHERE ip_address = :ip OR username = :username';
    $pdo->prepare($sql)
        ->execute([
            ':ip' => $ip, 
            ':username' => $username
        ]);
}
# ------------------------------------------------------------------------------

function get_attempts(PDO $pdo, string $ip, ?string $username): ?array {
    $sql = 'SELECT attempts, last_attempt 
            FROM login_attempts 
            WHERE (ip_address = :ip OR username = :username)
            ORDER BY attempts DESC 
            LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
            ':ip' => $ip, 
            ':username' => $username
        ]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}
# ------------------------------------------------------------------------------

function record_fail(PDO $pdo, string $ip, ?string $username): void {
    $sql = 'SELECT id 
            FROM login_attempts 
            WHERE ip_address = :ip AND username <=> :username 
            LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
            ':ip' => $ip, 
            ':username' => $username
        ]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        $sql = 'UPDATE login_attempts 
                SET attempts = attempts + 1, last_attempt = NOW() 
                WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $row['id']]);
    } else {
        $sql = 'INSERT INTO login_attempts (ip_address, username, attempts) 
                VALUES (:ip, :username, 1)';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':ip' => $ip, ':username' => $username]);
    }
}
# ------------------------------------------------------------------------------

/*
End
*/

