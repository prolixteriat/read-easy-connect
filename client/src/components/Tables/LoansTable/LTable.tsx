import { useState, useMemo, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';

import { editLoan, addLoan } from '@lib/api/apiLoans';
import { asString} from '@lib/helper';
import { type TLoanStatus } from '@lib/types';
import { type TLoanSchema } from '@hooks/useLoans';
import { type TReadersSchema } from '@hooks/useReaders';

import { Button, ErrorDialog, Loading } from '@components/Common';
import { BaseTable, TableModal, useTableState, createSortableHeader } from '../BaseTable';

// -----------------------------------------------------------------------------

interface LTableProps {
  data: TLoanSchema[];
  readers: TReadersSchema;
  onSave: (updatedRow: TLoanSchema) => void;
  showReturnedAndLost?: boolean;
  setShowReturnedAndLost?: (show: boolean) => void;
}

export function LTable({ data, readers, onSave, showReturnedAndLost, setShowReturnedAndLost }: LTableProps): React.JSX.Element {
  const tableState = useTableState({ id: 'reader_name', desc: false });
  const [selectedRow, setSelectedRow] = useState<TLoanSchema | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLoan, setNewLoan] = useState(() => ({ 
    reader_id: 0, 
    item: '', 
    loan_date: new Date().toISOString().split('T')[0],
    return_date: '',
    status: 'loaned' as TLoanStatus 
  }));

  const copyToClipboard = useCallback(async () => {
    if (!data || data.length === 0) return;
    
    const headers = ['Reader Name', 'Item', 'Status', 'Loan Date', 'Return Date'];
    const rows = data.map(loan => [
      loan.reader_name,
      loan.item,
      loan.status,
      loan.loan_date ? new Date(loan.loan_date).toLocaleDateString('en-GB') : '',
      loan.return_date ? new Date(loan.return_date).toLocaleDateString('en-GB') : ''
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

  const columns: ColumnDef<TLoanSchema>[] = [
    {
      accessorKey: 'reader_name',
      header: createSortableHeader('Reader Name', true, copyToClipboard, tableState.showCopied),
    },
    {
      accessorKey: 'item',
      header: createSortableHeader('Item'),
    },
    {
      accessorKey: 'status',
      header: createSortableHeader('Status'),
    },
    {
      accessorKey: 'loan_date',
      header: createSortableHeader('Loan Date'),
      cell: ({ getValue }) => {
        const date = getValue() as string;
        return date ? new Date(date).toLocaleDateString('en-GB') : '';
      },
    },
    {
      accessorKey: 'return_date',
      header: createSortableHeader('Return Date'),
      cell: ({ getValue }) => {
        const date = getValue() as string | null;
        return date ? new Date(date).toLocaleDateString('en-GB') : '';
      },
    },
  ];

  const filteredData = useMemo(() => {
    if (!data) return [];
    return showReturnedAndLost 
      ? data 
      : data.filter(loan => loan.status !== 'returned' && loan.status !== 'lost');
  }, [data, showReturnedAndLost]);

  const handleRowClick = (row: TLoanSchema) => {
    setSelectedRow(row);
    tableState.setIsOpen(true);
  };

  const validateAddForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newLoan.reader_id) newErrors.reader_id = 'Reader is required';
    if (!newLoan.item.trim()) newErrors.item = 'Item is required';
    if (!newLoan.loan_date) newErrors.loan_date = 'Loan date is required';
    tableState.setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (selectedRow) {
      tableState.setIsSaving(true);
      const result = await editLoan({
        loan_id: selectedRow.loan_id,
        item: selectedRow.item,
        loan_date: selectedRow.loan_date,
        return_date: selectedRow.return_date || undefined,
        status: selectedRow.status,
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

  const handleAddLoan = async () => {
    if (!validateAddForm()) return;
    
    tableState.setIsSaving(true);
    const result = await addLoan({
      reader_id: newLoan.reader_id,
      item: newLoan.item,
      loan_date: newLoan.loan_date,
      return_date: newLoan.return_date || undefined,
      status: newLoan.status,
    });
    
    tableState.setIsSaving(false);
    if (result.success) {
      onSave({} as TLoanSchema);
      setIsAddOpen(false);
      setNewLoan({ 
        reader_id: 0, 
        item: '', 
        loan_date: new Date().toISOString().split('T')[0],
        return_date: '',
        status: 'loaned' 
      });
      tableState.setErrors({});
    } else {
      tableState.setErrorMessage(asString(result.message, 'An error occurred while adding loan'));
      tableState.setShowError(true);
    }
  };

  const renderMobileCard = (loan: TLoanSchema) => (
    <div className='bg-white border rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md'>
      <div className='flex justify-between items-start mb-2'>
        <h3 className='font-semibold text-gray-900'>{loan.reader_name}</h3>
        <span className={`px-2 py-1 text-xs rounded-full ${
          loan.status === 'loaned' ? 'bg-blue-100 text-blue-800' :
          loan.status === 'returned' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {loan.status}
        </span>
      </div>
      <p className='text-sm text-gray-600 mb-1'>{loan.item}</p>
      <div className='flex justify-between items-center text-xs text-gray-500'>
        <span>Loaned: {new Date(loan.loan_date).toLocaleDateString('en-GB')}</span>
        {loan.return_date && <span>Returned: {new Date(loan.return_date).toLocaleDateString('en-GB')}</span>}
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
              className='w-full rounded-md border p-2 text-sm pr-48'
              value={tableState.globalFilter ?? ''}
              onChange={(e) => tableState.setGlobalFilter(e.target.value)}
            />
            {setShowReturnedAndLost && (
              <label className='absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs'>
                <input
                  type='checkbox'
                  checked={showReturnedAndLost}
                  onChange={(e) => setShowReturnedAndLost(e.target.checked)}
                  className='rounded'
                />
                <span>Show returned and lost</span>
              </label>
            )}
          </div>
          <Button variant='primary' onClick={() => setIsAddOpen(true)} className='sm:whitespace-nowrap'>
            Add Loan
          </Button>
        </div>
      </BaseTable>

      <TableModal
        isOpen={tableState.isOpen}
        onClose={() => tableState.setIsOpen(false)}
        title='Edit Loan'
        data={selectedRow}
        onSave={handleSave}
        isSaving={tableState.isSaving}
      >
        {selectedRow && (
          <>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Reader</label>
              <input
                className='w-full rounded-md border p-2 bg-gray-100'
                value={selectedRow.reader_name}
                disabled
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Item *</label>
              <input
                className='w-full rounded-md border p-2'
                value={selectedRow.item}
                onChange={(e) => setSelectedRow({ ...selectedRow, item: e.target.value })}
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Loan Date *</label>
              <input
                type='date'
                className='w-full rounded-md border p-2'
                value={selectedRow.loan_date ? new Date(selectedRow.loan_date).toISOString().split('T')[0] : ''}
                onChange={(e) => setSelectedRow({ ...selectedRow, loan_date: e.target.value })}
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Return Date</label>
              <input
                type='date'
                className='w-full rounded-md border p-2'
                value={selectedRow.return_date ? new Date(selectedRow.return_date).toISOString().split('T')[0] : ''}
                onChange={(e) => setSelectedRow({ ...selectedRow, return_date: e.target.value || null })}
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Status</label>
              <select
                className='w-full rounded-md border p-2'
                value={selectedRow.status}
                onChange={(e) => setSelectedRow({ ...selectedRow, status: e.target.value as TLoanStatus })}
              >
                <option value='loaned'>Loaned</option>
                <option value='returned'>Returned</option>
                <option value='lost'>Lost</option>
              </select>
            </div>
          </>
        )}
      </TableModal>

      <TableModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title='Add Loan'
        data={null}
        onSave={handleAddLoan}
        isSaving={tableState.isSaving}
      >
        <div>
          <label className='block text-sm font-medium text-gray-700'>Reader *</label>
          <select
            className={`w-full rounded-md border p-2 ${tableState.errors.reader_id ? 'border-red-500' : ''}`}
            value={newLoan.reader_id}
            onChange={(e) => setNewLoan({ ...newLoan, reader_id: Number(e.target.value) })}
          >
            <option value={0}>Select a reader</option>
            {readers.map((reader) => (
              <option key={reader.reader_id} value={reader.reader_id}>
                {reader.name}
              </option>
            ))}
          </select>
          {tableState.errors.reader_id && <p className='text-red-500 text-xs mt-1'>{tableState.errors.reader_id}</p>}
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700'>Item *</label>
          <input
            className={`w-full rounded-md border p-2 ${tableState.errors.item ? 'border-red-500' : ''}`}
            value={newLoan.item}
            onChange={(e) => setNewLoan({ ...newLoan, item: e.target.value })}
          />
          {tableState.errors.item && <p className='text-red-500 text-xs mt-1'>{tableState.errors.item}</p>}
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700'>Loan Date *</label>
          <input
            type='date'
            className={`w-full rounded-md border p-2 ${tableState.errors.loan_date ? 'border-red-500' : ''}`}
            value={newLoan.loan_date}
            onChange={(e) => setNewLoan({ ...newLoan, loan_date: e.target.value })}
          />
          {tableState.errors.loan_date && <p className='text-red-500 text-xs mt-1'>{tableState.errors.loan_date}</p>}
        </div>
      </TableModal>

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
