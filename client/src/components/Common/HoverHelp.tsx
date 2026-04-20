import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

// -----------------------------------------------------------------------------

interface HoverHelpProps {
  text: string;
}

export default function HoverHelp({ text }: HoverHelpProps): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const tooltipWidth = 320; // w-80 = 320px
      const tooltipHeight = 60; // approximate height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let top = rect.bottom + 8;
      let left = rect.left + rect.width / 2;
      
      // Adjust horizontal position if tooltip would go off-screen
      if (left - tooltipWidth / 2 < 8) {
        // Too far left, align to left edge with padding
        left = tooltipWidth / 2 + 8;
      } else if (left + tooltipWidth / 2 > viewportWidth - 8) {
        // Too far right, align to right edge with padding
        left = viewportWidth - tooltipWidth / 2 - 8;
      }
      
      // Adjust vertical position if tooltip would go off-screen
      if (top + tooltipHeight > viewportHeight - 8) {
        // Show above the icon instead of below
        top = rect.top - tooltipHeight - 8;
      }
      
      setPosition({ top, left });
    }
  }, [isVisible]);

  return (
    <>
      <div 
        ref={iconRef}
        className='relative inline-block ml-1'
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <HelpCircle
          size={16}
          className='text-gray-700 hover:text-gray-900 cursor-help'
        />
      </div>
      {isVisible && (
        <div 
          className='fixed w-80 bg-gray-800 text-white text-sm rounded px-3 py-2 z-[9999] shadow-lg whitespace-normal transform -translate-x-1/2'
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`
          }}
        >
          {text}
        </div>
      )}
    </>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
