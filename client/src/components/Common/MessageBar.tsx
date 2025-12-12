
// -----------------------------------------------------------------------------

interface IMessageBarProps {
    title?: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    onClose: () => void;
  }
  
  export function MessageBar(props: IMessageBarProps): React.JSX.Element {
    const { title, message, type, onClose } = props;
    
    const typeClass = {
      info: 'bg-blue-100 text-blue-700 border-blue-500',
      success: 'bg-green-100 text-green-700 border-green-500',
      warning: 'bg-yellow-100 text-yellow-700 border-yellow-500',
      error: 'bg-red-100 text-red-700 border-red-500',
    };

    return (
      <div className={`border-l-4 p-4 mb-4 ${typeClass[type ?? 'info']} rounded-lg`} role='alert' id='message_bar'>
        <div className='flex justify-between items-center'>
          <div>
            {title && <h2 className='font-bold text-lg'>{title}</h2>}
            <p>{message}</p>
          </div>
          <button className='btn btn-sm btn-circle btn-ghost font-bold' name='btn_close'
            onClick={onClose}>
            ✕
          </button>
        </div>
      </div>
    );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
