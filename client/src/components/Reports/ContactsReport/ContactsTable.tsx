import { useMemo, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';

import { orgTypeLabels } from '@lib/types';
import { BaseTable, useTableState, createSortableHeader } from '../../Tables/BaseTable';
import { useContacts } from '@hooks/useContact';

// -----------------------------------------------------------------------------

type Org = {
  org_id: number;
  name: string;
  affiliate_id: number;
  area_id: number | null;
  role_civic: number;
  role_donor: number;
  role_network: number;
  role_referrer: number;
  role_supplier: number;
  role_supporter: number;
  role_venue: number;
  role_volunteer: number;
  reader_venue: number;
  general_venue: number;
  address: string | null;
  description: string | null;
  url: string | null;
  status: string | null;
  summary: string | null;
  action: number;
  disabled: number;
  created_at: string;
  area_name: string | null;
};

type ContactsTableRow = Org & {
  contact_name: string;
  contact_role: string;
  contact_email: string;
  contact_telephone: string;
  marketing_consent: string;
  type_string: string;
};

// -----------------------------------------------------------------------------

interface ContactsTableProps {
  data: Org[];
}

export function ContactsTable({ data }: ContactsTableProps): React.JSX.Element {
  const tableState = useTableState({ id: 'name', desc: false });
  const { data: allContactsData } = useContacts();

  const getOrgTypes = (org: Org): string => {
    const types: string[] = [];
    if (org.role_civic) types.push(orgTypeLabels.civic);
    if (org.role_donor) types.push(orgTypeLabels.donor);
    if (org.role_network) types.push(orgTypeLabels.network);
    if (org.role_referrer) types.push(orgTypeLabels.referrer);
    if (org.role_supplier) types.push(orgTypeLabels.supplier);
    if (org.role_supporter) types.push(orgTypeLabels.supporter);
    if (org.role_venue) types.push(orgTypeLabels.venue);
    if (org.role_volunteer) types.push(orgTypeLabels.volunteer);
    return types.join('; ');
  };

  const tableData = useMemo(() => {
    if (!data || !allContactsData) return [];
    
    const result: ContactsTableRow[] = [];
    
    data.forEach(org => {
      const orgContacts = allContactsData.filter(contact => 
        contact.org_id === org.org_id && contact.disabled === 0
      );
      
      // Only add organizations that have contacts
      if (orgContacts.length > 0) {
        const orgTypeString = getOrgTypes(org);
        orgContacts.forEach(contact => {
          result.push({
            ...org,
            contact_name: contact.name,
            contact_role: contact.role || '',
            contact_email: contact.email || '',
            contact_telephone: contact.telephone || '',
            marketing_consent: contact.marketing_consent ? 'yes' : 'no',
            type_string: orgTypeString
          });
        });
      }
    });
    
    return result;
  }, [data, allContactsData]);

  const filteredData = useMemo(() => {
    if (!tableData) return [];
    return tableData.filter(row => row.disabled === 0);
  }, [tableData]);

  const copyToClipboard = useCallback(async () => {
    if (!filteredData || filteredData.length === 0) return;
    
    const headers = ['Organisation', 'Area', 'Type', 'Name', 'Role', 'Email', 'Telephone', 'Marketing'];
    const rows = filteredData.map(row => [
      row.name,
      row.area_name || '',
      row.type_string,
      row.contact_name,
      row.contact_role,
      row.contact_email,
      row.contact_telephone,
      row.marketing_consent
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join('\t'))
      .join('\n');

    try {
      await navigator.clipboard.writeText(csvContent);
      tableState.setShowCopied(true);
      setTimeout(() => tableState.setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [filteredData, tableState]);

  const columns: ColumnDef<ContactsTableRow>[] = [
    {
      accessorKey: 'name',
      header: createSortableHeader('Organisation', true, copyToClipboard, tableState.showCopied),
    },
    {
      accessorKey: 'area_name',
      header: createSortableHeader('Area'),
      cell: ({ getValue }) => getValue() || '',
    },
    {
      accessorKey: 'type_string',
      id: 'type',
      header: createSortableHeader('Type'),
    },
    {
      accessorKey: 'contact_name',
      header: createSortableHeader('Name'),
    },
    {
      accessorKey: 'contact_role',
      header: createSortableHeader('Role'),
    },
    {
      accessorKey: 'contact_email',
      header: createSortableHeader('Email'),
    },
    {
      accessorKey: 'contact_telephone',
      header: createSortableHeader('Telephone'),
    },
    {
      accessorKey: 'marketing_consent',
      header: createSortableHeader('Marketing'),
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <div className='flex justify-center'>
            <span className={`px-2 py-1 text-xs rounded-full ${
              value === 'yes' ? 'bg-green-100 text-green-800' : 
              value === 'no' ? 'bg-red-100 text-red-800' : 
              'bg-gray-100 text-gray-800'
            }`}>
              {value || 'n/a'}
            </span>
          </div>
        );
      },
    },
  ];

  const renderMobileCard = (row: ContactsTableRow) => (
    <div className='bg-white border rounded-lg p-4 shadow-sm'>
      <div className='flex justify-between items-start mb-2'>
        <h3 className='font-semibold text-gray-900'>{row.name}</h3>
        <span className={`px-2 py-1 text-xs rounded-full ${
          row.disabled === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {row.disabled === 0 ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <p className='text-sm text-gray-600 mb-1'>{row.type_string || 'No type specified'}</p>
      {row.contact_name && (
        <div className='text-sm text-gray-700 space-y-1'>
          <p><strong>Contact:</strong> {row.contact_name}</p>
          {row.contact_role && <p><strong>Role:</strong> {row.contact_role}</p>}
          {row.contact_email && <p><strong>Email:</strong> {row.contact_email}</p>}
          {row.contact_telephone && <p><strong>Phone:</strong> {row.contact_telephone}</p>}
          <p><strong>Marketing:</strong> {row.marketing_consent || 'n/a'}</p>
        </div>
      )}
    </div>
  );

  return (
    <BaseTable
      data={filteredData}
      columns={columns}
      globalFilter={tableState.globalFilter}
      onGlobalFilterChange={tableState.setGlobalFilter}
      sorting={tableState.sorting}
      onSortingChange={tableState.setSorting}
      renderMobileCard={renderMobileCard}
    >
      <div className='flex flex-col sm:flex-row gap-2 mb-4'>
        <div className='flex-1 relative'>
          <input
            id='filter-contacts'
            name='filter'
            type='text'
            placeholder='Filter...'
            className='w-full rounded-md border p-2 text-sm'
            value={tableState.globalFilter ?? ''}
            onChange={(e) => tableState.setGlobalFilter(e.target.value)}
          />
        </div>
      </div>
    </BaseTable>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------