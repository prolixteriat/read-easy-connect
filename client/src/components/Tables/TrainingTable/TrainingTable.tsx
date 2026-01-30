import { useCoaches } from '@hooks/useCoaches';

import { Loading } from '@components/Common';

import { TTable } from './TTable';

// -----------------------------------------------------------------------------

export default function TrainingTable(): React.JSX.Element {
  const { data, error, isLoading } = useCoaches();

  if (isLoading) return <div className='p-4'><Loading /></div>;
  if (error) return <div className='p-4 text-red-600'>Error loading coaches: {error.message}</div>;
  if (!data) return <div className='p-4'>No coaches found</div>;

  const filteredData = data.filter(coach => 
    coach.user_status !== 'leaver' &&
    (coach.training !== 'completed' ||
     coach.consol_training !== 'completed' ||
     coach.edib_training !== 'completed' ||
     !coach.ref_completed ||
     !coach.dbs_completed)
  );

  if (filteredData.length === 0) {
    return <div className='p-4'>No coaches requiring training found</div>;
  }

  return (
    <div className='p-4'>
      <TTable data={filteredData} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
