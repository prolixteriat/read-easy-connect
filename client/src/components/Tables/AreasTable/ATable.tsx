import { useState, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';

import { addArea, editArea } from '@lib/api/apiOrg';
import { asString} from '@lib/helper';
import { Button, ConfirmDialog, ErrorDialog, Loading } from '@components/Common';
import { BaseTable, TableModal, useTableState, createSortableHeader, createDisabledColumn } from '../BaseTable';

// -----------------------------------------------------------------------------

type Area = {
  area_id: number;
  name: string;
  affiliate_id: number;
  created_at: string;
  disabled: number;
  affiliate_name: string;
};

// -----------------------------------------------------------------------------

interface ATableProps {
  data: Area[];
  onSave: () => void;
}

export function ATable({ data, onSave }: ATableProps): React.JSX.Element {
  const tableState = useTableState({ id: 'name', desc: false });
  const [selectedRow, setSelectedRow] = useState<Area | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newArea, setNewArea] = useState({ name: '' });

  const copyToClipboard = useCallback(async () => {
    if (!data || data.length === 0) return;
    
    const headers = ['Name', 'Affiliate', 'Disabled'];
    const rows = data.map(area => [
      area.name,
      area.affiliate_name,
      area.disabled ? 'yes' : 'no'
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

  const columns: ColumnDef<Area>[] = [
    {
      accessorKey: 'name',
      header: createSortableHeader('Name', true, copyToClipboard, tableState.showCopied),
    },
    {
      accessorKey: 'affiliate_name',
      header: createSortableHeader('Affiliate'),
    },
    createDisabledColumn('disabled'),
  ];



  const handleRowClick = (row: Area) => {
    setSelectedRow(row);
    tableState.setIsOpen(true);
  };



  const handleConfirmCancel = () => {
    setShowConfirm(false);
    tableState.setIsOpen(false);
  };

  const hasAddChanges = newArea.name.trim();

  const handleAddCancel = () => {
    if (hasAddChanges) {
      setShowAddConfirm(true);
    } else {
      setIsAddOpen(false);
    }
  };

  const handleConfirmAddCancel = () => {
    setShowAddConfirm(false);
    setIsAddOpen(false);
    setNewArea({ name: '' });
    tableState.setErrors({});
  };

  const validateAddForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newArea.name.trim()) newErrors.name = 'Name is required';
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
      const result = await editArea({
        area_id: selectedRow.area_id,
        name: selectedRow.name,
        disabled: selectedRow.disabled === 1,
      });
      
      tableState.setIsSaving(false);
      if (result.success) {
        onSave();
        tableState.setIsOpen(false);
      } else {
        tableState.setErrorMessage(asString(result.message, 'An error occurred while saving'));
        tableState.setShowError(true);
      }
    }
  };

  const handleAddArea = async () => {
    if (!validateAddForm()) return;
    
    tableState.setIsSaving(true);
    const result = await addArea({
      name: newArea.name,
    });
    
    tableState.setIsSaving(false);
    if (result.success) {
      onSave();
      setIsAddOpen(false);
      setNewArea({ name: '' });
      tableState.setErrors({});
    } else {
      tableState.setErrorMessage(asString(result.message, 'An error occurred while adding area'));
      tableState.setShowError(true);
    }
  };

  const renderMobileCard = (area: Area) => (
    <div className='bg-white border rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md'>
      <div className='flex justify-between items-start mb-2'>
        <h3 className='font-semibold text-gray-900'>{area.name}</h3>
        <span className={`px-2 py-1 text-xs rounded-full ${
          area.disabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {area.disabled ? 'Disabled' : 'Active'}
        </span>
      </div>
      <p className='text-sm text-gray-600'>{area.affiliate_name}</p>
    </div>
  );

  return (
    <>
      <BaseTable
        data={data}
        columns={columns}
        onRowClick={handleRowClick}
        globalFilter={tableState.globalFilter}
        onGlobalFilterChange={tableState.setGlobalFilter}
        sorting={tableState.sorting}
        onSortingChange={tableState.setSorting}
        renderMobileCard={renderMobileCard}
      >
        <div className='flex flex-col sm:flex-row gap-2 mb-4'>
          <div className='flex-1'>
            <input
              type='text'
              placeholder='Filter...'
              className='w-full rounded-md border p-2 text-sm'
              value={tableState.globalFilter ?? ''}
              onChange={(e) => tableState.setGlobalFilter(e.target.value)}
            />
          </div>
          <Button variant='primary' onClick={() => setIsAddOpen(true)} className='sm:whitespace-nowrap'>
            Add Area
          </Button>
        </div>
      </BaseTable>

      <TableModal
        isOpen={tableState.isOpen}
        onClose={() => tableState.setIsOpen(false)}
        title='Edit Area'
        data={selectedRow}
        onSave={handleSave}
        isSaving={tableState.isSaving}
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
              <label className='block text-sm font-medium text-gray-700'>Disabled</label>
              <select
                className='w-full rounded-md border p-2'
                value={selectedRow.disabled}
                onChange={(e) => setSelectedRow({ ...selectedRow, disabled: Number(e.target.value) })}
              >
                <option value={0}>No</option>
                <option value={1}>Yes</option>
              </select>
            </div>
          </>
        )}
      </TableModal>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmCancel}
        title='Unsaved Changes'
        message='You have unsaved changes. Are you sure you want to cancel?'
      />
      
      <TableModal
        isOpen={isAddOpen}
        onClose={handleAddCancel}
        title='Add Area'
        data={null}
        onSave={handleAddArea}
        isSaving={tableState.isSaving}
      >
        <div>
          <label className='block text-sm font-medium text-gray-700'>Name *</label>
          <input
            className={`w-full rounded-md border p-2 ${tableState.errors.name ? 'border-red-500' : ''}`}
            value={newArea.name}
            onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
          />
          {tableState.errors.name && <p className='text-red-500 text-xs mt-1'>{tableState.errors.name}</p>}
        </div>
      </TableModal>

      <ConfirmDialog
        isOpen={showAddConfirm}
        onClose={() => setShowAddConfirm(false)}
        onConfirm={handleConfirmAddCancel}
        title='Unsaved Changes'
        message='You have unsaved changes. Are you sure you want to cancel?'
      />

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
