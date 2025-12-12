<?php declare(strict_types=1);

# ------------------------------------------------------------------------------

use Monolog\Logger;
use Monolog\Level;
use Monolog\Handler\RotatingFileHandler;
use Monolog\Formatter\LineFormatter;
use Monolog\Processor\WebProcessor;
use Slim\Handlers\ErrorHandler;

# ------------------------------------------------------------------------------

class CustomErrorHandler extends ErrorHandler {
    protected function logError(string $error): void {
        $logger = get_logger('CustomErrorHandler');
        $uri = $this->request->getUri();
        $method = $this->request->getMethod();
        $logger->error('[requestedUri: ' . (string) $uri . 
                        '] [method: ' . (string) $method . ']');
    }
}

# ------------------------------------------------------------------------------

class Status {
    # Properties
    public bool $success;
    public int $code;
    public string $message;
    public array|int|string|null $data;

    # --------------------------------------------------------------------------
    # Methods
    # --------------------------------------------------------------------------
    # Constructor

    function __construct(bool $success, int $code, string|array $message) {
        $this->success = $success;
        $this->code = $code;
        $this->message = json_encode($message);
        $this->data = null;
    }
    # --------------------------------------------------------------------------
}

# ------------------------------------------------------------------------------

enum AuditType: string {
    case LOGIN         = 'login';
    case LOGOUT        = 'logout';
    case USER_ADDED    = 'user_added';
    case USER_EDITED   = 'user_edited';
    case COACH_ADDED   = 'coach_added';
    case COACH_EDITED  = 'coach_edited';
    case READER_ADDED  = 'reader_added';
    case READER_EDITED = 'reader_edited';
    case LESSON_ADDED  = 'lesson_added';
    case LESSON_EDITED = 'lesson_edited';
    case REVIEW_ADDED  = 'review_added';
    case REVIEW_EDITED = 'review_edited';
    case STATUS_CHANGE = 'status_change';
    case PASSWORD_RESET= 'password_reset';
    case OTHER         = 'other';
}

enum StatusType: string {
    case ACTIVE        = 'active';
    case ONHOLD        = 'onhold';
    case LEAVER        = 'leaver';
}

enum ReaderStatusType: string {
    case NYS           = 'NYS';    # Not Yet Started
    case S             = 'S';      # Started
    case P             = 'P';      # Progressing
    case DO            = 'DO';     # Dropped Out
    case G             = 'G';      # Graduated
    case C             = 'C';      # Completed
}

enum LessonStatusType: string {
    case SCHEDULED     = 'scheduled';
    case ATTENDED      = 'attended';
    case CANCELLED     = 'cancelled';
    case PAUSED        = 'paused';
}

enum CoachStatusType: string {
    case UNTRAINED     = 'untrained';
    case TRAINED       = 'trained';
    case PAIRED        = 'paired';
}
# ------------------------------------------------------------------------------
# Cast a value to int or return null if the value is not set.

function cast_int(int|string|null $value): int|null {
    return isset($value) ? (int)$value : null;
}
# ------------------------------------------------------------------------------
# Create and return a logger object.

function get_logger(string $channel, Level $level=Level::Info, 
                    string $filename=LOGPATH): Logger {

    # $output = "[%datetime%]-[%channel%]-[%level_name%] > %message% | %context% %extra%\n";
    $output = "[%datetime%]-[%channel%]-[%level_name%] > %message% | %extra%\n";
    $dateFormat = 'd-M-Y H:i:s';
    $formatter = new LineFormatter($output, $dateFormat);

    $stream = new RotatingFileHandler($filename, 90, $level);
    $stream->setFormatter($formatter);

    $proc_fields = ['url', 'ip'];
    $processor = new WebProcessor(extraFields: $proc_fields);

    $logger = new Logger($channel);
    $logger->pushHandler($stream);
    $logger->pushProcessor($processor);

    return $logger;
}
# ------------------------------------------------------------------------------

function get_password_reset_form(string $token): string {
    $url = API_URL . '/users/submit-reset';
    $icon_url = API_URL;
    $mfa_url = API_URL . '/users/complete-mfa-setup';
    $title = 'Password Reset';
    $html = <<<EOD
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="icon" type="image/x-icon" href="{$icon_url}/favicon.ico">
        <title>$title</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    </head>
    <body class="d-flex align-items-center justify-content-center min-vh-100" style="background-color: #6c757d;">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                    <div class="card shadow">
                        <div class="card-header">
                            <h5 class="card-title mb-0">$title</h5>
                        </div>
                        <div class="card-body">
                            <!-- Password Reset Form -->
                            <div id="passwordResetSection">
                                <form id="passwordResetForm" method="post">
                                    <div class="mb-3">
                                        <label for="passwordInput" class="form-label fw-bold">Enter new password</label>
                                        <div class="position-relative">
                                            <input type="password" class="form-control js-password" id="passwordInput" name="password" placeholder="Enter password..." autocomplete="off" style="padding-right: 40px;">
                                            <button class="btn js-password-toggle position-absolute" type="button" style="right: 10px; top: 50%; transform: translateY(-50%); border: none; background: transparent; z-index: 10;"><i class="bi bi-eye"></i></button>
                                        </div>
                                    </div>
                                    <div id="passwordStrength" class="alert alert-danger d-none">
                                        Password must be at least 12 characters long and contain at least 1 uppercase letter, 1 lowercase letter and 1 number.
                                    </div>
                                    <div id="apiResponse" class="alert d-none"></div>
                                    <div class="d-grid">
                                        <button type="submit" class="btn btn-primary">Submit</button>
                                    </div>
                                    <input type="hidden" id="token" name="token" value="$token">
                                </form>
                            </div>

                            <!-- MFA Setup Section -->
                            <div id="mfaSetupSection" class="d-none">
                                <div class="alert alert-info">
                                    <strong>MFA Setup Required:</strong> Please scan the QR code with your authenticator app and enter the verification code.
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="text-center mb-3">
                                            <h6>Scan QR Code</h6>
                                            <img id="qrCode" src="" alt="QR Code" class="img-fluid border">
                                            <div class="mt-2">
                                                <small class="text-muted">Manual Entry Key:</small><br>
                                                <code id="mfaTokenDisplay" class="small"></code>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <form id="mfaForm">
                                            <div class="mb-3">
                                                <label for="mfaCode" class="form-label">Verification Code</label>
                                                <input type="text" class="form-control" id="mfaCode" placeholder="Enter 6-digit code" required>
                                            </div>
                                            <input type="hidden" id="mfaSecret">
                                            <input type="hidden" id="mfaEmail">
                                            <input type="hidden" id="mfaToken">
                                            <input type="hidden" id="mfaPassword">
                                            <div class="d-grid">
                                                <button type="submit" class="btn btn-success">Complete MFA Setup</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                                <div id="mfaResponse" class="alert d-none mt-3"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        <script>	
        document.addEventListener('DOMContentLoaded', function () {
            const passwordToggle = document.querySelector('.js-password-toggle');
            const passwordInput = document.getElementById('passwordInput');
            const passwordStrength = document.getElementById('passwordStrength');
            const passwordResetForm = document.getElementById('passwordResetForm');
            const mfaForm = document.getElementById('mfaForm');
            const apiResponse = document.getElementById('apiResponse');

            passwordToggle.addEventListener('click', function() {
                const password = document.querySelector('.js-password');
                const icon = passwordToggle.querySelector('i');

                if (password.type === 'password') {
                    password.type = 'text';
                    icon.className = 'bi bi-eye-slash';
                } else {
                    password.type = 'password';
                    icon.className = 'bi bi-eye';
                }
                password.focus();
            });

            passwordResetForm.addEventListener('submit', async function (e) {
                e.preventDefault();

                const lengthRegex = /.{12,}/;
                const upperCaseRegex = /[A-Z]/;
                const lowerCaseRegex = /[a-z]/;
                const numberRegex = /[0-9]/;			

                const password = passwordInput.value;
                const token = document.getElementById('token').value;

                const isValid = lengthRegex.test(password) && upperCaseRegex.test(password) && lowerCaseRegex.test(password) && numberRegex.test(password);
                if (!isValid) {
                    passwordStrength.classList.remove('d-none');
                    return;
                } else {
                    passwordStrength.classList.add('d-none');
                }

                try {
                    const response = await fetch("$url", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token, password })
                    });

                    if (response.status === 202) {
                        // MFA setup required
                        const mfaData = await response.json();
                        
                        // Show MFA setup form
                        document.getElementById('passwordResetSection').classList.add('d-none');
                        document.getElementById('mfaSetupSection').classList.remove('d-none');
                        
                        // Display QR code and token
                        document.getElementById('qrCode').src = `data:image/png;base64,\${mfaData.qr_code}`;
                        // Format secret for manual entry with spaces every 4 characters for readability
                        const formattedSecret = mfaData.secret.replace(/(.{4})/g, '$1 ').trim();
                        document.getElementById('mfaTokenDisplay').textContent = formattedSecret;
                        
                        // Store MFA data for completion
                        document.getElementById('mfaSecret').value = mfaData.secret;
                        document.getElementById('mfaEmail').value = mfaData.email;
                        document.getElementById('mfaToken').value = token;
                        document.getElementById('mfaPassword').value = password;
                    } else {
                        const result = await response.json();
                        apiResponse.classList.remove("d-none", "alert-danger");
                        apiResponse.classList.add("alert-success");
                        apiResponse.innerHTML = result.message || "Password reset successful.";
                        document.querySelector('.mb-3').classList.add('d-none');
                        document.querySelector('.d-grid').classList.add('d-none');
                    }
                } catch (error) {
                    apiResponse.classList.remove("d-none", "alert-success");
                    apiResponse.classList.add("alert-danger");
                    apiResponse.innerHTML = "An error occurred. Please try again.";
                }
            });

            // Handle MFA form submission
            mfaForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                
                const code = document.getElementById('mfaCode').value;
                const secret = document.getElementById('mfaSecret').value;
                const email = document.getElementById('mfaEmail').value;
                const token = document.getElementById('mfaToken').value;
                const password = document.getElementById('mfaPassword').value;
                const mfaResponse = document.getElementById('mfaResponse');
                
                try {
                    const response = await fetch("$mfa_url", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, secret, code, password, token })
                    });
                    
                    const result = await response.json();
                    
                    if (response.status === 200) {
                        // Hide MFA setup content and show success message
                        document.querySelector('#mfaSetupSection .alert-info').style.display = 'none';
                        document.querySelector('#mfaSetupSection .row').style.display = 'none';
                        mfaResponse.classList.remove("d-none", "alert-danger");
                        mfaResponse.classList.add("alert-success");
                        mfaResponse.innerHTML = result.message;
                    } else {
                        mfaResponse.classList.remove("d-none", "alert-success");
                        mfaResponse.classList.add("alert-danger");
                        let errorMsg = 'MFA verification failed.';
                        if (response.status === 400) {
                            errorMsg = result.message || 'Invalid MFA code. Please check the code and try again.';
                        } else if (response.status === 401) {
                            errorMsg = 'Reset token has expired or is invalid. Please request a new password reset.';
                        } else if (response.status === 429) {
                            errorMsg = result.message || 'Too many attempts. Please wait before trying again.';
                        } else if (response.status === 500) {
                            errorMsg = 'Server error occurred. Please try again later.';
                        } else {
                            errorMsg = result.message || errorMsg;
                        }
                        mfaResponse.innerHTML = errorMsg;
                    }
                } catch (error) {
                    mfaResponse.classList.remove("d-none", "alert-success");
                    mfaResponse.classList.add("alert-danger");
                    mfaResponse.innerHTML = "Network error occurred. Please check your connection and try again.";
                }
            });
        });
        </script>			
        </body>
    </html>
    EOD;
  
    return $html;
}
# ------------------------------------------------------------------------------
# Requirments: 12 or more characters, 1 uppercase letter, 1 lowercase letter,
# 1 number

function is_valid_password($password) {
    if (strlen($password) < 12) {
        return false;
    }
    if (!preg_match('/[A-Z]/', $password)) {
        return false;
    }
    if (!preg_match('/[a-z]/', $password)) {
        return false;
    }
    if (!preg_match('/\d/', $password)) {
        return false;
    }

    return true;
}
# ------------------------------------------------------------------------------

/*
End
*/
