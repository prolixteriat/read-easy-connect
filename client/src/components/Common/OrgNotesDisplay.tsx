import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { type TOrgNotesSchema, type TOrgNoteSchema } from '@hooks/useNotes';
import { addOrgNote, editOrgNote, type TAddOrgNoteData, type TEditOrgNoteData } from '@lib/api/apiNotes';
import { Button, ErrorDialog } from '@components/Common';
import { JwtManager } from '@lib/jwtManager';
import { asString } from '@lib/helper';
import { type TOrgType, orgTypeLabels } from '@lib/types';

// -----------------------------------------------------------------------------

interface OrgNotesDisplayProps {
  data: TOrgNotesSchema | undefined;
  isLoading: boolean;
  error: Error | undefined;
  aboutId?: number;
  onRefresh?: () => void;
}

export interface OrgNotesDisplayRef {
  openAddModal: () => void;
}

export const OrgNotesDisplay = forwardRef<OrgNotesDisplayRef, OrgNotesDisplayProps>(({ data, isLoading, error, aboutId, onRefresh }, ref): React.JSX.Element => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNote, setSelectedNote] = useState<TOrgNoteSchema | null>(null);
  const [newNote, setNewNote] = useState({ 
    note: '', 
    note_at: new Date().toISOString().split('T')[0],
    type: null as TOrgType | null
  });
  const [editNote, setEditNote] = useState({ note: '', note_at: '', type: null as TOrgType | null });
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [hasUnsavedEditChanges, setHasUnsavedEditChanges] = useState(false);
  const [showUnsavedEditDialog, setShowUnsavedEditDialog] = useState(false);
  const [originalEditNote, setOriginalEditNote] = useState({ note: '', note_at: '', type: null as TOrgType | null });
  const [hasUnsavedAddChanges, setHasUnsavedAddChanges] = useState(false);
  const [showUnsavedAddDialog, setShowUnsavedAddDialog] = useState(false);

  const jwtManager = new JwtManager();
  const currentUserId = jwtManager.getUserId();

  const handleAddNote = useCallback(async () => {
    if (!aboutId || !newNote.note.trim() || !newNote.note_at.trim()) {
      setErrorMessage('Note content and date are required');
      return;
    }
    
    setIsSaving(true);
    setErrorMessage('');
    
    try {
      const noteData: TAddOrgNoteData = {
        about_id: aboutId,
        note: newNote.note,
        note_at: newNote.note_at || undefined,
        type: newNote.type
      };
      
      const result = await addOrgNote(noteData);
      
      if (result.success) {
        setIsAddOpen(false);
        setNewNote({ note: '', note_at: new Date().toISOString().split('T')[0], type: null });
        setErrorMessage('');
        setHasUnsavedAddChanges(false);
        onRefresh?.();
      } else {
        setErrorMessage(asString(result.message, 'An error occurred while adding note'));
      }
    } catch {
      setErrorMessage('An error occurred while adding note');
    } finally {
      setIsSaving(false);
    }
  }, [aboutId, newNote.note, newNote.note_at, newNote.type, onRefresh]);

  const handleCancel = useCallback(() => {
    if (hasUnsavedAddChanges) {
      setShowUnsavedAddDialog(true);
    } else {
      setIsAddOpen(false);
      setNewNote({ note: '', note_at: new Date().toISOString().split('T')[0], type: null });
      setErrorMessage('');
      setHasUnsavedAddChanges(false);
    }
  }, [hasUnsavedAddChanges]);

  const handleConfirmAddClose = useCallback(() => {
    setIsAddOpen(false);
    setNewNote({ note: '', note_at: new Date().toISOString().split('T')[0], type: null });
    setErrorMessage('');
    setHasUnsavedAddChanges(false);
    setShowUnsavedAddDialog(false);
  }, []);

  // Expose the add note function to parent
  const handleAddNoteClick = useCallback(() => {
    setErrorMessage('');
    setHasUnsavedAddChanges(false);
    setIsAddOpen(true);
  }, []);

  // Expose the add note function to parent via useImperativeHandle
  useImperativeHandle(ref, () => ({
    openAddModal: handleAddNoteClick
  }), [handleAddNoteClick]);

  const handleRowClick = useCallback((note: TOrgNoteSchema) => {
    if (note.by_id !== currentUserId) {
      setErrorTitle('Permission Denied');
      setErrorMessage('You can only edit notes that you created.');
      setShowError(true);
      return;
    }
    setSelectedNote(note);
    const noteData = { 
      note: note.note, 
      note_at: note.note_at.split(' ')[0],
      type: note.type
    };
    setEditNote(noteData);
    setOriginalEditNote({ ...noteData });
    setErrorMessage('');
    setHasUnsavedEditChanges(false);
    setIsEditOpen(true);
  }, [currentUserId]);

  const handleEditNote = useCallback(async () => {
    if (!selectedNote || !editNote.note.trim() || !editNote.note_at.trim()) {
      setErrorMessage('Note content and date are required');
      return;
    }
    
    setIsSaving(true);
    setErrorMessage('');
    
    try {
      const noteData: TEditOrgNoteData = {
        note_id: selectedNote.note_id,
        note: editNote.note,
        note_at: editNote.note_at || undefined,
        type: editNote.type
      };
      
      const result = await editOrgNote(noteData);
      
      if (result.success) {
        setIsEditOpen(false);
        setSelectedNote(null);
        setEditNote({ note: '', note_at: '', type: null });
        setOriginalEditNote({ note: '', note_at: '', type: null });
        setErrorMessage('');
        setHasUnsavedEditChanges(false);
        onRefresh?.();
      } else {
        setErrorMessage(asString(result.message, 'An error occurred while updating note'));
      }
    } catch {
      setErrorMessage('An error occurred while updating note');
    } finally {
      setIsSaving(false);
    }
  }, [selectedNote, editNote.note, editNote.note_at, editNote.type, onRefresh]);

  // Track changes in add form
  const handleAddNoteChange = useCallback((field: string, value: string | TOrgType | null) => {
    const newNoteData = { ...newNote, [field]: value };
    setNewNote(newNoteData);
    const initialNote = { note: '', note_at: new Date().toISOString().split('T')[0], type: null };
    const hasChanges = JSON.stringify(newNoteData) !== JSON.stringify(initialNote);
    setHasUnsavedAddChanges(hasChanges);
  }, [newNote]);

  // Track changes in edit form
  const handleEditNoteChange = useCallback((field: string, value: string | TOrgType | null) => {
    const newEditNote = { ...editNote, [field]: value };
    setEditNote(newEditNote);
    const hasChanges = JSON.stringify(newEditNote) !== JSON.stringify(originalEditNote);
    setHasUnsavedEditChanges(hasChanges);
  }, [editNote, originalEditNote]);

  const handleEditCancel = useCallback(() => {
    if (hasUnsavedEditChanges) {
      setShowUnsavedEditDialog(true);
    } else {
      setIsEditOpen(false);
      setSelectedNote(null);
      setEditNote({ note: '', note_at: '', type: null });
      setOriginalEditNote({ note: '', note_at: '', type: null });
      setErrorMessage('');
      setHasUnsavedEditChanges(false);
    }
  }, [hasUnsavedEditChanges]);

  const handleConfirmEditClose = useCallback(() => {
    setIsEditOpen(false);
    setSelectedNote(null);
    setEditNote({ note: '', note_at: '', type: null });
    setOriginalEditNote({ note: '', note_at: '', type: null });
    setErrorMessage('');
    setHasUnsavedEditChanges(false);
    setShowUnsavedEditDialog(false);
  }, []);

  if (isLoading) return <div className="p-4">Loading notes...</div>;
  if (error) return <div className="p-4 text-red-600">Error loading notes: {error.message}</div>;

  return (
    <>
      {/* Desktop table view */}
      <div className="hidden md:block">
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
                {(!data || data.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No notes found
                    </td>
                  </tr>
                ) : (
                  data.map((note) => (
                    <tr key={note.note_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(note)}>
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
      </div>

      {/* Mobile card view */}
      <div className="md:hidden">
        <div className="space-y-3">
          {(!data || data.length === 0) ? (
            <div className="p-4 text-center text-gray-500">No notes found</div>
          ) : (
            data.map((note) => (
              <div key={note.note_id} className="bg-white border rounded-lg p-4 shadow-sm cursor-pointer" onClick={() => handleRowClick(note)}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{note.by_name}</h3>
                  <span className="text-xs text-gray-500">
                    {new Date(note.note_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
                {note.type && (
                  <p className="text-xs text-blue-600 mb-1">{orgTypeLabels[note.type]}</p>
                )}
                <p className="text-sm text-gray-700">{note.note}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={isAddOpen} onClose={() => {}} className='relative z-[60]'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <DialogTitle className='text-lg font-semibold'>Add Note</DialogTitle>
              <button onClick={handleCancel}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor='add-note-content' className='block text-sm font-medium text-gray-700 mb-1'>Note *</label>
                <textarea
                  id='add-note-content'
                  autoComplete='off'
                  className='w-full rounded-md border p-2'
                  rows={4}
                  value={newNote.note}
                  onChange={(e) => handleAddNoteChange('note', e.target.value)}
                  placeholder='Enter note...'
                  required
                />
              </div>
              <div>
                <label htmlFor='add-note-date' className='block text-sm font-medium text-gray-700 mb-1'>Date *</label>
                <input
                  id='add-note-date'
                  type='date'
                  autoComplete='off'
                  className='w-full rounded-md border p-2'
                  value={newNote.note_at}
                  onChange={(e) => handleAddNoteChange('note_at', e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor='add-note-type' className='block text-sm font-medium text-gray-700 mb-1'>Type</label>
                <select
                  id='add-note-type'
                  autoComplete='off'
                  className='w-full rounded-md border p-2'
                  value={newNote.type || ''}
                  onChange={(e) => handleAddNoteChange('type', e.target.value as TOrgType || null)}
                >
                  <option value=''>-- Select Type --</option>
                  {Object.entries(orgTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              {errorMessage && (
                <div className='text-red-600 text-sm bg-red-50 p-2 rounded'>{errorMessage}</div>
              )}
              
              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='secondary' onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleAddNote} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog open={isEditOpen} onClose={() => {}} className='relative z-[60]'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <DialogTitle className='text-lg font-semibold'>Edit Note</DialogTitle>
              <button onClick={handleEditCancel}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor='edit-note-content' className='block text-sm font-medium text-gray-700 mb-1'>Note *</label>
                <textarea
                  id='edit-note-content'
                  autoComplete='off'
                  className='w-full rounded-md border p-2'
                  rows={4}
                  value={editNote.note}
                  onChange={(e) => handleEditNoteChange('note', e.target.value)}
                  placeholder='Enter note...'
                  required
                />
              </div>
              <div>
                <label htmlFor='edit-note-date' className='block text-sm font-medium text-gray-700 mb-1'>Date *</label>
                <input
                  id='edit-note-date'
                  type='date'
                  autoComplete='off'
                  className='w-full rounded-md border p-2'
                  value={editNote.note_at}
                  onChange={(e) => handleEditNoteChange('note_at', e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor='edit-note-type' className='block text-sm font-medium text-gray-700 mb-1'>Type</label>
                <select
                  id='edit-note-type'
                  autoComplete='off'
                  className='w-full rounded-md border p-2'
                  value={editNote.type || ''}
                  onChange={(e) => handleEditNoteChange('type', e.target.value as TOrgType || null)}
                >
                  <option value=''>-- Select Type --</option>
                  {Object.entries(orgTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              {errorMessage && (
                <div className='text-red-600 text-sm bg-red-50 p-2 rounded'>{errorMessage}</div>
              )}
              
              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='secondary' onClick={handleEditCancel}>
                  Cancel
                </Button>
                <Button onClick={handleEditNote} disabled={isSaving}>
                  {isSaving ? 'Saving..' : 'Save'}
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
        message={errorMessage}
      />

      <Dialog open={showUnsavedAddDialog} onClose={() => {}} className='relative z-[70]'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <DialogTitle className='text-lg font-semibold mb-4'>Unsaved Changes</DialogTitle>
            <p className='text-sm text-gray-600 mb-6'>
              You have unsaved changes. Are you sure you want to cancel?
            </p>
            <div className='flex justify-end gap-2'>
              <Button variant='secondary' onClick={() => setShowUnsavedAddDialog(false)}>
                No
              </Button>
              <Button variant='primary' onClick={handleConfirmAddClose}>
                Yes
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog open={showUnsavedEditDialog} onClose={() => {}} className='relative z-[70]'>
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
    </>
  );
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
