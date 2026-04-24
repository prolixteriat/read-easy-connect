import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, Copy, ChevronDown, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

import { type TReferralsSchema } from '@hooks/useReferrals';
import { referralfStatusLabels } from '@lib/types';

// -----------------------------------------------------------------------------

type EnquiryData = {
  org_name: string;
  area_name: string; // Changed from string | null to string
  referral_date: string; // Added date field
  status: string;
  count: number;
};

type EnquiryRowData = EnquiryData & {
  isSummary?: boolean;
  groupKey?: string;
};

interface EnquiryTableProps {
  data: TReferralsSchema | undefined;
  error: Error | undefined;
}

// -----------------------------------------------------------------------------

export default function EnquiryTable({ data, error }: EnquiryTableProps): React.JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'org_name', desc: false },
    { id: 'area_name', desc: false },
    { id: 'referral_date', desc: false },
    { id: 'status', desc: false }
  ]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const allGroupKeys = useMemo(() => {
    if (!data) return [];
    const groups = new Set<string>();
    data.forEach(referral => {
      const groupKey = `${referral.org_name}-${referral.area_name || ''}`;
      groups.add(groupKey);
    });
    return Array.from(groups);
  }, [data]);

  const allExpanded = allGroupKeys.length > 0 && allGroupKeys.every(key => expandedGroups.has(key));

  const toggleAllGroups = useCallback(() => {
    if (allExpanded) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(allGroupKeys));
    }
  }, [allExpanded, allGroupKeys]);

  const aggregatedData = useMemo(() => {
    if (!data) return [];

    const grouped = data.reduce((acc, referral) => {
      const referralDate = new Date(referral.referral_at).toLocaleDateString('en-GB'); // dd/mm/yyyy format
      const key = `${referral.org_name}-${referral.area_name || ''}-${referralDate}-${referral.status}`;
      if (!acc[key]) {
        acc[key] = {
          org_name: referral.org_name,
          area_name: referral.area_name || '', // Convert null to empty string
          referral_date: referralDate,
          status: referral.status,
          count: 0
        };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, EnquiryData>);

    const dataArray = Object.values(grouped);
    
    // Create summary rows for each org/area pair
    const summaryMap = new Map<string, number>();
    dataArray.forEach(item => {
      const summaryKey = `${item.org_name}-${item.area_name}`;
      summaryMap.set(summaryKey, (summaryMap.get(summaryKey) || 0) + item.count);
    });
    
    // Insert summary rows with expandable structure
    const result: EnquiryRowData[] = [];
    const orgAreaGroups = new Map<string, EnquiryRowData[]>();
    
    // Group by org/area
    dataArray.forEach(item => {
      const groupKey = `${item.org_name}-${item.area_name}`;
      if (!orgAreaGroups.has(groupKey)) {
        orgAreaGroups.set(groupKey, []);
      }
      orgAreaGroups.get(groupKey)!.push(item);
    });
    
    // Add items with summary rows
    Array.from(orgAreaGroups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([groupKey, items]) => {
        // Add summary row first
        const lastDashIndex = groupKey.lastIndexOf('-');
        const org_name = groupKey.substring(0, lastDashIndex);
        const area_name = groupKey.substring(lastDashIndex + 1);
        result.push({
          org_name,
          area_name: area_name || '',
          referral_date: '',
          status: 'TOTAL',
          count: summaryMap.get(groupKey) || 0,
          isSummary: true,
          groupKey
        });
        
        // Add detail rows only if expanded, sorted by date then status
        if (expandedGroups.has(groupKey)) {
          result.push(...items.sort((a, b) => {
            const dateCompare = a.referral_date.localeCompare(b.referral_date);
            return dateCompare !== 0 ? dateCompare : a.status.localeCompare(b.status);
          }));
        }
      });
    
    return result;
  }, [data, expandedGroups]);

  const copyToClipboard = useCallback(async () => {
    if (!aggregatedData || aggregatedData.length === 0) return;
    
    const headers = ['Organisation', 'Area', 'Date', 'Status', 'Count'];
    const rows = aggregatedData.map(item => [
      item.org_name,
      item.area_name || '',
      item.referral_date || '',
      item.isSummary ? 'TOTAL' : (referralfStatusLabels[item.status as keyof typeof referralfStatusLabels] || item.status),
      item.count.toString()
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
  }, [aggregatedData]);

  const columns: ColumnDef<EnquiryData>[] = [
    {
      accessorKey: 'org_name',
      header: () => (
        <div className='flex items-center justify-between relative'>
          <button className='flex items-center'>
            Organisation <ArrowUpDown className='ml-1 h-4 w-4' />
          </button>
          <div className='flex items-center gap-1'>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleAllGroups();
              }}
              className='p-1 hover:bg-gray-200 rounded transition-colors'
              title={allExpanded ? 'Collapse all detail rows' : 'Expand all detail rows'}
            >
              {allExpanded ? <Minimize2 size={14} className='text-gray-600' /> : <Maximize2 size={14} className='text-gray-600' />}
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
          </div>
          {showCopied && (
            <div className='absolute right-0 top-10 bg-green-600 text-white px-2 py-1 rounded text-xs shadow-lg z-10 whitespace-nowrap'>
              Copied
            </div>
          )}
        </div>
      ),
      cell: ({ getValue, row }) => {
        const data = row.original as EnquiryRowData;
        const isSummary = data.isSummary;
        
        if (isSummary) {
          const groupKey = data.groupKey!;
          const isExpanded = expandedGroups.has(groupKey);
          
          return (
            <div className='flex items-center gap-2'>
              <button
                onClick={() => {
                  const newExpanded = new Set(expandedGroups);
                  if (isExpanded) {
                    newExpanded.delete(groupKey);
                  } else {
                    newExpanded.add(groupKey);
                  }
                  setExpandedGroups(newExpanded);
                }}
                className='p-1 hover:bg-gray-200 rounded'
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <span>{getValue() as string}</span>
            </div>
          );
        }
        
        return <span className='ml-6'>{getValue() as string}</span>;
      },
    },
    {
      accessorKey: 'area_name',
      header: () => (
        <button className='flex items-center ml-6'>
          Area <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
      cell: ({ getValue, row }) => {
        const data = row.original as EnquiryRowData;
        const isSummary = data.isSummary;
        return isSummary ? <span className='ml-6 text-left'>{getValue() as string}</span> : <span className='ml-6 text-left'>{getValue() as string}</span>;
      },
    },
    {
      accessorKey: 'referral_date',
      header: () => (
        <button className='flex items-center ml-6'>
          Date <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
      cell: ({ getValue, row }) => {
        const data = row.original as EnquiryRowData;
        const isSummary = data.isSummary;
        const dateValue = getValue() as string;
        return isSummary ? <span className='ml-6 text-left'></span> : <span className='ml-6 text-left'>{dateValue}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: () => (
        <button className='flex items-center'>
          Status <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
      cell: ({ getValue, row }) => {
        const status = getValue() as string;
        const data = row.original as EnquiryRowData;
        const isSummary = data.isSummary;
        
        if (isSummary) {
          return (
            <span className='px-2 py-1 text-xs rounded-full bg-gray-800 text-white font-semibold'>
              TOTAL
            </span>
          );
        }
        
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${
            status === 'new' ? 'bg-green-100 text-green-800' :
            status === 'pending' ? 'bg-blue-100 text-blue-800' :
            status === 'onhold' ? 'bg-yellow-100 text-yellow-800' :
            status === 'closed-successful' ? 'bg-fuchsia-100 text-fuchsia-800' :
            status === 'closed-withdrew' ? 'bg-orange-100 text-orange-800' :
            status === 'closed-unable' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {referralfStatusLabels[status as keyof typeof referralfStatusLabels] || status}
          </span>
        );
      },
    },
    {
      accessorKey: 'count',
      header: () => (
        <button className='flex items-center justify-center w-full'>
          Count <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
      cell: ({ getValue }) => (
        <div className='text-center'>
          {getValue() as number}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: aggregatedData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (error) return <div className="text-red-600">Error loading enquiries: {error.message}</div>;

  return (
    <div className='w-full space-y-4'>
      <div className='flex gap-2 mb-4'>
        <input
          id='enquiries-filter'
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
            {table.getRowModel().rows.map((row) => {
              const data = row.original as EnquiryRowData;
              const isSummary = data.isSummary;
              return (
                <tr key={row.id} className={`hover:bg-gray-50 ${
                  isSummary ? 'bg-gray-50 font-semibold border-t-2 border-gray-300' : ''
                }`}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className='px-4 py-2 text-sm text-gray-700'>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className='md:hidden space-y-3'>
        {table.getRowModel().rows.filter((row) => (row.original as EnquiryRowData).isSummary).map((row) => {
          const enquiry = row.original as EnquiryRowData;
          const isSummary = enquiry.isSummary;
          
          return (
            <div key={row.id} className={`bg-white border rounded-lg p-4 shadow-sm ${
              isSummary ? 'bg-gray-50 border-gray-300 border-2' : ''
            }`}>
              <div className='flex justify-between items-start mb-2'>
                <h3 className={`font-semibold text-gray-900 ${
                  isSummary ? 'font-bold' : ''
                }`}>
                  {isSummary ? enquiry.org_name : ''}
                </h3>
                {isSummary ? (
                  <span className='px-2 py-1 text-xs rounded-full bg-gray-800 text-white font-semibold'>
                    TOTAL
                  </span>
                ) : (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    enquiry.status === 'new' ? 'bg-green-100 text-green-800' :
                    enquiry.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                    enquiry.status === 'onhold' ? 'bg-yellow-100 text-yellow-800' :
                    enquiry.status === 'closed-successful' ? 'bg-fuchsia-100 text-fuchsia-800' :
                    enquiry.status === 'closed-withdrew' ? 'bg-orange-100 text-orange-800' :
                    enquiry.status === 'closed-unable' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {referralfStatusLabels[enquiry.status as keyof typeof referralfStatusLabels] || enquiry.status}
                  </span>
                )}
              </div>
              {isSummary && (
                <>
                  <p className='text-sm text-gray-600 mb-1'>
                    <strong>Area:</strong> {enquiry.area_name || ''}
                  </p>
                </>
              )}
              {!isSummary && (
                <p className='text-sm text-gray-600 mb-1'>
                  <strong>Date:</strong> {enquiry.referral_date}
                </p>
              )}
              <p className={`text-sm text-gray-600 ${
                isSummary ? 'font-semibold' : ''
              }`}>
                <strong>Count:</strong> {enquiry.count}
              </p>
            </div>
          );
        })}
      </div>

      {aggregatedData.length === 0 && (
        <div className='text-center py-8 text-gray-500'>
          No enquiries found for the selected date range.
        </div>
      )}
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------