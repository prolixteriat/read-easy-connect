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

import { useReviewsCoordinator } from '@hooks/useReviews';
import { useVenues } from '@hooks/useOrg';
import { JwtManager } from '@lib/jwtManager';
import DateRangePicker from '@components/Common/DateRangePicker';
import { Loading } from '@components/Common';

// -----------------------------------------------------------------------------

type Review = {
  review_id: number;
  coordinator_id: number;
  coach_id: number;
  reader_id: number;
  date: string;
  venue_id: number;
  status: string;
  notes: string | null;
  created_at: string;
  reader_name: string;
  first_name: string;
  last_name: string;
};

// -----------------------------------------------------------------------------

export default function ReviewsReport(): React.JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
  const [showCopied, setShowCopied] = useState(false);

  const jwtManager = new JwtManager();
  const coordinatorId = jwtManager.getUserId();

  const { data, error, isLoading } = useReviewsCoordinator(
    coordinatorId,
    dateRange.start || undefined,
    dateRange.end || undefined
  );
  const { data: venuesData } = useVenues();

  const copyToClipboard = useCallback(async () => {
    if (!data || data.length === 0) return;
    
    const headers = ['Date', 'Reader', 'Coach', 'Venue', 'Status'];
    const rows = data.map(review => [
      new Date(review.date).toLocaleDateString('en-GB'),
      review.reader_name,
      `${review.first_name} ${review.last_name}`,
      venuesData?.find(v => v.venue_id === review.venue_id)?.name || 'Unknown',
      review.status
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
  }, [data, venuesData]);

  const handleDateChange = (start: string, end: string) => {
    setDateRange({start, end});
  };

  const columns: ColumnDef<Review>[] = [
    {
      accessorKey: 'date',
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
      cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString('en-GB'),
    },
    {
      accessorKey: 'reader_name',
      header: () => (
        <button className='flex items-center'>
          Reader <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
    },
    {
      accessorKey: 'first_name',
      header: () => (
        <button className='flex items-center'>
          Coach <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
      cell: ({ row }) => `${row.original.first_name} ${row.original.last_name}`,
    },
    {
      accessorKey: 'venue_id',
      header: () => (
        <button className='flex items-center'>
          Venue <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
      cell: ({ getValue }) => {
        const venueId = getValue() as number;
        return venuesData?.find(v => v.venue_id === venueId)?.name || 'Unknown';
      },
    },
    {
      accessorKey: 'status',
      header: () => (
        <button className='flex items-center'>
          Status <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          getValue() === 'completed' ? 'bg-green-100 text-green-800' :
          getValue() === 'scheduled' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {getValue() as string}
        </span>
      ),
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
  if (error) return <div className="text-red-600">Error loading reviews: {error.message}</div>;

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
          const review = row.original;
          return (
            <div key={row.id} className='bg-white border rounded-lg p-4 shadow-sm'>
              <div className='flex justify-between items-start mb-2'>
                <h3 className='font-semibold text-gray-900'>
                  Review #{review.review_id}
                </h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  review.status === 'completed' ? 'bg-green-100 text-green-800' :
                  review.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {review.status}
                </span>
              </div>
              <p className='text-sm text-gray-600 mb-1'>
                <strong>Date:</strong> {new Date(review.date).toLocaleDateString('en-GB')}
              </p>
              <p className='text-sm text-gray-600 mb-1'>
                <strong>Reader:</strong> {review.reader_name}
              </p>
              <p className='text-sm text-gray-600 mb-1'>
                <strong>Coach:</strong> {review.first_name} {review.last_name}
              </p>
              <p className='text-sm text-gray-600'>
                <strong>Venue:</strong> {venuesData?.find(v => v.venue_id === review.venue_id)?.name || 'Unknown'}
              </p>
            </div>
          );
        })}
      </div>

      {data && data.length === 0 && (
        <div className='text-center py-8 text-gray-500'>
          No reviews found for the selected date range.
        </div>
      )}
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
