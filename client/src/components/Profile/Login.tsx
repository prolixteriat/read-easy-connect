import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Eye, EyeOff } from 'lucide-react';

import { Button, ErrorDialog, Loading } from '@components/Common';
import { hasStringKey } from '@lib/helper';
import { login, createResetToken } from '@lib/api/apiUsers';
import { JwtManager } from '@lib/jwtManager';
import { useAuth } from '../../context/useAuth';

// -----------------------------------------------------------------------------

interface LoginProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Login({ isOpen, onClose }: LoginProps): React.JSX.Element {
  const { setRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMfaCode = (code: string): boolean => {
    return /^\d{6}$/.test(code);
  };



  const handleLogin = async (e: React.FormEvent, mfa_code?: string) => {
    e.preventDefault();
    if (!validateEmail(email) || !password.trim()) return;
    
    setIsLoggingIn(true);
    const response = await login({ email, password, mfa_code });
    setIsLoggingIn(false);
    
    if (response.success && hasStringKey(response.message, 'token')) {
      const jwtManager = new JwtManager();
      jwtManager.writeToken(response.message.token);
      setRole(jwtManager.getRole());
      onClose();
    } else if (response.success && hasStringKey(response.message, 'message') &&
               response.message.message === 'mfa_required') {
      setShowMfa(true);
    } else {
      setErrorMessage(response.message as string ?? 'An error occurred');
      setShowError(true);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim()) return;
    
    const code = mfaCode;
    setMfaCode('');
    setShowMfa(false);
    await handleLogin(e, code);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(resetEmail)) return;
    
    setIsResetting(true);
    const response = await createResetToken({ email: resetEmail });
    setIsResetting(false);
    
    if (response.success) {
      setShowForgotPassword(false);
      setResetEmail('');
      setShowSuccess(true);
    } else {
      setErrorMessage(hasStringKey(response.message, 'message') ? response.message.message : 'An error occurred');
      setShowError(true);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
    }
  }, [isOpen]);

  const handleClose = () => {
    setShowPassword(false);
    onClose();
  };

  const handleForgotPasswordClose = () => {
    setShowForgotPassword(false);
    setResetEmail('');
  };

  return (
    <>
      <Dialog open={isOpen} onClose={handleClose} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <DialogTitle className='text-lg font-semibold'>Login</DialogTitle>
              <button onClick={handleClose}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>

            <form onSubmit={handleLogin} className='space-y-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Email *</label>
                <input
                  type='email'
                  className='w-full rounded-md border p-2'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='Enter email address...'
                  required
                />
                {email && !validateEmail(email) && (
                  <p className='text-sm text-red-600 mt-1'>Please enter a valid email address</p>
                )}
              </div>
              
              <div>
                <label className='block text-sm font-medium text-gray-700'>Password *</label>
                <div className='relative'>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className='w-full rounded-md border p-2 pr-10'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder='Enter password...'
                    required
                  />
                  <button
                    type='button'
                    className='absolute right-2 top-2'
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className='h-5 w-5 text-gray-500' />
                    ) : (
                      <Eye className='h-5 w-5 text-gray-500' />
                    )}
                  </button>
                </div>

              </div>

              <div className='text-left'>
                <button
                  type='button'
                  className='text-sm text-blue-600 hover:underline'
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgotten password?
                </button>
              </div>

              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='secondary' type='button' onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  type='submit' 
                  disabled={isLoggingIn || !validateEmail(email) || !password.trim()}
                >
                  {isLoggingIn ? 'Logging in...' : 'Login'}
                </Button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog open={showMfa} onClose={() => setShowMfa(false)} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <DialogTitle className='text-lg font-semibold'>MFA Required</DialogTitle>
              <button onClick={() => setShowMfa(false)}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>

            <p className='text-sm text-gray-600 mb-4'>
              Enter the code from your authenticator app.
            </p>

            <form onSubmit={handleMfaSubmit} className='space-y-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700'>MFA Code *</label>
                <input
                  type='text'
                  className='w-full rounded-md border p-2'
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder='Enter MFA code...'
                  required
                />
                {mfaCode && !validateMfaCode(mfaCode) && (
                  <p className='text-sm text-red-600 mt-1'>Please enter a 6-digit code</p>
                )}
              </div>

              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='secondary' type='button' onClick={() => setShowMfa(false)}>
                  Cancel
                </Button>
                <Button 
                  type='submit' 
                  disabled={!validateMfaCode(mfaCode)}
                >
                  Submit
                </Button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog open={showForgotPassword} onClose={handleForgotPasswordClose} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <DialogTitle className='text-lg font-semibold'>Forgotten Password</DialogTitle>
              <button onClick={handleForgotPasswordClose}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>

            <p className='text-sm text-gray-600 mb-4'>
              Enter your email address below. If the email address is recognised, 
              you will receive an email with a link to reset your password.
            </p>

            <form onSubmit={handleForgotPassword} className='space-y-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Email *</label>
                <input
                  type='email'
                  className='w-full rounded-md border p-2'
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder='Enter email address...'
                  required
                />
                {resetEmail && !validateEmail(resetEmail) && (
                  <p className='text-sm text-red-600 mt-1'>Please enter a valid email address</p>
                )}
              </div>

              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='secondary' type='button' onClick={handleForgotPasswordClose}>
                  Cancel
                </Button>
                <Button 
                  type='submit' 
                  disabled={isResetting || !validateEmail(resetEmail)}
                >
                  {isResetting ? 'Resetting...' : 'Reset'}
                </Button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <ErrorDialog
        isOpen={showError}
        onClose={() => {
          setShowError(false);
          onClose();
        }}
        title='Error'
        message={errorMessage || 'Received an invalid response from the server. Please try again.'}
      />
      
      <ErrorDialog
        isOpen={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          onClose();
        }}
        title='Success'
        message='Check your email for a link to reset your password'
      />
      
      {(isLoggingIn || isResetting) && <Loading />}
    </>
  );
}

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------