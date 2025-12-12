import React, { Suspense, useState, useMemo, useEffect } from 'react';

import { useReadersDetail } from '@hooks/useReports';

import { ReadersDetailChart, ReadersCoordsChart } from '@lib/lazy';
import { type TReaderStatus } from '@lib/types';

import { Loading } from '@components/Common';

import ReadersDetailTable from './ReadersDetailTable';
import ReadersStatusFilter from './ReadersStatusFilter';

// -----------------------------------------------------------------------------

const STORAGE_KEY = 'readersDetailReport_selectedStatuses';

export default function ReadersDetailReport(): React.JSX.Element {
  const { data, isLoading } = useReadersDetail();
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
            <Suspense fallback={<Loading />}><ReadersDetailChart filteredData={filteredData} /></Suspense>
            <Suspense fallback={<Loading />}><ReadersCoordsChart filteredData={filteredData} /></Suspense>
          </div>
        )
      }
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
