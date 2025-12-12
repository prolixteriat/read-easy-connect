import { useState } from 'react';

import { useVenues } from '@hooks/useOrg';

import { Loading } from '@components/Common';
import { VTable } from './VTable';

// -----------------------------------------------------------------------------

export default function VenuesTable(): React.JSX.Element {
  const { data, error, isLoading, mutate } = useVenues();
  const [showDisabled, setShowDisabled] = useState(false);

  if (isLoading) return <Loading />;
  if (error) return <div>Error loading venues</div>;
  if (!data) return <div>No venues found</div>;

  const handleSave = () => {
    mutate?.();
  };

  return (
    <div className='p-6'>
      <VTable 
        data={data} 
        onSave={handleSave}
        showDisabled={showDisabled}
        setShowDisabled={setShowDisabled}
      />
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
