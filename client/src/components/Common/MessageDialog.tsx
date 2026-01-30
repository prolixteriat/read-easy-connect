import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

import Button from './Button';

// -----------------------------------------------------------------------------

interface MessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export default function MessageDialog({ isOpen, onClose, title, message }: MessageDialogProps): React.JSX.Element {
  return (
    <Dialog open={isOpen} onClose={() => {}} className='relative z-50'>
      <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <DialogPanel className='w-full max-w-sm rounded-xl bg-white p-6 shadow-lg'>
          <DialogTitle className='text-lg font-semibold mb-2'>{title}</DialogTitle>
          <p className='text-sm text-gray-600 mb-4'>{message}</p>
          <div className='flex justify-end'>
            <Button type='button' onClick={onClose}>
              OK
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
