import React, { Suspense } from 'react';

import { useCoachesSummary } from '@hooks/useReports';

import { CoachesSummaryChart } from '@lib/lazy';

import { Loading } from '@components/Common';

import CoachesSummaryTable from './CoachesSummaryTable';

// -----------------------------------------------------------------------------

export default function CoachesSummaryReport(): React.JSX.Element {
  const { isLoading } = useCoachesSummary();

  return (
    <div className='space-y-2 pt-2 px-2'>      
      {isLoading ? (
          <Loading />
        ) : (
          <div className='space-y-2'>
            <CoachesSummaryTable />
            <Suspense fallback={<Loading />}><CoachesSummaryChart /></Suspense>
          </div>
        )
      }
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------