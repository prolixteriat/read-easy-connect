import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';

import { JwtManager } from '@lib/jwtManager';
import { asString} from '@lib/helper';
import { useUsers } from '@hooks/useUsers';
import { editProfile } from '@lib/api/apiUsers';
import { Button, ConfirmDialog, ErrorDialog, Loading } from '@components/Common';

// -----------------------------------------------------------------------------

interface EditProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditProfile({ isOpen, onClose }: EditProfileProps): React.JSX.Element {
  const jwtManager = new JwtManager();
  const currentUserId = jwtManager.getUserId();
  
  const { data: users, mutate } = useUsers();
  const currentUser = users?.find(user => user.user_id === currentUserId);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [originalFirstName, setOriginalFirstName] = useState('');
  const [originalLastName, setOriginalLastName] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');



  useEffect(() => {
    if (isOpen) {
      mutate?.();
    }
  }, [isOpen, mutate]);

  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.first_name);
      setLastName(currentUser.last_name);
      setOriginalFirstName(currentUser.first_name);
      setOriginalLastName(currentUser.last_name);
    }
  }, [currentUser]);

  const hasChanges = firstName !== originalFirstName || lastName !== originalLastName;

  const handleCancel = () => {
    if (hasChanges) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowConfirm(false);
    setFirstName(originalFirstName);
    setLastName(originalLastName);
    onClose();
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (!firstName.trim() || !lastName.trim()) return;
    
    setIsSaving(true);
    const result = await editProfile({
      first_name: firstName,
      last_name: lastName,
    });
    
    setIsSaving(false);
    if (result.success) {
      setOriginalFirstName(firstName);
      setOriginalLastName(lastName);
      mutate?.();
      onClose();
    } else {
      setErrorMessage(asString(result.message, 'An error occurred while saving'));
      setShowError(true);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onClose={() => {}} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <div>
                <DialogTitle className='text-lg font-semibold'>Edit Profile</DialogTitle>
                <p className='text-sm text-blue-600 font-bold'>ID: {currentUserId} • {currentUser?.email}</p>
              </div>
              <button onClick={onClose}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className='space-y-3'
            >
              <div>
                <label className='block text-sm font-medium text-gray-700'>Role</label>
                <input
                  className='w-full rounded-md border p-2 bg-gray-100'
                  value={currentUser?.role || ''}
                  disabled
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>First Name *</label>
                <input
                  className='w-full rounded-md border p-2'
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Last Name *</label>
                <input
                  className='w-full rounded-md border p-2'
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='secondary' type='button' onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type='submit' disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmCancel}
        title='Unsaved Changes'
        message='You have unsaved changes. Are you sure you want to cancel?'
      />

      <ErrorDialog
        isOpen={showError}
        onClose={() => setShowError(false)}
        title='Error'
        message={errorMessage}
      />

      {isSaving && <Loading />}
    </>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------