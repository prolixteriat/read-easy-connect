import { useState, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';

import { type TReaderSchema, type TReadersSchema } from '@hooks/useReaders';
import { useAreas } from '@hooks/useOrg';
import { useCoaches } from '@hooks/useCoaches';

import { editReader, addReader } from '@lib/api/apiReaders';
import { asString} from '@lib/helper';

import { Button, ConfirmDialog, ErrorDialog, Loading, HoverHelp, MessageDialog } from '@components/Common';
import { BaseTable, TableModal, useTableState, createSortableHeader, 
        createStatusColumn } from '../BaseTable';

// -----------------------------------------------------------------------------

type Reader = TReaderSchema;

// -----------------------------------------------------------------------------

interface RTableProps {
  data: TReadersSchema;
  onSave: (updatedRow: Reader) => void;
  showGDOC?: boolean;
  setShowGDOC?: (show: boolean) => void;
}

export function RTable({ data, onSave, showGDOC, setShowGDOC }: RTableProps): React.JSX.Element {
  const tableState = useTableState({ id: 'name', desc: false });
  const [selectedRow, setSelectedRow] = useState<Reader | null>(null);
  const [originalRow, setOriginalRow] = useState<Reader | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [addedReaderName, setAddedReaderName] = useState('');
  const [newReader, setNewReader] = useState({ 
    area_id: null as number | null,
    coach_id: null as number | null,
    enrolment_at: null as string | null,
    referrer_name: null as string | null,
    referrer_org: null as string | null,
    availability: null as string | null,
    notes: null as string | null
  });
  
  const { data: areasData } = useAreas();
  const { data: coachesData } = useCoaches();
  const areas = areasData?.filter(area => area.disabled === 0) || [];
  const availableCoaches = coachesData?.filter(coach => 
    coach.user_status !== 'leaver' && 
    coach.user_status !== 'onhold' && 
    (coach.status === 'trained' || coach.status === 'paired')
  ) || [];
  
  const currentCoach = selectedRow?.coach_id ? coachesData?.find(coach => coach.coach_id === selectedRow.coach_id) : null;
  const coaches = currentCoach && !availableCoaches.find(coach => coach.coach_id === currentCoach.coach_id)
    ? [currentCoach, ...availableCoaches]
    : availableCoaches;

  const copyToClipboard = useCallback(async () => {
    if (!data || data.length === 0) return;
    
    const headers = ['Reader ID', 'Level', 'Status', 'Area', 'Coach'];
    const rows = data.map(reader => [
      reader.name,
      reader.level,
      reader.status,
      reader.area_name || '',
      `${reader.coach_first_name || ''} ${reader.coach_last_name || ''}`.trim()
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

  const levelMap = {
    'TP1': { bg: 'bg-red-100', text: 'text-red-800' },
    'TP2': { bg: 'bg-purple-100', text: 'text-purple-800' },
    'TP3': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'TP4': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'TP5': { bg: 'bg-green-100', text: 'text-green-800' }
  };

  const statusMap = {
    'S': { bg: 'bg-green-100', text: 'text-green-800' },
    'P': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'NYS': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'DO': { bg: 'bg-red-100', text: 'text-red-800' },
    'G': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    'C': { bg: 'bg-gray-100', text: 'text-gray-800' }
  };

  const columns: ColumnDef<Reader>[] = [
    {
      accessorKey: 'name',
      header: createSortableHeader('Reader ID', true, copyToClipboard, tableState.showCopied),
    },
    {
      accessorKey: 'level',
      header: createSortableHeader('Level'),
      cell: ({ getValue }) => {
        const level = getValue() as string;
        const styles = levelMap[level as keyof typeof levelMap] || { bg: 'bg-gray-100', text: 'text-gray-800' };
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${styles.bg} ${styles.text}`}>
            {level}
          </span>
        );
      },
    },
    createStatusColumn('status', statusMap),
    {
      accessorKey: 'area_name',
      header: createSortableHeader('Area'),
    },
    {
      id: 'coach',
      enableSorting: true,
      header: createSortableHeader('Coach'),
      accessorFn: (row) => `${row.coach_first_name || ''} ${row.coach_last_name || ''}`.trim(),
      cell: ({ row }) => `${row.original.coach_first_name || ''} ${row.original.coach_last_name || ''}`.trim(),
    },
  ];

  const handleRowClick = (row: Reader) => {
    setSelectedRow(row);
    setOriginalRow({ ...row });
    tableState.setIsOpen(true);
  };

  const hasChanges = selectedRow && originalRow && (
    selectedRow.name !== originalRow.name ||
    selectedRow.level !== originalRow.level ||
    selectedRow.status !== originalRow.status ||
    selectedRow.area_id !== originalRow.area_id ||
    selectedRow.coach_id !== originalRow.coach_id
  );

  const handleCancel = () => {
    if (hasChanges) {
      setShowConfirm(true);
    } else {
      tableState.setIsOpen(false);
    }
  };

  const handleConfirmCancel = () => {
    setShowConfirm(false);
    tableState.setIsOpen(false);
    tableState.setErrors({});
  };

  const hasAddChanges = newReader.area_id || newReader.coach_id || newReader.enrolment_at || newReader.referrer_name || newReader.referrer_org || newReader.availability || newReader.notes;

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
    setNewReader({ 
      area_id: null,
      coach_id: null,
      enrolment_at: null,
      referrer_name: null,
      referrer_org: null,
      availability: null,
      notes: null
    });
    tableState.setErrors({});
  };

  const validateAddForm = () => {
    tableState.setErrors({});
    return true;
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
      const result = await editReader({
        reader_id: selectedRow.reader_id,
        name: selectedRow.name,
        area_id: selectedRow.area_id || null,
        coach_id: selectedRow.coach_id || null,
        level: selectedRow.level,
        status: selectedRow.status,
        referrer_name: selectedRow.referrer_name || undefined,
        referrer_org: selectedRow.referrer_org || undefined,
        availability: selectedRow.availability || undefined,
        notes: selectedRow.notes || undefined,
        enrolment_at: selectedRow.enrolment_at,
        coaching_start_at: selectedRow.coaching_start_at,
        graduation_at: selectedRow.graduation_at,
        TP1_start_at: selectedRow.TP1_start_at,
        TP2_start_at: selectedRow.TP2_start_at,
        TP3_start_at: selectedRow.TP3_start_at,
        TP4_start_at: selectedRow.TP4_start_at,
        TP5_start_at: selectedRow.TP5_start_at,
        TP1_completion_at: selectedRow.TP1_completion_at,
        TP2_completion_at: selectedRow.TP2_completion_at,
        TP3_completion_at: selectedRow.TP3_completion_at,
        TP4_completion_at: selectedRow.TP4_completion_at,
        TP5_completion_at: selectedRow.TP5_completion_at,
        ons4_1: selectedRow.ons4_1,
        ons4_2: selectedRow.ons4_2,
        ons4_3: selectedRow.ons4_3,
      });
      
      tableState.setIsSaving(false);
      if (result.success) {
        onSave(selectedRow);
        tableState.setIsOpen(false);
        tableState.setErrors({});
      } else {
        tableState.setErrorMessage(asString(result.message, 'An error occurred while saving'));
        tableState.setShowError(true);
      }
    }
  };

  const handleAddReader = async () => {
    if (!validateAddForm()) return;
    
    tableState.setIsSaving(true);
    const result = await addReader({
      area_id: newReader.area_id || undefined,
      coach_id: newReader.coach_id || undefined,
      enrolment_at: newReader.enrolment_at || undefined,
      referrer_name: newReader.referrer_name || undefined,
      referrer_org: newReader.referrer_org || undefined,
      availability: newReader.availability || undefined,
      notes: newReader.notes || undefined,
    });
    
    tableState.setIsSaving(false);
    if (result.success) {
      const responseData = result.message as { reader_id?: number; name?: string };
      const returnedName = responseData?.name || '';
      
      onSave({} as Reader);
      setIsAddOpen(false);
      setNewReader({ 
        area_id: null,
        coach_id: null,
        enrolment_at: null,
        referrer_name: null,
        referrer_org: null,
        availability: null,
        notes: null
      });
      tableState.setErrors({});
      
      setAddedReaderName(returnedName);
      setShowSuccessDialog(true);
    } else {
      tableState.setErrorMessage(asString(result.message, 'An error occurred while adding reader'));
      tableState.setShowError(true);
    }
  };

  const renderMobileCard = (reader: Reader) => (
    <div className='bg-white border rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md'>
      <div className='flex justify-between items-start mb-2'>
        <h3 className='font-semibold text-gray-900'>
          {reader.name}
        </h3>
        <span className={`px-2 py-1 text-xs rounded-full ${
          reader.status === 'S' ? 'bg-green-100 text-green-800' :
          reader.status === 'P' ? 'bg-yellow-100 text-yellow-800' :
          reader.status === 'NYS' ? 'bg-blue-100 text-blue-800' :
          reader.status === 'DO' ? 'bg-red-100 text-red-800' :
          reader.status === 'G' ? 'bg-emerald-100 text-emerald-800' :
          reader.status === 'C' ? 'bg-gray-100 text-gray-800' : ''
        }`}>
          {reader.status}
        </span>
      </div>
      <div className='flex justify-between items-center text-xs text-gray-500'>
        <span className='capitalize'>{reader.level}</span>
        <span>Area: {reader.area_name || 'N/A'}</span>
      </div>
      <p className='text-xs text-gray-500 mt-1'>Coach: {reader.coach_first_name} {reader.coach_last_name}</p>
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
          <div className='flex-1 relative'>
            <input
              type='text'
              placeholder='Filter...'
              className='w-full rounded-md border p-2 text-sm pr-32'
              value={tableState.globalFilter ?? ''}
              onChange={(e) => tableState.setGlobalFilter(e.target.value)}
            />
            {setShowGDOC && (
              <label className='absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs'>
                <input
                  type='checkbox'
                  checked={showGDOC}
                  onChange={(e) => setShowGDOC(e.target.checked)}
                  className='rounded'
                />
                <span>Show G, DO and C</span>
              </label>
            )}
          </div>
          <Button variant='primary' onClick={() => setIsAddOpen(true)} className='sm:whitespace-nowrap'>
            Add Reader
          </Button>
        </div>
      </BaseTable>

      <TableModal
        isOpen={tableState.isOpen}
        onClose={handleCancel}
        title='Edit Reader'
        data={selectedRow}
        onSave={handleSave}
        isSaving={tableState.isSaving}
      >
        {selectedRow && (
          <>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Reader ID</label>
                    <input
                      className='w-full rounded-md border p-2 bg-gray-100'
                      value={selectedRow.name}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Level</label>
                    <select
                      className='w-full rounded-md border p-2'
                      value={selectedRow.level}
                      onChange={(e) => setSelectedRow({ ...selectedRow, level: e.target.value })}
                    >
                      <option value='TP1'>TP1</option>
                      <option value='TP2'>TP2</option>
                      <option value='TP3'>TP3</option>
                      <option value='TP4'>TP4</option>
                      <option value='TP5'>TP5</option>
                    </select>
                  </div>
                </div>
                
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Status</label>
                    <select
                      className='w-full rounded-md border p-2'
                      value={selectedRow.status}
                      onChange={(e) => setSelectedRow({ ...selectedRow, status: e.target.value })}
                    >
                      <option value='NYS'>Not yet started</option>
                      <option value='S'>Started/on-going</option>
                      <option value='P'>Paused</option>
                      <option value='DO'>Dropped out</option>
                      <option value='G'>Graduated</option>
                      <option value='C'>Closed - unsuccessful</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Area</label>
                    <select
                      className='w-full rounded-md border p-2'
                      value={selectedRow.area_id ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, area_id: Number(e.target.value) || null })}
                    >
                      <option value=''>-- Select Area --</option>
                      {areas.map(area => (
                        <option key={area.area_id} value={area.area_id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>
                      Coach
                      <HoverHelp text='Select a Coach to work with the Reader. Within the dropdown list, each Coach name is followed in brackets by their respective Coordinator name. An asterisk beside the Coach name indicates that the Coach is already assigned to at least one other Reader. Only trained Coaches are shown.' />
                    </label>
                    <select
                      className='w-full rounded-md border p-2'
                      value={selectedRow.coach_id ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, coach_id: Number(e.target.value) || null })}
                    >
                      <option value=''>-- Select Coach --</option>
                      {coaches.map(coach => {
                        const coordinatorInfo = coach.coordinator_first_name && coach.coordinator_last_name 
                          ? ` (${coach.coordinator_first_name} ${coach.coordinator_last_name})` 
                          : '';
                        const pairedIndicator = coach.status === 'paired' ? '*' : '';
                        return (
                          <option key={coach.coach_id} value={coach.coach_id}>
                            {coach.first_name} {coach.last_name}{pairedIndicator}{coordinatorInfo}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Referrer Name</label>
                    <input
                      className='w-full rounded-md border p-2'
                      value={selectedRow.referrer_name ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, referrer_name: e.target.value || null })}
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700'>Referrer Organisation</label>
                  <input
                    className='w-full rounded-md border p-2'
                    value={selectedRow.referrer_org ?? ''}
                    onChange={(e) => setSelectedRow({ ...selectedRow, referrer_org: e.target.value || null })}
                  />
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Enrolment</label>
                    <input
                      type='date'
                      className='w-full rounded-md border p-2'
                      value={selectedRow.enrolment_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, enrolment_at: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Coaching Start</label>
                    <input
                      type='date'
                      className='w-full rounded-md border p-2'
                      value={selectedRow.coaching_start_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, coaching_start_at: e.target.value || null })}
                    />
                  </div>
                </div>



                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>TP1 Start</label>
                    <input
                      type='date'
                      className='w-full rounded-md border p-2'
                      value={selectedRow.TP1_start_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP1_start_at: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>TP1 Completion</label>
                    <input
                      type='date'
                      className='w-full rounded-md border p-2'
                      value={selectedRow.TP1_completion_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP1_completion_at: e.target.value || null })}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>TP2 Start</label>
                    <input
                      type='date'
                      className='w-full rounded-md border p-2'
                      value={selectedRow.TP2_start_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP2_start_at: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>TP2 Completion</label>
                    <input
                      type='date'
                      className='w-full rounded-md border p-2'
                      value={selectedRow.TP2_completion_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP2_completion_at: e.target.value || null })}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>TP3 Start</label>
                    <input
                      type='date'
                      className='w-full rounded-md border p-2'
                      value={selectedRow.TP3_start_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP3_start_at: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>TP3 Completion</label>
                    <input
                      type='date'
                      className='w-full rounded-md border p-2'
                      value={selectedRow.TP3_completion_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP3_completion_at: e.target.value || null })}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>TP4 Start</label>
                    <input
                      type='date'
                      className='w-full rounded-md border p-2'
                      value={selectedRow.TP4_start_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP4_start_at: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>TP4 Completion</label>
                    <input
                      type='date'
                      className='w-full rounded-md border p-2'
                      value={selectedRow.TP4_completion_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP4_completion_at: e.target.value || null })}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>TP5 Start</label>
                    <input
                      type='date'
                      className='w-full rounded-md border p-2'
                      value={selectedRow.TP5_start_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP5_start_at: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>TP5 Completion</label>
                    <input
                      type='date'
                      className='w-full rounded-md border p-2'
                      value={selectedRow.TP5_completion_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP5_completion_at: e.target.value || null })}
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700'>Graduation</label>
                  <input
                    type='date'
                    className='w-full rounded-md border p-2'
                    value={selectedRow.graduation_at?.split(' ')[0] ?? ''}
                    onChange={(e) => setSelectedRow({ ...selectedRow, graduation_at: e.target.value || null })}
                  />
                </div>

                <div className='grid grid-cols-3 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>ONS4: pre-TP1</label>
                    <select
                      className={`w-full rounded-md border p-2 ${selectedRow.ons4_1 === 0 ? 'bg-red-100' : ''}`}
                      value={selectedRow.ons4_1}
                      onChange={(e) => setSelectedRow({ ...selectedRow, ons4_1: Number(e.target.value) })}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>ONS4: post-TP3</label>
                    <select
                      className={`w-full rounded-md border p-2 ${selectedRow.ons4_2 === 0 ? 'bg-red-100' : ''}`}
                      value={selectedRow.ons4_2}
                      onChange={(e) => setSelectedRow({ ...selectedRow, ons4_2: Number(e.target.value) })}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>ONS4: post-TP5</label>
                    <select
                      className={`w-full rounded-md border p-2 ${selectedRow.ons4_3 === 0 ? 'bg-red-100' : ''}`}
                      value={selectedRow.ons4_3}
                      onChange={(e) => setSelectedRow({ ...selectedRow, ons4_3: Number(e.target.value) })}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700'>Availability</label>
                  <textarea
                    className='w-full rounded-md border p-2'
                    rows={2}
                    value={selectedRow.availability ?? ''}
                    onChange={(e) => setSelectedRow({ ...selectedRow, availability: e.target.value || null })}
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700'>Notes</label>
                  <textarea
                    className='w-full rounded-md border p-2'
                    rows={3}
                    value={selectedRow.notes ?? ''}
                    onChange={(e) => setSelectedRow({ ...selectedRow, notes: e.target.value || null })}
                  />
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
        title='Add Reader'
        data={null}
        onSave={handleAddReader}
        isSaving={tableState.isSaving}
      >
        <>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Area</label>
                  <select
                    className='w-full rounded-md border p-2'
                    value={newReader.area_id ?? ''}
                    onChange={(e) => setNewReader({ ...newReader, area_id: Number(e.target.value) || null })}
                  >
                    <option value=''>-- Select Area --</option>
                    {areas.map(area => (
                      <option key={area.area_id} value={area.area_id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Enrolment</label>
                  <input
                    type='date'
                    className='w-full rounded-md border p-2'
                    value={newReader.enrolment_at ?? ''}
                    onChange={(e) => setNewReader({ ...newReader, enrolment_at: e.target.value || null })}
                  />
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700'>
                  Coach
                  <HoverHelp text='Select a Coach to work with the Reader. Within the dropdown list, each Coach name is followed in brackets by their respective Coordinator name. An asterisk beside the Coach name indicates that the Coach is already assigned to at least one other Reader. Only trained Coaches are shown.' />
                </label>
                <select
                  className='w-full rounded-md border p-2'
                  value={newReader.coach_id ?? ''}
                  onChange={(e) => setNewReader({ ...newReader, coach_id: Number(e.target.value) || null })}
                >
                  <option value=''>-- Select Coach --</option>
                  {coaches.map(coach => {
                    const coordinatorInfo = coach.coordinator_first_name && coach.coordinator_last_name 
                      ? ` (${coach.coordinator_first_name} ${coach.coordinator_last_name})` 
                      : '';
                    const pairedIndicator = coach.status === 'paired' ? '*' : '';
                    return (
                      <option key={coach.coach_id} value={coach.coach_id}>
                        {coach.first_name} {coach.last_name}{pairedIndicator}{coordinatorInfo}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Referrer Name</label>
                  <input
                    className='w-full rounded-md border p-2'
                    value={newReader.referrer_name ?? ''}
                    onChange={(e) => setNewReader({ ...newReader, referrer_name: e.target.value || null })}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Referrer Organisation</label>
                  <input
                    className='w-full rounded-md border p-2'
                    value={newReader.referrer_org ?? ''}
                    onChange={(e) => setNewReader({ ...newReader, referrer_org: e.target.value || null })}
                  />
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700'>Availability</label>
                <textarea
                  className='w-full rounded-md border p-2'
                  rows={2}
                  value={newReader.availability ?? ''}
                  onChange={(e) => setNewReader({ ...newReader, availability: e.target.value || null })}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700'>Notes</label>
                <textarea
                  className='w-full rounded-md border p-2'
                  rows={3}
                  value={newReader.notes ?? ''}
                  onChange={(e) => setNewReader({ ...newReader, notes: e.target.value || null })}
                />
              </div>
        </>
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

      <MessageDialog
        isOpen={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        title='Reader Added Successfully'
        message={`Reader "${addedReaderName}" has been added successfully.`}
      />

      {tableState.isSaving && <Loading />}
    </>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
