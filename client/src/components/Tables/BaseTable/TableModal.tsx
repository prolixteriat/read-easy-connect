import { X } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Button } from '@components/Common';
import { type TableFormProps } from './types';

// -----------------------------------------------------------------------------

export function TableModal<T>({
  isOpen,
  onClose,
  title,
  data,
  onSave,
  isSaving,
  children,
}: TableFormProps<T>): React.JSX.Element {
  return (
    <Dialog open={isOpen} onClose={() => {}} className='relative z-50'>
      <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <DialogPanel className='w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg'>
          <div className='flex justify-between items-start mb-4'>
            <div>
              <DialogTitle className='text-lg font-semibold'>{title}</DialogTitle>
              {data && 'id' in (data as Record<string, unknown>) && (
                <p className='text-sm text-blue-600 font-bold'>ID: {String((data as Record<string, unknown>).id)}</p>
              )}
            </div>
            <button onClick={onClose}>
              <X className='h-5 w-5 text-gray-500' />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
            className='space-y-3 max-h-96 overflow-y-auto pr-2'
          >
            {children}
            <div className='flex justify-end gap-2 mt-4'>
              <Button variant='secondary' type='button' onClick={onClose}>
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
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
