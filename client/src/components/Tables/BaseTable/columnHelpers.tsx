import { ArrowUpDown, Copy } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';

// -----------------------------------------------------------------------------

export function createSortableHeader(title: string, showCopy = false, onCopy?: () => void, showCopied = false) {
  return () => (
    <div className='flex items-center justify-between relative'>
      <button className='flex items-center'>
        {title} <ArrowUpDown className='ml-1 h-4 w-4' />
      </button>
      {showCopy && onCopy && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          className='p-1 hover:bg-gray-200 rounded transition-colors'
          title='Copy table to clipboard'
        >
          <Copy size={14} className='text-gray-600' />
        </button>
      )}
      {showCopied && (
        <div className='absolute right-0 top-10 bg-green-600 text-white px-2 py-1 rounded text-xs shadow-lg z-10 whitespace-nowrap'>
          Copied
        </div>
      )}
    </div>
  );
}
// -----------------------------------------------------------------------------

export function createStatusColumn<T>(
  accessor: keyof T,
  statusMap: Record<string, { bg: string; text: string }>
): ColumnDef<T> {
  return {
    accessorKey: accessor as string,
    header: createSortableHeader('Status'),
    cell: ({ getValue }) => {
      const status = getValue() as string;
      const styles = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
      return (
        <span className={`px-2 py-1 text-xs rounded-full ${styles.bg} ${styles.text}`}>
          {status}
        </span>
      );
    },
  };
}
// -----------------------------------------------------------------------------

export function createDisabledColumn<T>(accessor: keyof T): ColumnDef<T> {
  return {
    accessorKey: accessor as string,
    header: createSortableHeader('Disabled'),
    cell: ({ getValue }) => {
      const isDisabled = getValue();
      const text = isDisabled ? 'yes' : 'no';
      return (
        <span className={`px-2 py-1 text-xs rounded-full ${
          isDisabled ? 'bg-red-100 text-red-800' : ''
        }`}>
          {text}
        </span>
      );
    },
  };
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
