import { useState, useMemo, useCallback } from 'react';
import React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';

import { addReferral, editReferral } from '@lib/api/apiReferrals';
import { asString } from '@lib/helper';
import { referralfStatusLabels, type TReferralStatus } from '@lib/types';
import { type TReferralSchema } from '@hooks/useReferrals';
import { useOrgs } from '@hooks/useOrg';
import { useContacts } from '@hooks/useContact';
import { useReferralNotes } from '@hooks/useNotes';
import { Button, ErrorDialog, Loading } from '@components/Common';
import { ReferralNotesDisplay, type ReferralNotesDisplayRef } from '@components/Common/ReferralNotesDisplay';
import { BaseTable, useTableState, createSortableHeader } from '../BaseTable';

// -----------------------------------------------------------------------------

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
  return (
    <Dialog open={isOpen} onClose={() => {}} className='relative z-50'>
      <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <DialogPanel className='w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg'>
          <div className='flex justify-between items-start mb-4'>
            <div>
              <DialogTitle className='text-lg font-semibold'>{title}</DialogTitle>
              {data && 'referral_id' in (data as Record<string, unknown>) && (
                <p className='text-sm text-blue-600 font-bold'>ID: {String((data as Record<string, unknown>).referral_id)}</p>
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
            className='space-y-3 max-h-[500px] overflow-y-auto pr-2'
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

interface RTableProps {
  data: TReferralSchema[];
  onSave: () => void;
  showClosed?: boolean;
  setShowClosed?: (show: boolean) => void;
  showAddButton?: boolean;
}

export function RTable({ data, onSave, showClosed, setShowClosed, showAddButton = true }: RTableProps): React.JSX.Element {
  const tableState = useTableState({ id: 'referral_at', desc: true });
  const { data: orgsData } = useOrgs();
  const { data: contactsData } = useContacts();
  const [selectedRow, setSelectedRow] = useState<TReferralSchema | null>(null);
  const [originalSelectedRow, setOriginalSelectedRow] = useState<TReferralSchema | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasUnsavedEditChanges, setHasUnsavedEditChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showUnsavedEditDialog, setShowUnsavedEditDialog] = useState(false);
  const { data: notesData, error: notesError, isLoading: notesLoading, mutate: notesMutate } = useReferralNotes(selectedRow?.referral_id);
  const referralNotesRef = React.useRef<ReferralNotesDisplayRef>(null);
  const [newReferral, setNewReferral] = useState({
    org_id: 0,
    contact_id: null as number | null,
    by_id: 0,
    status: 'new' as TReferralStatus,
    referral: '',
    referral_at: new Date().toISOString().split('T')[0],
  });

  const copyToClipboard = useCallback(async () => {
    if (!data || data.length === 0) return;
    
    const headers = ['ID', 'Date', 'By', 'Organisation', 'Area', 'Status', 'Contact'];
    const rows = data.map(referral => [
      referral.referral_id.toString(),
      referral.referral_at,
      `${referral.first_name} ${referral.last_name}`,
      referral.org_name,
      referral.area_name || '',
      referralfStatusLabels[referral.status],
      referral.contact_name || ''
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
  }, [data, tableState]);

  const columns: ColumnDef<TReferralSchema>[] = [
    {
      accessorKey: 'referral_id',
      header: createSortableHeader('ID', true, copyToClipboard, tableState.showCopied),
      cell: ({ row }) => {
        const readerName = row.original.reader_name;
        const pillClass = readerName 
          ? 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm'
          : 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm';
        return (
          <span className={pillClass}>
            {row.original.referral_id}
          </span>
        );
      },
    },
    {
      accessorKey: 'referral_at',
      header: createSortableHeader('Date'),
      cell: ({ getValue }) => {
        const date = new Date(getValue() as string);
        return date.toLocaleDateString('en-GB');
      },
    },
    {
      id: 'by',
      header: createSortableHeader('By'),
      accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    },
    {
      accessorKey: 'org_name',
      header: createSortableHeader('Organisation'),
    },
    {
      accessorKey: 'area_name',
      header: createSortableHeader('Area'),
      cell: ({ getValue }) => getValue() || '',
    },
    {
      accessorKey: 'status',
      header: createSortableHeader('Status'),
      cell: ({ getValue }) => {
        const status = getValue() as keyof typeof referralfStatusLabels;
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'new':
              return 'bg-green-100 text-green-800';
            case 'pending':
              return 'bg-blue-100 text-blue-800';
            case 'onhold':
              return 'bg-yellow-100 text-yellow-800';
            case 'closed-successful':
              return 'bg-fuchsia-100 text-fuchsia-800';
            case 'closed-withdrew':
              return 'bg-orange-100 text-orange-800';
            case 'closed-unable':
              return 'bg-red-100 text-red-800';
            default:
              return 'bg-gray-100 text-gray-800';
          }
        };
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(status)}`}>
            {referralfStatusLabels[status]}
          </span>
        );
      },
    },
    {
      accessorKey: 'contact_name',
      header: createSortableHeader('Contact'),
      cell: ({ getValue }) => getValue() || '',
    },
  ];

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (showClosed) return data;
    return data.filter(referral => !referral.status.startsWith('closed-'));
  }, [data, showClosed]);

  const handleRowClick = (row: TReferralSchema) => {
    setSelectedRow(row);
    setOriginalSelectedRow({ ...row });
    tableState.setIsOpen(true);
  };

  // Track unsaved edit changes
  React.useEffect(() => {
    if (selectedRow && originalSelectedRow) {
      const hasChanges = JSON.stringify(selectedRow) !== JSON.stringify(originalSelectedRow);
      setHasUnsavedEditChanges(hasChanges);
    } else {
      setHasUnsavedEditChanges(false);
    }
  }, [selectedRow, originalSelectedRow]);

  const validateAddForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newReferral.org_id) newErrors.org_id = 'Organisation is required';
    if (!newReferral.referral.trim()) newErrors.referral = 'Enquiry is required';
    if (!newReferral.referral_at) newErrors.referral_at = 'Date is required';
    tableState.setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Track unsaved changes
  React.useEffect(() => {
    const initialNewReferral = {
      org_id: 0,
      contact_id: null as number | null,
      by_id: 0,
      status: 'new' as TReferralStatus,
      referral: '',
      referral_at: new Date().toISOString().split('T')[0],
    };
    const hasChanges = JSON.stringify(newReferral) !== JSON.stringify(initialNewReferral);
    setHasUnsavedChanges(hasChanges);
  }, [newReferral]);

  const validateEditForm = () => {
    const newErrors: Record<string, string> = {};
    if (selectedRow && !selectedRow.referral.trim()) newErrors.referral = 'Enquiry is required';
    tableState.setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateEditForm()) return;
    
    if (selectedRow) {
      tableState.setIsSaving(true);
      const result = await editReferral({
        referral_id: selectedRow.referral_id,
        org_id: selectedRow.org_id,
        contact_id: selectedRow.contact_id,
        by_id: selectedRow.by_id,
        status: selectedRow.status,
        referral: selectedRow.referral,
        referral_at: selectedRow.referral_at,
      });
      
      tableState.setIsSaving(false);
      if (result.success) {
        onSave();
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

  const handleAddNoteClick = React.useCallback(() => {
    referralNotesRef.current?.openAddModal();
  }, []);

  const handleAddReferral = async () => {
    if (!validateAddForm()) return;
    
    tableState.setIsSaving(true);
    const result = await addReferral({
      org_id: newReferral.org_id,
      contact_id: newReferral.contact_id,
      by_id: newReferral.by_id,
      status: newReferral.status,
      referral: newReferral.referral,
      referral_at: newReferral.referral_at,
    });
    
    tableState.setIsSaving(false);
    if (result.success) {
      onSave();
      setIsAddOpen(false);
      setNewReferral({
        org_id: 0,
        contact_id: null,
        by_id: 0,
        status: 'new',
        referral: '',
        referral_at: new Date().toISOString().split('T')[0],
      });
      setHasUnsavedChanges(false);
      tableState.setErrors({});
    } else {
      tableState.setErrorMessage(asString(result.message, 'An error occurred while adding enquiry'));
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
    setNewReferral({
      org_id: 0,
      contact_id: null,
      by_id: 0,
      status: 'new',
      referral: '',
      referral_at: new Date().toISOString().split('T')[0],
    });
    setHasUnsavedChanges(false);
    setShowUnsavedDialog(false);
    tableState.setErrors({});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'onhold':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed-successful':
        return 'bg-fuchsia-100 text-fuchsia-800';
      case 'closed-withdrew':
        return 'bg-orange-100 text-orange-800';
      case 'closed-unable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderMobileCard = (referral: TReferralSchema) => (
    <div className='bg-white border rounded-lg p-4 shadow-sm'>
      <div className='flex justify-between items-start mb-2'>
        <h3 className='font-semibold text-gray-900'>ID: {referral.referral_id}</h3>
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(referral.status)}`}>
          {referralfStatusLabels[referral.status]}
        </span>
      </div>
      <p className='text-sm text-gray-600 mb-1'>{referral.org_name}</p>
      <p className='text-sm text-gray-600 mb-1'>By: {referral.first_name} {referral.last_name}</p>
      <div className='flex justify-between items-center text-xs text-gray-500'>
        <span>{new Date(referral.referral_at).toLocaleDateString('en-GB')}</span>
        <span>{referral.contact_name || 'No contact'}</span>
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
              id='referrals-filter'
              name='filter'
              type='text'
              placeholder='Filter...'
              autoComplete='off'
              className='w-full rounded-md border p-2 text-sm pr-32'
              value={tableState.globalFilter ?? ''}
              onChange={(e) => tableState.setGlobalFilter(e.target.value)}
            />
            {setShowClosed && (
              <label htmlFor='show-closed-referrals' className='absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs'>
                <input
                  id='show-closed-referrals'
                  name='showClosed'
                  type='checkbox'
                  checked={showClosed}
                  onChange={(e) => setShowClosed(e.target.checked)}
                  className='rounded'
                />
                <span>Show closed</span>
              </label>
            )}
          </div>
          {showAddButton && (
            <Button variant='primary' onClick={() => setIsAddOpen(true)} className='sm:whitespace-nowrap'>
              Add Enquiry
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
                <DialogTitle className='text-lg font-semibold'>Edit Enquiry</DialogTitle>
                {selectedRow && (
                  <p className='text-sm text-blue-600 font-bold'>ID: {selectedRow.referral_id}</p>
                )}
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
                      className='space-y-3 max-h-[500px] overflow-y-auto pr-2'
                    >
                      <div className='space-y-3'>
                        <div>
                          <label htmlFor='edit-org' className='block text-sm font-medium text-gray-700'>Organisation *</label>
                          <select
                            id='edit-org'
                            name='org_id'
                            autoComplete='off'
                            className='w-full rounded-md border p-2'
                            value={selectedRow.org_id}
                            onChange={(e) => setSelectedRow({ ...selectedRow, org_id: Number(e.target.value), contact_id: null })}
                          >
                            <option value={0}>-- Select an organisation --</option>
                            {orgsData?.filter(org => org.disabled === 0 && org.role_referrer === 1).map(org => (
                              <option key={org.org_id} value={org.org_id}>{org.name}{org.area_name ? ` (${org.area_name})` : ''}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor='edit-contact' className='block text-sm font-medium text-gray-700'>Contact</label>
                          <select
                            id='edit-contact'
                            name='contact_id'
                            autoComplete='off'
                            className='w-full rounded-md border p-2'
                            value={selectedRow.contact_id || ''}
                            onChange={(e) => setSelectedRow({ ...selectedRow, contact_id: e.target.value ? Number(e.target.value) : null })}
                          >
                            <option value=''>-- Select a contact --</option>
                            {contactsData?.filter(contact => contact.disabled === 0 && contact.org_id === selectedRow.org_id).map(contact => (
                              <option key={contact.contact_id} value={contact.contact_id}>{contact.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className='flex items-center gap-4 mb-1'>
                            <label htmlFor='edit-referral' className='block text-sm font-medium text-gray-700'>Enquiry *</label>
                            <p className='text-xs text-gray-500'>Do not include any personal data about potential Readers</p>
                          </div>
                          <textarea
                            id='edit-referral'
                            name='referral'
                            autoComplete='off'
                            className={`w-full rounded-md border p-2 ${tableState.errors.referral ? 'border-red-500' : ''}`}
                            rows={3}
                            value={selectedRow.referral}
                            onChange={(e) => setSelectedRow({ ...selectedRow, referral: e.target.value })}
                          />
                          {tableState.errors.referral && <p className='text-red-500 text-xs mt-1'>{tableState.errors.referral}</p>}
                        </div>
                        <div className='grid grid-cols-3 gap-3'>
                          <div>
                            <label htmlFor='edit-reader-name' className='block text-sm font-medium text-gray-700'>Reader Name</label>
                            <input
                              id='edit-reader-name'
                              name='reader_name'
                              type='text'
                              autoComplete='off'
                              className='w-full rounded-md border p-2 bg-gray-50'
                              value={selectedRow.reader_name || ''}
                              readOnly
                            />
                          </div>
                          <div>
                            <label htmlFor='edit-status' className='block text-sm font-medium text-gray-700'>Status</label>
                            <select
                              id='edit-status'
                              name='status'
                              autoComplete='off'
                              className='w-full rounded-md border p-2'
                              value={selectedRow.status}
                              onChange={(e) => setSelectedRow({ ...selectedRow, status: e.target.value as TReferralStatus })}
                            >
                              {Object.entries(referralfStatusLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor='edit-date' className='block text-sm font-medium text-gray-700'>Date *</label>
                            <input
                              id='edit-date'
                              name='referral_at'
                              type='date'
                              autoComplete='off'
                              className='w-full rounded-md border p-2'
                              value={selectedRow.referral_at.split('T')[0].split(' ')[0]}
                              onChange={(e) => setSelectedRow({ ...selectedRow, referral_at: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                      <div className='flex justify-end gap-2 mt-4'>
                        <Button variant='secondary' type='button' onClick={handleCloseEditModal}>
                          Cancel
                        </Button>
                        {showAddButton && (
                          <Button type='submit' disabled={tableState.isSaving}>
                            {tableState.isSaving ? 'Saving...' : 'Save'}
                          </Button>
                        )}
                      </div>
                    </form>
                  </TabPanel>
                  <TabPanel>
                    <div className='max-h-[500px] overflow-y-auto'>
                      <ReferralNotesDisplay 
                        ref={referralNotesRef}
                        data={notesData} 
                        isLoading={notesLoading ?? false} 
                        error={notesError}
                        aboutId={selectedRow.referral_id}
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
                        {showAddButton && (
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
        title='Add Enquiry'
        data={null}
        onSave={handleAddReferral}
        isSaving={tableState.isSaving}
        showSaveButton={true}
      >
        <div>
          <label htmlFor='add-org' className='block text-sm font-medium text-gray-700'>Organisation *</label>
          <select
            id='add-org'
            name='org_id'
            autoComplete='off'
            className={`w-full rounded-md border p-2 ${tableState.errors.org_id ? 'border-red-500' : ''}`}
            value={newReferral.org_id}
            onChange={(e) => setNewReferral({ ...newReferral, org_id: Number(e.target.value), contact_id: null })}
          >
            <option value={0}>-- Select an organisation --</option>
            {orgsData?.filter(org => org.disabled === 0 && org.role_referrer === 1).map(org => (
              <option key={org.org_id} value={org.org_id}>{org.name}{org.area_name ? ` (${org.area_name})` : ''}</option>
            ))}
          </select>
          {tableState.errors.org_id && <p className='text-red-500 text-xs mt-1'>{tableState.errors.org_id}</p>}
        </div>
        <div>
          <label htmlFor='add-contact' className='block text-sm font-medium text-gray-700'>Contact</label>
          <select
            id='add-contact'
            name='contact_id'
            autoComplete='off'
            className='w-full rounded-md border p-2'
            value={newReferral.contact_id || ''}
            onChange={(e) => setNewReferral({ ...newReferral, contact_id: e.target.value ? Number(e.target.value) : null })}
          >
            <option value=''>-- Select a contact --</option>
            {contactsData?.filter(contact => contact.disabled === 0 && contact.org_id === newReferral.org_id).map(contact => (
              <option key={contact.contact_id} value={contact.contact_id}>{contact.name}</option>
            ))}
          </select>
        </div>
        <div>
          <div className='flex items-center gap-4 mb-1'>
            <label htmlFor='add-referral' className='block text-sm font-medium text-gray-700'>Enquiry *</label>
            <p className='text-xs text-gray-500'>Do not include any personal data about potential Readers</p>
          </div>
          <textarea
            id='add-referral'
            name='referral'
            autoComplete='off'
            className={`w-full rounded-md border p-2 ${tableState.errors.referral ? 'border-red-500' : ''}`}
            rows={3}
            value={newReferral.referral}
            onChange={(e) => setNewReferral({ ...newReferral, referral: e.target.value })}
          />
          {tableState.errors.referral && <p className='text-red-500 text-xs mt-1'>{tableState.errors.referral}</p>}
        </div>
        <div>
          <label htmlFor='add-date' className='block text-sm font-medium text-gray-700'>Date *</label>
          <input
            id='add-date'
            name='referral_at'
            type='date'
            autoComplete='off'
            className={`w-full rounded-md border p-2 ${tableState.errors.referral_at ? 'border-red-500' : ''}`}
            value={newReferral.referral_at}
            onChange={(e) => setNewReferral({ ...newReferral, referral_at: e.target.value })}
          />
          {tableState.errors.referral_at && <p className='text-red-500 text-xs mt-1'>{tableState.errors.referral_at}</p>}
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