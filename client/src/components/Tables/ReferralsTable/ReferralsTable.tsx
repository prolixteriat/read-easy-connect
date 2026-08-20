import { useState } from 'react';

import { useReferrals } from '@hooks/useReferrals';
import { useReaders } from '@hooks/useReaders';
import { JwtManager } from '@lib/jwtManager';

import { Loading } from '@components/Common';
import CoachesTable from '@components/Tables/CoachesTable/CoachesTable';
import { RTable } from './RTable';

// -----------------------------------------------------------------------------

export default function ReferralsTable(): React.JSX.Element {
  const { data, error, isLoading, mutate } = useReferrals();
  const { mutate: readersMutate } = useReaders();
  const [showClosed, setShowClosed] = useState(false);
  const [showCoaches, setShowCoaches] = useState(false);
  const jwtManager = new JwtManager();
  const userRole = jwtManager.getRole();

  if (isLoading) return <Loading />;
  if (error) return <div>Error loading enquiries: {error.message}</div>;
  if (!data) return <div>No referrals found</div>;

  const handleSave = () => {
    mutate?.();
    readersMutate?.();
  };

  return (
    <div className='p-4'>
      <div className={showCoaches ? 'flex gap-4' : undefined}>
        <div className={showCoaches ? 'w-1/2' : undefined}>
          <RTable
            data={data}
            onSave={handleSave}
            showClosed={showClosed}
            setShowClosed={setShowClosed}
            showCoaches={showCoaches}
            setShowCoaches={setShowCoaches}
            showAddButton={userRole !== 'viewer'}
          />
        </div>
        {showCoaches && (
          <div className='w-1/2 -mt-4'>
            <CoachesTable excludePaired />
          </div>
        )}
      </div>
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------