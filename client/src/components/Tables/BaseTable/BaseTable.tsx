import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type OnChangeFn,
  type SortingState,
} from '@tanstack/react-table';
import { type BaseTableProps } from './types';

// -----------------------------------------------------------------------------

export function BaseTable<T>({
  data,
  columns,
  onRowClick,
  globalFilter,
  onGlobalFilterChange,
  sorting,
  onSortingChange,
  renderMobileCard,
  children,
}: BaseTableProps<T>): React.JSX.Element {
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: onSortingChange as OnChangeFn<SortingState>,
    onGlobalFilterChange: onGlobalFilterChange as OnChangeFn<string>,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className='w-full'>
      {children}

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
              <tr
                key={row.id}
                className='hover:bg-gray-50 cursor-pointer'
                onClick={() => onRowClick(row.original)}
              >
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
        {table.getRowModel().rows.map((row) => (
          <div key={row.id} onClick={() => onRowClick(row.original)}>
            {renderMobileCard(row.original)}
          </div>
        ))}
      </div>
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
