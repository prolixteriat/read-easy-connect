import { useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';

import { type TCoachesSchema } from '@hooks/useCoaches';
import { type TTrainingStatus } from '@lib/types';
import { BaseTable, useTableState, createSortableHeader } from '../BaseTable';

// -----------------------------------------------------------------------------

type Coach = TCoachesSchema[number];

const formatTrainingStatus = (status: TTrainingStatus): string => {
  return status === 'not_booked' ? 'not booked' : status;
};

const TrainingStatusCell = ({ status }: { status: TTrainingStatus }) => {
  const displayText = formatTrainingStatus(status);
  const className = status === 'not_booked' 
    ? 'bg-red-100 text-red-800' 
    : status === 'booked' 
    ? 'bg-yellow-100 text-yellow-800' 
    : '';
  
  return className ? (
    <span className={`px-2 py-1 rounded-full text-xs ${className}`}>
      {displayText}
    </span>
  ) : <span>{displayText}</span>;
};

const YesNoCell = ({ completed }: { completed: number }) => {
  const displayText = completed ? 'yes' : 'no';
  return completed ? (
    <span>{displayText}</span>
  ) : (
    <span className='px-2 py-1 rounded-full text-xs bg-red-100 text-red-800'>
      {displayText}
    </span>
  );
};

// -----------------------------------------------------------------------------

interface TTableProps {
  data: Coach[];
}

export function TTable({ data }: TTableProps): React.JSX.Element {
  const tableState = useTableState({ id: 'first_name', desc: false });

  const copyToClipboard = useCallback(async () => {
    if (!data || data.length === 0) return;
    
    const headers = ['Name', 'Coach Training', 'EDIB Training', 'Consolidation Training', 'References', 'DBS', 'Coordinator'];
    const rows = data.map(coach => [
      `${coach.first_name} ${coach.last_name}`,
      formatTrainingStatus(coach.training),
      formatTrainingStatus(coach.edib_training),
      formatTrainingStatus(coach.consol_training),
      coach.ref_completed ? 'yes' : 'no',
      coach.dbs_completed ? 'yes' : 'no',
      coach.coordinator_first_name && coach.coordinator_last_name 
        ? `${coach.coordinator_first_name} ${coach.coordinator_last_name}` 
        : ''
    ]);

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

  const columns: ColumnDef<Coach>[] = [
    {
      id: 'name',
      accessorFn: (row) => `${row.first_name} ${row.last_name}`,
      header: createSortableHeader('Name', true, copyToClipboard, tableState.showCopied),
    },
    {
      id: 'training',
      accessorFn: (row) => formatTrainingStatus(row.training),
      header: createSortableHeader('Coach Training'),
      cell: ({ row }) => <TrainingStatusCell status={row.original.training} />,
    },
    {
      id: 'edib_training',
      accessorFn: (row) => formatTrainingStatus(row.edib_training),
      header: createSortableHeader('EDIB Training'),
      cell: ({ row }) => <TrainingStatusCell status={row.original.edib_training} />,
    },
    {
      id: 'consol_training',
      accessorFn: (row) => formatTrainingStatus(row.consol_training),
      header: createSortableHeader('Consolidation Training'),
      cell: ({ row }) => <TrainingStatusCell status={row.original.consol_training} />,
    },
    {
      id: 'ref_completed',
      accessorFn: (row) => row.ref_completed ? 'yes' : 'no',
      header: createSortableHeader('References'),
      cell: ({ row }) => <YesNoCell completed={row.original.ref_completed} />,
    },
    {
      id: 'dbs_completed',
      accessorFn: (row) => row.dbs_completed ? 'yes' : 'no',
      header: createSortableHeader('DBS'),
      cell: ({ row }) => <YesNoCell completed={row.original.dbs_completed} />,
    },
    {
      id: 'coordinator',
      accessorFn: (row) => 
        row.coordinator_first_name && row.coordinator_last_name 
          ? `${row.coordinator_first_name} ${row.coordinator_last_name}` 
          : '',
      header: createSortableHeader('Coordinator'),
    },
  ];

  const renderMobileCard = (coach: Coach) => (
    <div className='bg-white border rounded-lg p-4 shadow-sm'>
      <h3 className='font-semibold text-gray-900 mb-2'>{coach.first_name} {coach.last_name}</h3>
      <div className='space-y-1 text-sm'>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>Coach Training:</span>
          <TrainingStatusCell status={coach.training} />
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>EDIB Training:</span>
          <TrainingStatusCell status={coach.edib_training} />
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>Consolidation Training:</span>
          <TrainingStatusCell status={coach.consol_training} />
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>References:</span>
          <YesNoCell completed={coach.ref_completed} />
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>DBS:</span>
          <YesNoCell completed={coach.dbs_completed} />
        </div>
        {coach.coordinator_first_name && coach.coordinator_last_name && (
          <div><span className='font-medium'>Coordinator:</span> {coach.coordinator_first_name} {coach.coordinator_last_name}</div>
        )}
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
        sorting={tableState.sorting}
        onSortingChange={tableState.setSorting}
        renderMobileCard={renderMobileCard}
      >
        <div className='flex-1 mb-4'>
          <input
            type='text'
            placeholder='Filter...'
            className='w-full rounded-md border p-2 text-sm'
            value={tableState.globalFilter ?? ''}
            onChange={(e) => tableState.setGlobalFilter(e.target.value)}
          />
        </div>
      </BaseTable>
    </>
  );
}

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
