
import { Loader2 } from 'lucide-react';

// -----------------------------------------------------------------------------

interface LoadProps {
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' |
            'top-right' | 'bottom-left' | 'bottom-right';
}

export default function Loading({ position = 'center' }: LoadProps): React.JSX.Element {
  const positionClasses = {
    center: 'fixed inset-0 flex items-center justify-center',
    top: 'fixed top-4 left-1/2 transform -translate-x-1/2',
    bottom: 'fixed bottom-4 left-1/2 transform -translate-x-1/2',
    left: 'fixed left-4 top-1/2 transform -translate-y-1/2',
    right: 'fixed right-4 top-1/2 transform -translate-y-1/2',
    'top-left': 'fixed top-4 left-4',
    'top-right': 'fixed top-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4',
    'bottom-right': 'fixed bottom-4 right-4',
  };

  return (
    <div className={`${positionClasses[position]} z-50`}>
      <Loader2 className='w-16 h-16 text-blue-600 animate-spin' />
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
