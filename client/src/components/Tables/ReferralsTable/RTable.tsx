import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import React from 'react';
import { createPortal } from 'react-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { X, ArrowUpDown, ChevronDown } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';

import { addReferral, editReferral } from '@lib/api/apiReferrals';
import { asString } from '@lib/helper';
import { referralfStatusLabels, referralfStatusColors, type TReferralStatus } from '@lib/types';
import { type TReferralSchema } from '@hooks/useReferrals';
import { useOrgs, useAreas } from '@hooks/useOrg';
import { useContacts } from '@hooks/useContact';
import { useReferralNotes } from '@hooks/useNotes';
import { Button, ErrorDialog, Loading } from '@components/Common';
import { ReferralNotesDisplay, type ReferralNotesDisplayRef } from '@components/Common/ReferralNotesDisplay';
import { BaseTable, useTableState, createSortableHeader } from '../BaseTable';

// -----------------------------------------------------------------------------

function DropdownPortal({ anchorRef, portalRef, align = 'left', children }: { anchorRef: React.RefObject<HTMLElement | null>; portalRef: React.RefObject<HTMLDivElement | null>; align?: 'left' | 'right'; children: React.ReactNode }) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        ...(align === 'right' ? { right: window.innerWidth - rect.right } : { left: rect.left }),
        zIndex: 9999,
      });
    }
  }, [anchorRef, align]);

  return createPortal(
    <div ref={portalRef} className='bg-white border rounded shadow-lg p-2 min-w-max' style={style}>
      {children}
    </div>,
    document.body
  );
}

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
  showCoaches?: boolean;
  setShowCoaches?: (show: boolean) => void;
  showAddButton?: boolean;
}

export function RTable({ data, onSave, showClosed, setShowClosed, showCoaches, setShowCoaches, showAddButton = true }: RTableProps): React.JSX.Element {
  const tableState = useTableState({ id: 'referral_id', desc: true });
  const availableAreas = useMemo(() =>
    Array.from(new Set(
      data
        .filter(r => showClosed || !r.status.startsWith('closed-'))
        .map(r => r.area_name || '')
    )).sort((a, b) => a.localeCompare(b)),
  [data, showClosed]);
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set(availableAreas));
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const areaDropdownRef = useRef<HTMLDivElement>(null);
  const areaAnchorRef = useRef<HTMLButtonElement>(null);
  const areaPortalRef = useRef<HTMLDivElement>(null);
  const availableAreasKey = availableAreas.join(',');

  useEffect(() => {
    setSelectedAreas(new Set(availableAreas));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableAreasKey]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        areaDropdownRef.current && !areaDropdownRef.current.contains(e.target as Node) &&
        areaPortalRef.current && !areaPortalRef.current.contains(e.target as Node)
      ) {
        setAreaDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableStatuses = useMemo(() => {
    const present = new Set(
      data
        .filter(r => showClosed || !r.status.startsWith('closed-'))
        .map(r => r.status)
    );
    return (Object.keys(referralfStatusLabels) as (keyof typeof referralfStatusLabels)[]).filter(s => present.has(s));
  }, [data, showClosed]);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set(availableStatuses));

  const availableStatusesKey = availableStatuses.join(',');

  useEffect(() => {
    setSelectedStatuses(new Set(availableStatuses));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableStatusesKey]);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const statusAnchorRef = useRef<HTMLButtonElement>(null);
  const statusPortalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node) &&
        statusPortalRef.current && !statusPortalRef.current.contains(e.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const { data: orgsData } = useOrgs();
  const { data: contactsData } = useContacts();
  const { data: areasData } = useAreas();
  const readerAreas = areasData?.filter(area => area.disabled === 0 && area.reader_area === 1) || [];
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
    reader_first_name: '' as string | null,
    area_id: null as number | null,
  });

  const copyToClipboard = useCallback(async () => {
    if (!data || data.length === 0) return;
    
    const headers = ['ID', 'First Name', 'Date', 'Status', 'Reader Area', 'Organisation', 'Contact', 'By'];
    const rows = data.map(referral => [
      referral.referral_id.toString(),
      referral.reader_first_name || '',
      referral.referral_at,
      referralfStatusLabels[referral.status],
      referral.area_name || '',
      referral.org_name,
      referral.contact_name || '',
      `${referral.first_name} ${referral.last_name}`,
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
      accessorKey: 'reader_first_name',
      header: () => (
        <div className='flex items-center whitespace-nowrap'>
          <button className='flex items-center'>
            First Name <ArrowUpDown className='ml-1 h-4 w-4' />
          </button>
        </div>
      ),
      cell: ({ getValue }) => getValue() || '',
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
      accessorKey: 'status',
      header: () => {
        const statusFiltered = availableStatuses.some(s => !selectedStatuses.has(s));
        return (
        <div className='flex items-center justify-between relative' ref={statusDropdownRef}>
          <button className='flex items-center'>
            Status <ArrowUpDown className='ml-1 h-4 w-4' />
          </button>
          <button
            ref={statusAnchorRef}
            className='relative p-1 hover:bg-gray-200 rounded transition-colors'
            onClick={(e) => { e.stopPropagation(); setStatusDropdownOpen(o => !o); }}
            title='Filter by status'
          >
            <ChevronDown size={14} className='text-gray-600' />
            {statusFiltered && <span className='absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-500' />}
          </button>
          {statusDropdownOpen && (
            <DropdownPortal anchorRef={statusAnchorRef} portalRef={statusPortalRef} align='right'>
              <div className='flex justify-start px-2 pb-1 border-b mb-1'>
                <button
                  className='text-xs text-blue-600 hover:underline'
                  onClick={(e) => { e.stopPropagation(); setSelectedStatuses(statusFiltered ? new Set(availableStatuses) : new Set()); }}
                >
                  {statusFiltered ? 'Select all' : 'Deselect all'}
                </button>
              </div>
              {availableStatuses.map(s => (
                <label key={s} className='flex items-center gap-2 px-2 py-1 hover:bg-gray-50 cursor-pointer text-sm font-normal'>
                  <input
                    type='checkbox'
                    checked={selectedStatuses.has(s)}
                    onChange={() => {
                      setSelectedStatuses(prev => {
                        const next = new Set(prev);
                        if (next.has(s)) { next.delete(s); } else { next.add(s); }
                        return next;
                      });
                    }}
                  />
                  {referralfStatusLabels[s]}
                </label>
              ))}
            </DropdownPortal>
          )}
        </div>
        );
      },
      cell: ({ getValue }) => {
        const status = getValue() as keyof typeof referralfStatusLabels;
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${referralfStatusColors[status] ?? 'bg-gray-100 text-gray-800'}`}>
            {referralfStatusLabels[status]}
          </span>
        );
      },
    },
    {
      accessorKey: 'area_name',
      header: () => {
        const areaFiltered = availableAreas.some(a => !selectedAreas.has(a));
        return (
          <div className='flex items-center justify-between relative whitespace-nowrap' ref={areaDropdownRef}>
            <button className='flex items-center'>
              Reader Area <ArrowUpDown className='ml-1 h-4 w-4' />
            </button>
            <button
              ref={areaAnchorRef}
              className='relative p-1 hover:bg-gray-200 rounded transition-colors'
              onClick={(e) => { e.stopPropagation(); setAreaDropdownOpen(o => !o); }}
              title='Filter by area'
            >
              <ChevronDown size={14} className='text-gray-600' />
              {areaFiltered && <span className='absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-500' />}
            </button>
            {areaDropdownOpen && (
              <DropdownPortal anchorRef={areaAnchorRef} portalRef={areaPortalRef} align='right'>
                <div className='flex justify-start px-2 pb-1 border-b mb-1'>
                  <button
                    className='text-xs text-blue-600 hover:underline'
                    onClick={(e) => { e.stopPropagation(); setSelectedAreas(areaFiltered ? new Set(availableAreas) : new Set()); }}
                  >
                    {areaFiltered ? 'Select all' : 'Deselect all'}
                  </button>
                </div>
                {availableAreas.map(a => (
                  <label key={a} className='flex items-center gap-2 px-2 py-1 hover:bg-gray-50 cursor-pointer text-sm font-normal'>
                    <input
                      type='checkbox'
                      checked={selectedAreas.has(a)}
                      onChange={() => {
                        setSelectedAreas(prev => {
                          const next = new Set(prev);
                          if (next.has(a)) { next.delete(a); } else { next.add(a); }
                          return next;
                        });
                      }}
                    />
                    {a || '(none)'}
                  </label>
                ))}
              </DropdownPortal>
            )}
          </div>
        );
      },
      cell: ({ getValue }) => getValue() || '',
    },
    {
      accessorKey: 'org_name',
      header: createSortableHeader('Organisation'),
    },
    {
      accessorKey: 'contact_name',
      header: createSortableHeader('Contact'),
      cell: ({ getValue }) => getValue() || '',
    },
    {
      id: 'by',
      header: createSortableHeader('By'),
      accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    },
  ];

  const filteredData = useMemo(() => {
    if (!data) return [];
    const statusFiltered = data.filter(referral =>
      selectedStatuses.has(referral.status) && selectedAreas.has(referral.area_name || '')
    );
    if (showClosed) return statusFiltered;
    return statusFiltered.filter(referral => !referral.status.startsWith('closed-'));
  }, [data, showClosed, selectedStatuses, selectedAreas]);

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
      reader_first_name: null as string | null,
      area_id: null as number | null,
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
        reader_first_name: selectedRow.reader_first_name,
        area_id: selectedRow.area_id,
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
      reader_first_name: newReferral.reader_first_name || null,
      area_id: newReferral.area_id,
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
        reader_first_name: null,
        area_id: null,
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
      reader_first_name: null,
      area_id: null,
    });
    setHasUnsavedChanges(false);
    setShowUnsavedDialog(false);
    tableState.setErrors({});
  };

  const getStatusColor = (status: string) =>
    referralfStatusColors[status as TReferralStatus] ?? 'bg-gray-100 text-gray-800';

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
            {(setShowClosed || setShowCoaches) && (
              <div className='absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-3'>
                {setShowClosed && (
                  <label htmlFor='show-closed-referrals' className='flex items-center gap-1 text-xs'>
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
                {setShowCoaches && (
                  <label htmlFor='show-coaches-table' className='flex items-center gap-1 text-xs'>
                    <input
                      id='show-coaches-table'
                      name='showCoaches'
                      type='checkbox'
                      checked={showCoaches}
                      onChange={(e) => setShowCoaches(e.target.checked)}
                      className='rounded'
                    />
                    <span>Show Coaches table</span>
                  </label>
                )}
              </div>
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
                            <option value={0}>-- Select Organisation --</option>
                            {orgsData?.filter(org => org.disabled === 0 && org.role_referrer === 1).map(org => (
                              <option key={org.org_id} value={org.org_id}>{org.name}{org.area_name ? ` (${org.area_name})` : ''}</option>
                            ))}
                          </select>
                        </div>
                        <div className='grid grid-cols-2 gap-3'>
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
                              <option value=''>-- Select Contact --</option>
                              {contactsData?.filter(contact => contact.disabled === 0 && contact.org_id === selectedRow.org_id).map(contact => (
                                <option key={contact.contact_id} value={contact.contact_id}>{contact.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor='edit-reader-area' className='block text-sm font-medium text-gray-700'>Reader Area</label>
                            <select
                              id='edit-reader-area'
                              name='area_id'
                              autoComplete='off'
                              className='w-full rounded-md border p-2'
                              value={selectedRow.area_id ?? ''}
                              onChange={(e) => setSelectedRow({ ...selectedRow, area_id: Number(e.target.value) || null })}
                            >
                              <option value=''>-- Select Area --</option>
                              {readerAreas.map(area => (
                                <option key={area.area_id} value={area.area_id}>{area.name}</option>
                              ))}
                            </select>
                          </div>
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
                        <div className='grid grid-cols-2 gap-3'>
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
                          <div>
                            <label htmlFor='edit-reader-first-name' className='block text-sm font-medium text-gray-700'>Reader First Name</label>
                            <input
                              id='edit-reader-first-name'
                              name='reader_first_name'
                              type='text'
                              autoComplete='off'
                              className='w-full rounded-md border p-2'
                              value={selectedRow.reader_first_name || ''}
                              onChange={(e) => setSelectedRow({ ...selectedRow, reader_first_name: e.target.value || null })}
                            />
                          </div>
                        </div>
                        <div className='grid grid-cols-2 gap-3'>
                          <div>
                            <label htmlFor='edit-reader-name' className='block text-sm font-medium text-gray-700'>Reader ID</label>
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
            <option value={0}>-- Select Organisation --</option>
            {orgsData?.filter(org => org.disabled === 0 && org.role_referrer === 1).map(org => (
              <option key={org.org_id} value={org.org_id}>{org.name}{org.area_name ? ` (${org.area_name})` : ''}</option>
            ))}
          </select>
          {tableState.errors.org_id && <p className='text-red-500 text-xs mt-1'>{tableState.errors.org_id}</p>}
        </div>
        <div className='grid grid-cols-2 gap-3'>
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
              <option value=''>-- Select Contact --</option>
              {contactsData?.filter(contact => contact.disabled === 0 && contact.org_id === newReferral.org_id).map(contact => (
                <option key={contact.contact_id} value={contact.contact_id}>{contact.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor='add-reader-area' className='block text-sm font-medium text-gray-700'>Reader Area</label>
            <select
              id='add-reader-area'
              name='area_id'
              autoComplete='off'
              className='w-full rounded-md border p-2'
              value={newReferral.area_id ?? ''}
              onChange={(e) => setNewReferral({ ...newReferral, area_id: Number(e.target.value) || null })}
            >
              <option value=''>-- Select Area --</option>
              {readerAreas.map(area => (
                <option key={area.area_id} value={area.area_id}>{area.name}</option>
              ))}
            </select>
          </div>
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
        <div className='grid grid-cols-2 gap-3'>
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
          <div>
            <label htmlFor='add-reader-first-name' className='block text-sm font-medium text-gray-700'>Reader First Name</label>
            <input
              id='add-reader-first-name'
              name='reader_first_name'
              type='text'
              autoComplete='off'
              className='w-full rounded-md border p-2'
              value={newReferral.reader_first_name || ''}
              onChange={(e) => setNewReferral({ ...newReferral, reader_first_name: e.target.value || null })}
            />
          </div>
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