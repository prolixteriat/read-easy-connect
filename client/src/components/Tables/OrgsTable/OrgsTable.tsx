import { useState } from 'react';

import { useOrgs } from '@hooks/useOrg';
import { useAuth } from '../../../context/useAuth';

import { Loading } from '@components/Common';
import { OTable } from './OTable';

// -----------------------------------------------------------------------------

export default function OrgsTable(): React.JSX.Element {
  const { data, error, isLoading, mutate } = useOrgs();
  const { role } = useAuth();
  const [showDisabled, setShowDisabled] = useState(false);
  const [showReaderVenues, setShowReaderVenues] = useState(false);

  if (isLoading) return <Loading />;
  if (error) return <div>Error loading organisations</div>;
  if (!data) return <div>No organizations found</div>;

  const handleSave = () => {
    mutate?.();
  };

  return (
    <div className='p-6'>
      <OTable 
        data={data} 
        onSave={handleSave}
        showDisabled={showDisabled}
        setShowDisabled={setShowDisabled}
        showReaderVenues={showReaderVenues}
        setShowReaderVenues={setShowReaderVenues}
        userRole={role}
      />
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------