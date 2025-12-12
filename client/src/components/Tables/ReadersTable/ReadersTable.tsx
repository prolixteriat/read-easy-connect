import { useState } from 'react';

import { useReaders } from '@hooks/useReaders';

import { Loading } from '@components/Common';

import { RTable } from './RTable';

// -----------------------------------------------------------------------------

export default function ReadersTable(): React.JSX.Element {
  const { data, error, isLoading, mutate } = useReaders();
  const [showGDOC, setShowGDOC] = useState(false);

  const handleSave = () => {
    mutate?.();
  };

  if (isLoading) return <div className='p-4'><Loading /></div>;
  if (error) return <div className='p-4 text-red-600'>Error loading readers: {error.message}</div>;
  if (!data) return <div className='p-4'>No readers found</div>;

  const filteredData = showGDOC ? data : data.filter(reader => reader.status !== 'G' && reader.status !== 'DO' && reader.status !== 'C');

  return (
    <div className='p-4'>
      <RTable data={filteredData} onSave={handleSave} showGDOC={showGDOC} setShowGDOC={setShowGDOC} />
    </div>
  );
};
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
