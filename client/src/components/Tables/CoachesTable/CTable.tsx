import { useState, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

import { type TCoachesSchema, type TCoachSchema, useCoach } from '@hooks/useCoaches';
import { useUsers } from '@hooks/useUsers';
import { useAreas } from '@hooks/useOrg';

import { editCoach, addCoach } from '@lib/api/apiCoaches';
import { asString} from '@lib/helper';
import { type TCoachStatus, type TUserStatus, type TTrainingStatus } from '@lib/types';

import { Button, ConfirmDialog, ErrorDialog, Loading, HoverHelp } from '@components/Common';
import { BaseTable, useTableState, createSortableHeader, createStatusColumn } from '../BaseTable';

// -----------------------------------------------------------------------------

type Coach = TCoachesSchema[0];

// -----------------------------------------------------------------------------

interface CTableProps {
  data: TCoachesSchema;
  onSave: (updatedRow: Coach) => void;
  showLeavers?: boolean;
  setShowLeavers?: (show: boolean) => void;
}

export function CTable({ data, onSave, showLeavers, setShowLeavers }: CTableProps): React.JSX.Element {
  const tableState = useTableState({ id: 'first_name', desc: false });
  const [selectedRow, setSelectedRow] = useState<Coach | null>(null);
  const [originalRow, setOriginalRow] = useState<Coach | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPersonalDataOpen, setIsPersonalDataOpen] = useState(false);
  const [personalData, setPersonalData] = useState<TCoachSchema | null>(null);
  const [personalDataUpdates, setPersonalDataUpdates] = useState<Record<number, Partial<TCoachSchema>>>({});
  const [originalPersonalData, setOriginalPersonalData] = useState<TCoachSchema | null>(null);
  const [showPersonalDataConfirm, setShowPersonalDataConfirm] = useState(false);
  const [isAddPersonalDataOpen, setIsAddPersonalDataOpen] = useState(false);
  const [showLeaverConfirm, setShowLeaverConfirm] = useState(false);
  const [personalDataEdited, setPersonalDataEdited] = useState(false);
  const [addPersonalDataEdited, setAddPersonalDataEdited] = useState(false);
  
  const { data: usersData } = useUsers();
  const coordinators = usersData?.filter(user => user.role === 'coordinator' && user.status === 'active')
    .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)) || [];
  
  const { data: areasData } = useAreas();
  const areas = areasData || [];
  
  const [newCoach, setNewCoach] = useState({
    first_name: '', 
    last_name: '', 
    email: '', 
    status: 'unchecked' as TCoachStatus,
    user_status: 'active' as TUserStatus,
    disabled: 0,
    password_reset: 0,
    coordinator_id: 0,
    area_id: 0,
    email_consent: 0,
    whatsapp_consent: 0,
    dbs_completed: 0,
    ref_completed: 0,
    commitment_completed: 0,
    training: 'not_booked' as TTrainingStatus,
    edib_training: 'not_booked' as TTrainingStatus,
    consol_training: 'not_booked' as TTrainingStatus,
    use_email: 0,
    consol_training_at: '',
    availability: '',
    preferences: '',
    notes: '',
    address: '',
    telephone: '',
    nok_name: '',
    nok_telephone: '',
    nok_relationship: ''
  });
  const { data: coachData, mutate: mutateCoach } = useCoach(selectedRow?.coach_id || null);

  const copyToClipboard = useCallback(async () => {
    if (!data || data.length === 0) return;
    
    const headers = ['First Name', 'Last Name', 'Status', 'User Status', 'Area', 'Coordinator'];
    const rows = data.map(coach => [
      coach.first_name,
      coach.last_name,
      coach.status,
      coach.user_status,
      coach.area_name || '',
      `${coach.coordinator_first_name || ''} ${coach.coordinator_last_name || ''}`.trim()
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

  const handlePersonalDataOpen = () => {
    if (selectedRow && coachData) {
      const updates = personalDataUpdates[selectedRow.coach_id] || {};
      const data = { 
        ...coachData,
        ...updates
      };
      setPersonalData(data);
      setOriginalPersonalData(data);
      setIsPersonalDataOpen(true);
    }
  };

  const handlePersonalDataSave = () => {
    if (personalData && selectedRow) {
      const updates = {
        address: personalData.address,
        telephone: personalData.telephone,
        nok_name: personalData.nok_name,
        nok_telephone: personalData.nok_telephone,
        nok_relationship: personalData.nok_relationship
      };
      setPersonalDataUpdates(prev => ({
        ...prev,
        [selectedRow.coach_id]: updates
      }));
      setSelectedRow({
        ...selectedRow,
        address: personalData.address,
        telephone: personalData.telephone,
        nok_name: personalData.nok_name,
        nok_telephone: personalData.nok_telephone,
        nok_relationship: personalData.nok_relationship
      } as Coach);
      setPersonalDataEdited(true);
      setIsPersonalDataOpen(false);
    }
  };

  const handleAddPersonalDataOpen = () => {
    setIsAddPersonalDataOpen(true);
  };

  const handleAddPersonalDataSave = () => {
    setAddPersonalDataEdited(true);
    setIsAddPersonalDataOpen(false);
  };

  const hasPersonalDataChanges = personalData && originalPersonalData && (
    personalData.address !== originalPersonalData.address ||
    personalData.telephone !== originalPersonalData.telephone ||
    personalData.nok_name !== originalPersonalData.nok_name ||
    personalData.nok_telephone !== originalPersonalData.nok_telephone ||
    personalData.nok_relationship !== originalPersonalData.nok_relationship
  );

  const handlePersonalDataCancel = () => {
    if (hasPersonalDataChanges) {
      setShowPersonalDataConfirm(true);
    } else {
      setIsPersonalDataOpen(false);
    }
  };

  const handleConfirmPersonalDataCancel = () => {
    setShowPersonalDataConfirm(false);
    setIsPersonalDataOpen(false);
  };

  const statusMap = {
    'trained': { bg: 'bg-green-100', text: 'text-green-800' },
    'untrained': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'unchecked': { bg: 'bg-gray-100', text: 'text-gray-800' },
    'paired': { bg: 'bg-blue-100', text: 'text-blue-800' }
  };

  const userStatusMap = {
    'leaver': { bg: 'bg-red-100', text: 'text-red-800' },
    'onhold': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'active': { bg: '', text: '' }
  };

  const columns: ColumnDef<Coach>[] = [
    {
      accessorKey: 'first_name',
      header: createSortableHeader('First Name', true, copyToClipboard, tableState.showCopied),
    },
    {
      accessorKey: 'last_name',
      header: createSortableHeader('Last Name'),
    },
    createStatusColumn('status', statusMap),
    {
      accessorKey: 'user_status',
      header: createSortableHeader('User Status'),
      cell: ({ getValue }) => {
        const userStatus = getValue() as string;
        const styles = userStatusMap[userStatus as keyof typeof userStatusMap] || { bg: 'bg-gray-100', text: 'text-gray-800' };
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${styles.bg} ${styles.text}`}>
            {userStatus}
          </span>
        );
      },
    },
    {
      accessorKey: 'area_name',
      header: createSortableHeader('Area'),
      cell: ({ getValue }) => {
        const areaName = getValue() as string | null;
        return areaName || '';
      },
    },
    {
      id: 'coordinator',
      enableSorting: true,
      header: createSortableHeader('Coordinator'),
      accessorFn: (row) => `${row.coordinator_first_name || ''} ${row.coordinator_last_name || ''}`.trim(),
      cell: ({ row }) => `${row.original.coordinator_first_name || ''} ${row.original.coordinator_last_name || ''}`.trim(),
    },
  ];



  const handleRowClick = (row: Coach) => {
    setSelectedRow(row);
    setOriginalRow({ ...row });
    tableState.setIsOpen(true);
  };

  const hasChanges = selectedRow && originalRow && (
    selectedRow.first_name !== originalRow.first_name ||
    selectedRow.last_name !== originalRow.last_name ||
    selectedRow.status !== originalRow.status ||
    selectedRow.user_status !== originalRow.user_status ||
    selectedRow.disabled !== originalRow.disabled ||
    selectedRow.email_consent !== originalRow.email_consent ||
    selectedRow.whatsapp_consent !== originalRow.whatsapp_consent ||
    selectedRow.dbs_completed !== originalRow.dbs_completed ||
    selectedRow.ref_completed !== originalRow.ref_completed ||
    selectedRow.commitment_completed !== originalRow.commitment_completed ||
    selectedRow.training !== originalRow.training ||
    selectedRow.edib_training !== originalRow.edib_training ||
    selectedRow.consol_training !== originalRow.consol_training ||
    selectedRow.use_email !== originalRow.use_email ||
    selectedRow.consol_training_at !== originalRow.consol_training_at ||
    selectedRow.availability !== originalRow.availability ||
    selectedRow.preferences !== originalRow.preferences ||
    selectedRow.notes !== originalRow.notes ||
    selectedRow.coordinator_id !== originalRow.coordinator_id ||
    selectedRow.area_id !== originalRow.area_id
  );

  const handleCancel = () => {
    if (hasChanges || personalDataEdited) {
      setShowConfirm(true);
    } else {
      if (selectedRow) {
        setPersonalDataUpdates(prev => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [selectedRow.coach_id]: _, ...rest } = prev;
          return rest;
        });
      }
      tableState.setIsOpen(false);
    }
  };

  const handleConfirmCancel = () => {
    if (selectedRow) {
      setPersonalDataUpdates(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [selectedRow.coach_id]: _, ...rest } = prev;
        return rest;
      });
    }
    setShowConfirm(false);
    tableState.setIsOpen(false);
    setPersonalDataEdited(false);
    tableState.setErrors({});
  };

  const hasAddChanges = newCoach.first_name.trim() || newCoach.last_name.trim() || newCoach.email.trim();

  const handleAddCancel = () => {
    if (hasAddChanges || addPersonalDataEdited) {
      setShowAddConfirm(true);
    } else {
      setIsAddOpen(false);
    }
  };

  const handleConfirmAddCancel = () => {
    setShowAddConfirm(false);
    setIsAddOpen(false);
    setAddPersonalDataEdited(false);
    setNewCoach({
      first_name: '', 
      last_name: '', 
      email: '', 
      status: 'untrained' as TCoachStatus,
      user_status: 'active' as TUserStatus,
      disabled: 0,
      password_reset: 0,
      coordinator_id: 0,
      area_id: 0,
      email_consent: 0,
      whatsapp_consent: 0,
      dbs_completed: 0,
      ref_completed: 0,
      commitment_completed: 0,
      training: 'not_booked' as TTrainingStatus,
      edib_training: 'not_booked' as TTrainingStatus,
      consol_training: 'not_booked' as TTrainingStatus,
      use_email: 0,
      consol_training_at: '',
      availability: '',
      preferences: '',
      notes: '',
      address: '',
      telephone: '',
      nok_name: '',
      nok_telephone: '',
      nok_relationship: ''
    });
    tableState.setErrors({});
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateAddForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newCoach.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!newCoach.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!newCoach.email.trim()) newErrors.email = 'Email is required';
    else if (!validateEmail(newCoach.email)) newErrors.email = 'Invalid email format';
    tableState.setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEditForm = () => {
    const newErrors: Record<string, string> = {};
    if (selectedRow && !selectedRow.first_name.trim()) newErrors.first_name = 'First name is required';
    if (selectedRow && !selectedRow.last_name.trim()) newErrors.last_name = 'Last name is required';
    tableState.setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateEditForm()) return;
    
    if (selectedRow && originalRow) {
      // Check if user_status is being changed to 'leaver'
      if (originalRow.user_status !== 'leaver' && selectedRow.user_status === 'leaver') {
        setShowLeaverConfirm(true);
        return;
      }
      
      await performSave();
    }
  };

  const performSave = async () => {
    if (selectedRow) {
      tableState.setIsSaving(true);
      const result = await editCoach({
        coach_id: selectedRow.coach_id,
        first_name: selectedRow.first_name,
        last_name: selectedRow.last_name,
        status: selectedRow.status,
        user_status: selectedRow.user_status,
        disabled: selectedRow.disabled,
        password_reset: selectedRow.password_reset,
        coordinator_id: selectedRow.coordinator_id && selectedRow.coordinator_id > 0 ? selectedRow.coordinator_id : null,
        area_id: selectedRow.area_id && selectedRow.area_id > 0 ? selectedRow.area_id : null,
        email_consent: selectedRow.email_consent,
        whatsapp_consent: selectedRow.whatsapp_consent,
        dbs_completed: selectedRow.dbs_completed,
        ref_completed: selectedRow.ref_completed,
        commitment_completed: selectedRow.commitment_completed,
        training: selectedRow.training,
        edib_training: selectedRow.edib_training,
        consol_training: selectedRow.consol_training,
        use_email: selectedRow.use_email,
        consol_training_at: selectedRow.consol_training_at || undefined,
        availability: selectedRow.availability || undefined,
        preferences: selectedRow.preferences || undefined,
        notes: selectedRow.notes || undefined,
        address: (selectedRow as TCoachSchema).address || undefined,
        telephone: (selectedRow as TCoachSchema).telephone || undefined,
        nok_name: (selectedRow as TCoachSchema).nok_name || undefined,
        nok_telephone: (selectedRow as TCoachSchema).nok_telephone || undefined,
        nok_relationship: (selectedRow as TCoachSchema).nok_relationship || undefined,
      });
      
      tableState.setIsSaving(false);
      if (result.success) {
        // Force refresh individual coach data if status changed to leaver
        if (selectedRow.user_status === 'leaver') {
          mutateCoach?.();
        }
        onSave(selectedRow);
        tableState.setIsOpen(false);
        tableState.setErrors({});
      } else {
        tableState.setErrorMessage(asString(result.message,
                                  'An error occurred while saving'));
        tableState.setShowError(true);
      }
    }
  };

  const handleLeaverConfirm = () => {
    setShowLeaverConfirm(false);
    performSave();
  };

  const handleAddCoach = async () => {
    if (!validateAddForm()) return;
    
    tableState.setIsSaving(true);
    const result = await addCoach({
      first_name: newCoach.first_name,
      last_name: newCoach.last_name,
      email: newCoach.email,
      status: newCoach.status,
      user_status: newCoach.user_status,

      ...(newCoach.coordinator_id > 0 && { coordinator_id: newCoach.coordinator_id }),
      area_id: newCoach.area_id > 0 ? newCoach.area_id : null,
      email_consent: newCoach.email_consent,
      whatsapp_consent: newCoach.whatsapp_consent,
      dbs_completed: newCoach.dbs_completed,
      ref_completed: newCoach.ref_completed,
      commitment_completed: newCoach.commitment_completed,
      training: newCoach.training,
      edib_training: newCoach.edib_training,
      consol_training: newCoach.consol_training,
      use_email: newCoach.use_email,
      consol_training_at: newCoach.consol_training_at || undefined,
      availability: newCoach.availability || undefined,
      preferences: newCoach.preferences || undefined,
      notes: newCoach.notes || undefined,
      address: newCoach.address || undefined,
      telephone: newCoach.telephone || undefined,
      nok_name: newCoach.nok_name || undefined,
      nok_telephone: newCoach.nok_telephone || undefined,
      nok_relationship: newCoach.nok_relationship || undefined,
    });
    
    tableState.setIsSaving(false);
    if (result.success) {
      onSave({} as Coach);
      setIsAddOpen(false);
      setNewCoach({
        first_name: '', 
        last_name: '', 
        email: '', 
        status: 'unchecked' as TCoachStatus,
        user_status: 'active' as TUserStatus,
        disabled: 0,
        password_reset: 0,
        coordinator_id: 0,
        area_id: 0,
        email_consent: 0,
        whatsapp_consent: 0,
        dbs_completed: 0,
        ref_completed: 0,
        commitment_completed: 0,
        training: 'not_booked' as TTrainingStatus,
        edib_training: 'not_booked' as TTrainingStatus,
        consol_training: 'not_booked' as TTrainingStatus,
        use_email: 0,
        consol_training_at: '',
        availability: '',
        preferences: '',
        notes: '',
        address: '',
        telephone: '',
        nok_name: '',
        nok_telephone: '',
        nok_relationship: ''
      });
      tableState.setErrors({});
    } else {
      tableState.setErrorMessage(asString(result.message, 'An error occurred while adding coach'));
      tableState.setShowError(true);
    }
  };

  const renderMobileCard = (coach: Coach) => (
    <div className='bg-white border rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md'>
      <div className='flex justify-between items-start mb-2'>
        <h3 className='font-semibold text-gray-900'>
          {coach.first_name} {coach.last_name}
        </h3>
        <span className={`px-2 py-1 text-xs rounded-full ${
          coach.status === 'trained' ? 'bg-green-100 text-green-800' :
          coach.status === 'untrained' ? 'bg-yellow-100 text-yellow-800' :
          coach.status === 'unchecked' ? 'bg-gray-100 text-gray-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {coach.status}
        </span>
      </div>
      <p className='text-sm text-gray-600 mb-1'>{coach.email}</p>
      <div className='flex justify-between items-center text-xs text-gray-500'>
        <span>User: {coach.user_status}</span>
      </div>
      <p className='text-xs text-gray-500 mt-1'>Coordinator: {coach.coordinator_first_name} {coach.coordinator_last_name}</p>
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
            {setShowLeavers && (
              <label className='absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs'>
                <input
                  type='checkbox'
                  checked={showLeavers}
                  onChange={(e) => setShowLeavers(e.target.checked)}
                  className='rounded'
                />
                <span>Show leavers</span>
              </label>
            )}
          </div>
          <Button variant='primary' onClick={() => setIsAddOpen(true)} className='sm:whitespace-nowrap'>
            Add Coach
          </Button>
        </div>
      </BaseTable>

      {/* Edit Modal */}
      <Dialog open={tableState.isOpen} onClose={() => {}} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <div>
                <DialogTitle className='text-lg font-semibold'>Edit Coach</DialogTitle>
                <p className='text-sm text-blue-600 font-bold'>ID: {selectedRow?.coach_id} • {selectedRow?.email}</p>
              </div>
              <button onClick={() => tableState.setIsOpen(false)}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>

            {selectedRow && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className='space-y-3 max-h-96 overflow-y-auto pr-2'
              >
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>First Name *</label>
                    <input
                      className={`w-full rounded-md border p-2 ${tableState.errors.first_name ? 'border-red-500' : ''}`}
                      value={selectedRow.first_name}
                      onChange={(e) => setSelectedRow({ ...selectedRow, first_name: e.target.value })}
                    />
                    {tableState.errors.first_name && <p className='text-red-500 text-xs mt-1'>{tableState.errors.first_name}</p>}
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Last Name *</label>
                    <input
                      className={`w-full rounded-md border p-2 ${tableState.errors.last_name ? 'border-red-500' : ''}`}
                      value={selectedRow.last_name}
                      onChange={(e) => setSelectedRow({ ...selectedRow, last_name: e.target.value })}
                    />
                    {tableState.errors.last_name && <p className='text-red-500 text-xs mt-1'>{tableState.errors.last_name}</p>}
                  </div>
                </div>
                
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Coach Status</label>
                    <select
                      className='w-full rounded-md border p-2'
                      value={selectedRow.status}
                      onChange={(e) => setSelectedRow({ ...selectedRow, status: e.target.value as TCoachStatus })}
                    >
                      <option value='unchecked'>Unchecked</option>
                      <option value='untrained'>Untrained</option>
                      <option value='trained'>Trained</option>
                      <option value='paired'>Paired</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>User Status</label>
                    <select
                      className='w-full rounded-md border p-2'
                      value={selectedRow.user_status}
                      onChange={(e) => setSelectedRow({ ...selectedRow, user_status: e.target.value as TUserStatus })}
                    >
                      <option value='active'>Active</option>
                      <option value='onhold'>On Hold</option>
                      <option value='leaver'>Leaver</option>
                    </select>
                  </div>
                </div>



                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Coordinator</label>
                    <select
                      className='w-full rounded-md border p-2'
                      value={selectedRow.coordinator_id || 0}
                      onChange={(e) => setSelectedRow({ ...selectedRow, coordinator_id: Number(e.target.value) })}
                    >
                      <option value={0}>-- Select Coordinator --</option>
                      {coordinators.map(coordinator => (
                        <option key={coordinator.user_id} value={coordinator.user_id}>
                          {coordinator.first_name} {coordinator.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Area</label>
                    <select
                      className='w-full rounded-md border p-2'
                      value={selectedRow.area_id || 0}
                      onChange={(e) => setSelectedRow({ ...selectedRow, area_id: Number(e.target.value) })}
                    >
                      <option value={0}>-- Select Area --</option>
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
                    <label className='block text-sm font-medium text-gray-700'>Email Consent</label>
                    <select
                      className={`w-full rounded-md border p-2 ${selectedRow.email_consent === 0 ? 'bg-red-100' : ''}`}
                      value={selectedRow.email_consent}
                      onChange={(e) => setSelectedRow({ ...selectedRow, email_consent: Number(e.target.value) })}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>WhatsApp Consent</label>
                    <select
                      className={`w-full rounded-md border p-2 ${selectedRow.whatsapp_consent === 0 ? 'bg-red-100' : ''}`}
                      value={selectedRow.whatsapp_consent}
                      onChange={(e) => setSelectedRow({ ...selectedRow, whatsapp_consent: Number(e.target.value) })}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>
                      Send System Emails
                      <HoverHelp text='Automatically send emails such as review meeting invitations and ONS survey reminders directly to the Coach' />
                    </label>
                    <select
                      className={`w-full rounded-md border p-2 ${selectedRow.use_email === 0 ? 'bg-red-100' : ''}`}
                      value={selectedRow.use_email}
                      onChange={(e) => setSelectedRow({ ...selectedRow, use_email: Number(e.target.value) })}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>DBS Completed</label>
                    <select
                      className={`w-full rounded-md border p-2 ${selectedRow.dbs_completed === 0 ? 'bg-red-100' : ''}`}
                      value={selectedRow.dbs_completed}
                      onChange={(e) => setSelectedRow({ ...selectedRow, dbs_completed: Number(e.target.value) })}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>References Completed</label>
                    <select
                      className={`w-full rounded-md border p-2 ${selectedRow.ref_completed === 0 ? 'bg-red-100' : ''}`}
                      value={selectedRow.ref_completed}
                      onChange={(e) => setSelectedRow({ ...selectedRow, ref_completed: Number(e.target.value) })}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Commitment Completed</label>
                    <select
                      className={`w-full rounded-md border p-2 ${selectedRow.commitment_completed === 0 ? 'bg-red-100' : ''}`}
                      value={selectedRow.commitment_completed}
                      onChange={(e) => setSelectedRow({ ...selectedRow, commitment_completed: Number(e.target.value) })}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Coach Training</label>
                    <select
                      className={`w-full rounded-md border p-2 ${selectedRow.training === 'not_booked' ? 'bg-red-100' : selectedRow.training === 'booked' ? 'bg-yellow-100' : ''}`}
                      value={selectedRow.training}
                      onChange={(e) => setSelectedRow({ ...selectedRow, training: e.target.value as TTrainingStatus })}
                    >
                      <option value='not_booked'>Not Booked</option>
                      <option value='booked'>Booked</option>
                      <option value='completed'>Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>EDIB Training</label>
                    <select
                      className={`w-full rounded-md border p-2 ${selectedRow.edib_training === 'not_booked' ? 'bg-red-100' : selectedRow.edib_training === 'booked' ? 'bg-yellow-100' : ''}`}
                      value={selectedRow.edib_training}
                      onChange={(e) => setSelectedRow({ ...selectedRow, edib_training: e.target.value as TTrainingStatus })}
                    >
                      <option value='not_booked'>Not Booked</option>
                      <option value='booked'>Booked</option>
                      <option value='completed'>Completed</option>
                    </select>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Consolidation Training</label>
                    <select
                      className={`w-full rounded-md border p-2 ${selectedRow.consol_training === 'not_booked' ? 'bg-red-100' : selectedRow.consol_training === 'booked' ? 'bg-yellow-100' : ''}`}
                      value={selectedRow.consol_training}
                      onChange={(e) => setSelectedRow({ ...selectedRow, consol_training: e.target.value as TTrainingStatus })}
                    >
                      <option value='not_booked'>Not Booked</option>
                      <option value='booked'>Booked</option>
                      <option value='completed'>Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700'>Consolidation Training Date</label>
                    <input
                      type='date'
                      className='w-full rounded-md border p-2'
                      value={selectedRow.consol_training_at ? selectedRow.consol_training_at.split('T')[0].split(' ')[0] : ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, consol_training_at: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700'>Availability</label>
                  <textarea
                    className='w-full rounded-md border p-2'
                    rows={2}
                    value={selectedRow.availability || ''}
                    onChange={(e) => setSelectedRow({ ...selectedRow, availability: e.target.value })}
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700'>Preferences</label>
                  <textarea
                    className='w-full rounded-md border p-2'
                    rows={2}
                    value={selectedRow.preferences || ''}
                    onChange={(e) => setSelectedRow({ ...selectedRow, preferences: e.target.value })}
                  />
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

                <div className='flex justify-between items-center mt-4'>
                  <Button variant='secondary' type='button' onClick={handlePersonalDataOpen}>
                    Personal Data
                  </Button>
                  <div className='flex gap-2'>
                    <Button variant='secondary' type='button' onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button type='submit' disabled={tableState.isSaving}>
                      {tableState.isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </DialogPanel>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmCancel}
        title='Unsaved Changes'
        message='You have unsaved changes. Are you sure you want to cancel?'
      />

      <ConfirmDialog
        isOpen={showLeaverConfirm}
        onClose={() => setShowLeaverConfirm(false)}
        onConfirm={handleLeaverConfirm}
        title='Confirm Status Change'
        message="Changing a coach's user status to 'Leaver' will irreversibly redact the coach's personal data. Do you want to continue?"
      />

      <ConfirmDialog
        isOpen={showPersonalDataConfirm}
        onClose={() => setShowPersonalDataConfirm(false)}
        onConfirm={handleConfirmPersonalDataCancel}
        title='Unsaved Changes'
        message='You have unsaved changes. Are you sure you want to cancel?'
      />
      
      {/* Add Coach Modal */}
      <Dialog open={isAddOpen} onClose={() => {}} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <div>
                <DialogTitle className='text-lg font-semibold'>Add Coach</DialogTitle>
              </div>
              <button onClick={handleAddCancel}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddCoach();
              }}
              className='space-y-3 max-h-96 overflow-y-auto pr-2'
            >
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>First Name *</label>
                  <input
                    className={`w-full rounded-md border p-2 ${tableState.errors.first_name ? 'border-red-500' : ''}`}
                    value={newCoach.first_name}
                    onChange={(e) => setNewCoach({ ...newCoach, first_name: e.target.value })}
                  />
                  {tableState.errors.first_name && <p className='text-red-500 text-xs mt-1'>{tableState.errors.first_name}</p>}
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Last Name *</label>
                  <input
                    className={`w-full rounded-md border p-2 ${tableState.errors.last_name ? 'border-red-500' : ''}`}
                    value={newCoach.last_name}
                    onChange={(e) => setNewCoach({ ...newCoach, last_name: e.target.value })}
                  />
                  {tableState.errors.last_name && <p className='text-red-500 text-xs mt-1'>{tableState.errors.last_name}</p>}
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700'>Email *</label>
                <input
                  type='email'
                  className={`w-full rounded-md border p-2 ${tableState.errors.email ? 'border-red-500' : ''}`}
                  value={newCoach.email}
                  onChange={(e) => setNewCoach({ ...newCoach, email: e.target.value })}
                />
                {tableState.errors.email && <p className='text-red-500 text-xs mt-1'>{tableState.errors.email}</p>}
              </div>
              
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Coach Status</label>
                  <select
                    className='w-full rounded-md border p-2'
                    value={newCoach.status}
                    onChange={(e) => setNewCoach({ ...newCoach, status: e.target.value as TCoachStatus })}
                  >
                    <option value='unchecked'>Unchecked</option>
                    <option value='untrained'>Untrained</option>
                    <option value='trained'>Trained</option>
                    <option value='paired'>Paired</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>User Status</label>
                  <select
                    className='w-full rounded-md border p-2'
                    value={newCoach.user_status}
                    onChange={(e) => setNewCoach({ ...newCoach, user_status: e.target.value as TUserStatus })}
                  >
                    <option value='active'>Active</option>
                    <option value='onhold'>On Hold</option>
                    <option value='leaver'>Leaver</option>
                  </select>
                </div>
              </div>



              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Coordinator</label>
                  <select
                    className='w-full rounded-md border p-2'
                    value={newCoach.coordinator_id}
                    onChange={(e) => setNewCoach({ ...newCoach, coordinator_id: Number(e.target.value) })}
                  >
                    <option value={0}>-- Select Coordinator --</option>
                    {coordinators.map(coordinator => (
                      <option key={coordinator.user_id} value={coordinator.user_id}>
                        {coordinator.first_name} {coordinator.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Area</label>
                  <select
                    className='w-full rounded-md border p-2'
                    value={newCoach.area_id}
                    onChange={(e) => setNewCoach({ ...newCoach, area_id: Number(e.target.value) })}
                  >
                    <option value={0}>-- Select Area --</option>
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
                  <label className='block text-sm font-medium text-gray-700'>Email Consent</label>
                  <select
                    className={`w-full rounded-md border p-2 ${newCoach.email_consent === 0 ? 'bg-red-100' : ''}`}
                    value={newCoach.email_consent}
                    onChange={(e) => setNewCoach({ ...newCoach, email_consent: Number(e.target.value) })}
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>WhatsApp Consent</label>
                  <select
                    className={`w-full rounded-md border p-2 ${newCoach.whatsapp_consent === 0 ? 'bg-red-100' : ''}`}
                    value={newCoach.whatsapp_consent}
                    onChange={(e) => setNewCoach({ ...newCoach, whatsapp_consent: Number(e.target.value) })}
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Send System Emails
                    <HoverHelp text='Automatically send emails such as review meeting invitations and ONS survey reminders directly to the Coach' />
                  </label>
                  <select
                    className={`w-full rounded-md border p-2 ${newCoach.use_email === 0 ? 'bg-red-100' : ''}`}
                    value={newCoach.use_email}
                    onChange={(e) => setNewCoach({ ...newCoach, use_email: Number(e.target.value) })}
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>DBS Completed</label>
                  <select
                    className={`w-full rounded-md border p-2 ${newCoach.dbs_completed === 0 ? 'bg-red-100' : ''}`}
                    value={newCoach.dbs_completed}
                    onChange={(e) => setNewCoach({ ...newCoach, dbs_completed: Number(e.target.value) })}
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>References Completed</label>
                  <select
                    className={`w-full rounded-md border p-2 ${newCoach.ref_completed === 0 ? 'bg-red-100' : ''}`}
                    value={newCoach.ref_completed}
                    onChange={(e) => setNewCoach({ ...newCoach, ref_completed: Number(e.target.value) })}
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Commitment Completed</label>
                  <select
                    className={`w-full rounded-md border p-2 ${newCoach.commitment_completed === 0 ? 'bg-red-100' : ''}`}
                    value={newCoach.commitment_completed}
                    onChange={(e) => setNewCoach({ ...newCoach, commitment_completed: Number(e.target.value) })}
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Coach Training</label>
                  <select
                    className={`w-full rounded-md border p-2 ${newCoach.training === 'not_booked' ? 'bg-red-100' : newCoach.training === 'booked' ? 'bg-yellow-100' : ''}`}
                    value={newCoach.training}
                    onChange={(e) => setNewCoach({ ...newCoach, training: e.target.value as TTrainingStatus })}
                  >
                    <option value='not_booked'>Not Booked</option>
                    <option value='booked'>Booked</option>
                    <option value='completed'>Completed</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>EDIB Training</label>
                  <select
                    className={`w-full rounded-md border p-2 ${newCoach.edib_training === 'not_booked' ? 'bg-red-100' : newCoach.edib_training === 'booked' ? 'bg-yellow-100' : ''}`}
                    value={newCoach.edib_training}
                    onChange={(e) => setNewCoach({ ...newCoach, edib_training: e.target.value as TTrainingStatus })}
                  >
                    <option value='not_booked'>Not Booked</option>
                    <option value='booked'>Booked</option>
                    <option value='completed'>Completed</option>
                  </select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Consolidation Training</label>
                  <select
                    className={`w-full rounded-md border p-2 ${newCoach.consol_training === 'not_booked' ? 'bg-red-100' : newCoach.consol_training === 'booked' ? 'bg-yellow-100' : ''}`}
                    value={newCoach.consol_training}
                    onChange={(e) => setNewCoach({ ...newCoach, consol_training: e.target.value as TTrainingStatus })}
                  >
                    <option value='not_booked'>Not Booked</option>
                    <option value='booked'>Booked</option>
                    <option value='completed'>Completed</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Consolidation Training Date</label>
                  <input
                    type='date'
                    className='w-full rounded-md border p-2'
                    value={newCoach.consol_training_at}
                    onChange={(e) => setNewCoach({ ...newCoach, consol_training_at: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700'>Availability</label>
                <textarea
                  className='w-full rounded-md border p-2'
                  rows={2}
                  value={newCoach.availability}
                  onChange={(e) => setNewCoach({ ...newCoach, availability: e.target.value })}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700'>Preferences</label>
                <textarea
                  className='w-full rounded-md border p-2'
                  rows={2}
                  value={newCoach.preferences}
                  onChange={(e) => setNewCoach({ ...newCoach, preferences: e.target.value })}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700'>Notes</label>
                <textarea
                  className='w-full rounded-md border p-2'
                  rows={3}
                  value={newCoach.notes}
                  onChange={(e) => setNewCoach({ ...newCoach, notes: e.target.value })}
                />
              </div>

              <div className='flex justify-between items-center mt-4'>
                <Button variant='secondary' type='button' onClick={handleAddPersonalDataOpen}>
                  Personal Data
                </Button>
                <div className='flex gap-2'>
                  <Button variant='secondary' type='button' onClick={handleAddCancel}>
                    Cancel
                  </Button>
                  <Button type='submit' disabled={tableState.isSaving}>
                    {tableState.isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={showAddConfirm}
        onClose={() => setShowAddConfirm(false)}
        onConfirm={handleConfirmAddCancel}
        title='Unsaved Changes'
        message='You have unsaved changes. Are you sure you want to cancel?'
      />

      {/* Personal Data Modal */}
      <Dialog open={isPersonalDataOpen} onClose={() => {}} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <div>
                <DialogTitle className='text-lg font-semibold'>Edit Personal Data</DialogTitle>
              </div>
              <button onClick={() => setIsPersonalDataOpen(false)}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>

            {personalData && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePersonalDataSave();
                }}
                className='space-y-3'
              >
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Address</label>
                  <textarea
                    className='w-full rounded-md border p-2'
                    rows={3}
                    value={personalData.address || ''}
                    onChange={(e) => setPersonalData({ ...personalData, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Telephone</label>
                  <input
                    className='w-full rounded-md border p-2'
                    value={personalData.telephone || ''}
                    onChange={(e) => setPersonalData({ ...personalData, telephone: e.target.value })}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Next of Kin Name</label>
                  <input
                    className='w-full rounded-md border p-2'
                    value={personalData.nok_name || ''}
                    onChange={(e) => setPersonalData({ ...personalData, nok_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Next of Kin Telephone</label>
                  <input
                    className='w-full rounded-md border p-2'
                    value={personalData.nok_telephone || ''}
                    onChange={(e) => setPersonalData({ ...personalData, nok_telephone: e.target.value })}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Next of Kin Relationship</label>
                  <input
                    className='w-full rounded-md border p-2'
                    value={personalData.nok_relationship || ''}
                    onChange={(e) => setPersonalData({ ...personalData, nok_relationship: e.target.value })}
                  />
                </div>
                <div className='flex justify-end gap-2 mt-4'>
                  <Button variant='secondary' type='button' onClick={handlePersonalDataCancel}>
                    Cancel
                  </Button>
                  <Button type='submit'>
                    OK
                  </Button>
                </div>
              </form>
            )}
          </DialogPanel>
        </div>
      </Dialog>

      {/* Add Coach Personal Data Modal */}
      <Dialog open={isAddPersonalDataOpen} onClose={() => {}} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <div>
                <DialogTitle className='text-lg font-semibold'>Personal Data</DialogTitle>
              </div>
              <button onClick={() => setIsAddPersonalDataOpen(false)}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddPersonalDataSave();
              }}
              className='space-y-3'
            >
              <div>
                <label className='block text-sm font-medium text-gray-700'>Address</label>
                <textarea
                  className='w-full rounded-md border p-2'
                  rows={3}
                  value={newCoach.address}
                  onChange={(e) => setNewCoach({ ...newCoach, address: e.target.value })}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Telephone</label>
                <input
                  className='w-full rounded-md border p-2'
                  value={newCoach.telephone}
                  onChange={(e) => setNewCoach({ ...newCoach, telephone: e.target.value })}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Next of Kin Name</label>
                <input
                  className='w-full rounded-md border p-2'
                  value={newCoach.nok_name}
                  onChange={(e) => setNewCoach({ ...newCoach, nok_name: e.target.value })}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Next of Kin Telephone</label>
                <input
                  className='w-full rounded-md border p-2'
                  value={newCoach.nok_telephone}
                  onChange={(e) => setNewCoach({ ...newCoach, nok_telephone: e.target.value })}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Next of Kin Relationship</label>
                <input
                  className='w-full rounded-md border p-2'
                  value={newCoach.nok_relationship}
                  onChange={(e) => setNewCoach({ ...newCoach, nok_relationship: e.target.value })}
                />
              </div>
              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='secondary' type='button' onClick={() => setIsAddPersonalDataOpen(false)}>
                  Cancel
                </Button>
                <Button type='submit'>
                  OK
                </Button>
              </div>
            </form>
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
