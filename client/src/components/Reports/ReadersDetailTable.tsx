import { useCallback, useState, useMemo } from 'react';
import { Copy } from 'lucide-react';

// -----------------------------------------------------------------------------

type ReadersDetail = {
  area_id: number | null;
  area_name: string | null;
  coordinator_id: number | null;
  coordinator_name: string | null;
  reader_id: number | null;
  reader_name: string | null;
  reader_level: string | null;
  reader_status: string | null;
  reader_notes: string | null;
  TP1: number;
  TP2: number;
  TP3: number;
  TP4: number;
  TP5: number;
};

// -----------------------------------------------------------------------------

interface ReadersDetailTableProps {
  filteredData?: ReadersDetail[];
}

export default function ReadersDetailTable({ filteredData }: ReadersDetailTableProps): React.JSX.Element {
  const displayData = useMemo(() => filteredData || [], [filteredData]);
  const [showCopied, setShowCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    if (!displayData.length) return;
    
    const headers = ['Area', 'Coordinator', 'Reader', 'TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'Status', 'Comments'];
    const rows = displayData.map(reader => [
        reader.area_name || 'Unassigned',
        reader.coordinator_name || 'Unassigned',
        reader.reader_name || '',
        reader.TP1 ? 'X' : '',
        reader.TP2 ? 'X' : '',
        reader.TP3 ? 'X' : '',
        reader.TP4 ? 'X' : '',
        reader.TP5 ? 'X' : '',
        reader.reader_status || '',
        reader.reader_notes || ''
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
  }, [displayData]);



  if (displayData.length === 0) {
    return <div className='text-gray-600'>No readers match the selected filters</div>;
  }

  // Group filtered data by area and coordinator for display
  const validReaders = displayData;
  const groupedData = validReaders.reduce((acc, reader) => {
    const areaKey = reader.area_name || 'Unassigned';
    const coordKey = reader.coordinator_name || 'Unassigned';
    
    if (!acc[areaKey]) {
      acc[areaKey] = {};
    }
    if (!acc[areaKey][coordKey]) {
      acc[areaKey][coordKey] = [];
    }
    acc[areaKey][coordKey].push(reader);
    return acc;
  }, {} as Record<string, Record<string, ReadersDetail[]>>);

  // Sort areas to put 'Unassigned' at the end
  const sortedAreas = Object.keys(groupedData).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className='p-1 w-full max-w-full'>
      <div className='overflow-x-auto rounded-lg border shadow-sm relative w-full max-w-full'>
        <table className='w-full divide-y divide-gray-200'>
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
              <th className='hidden sm:table-cell px-1 sm:px-4 py-2 text-left text-xs sm:text-sm font-medium text-gray-700 min-w-0'>
                Coordinator
              </th>
              <th className='px-1 sm:px-4 py-2 text-left text-xs sm:text-sm font-medium text-gray-700 min-w-0'>
                Reader
              </th>
              <th className='px-1 sm:px-4 py-2 text-center text-xs sm:text-sm font-medium text-gray-700 min-w-0'>
                TP1
              </th>
              <th className='px-1 sm:px-4 py-2 text-center text-xs sm:text-sm font-medium text-gray-700 min-w-0'>
                TP2
              </th>
              <th className='px-1 sm:px-4 py-2 text-center text-xs sm:text-sm font-medium text-gray-700 min-w-0'>
                TP3
              </th>
              <th className='px-1 sm:px-4 py-2 text-center text-xs sm:text-sm font-medium text-gray-700 min-w-0'>
                TP4
              </th>
              <th className='px-1 sm:px-4 py-2 text-center text-xs sm:text-sm font-medium text-gray-700 min-w-0'>
                TP5
              </th>
              <th className='px-1 sm:px-4 py-2 text-center text-xs sm:text-sm font-medium text-gray-700 min-w-0'>
                Status
              </th>
              <th className='hidden sm:table-cell px-1 sm:px-4 py-2 text-left text-xs sm:text-sm font-medium text-gray-700 min-w-0'>
                Comments
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {sortedAreas.map(areaName => {
              const coordinators = groupedData[areaName];
              // Sort coordinators to put 'Unassigned' at the end
              const sortedCoordinators = Object.entries(coordinators).sort(([a], [b]) => {
                if (a === 'Unassigned') return 1;
                if (b === 'Unassigned') return -1;
                return a.localeCompare(b);
              });
              let isFirstAreaRow = true;
              return sortedCoordinators.map(([coordinatorName, readers]) => {
                let isFirstCoordRow = true;
                return readers.map((reader) => (
                  <tr key={`${reader.area_id}-${reader.coordinator_id}-${reader.reader_id}`} className='hover:bg-gray-50'>
                    <td className='px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-900 min-w-0'>
                      {isFirstAreaRow ? (
                        <div className='break-words leading-tight font-medium'>
                          {areaName}
                        </div>
                      ) : null}
                      {isFirstAreaRow && (isFirstAreaRow = false)}
                    </td>
                    <td className='hidden sm:table-cell px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-900 min-w-0'>
                      {isFirstCoordRow ? (
                        <div className='break-words leading-tight'>
                          {coordinatorName}
                        </div>
                      ) : null}
                      {isFirstCoordRow && (isFirstCoordRow = false)}
                    </td>
                    <td className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-900 min-w-0'>
                      <div className='break-words leading-tight'>
                        {reader.reader_name || ''}
                      </div>
                    </td>
                    <td className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 text-center min-w-0'>
                      {reader.TP1 ? 'X' : ''}
                    </td>
                    <td className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 text-center min-w-0'>
                      {reader.TP2 ? 'X' : ''}
                    </td>
                    <td className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 text-center min-w-0'>
                      {reader.TP3 ? 'X' : ''}
                    </td>
                    <td className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 text-center min-w-0'>
                      {reader.TP4 ? 'X' : ''}
                    </td>
                    <td className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 text-center min-w-0'>
                      {reader.TP5 ? 'X' : ''}
                    </td>
                    <td className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 text-center min-w-0'>
                      {reader.reader_status || ''}
                    </td>
                    <td className='hidden sm:table-cell px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 min-w-0'>
                      <div className='break-words leading-tight'>
                        {reader.reader_notes || ''}
                      </div>
                    </td>
                  </tr>
                ));
              }).flat();
            }).flat()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
