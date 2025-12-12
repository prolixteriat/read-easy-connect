import { useAreas } from '@hooks/useOrg';

import { Loading } from '@components/Common';

import { ATable } from './ATable';

// -----------------------------------------------------------------------------

export default function AreasTable(): React.JSX.Element {
  const { data, error, isLoading, mutate } = useAreas();

  const handleSave = () => {
    mutate?.();
  };

  if (isLoading) return <div className='p-4'><Loading /></div>;
  if (error) return <div className='p-4 text-red-600'>Error loading areas: {error.message}</div>;
  if (!data) return <div className='p-4'>No areas found</div>;

  return (
    <div className='p-4'>
      <ATable data={data} onSave={handleSave} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
