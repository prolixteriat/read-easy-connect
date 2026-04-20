import { useOrgs } from '@hooks/useOrg';

import { Loading } from '@components/Common';
import { ContactsTable } from './ContactsTable';

// -----------------------------------------------------------------------------

export default function ContactsReport(): React.JSX.Element {
  const { data, error, isLoading } = useOrgs();

  if (isLoading) return <Loading />;
  if (error) return <div>Error loading organisations</div>;
  if (!data) return <div>No organizations found</div>;

  return (
    <div className='p-6'>
      <ContactsTable 
        data={data} 
      />
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------