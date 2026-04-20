import { useState } from 'react';

import { useReaders } from '@hooks/useReaders';

import { Loading } from '@components/Common';

import { OTable } from './OTable';

// -----------------------------------------------------------------------------

export default function Ons4Table(): React.JSX.Element {
  const { data, error, isLoading } = useReaders();
  const [showFiltered, setShowFiltered] = useState(false);

  if (isLoading) return <div className='p-4'><Loading /></div>;
  if (error) return <div className='p-4 text-red-600'>Error loading readers: {error.message}</div>;
  if (!data) return <div className='p-4'>No readers found</div>;

  const filteredData = showFiltered 
    ? data 
    : data.filter(reader => !['G', 'DO', 'C'].includes(reader.status));

  return (
    <div className='p-4'>
      <OTable 
        data={filteredData} 
        showFiltered={showFiltered}
        onShowFilteredChange={setShowFiltered}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------