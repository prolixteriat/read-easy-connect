import { useState } from 'react';

import { useCoaches } from '@hooks/useCoaches';

import { Loading } from '@components/Common';

import { CTable } from './CTable';

// -----------------------------------------------------------------------------

export default function CoachesTable(): React.JSX.Element {
  const { data, error, isLoading, mutate } = useCoaches();
  const [showLeavers, setShowLeavers] = useState(false);

  const handleSave = () => {
    mutate?.();
  };

  if (isLoading) return <div className='p-4'><Loading /></div>;
  if (error) return <div className='p-4 text-red-600'>Error loading coaches: {error.message}</div>;
  if (!data) return <div className='p-4'>No coaches found</div>;

  const filteredData = showLeavers ? data : data.filter(coach => coach.user_status !== 'leaver');

  return (
    <div className='p-4'>
      <CTable data={filteredData} onSave={handleSave} showLeavers={showLeavers} setShowLeavers={setShowLeavers} />
    </div>
  );
};
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
