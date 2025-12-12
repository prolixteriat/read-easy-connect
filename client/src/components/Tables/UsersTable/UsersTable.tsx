import { useState } from 'react';

import { useUsers } from '@hooks/useUsers';

import { type TRole } from '@lib/types';

import { Loading } from '@components/Common';

import { UTable } from './UTable';

// -----------------------------------------------------------------------------

interface UsersTableProps {
  roleType?: TRole;
}

export default function UsersTable({ roleType }: UsersTableProps): React.JSX.Element {
  const { data, error, isLoading, mutate } = useUsers();
  const [showLeavers, setShowLeavers] = useState(false);

  const handleSave = () => {
    mutate?.();
  };

  if (isLoading) return <div className='p-4'><Loading /></div>;
  if (error) return <div className='p-4 text-red-600'>Error loading users: {error.message}</div>;
  if (!data) return <div className='p-4'>No users found</div>;

  let filteredData = roleType ? data.filter(user => user.role.toLowerCase() === roleType) : data;
  
  if (!showLeavers) {
    filteredData = filteredData.filter(user => user.status !== 'leaver');
  }

  return (
    <div className='p-4'>
      <UTable data={filteredData} onSave={handleSave} roleType={roleType} 
              showLeavers={showLeavers} setShowLeavers={setShowLeavers} />
    </div>
  );
};
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
