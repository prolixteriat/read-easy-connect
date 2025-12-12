<?php declare(strict_types=1);
namespace MFA;

# ------------------------------------------------------------------------------

use OTPHP\TOTP;
use ParagonIE\ConstantTime\Base32;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;

# ------------------------------------------------------------------------------

class MFAService
{
    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------

    public function generate_secret(): string {
        return Base32::encodeUpper(random_bytes(20));
    }
    # --------------------------------------------------------------------------

    public function generate_qr_code(string $uri): string {
        $qrCode = new QrCode($uri, size: 250);
        $writer = new PngWriter();
        $result = $writer->write($qrCode);
        return $result->getString();
    }
    # --------------------------------------------------------------------------

    public function get_provisioning_uri(string $secret, string $user, 
                                        string $issuer): string {
        // Create URI manually to ensure all parameters are explicitly included
        $label = urlencode($issuer . ':' . $user);
        $params = http_build_query([
            'secret' => $secret,
            'issuer' => $issuer,
            'algorithm' => 'SHA1',
            'digits' => '6',
            'period' => '30'
        ]);
        return "otpauth://totp/{$label}?{$params}";
    }
    # --------------------------------------------------------------------------

    public function verify_code(string $secret, string $code): bool
    {
        $totp = TOTP::createFromSecret($secret);

        $totp->setPeriod(30);
        $totp->setDigits(6);

        # Clean user input
        $code = preg_replace('/\D/', '', trim($code));
        $now = time();

        # Manual verification due to misbehaviour of TOTP::verify method
        $valid =
            hash_equals($totp->at($now), $code) ||
            hash_equals($totp->at($now - 30), $code) ||
            hash_equals($totp->at($now + 30), $code);
        return $valid;
    }

    # --------------------------------------------------------------------------
}
# ------------------------------------------------------------------------------

/*
End
*/