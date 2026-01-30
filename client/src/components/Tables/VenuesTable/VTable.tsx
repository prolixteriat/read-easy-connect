import { useState, useMemo, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

import { editVenue, addVenue } from '@lib/api/apiOrg';
import { asString} from '@lib/helper';
import { type TRole } from '@lib/types';
import { Button, ErrorDialog, Loading } from '@components/Common';
import { BaseTable, useTableState, createSortableHeader, createDisabledColumn } from '../BaseTable';

// -----------------------------------------------------------------------------

type Venue = {
  venue_id: number;
  name: string;
  affiliate_id: number;
  address: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_telephone: string | null;
  notes: string | null;
  created_at: string;
  disabled: number;
  affiliate_name: string;
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
  return (
    <Dialog open={isOpen} onClose={() => {}} className='relative z-50'>
      <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <DialogPanel className='w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg'>
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

interface VTableProps {
  data: Venue[];
  onSave: (updatedRow: Venue) => void;
  showDisabled?: boolean;
  setShowDisabled?: (show: boolean) => void;
  userRole: TRole | null;
}

export function VTable({ data, onSave, showDisabled, setShowDisabled, userRole }: VTableProps): React.JSX.Element {
  const tableState = useTableState({ id: 'name', desc: false });
  const [selectedRow, setSelectedRow] = useState<Venue | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newVenue, setNewVenue] = useState({ 
    name: '', 
    address: '', 
    contact_name: '', 
    contact_email: '', 
    contact_telephone: '', 
    notes: '' 
  });

  const copyToClipboard = useCallback(async () => {
    if (!data || data.length === 0) return;
    
    const headers = ['Name', 'Address', 'Unavailable'];
    const rows = data.map(venue => [
      venue.name,
      venue.address || '',
      venue.disabled ? 'yes' : 'no'
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

  const columns: ColumnDef<Venue>[] = [
    {
      accessorKey: 'name',
      header: createSortableHeader('Name', true, copyToClipboard, tableState.showCopied),
    },
    {
      accessorKey: 'address',
      header: createSortableHeader('Address'),
      cell: ({ getValue }) => getValue() || '',
    },
    createDisabledColumn('disabled'),
  ];

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (showDisabled) return data;
    return data.filter(venue => venue.disabled === 0);
  }, [data, showDisabled]);



  const handleRowClick = (row: Venue) => {
    setSelectedRow(row);
    tableState.setIsOpen(true);
  };

  const validateAddForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newVenue.name.trim()) newErrors.name = 'Name is required';
    tableState.setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEditForm = () => {
    const newErrors: Record<string, string> = {};
    if (selectedRow && !selectedRow.name.trim()) newErrors.name = 'Name is required';
    tableState.setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateEditForm()) return;
    
    if (selectedRow) {
      tableState.setIsSaving(true);
      const result = await editVenue({
        venue_id: selectedRow.venue_id,
        name: selectedRow.name,
        address: selectedRow.address || undefined,
        contact_name: selectedRow.contact_name || undefined,
        contact_email: selectedRow.contact_email || undefined,
        contact_telephone: selectedRow.contact_telephone || undefined,
        notes: selectedRow.notes || undefined,
        disabled: selectedRow.disabled,
      });
      
      tableState.setIsSaving(false);
      if (result.success) {
        onSave(selectedRow);
        tableState.setIsOpen(false);
      } else {
        tableState.setErrorMessage(asString(result.message, 'An error occurred while saving'));
        tableState.setShowError(true);
      }
    }
  };

  const handleAddVenue = async () => {
    if (!validateAddForm()) return;
    
    tableState.setIsSaving(true);
    const result = await addVenue({
      name: newVenue.name,
      address: newVenue.address || undefined,
      contact_name: newVenue.contact_name || undefined,
      contact_email: newVenue.contact_email || undefined,
      contact_telephone: newVenue.contact_telephone || undefined,
      notes: newVenue.notes || undefined,
    });
    
    tableState.setIsSaving(false);
    if (result.success) {
      onSave({} as Venue);
      setIsAddOpen(false);
      setNewVenue({ 
        name: '', 
        address: '', 
        contact_name: '', 
        contact_email: '', 
        contact_telephone: '', 
        notes: '' 
      });
      tableState.setErrors({});
    } else {
      tableState.setErrorMessage(asString(result.message, 'An error occurred while adding venue'));
      tableState.setShowError(true);
    }
  };

  const renderMobileCard = (venue: Venue) => (
    <div className='bg-white border rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md'>
      <div className='flex justify-between items-start mb-2'>
        <h3 className='font-semibold text-gray-900'>{venue.name}</h3>
        <span className={`px-2 py-1 text-xs rounded-full ${
          venue.disabled === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {venue.disabled === 0 ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <p className='text-sm text-gray-600 mb-1'>{venue.address || 'No address'}</p>
      <div className='flex justify-between items-center text-xs text-gray-500'>
        <span>{venue.affiliate_name}</span>
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
            type='text'
            placeholder='Filter...'
            className='w-full rounded-md border p-2 text-sm pr-32'
            value={tableState.globalFilter ?? ''}
            onChange={(e) => tableState.setGlobalFilter(e.target.value)}
          />
          {setShowDisabled && (
            <label className='absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs'>
              <input
                type='checkbox'
                checked={showDisabled}
                onChange={(e) => setShowDisabled(e.target.checked)}
                className='rounded'
              />
              <span>Show unavailable</span>
            </label>
          )}
        </div>
        {userRole !== 'viewer' && (
          <Button variant='primary' onClick={() => setIsAddOpen(true)} className='sm:whitespace-nowrap'>
            Add Venue
          </Button>
        )}
      </div>
    </BaseTable>

      <CustomTableModal
        isOpen={tableState.isOpen}
        onClose={() => tableState.setIsOpen(false)}
        title='Edit Venue'
        data={selectedRow}
        onSave={handleSave}
        isSaving={tableState.isSaving}
        showSaveButton={userRole !== 'viewer'}
      >
        {selectedRow && (
          <>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Name *</label>
              <input
                className={`w-full rounded-md border p-2 ${tableState.errors.name ? 'border-red-500' : ''}`}
                value={selectedRow.name}
                onChange={(e) => setSelectedRow({ ...selectedRow, name: e.target.value })}
              />
              {tableState.errors.name && <p className='text-red-500 text-xs mt-1'>{tableState.errors.name}</p>}
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Address</label>
              <textarea
                className='w-full rounded-md border p-2'
                rows={3}
                value={selectedRow.address || ''}
                onChange={(e) => setSelectedRow({ ...selectedRow, address: e.target.value })}
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Contact Name</label>
                <input
                  className='w-full rounded-md border p-2'
                  value={selectedRow.contact_name || ''}
                  onChange={(e) => setSelectedRow({ ...selectedRow, contact_name: e.target.value })}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Contact Telephone</label>
                <input
                  className='w-full rounded-md border p-2'
                  value={selectedRow.contact_telephone || ''}
                  onChange={(e) => setSelectedRow({ ...selectedRow, contact_telephone: e.target.value })}
                />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Contact Email</label>
                <input
                  type='email'
                  className='w-full rounded-md border p-2'
                  value={selectedRow.contact_email || ''}
                  onChange={(e) => setSelectedRow({ ...selectedRow, contact_email: e.target.value })}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Unavailable</label>
                <select
                  className='w-full rounded-md border p-2'
                  value={selectedRow.disabled}
                  onChange={(e) => setSelectedRow({ ...selectedRow, disabled: Number(e.target.value) })}
                >
                  <option value={0}>No</option>
                  <option value={1}>Yes</option>
                </select>
              </div>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Notes</label>
              <textarea
                className='w-full rounded-md border p-2'
                rows={3}
                value={selectedRow.notes || ''}
                onChange={(e) => setSelectedRow({ ...selectedRow, notes: e.target.value })}
              />
            </div>
          </>
        )}
      </CustomTableModal>


      
      <CustomTableModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title='Add Venue'
        data={null}
        onSave={handleAddVenue}
        isSaving={tableState.isSaving}
        showSaveButton={userRole !== 'viewer'}
      >
        <div>
          <label className='block text-sm font-medium text-gray-700'>Name *</label>
          <input
            className={`w-full rounded-md border p-2 ${tableState.errors.name ? 'border-red-500' : ''}`}
            value={newVenue.name}
            onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })}
          />
          {tableState.errors.name && <p className='text-red-500 text-xs mt-1'>{tableState.errors.name}</p>}
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700'>Address</label>
          <textarea
            className='w-full rounded-md border p-2'
            rows={3}
            value={newVenue.address}
            onChange={(e) => setNewVenue({ ...newVenue, address: e.target.value })}
          />
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label className='block text-sm font-medium text-gray-700'>Contact Name</label>
            <input
              className='w-full rounded-md border p-2'
              value={newVenue.contact_name}
              onChange={(e) => setNewVenue({ ...newVenue, contact_name: e.target.value })}
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700'>Contact Telephone</label>
            <input
              className='w-full rounded-md border p-2'
              value={newVenue.contact_telephone}
              onChange={(e) => setNewVenue({ ...newVenue, contact_telephone: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700'>Contact Email</label>
          <input
            type='email'
            className='w-full rounded-md border p-2'
            value={newVenue.contact_email}
            onChange={(e) => setNewVenue({ ...newVenue, contact_email: e.target.value })}
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700'>Notes</label>
          <textarea
            className='w-full rounded-md border p-2'
            rows={3}
            value={newVenue.notes}
            onChange={(e) => setNewVenue({ ...newVenue, notes: e.target.value })}
          />
        </div>
      </CustomTableModal>

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
