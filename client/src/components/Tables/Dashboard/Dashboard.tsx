import { useDashboard } from '@hooks/useReports';
import { Loading } from '@components/Common';
import { useCallback, useState } from 'react';
import { Copy } from 'lucide-react';

// -----------------------------------------------------------------------------

export default function Dashboard(): React.JSX.Element {
  const { data, isLoading, error } = useDashboard();
  const [showCopied, setShowCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    if (!data) return;
    
    const roles = ['manager', 'viewer', 'coordinator', 'coach', 'reader_TP1', 'reader_TP2', 'reader_TP3', 'reader_TP4', 'reader_TP5'];
    const headers = ['Role/Level', 'Active', 'Onhold', 'Total'];
    
    const rows = roles.map(role => {
      const roleData = data[role as keyof typeof data] as { active: number; onhold: number; total: number };
      const displayName = role.startsWith('reader_') ? `Reader - ${role.split('_')[1]}` : role === 'viewer' ? 'Info Viewer' : role;
      return [
        displayName,
        roleData.active || '',
        roleData.onhold || '',
        roleData.total
      ];
    });

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
    return <div className='text-red-600'>Error loading dashboard: {error.message}</div>;
  }

  if (!data) {
    return <div className='text-gray-600'>No data available</div>;
  }

  const roles = ['manager', 'viewer', 'coordinator', 'coach', 'reader_TP1', 'reader_TP2', 'reader_TP3', 'reader_TP4', 'reader_TP5'];
  const statuses = ['active', 'onhold'];

  return (
    <div className='p-4'>
      <h1 className='text-2xl font-bold text-gray-900 mb-4'>{data.affiliate} Dashboard</h1>
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
            {roles.map((role) => {
              const roleData = data[role as keyof typeof data] as { active: number; onhold: number; total: number };
              const displayName = role.startsWith('reader_') ? `Reader - ${role.split('_')[1]}` : role === 'viewer' ? 'Info Viewer' : role;
              
              return (
                <tr key={role} className='hover:bg-gray-50'>
                  <td className='px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-900 min-w-0'>
                    <div className='break-words leading-tight capitalize'>
                      {displayName}
                    </div>
                  </td>
                  {statuses.map((status) => {
                    const count = roleData[status as keyof typeof roleData];
                    return (
                      <td key={status} className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 text-center min-w-0 w-16 sm:w-auto'>
                        {count === 0 ? '' : count}
                      </td>
                    );
                  })}
                  <td className='px-1 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 text-center min-w-0 w-16 sm:w-auto font-medium'>
                    {roleData.total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
