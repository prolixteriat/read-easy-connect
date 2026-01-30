<?php declare (strict_types=1);

# ------------------------------------------------------------------------------

require_once 'creds.php';

# ------------------------------------------------------------------------------

use PHPMailer\PHPMailer\PHPMailer;
use Monolog\Logger;

# ------------------------------------------------------------------------------

class Mailer {
    # Properties
    private Logger $logger;     
    private PHPMailer $mail;

    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------
    # Constructor

    function __construct() {

        $this->logger = get_logger('Mailer');
        $this->mail = new PHPMailer();
        $this->mail->isSMTP();
        // $this->mail->SMTPDebug = 2;
        $this->mail->Host = MAIL['host'];
        $this->mail->SMTPSecure = 'tls';
        $this->mail->Port = 587;
        $this->mail->SMTPAuth = true;
        $this->mail->Username = MAIL['username'];
        $this->mail->Password = MAIL['password'];
        $parts = explode('@', MAIL['username']);
        $noreply = 'noreply@' . $parts[1];
        $this->mail->setFrom(MAIL['username'], $noreply);
        $this->mail->addReplyTo($noreply);
    }
    # --------------------------------------------------------------------------
    # 
    public function get_reset_url(string $token): string {

        $reset_url = API_URL . "/users/password-reset?token=$token";
        return $reset_url;
    }
    # --------------------------------------------------------------------------

    public function send_email(string $to, string $subject, string $body, 
                                ?string $cc = null): bool {
        try {
            $this->mail->clearAllRecipients();
            $this->mail->isHTML(true);
            # #### TODO: remove the calls to update_domain for production
            $to = $this->update_domain($to);
            $this->mail->addAddress($to);
            if ($cc) {
                $cc = $this->update_domain($cc);
                $this->mail->addCC($cc);
            }
            $this->mail->Subject = $subject;
            $this->mail->Body = $this->wrap_html($body);
            $rv = $this->mail->send();
        } catch (Exception $e) {
            $this->logger->error('send_email: ' . $e->getMessage());
            $rv = false;
        }
        return $rv;
    }
    # --------------------------------------------------------------------------

    public function send_email_with_attachment(string $to, string $subject, 
                        string $body, string $attachment_content, 
                        string $attachment_name, ?string $cc = null): bool {
        try {
            $this->mail->clearAllRecipients();
            $this->mail->clearAttachments();
            $this->mail->isHTML(true);
            # #### TODO: remove the calls to update_domain for production
            $to = $this->update_domain($to);
            $this->mail->addAddress($to);
            if ($cc) {
                $this->mail->addCC($cc);
                $cc = $this->update_domain($cc);
            }
            $this->mail->Subject = $subject;
            $this->mail->Body = $this->wrap_html($body);
            $this->mail->addStringAttachment($attachment_content, $attachment_name);
            $rv = $this->mail->send();
        } catch (Exception $e) {
            $this->logger->error('send_email_with_attachment: ' . $e->getMessage());
            $rv = false;
        }
        return $rv;
    }
    # --------------------------------------------------------------------------
    # 
    public function send_reset(string $email, string $token, int $expiry): bool {
        try {
            $reset_url = $this->get_reset_url($token);
            $this->mail->clearAllRecipients();
            $this->mail->isHTML(true);
            $this->mail->addAddress($email);
            $this->mail->Subject = 'Read Easy Connect: Reset Your Password';
            $expiry_text = $expiry === 1 ? "one hour" : "$expiry hours";
            $message = "
                <p>We received a request to reset the password for the 
                Read Easy Connect user associated with this email address.</p>
                <p>If you did not make this request, you can safely ignore this email.</p>
                <p>Click the following link to reset your password:
                <a href='{$reset_url}'>reset password</a></p>
                <p>This link expires in {$expiry_text}.</p>";

            $this->mail->Body = $this->wrap_html($message);
            $rv = $this->mail->send();
        } catch (Exception $e) {
            $this->logger->error('send_reset: ' . $e->getMessage());
            $rv = false;
        }
        return $rv;
    }    
    # --------------------------------------------------------------------------

    private function get_footer(): string {
        $footer = "<p>Best regards,<br><strong>Read Easy Connect System</strong></p>
            <p><i>Read Easy Harlow and Chelmsford (Registered charity no. 1204891) 
            is a legally independent local organisation, affiliated to Read Easy 
            UK (Registered charity no. 1151288). Read Easy takes the protection 
            of your data very seriously. Full details of how we hold and use 
            personal data are provided in Read Easy's Data Protection Notice on
             our <a href='https://readeasy.org.uk/privacy-policy/'>website</a>.</i></p>";

        return $footer;
    }
    # --------------------------------------------------------------------------

    private function wrap_html(string $body): string {
        $footer = $this->get_footer();
        $html = "
        <html>
            <head>
                <style>
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                    }
                </style>
            </head>
            <body>
                $body
                $footer
            </body>
        <html>";
        return $html;
    }
    # --------------------------------------------------------------------------
    # TODO: Dev function to handle @example.com emails which cause sending of 
    # emails to fail.
    private function update_domain(?string $email = null): string
    {
        if (str_ends_with($email, '@example.com')) {
            return 'info@bandolin.org.uk';
        }

        return $email;
    }
    # --------------------------------------------------------------------------
}
# ------------------------------------------------------------------------------

/*
End
*/