import React from 'react';
import { type TReaderStatus } from '@lib/types';

// -----------------------------------------------------------------------------

interface ReadersStatusFilterProps {
  selectedStatuses: TReaderStatus[];
  onStatusChange: (statuses: TReaderStatus[]) => void;
}

const statusLabels: Record<TReaderStatus, string> = {
  'NYS': 'Not Yet Started',
  'S': 'Started',
  'P': 'Paused',
  'DO': 'Dropped Out',
  'G': 'Graduated',
  'C': 'Closed'
};

const allStatuses: TReaderStatus[] = ['NYS', 'S', 'P', 'DO', 'G', 'C'];

// -----------------------------------------------------------------------------

export default function ReadersStatusFilter({ selectedStatuses, onStatusChange }: ReadersStatusFilterProps): React.JSX.Element {
  const handleStatusToggle = (status: TReaderStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  };

  const handleSelectAll = () => {
    onStatusChange(allStatuses);
  };

  const handleClearAll = () => {
    onStatusChange([]);
  };

  return (
    <div className='mb-4 p-3 bg-gray-50 rounded-lg'>
      <div className='flex items-center justify-between mb-2'>
        <h4 className='text-sm font-medium text-gray-700'>Filter by Status:</h4>
        <div className='space-x-2'>
          <button
            onClick={handleSelectAll}
            className='text-xs text-blue-600 hover:text-blue-800'
          >
            Select All
          </button>
          <button
            onClick={handleClearAll}
            className='text-xs text-gray-600 hover:text-gray-800'
          >
            Clear All
          </button>
        </div>
      </div>
      <div className='flex flex-wrap gap-2'>
        {allStatuses.map(status => (
          <label key={status} className='flex items-center space-x-1 cursor-pointer'>
            <input
              type='checkbox'
              checked={selectedStatuses.includes(status)}
              onChange={() => handleStatusToggle(status)}
              className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
            />
            <span className='text-sm text-gray-700'>
              {status} - {statusLabels[status]}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
