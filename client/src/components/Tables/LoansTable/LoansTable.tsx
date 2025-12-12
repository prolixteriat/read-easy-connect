import { useState } from 'react';

import { useLoans } from '@hooks/useLoans';
import { useReaders } from '@hooks/useReaders';
import { Loading } from '@components/Common';
import { LTable } from './LTable.tsx';

// -----------------------------------------------------------------------------

export default function LoansTable(): React.JSX.Element {
  const [showReturnedAndLost, setShowReturnedAndLost] = useState(false);
  
  const { data: loansData, mutate: mutateLoans } = useLoans();
  const { data: readersData } = useReaders();

  const handleSave = () => {
    mutateLoans?.();
  };

  if (!loansData || !readersData) {
    return <Loading />;
  }
  
  console.log('LoansData:', loansData);
  console.log('ReadersData:', readersData);

  return (
    <div className='p-4'>
      <LTable 
        data={loansData} 
        readers={readersData}
        onSave={handleSave}
        showReturnedAndLost={showReturnedAndLost}
        setShowReturnedAndLost={setShowReturnedAndLost}
      />
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
