import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';

import { editOrg, addOrg } from '@lib/api/apiOrg';
import { asString} from '@lib/helper';
import { type TRole, orgTypeLabels } from '@lib/types';
import { Button, ErrorDialog, Loading } from '@components/Common';
import { OrgNotesDisplay, type OrgNotesDisplayRef } from '@components/Common/OrgNotesDisplay';
import { ContactsDisplay, type ContactsDisplayRef } from '@components/Common/ContactsDisplay';
import { BaseTable, useTableState, createSortableHeader } from '../BaseTable';
import { useAreas } from '@hooks/useOrg';
import { useOrgNotes } from '@hooks/useNotes';
import { useContacts } from '@hooks/useContact';
import { JwtManager } from '@lib/jwtManager';

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

// Custom TableModal that conditionally shows Save button
function CustomTableModal<T>({
  isOpen,
  onClose,
  title,
  data,
  onSave,
  isSaving,
  showSaveButton,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: T | null;
  onSave: () => void;
  isSaving: boolean;
  showSaveButton: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const modalWidth = 'w-full max-w-2xl'; // Increased from max-w-lg to max-w-2xl (20% larger)
  
  return (
    <Dialog open={isOpen} onClose={() => {}} className='relative z-50'>
      <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <DialogPanel className={`${modalWidth} rounded-xl bg-white p-6 shadow-lg`}>
          <div className='flex justify-between items-start mb-4'>
            <div>
              <DialogTitle className='text-lg font-semibold'>{title}</DialogTitle>
              {data && 'id' in (data as Record<string, unknown>) && (
                <p className='text-sm text-blue-600 font-bold'>ID: {String((data as Record<string, unknown>).id)}</p>
              )}
            </div>
            <button onClick={onClose}>
              <X className='h-5 w-5 text-gray-500' />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (showSaveButton) onSave();
            }}
            className='space-y-3 max-h-96 overflow-y-auto pr-2'
          >
            {children}
            <div className='flex justify-end gap-2 mt-4'>
              <Button variant='secondary' type='button' onClick={onClose}>
                Cancel
              </Button>
              {showSaveButton && (
                <Button type='submit' disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              )}
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------

interface OTableProps {
  data: Org[];
  onSave: (updatedRow: Org) => void;
  showDisabled?: boolean;
  setShowDisabled?: (show: boolean) => void;
  showReaderVenues?: boolean;
  setShowReaderVenues?: (show: boolean) => void;
  userRole: TRole | null;
}

export function OTable({ data, onSave, showDisabled, setShowDisabled, showReaderVenues, setShowReaderVenues, userRole }: OTableProps): React.JSX.Element {
  const tableState = useTableState({ id: 'name', desc: false });
  const { data: areasData } = useAreas();
  const [selectedRow, setSelectedRow] = useState<Org | null>(null);
  const [originalSelectedRow, setOriginalSelectedRow] = useState<Org | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasUnsavedEditChanges, setHasUnsavedEditChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showUnsavedEditDialog, setShowUnsavedEditDialog] = useState(false);
  const { data: notesData, error: notesError, isLoading: notesLoading, mutate: notesMutate } = useOrgNotes(selectedRow?.org_id);
  const { data: contactsData, error: contactsError, isLoading: contactsLoading, mutate: contactsMutate } = useContacts(selectedRow?.org_id);
  const orgNotesRef = useRef<OrgNotesDisplayRef>(null);
  const contactsRef = useRef<ContactsDisplayRef>(null);

  const jwtManager = new JwtManager();
  const currentUserRole = jwtManager.getRole();
  const isManager = currentUserRole === 'manager';

  const handleAddContactClick = useCallback(() => {
    contactsRef.current?.openAddModal();
  }, []);

  const handleAddNoteClick = useCallback(() => {
    orgNotesRef.current?.openAddModal();
  }, []);
  const [newOrg, setNewOrg] = useState({ 
    name: '', 
    affiliate_id: 1,
    area_id: null as number | null,
    role_civic: 0,
    role_donor: 0,
    role_network: 0,
    role_referrer: 0,
    role_supplier: 0,
    role_supporter: 0,
    role_venue: 0,
    role_volunteer: 0,
    reader_venue: 0,
    general_venue: 0,
    address: '',
    description: '',
    url: '',
    status: '',
    summary: '',
    action: 0
  });

  const orgAreas = useMemo(() => {
    if (!areasData) return [];
    return areasData.filter(area => area.org_area === 1 && area.disabled === 0);
  }, [areasData]);

  useEffect(() => {
    const initialNewOrg = {
      name: '', 
      affiliate_id: 1,
      area_id: null as number | null,
      role_civic: 0,
      role_donor: 0,
      role_network: 0,
      role_referrer: 0,
      role_supplier: 0,
      role_supporter: 0,
      role_venue: 0,
      role_volunteer: 0,
      reader_venue: 0,
      general_venue: 0,
      address: '',
      description: '',
      url: '',
      status: '',
      summary: '',
      action: 0
    };
    const hasChanges = JSON.stringify(newOrg) !== JSON.stringify(initialNewOrg);
    setHasUnsavedChanges(hasChanges);
  }, [newOrg]);

  useEffect(() => {
    if (selectedRow && originalSelectedRow) {
      const hasChanges = JSON.stringify(selectedRow) !== JSON.stringify(originalSelectedRow);
      setHasUnsavedEditChanges(hasChanges);
    } else {
      setHasUnsavedEditChanges(false);
    }
  }, [selectedRow, originalSelectedRow]);

  const getOrgTypes = useCallback((org: Org): string => {
    const types: string[] = [];
    if (org.role_civic) types.push(orgTypeLabels.civic);
    if (org.role_donor) types.push(orgTypeLabels.donor);
    if (org.role_network) types.push(orgTypeLabels.network);
    if (org.role_referrer) types.push(orgTypeLabels.referrer);
    if (org.role_supplier) types.push(orgTypeLabels.supplier);
    if (org.role_supporter) types.push(orgTypeLabels.supporter);
    if (org.role_venue) {
      if (org.reader_venue) types.push('Reader Venue');
      if (org.general_venue) types.push('General Venue');
    }
    if (org.role_volunteer) types.push(orgTypeLabels.volunteer);
    return types.join('; ');
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!data || data.length === 0) return;
    
    const headers = ['Name', 'Area', 'Type', 'Description', 'Action', 'Unavailable'];
    const rows = data.map(org => [
      org.name,
      org.area_name || '',
      getOrgTypes(org),
      org.description || '',
      org.action ? 'yes' : 'no',
      org.disabled ? 'yes' : 'no'
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
  }, [data, getOrgTypes, tableState]);

  const columns: ColumnDef<Org>[] = [
    {
      accessorKey: 'name',
      header: createSortableHeader('Name', true, copyToClipboard, tableState.showCopied),
    },
    {
      accessorKey: 'area_name',
      header: createSortableHeader('Area'),
      cell: ({ getValue }) => getValue() || '',
    },
    {
      accessorFn: (row) => getOrgTypes(row),
      id: 'type',
      header: createSortableHeader('Type'),
      cell: ({ row }) => getOrgTypes(row.original),
    },
    {
      accessorKey: 'description',
      header: createSortableHeader('Description'),
      cell: ({ getValue }) => getValue() || '',
      meta: { hideOnMobile: true },
    },
    {
      accessorKey: 'action',
      header: createSortableHeader('Action'),
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${
            value ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {value ? 'yes' : 'no'}
          </span>
        );
      },
    },
    {
      accessorKey: 'disabled',
      header: createSortableHeader('Unavailable'),
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${
            value ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {value ? 'yes' : 'no'}
          </span>
        );
      },
    },
  ];

  const filteredData = useMemo(() => {
    if (!data) return [];
    let filtered = data;
    
    // Filter by disabled status
    if (!showDisabled) {
      filtered = filtered.filter(org => org.disabled === 0);
    }
    
    // Filter by Reader Venue
    if (showReaderVenues) {
      filtered = filtered.filter(org => org.role_venue === 1 && org.reader_venue === 1);
    }
    
    return filtered;
  }, [data, showDisabled, showReaderVenues]);

  const handleRowClick = (row: Org) => {
    setSelectedRow(row);
    setOriginalSelectedRow({ ...row });
    tableState.setIsOpen(true);
  };

  const validateAddForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newOrg.name.trim()) newErrors.name = 'Name is required';
    
    // Check if at least one organisation type is selected
    const hasOrgType = newOrg.role_civic || newOrg.role_donor || newOrg.role_network || 
                      newOrg.role_referrer || newOrg.role_supplier || newOrg.role_supporter || 
                      newOrg.role_venue || newOrg.role_volunteer;
    if (!hasOrgType) newErrors.orgTypes = 'At least one organisation type must be selected';
    
    // Check venue type validation when venue is selected
    if (newOrg.role_venue === 1) {
      const hasVenueType = newOrg.reader_venue || newOrg.general_venue;
      if (!hasVenueType) newErrors.venueTypes = 'At least one venue type must be selected when Venue is checked';
    }
    
    tableState.setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEditForm = () => {
    const newErrors: Record<string, string> = {};
    if (selectedRow && !selectedRow.name.trim()) newErrors.name = 'Name is required';
    
    // Check if at least one organisation type is selected
    if (selectedRow) {
      const hasOrgType = selectedRow.role_civic || selectedRow.role_donor || selectedRow.role_network || 
                        selectedRow.role_referrer || selectedRow.role_supplier || selectedRow.role_supporter || 
                        selectedRow.role_venue || selectedRow.role_volunteer;
      if (!hasOrgType) newErrors.orgTypes = 'At least one organisation type must be selected';
      
      // Check venue type validation when venue is selected
      if (selectedRow.role_venue === 1) {
        const hasVenueType = selectedRow.reader_venue || selectedRow.general_venue;
        if (!hasVenueType) newErrors.venueTypes = 'At least one venue type must be selected when Venue is checked';
      }
    }
    
    tableState.setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateEditForm()) return;
    
    if (selectedRow) {
      tableState.setIsSaving(true);
      const result = await editOrg({
        org_id: selectedRow.org_id,
        name: selectedRow.name,
        area_id: selectedRow.area_id,
        role_civic: selectedRow.role_civic,
        role_donor: selectedRow.role_donor,
        role_network: selectedRow.role_network,
        role_referrer: selectedRow.role_referrer,
        role_supplier: selectedRow.role_supplier,
        role_supporter: selectedRow.role_supporter,
        role_venue: selectedRow.role_venue,
        role_volunteer: selectedRow.role_volunteer,
        reader_venue: selectedRow.reader_venue,
        general_venue: selectedRow.general_venue,
        address: selectedRow.address || undefined,
        description: selectedRow.description || undefined,
        url: selectedRow.url || undefined,
        status: selectedRow.status || undefined,
        summary: selectedRow.summary || undefined,
        action: selectedRow.action,
        disabled: selectedRow.disabled,
      });
      
      tableState.setIsSaving(false);
      if (result.success) {
        onSave(selectedRow);
        tableState.setIsOpen(false);
        setHasUnsavedEditChanges(false);
        setOriginalSelectedRow(null);
      } else {
        tableState.setErrorMessage(asString(result.message, 'An error occurred while saving'));
        tableState.setShowError(true);
      }
    }
  };

  const handleCloseEditModal = () => {
    if (hasUnsavedEditChanges) {
      setShowUnsavedEditDialog(true);
    } else {
      tableState.setIsOpen(false);
      setHasUnsavedEditChanges(false);
      setOriginalSelectedRow(null);
    }
  };

  const handleConfirmEditClose = () => {
    tableState.setIsOpen(false);
    setSelectedRow(null);
    setOriginalSelectedRow(null);
    setHasUnsavedEditChanges(false);
    setShowUnsavedEditDialog(false);
    tableState.setErrors({});
  };

  const handleAddOrg = async () => {
    if (!validateAddForm()) return;
    
    tableState.setIsSaving(true);
    const result = await addOrg({
      name: newOrg.name,
      area_id: newOrg.area_id || undefined,
      role_civic: newOrg.role_civic,
      role_donor: newOrg.role_donor,
      role_network: newOrg.role_network,
      role_referrer: newOrg.role_referrer,
      role_supplier: newOrg.role_supplier,
      role_supporter: newOrg.role_supporter,
      role_venue: newOrg.role_venue,
      role_volunteer: newOrg.role_volunteer,
      reader_venue: newOrg.reader_venue,
      general_venue: newOrg.general_venue,
      address: newOrg.address || undefined,
      description: newOrg.description,
      url: newOrg.url || undefined,
      status: newOrg.status || undefined,
      summary: newOrg.summary || undefined,
      action: newOrg.action,
    });
    
    tableState.setIsSaving(false);
    if (result.success) {
      onSave({} as Org);
      setIsAddOpen(false);
      setNewOrg({
        name: '', 
        affiliate_id: 1,
        area_id: null,
        role_civic: 0,
        role_donor: 0,
        role_network: 0,
        role_referrer: 0,
        role_supplier: 0,
        role_supporter: 0,
        role_venue: 0,
        role_volunteer: 0,
        reader_venue: 0,
        general_venue: 0,
        address: '',
        description: '',
        url: '',
        status: '',
        summary: '',
        action: 0
      });
      setHasUnsavedChanges(false);
      tableState.setErrors({});
    } else {
      tableState.setErrorMessage(asString(result.message, 'An error occurred while adding organisation'));
      tableState.setShowError(true);
    }
  };

  const handleCloseAddModal = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      setIsAddOpen(false);
    }
  };

  const handleConfirmClose = () => {
    setIsAddOpen(false);
    setNewOrg({
      name: '', 
      affiliate_id: 1,
      area_id: null,
      role_civic: 0,
      role_donor: 0,
      role_network: 0,
      role_referrer: 0,
      role_supplier: 0,
      role_supporter: 0,
      role_venue: 0,
      role_volunteer: 0,
      reader_venue: 0,
      general_venue: 0,
      address: '',
      description: '',
      url: '',
      status: '',
      summary: '',
      action: 0
    });
    setHasUnsavedChanges(false);
    setShowUnsavedDialog(false);
    tableState.setErrors({});
  };

  const renderMobileCard = (org: Org) => (
    <div className='bg-white border rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md'>
      <div className='flex justify-between items-start mb-2'>
        <h3 className='font-semibold text-gray-900'>{org.name}</h3>
        <span className={`px-2 py-1 text-xs rounded-full ${
          org.disabled === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {org.disabled === 0 ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <p className='text-sm text-gray-600 mb-1'>{getOrgTypes(org) || 'No type specified'}</p>
      <div className='flex justify-end items-center text-xs text-gray-500'>
        <span className={`px-2 py-1 rounded-full ${
          org.action ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
        }`}>
          Action: {org.action ? 'yes' : 'no'}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <BaseTable
      data={filteredData}
      columns={columns}
      onRowClick={handleRowClick}
      globalFilter={tableState.globalFilter}
      onGlobalFilterChange={tableState.setGlobalFilter}
      sorting={tableState.sorting}
      onSortingChange={tableState.setSorting}
      renderMobileCard={renderMobileCard}
    >
      <div className='flex flex-col sm:flex-row gap-2 mb-4'>
        <div className='flex-1 relative'>
          <input
            id='filter-orgs'
            name='filter'
            type='text'
            placeholder='Filter...'
            className='w-full rounded-md border p-2 text-sm pr-64 sm:pr-64'
            value={tableState.globalFilter ?? ''}
            onChange={(e) => tableState.setGlobalFilter(e.target.value)}
          />
          <div className='absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 text-xs'>
            {setShowReaderVenues && (
              <label htmlFor='show-reader-venues' className='flex items-center gap-1 whitespace-nowrap'>
                <input
                  id='show-reader-venues'
                  name='showReaderVenues'
                  type='checkbox'
                  checked={showReaderVenues}
                  onChange={(e) => setShowReaderVenues(e.target.checked)}
                  className='rounded'
                />
                <span>Show Reader venues</span>
              </label>
            )}
            {setShowDisabled && (
              <label htmlFor='show-unavailable-orgs' className='flex items-center gap-1 whitespace-nowrap'>
                <input
                  id='show-unavailable-orgs'
                  name='showUnavailable'
                  type='checkbox'
                  checked={showDisabled}
                  onChange={(e) => setShowDisabled(e.target.checked)}
                  className='rounded'
                />
                <span>Show unavailable</span>
              </label>
            )}
          </div>
        </div>
        {userRole !== 'viewer' && (
          <Button variant='primary' onClick={() => setIsAddOpen(true)} className='sm:whitespace-nowrap'>
            Add Organisation
          </Button>
        )}
      </div>
    </BaseTable>

      <Dialog open={tableState.isOpen} onClose={() => {}} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <div>
                <DialogTitle className='text-lg font-semibold'>Edit Organisation</DialogTitle>
                <p className='text-sm text-blue-600 font-bold'>ID: {selectedRow?.org_id} • {selectedRow?.name}</p>
              </div>
              <button onClick={handleCloseEditModal}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>

            {selectedRow && (
              <TabGroup>
                <TabList className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-4">
                  <Tab className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                      selected
                        ? 'bg-white shadow'
                        : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                    }`
                  }>
                    Info
                  </Tab>
                  <Tab className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                      selected
                        ? 'bg-white shadow'
                        : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                    }`
                  }>
                    Contacts ({contactsData?.filter(contact => contact.disabled === 0).length || 0})
                  </Tab>
                  <Tab className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                      selected
                        ? 'bg-white shadow'
                        : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                    }`
                  }>
                    Notes ({notesData?.length || 0})
                  </Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSave();
                      }}
                      className='space-y-3 max-h-96 overflow-y-auto pr-2'
                    >
                      <div className='space-y-3'>
                        <div>
                          <label htmlFor='edit-org-name' className='block text-sm font-medium text-gray-700'>Name *</label>
                          <input
                            id='edit-org-name'
                            name='name'
                            autoComplete='off'
                            className={`w-full rounded-md border p-2 ${tableState.errors.name ? 'border-red-500' : ''}`}
                            value={selectedRow.name}
                            onChange={(e) => setSelectedRow({ ...selectedRow, name: e.target.value })}
                          />
                          {tableState.errors.name && <p className='text-red-500 text-xs mt-1'>{tableState.errors.name}</p>}
                        </div>
                        <div>
                          <label htmlFor='edit-org-area' className='block text-sm font-medium text-gray-700'>Area</label>
                          <select
                            id='edit-org-area'
                            name='area_id'
                            autoComplete='off'
                            className='w-full rounded-md border p-2'
                            value={selectedRow.area_id || ''}
                            onChange={(e) => setSelectedRow({ ...selectedRow, area_id: e.target.value ? Number(e.target.value) : null })}
                          >
                            <option value=''>-- Select an area --</option>
                            {orgAreas.map(area => (
                              <option key={area.area_id} value={area.area_id}>{area.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor='edit-org-description' className='block text-sm font-medium text-gray-700'>Description</label>
                          <textarea
                            id='edit-org-description'
                            name='description'
                            autoComplete='off'
                            className='w-full rounded-md border p-2'
                            rows={3}
                            value={selectedRow.description || ''}
                            onChange={(e) => setSelectedRow({ ...selectedRow, description: e.target.value })}
                          />
                        </div>
                        <div>
                          <div className='block text-sm font-medium text-gray-700 mb-2'>Organisation Types *</div>
                          <div className='grid grid-cols-2 gap-2'>
                            {Object.entries(orgTypeLabels).map(([key, label]) => (
                              <label key={key} htmlFor={`edit-role-${key}`} className={`flex items-center gap-2 text-sm ${key === 'venue' && !isManager ? 'opacity-50' : ''}`}>
                                <input
                                  id={`edit-role-${key}`}
                                  name={`role_${key}`}
                                  type='checkbox'
                                  checked={selectedRow[`role_${key}` as keyof Org] === 1}
                                  onChange={(e) => {
                                    const updates = { [`role_${key}`]: e.target.checked ? 1 : 0 };
                                    // Clear venue types when venue is unchecked
                                    if (key === 'venue' && !e.target.checked) {
                                      updates.reader_venue = 0;
                                      updates.general_venue = 0;
                                    }
                                    setSelectedRow({ ...selectedRow, ...updates });
                                  }}
                                  disabled={key === 'venue' && !isManager}
                                  className='rounded'
                                />
                                <span>{label}</span>
                              </label>
                            ))}
                          </div>
                          {tableState.errors.orgTypes && <p className='text-red-500 text-xs mt-1'>{tableState.errors.orgTypes}</p>}
                        </div>
                        {selectedRow.role_venue === 1 && (
                          <div>
                            <div className='block text-sm font-medium text-gray-700 mb-2'>Venue Type *</div>
                            <div className='grid grid-cols-2 gap-2'>
                              <label htmlFor='edit-reader-venue' className={`flex items-center gap-2 text-sm ${!isManager ? 'opacity-50' : ''}`}>
                                <input
                                  id='edit-reader-venue'
                                  name='reader_venue'
                                  type='checkbox'
                                  checked={selectedRow.reader_venue === 1}
                                  onChange={(e) => setSelectedRow({ 
                                    ...selectedRow, 
                                    reader_venue: e.target.checked ? 1 : 0 
                                  })}
                                  disabled={!isManager}
                                  className='rounded'
                                />
                                <span>Reader Venue</span>
                              </label>
                              <label htmlFor='edit-general-venue' className={`flex items-center gap-2 text-sm ${!isManager ? 'opacity-50' : ''}`}>
                                <input
                                  id='edit-general-venue'
                                  name='general_venue'
                                  type='checkbox'
                                  checked={selectedRow.general_venue === 1}
                                  onChange={(e) => setSelectedRow({ 
                                    ...selectedRow, 
                                    general_venue: e.target.checked ? 1 : 0 
                                  })}
                                  disabled={!isManager}
                                  className='rounded'
                                />
                                <span>General Venue</span>
                              </label>
                            </div>
                            {tableState.errors.venueTypes && <p className='text-red-500 text-xs mt-1'>{tableState.errors.venueTypes}</p>}
                          </div>
                        )}
                        <div>
                          <label htmlFor='edit-org-address' className='block text-sm font-medium text-gray-700'>Address</label>
                          <textarea
                            id='edit-org-address'
                            name='address'
                            autoComplete='off'
                            className='w-full rounded-md border p-2'
                            rows={2}
                            value={selectedRow.address || ''}
                            onChange={(e) => setSelectedRow({ ...selectedRow, address: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor='edit-org-url' className='block text-sm font-medium text-gray-700'>URL</label>
                          <input
                            id='edit-org-url'
                            name='url'
                            type='url'
                            autoComplete='off'
                            className='w-full rounded-md border p-2'
                            value={selectedRow.url || ''}
                            onChange={(e) => setSelectedRow({ ...selectedRow, url: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor='edit-org-status' className='block text-sm font-medium text-gray-700'>Status</label>
                          <textarea
                            id='edit-org-status'
                            name='status'
                            autoComplete='off'
                            className='w-full rounded-md border p-2'
                            rows={2}
                            value={selectedRow.status || ''}
                            onChange={(e) => setSelectedRow({ ...selectedRow, status: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor='edit-org-summary' className='block text-sm font-medium text-gray-700'>Summary</label>
                          <textarea
                            id='edit-org-summary'
                            name='summary'
                            autoComplete='off'
                            className='w-full rounded-md border p-2'
                            rows={2}
                            value={selectedRow.summary || ''}
                            onChange={(e) => setSelectedRow({ ...selectedRow, summary: e.target.value })}
                          />
                        </div>
                        <div className='grid grid-cols-2 gap-3'>
                          <div>
                            <label htmlFor='edit-org-action' className='block text-sm font-medium text-gray-700'>Action</label>
                            <select
                              id='edit-org-action'
                              name='action'
                              autoComplete='off'
                              className='w-full rounded-md border p-2'
                              value={selectedRow.action}
                              onChange={(e) => setSelectedRow({ ...selectedRow, action: Number(e.target.value) })}
                            >
                              <option value={0}>No</option>
                              <option value={1}>Yes</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor='edit-org-disabled' className='block text-sm font-medium text-gray-700'>Unavailable</label>
                            <select
                              id='edit-org-disabled'
                              name='disabled'
                              autoComplete='off'
                              className='w-full rounded-md border p-2'
                              value={selectedRow.disabled}
                              onChange={(e) => setSelectedRow({ ...selectedRow, disabled: Number(e.target.value) })}
                            >
                              <option value={0}>No</option>
                              <option value={1}>Yes</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className='flex justify-end gap-2 mt-4'>
                        <Button variant='secondary' type='button' onClick={handleCloseEditModal}>
                          Cancel
                        </Button>
                        {userRole !== 'viewer' && (
                          <Button type='submit' disabled={tableState.isSaving}>
                            {tableState.isSaving ? 'Saving...' : 'Save'}
                          </Button>
                        )}
                      </div>
                    </form>
                  </TabPanel>
                  <TabPanel>
                    <div className='max-h-96 overflow-y-auto'>
                      <ContactsDisplay 
                        ref={contactsRef}
                        data={contactsData} 
                        isLoading={contactsLoading ?? false} 
                        error={contactsError}
                        orgId={selectedRow.org_id}
                        onRefresh={() => contactsMutate?.()}
                      />
                    </div>
                    <div className='flex justify-between items-center mt-4'>
                      <Button variant='primary' type='button' onClick={handleAddContactClick}>
                        Add Contact
                      </Button>
                      <div className='flex gap-2'>
                        <Button variant='secondary' type='button' onClick={handleCloseEditModal}>
                          Cancel
                        </Button>
                        {userRole !== 'viewer' && (
                          <Button type='button' onClick={handleSave} disabled={tableState.isSaving}>
                            {tableState.isSaving ? 'Saving...' : 'Save'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </TabPanel>
                  <TabPanel>
                    <div className='max-h-96 overflow-y-auto'>
                      <OrgNotesDisplay 
                        ref={orgNotesRef}
                        data={notesData} 
                        isLoading={notesLoading ?? false} 
                        error={notesError}
                        aboutId={selectedRow.org_id}
                        onRefresh={() => notesMutate?.()}
                      />
                    </div>
                    <div className='flex justify-between items-center mt-4'>
                      <Button variant='primary' type='button' onClick={handleAddNoteClick}>
                        Add Note
                      </Button>
                      <div className='flex gap-2'>
                        <Button variant='secondary' type='button' onClick={handleCloseEditModal}>
                          Cancel
                        </Button>
                        {userRole !== 'viewer' && (
                          <Button type='button' onClick={handleSave} disabled={tableState.isSaving}>
                            {tableState.isSaving ? 'Saving...' : 'Save'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </TabPanel>
                </TabPanels>
              </TabGroup>
            )}
          </DialogPanel>
        </div>
      </Dialog>

      <CustomTableModal
        isOpen={isAddOpen}
        onClose={handleCloseAddModal}
        title='Add Organisation'
        data={null}
        onSave={handleAddOrg}
        isSaving={tableState.isSaving}
        showSaveButton={userRole !== 'viewer'}
      >
        {tableState.showError && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-md'>
            <p className='text-sm text-red-600'>{tableState.errorMessage}</p>
          </div>
        )}
        <div>
          <label htmlFor='add-org-name' className='block text-sm font-medium text-gray-700'>Name *</label>
          <input
            id='add-org-name'
            name='name'
            autoComplete='off'
            className={`w-full rounded-md border p-2 ${tableState.errors.name ? 'border-red-500' : ''}`}
            value={newOrg.name}
            onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
          />
          {tableState.errors.name && <p className='text-red-500 text-xs mt-1'>{tableState.errors.name}</p>}
        </div>
        <div>
          <label htmlFor='add-org-area' className='block text-sm font-medium text-gray-700'>Area</label>
          <select
            id='add-org-area'
            name='area_id'
            autoComplete='off'
            className='w-full rounded-md border p-2'
            value={newOrg.area_id || ''}
            onChange={(e) => setNewOrg({ ...newOrg, area_id: e.target.value ? Number(e.target.value) : null })}
          >
            <option value=''>-- Select an area --</option>
            {orgAreas.map(area => (
              <option key={area.area_id} value={area.area_id}>{area.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor='add-org-description' className='block text-sm font-medium text-gray-700'>Description</label>
          <textarea
            id='add-org-description'
            name='description'
            autoComplete='off'
            className='w-full rounded-md border p-2'
            rows={3}
            value={newOrg.description}
            onChange={(e) => setNewOrg({ ...newOrg, description: e.target.value })}
          />
        </div>
        <div>
          <div className='block text-sm font-medium text-gray-700 mb-2'>Organisation Types *</div>
          <div className='grid grid-cols-2 gap-2'>
            {Object.entries(orgTypeLabels).map(([key, label]) => (
              <label key={key} htmlFor={`add-role-${key}`} className={`flex items-center gap-2 text-sm ${key === 'venue' && !isManager ? 'opacity-50' : ''}`}>
                <input
                  id={`add-role-${key}`}
                  name={`role_${key}`}
                  type='checkbox'
                  checked={newOrg[`role_${key}` as keyof typeof newOrg] === 1}
                  onChange={(e) => {
                    const updates = { [`role_${key}`]: e.target.checked ? 1 : 0 };
                    // Clear venue types when venue is unchecked
                    if (key === 'venue' && !e.target.checked) {
                      updates.reader_venue = 0;
                      updates.general_venue = 0;
                    }
                    setNewOrg({ ...newOrg, ...updates });
                  }}
                  disabled={key === 'venue' && !isManager}
                  className='rounded'
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {tableState.errors.orgTypes && <p className='text-red-500 text-xs mt-1'>{tableState.errors.orgTypes}</p>}
        </div>
        {newOrg.role_venue === 1 && (
          <div>
            <div className='block text-sm font-medium text-gray-700 mb-2'>Venue Type *</div>
            <div className='grid grid-cols-2 gap-2'>
              <label htmlFor='add-reader-venue' className={`flex items-center gap-2 text-sm ${!isManager ? 'opacity-50' : ''}`}>
                <input
                  id='add-reader-venue'
                  name='reader_venue'
                  type='checkbox'
                  checked={newOrg.reader_venue === 1}
                  onChange={(e) => setNewOrg({ 
                    ...newOrg, 
                    reader_venue: e.target.checked ? 1 : 0 
                  })}
                  disabled={!isManager}
                  className='rounded'
                />
                <span>Reader Venue</span>
              </label>
              <label htmlFor='add-general-venue' className={`flex items-center gap-2 text-sm ${!isManager ? 'opacity-50' : ''}`}>
                <input
                  id='add-general-venue'
                  name='general_venue'
                  type='checkbox'
                  checked={newOrg.general_venue === 1}
                  onChange={(e) => setNewOrg({ 
                    ...newOrg, 
                    general_venue: e.target.checked ? 1 : 0 
                  })}
                  disabled={!isManager}
                  className='rounded'
                />
                <span>General Venue</span>
              </label>
            </div>
            {tableState.errors.venueTypes && <p className='text-red-500 text-xs mt-1'>{tableState.errors.venueTypes}</p>}
          </div>
        )}
        <div>
          <label htmlFor='add-org-address' className='block text-sm font-medium text-gray-700'>Address</label>
          <textarea
            id='add-org-address'
            name='address'
            autoComplete='off'
            className='w-full rounded-md border p-2'
            rows={2}
            value={newOrg.address}
            onChange={(e) => setNewOrg({ ...newOrg, address: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor='add-org-url' className='block text-sm font-medium text-gray-700'>URL</label>
          <input
            id='add-org-url'
            name='url'
            type='url'
            autoComplete='off'
            className='w-full rounded-md border p-2'
            value={newOrg.url}
            onChange={(e) => setNewOrg({ ...newOrg, url: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor='add-org-status' className='block text-sm font-medium text-gray-700'>Status</label>
          <textarea
            id='add-org-status'
            name='status'
            autoComplete='off'
            className='w-full rounded-md border p-2'
            rows={2}
            value={newOrg.status}
            onChange={(e) => setNewOrg({ ...newOrg, status: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor='add-org-summary' className='block text-sm font-medium text-gray-700'>Summary</label>
          <textarea
            id='add-org-summary'
            name='summary'
            autoComplete='off'
            className='w-full rounded-md border p-2'
            rows={2}
            value={newOrg.summary}
            onChange={(e) => setNewOrg({ ...newOrg, summary: e.target.value })}
          />
        </div>
      </CustomTableModal>

      <Dialog open={showUnsavedEditDialog} onClose={() => {}} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <DialogTitle className='text-lg font-semibold mb-4'>Unsaved Changes</DialogTitle>
            <p className='text-sm text-gray-600 mb-6'>
              You have unsaved changes. Are you sure you want to cancel?
            </p>
            <div className='flex justify-end gap-2'>
              <Button variant='secondary' onClick={() => setShowUnsavedEditDialog(false)}>
                No
              </Button>
              <Button variant='primary' onClick={handleConfirmEditClose}>
                Yes
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog open={showUnsavedDialog} onClose={() => {}} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <DialogTitle className='text-lg font-semibold mb-4'>Unsaved Changes</DialogTitle>
            <p className='text-sm text-gray-600 mb-6'>
              You have unsaved changes. Are you sure you want to cancel?
            </p>
            <div className='flex justify-end gap-2'>
              <Button variant='secondary' onClick={() => setShowUnsavedDialog(false)}>
                No
              </Button>
              <Button variant='primary' onClick={handleConfirmClose}>
                Yes
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <ErrorDialog
        isOpen={tableState.showError}
        onClose={() => tableState.setShowError(false)}
        title='Error'
        message={tableState.errorMessage}
      />

      {tableState.isSaving && <Loading />}
    </>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------