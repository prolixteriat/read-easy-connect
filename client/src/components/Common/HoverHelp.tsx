
import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

// -----------------------------------------------------------------------------

interface HoverHelpProps {
  text: string;
}

export default function HoverHelp({ text }: HoverHelpProps): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className='relative inline-block ml-1'>
      <HelpCircle
        size={16}
        className='text-gray-700 hover:text-gray-900 cursor-help'
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      />
      {isVisible && (
        <div className='absolute left-6 top-0 w-54 bg-gray-800 text-white text-sm rounded px-2 py-1 z-50'>
          {text}
        </div>
      )}
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
