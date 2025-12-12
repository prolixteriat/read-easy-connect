import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';

import Button from './Button';

// -----------------------------------------------------------------------------

interface ErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export default function ErrorDialog({ isOpen, onClose, title, message }: ErrorDialogProps): React.JSX.Element {
  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50'>
      <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <DialogPanel className='w-full max-w-sm rounded-xl bg-white p-6 shadow-lg'>
          <div className='flex justify-between items-start mb-4'>
            <DialogTitle className='text-lg font-semibold text-red-600'>{title}</DialogTitle>
            <button onClick={onClose}>
              <X className='h-5 w-5 text-gray-500' />
            </button>
          </div>
          <p className='text-sm text-gray-600 mb-4'>{message}</p>
          <div className='flex justify-end'>
            <Button 
              variant='secondary'
              type='button'
              onClick={onClose}
            >
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
