import { useCoachesSummary } from '@hooks/useReports';
import { Loading } from '@components/Common';
import { useCallback, useState } from 'react';
import { Copy } from 'lucide-react';

// -----------------------------------------------------------------------------

type CoachesSummary = {
  user_id?: number;
  coordinator_name: string;
  paired: string | number;
  waiting_pairing: string | number;
  waiting_training: string | number;
  waiting_checks: string | number;
  on_break: string | number;
  total: number;
};

// -----------------------------------------------------------------------------

export default function CoachesSummaryTable(): React.JSX.Element {
  const { data, isLoading, error } = useCoachesSummary();
  const [showCopied, setShowCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    if (!data) return;
    
    const coordinatorData = data.filter(coord => coord.coordinator_name !== 'TOTAL_COLUMNS' && coord.coordinator_name !== 'TOTAL_ROWS');
    const totalColumnsData = data.find(coord => coord.coordinator_name === 'TOTAL_COLUMNS');
    const totalRowsData = data.find(coord => coord.coordinator_name === 'TOTAL_ROWS');
    
    const metrics = [
      { key: 'paired', label: 'Coaches paired' },
      { key: 'waiting_pairing', label: 'Coaches waiting to be paired' },
      { key: 'waiting_training', label: 'Coaches waiting to be trained' },
      { key: 'waiting_checks', label: 'Coaches waiting checks' },
      { key: 'on_break', label: 'Coaches on a break' },
    ];

    const headers = [''].concat(coordinatorData.map(coord => coord.coordinator_name));
    const rows = metrics.map(metric => {
      const row = [metric.label];
      coordinatorData.forEach(coord => {
        const value = coord[metric.key as keyof CoachesSummary];
        row.push(value === 0 || value === '0' ? '' : String(value));
      });
      return row;
    });
    
    if (totalColumnsData) {
      const totalRow = ['TOTAL'];
      coordinatorData.forEach(coord => {
        const value = totalColumnsData[coord.coordinator_name as keyof typeof totalColumnsData];
        totalRow.push(value === 0 || value === '0' ? '' : String(value));
      });
      if (totalRowsData) {
        totalRow.push(totalRowsData.total === 0 ? '' : String(totalRowsData.total));
      }
      rows.push(totalRow);
    }

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



  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <div className='text-red-600'>Error loading coaches summary: {error.message}</div>;
  }

  if (!data || data.length === 0) {
    return <div className='text-gray-600'>No data available</div>;
  }

  const coordinatorData = data.filter(coord => coord.coordinator_name !== 'TOTAL_COLUMNS' && coord.coordinator_name !== 'TOTAL_ROWS');
  const totalColumnsData = data.find(coord => coord.coordinator_name === 'TOTAL_COLUMNS');
  const totalRowsData = data.find(coord => coord.coordinator_name === 'TOTAL_ROWS');
  
  const metrics = [
    { key: 'paired', label: 'Coaches paired' },
    { key: 'waiting_pairing', label: 'Coaches waiting to be paired' },
    { key: 'waiting_training', label: 'Coaches waiting to be trained' },
    { key: 'waiting_checks', label: 'Coaches waiting checks' },
    { key: 'on_break', label: 'Coaches on a break' },
  ];

  return (
    <div className='p-1'>
      <div className='overflow-x-auto rounded-lg border shadow-sm relative'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-100'>
            <tr>
              <th className='px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-medium text-gray-700 min-w-0 relative'>
                <button
                  onClick={copyToClipboard}
                  className='p-1 hover:bg-gray-200 rounded transition-colors'
                  title='Copy table to clipboard'
                >
                  <Copy size={14} className='text-gray-600' />
                </button>
                {showCopied && (
                  <div className='absolute left-0 top-10 bg-green-600 text-white px-2 py-1 rounded text-xs shadow-lg z-10 whitespace-nowrap'>
                    Copied
                  </div>
                )}
              </th>
              {coordinatorData.map((coordinator) => (
                <th key={coordinator.coordinator_name} className='px-1 sm:px-4 py-2 text-center text-xs sm:text-sm font-medium text-gray-700 min-w-0 w-16 sm:w-auto'>
                  <div className='break-words leading-tight'>
                    {coordinator.coordinator_name}
                  </div>
                </th>
              ))}
              {totalRowsData && (
                <th className='px-1 sm:px-4 py-2 text-center text-xs sm:text-sm font-medium text-gray-700 min-w-0 w-16 sm:w-auto'>
                  <div className='break-words leading-tight'>
                    TOTAL
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {metrics.map((metric) => (
              <tr key={metric.key} className='hover:bg-gray-50'>
                <td className='px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-900 min-w-0'>
                  <div className='break-words leading-tight'>
                    {metric.label}
                  </div>
                </td>
                {coordinatorData.map((coordinator) => {
                  const value = coordinator[metric.key as keyof CoachesSummary];
                  return (
                    <td key={coordinator.coordinator_name} className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 text-center min-w-0 w-16 sm:w-auto'>
                      {value === 0 || value === '0' ? '' : value}
                    </td>
                  );
                })}
                {totalRowsData && (
                  <td className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 text-center min-w-0 w-16 sm:w-auto'>
                    {(() => {
                      const value = totalRowsData[metric.key as keyof CoachesSummary];
                      return value === 0 || value === '0' ? '' : value;
                    })()}
                  </td>
                )}
              </tr>
            ))}
            {totalColumnsData && (
              <tr className='bg-gray-50 font-semibold border-t-2 border-gray-300'>
                <td className='px-2 sm:px-4 py-2 text-xs sm:text-sm font-bold text-gray-900 min-w-0'>
                  <div className='break-words leading-tight'>
                    TOTAL
                  </div>
                </td>
                {coordinatorData.map((coordinator) => {
                  const value = totalColumnsData[coordinator.coordinator_name as keyof typeof totalColumnsData];
                  return (
                    <td key={coordinator.coordinator_name} className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-900 text-center min-w-0 w-16 sm:w-auto font-bold'>
                      {value === 0 || value === '0' ? '' : value}
                    </td>
                  );
                })}
                {totalRowsData && (
                  <td className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-900 text-center min-w-0 w-16 sm:w-auto font-bold'>
                    {(() => {
                      const value = totalRowsData.total;
                      return value === 0 ? '' : value;
                    })()}
                  </td>
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
