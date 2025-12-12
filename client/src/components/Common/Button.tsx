import clsx from 'clsx';

// -----------------------------------------------------------------------------

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export default function Button({ variant = 'primary', children, disabled, 
                  className, ...props }: ButtonProps): React.JSX.Element {
  return (
    <button 
      className={clsx(
        'font-bold py-2 px-4 rounded',
        {
          'bg-blue-600 hover:bg-blue-700 text-white border border-blue-700': variant === 'primary' && !disabled,
          'bg-blue-600 text-white opacity-50 cursor-not-allowed': variant === 'primary' && disabled,
          'bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium': variant === 'secondary'
        },
        className
      )} 
      disabled={disabled} 
      {...props}
    >
      {children}
    </button>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
