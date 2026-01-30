import React, { Suspense, useState, useMemo, useEffect } from 'react';

import { useReaderDetail } from '@hooks/useReports';

import { ReaderDetailChart, ReaderCoordsChart } from '@lib/lazy';
import { type TReaderStatus } from '@lib/types';

import { Loading } from '@components/Common';

import ReadersDetailTable from './ReaderDetailTable';
import ReadersStatusFilter from './ReaderStatusFilter';

// -----------------------------------------------------------------------------

const STORAGE_KEY = 'readersDetailReport_selectedStatuses';

export default function ReaderDetailReport(): React.JSX.Element {
  const { data, isLoading } = useReaderDetail();
  const [selectedStatuses, setSelectedStatuses] = useState<TReaderStatus[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['NYS', 'S', 'P', 'DO', 'G', 'C'];
    } catch {
      return ['NYS', 'S', 'P', 'DO', 'G', 'C'];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedStatuses));
  }, [selectedStatuses]);

  const filteredData = useMemo(() => {
    if (!data) return undefined;
    return data.filter(reader => 
      reader.reader_id !== null && 
      (selectedStatuses.length === 0 || selectedStatuses.includes(reader.reader_status as TReaderStatus))
    );
  }, [data, selectedStatuses]);

  return (
    <div className='space-y-2 pt-2 px-2 w-full max-w-full min-w-0'>      
      {isLoading ? (
          <Loading />
        ) : (
          <div className='space-y-2'>
            <ReadersStatusFilter 
              selectedStatuses={selectedStatuses}
              onStatusChange={setSelectedStatuses}
            />
            <ReadersDetailTable filteredData={filteredData} />
            <Suspense fallback={<Loading />}><ReaderDetailChart filteredData={filteredData} /></Suspense>
            <Suspense fallback={<Loading />}><ReaderCoordsChart filteredData={filteredData} /></Suspense>
          </div>
        )
      }
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
