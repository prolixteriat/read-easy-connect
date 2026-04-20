import { useCallback, useState } from 'react';
import { type ColumnDef, type SortingState } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';

import { type TReadersSchema } from '@hooks/useReaders';
import { BaseTable, useTableState, createSortableHeader } from '../BaseTable';
import HoverHelp from '../../Common/HoverHelp';

// -----------------------------------------------------------------------------

type Reader = TReadersSchema[number];

// Custom centered header for ONS4 columns
const createCenteredSortableHeader = (title: string) => {
  return () => (
    <div className='flex items-center justify-center'>
      <button className='flex items-center'>
        {title} <ArrowUpDown className='ml-1 h-4 w-4' />
      </button>
    </div>
  );
};

// Custom header for Due column with help text
const createDueHeader = () => {
  return () => (
    <div className='flex items-center justify-center'>
      <button className='flex items-center'>
        Due <ArrowUpDown className='ml-1 h-4 w-4' />
      </button>
      <HoverHelp text="A value of 'yes' indicates that one or more ONS4 surveys are now due" />
    </div>
  );
};

// Custom header for ONS4-1 column with help text
const createOns4_1Header = () => {
  return () => (
    <div className='flex items-center justify-center'>
      <button className='flex items-center'>
        ONS4-1 <ArrowUpDown className='ml-1 h-4 w-4' />
      </button>
      <HoverHelp text="A value of 'yes' indicates that the ONS4 survey has been completed. A red-shaded value of 'no' indicated that the survey is now due whereas a yellow-shaded 'no' indicates that the survey is not yet due." />
    </div>
  );
};

const Ons4Cell = ({ value, shouldHighlight }: { value: number; shouldHighlight?: boolean }) => {
  const displayText = value ? 'yes' : 'no';
  
  if (!value) {
    // If value is false (0), apply conditional styling
    if (shouldHighlight) {
      // Red for S or P status
      return (
        <span className='bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs'>
          {displayText}
        </span>
      );
    } else {
      // Yellow for other statuses
      return (
        <span className='bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs'>
          {displayText}
        </span>
      );
    }
  }
  
  return <span>{displayText}</span>;
};

const Ons4_2Cell = ({ value, level, status }: { value: number; level: string; status: string }) => {
  const displayText = value ? 'yes' : 'no';
  
  if (!value) {
    // If value is false (0), apply conditional styling
    const shouldHighlightRed = ['TP3', 'TP4', 'TP5'].includes(level) && ['S', 'P'].includes(status);
    
    if (shouldHighlightRed) {
      // Red for TP3/TP4/TP5 with S or P status
      return (
        <span className='bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs'>
          {displayText}
        </span>
      );
    } else {
      // Yellow for all other cases where ons4_2 is false
      return (
        <span className='bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs'>
          {displayText}
        </span>
      );
    }
  }
  
  return <span>{displayText}</span>;
};

const Ons4_3Cell = ({ value, level, status }: { value: number; level: string; status: string }) => {
  const displayText = value ? 'yes' : 'no';
  
  if (!value) {
    // If value is false (0), apply conditional styling
    const shouldHighlightRed = level === 'TP5' && ['S', 'P'].includes(status);
    
    if (shouldHighlightRed) {
      // Red for TP5 with S or P status
      return (
        <span className='bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs'>
          {displayText}
        </span>
      );
    } else {
      // Yellow for all other cases where ons4_3 is false
      return (
        <span className='bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs'>
          {displayText}
        </span>
      );
    }
  }
  
  return <span>{displayText}</span>;
};

const DueCell = ({ reader }: { reader: Reader }) => {
  // Check if any ONS4 assessment is overdue (would be highlighted in red)
  const ons4_1_overdue = !reader.ons4_1 && ['S', 'P'].includes(reader.status);
  const ons4_2_overdue = !reader.ons4_2 && ['TP3', 'TP4', 'TP5'].includes(reader.level) && ['S', 'P'].includes(reader.status);
  const ons4_3_overdue = !reader.ons4_3 && reader.level === 'TP5' && ['S', 'P'].includes(reader.status);
  
  const isDue = ons4_1_overdue || ons4_2_overdue || ons4_3_overdue;
  const displayText = isDue ? 'yes' : 'no';
  
  return isDue ? (
    <span className='bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs'>
      {displayText}
    </span>
  ) : <span>{displayText}</span>;
};

const LevelCell = ({ level }: { level: string }) => {
  const levelMap = {
    'TP1': { bg: 'bg-red-100', text: 'text-red-800' },
    'TP2': { bg: 'bg-purple-100', text: 'text-purple-800' },
    'TP3': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'TP4': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'TP5': { bg: 'bg-green-100', text: 'text-green-800' }
  };
  
  const styles = levelMap[level as keyof typeof levelMap] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${styles.bg} ${styles.text}`}>
      {level}
    </span>
  );
};

const StatusCell = ({ status }: { status: string }) => {
  const statusMap = {
    'S': { bg: 'bg-green-100', text: 'text-green-800' },
    'P': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'NYS': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'DO': { bg: 'bg-red-100', text: 'text-red-800' },
    'G': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    'C': { bg: 'bg-gray-100', text: 'text-gray-800' }
  };
  
  const styles = statusMap[status as keyof typeof statusMap] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${styles.bg} ${styles.text}`}>
      {status}
    </span>
  );
};

// -----------------------------------------------------------------------------

interface OTableProps {
  data: Reader[];
  showFiltered: boolean;
  onShowFilteredChange: (show: boolean) => void;
}

export function OTable({ data, showFiltered, onShowFilteredChange }: OTableProps): React.JSX.Element {
  const tableState = useTableState({ id: 'name', desc: false });
  
  // Override the default sorting to have Due first (desc) then Name (asc)
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'due', desc: true },  // Due=yes first
    { id: 'name', desc: false } // Then sort by name ascending
  ]);

  const copyToClipboard = useCallback(async () => {
    if (!data || data.length === 0) return;
    
    const headers = ['Reader', 'Level', 'Status', 'ONS4-1', 'ONS4-2', 'ONS4-3', 'Due', 'Coach'];
    const rows = data.map(reader => {
      const ons4_1_overdue = !reader.ons4_1 && ['S', 'P'].includes(reader.status);
      const ons4_2_overdue = !reader.ons4_2 && ['TP3', 'TP4', 'TP5'].includes(reader.level) && ['S', 'P'].includes(reader.status);
      const ons4_3_overdue = !reader.ons4_3 && reader.level === 'TP5' && ['S', 'P'].includes(reader.status);
      const isDue = ons4_1_overdue || ons4_2_overdue || ons4_3_overdue;
      
      return [
        reader.name,
        reader.level,
        reader.status,
        reader.ons4_1 ? 'yes' : 'no',
        reader.ons4_2 ? 'yes' : 'no',
        reader.ons4_3 ? 'yes' : 'no',
        isDue ? 'yes' : 'no',
        `${reader.coach_first_name || ''} ${reader.coach_last_name || ''}`.trim()
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.join('\t'))
      .join('\n');

    try {
      await navigator.clipboard.writeText(csvContent);
      tableState.setShowCopied(true);
      setTimeout(() => tableState.setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [data, tableState]);

  const columns: ColumnDef<Reader>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: createSortableHeader('Reader', true, copyToClipboard, tableState.showCopied),
    },
    {
      id: 'level',
      accessorKey: 'level',
      header: createCenteredSortableHeader('Level'),
      cell: ({ row }) => (
        <div className='text-center'>
          <LevelCell level={row.original.level} />
        </div>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: createCenteredSortableHeader('Status'),
      cell: ({ row }) => (
        <div className='text-center'>
          <StatusCell status={row.original.status} />
        </div>
      ),
    },
    {
      id: 'ons4_1',
      accessorFn: (row) => row.ons4_1 ? 'yes' : 'no',
      header: createOns4_1Header(),
      cell: ({ row }) => (
        <div className='text-center'>
          <Ons4Cell 
            value={row.original.ons4_1} 
            shouldHighlight={['S', 'P'].includes(row.original.status)}
          />
        </div>
      ),
    },
    {
      id: 'ons4_2',
      accessorFn: (row) => row.ons4_2 ? 'yes' : 'no',
      header: createCenteredSortableHeader('ONS4-2'),
      cell: ({ row }) => (
        <div className='text-center'>
          <Ons4_2Cell 
            value={row.original.ons4_2} 
            level={row.original.level}
            status={row.original.status}
          />
        </div>
      ),
    },
    {
      id: 'ons4_3',
      accessorFn: (row) => row.ons4_3 ? 'yes' : 'no',
      header: createCenteredSortableHeader('ONS4-3'),
      cell: ({ row }) => (
        <div className='text-center'>
          <Ons4_3Cell 
            value={row.original.ons4_3} 
            level={row.original.level}
            status={row.original.status}
          />
        </div>
      ),
    },
    {
      id: 'due',
      accessorFn: (row) => {
        const ons4_1_overdue = !row.ons4_1 && ['S', 'P'].includes(row.status);
        const ons4_2_overdue = !row.ons4_2 && ['TP3', 'TP4', 'TP5'].includes(row.level) && ['S', 'P'].includes(row.status);
        const ons4_3_overdue = !row.ons4_3 && row.level === 'TP5' && ['S', 'P'].includes(row.status);
        return (ons4_1_overdue || ons4_2_overdue || ons4_3_overdue) ? 'yes' : 'no';
      },
      header: createDueHeader(),
      cell: ({ row }) => (
        <div className='text-center'>
          <DueCell reader={row.original} />
        </div>
      ),
    },
    {
      id: 'coach',
      accessorFn: (row) => `${row.coach_first_name || ''} ${row.coach_last_name || ''}`.trim(),
      header: createSortableHeader('Coach'),
      cell: ({ row }) => `${row.original.coach_first_name || ''} ${row.original.coach_last_name || ''}`.trim(),
    },
  ];

  const renderMobileCard = (reader: Reader) => (
    <div className='bg-white border rounded-lg p-4 shadow-sm'>
      <h3 className='font-semibold text-gray-900 mb-2'>{reader.name}</h3>
      <div className='space-y-1 text-sm'>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>Level:</span>
          <LevelCell level={reader.level} />
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>Status:</span>
          <StatusCell status={reader.status} />
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>ONS4-1:</span>
          <Ons4Cell 
            value={reader.ons4_1} 
            shouldHighlight={['S', 'P'].includes(reader.status)}
          />
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>ONS4-2:</span>
          <Ons4_2Cell 
            value={reader.ons4_2} 
            level={reader.level}
            status={reader.status}
          />
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>ONS4-3:</span>
          <Ons4_3Cell 
            value={reader.ons4_3} 
            level={reader.level}
            status={reader.status}
          />
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>Due:</span>
          <DueCell reader={reader} />
        </div>
        <div><span className='font-medium'>Coach:</span> {`${reader.coach_first_name || ''} ${reader.coach_last_name || ''}`.trim() || 'N/A'}</div>
      </div>
    </div>
  );

  return (
    <>
      <BaseTable
        data={data}
        columns={columns}
        onRowClick={() => {}}
        globalFilter={tableState.globalFilter}
        onGlobalFilterChange={tableState.setGlobalFilter}
        sorting={sorting}
        onSortingChange={setSorting}
        renderMobileCard={renderMobileCard}
      >
        <div className='flex-1 mb-4'>
          <div className='relative'>
            <input
              id='ons4-filter-input'
              name='filter'
              type='text'
              placeholder='Filter...'
              className='w-full rounded-md border p-2 text-sm pr-32'
              value={tableState.globalFilter ?? ''}
              onChange={(e) => tableState.setGlobalFilter(e.target.value)}
              autoComplete='off'
            />
            <label htmlFor='ons4-show-gdoc-checkbox' className='absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs'>
              <input
                id='ons4-show-gdoc-checkbox'
                name='showGDOC'
                type='checkbox'
                checked={showFiltered}
                onChange={(e) => onShowFilteredChange(e.target.checked)}
                className='rounded'
              />
              <span>Show G, DO and C</span>
            </label>
          </div>
        </div>
      </BaseTable>
    </>
  );
}

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------