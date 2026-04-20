import { useState, useEffect } from 'react';
import React from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { X } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import useSWR from 'swr';
import { z } from 'zod';

import { useOrgs } from '@hooks/useOrg';
import { useReferrals } from '@hooks/useReferrals';
import { useOrgNotes, useReferralNotes } from '@hooks/useNotes';
import { addReaderNote, addCoachNote, addOrgNote, addReferralNote, editOrgNote } from '@lib/api/apiNotes';
import { asString } from '@lib/helper';
import { orgTypeLabels, type TOrgType } from '@lib/types';
import { JwtManager } from '@lib/jwtManager';
import { apiBaseUrl } from '@lib/config';
import { fetcherAuth } from '@lib/fetcher';

import { Button, ErrorDialog } from '@components/Common';
import { NotesDisplay } from '@components/Common/NotesDisplay';
import Loading from '@components/Common/Loading';
import HoverHelp from '@components/Common/HoverHelp';

// -----------------------------------------------------------------------------

// Helper functions for URL generation
const getCoachNotesUrl = (aboutId?: number): string => {
    const url = `${apiBaseUrl}/notes/get-coach-notes`;
    return aboutId ? `${url}?about_id=${aboutId}` : url;
}

const getReaderNotesUrl = (aboutId?: number): string => {
    const url = `${apiBaseUrl}/notes/get-reader-notes`;
    return aboutId ? `${url}?about_id=${aboutId}` : url;
}

const getReadersUrl = (): string => `${apiBaseUrl}/readers/get-readers`;
const getCoachesUrl = (): string => `${apiBaseUrl}/coaches/get-coaches`;

// Schema definitions
const NotesSchema = z.object({
    note_id: z.number(),
    about_id: z.number(),
    by_id: z.number(),
    note: z.string(),
    note_at: z.string(),
    created_at: z.string(),
    about_name: z.string(),
    by_name: z.string(),
});

const ReadersSchema = z.object({
    reader_id: z.number(),
    name: z.string(),
    affiliate_id: z.number(),
    area_id: z.number().nullable(),
    area_name: z.string().nullable(),
    coach_id: z.number().nullable(),
    coach_first_name: z.string().nullable(),
    coach_last_name: z.string().nullable(),
    referral_id: z.number().nullable(),
    created_at: z.string(),
    level: z.string(),
    status: z.string(),
    availability: z.string().nullable(),
    notes: z.string().nullable(),
    enrolment_at: z.string().nullable(),
    coaching_start_at: z.string().nullable(),
    graduation_at: z.string().nullable(),
    TP1_start_at: z.string().nullable(),
    TP2_start_at: z.string().nullable(),
    TP3_start_at: z.string().nullable(),
    TP4_start_at: z.string().nullable(),
    TP5_start_at: z.string().nullable(),
    TP1_completion_at: z.string().nullable(),
    TP2_completion_at: z.string().nullable(),
    TP3_completion_at: z.string().nullable(),
    TP4_completion_at: z.string().nullable(),
    TP5_completion_at: z.string().nullable(),
    TP1_certificate: z.number(),
    TP2_certificate: z.number(),
    TP3_certificate: z.number(),
    TP4_certificate: z.number(),
    TP5_certificate: z.number(),
    ons4_1: z.number(),
    ons4_2: z.number(),
    ons4_3: z.number(),
});

const CoachesSchema = z.object({
    coach_id: z.number(),
    coordinator_id: z.number().nullable(),
    coordinator_first_name: z.string().nullable(),
    coordinator_last_name: z.string().nullable(),
    area_id: z.number().nullable(),
    area_name: z.string().nullable(),
    status: z.string(),
    email_consent: z.number(),
    whatsapp_consent: z.number(),
    dbs_completed: z.number(),
    ref_completed: z.number(),
    commitment_completed: z.number(),
    training: z.string(),
    edib_training: z.string(),
    consol_training: z.string(),
    use_email: z.number(),
    consol_training_at: z.string().nullable(),
    availability: z.string().nullable(),
    preferences: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    user_status: z.string(),
    disabled: z.number(),
    password_reset: z.number(),
});

const NotesSchemaArray = z.array(NotesSchema);
const ReadersSchemaArray = z.array(ReadersSchema);
const CoachesSchemaArray = z.array(CoachesSchema);

const notesFetcher = (data: string[]) => fetcherAuth(data, NotesSchemaArray);
const readersFetcher = (data: string[]) => fetcherAuth(data, ReadersSchemaArray);
const coachesFetcher = (data: string[]) => fetcherAuth(data, CoachesSchemaArray);

interface QuickNoteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickNote({ isOpen, onClose }: QuickNoteProps): React.JSX.Element {
  const [selectedReaderId, setSelectedReaderId] = useState<number | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<number | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0); // Track active tab
  const [showAddNote, setShowAddNote] = useState(false);
  const [showEditNote, setShowEditNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState<{
    note_id: number;
    about_id: number;
    by_id: number;
    note: string;
    note_at: string;
    type: TOrgType | null;
    created_at: string;
    about_name: string;
    by_name: string;
  } | null>(null);
  const [newNote, setNewNote] = useState({ 
    note: '', 
    note_at: new Date().toISOString().split('T')[0],
    copyToCoach: false,
    type: null as TOrgType | null
  });
  const [editNote, setEditNote] = useState({ 
    note: '', 
    note_at: '',
    type: null as TOrgType | null
  });
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  
  const jwtManager = new JwtManager();
  const currentUserId = jwtManager.getUserId();
  const currentUserRole = jwtManager.getRole();
  const isViewer = currentUserRole === 'viewer';

  // Use conditional SWR calls to prevent API calls for viewers
  const readersKey = isViewer ? null : [getReadersUrl(), jwtManager.getToken()];
  const coachesKey = isViewer ? null : [getCoachesUrl(), jwtManager.getToken()];
  const readerNotesKey = isViewer ? null : [getReaderNotesUrl(selectedReaderId || undefined), jwtManager.getToken()];
  const coachNotesKey = isViewer ? null : [getCoachNotesUrl(selectedCoachId || undefined), jwtManager.getToken()];
  
  const { data: readersData } = useSWR(
    readersKey,
    readersFetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );
  
  const { data: coachesData } = useSWR(
    coachesKey,
    coachesFetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );
  
  const { data: orgsData } = useOrgs();
  const { data: referralsData } = useReferrals();
  
  const { data: notesData, error: notesError, isLoading: notesLoading, mutate: notesMutate } = useSWR(
    readerNotesKey,
    notesFetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );
  
  const { data: coachNotesData, error: coachNotesError, isLoading: coachNotesLoading, mutate: coachNotesMutate } = useSWR(
    coachNotesKey,
    notesFetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );
  
  const { data: orgNotesData, isLoading: orgNotesLoading, mutate: orgNotesMutate } = useOrgNotes(selectedOrgId || undefined);
  const { data: referralNotesData, error: referralNotesError, isLoading: referralNotesLoading, mutate: referralNotesMutate } = useReferralNotes(selectedEnquiryId || undefined);

  const handleReaderChange = (readerId: string) => {
    const id = readerId ? Number(readerId) : null;
    setSelectedReaderId(id);
  };

  const handleCoachChange = (coachId: string) => {
    const id = coachId ? Number(coachId) : null;
    setSelectedCoachId(id);
  };

  const handleOrgChange = (orgId: string) => {
    const id = orgId ? Number(orgId) : null;
    setSelectedOrgId(id);
  };

  const handleEnquiryChange = (enquiryId: string) => {
    const id = enquiryId ? Number(enquiryId) : null;
    setSelectedEnquiryId(id);
  };

  const handleOrgNoteClick = React.useCallback((note: {
    note_id: number;
    about_id: number;
    by_id: number;
    note: string;
    note_at: string;
    type: TOrgType | null;
    created_at: string;
    about_name: string;
    by_name: string;
  }) => {
    if (note.by_id !== currentUserId) {
      setErrorTitle('Permission Denied');
      setNoteError('You can only edit notes that you created.');
      setShowError(true);
      return;
    }
    setSelectedNote(note);
    setEditNote({ 
      note: note.note, 
      note_at: note.note_at.split(' ')[0],
      type: note.type as TOrgType | null
    });
    setNoteError('');
    setShowEditNote(true);
  }, [currentUserId]);

  const handleEditNoteSubmit = React.useCallback(async () => {
    if (!selectedNote || !editNote.note.trim() || !editNote.note_at.trim()) {
      setNoteError('Note content and date are required');
      return;
    }
    
    setIsSavingNote(true);
    setNoteError('');
    
    try {
      const result = await editOrgNote({
        note_id: selectedNote.note_id,
        note: editNote.note,
        note_at: editNote.note_at,
        type: editNote.type
      });
      
      if (result.success) {
        setShowEditNote(false);
        setSelectedNote(null);
        setEditNote({ note: '', note_at: '', type: null });
        setNoteError('');
        orgNotesMutate?.();
      } else {
        setNoteError(asString(result.message, 'An error occurred while updating note'));
      }
    } catch {
      setNoteError('An error occurred while updating note');
    } finally {
      setIsSavingNote(false);
    }
  }, [selectedNote, editNote.note, editNote.note_at, editNote.type, orgNotesMutate]);

  const handleCancelEditNote = React.useCallback(() => {
    setShowEditNote(false);
    setSelectedNote(null);
    setEditNote({ note: '', note_at: '', type: null });
    setNoteError('');
  }, []);

  const handleAddNoteClick = React.useCallback(() => {
    setNoteError('');
    setShowAddNote(true);
  }, []);

  const handleAddNote = React.useCallback(async () => {
    // Determine which record to add note to based on active tab
    let aboutId: number | null = null;
    let noteType: 'reader' | 'coach' | 'org' | 'referral' = 'reader';
    
    if (isViewer) {
      // For viewers: tab 0 = Organisation, tab 1 = Enquiry
      if (activeTab === 0 && selectedOrgId) {
        aboutId = selectedOrgId;
        noteType = 'org';
      } else if (activeTab === 1 && selectedEnquiryId) {
        aboutId = selectedEnquiryId;
        noteType = 'referral';
      }
    } else {
      // For non-viewers: tab 0 = Reader, tab 1 = Coach, tab 2 = Organisation, tab 3 = Enquiry
      if (activeTab === 0 && selectedReaderId) {
        aboutId = selectedReaderId;
        noteType = 'reader';
      } else if (activeTab === 1 && selectedCoachId) {
        aboutId = selectedCoachId;
        noteType = 'coach';
      } else if (activeTab === 2 && selectedOrgId) {
        aboutId = selectedOrgId;
        noteType = 'org';
      } else if (activeTab === 3 && selectedEnquiryId) {
        aboutId = selectedEnquiryId;
        noteType = 'referral';
      }
    }
    
    if (!aboutId || !newNote.note.trim() || !newNote.note_at.trim()) {
      setNoteError('Note content and date are required');
      return;
    }
    
    setIsSavingNote(true);
    setNoteError('');
    
    try {
      // Add note based on determined type
      let result;
      if (noteType === 'reader') {
        result = await addReaderNote({
          about_id: aboutId,
          note: newNote.note,
          note_at: newNote.note_at
        });
      } else if (noteType === 'coach') {
        result = await addCoachNote({
          about_id: aboutId,
          note: newNote.note,
          note_at: newNote.note_at
        });
      } else if (noteType === 'org') {
        result = await addOrgNote({
          about_id: aboutId,
          note: newNote.note,
          note_at: newNote.note_at,
          type: newNote.type || undefined
        });
      } else {
        result = await addReferralNote({
          about_id: aboutId,
          note: newNote.note,
          note_at: newNote.note_at
        });
      }
      
      if (result.success) {
        // If checkbox is selected and reader has a coach, also add note to coach
        if (noteType === 'reader' && newNote.copyToCoach) {
          const selectedReader = readersData?.find(reader => reader.reader_id === aboutId);
          if (selectedReader?.coach_id) {
            const coachResult = await addCoachNote({
              about_id: selectedReader.coach_id,
              note: newNote.note,
              note_at: newNote.note_at
            });
            
            if (!coachResult.success) {
              setNoteError(`Note added to reader but failed to add to coach: ${asString(coachResult.message, 'Unknown error')}`);
              return;
            }
          }
        }
        
        setShowAddNote(false);
        setNewNote({ note: '', note_at: new Date().toISOString().split('T')[0], copyToCoach: false, type: null });
        setNoteError('');
        // Refresh the appropriate notes list
        if (noteType === 'reader') {
          notesMutate?.();
        } else if (noteType === 'coach') {
          coachNotesMutate?.();
        } else if (noteType === 'org') {
          orgNotesMutate?.();
        } else {
          referralNotesMutate?.();
        }
      } else {
        setNoteError(asString(result.message, 'An error occurred while adding note'));
      }
    } catch {
      setNoteError('An error occurred while adding note');
    } finally {
      setIsSavingNote(false);
    }
  }, [activeTab, isViewer, selectedReaderId, selectedCoachId, selectedOrgId, selectedEnquiryId, newNote.note, newNote.note_at, newNote.copyToCoach, newNote.type, notesMutate, coachNotesMutate, orgNotesMutate, referralNotesMutate, readersData]);

  const handleCancelNote = React.useCallback(() => {
    setShowAddNote(false);
    setNewNote({ note: '', note_at: new Date().toISOString().split('T')[0], copyToCoach: false, type: null });
    setNoteError('');
  }, []);

  const handleClose = () => {
    setSelectedReaderId(null);
    setSelectedCoachId(null);
    setSelectedOrgId(null);
    setSelectedEnquiryId(null);
    setActiveTab(isViewer ? 0 : 0); // Reset to first available tab
    setShowAddNote(false);
    setShowEditNote(false);
    setSelectedNote(null);
    setNewNote({ note: '', note_at: new Date().toISOString().split('T')[0], copyToCoach: false, type: null });
    setEditNote({ note: '', note_at: '', type: null });
    setNoteError('');
    setShowError(false);
    setErrorTitle('');
    onClose();
  };

  // Refresh notes when tab gains focus
  useEffect(() => {
    if (isViewer) {
      // For viewers: tab 0 = Organisation, tab 1 = Enquiry
      if (activeTab === 0 && selectedOrgId) {
        orgNotesMutate?.();
      } else if (activeTab === 1 && selectedEnquiryId) {
        referralNotesMutate?.();
      }
    } else {
      // For non-viewers: tab 0 = Reader, tab 1 = Coach, tab 2 = Organisation, tab 3 = Enquiry
      if (activeTab === 0 && selectedReaderId) {
        notesMutate?.();
      } else if (activeTab === 1 && selectedCoachId) {
        coachNotesMutate?.();
      } else if (activeTab === 2 && selectedOrgId) {
        orgNotesMutate?.();
      } else if (activeTab === 3 && selectedEnquiryId) {
        referralNotesMutate?.();
      }
    }
  }, [activeTab, selectedReaderId, selectedCoachId, selectedOrgId, selectedEnquiryId, isViewer, notesMutate, coachNotesMutate, orgNotesMutate, referralNotesMutate]);

  return (
    <Dialog open={isOpen} onClose={() => {}} className='relative z-50'>
      <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <DialogPanel className='w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg'>
          <div className='flex justify-between items-start mb-4'>
            <DialogTitle className='text-lg font-semibold'>Quick Note</DialogTitle>
            <button onClick={handleClose}>
              <X className='h-5 w-5 text-gray-500' />
            </button>
          </div>

          <TabGroup selectedIndex={activeTab} onChange={setActiveTab}>
            <TabList className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-4">
              {!isViewer && (
                <Tab className={({ selected }) =>
                  `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                    selected
                      ? 'bg-white shadow'
                      : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                  }`
                }>
                  Reader
                </Tab>
              )}
              {!isViewer && (
                <Tab className={({ selected }) =>
                  `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                    selected
                      ? 'bg-white shadow'
                      : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                  }`
                }>
                  Coach
                </Tab>
              )}
              <Tab className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                  selected
                    ? 'bg-white shadow'
                    : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                }`
              }>
                Organisation
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
              {!isViewer && (
                <TabPanel>
                  <div className='space-y-4'>
                    <div>
                      <label htmlFor='reader-select' className='block text-sm font-medium text-gray-700 mb-2'>
                        Reader ID
                        <HoverHelp text='Select a Reader ID from the list. Only current readers are shown (S, NYS, P). Coach name is provided if assigned.' />
                      </label>
                      <select
                        id='reader-select'
                        className='w-full rounded-md border p-2'
                        value={selectedReaderId || ''}
                        onChange={(e) => handleReaderChange(e.target.value)}
                      >
                        <option value=''>-- Select Reader --</option>
                        {readersData?.filter(reader => !['C', 'G', 'DO'].includes(reader.status)).sort((a, b) => a.name.localeCompare(b.name)).map(reader => (
                          <option key={reader.reader_id} value={reader.reader_id}>
                            {reader.name}{reader.coach_first_name && reader.coach_last_name ? ` (${reader.coach_first_name} ${reader.coach_last_name})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className='max-h-96 overflow-y-auto'>
                      {selectedReaderId ? (
                        <NotesDisplay 
                          data={notesData} 
                          isLoading={notesLoading ?? false} 
                          error={notesError}
                          aboutId={selectedReaderId}
                          onRefresh={() => notesMutate?.()}
                          noteType='reader'
                        />
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="max-h-64 overflow-y-auto">
                            <table className="min-w-full bg-white table-fixed">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="w-24 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                    Date
                                  </th>
                                  <th className="w-32 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                    By
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                    Note
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                <tr>
                                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                    No notes found
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabPanel>
              )}
              {!isViewer && (
                <TabPanel>
                  <div className='space-y-4'>
                    <div>
                      <label htmlFor='coach-select' className='block text-sm font-medium text-gray-700 mb-2'>
                        Coach
                      </label>
                      <select
                        id='coach-select'
                        className='w-full rounded-md border p-2'
                        value={selectedCoachId || ''}
                        onChange={(e) => handleCoachChange(e.target.value)}
                      >
                        <option value=''>-- Select Coach --</option>
                        {coachesData?.filter(coach => coach.user_status !== 'leaver').sort((a, b) => a.first_name.localeCompare(b.first_name)).map(coach => (
                          <option key={coach.coach_id} value={coach.coach_id}>
                            {coach.first_name} {coach.last_name}{coach.coordinator_first_name && coach.coordinator_last_name ? ` (${coach.coordinator_first_name} ${coach.coordinator_last_name})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className='max-h-96 overflow-y-auto'>
                      {selectedCoachId ? (
                        <NotesDisplay 
                          data={coachNotesData} 
                          isLoading={coachNotesLoading ?? false} 
                          error={coachNotesError}
                          aboutId={selectedCoachId}
                          onRefresh={() => coachNotesMutate?.()}
                          noteType='coach'
                        />
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="max-h-64 overflow-y-auto">
                            <table className="min-w-full bg-white table-fixed">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="w-24 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                    Date
                                  </th>
                                  <th className="w-32 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                    By
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                    Note
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                <tr>
                                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                    No notes found
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabPanel>
              )}
              <TabPanel>
                <div className='space-y-4'>
                  <div>
                    <label htmlFor='org-select' className='block text-sm font-medium text-gray-700 mb-2'>
                      Organisation
                    </label>
                    <select
                      id='org-select'
                      className='w-full rounded-md border p-2'
                      value={selectedOrgId || ''}
                      onChange={(e) => handleOrgChange(e.target.value)}
                    >
                      <option value=''>-- Select Organisation --</option>
                      {orgsData?.filter(org => org.disabled === 0).sort((a, b) => a.name.localeCompare(b.name)).map(org => (
                        <option key={org.org_id} value={org.org_id}>
                          {org.name}{org.area_name ? ` (${org.area_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className='max-h-96 overflow-y-auto'>
                    {selectedOrgId ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="max-h-64 overflow-y-auto">
                          <table className="min-w-full bg-white table-fixed">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="w-24 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                  Date
                                </th>
                                <th className="w-32 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                  By
                                </th>
                                <th className="w-24 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                  Type
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                  Note
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {(!orgNotesData || orgNotesData.length === 0) ? (
                                <tr>
                                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                    {orgNotesLoading ? <Loading position="center" /> : 'No notes found'}
                                  </td>
                                </tr>
                              ) : (
                                orgNotesData.map((note) => (
                                  <tr key={note.note_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleOrgNoteClick(note)}>
                                    <td className="w-24 px-4 py-2 text-sm text-gray-900 border-b">
                                      {new Date(note.note_at).toLocaleDateString('en-GB')}
                                    </td>
                                    <td className="w-32 px-4 py-2 text-sm text-gray-900 border-b">
                                      {note.by_name}
                                    </td>
                                    <td className="w-24 px-4 py-2 text-sm text-gray-900 border-b">
                                      {note.type ? orgTypeLabels[note.type] : ''}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-900 border-b">
                                      {note.note}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="max-h-64 overflow-y-auto">
                          <table className="min-w-full bg-white table-fixed">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="w-24 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                  Date
                                </th>
                                <th className="w-32 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                  By
                                </th>
                                <th className="w-24 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                  Type
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                  Note
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                  No notes found
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabPanel>
              <TabPanel>
                <div className='space-y-4'>
                  <div>
                    <label htmlFor='enquiry-select' className='block text-sm font-medium text-gray-700 mb-2'>
                      Enquiry ID
                    </label>
                    <select
                      id='enquiry-select'
                      className='w-full rounded-md border p-2'
                      value={selectedEnquiryId || ''}
                      onChange={(e) => handleEnquiryChange(e.target.value)}
                    >
                      <option value=''>-- Select Enquiry --</option>
                      {referralsData?.filter(referral => !referral.status.startsWith('closed-')).sort((a, b) => a.referral_id - b.referral_id).map(referral => (
                        <option key={referral.referral_id} value={referral.referral_id}>
                          {referral.referral_id}: - {new Date(referral.referral_at).toLocaleDateString('en-GB')} - {referral.org_name}{referral.area_name ? ` (${referral.area_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className='max-h-96 overflow-y-auto'>
                    {selectedEnquiryId ? (
                      <NotesDisplay 
                        data={referralNotesData} 
                        isLoading={referralNotesLoading ?? false} 
                        error={referralNotesError}
                        aboutId={selectedEnquiryId}
                        onRefresh={() => referralNotesMutate?.()}
                        noteType='referral'
                      />
                    ) : (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="max-h-64 overflow-y-auto">
                          <table className="min-w-full bg-white table-fixed">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="w-24 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                  Date
                                </th>
                                <th className="w-32 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                  By
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                                  Note
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                  No notes found
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabPanel>
            </TabPanels>
          </TabGroup>

          <div className='flex justify-between items-center mt-4'>
            <Button 
              variant='primary' 
              type='button' 
              onClick={handleAddNoteClick}
              disabled={!selectedReaderId && !selectedCoachId && !selectedOrgId && !selectedEnquiryId}
            >
              Add Note
            </Button>
            <Button variant='secondary' onClick={handleClose}>
              Close
            </Button>
          </div>
        </DialogPanel>
      </div>

      {/* Edit Note Modal */}
      <Dialog open={showEditNote} onClose={() => {}} className='relative z-[60]'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <DialogTitle className='text-lg font-semibold'>Edit Note</DialogTitle>
              <button onClick={handleCancelEditNote}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor='edit-note-content' className='block text-sm font-medium text-gray-700 mb-1'>Note *</label>
                <textarea
                  id='edit-note-content'
                  name='edit-note-content'
                  className='w-full rounded-md border p-2'
                  rows={4}
                  value={editNote.note}
                  onChange={(e) => setEditNote({ ...editNote, note: e.target.value })}
                  placeholder='Enter note...'
                  required
                />
              </div>
              <div>
                <label htmlFor='edit-note-date' className='block text-sm font-medium text-gray-700 mb-1'>Date *</label>
                <input
                  id='edit-note-date'
                  name='edit-note-date'
                  type='date'
                  className='w-full rounded-md border p-2'
                  value={editNote.note_at}
                  onChange={(e) => setEditNote({ ...editNote, note_at: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor='edit-note-type' className='block text-sm font-medium text-gray-700 mb-1'>Type</label>
                <select
                  id='edit-note-type'
                  name='edit-note-type'
                  className='w-full rounded-md border p-2'
                  value={editNote.type || ''}
                  onChange={(e) => setEditNote({ ...editNote, type: e.target.value as TOrgType || null })}
                >
                  <option value=''>-- Select Type --</option>
                  {Object.entries(orgTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              {noteError && (
                <div className='text-red-600 text-sm bg-red-50 p-2 rounded'>{noteError}</div>
              )}
              
              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='secondary' onClick={handleCancelEditNote}>
                  Cancel
                </Button>
                <Button onClick={handleEditNoteSubmit} disabled={isSavingNote}>
                  {isSavingNote ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

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
                <label htmlFor='add-note-content' className='block text-sm font-medium text-gray-700 mb-1'>Note *</label>
                <textarea
                  id='add-note-content'
                  name='add-note-content'
                  className='w-full rounded-md border p-2'
                  rows={4}
                  value={newNote.note}
                  onChange={(e) => setNewNote({ ...newNote, note: e.target.value })}
                  placeholder='Enter note...'
                  required
                />
              </div>
              <div>
                <label htmlFor='add-note-date' className='block text-sm font-medium text-gray-700 mb-1'>Date *</label>
                <input
                  id='add-note-date'
                  name='add-note-date'
                  type='date'
                  className='w-full rounded-md border p-2'
                  value={newNote.note_at}
                  onChange={(e) => setNewNote({ ...newNote, note_at: e.target.value })}
                  required
                />
              </div>
              {/* Show checkbox only when Reader tab is active AND reader is selected AND reader has coach */}
              {activeTab === 0 && selectedReaderId && readersData?.find(reader => reader.reader_id === selectedReaderId)?.coach_id && (
                <div>
                  <label htmlFor='copy-to-coach' className='flex items-center gap-2 text-sm text-gray-700'>
                    <input
                      id='copy-to-coach'
                      name='copy-to-coach'
                      type='checkbox'
                      className='rounded'
                      checked={newNote.copyToCoach}
                      onChange={(e) => setNewNote({ ...newNote, copyToCoach: e.target.checked })}
                    />
                    Copy note to this Reader's Coach
                  </label>
                </div>
              )}
              {/* Show type dropdown only when Organisation tab is active AND organisation is selected */}
              {((isViewer && activeTab === 0) || (!isViewer && activeTab === 2)) && selectedOrgId && (
                <div>
                  <label htmlFor='add-note-type' className='block text-sm font-medium text-gray-700 mb-1'>Type</label>
                  <select
                    id='add-note-type'
                    name='add-note-type'
                    className='w-full rounded-md border p-2'
                    value={newNote.type || ''}
                    onChange={(e) => setNewNote({ ...newNote, type: e.target.value as TOrgType || null })}
                  >
                    <option value=''>-- Select Type --</option>
                    {Object.entries(orgTypeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
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

      <ErrorDialog
        isOpen={showError}
        onClose={() => setShowError(false)}
        title={errorTitle}
        message={noteError}
      />
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------