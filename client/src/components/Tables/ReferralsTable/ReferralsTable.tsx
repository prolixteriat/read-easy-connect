import { useState } from 'react';

import { useReferrals } from '@hooks/useReferrals';
import { JwtManager } from '@lib/jwtManager';

import { Loading } from '@components/Common';
import { RTable } from './RTable';

// -----------------------------------------------------------------------------

export default function ReferralsTable(): React.JSX.Element {
  const { data, error, isLoading, mutate } = useReferrals();
  const [showClosed, setShowClosed] = useState(false);
  const jwtManager = new JwtManager();
  const userRole = jwtManager.getRole();

  if (isLoading) return <Loading />;
  if (error) return <div>Error loading referrals</div>;
  if (!data) return <div>No referrals found</div>;

  const handleSave = () => {
    mutate?.();
  };

  return (
    <div className='p-6'>
      <RTable 
        data={data} 
        onSave={handleSave}
        showClosed={showClosed}
        setShowClosed={setShowClosed}
        showAddButton={userRole !== 'viewer'}
      />
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------