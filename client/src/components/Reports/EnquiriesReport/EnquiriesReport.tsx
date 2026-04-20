import React, { useState, Suspense } from 'react';

import DateRangePicker from '@components/Common/DateRangePicker';
import { Loading } from '@components/Common';
import { EnquiryChart } from '@lib/lazy';
import EnquiryTable from './EnquiryTable';
import { useReferrals } from '@hooks/useReferrals';

// -----------------------------------------------------------------------------

export default function EnquiriesReport(): React.JSX.Element {
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
  const { data, error, isLoading } = useReferrals(undefined, dateRange.start || undefined, dateRange.end || undefined);

  const handleDateChange = (start: string, end: string) => {
    setDateRange({start, end});
  };

  if (isLoading) return <Loading />;

  return (
    <div className='w-full space-y-4 pt-6'>
      <DateRangePicker 
        startDate={dateRange.start}
        endDate={dateRange.end}
        onDateChange={handleDateChange} 
      />

      <div className='space-y-4'>
        <EnquiryTable 
          data={data}
          error={error}
        />
        <Suspense fallback={<div>Loading chart...</div>}>
          <EnquiryChart 
            data={data}
            error={error}
          />
        </Suspense>
      </div>
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------