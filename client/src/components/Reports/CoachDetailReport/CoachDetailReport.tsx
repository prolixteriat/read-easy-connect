import React, { Suspense } from 'react';

import { useCoachDetail } from '@hooks/useReports';

import { CoachDetailChart } from '@lib/lazy';

import { Loading } from '@components/Common';

import CoachesSummaryTable from './CoachDetailTable';

// -----------------------------------------------------------------------------

export default function CoachDetailReport(): React.JSX.Element {
  const { isLoading } = useCoachDetail();

  return (
    <div className='space-y-2 pt-2 px-2'>      
      {isLoading ? (
          <Loading />
        ) : (
          <div className='space-y-2'>
            <CoachesSummaryTable />
            <Suspense fallback={<Loading />}><CoachDetailChart /></Suspense>
          </div>
        )
      }
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------