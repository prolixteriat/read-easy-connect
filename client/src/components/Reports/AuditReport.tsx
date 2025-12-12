import { useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, Copy } from 'lucide-react';

import { useAuditLogs } from '@hooks/useReports';
import DateRangePicker from '@components/Common/DateRangePicker';
import { Loading } from '@components/Common';

// -----------------------------------------------------------------------------

type AuditLog = {
  audit_id: number;
  affiliate_id: number;
  performed_by_id: number;
  performed_on_id: number | null;
  type: string;
  description: string;
  created_at: string;
  performed_by_first_name: string;
  performed_by_last_name: string;
  performed_on_first_name: string | null;
  performed_on_last_name: string | null;
  affiliate_name: string;
};

// -----------------------------------------------------------------------------

export default function AuditReport(): React.JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
  const [showCopied, setShowCopied] = useState(false);

  const { data, error, isLoading } = useAuditLogs(undefined, dateRange.start, dateRange.end);

  const copyToClipboard = useCallback(async () => {
    if (!data || data.length === 0) return;
    
    const headers = ['Date', 'Type', 'Description', 'Performed By', 'Performed On'];
    const rows = data.map(log => [
      formatDate(log.created_at),
      log.type,
      log.description,
      `${log.performed_by_first_name} ${log.performed_by_last_name}`,
      log.performed_on_first_name && log.performed_on_last_name
        ? `${log.performed_on_first_name} ${log.performed_on_last_name}`
        : '-'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join('\t'))
      .join('\n');

    try {
      await navigator.clipboard.writeText(csvContent);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [data]);

  const handleDateChange = (start: string, end: string) => {
    setDateRange({start, end});
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'created_at',
      header: () => (
        <div className='flex items-center justify-between relative'>
          <button className='flex items-center'>
            Date <ArrowUpDown className='ml-1 h-4 w-4' />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard();
            }}
            className='p-1 hover:bg-gray-200 rounded transition-colors'
            title='Copy table to clipboard'
          >
            <Copy size={14} className='text-gray-600' />
          </button>
          {showCopied && (
            <div className='absolute right-0 top-10 bg-green-600 text-white px-2 py-1 rounded text-xs shadow-lg z-10 whitespace-nowrap'>
              Copied
            </div>
          )}
        </div>
      ),
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      accessorKey: 'type',
      header: () => (
        <button className='flex items-center'>
          Type <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
    },
    {
      accessorKey: 'description',
      header: () => (
        <button className='flex items-center'>
          Description <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
    },
    {
      id: 'performed_by',
      header: () => (
        <button className='flex items-center'>
          Performed By <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
      cell: ({ row }) => 
        `${row.original.performed_by_first_name} ${row.original.performed_by_last_name}`,
    },
    {
      id: 'performed_on',
      header: () => (
        <button className='flex items-center'>
          Performed On <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
      cell: ({ row }) => {
        const { performed_on_first_name, performed_on_last_name } = row.original;
        return performed_on_first_name && performed_on_last_name
          ? `${performed_on_first_name} ${performed_on_last_name}`
          : '-';
      },
    },
  ];

  const table = useReactTable({
    data: data || [],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isLoading) return <Loading />;
  if (error) return <div className='text-red-600'>Error loading audit logs: {error.message}</div>;

  return (
    <div className='w-full space-y-4 pt-6'>
      <DateRangePicker 
        startDate={dateRange.start}
        endDate={dateRange.end}
        onDateChange={handleDateChange} 
      />

      <div className='flex gap-2 mb-4'>
        <input
          type='text'
          placeholder='Filter...'
          className='flex-1 rounded-md border p-2 text-sm'
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

      {/* Desktop Table View */}
      <div className='hidden md:block overflow-x-auto rounded-lg border shadow-sm'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-100'>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className='cursor-pointer px-4 py-2 text-left text-sm font-medium text-gray-700'
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className='hover:bg-gray-50'>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className='px-4 py-2 text-sm text-gray-700'>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className='md:hidden space-y-3'>
        {table.getRowModel().rows.map((row) => {
          const log = row.original;
          return (
            <div
              key={row.id}
              className='bg-white border rounded-lg p-4 shadow-sm'
            >
              <div className='flex justify-between items-start mb-2'>
                <h3 className='font-semibold text-gray-900'>
                  {log.type}
                </h3>
                <span className='text-xs text-gray-500'>
                  {formatDate(log.created_at)}
                </span>
              </div>
              <p className='text-sm text-gray-600 mb-2'>{log.description}</p>
              <div className='text-xs text-gray-500'>
                <div>By: {log.performed_by_first_name} {log.performed_by_last_name}</div>
                {log.performed_on_first_name && log.performed_on_last_name && (
                  <div>On: {log.performed_on_first_name} {log.performed_on_last_name}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
