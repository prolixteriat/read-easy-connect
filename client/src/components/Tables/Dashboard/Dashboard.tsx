import { useUsers } from '@hooks/useUsers';
import { useReaders } from '@hooks/useReaders';
import { Loading } from '@components/Common';
import { useCallback, useState } from 'react';
import { Copy } from 'lucide-react';
import { type TUserStatus, type TReaderLevel } from '@lib/types';

// -----------------------------------------------------------------------------

export default function Dashboard(): React.JSX.Element {
  const { data: usersData, isLoading: usersLoading, error: usersError } = useUsers();
  const { data: readersData, isLoading: readersLoading, error: readersError } = useReaders();
  const [showCopied, setShowCopied] = useState(false);

  const isLoading = usersLoading || readersLoading;
  const error = usersError || readersError;
  const data = usersData;

  const copyToClipboard = useCallback(async () => {
    if (!data || !readersData) return;
    
    const filteredData = data.filter(user => user.status !== 'leaver');
    const roleOrder = ['manager', 'coordinator', 'coach'];
    const roles = roleOrder.filter(role => filteredData.some(user => user.role === role));
    const statuses: TUserStatus[] = ['active', 'onhold'];

    const filteredReaders = readersData.filter(reader => !['DO', 'G', 'C'].includes(reader.status));
    const levelOrder: TReaderLevel[] = ['TP1', 'TP2', 'TP3', 'TP4', 'TP5'];
    const levels = levelOrder;

    const headers = ['Role/Level'].concat(statuses).concat(['Total']);
    const userRows = roles.map(role => {
      const row = [role];
      statuses.forEach(status => {
        const count = filteredData.filter(user => user.role === role && user.status === status).length;
        row.push(count === 0 ? '' : String(count));
      });
      const total = filteredData.filter(user => user.role === role).length;
      row.push(String(total));
      return row;
    });

    const readerRows = levels.map(level => {
      const row = [`Reader - ${level}`];
      statuses.forEach(status => {
        let count = 0;
        if (status === 'active') {
          count = filteredReaders.filter(reader => reader.level === level && ['NYS', 'S'].includes(reader.status)).length;
        } else if (status === 'onhold') {
          count = filteredReaders.filter(reader => reader.level === level && reader.status === 'P').length;
        }
        row.push(count === 0 ? '' : String(count));
      });
      const total = filteredReaders.filter(reader => reader.level === level).length;
      row.push(String(total));
      return row;
    });

    const rows = [...userRows, ...readerRows];

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
  }, [data, readersData]);

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <div className='text-red-600'>Error loading users summary: {error.message}</div>;
  }

  if (!data || data.length === 0 || !readersData) {
    return <div className='text-gray-600'>No data available</div>;
  }

  const filteredData = data.filter(user => user.status !== 'leaver');
  const roleOrder = ['manager', 'coordinator', 'coach'];
  const roles = roleOrder.filter(role => filteredData.some(user => user.role === role));
  const statuses: TUserStatus[] = ['active', 'onhold'];



  const filteredReaders = readersData.filter(reader => !['DO', 'G', 'C'].includes(reader.status));
  const levelOrder: TReaderLevel[] = ['TP1', 'TP2', 'TP3', 'TP4', 'TP5'];
  const levels = levelOrder;

  return (
    <div className='p-4'>
      <h1 className='text-2xl font-bold text-gray-900 mb-4'>Dashboard</h1>
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
              {statuses.map((status) => (
                <th key={status} className='px-1 sm:px-4 py-2 text-center text-xs sm:text-sm font-medium text-gray-700 min-w-0 w-16 sm:w-auto'>
                  <div className='break-words leading-tight capitalize'>
                    {status}
                  </div>
                </th>
              ))}
              <th className='px-1 sm:px-4 py-2 text-center text-xs sm:text-sm font-medium text-gray-700 min-w-0 w-16 sm:w-auto'>
                <div className='break-words leading-tight'>
                  Total
                </div>
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {roles.map((role) => (
              <tr key={role} className='hover:bg-gray-50'>
                <td className='px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-900 min-w-0'>
                  <div className='break-words leading-tight capitalize'>
                    {role}
                  </div>
                </td>
                {statuses.map((status) => {
                  const count = filteredData.filter(user => user.role === role && user.status === status).length;
                  return (
                    <td key={status} className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 text-center min-w-0 w-16 sm:w-auto'>
                      {count === 0 ? '' : count}
                    </td>
                  );
                })}
                <td className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 text-center min-w-0 w-16 sm:w-auto font-medium'>
                  {filteredData.filter(user => user.role === role).length}
                </td>
              </tr>
            ))}
            {levels.map((level) => (
              <tr key={level} className='hover:bg-gray-50'>
                <td className='px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-900 min-w-0'>
                  <div className='break-words leading-tight'>
                    Reader - {level}
                  </div>
                </td>
                {statuses.map((status) => {
                  let count = 0;
                  if (status === 'active') {
                    count = filteredReaders.filter(reader => reader.level === level && ['NYS', 'S'].includes(reader.status)).length;
                  } else if (status === 'onhold') {
                    count = filteredReaders.filter(reader => reader.level === level && reader.status === 'P').length;
                  }
                  return (
                    <td key={status} className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 text-center min-w-0 w-16 sm:w-auto'>
                      {count === 0 ? '' : count}
                    </td>
                  );
                })}
                <td className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 text-center min-w-0 w-16 sm:w-auto font-medium'>
                  {filteredReaders.filter(reader => reader.level === level).length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
