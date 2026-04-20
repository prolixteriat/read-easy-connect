import { useState, useCallback } from 'react';
import React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { X } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

import { type TReaderSchema, type TReadersSchema } from '@hooks/useReaders';
import { useAreas } from '@hooks/useOrg';
import { useCoaches } from '@hooks/useCoaches';
import { useReaderNotes } from '@hooks/useNotes';
import { useReferrals } from '@hooks/useReferrals';
import { useOrgs } from '@hooks/useOrg';
import { useContacts } from '@hooks/useContact';

import { editReader, addReader } from '@lib/api/apiReaders';
import { addReferral, editReferral } from '@lib/api/apiReferrals';
import { asString} from '@lib/helper';
import { type TReferralStatus } from '@lib/types';

import { Button, ConfirmDialog, ErrorDialog, Loading, HoverHelp, MessageDialog } from '@components/Common';
import { NotesDisplay } from '@components/Common/NotesDisplay';
import { BaseTable, useTableState, createSortableHeader, 
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
  const [selectedReferralOrgId, setSelectedReferralOrgId] = useState<number>(0);
  const [selectedReferralContactId, setSelectedReferralContactId] = useState<number | null>(null);
  const [selectedReferralText, setSelectedReferralText] = useState<string>('');
  const [selectedReferralStatus, setSelectedReferralStatus] = useState<string>('');
  const [selectedReferralDate, setSelectedReferralDate] = useState<string>('');
  const [newReferralOrgId, setNewReferralOrgId] = useState<number>(0);
  const [newReferralContactId, setNewReferralContactId] = useState<number | null>(null);
  const [newReferralText, setNewReferralText] = useState<string>('');
  const [newReferralStatus, setNewReferralStatus] = useState<string>('new');
  const [newReferralDate, setNewReferralDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [originalReferralOrgId, setOriginalReferralOrgId] = useState<number>(0);
  const [originalReferralContactId, setOriginalReferralContactId] = useState<number | null>(null);
  const [originalReferralText, setOriginalReferralText] = useState<string>('');
  const [originalReferralStatus, setOriginalReferralStatus] = useState<string>('');
  const [originalReferralDate, setOriginalReferralDate] = useState<string>('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [addedReaderName, setAddedReaderName] = useState('');
  const [newReader, setNewReader] = useState({ 
    area_id: null as number | null,
    coach_id: null as number | null,
    enrolment_at: null as string | null,
    referral_id: null as number | null,
    availability: null as string | null,
    notes: null as string | null
  });
  
  const { data: areasData } = useAreas();
  const { data: coachesData } = useCoaches();
  const { data: notesData, error: notesError, isLoading: notesLoading, mutate: notesMutate } = useReaderNotes(selectedRow?.reader_id);
  const { data: referralsData, mutate: referralsMutate } = useReferrals();
  const { data: orgsData } = useOrgs();
  const { data: contactsData } = useContacts();
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState({ 
    note: '', 
    note_at: new Date().toISOString().split('T')[0],
    copyToCoach: false
  });
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState('');
  const areas = areasData?.filter(area => area.disabled === 0) || [];
  const availableCoaches = coachesData?.filter(coach => 
    coach.user_status !== 'leaver' && 
    coach.user_status !== 'onhold' && 
    (coach.status === 'trained' || coach.status === 'paired')
  ) || [];
  
  const currentCoach = selectedRow?.coach_id ? coachesData?.find(coach => coach.coach_id === selectedRow.coach_id) : null;
  const coaches = currentCoach && !availableCoaches.find(coach => coach.coach_id === currentCoach.coach_id)
    ? [currentCoach, ...availableCoaches.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''))]
    : availableCoaches.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));

  const handleAddNoteClick = React.useCallback(() => {
    setNoteError('');
    setShowAddNote(true);
  }, []);

  const handleAddNote = React.useCallback(async () => {
    if (!selectedRow?.reader_id || !newNote.note.trim() || !newNote.note_at.trim()) {
      setNoteError('Note content and date are required');
      return;
    }
    
    setIsSavingNote(true);
    setNoteError('');
    
    try {
      const { addReaderNote, addCoachNote } = await import('@lib/api/apiNotes');
      
      // Add note to reader
      const result = await addReaderNote({
        about_id: selectedRow.reader_id,
        note: newNote.note,
        note_at: newNote.note_at
      });
      
      if (result.success) {
        // If checkbox is selected and reader has a coach, also add note to coach
        if (newNote.copyToCoach && selectedRow.coach_id) {
          const coachResult = await addCoachNote({
            about_id: selectedRow.coach_id,
            note: newNote.note,
            note_at: newNote.note_at
          });
          
          if (!coachResult.success) {
            setNoteError(`Note added to reader but failed to add to coach: ${asString(coachResult.message, 'Unknown error')}`);
            return;
          }
        }
        
        setShowAddNote(false);
        setNewNote({ note: '', note_at: new Date().toISOString().split('T')[0], copyToCoach: false });
        setNoteError('');
        notesMutate?.();
      } else {
        setNoteError(asString(result.message, 'An error occurred while adding note'));
      }
    } catch {
      setNoteError('An error occurred while adding note');
    } finally {
      setIsSavingNote(false);
    }
  }, [selectedRow?.reader_id, selectedRow?.coach_id, newNote.note, newNote.note_at, newNote.copyToCoach, notesMutate]);

  const handleCancelNote = React.useCallback(() => {
    setShowAddNote(false);
    setNewNote({ note: '', note_at: new Date().toISOString().split('T')[0], copyToCoach: false });
    setNoteError('');
  }, []);

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
    // Find the referral associated with this reader to populate the Enquiry tab
    const associatedReferral = referralsData?.find(ref => ref.referral_id === row.referral_id);
    if (associatedReferral) {
      const orgId = associatedReferral.org_id;
      const contactId = associatedReferral.contact_id;
      const referralText = associatedReferral.referral;
      const status = associatedReferral.status;
      const date = associatedReferral.referral_at.split('T')[0].split(' ')[0];
      
      setSelectedReferralOrgId(orgId);
      setSelectedReferralContactId(contactId);
      setSelectedReferralText(referralText);
      setSelectedReferralStatus(status);
      setSelectedReferralDate(date);
      
      // Store original values for change detection
      setOriginalReferralOrgId(orgId);
      setOriginalReferralContactId(contactId);
      setOriginalReferralText(referralText);
      setOriginalReferralStatus(status);
      setOriginalReferralDate(date);
    } else {
      setSelectedReferralOrgId(0);
      setSelectedReferralContactId(null);
      setSelectedReferralText('');
      setSelectedReferralStatus('');
      setSelectedReferralDate('');
      
      setOriginalReferralOrgId(0);
      setOriginalReferralContactId(null);
      setOriginalReferralText('');
      setOriginalReferralStatus('');
      setOriginalReferralDate('');
    }
    tableState.setErrors({});
    tableState.setIsOpen(true);
  };

  const hasChanges = selectedRow && originalRow && (
    selectedRow.name !== originalRow.name ||
    selectedRow.level !== originalRow.level ||
    selectedRow.status !== originalRow.status ||
    selectedRow.area_id !== originalRow.area_id ||
    selectedRow.coach_id !== originalRow.coach_id ||
    selectedRow.enrolment_at !== originalRow.enrolment_at ||
    selectedRow.coaching_start_at !== originalRow.coaching_start_at ||
    selectedRow.graduation_at !== originalRow.graduation_at ||
    selectedRow.TP1_start_at !== originalRow.TP1_start_at ||
    selectedRow.TP2_start_at !== originalRow.TP2_start_at ||
    selectedRow.TP3_start_at !== originalRow.TP3_start_at ||
    selectedRow.TP4_start_at !== originalRow.TP4_start_at ||
    selectedRow.TP5_start_at !== originalRow.TP5_start_at ||
    selectedRow.TP1_completion_at !== originalRow.TP1_completion_at ||
    selectedRow.TP2_completion_at !== originalRow.TP2_completion_at ||
    selectedRow.TP3_completion_at !== originalRow.TP3_completion_at ||
    selectedRow.TP4_completion_at !== originalRow.TP4_completion_at ||
    selectedRow.TP5_completion_at !== originalRow.TP5_completion_at ||
    selectedRow.TP1_certificate !== originalRow.TP1_certificate ||
    selectedRow.TP2_certificate !== originalRow.TP2_certificate ||
    selectedRow.TP3_certificate !== originalRow.TP3_certificate ||
    selectedRow.TP4_certificate !== originalRow.TP4_certificate ||
    selectedRow.TP5_certificate !== originalRow.TP5_certificate ||
    selectedRow.ons4_1 !== originalRow.ons4_1 ||
    selectedRow.ons4_2 !== originalRow.ons4_2 ||
    selectedRow.ons4_3 !== originalRow.ons4_3 ||
    selectedRow.availability !== originalRow.availability ||
    selectedRow.notes !== originalRow.notes ||
    selectedReferralOrgId !== originalReferralOrgId ||
    selectedReferralContactId !== originalReferralContactId ||
    selectedReferralText !== originalReferralText ||
    selectedReferralStatus !== originalReferralStatus ||
    selectedReferralDate !== originalReferralDate
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

  const hasAddChanges = newReader.area_id || newReader.coach_id || newReader.enrolment_at || newReader.referral_id || newReader.availability || newReader.notes || newReferralOrgId || newReferralContactId || newReferralText || newReferralStatus !== 'new' || newReferralDate !== new Date().toISOString().split('T')[0];

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
      referral_id: null,
      availability: null,
      notes: null
    });
    // Reset referral fields
    setNewReferralOrgId(0);
    setNewReferralContactId(null);
    setNewReferralText('');
    setNewReferralStatus('new');
    setNewReferralDate(new Date().toISOString().split('T')[0]);
    tableState.setErrors({});
  };

  const validateAddForm = () => {
    tableState.setErrors({});
    return true;
  };

  const validateEditForm = () => {
    const newErrors: Record<string, string> = {};
    if (selectedRow && !selectedRow.name.trim()) newErrors.name = 'Name is required';
    
    // Enquiry date validation - must be <= enrolment date if both exist
    if (selectedRow && selectedRow.enrolment_at && selectedReferralDate) {
      const enrolmentDate = new Date(selectedRow.enrolment_at.split('T')[0].split(' ')[0]);
      const referralDate = new Date(selectedReferralDate.split('T')[0].split(' ')[0]);
      if (referralDate > enrolmentDate) {
        newErrors.referral_date = 'Enquiry date must be on or before enrolment date';
      }
    }
    
    // Date validation logic
    if (selectedRow) {
      // Use current form values, not original selectedRow values
      const enrolment = selectedRow.enrolment_at ? new Date(selectedRow.enrolment_at.split('T')[0].split(' ')[0]) : null;
      const coachingStart = selectedRow.coaching_start_at ? new Date(selectedRow.coaching_start_at.split('T')[0].split(' ')[0]) : null;
      const tp1Start = selectedRow.TP1_start_at ? new Date(selectedRow.TP1_start_at.split('T')[0].split(' ')[0]) : null;
      const tp1Completion = selectedRow.TP1_completion_at ? new Date(selectedRow.TP1_completion_at.split('T')[0].split(' ')[0]) : null;
      const tp2Start = selectedRow.TP2_start_at ? new Date(selectedRow.TP2_start_at.split('T')[0].split(' ')[0]) : null;
      const tp2Completion = selectedRow.TP2_completion_at ? new Date(selectedRow.TP2_completion_at.split('T')[0].split(' ')[0]) : null;
      const tp3Start = selectedRow.TP3_start_at ? new Date(selectedRow.TP3_start_at.split('T')[0].split(' ')[0]) : null;
      const tp3Completion = selectedRow.TP3_completion_at ? new Date(selectedRow.TP3_completion_at.split('T')[0].split(' ')[0]) : null;
      const tp4Start = selectedRow.TP4_start_at ? new Date(selectedRow.TP4_start_at.split('T')[0].split(' ')[0]) : null;
      const tp4Completion = selectedRow.TP4_completion_at ? new Date(selectedRow.TP4_completion_at.split('T')[0].split(' ')[0]) : null;
      const tp5Start = selectedRow.TP5_start_at ? new Date(selectedRow.TP5_start_at.split('T')[0].split(' ')[0]) : null;
      const tp5Completion = selectedRow.TP5_completion_at ? new Date(selectedRow.TP5_completion_at.split('T')[0].split(' ')[0]) : null;
      const graduation = selectedRow.graduation_at ? new Date(selectedRow.graduation_at.split('T')[0].split(' ')[0]) : null;
      
      // enrolment_at <= coaching_start_at
      if (enrolment && coachingStart && enrolment > coachingStart) {
        newErrors.coaching_start_at = 'Coaching start date must be on or after enrolment date';
      }
      
      // coaching_start_at <= TP1_start_at
      if (coachingStart && tp1Start && coachingStart > tp1Start) {
        newErrors.TP1_start_at = 'TP1 start date must be on or after coaching start date';
      }
      
      // TP1: start < completion and start required if completion provided
      if (tp1Completion && !tp1Start) {
        newErrors.TP1_start_at = 'TP1 start date cannot be null if TP1 completion is provided';
      }
      if (tp1Start && tp1Completion && tp1Start >= tp1Completion) {
        newErrors.TP1_completion_at = 'Completion date for TP1 cannot be before it has started';
      }
      
      // TP2: start < completion and start required if completion provided
      if (tp2Completion && !tp2Start) {
        newErrors.TP2_start_at = 'TP2 start date cannot be null if TP2 completion is provided';
      }
      if (tp2Start && tp2Completion && tp2Start >= tp2Completion) {
        newErrors.TP2_completion_at = 'Completion date for TP2 cannot be before it has started';
      }
      
      // TP3: start < completion and start required if completion provided
      if (tp3Completion && !tp3Start) {
        newErrors.TP3_start_at = 'TP3 start date cannot be null if TP3 completion is provided';
      }
      if (tp3Start && tp3Completion && tp3Start >= tp3Completion) {
        newErrors.TP3_completion_at = 'Completion date for TP3 cannot be before it has started';
      }
      
      // TP4: start < completion and start required if completion provided
      if (tp4Completion && !tp4Start) {
        newErrors.TP4_start_at = 'TP4 start date cannot be null if TP4 completion is provided';
      }
      if (tp4Start && tp4Completion && tp4Start >= tp4Completion) {
        newErrors.TP4_completion_at = 'Completion date for TP4 cannot be before it has started';
      }
      
      // TP5: start < completion and start required if completion provided
      if (tp5Completion && !tp5Start) {
        newErrors.TP5_start_at = 'TP5 start date cannot be null if TP5 completion is provided';
      }
      if (tp5Start && tp5Completion && tp5Start >= tp5Completion) {
        newErrors.TP5_completion_at = 'Completion date for TP5 cannot be before it has started';
      }
      
      // TP2_start_at >= TP1_completion_at (TP2 cannot start if TP1 is not completed)
      if (tp2Start && !tp1Completion) {
        newErrors.TP2_start_at = 'Cannot start TP2 before TP1 is completed';
      } else if (tp1Completion && tp2Start && tp2Start < tp1Completion) {
        newErrors.TP2_start_at = 'Cannot start TP2 before TP1 is completed';
      }
      
      // TP3_start_at >= TP2_completion_at (TP3 cannot start if TP2 is not completed)
      if (tp3Start && !tp2Completion) {
        newErrors.TP3_start_at = 'Cannot start TP3 before TP2 is completed';
      } else if (tp2Completion && tp3Start && tp3Start < tp2Completion) {
        newErrors.TP3_start_at = 'Cannot start TP3 before TP2 is completed';
      }
      
      // TP4_start_at >= TP3_completion_at (TP4 cannot start if TP3 is not completed)
      if (tp4Start && !tp3Completion) {
        newErrors.TP4_start_at = 'Cannot start TP4 before TP3 is completed';
      } else if (tp3Completion && tp4Start && tp4Start < tp3Completion) {
        newErrors.TP4_start_at = 'Cannot start TP4 before TP3 is completed';
      }
      
      // TP5_start_at >= TP4_completion_at (TP5 cannot start if TP4 is not completed)
      if (tp5Start && !tp4Completion) {
        newErrors.TP5_start_at = 'Cannot start TP5 before TP4 is completed';
      } else if (tp4Completion && tp5Start && tp5Start < tp4Completion) {
        newErrors.TP5_start_at = 'Cannot start TP5 before TP4 is completed';
      }
      
      // graduation_at >= TP5_completion_at
      if (tp5Completion && graduation && graduation < tp5Completion) {
        newErrors.graduation_at = 'Graduation date must be on or after TP5 completion date';
      }
    }
    
    tableState.setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateEditForm()) return;
    
    if (selectedRow) {
      tableState.setIsSaving(true);
      
      // Handle referral operations first
      let referralResult;
      if (selectedRow.referral_id) {
        // Edit existing referral
        referralResult = await editReferral({
          referral_id: selectedRow.referral_id,
          org_id: selectedReferralOrgId,
          contact_id: selectedReferralContactId,
          by_id: 1, // TODO: Get actual user ID
          status: selectedReferralStatus as TReferralStatus,
          referral: selectedReferralText,
          referral_at: selectedReferralDate,
        });
      } else if (selectedReferralOrgId && selectedReferralText && selectedReferralDate) {
        // Add new referral
        referralResult = await addReferral({
          org_id: selectedReferralOrgId,
          contact_id: selectedReferralContactId,
          by_id: 1, // TODO: Get actual user ID
          status: (selectedReferralStatus || 'new') as TReferralStatus,
          referral: selectedReferralText,
          referral_at: selectedReferralDate,
        });
        
        // If referral was created successfully, update the reader with the new referral_id
        if (referralResult.success && referralResult.message && typeof referralResult.message === 'object') {
          const responseData = referralResult.message as { referral_id?: number };
          if (responseData.referral_id) {
            selectedRow.referral_id = responseData.referral_id;
          }
        }
      }
      
      // If referral operation failed, show error and stop
      if (referralResult && !referralResult.success) {
        tableState.setIsSaving(false);
        tableState.setErrorMessage(asString(referralResult.message, 'An error occurred while saving referral'));
        tableState.setShowError(true);
        return;
      }
      
      // Now save the reader
      const result = await editReader({
        reader_id: selectedRow.reader_id,
        name: selectedRow.name,
        area_id: selectedRow.area_id || null,
        coach_id: selectedRow.coach_id || null,
        level: selectedRow.level,
        status: selectedRow.status,
        referral_id: selectedRow.referral_id || undefined,
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
        TP1_certificate: selectedRow.TP1_certificate,
        TP2_certificate: selectedRow.TP2_certificate,
        TP3_certificate: selectedRow.TP3_certificate,
        TP4_certificate: selectedRow.TP4_certificate,
        TP5_certificate: selectedRow.TP5_certificate,
        ons4_1: selectedRow.ons4_1,
        ons4_2: selectedRow.ons4_2,
        ons4_3: selectedRow.ons4_3,
      });
      
      tableState.setIsSaving(false);
      if (result.success) {
        // Refresh referrals data to ensure the enquiry tab shows updated information
        await referralsMutate?.();
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
    
    let referralId = newReader.referral_id;
    
    // Handle referral operations first if new referral data is provided
    if (!referralId && newReferralOrgId && newReferralText && newReferralDate) {
      // Add new referral
      const referralResult = await addReferral({
        org_id: newReferralOrgId,
        contact_id: newReferralContactId,
        by_id: 1, // TODO: Get actual user ID
        status: (newReferralStatus || 'new') as TReferralStatus,
        referral: newReferralText,
        referral_at: newReferralDate,
      });
      
      // If referral was created successfully, use the new referral_id
      if (referralResult.success && referralResult.message && typeof referralResult.message === 'object') {
        const responseData = referralResult.message as { referral_id?: number };
        if (responseData.referral_id) {
          referralId = responseData.referral_id;
        }
      } else if (!referralResult.success) {
        tableState.setIsSaving(false);
        tableState.setErrorMessage(asString(referralResult.message, 'An error occurred while saving referral'));
        tableState.setShowError(true);
        return;
      }
    }
    
    const result = await addReader({
      area_id: newReader.area_id || undefined,
      coach_id: newReader.coach_id || undefined,
      enrolment_at: newReader.enrolment_at || undefined,
      referral_id: referralId || undefined,
      availability: newReader.availability || undefined,
      notes: newReader.notes || undefined,
    });
    
    tableState.setIsSaving(false);
    if (result.success) {
      const responseData = result.message as { reader_id?: number; name?: string };
      const returnedName = responseData?.name || '';
      
      // Refresh referrals data to ensure the enquiry tab shows updated information
      await referralsMutate?.();
      onSave({} as Reader);
      setIsAddOpen(false);
      setNewReader({ 
        area_id: null,
        coach_id: null,
        enrolment_at: null,
        referral_id: null,
        availability: null,
        notes: null
      });
      // Reset referral fields
      setNewReferralOrgId(0);
      setNewReferralContactId(null);
      setNewReferralText('');
      setNewReferralStatus('new');
      setNewReferralDate(new Date().toISOString().split('T')[0]);
      tableState.setErrors({});
      
      setAddedReaderName(returnedName);
      setShowSuccessDialog(true);
    } else {
      tableState.setErrorMessage(asString(result.message, 'An error occurred while adding reader'));
      tableState.setShowError(true);
    }
  };

  const renderMobileCard = (reader: Reader) => (
    <div 
      className='bg-white border rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md'
      onClick={() => handleRowClick(reader)}
    >
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
              id='readers-filter-input'
              name='filter'
              type='text'
              placeholder='Filter...'
              className='w-full rounded-md border p-2 text-sm pr-32'
              value={tableState.globalFilter ?? ''}
              onChange={(e) => tableState.setGlobalFilter(e.target.value)}
            />
            {setShowGDOC && (
              <label htmlFor='readers-show-gdoc-checkbox' className='absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs'>
                <input
                  id='readers-show-gdoc-checkbox'
                  name='showGDOC'
                  type='checkbox'
                  checked={showGDOC}
                  onChange={(e) => setShowGDOC(e.target.checked)}
                  className='rounded'
                />
                <span>Show G, DO and C</span>
              </label>
            )}
          </div>
          <Button variant='primary' onClick={() => { tableState.setErrors({}); setIsAddOpen(true); }} className='sm:whitespace-nowrap'>
            Add Reader
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
                <DialogTitle className='text-lg font-semibold'>Edit Reader</DialogTitle>
                <p className='text-sm text-blue-600 font-bold'>ID: {selectedRow?.reader_id} • {selectedRow?.name}</p>
              </div>
              <button onClick={handleCancel}>
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
                    Enquiry{selectedRow.referral_id ? ' (1)' : ' (0)'}
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
                    <>
                      {/* Error Summary */}
                      {Object.keys(tableState.errors).length > 0 && (
                        <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-md'>
                          <h4 className='text-sm font-medium text-red-800 mb-2'>Please correct the following errors:</h4>
                          <ul className='text-sm text-red-700 space-y-1'>
                            {Object.entries(tableState.errors).map(([field, error]) => (
                              <li key={field}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className='space-y-3 max-h-96 overflow-y-auto pr-2'
              >
                <div className='grid grid-cols-2 gap-3 mb-4'>
                  <div>
                    <label htmlFor='edit-reader-id' className='block text-sm font-medium text-gray-700'>Reader ID</label>
                    <input
                      id='edit-reader-id'
                      name='readerId'
                      className='w-full rounded-md border p-2 bg-gray-100'
                      value={selectedRow.name}
                      readOnly
                    />
                  </div>
                  <div>
                    <label htmlFor='edit-level' className='block text-sm font-medium text-gray-700'>Level</label>
                    <input
                      id='edit-level'
                      name='level'
                      className='w-full rounded-md border p-2 bg-gray-100'
                      value={selectedRow.level}
                      readOnly
                    />
                  </div>
                </div>
                
                <div className='grid grid-cols-2 gap-3 mb-4'>
                  <div>
                    <label htmlFor='edit-status' className='block text-sm font-medium text-gray-700'>Status</label>
                    <select
                      id='edit-status'
                      name='status'
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
                    <label htmlFor='edit-area' className='block text-sm font-medium text-gray-700'>Area</label>
                    <select
                      id='edit-area'
                      name='area'
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

                <div className='mb-4'>
                  <label htmlFor='edit-coach' className='block text-sm font-medium text-gray-700'>
                    Coach
                    <HoverHelp text='Select a Coach to work with the Reader. Within the dropdown list, each Coach name is followed in brackets by their respective Coordinator name. An asterisk beside the Coach name indicates that the Coach is already assigned to at least one other Reader. Only trained Coaches are shown.' />
                  </label>
                  <select
                    id='edit-coach'
                    name='coach'
                    className='w-full rounded-md border p-2'
                    value={selectedRow.coach_id ?? ''}
                    onChange={(e) => setSelectedRow({ ...selectedRow, coach_id: Number(e.target.value) || null })}
                  >
                    <option value=''>-- Select Coach --</option>
                    {coaches.map(coach => {
                      const coordinatorInfo = coach.coordinator_first_name && coach.coordinator_last_name 
                        ? ` (${coach.coordinator_first_name} ${coach.coordinator_last_name})` 
                        : '';
                      // Check if coach is assigned to any active readers (not G, DO, or C), excluding current reader
                      const hasActiveReaders = data.some(reader => 
                        reader.coach_id === coach.coach_id && 
                        reader.reader_id !== selectedRow.reader_id &&
                        !['G', 'DO', 'C'].includes(reader.status)
                      );
                      const pairedIndicator = hasActiveReaders ? '*' : '';
                      return (
                        <option key={coach.coach_id} value={coach.coach_id}>
                          {coach.first_name} {coach.last_name}{pairedIndicator}{coordinatorInfo}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className='grid grid-cols-2 gap-3 mb-4'>
                  <div>
                    <label htmlFor='edit-enrolment' className='block text-sm font-medium text-gray-700'>Enrolment</label>
                    <input
                      id='edit-enrolment'
                      name='enrolment'
                      type='date'
                      className={`w-full rounded-md border p-2 ${tableState.errors.enrolment_at ? 'border-red-500' : ''}`}
                      value={selectedRow.enrolment_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, enrolment_at: e.target.value || null })}
                    />
                    {tableState.errors.enrolment_at && <p className='text-red-500 text-xs mt-1'>{tableState.errors.enrolment_at}</p>}
                  </div>
                  <div>
                    <label htmlFor='edit-coaching-start' className='block text-sm font-medium text-gray-700'>Coaching Start</label>
                    <input
                      id='edit-coaching-start'
                      name='coachingStart'
                      type='date'
                      className={`w-full rounded-md border p-2 ${tableState.errors.coaching_start_at ? 'border-red-500' : ''}`}
                      value={selectedRow.coaching_start_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, coaching_start_at: e.target.value || null })}
                    />
                    {tableState.errors.coaching_start_at && <p className='text-red-500 text-xs mt-1'>{tableState.errors.coaching_start_at}</p>}
                  </div>
                </div>



                <div className='grid grid-cols-2 gap-3 mb-4'>
                  <div>
                    <label htmlFor='edit-tp1-start' className='block text-sm font-medium text-gray-700'>TP1 Start</label>
                    <input
                      id='edit-tp1-start'
                      name='tp1Start'
                      type='date'
                      className={`w-full rounded-md border p-2 ${tableState.errors.TP1_start_at ? 'border-red-500' : ''}`}
                      value={selectedRow.TP1_start_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP1_start_at: e.target.value || null })}
                    />
                    {tableState.errors.TP1_start_at && <p className='text-red-500 text-xs mt-1'>{tableState.errors.TP1_start_at}</p>}
                  </div>
                  <div>
                    <label htmlFor='edit-tp1-completion' className='block text-sm font-medium text-gray-700'>TP1 Completion</label>
                    <input
                      id='edit-tp1-completion'
                      name='tp1Completion'
                      type='date'
                      className={`w-full rounded-md border p-2 ${tableState.errors.TP1_completion_at ? 'border-red-500' : ''}`}
                      value={selectedRow.TP1_completion_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP1_completion_at: e.target.value || null })}
                    />
                    {tableState.errors.TP1_completion_at && <p className='text-red-500 text-xs mt-1'>{tableState.errors.TP1_completion_at}</p>}
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3 mb-4'>
                  <div>
                    <label htmlFor='edit-tp2-start' className='block text-sm font-medium text-gray-700'>TP2 Start</label>
                    <input
                      id='edit-tp2-start'
                      name='tp2Start'
                      type='date'
                      className={`w-full rounded-md border p-2 ${tableState.errors.TP2_start_at ? 'border-red-500' : ''}`}
                      value={selectedRow.TP2_start_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP2_start_at: e.target.value || null })}
                    />
                    {tableState.errors.TP2_start_at && <p className='text-red-500 text-xs mt-1'>{tableState.errors.TP2_start_at}</p>}
                  </div>
                  <div>
                    <label htmlFor='edit-tp2-completion' className='block text-sm font-medium text-gray-700'>TP2 Completion</label>
                    <input
                      id='edit-tp2-completion'
                      name='tp2Completion'
                      type='date'
                      className={`w-full rounded-md border p-2 ${tableState.errors.TP2_completion_at ? 'border-red-500' : ''}`}
                      value={selectedRow.TP2_completion_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP2_completion_at: e.target.value || null })}
                    />
                    {tableState.errors.TP2_completion_at && <p className='text-red-500 text-xs mt-1'>{tableState.errors.TP2_completion_at}</p>}
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3 mb-4'>
                  <div>
                    <label htmlFor='edit-tp3-start' className='block text-sm font-medium text-gray-700'>TP3 Start</label>
                    <input
                      id='edit-tp3-start'
                      name='tp3Start'
                      type='date'
                      className={`w-full rounded-md border p-2 ${tableState.errors.TP3_start_at ? 'border-red-500' : ''}`}
                      value={selectedRow.TP3_start_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP3_start_at: e.target.value || null })}
                    />
                    {tableState.errors.TP3_start_at && <p className='text-red-500 text-xs mt-1'>{tableState.errors.TP3_start_at}</p>}
                  </div>
                  <div>
                    <label htmlFor='edit-tp3-completion' className='block text-sm font-medium text-gray-700'>TP3 Completion</label>
                    <input
                      id='edit-tp3-completion'
                      name='tp3Completion'
                      type='date'
                      className={`w-full rounded-md border p-2 ${tableState.errors.TP3_completion_at ? 'border-red-500' : ''}`}
                      value={selectedRow.TP3_completion_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP3_completion_at: e.target.value || null })}
                    />
                    {tableState.errors.TP3_completion_at && <p className='text-red-500 text-xs mt-1'>{tableState.errors.TP3_completion_at}</p>}
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3 mb-4'>
                  <div>
                    <label htmlFor='edit-tp4-start' className='block text-sm font-medium text-gray-700'>TP4 Start</label>
                    <input
                      id='edit-tp4-start'
                      name='tp4Start'
                      type='date'
                      className={`w-full rounded-md border p-2 ${tableState.errors.TP4_start_at ? 'border-red-500' : ''}`}
                      value={selectedRow.TP4_start_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP4_start_at: e.target.value || null })}
                    />
                    {tableState.errors.TP4_start_at && <p className='text-red-500 text-xs mt-1'>{tableState.errors.TP4_start_at}</p>}
                  </div>
                  <div>
                    <label htmlFor='edit-tp4-completion' className='block text-sm font-medium text-gray-700'>TP4 Completion</label>
                    <input
                      id='edit-tp4-completion'
                      name='tp4Completion'
                      type='date'
                      className={`w-full rounded-md border p-2 ${tableState.errors.TP4_completion_at ? 'border-red-500' : ''}`}
                      value={selectedRow.TP4_completion_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP4_completion_at: e.target.value || null })}
                    />
                    {tableState.errors.TP4_completion_at && <p className='text-red-500 text-xs mt-1'>{tableState.errors.TP4_completion_at}</p>}
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3 mb-4'>
                  <div>
                    <label htmlFor='edit-tp5-start' className='block text-sm font-medium text-gray-700'>TP5 Start</label>
                    <input
                      id='edit-tp5-start'
                      name='tp5Start'
                      type='date'
                      className={`w-full rounded-md border p-2 ${tableState.errors.TP5_start_at ? 'border-red-500' : ''}`}
                      value={selectedRow.TP5_start_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP5_start_at: e.target.value || null })}
                    />
                    {tableState.errors.TP5_start_at && <p className='text-red-500 text-xs mt-1'>{tableState.errors.TP5_start_at}</p>}
                  </div>
                  <div>
                    <label htmlFor='edit-tp5-completion' className='block text-sm font-medium text-gray-700'>TP5 Completion</label>
                    <input
                      id='edit-tp5-completion'
                      name='tp5Completion'
                      type='date'
                      className={`w-full rounded-md border p-2 ${tableState.errors.TP5_completion_at ? 'border-red-500' : ''}`}
                      value={selectedRow.TP5_completion_at?.split(' ')[0] ?? ''}
                      onChange={(e) => setSelectedRow({ ...selectedRow, TP5_completion_at: e.target.value || null })}
                    />
                    {tableState.errors.TP5_completion_at && <p className='text-red-500 text-xs mt-1'>{tableState.errors.TP5_completion_at}</p>}
                  </div>
                </div>

                <div className='mb-4'>
                  <label htmlFor='edit-graduation' className='block text-sm font-medium text-gray-700'>Graduation</label>
                  <input
                    id='edit-graduation'
                    name='graduation'
                    type='date'
                    className={`w-full rounded-md border p-2 ${tableState.errors.graduation_at ? 'border-red-500' : ''}`}
                    value={selectedRow.graduation_at?.split(' ')[0] ?? ''}
                    onChange={(e) => setSelectedRow({ ...selectedRow, graduation_at: e.target.value || null })}
                  />
                  {tableState.errors.graduation_at && <p className='text-red-500 text-xs mt-1'>{tableState.errors.graduation_at}</p>}
                </div>

                <div className='grid grid-cols-3 gap-3 mb-4'>
                  <div>
                    <label htmlFor='edit-ons4-1' className='block text-sm font-medium text-gray-700'>ONS4: pre-TP1</label>
                    <select
                      id='edit-ons4-1'
                      name='ons41'
                      className={`w-full rounded-md border p-2 ${selectedRow.ons4_1 === 0 ? 'bg-red-100' : ''}`}
                      value={selectedRow.ons4_1}
                      onChange={(e) => setSelectedRow({ ...selectedRow, ons4_1: Number(e.target.value) })}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor='edit-ons4-2' className='block text-sm font-medium text-gray-700'>ONS4: post-TP3</label>
                    <select
                      id='edit-ons4-2'
                      name='ons42'
                      className={`w-full rounded-md border p-2 ${selectedRow.ons4_2 === 0 ? 'bg-red-100' : ''}`}
                      value={selectedRow.ons4_2}
                      onChange={(e) => setSelectedRow({ ...selectedRow, ons4_2: Number(e.target.value) })}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor='edit-ons4-3' className='block text-sm font-medium text-gray-700'>ONS4: post-TP5</label>
                    <select
                      id='edit-ons4-3'
                      name='ons43'
                      className={`w-full rounded-md border p-2 ${selectedRow.ons4_3 === 0 ? 'bg-red-100' : ''}`}
                      value={selectedRow.ons4_3}
                      onChange={(e) => setSelectedRow({ ...selectedRow, ons4_3: Number(e.target.value) })}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                </div>

                <div className='mb-4'>
                  <label htmlFor='edit-availability' className='block text-sm font-medium text-gray-700'>Availability</label>
                  <textarea
                    id='edit-availability'
                    name='availability'
                    className='w-full rounded-md border p-2'
                    rows={2}
                    value={selectedRow.availability ?? ''}
                    onChange={(e) => setSelectedRow({ ...selectedRow, availability: e.target.value || null })}
                  />
                </div>

                <div>
                  <label htmlFor='edit-comments' className='block text-sm font-medium text-gray-700'>Comments</label>
                  <textarea
                    id='edit-comments'
                    name='comments'
                    className='w-full rounded-md border p-2'
                    rows={3}
                    value={selectedRow.notes ?? ''}
                    onChange={(e) => setSelectedRow({ ...selectedRow, notes: e.target.value || null })}
                  />
                </div>

                <div className='flex justify-end gap-2 mt-4'>
                  <Button variant='secondary' type='button' onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type='submit' disabled={tableState.isSaving}>
                    {tableState.isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
                    </>
                  </TabPanel>
                  <TabPanel>
                    {/* Error Summary */}
                    {Object.keys(tableState.errors).length > 0 && (
                      <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-md'>
                        <h4 className='text-sm font-medium text-red-800 mb-2'>Please correct the following errors:</h4>
                        <ul className='text-sm text-red-700 space-y-1'>
                          {Object.entries(tableState.errors).map(([field, error]) => (
                            <li key={field}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSave();
                      }}
                      className='space-y-3 max-h-[500px] overflow-y-auto pr-2'
                    >
                      <div className='space-y-3'>
                        <div>
                          <label htmlFor='edit-enquiry-id' className='block text-sm font-medium text-gray-700'>
                            Enquiry ID
                            <HoverHelp text='Select an existing enquiry record to associate with this Reader. Note that only those enquiry records which have not already been associated will be displayed. Alternatively, leave this field blank and enter new values below before clicking Save.' />
                          </label>
                          <select
                            id='edit-enquiry-id'
                            name='enquiry_id'
                            autoComplete='off'
                            className='w-full rounded-md border p-2'
                            value={selectedRow.referral_id || ''}
                            onChange={(e) => {
                              const referralId = e.target.value ? Number(e.target.value) : null;
                              setSelectedRow({ ...selectedRow, referral_id: referralId });
                              
                              // Update referral fields when a new enquiry is selected
                              if (referralId) {
                                const selectedReferral = referralsData?.find(ref => ref.referral_id === referralId);
                                if (selectedReferral) {
                                  setSelectedReferralOrgId(selectedReferral.org_id);
                                  setSelectedReferralContactId(selectedReferral.contact_id);
                                  setSelectedReferralText(selectedReferral.referral);
                                  setSelectedReferralStatus(selectedReferral.status);
                                  setSelectedReferralDate(selectedReferral.referral_at.split('T')[0].split(' ')[0]);
                                }
                              } else {
                                setSelectedReferralOrgId(0);
                                setSelectedReferralContactId(null);
                                setSelectedReferralText('');
                                setSelectedReferralStatus('');
                                setSelectedReferralDate('');
                              }
                            }}
                          >
                            <option value=''>-- Select existing enquiry --</option>
                            {referralsData?.filter(referral => !referral.status.startsWith('closed-') && (referral.reader_name === null || referral.reader_name === selectedRow.name)).sort((a, b) => a.referral_id - b.referral_id).map(referral => {
                              const date = new Date(referral.referral_at).toLocaleDateString('en-GB');
                              const displayText = `${referral.referral_id}: - ${date} - ${referral.org_name}${referral.area_name ? ` (${referral.area_name})` : ''}`;
                              return (
                                <option key={referral.referral_id} value={referral.referral_id}>
                                  {displayText}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div>
                          <label htmlFor='edit-referral-org' className='block text-sm font-medium text-gray-700'>Organisation *</label>
                          <select
                            id='edit-referral-org'
                            name='referral_org_id'
                            autoComplete='off'
                            className='w-full rounded-md border p-2'
                            value={selectedReferralOrgId}
                            onChange={(e) => {
                              const newOrgId = Number(e.target.value);
                              setSelectedReferralOrgId(newOrgId);
                            }}
                          >
                            <option value={0}>-- Select an organisation --</option>
                            {orgsData?.filter(org => org.disabled === 0 && org.role_referrer === 1).map(org => (
                              <option key={org.org_id} value={org.org_id}>
                                {org.name}{org.area_name ? ` (${org.area_name})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor='edit-referral-contact' className='block text-sm font-medium text-gray-700'>Contact</label>
                          <select
                            id='edit-referral-contact'
                            name='referral_contact_id'
                            autoComplete='off'
                            className='w-full rounded-md border p-2'
                            value={selectedReferralContactId || ''}
                            onChange={(e) => setSelectedReferralContactId(e.target.value ? Number(e.target.value) : null)}
                          >
                            <option value=''>-- Select a contact --</option>
                            {contactsData?.filter(contact => 
                              contact.disabled === 0 && contact.org_id === selectedReferralOrgId
                            ).map(contact => (
                              <option key={contact.contact_id} value={contact.contact_id}>{contact.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor='edit-referral-enquiry' className='block text-sm font-medium text-gray-700'>
                            Enquiry * <span className='text-xs text-gray-500 font-normal ml-4'>Do not include any personal data about potential Readers</span>
                          </label>
                          <textarea
                            id='edit-referral-enquiry'
                            name='referral_enquiry'
                            autoComplete='off'
                            className='w-full rounded-md border p-2'
                            rows={3}
                            value={selectedReferralText}
                            onChange={(e) => setSelectedReferralText(e.target.value)}
                          />
                        </div>
                        <div className='grid grid-cols-2 gap-3'>
                          <div>
                            <label htmlFor='edit-referral-status' className='block text-sm font-medium text-gray-700'>Status</label>
                            <select
                              id='edit-referral-status'
                              name='referral_status'
                              autoComplete='off'
                              className='w-full rounded-md border p-2'
                              value={selectedReferralStatus}
                              onChange={(e) => setSelectedReferralStatus(e.target.value)}
                            >
                              <option value='new'>New</option>
                              <option value='pending'>Pending</option>
                              <option value='onhold'>On Hold</option>
                              <option value='closed-successful'>Closed - Successful</option>
                              <option value='closed-withdrew'>Closed - Withdrew</option>
                              <option value='closed-unable'>Closed - Unable to help</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor='edit-referral-date' className='block text-sm font-medium text-gray-700'>Date *</label>
                            <input
                              id='edit-referral-date'
                              name='referral_date'
                              type='date'
                              autoComplete='off'
                              className={`w-full rounded-md border p-2 ${tableState.errors.referral_date ? 'border-red-500' : ''}`}
                              value={selectedReferralDate}
                              onChange={(e) => setSelectedReferralDate(e.target.value)}
                            />
                            {tableState.errors.referral_date && <p className='text-red-500 text-xs mt-1'>{tableState.errors.referral_date}</p>}
                          </div>
                        </div>
                      </div>
                      <div className='flex justify-end gap-2 mt-4'>
                        <Button variant='secondary' type='button' onClick={handleCancel}>
                          Cancel
                        </Button>
                        <Button type='submit' disabled={tableState.isSaving}>
                          {tableState.isSaving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </form>
                  </TabPanel>
                  <TabPanel>
                    <div className='max-h-96 overflow-y-auto'>
                      <NotesDisplay 
                        data={notesData} 
                        isLoading={notesLoading ?? false} 
                        error={notesError}
                        aboutId={selectedRow.reader_id}
                        onRefresh={() => notesMutate?.()}
                        noteType='reader'
                      />
                    </div>
                    <div className='flex justify-between items-center mt-4'>
                      <Button variant='primary' type='button' onClick={handleAddNoteClick}>
                        Add Note
                      </Button>
                      <div className='flex gap-2'>
                        <Button variant='secondary' type='button' onClick={handleCancel}>
                          Cancel
                        </Button>
                        <Button type='button' onClick={handleSave} disabled={tableState.isSaving}>
                          {tableState.isSaving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </TabPanel>
                </TabPanels>
              </TabGroup>
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
      
      <Dialog open={isAddOpen} onClose={() => {}} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <div>
                <DialogTitle className='text-lg font-semibold'>Add Reader</DialogTitle>
              </div>
              <button onClick={handleAddCancel}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>

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
                  Enquiry
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddReader();
                    }}
                    className='space-y-3 max-h-[500px] overflow-y-auto pr-2'
                  >
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <label htmlFor='add-area' className='block text-sm font-medium text-gray-700'>Area</label>
                        <select
                          id='add-area'
                          name='area'
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
                        <label htmlFor='add-enrolment' className='block text-sm font-medium text-gray-700'>Enrolment</label>
                        <input
                          id='add-enrolment'
                          name='enrolment'
                          type='date'
                          className='w-full rounded-md border p-2'
                          value={newReader.enrolment_at ?? ''}
                          onChange={(e) => setNewReader({ ...newReader, enrolment_at: e.target.value || null })}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor='add-coach' className='block text-sm font-medium text-gray-700'>
                        Coach
                        <HoverHelp text='Select a Coach to work with the Reader. Within the dropdown list, each Coach name is followed in brackets by their respective Coordinator name. An asterisk beside the Coach name indicates that the Coach is already assigned to at least one other Reader. Only trained Coaches are shown.' />
                      </label>
                      <select
                        id='add-coach'
                        name='coach'
                        className='w-full rounded-md border p-2'
                        value={newReader.coach_id ?? ''}
                        onChange={(e) => setNewReader({ ...newReader, coach_id: Number(e.target.value) || null })}
                      >
                        <option value=''>-- Select Coach --</option>
                        {coaches.map(coach => {
                          const coordinatorInfo = coach.coordinator_first_name && coach.coordinator_last_name 
                            ? ` (${coach.coordinator_first_name} ${coach.coordinator_last_name})` 
                            : '';
                          // Check if coach is assigned to any active readers (not G, DO, or C)
                          const hasActiveReaders = data.some(reader => 
                            reader.coach_id === coach.coach_id && 
                            !['G', 'DO', 'C'].includes(reader.status)
                          );
                          const pairedIndicator = hasActiveReaders ? '*' : '';
                          return (
                            <option key={coach.coach_id} value={coach.coach_id}>
                              {coach.first_name} {coach.last_name}{pairedIndicator}{coordinatorInfo}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label htmlFor='add-availability' className='block text-sm font-medium text-gray-700'>Availability</label>
                      <textarea
                        id='add-availability'
                        name='availability'
                        className='w-full rounded-md border p-2'
                        rows={2}
                        value={newReader.availability ?? ''}
                        onChange={(e) => setNewReader({ ...newReader, availability: e.target.value || null })}
                      />
                    </div>

                    <div>
                      <label htmlFor='add-comments' className='block text-sm font-medium text-gray-700'>Comments</label>
                      <textarea
                        id='add-comments'
                        name='comments'
                        className='w-full rounded-md border p-2'
                        rows={3}
                        value={newReader.notes ?? ''}
                        onChange={(e) => setNewReader({ ...newReader, notes: e.target.value || null })}
                      />
                    </div>

                    <div className='flex justify-end gap-2 mt-4'>
                      <Button variant='secondary' type='button' onClick={handleAddCancel}>
                        Cancel
                      </Button>
                      <Button type='submit' disabled={tableState.isSaving}>
                        {tableState.isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </form>
                </TabPanel>
                <TabPanel>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddReader();
                    }}
                    className='space-y-3 max-h-[500px] overflow-y-auto pr-2'
                  >
                    <div className='space-y-3'>
                      <div>
                        <label htmlFor='add-enquiry-id' className='block text-sm font-medium text-gray-700'>
                          Enquiry ID
                          <HoverHelp text='Select an existing enquiry record to associate with this Reader. Note that only those enquiry records which have not already been associated will be displayed. Alternatively, leave this field blank and enter new values below before clicking Save.' />
                        </label>
                        <select
                          id='add-enquiry-id'
                          name='enquiry_id'
                          autoComplete='off'
                          className='w-full rounded-md border p-2'
                          value={newReader.referral_id || ''}
                          onChange={(e) => {
                            const referralId = e.target.value ? Number(e.target.value) : null;
                            setNewReader({ ...newReader, referral_id: referralId });
                            
                            // Update referral fields when a new enquiry is selected
                            if (referralId) {
                              const selectedReferral = referralsData?.find(ref => ref.referral_id === referralId);
                              if (selectedReferral) {
                                setNewReferralOrgId(selectedReferral.org_id);
                                setNewReferralContactId(selectedReferral.contact_id);
                                setNewReferralText(selectedReferral.referral);
                                setNewReferralStatus(selectedReferral.status);
                                setNewReferralDate(selectedReferral.referral_at.split('T')[0].split(' ')[0]);
                              }
                            } else {
                              setNewReferralOrgId(0);
                              setNewReferralContactId(null);
                              setNewReferralText('');
                              setNewReferralStatus('');
                              setNewReferralDate('');
                            }
                          }}
                        >
                          <option value=''>-- Select existing enquiry --</option>
                          {referralsData?.filter(referral => !referral.status.startsWith('closed-') && referral.reader_name === null).sort((a, b) => a.referral_id - b.referral_id).map(referral => {
                            const date = new Date(referral.referral_at).toLocaleDateString('en-GB');
                            const displayText = `${referral.referral_id}: - ${date} - ${referral.org_name}${referral.area_name ? ` (${referral.area_name})` : ''}`;
                            return (
                              <option key={referral.referral_id} value={referral.referral_id}>
                                {displayText}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        <label htmlFor='add-referral-org' className='block text-sm font-medium text-gray-700'>Organisation *</label>
                        <select
                          id='add-referral-org'
                          name='referral_org_id'
                          autoComplete='off'
                          className='w-full rounded-md border p-2'
                          value={newReferralOrgId}
                          onChange={(e) => {
                            const newOrgId = Number(e.target.value);
                            setNewReferralOrgId(newOrgId);
                          }}
                        >
                          <option value={0}>-- Select an organisation --</option>
                          {orgsData?.filter(org => org.disabled === 0 && org.role_referrer === 1).map(org => (
                            <option key={org.org_id} value={org.org_id}>
                              {org.name}{org.area_name ? ` (${org.area_name})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor='add-referral-contact' className='block text-sm font-medium text-gray-700'>Contact</label>
                        <select
                          id='add-referral-contact'
                          name='referral_contact_id'
                          autoComplete='off'
                          className='w-full rounded-md border p-2'
                          value={newReferralContactId || ''}
                          onChange={(e) => setNewReferralContactId(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value=''>-- Select a contact --</option>
                          {contactsData?.filter(contact => 
                            contact.disabled === 0 && contact.org_id === newReferralOrgId
                          ).map(contact => (
                            <option key={contact.contact_id} value={contact.contact_id}>{contact.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor='add-referral-enquiry' className='block text-sm font-medium text-gray-700'>
                          Enquiry * <span className='text-xs text-gray-500 font-normal ml-4'>Do not include any personal data about potential Readers</span>
                        </label>
                        <textarea
                          id='add-referral-enquiry'
                          name='referral_enquiry'
                          autoComplete='off'
                          className='w-full rounded-md border p-2'
                          rows={3}
                          value={newReferralText}
                          onChange={(e) => setNewReferralText(e.target.value)}
                        />
                      </div>
                      <div className='grid grid-cols-2 gap-3'>
                        <div>
                          <label htmlFor='add-referral-status' className='block text-sm font-medium text-gray-700'>Status</label>
                          <select
                            id='add-referral-status'
                            name='referral_status'
                            autoComplete='off'
                            className='w-full rounded-md border p-2'
                            value={newReferralStatus}
                            onChange={(e) => setNewReferralStatus(e.target.value)}
                          >
                            <option value='new'>New</option>
                            <option value='pending'>Pending</option>
                            <option value='onhold'>On Hold</option>
                            <option value='closed-successful'>Closed - Successful</option>
                            <option value='closed-withdrew'>Closed - Withdrew</option>
                            <option value='closed-unable'>Closed - Unable to help</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor='add-referral-date' className='block text-sm font-medium text-gray-700'>Date *</label>
                          <input
                            id='add-referral-date'
                            name='referral_date'
                            type='date'
                            autoComplete='off'
                            className='w-full rounded-md border p-2'
                            value={newReferralDate}
                            onChange={(e) => setNewReferralDate(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className='flex justify-end gap-2 mt-4'>
                      <Button variant='secondary' type='button' onClick={handleAddCancel}>
                        Cancel
                      </Button>
                      <Button type='submit' disabled={tableState.isSaving}>
                        {tableState.isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </form>
                </TabPanel>
              </TabPanels>
            </TabGroup>
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

      {/* Add Note Modal */}
      <Dialog open={showAddNote} onClose={() => {}} className='relative z-[60]'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <DialogTitle className='text-lg font-semibold'>Add Note</DialogTitle>
              <button onClick={handleCancelNote}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Note *</label>
                <textarea
                  className='w-full rounded-md border p-2'
                  rows={4}
                  value={newNote.note}
                  onChange={(e) => setNewNote({ ...newNote, note: e.target.value })}
                  placeholder='Enter note...'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Date *</label>
                <input
                  type='date'
                  className='w-full rounded-md border p-2'
                  value={newNote.note_at}
                  onChange={(e) => setNewNote({ ...newNote, note_at: e.target.value })}
                  required
                />
              </div>
              {selectedRow?.coach_id && (
                <div>
                  <label className='flex items-center gap-2 text-sm text-gray-700'>
                    <input
                      type='checkbox'
                      className='rounded'
                      checked={newNote.copyToCoach}
                      onChange={(e) => setNewNote({ ...newNote, copyToCoach: e.target.checked })}
                    />
                    Copy note to this Reader's Coach
                  </label>
                </div>
              )}
              {noteError && (
                <div className='text-red-600 text-sm bg-red-50 p-2 rounded'>{noteError}</div>
              )}
              
              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='secondary' onClick={handleCancelNote}>
                  Cancel
                </Button>
                <Button onClick={handleAddNote} disabled={isSavingNote}>
                  {isSavingNote ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {tableState.isSaving && <Loading />}
    </>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
