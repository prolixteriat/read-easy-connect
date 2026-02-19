import { useState, useCallback } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { type TNotesSchema, type TNoteSchema } from '@hooks/useNotes';
import { addReaderNote, addCoachNote, editReaderNote, editCoachNote, type TAddReaderNoteData, type TAddCoachNoteData, type TEditReaderNoteData, type TEditCoachNoteData } from '@lib/api/apiNotes';
import { Button, ErrorDialog } from '@components/Common';
import { JwtManager } from '@lib/jwtManager';
import { asString } from '@lib/helper';

interface NotesDisplayProps {
  data: TNotesSchema | undefined;
  isLoading: boolean;
  error: Error | undefined;
  aboutId?: number;
  onRefresh?: () => void;
  noteType?: 'reader' | 'coach';
}

export function NotesDisplay({ data, isLoading, error, aboutId, onRefresh, noteType = 'reader' }: NotesDisplayProps): React.JSX.Element {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNote, setSelectedNote] = useState<TNoteSchema | null>(null);
  const [newNote, setNewNote] = useState({ 
    note: '', 
    note_at: new Date().toISOString().split('T')[0] 
  });
  const [editNote, setEditNote] = useState({ note: '', note_at: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');

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
      const noteData = {
        about_id: aboutId,
        note: newNote.note,
        note_at: newNote.note_at || undefined
      };
      
      const result = noteType === 'coach' 
        ? await addCoachNote(noteData as TAddCoachNoteData)
        : await addReaderNote(noteData as TAddReaderNoteData);
      
      if (result.success) {
        setIsAddOpen(false);
        setNewNote({ note: '', note_at: new Date().toISOString().split('T')[0] });
        setErrorMessage('');
        onRefresh?.();
      } else {
        setErrorMessage(asString(result.message, 'An error occurred while adding note'));
      }
    } catch {
      setErrorMessage('An error occurred while adding note');
    } finally {
      setIsSaving(false);
    }
  }, [aboutId, newNote.note, newNote.note_at, noteType, onRefresh]);

  const handleCancel = useCallback(() => {
    setIsAddOpen(false);
    setNewNote({ note: '', note_at: new Date().toISOString().split('T')[0] });
    setErrorMessage('');
  }, []);

  const handleOpenModal = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setErrorMessage('');
    setIsAddOpen(true);
  }, []);

  const handleRowClick = useCallback((note: TNoteSchema) => {
    if (note.by_id !== currentUserId) {
      setErrorTitle('Permission Denied');
      setErrorMessage('You can only edit notes that you created.');
      setShowError(true);
      return;
    }
    setSelectedNote(note);
    setEditNote({ 
      note: note.note, 
      note_at: note.note_at.split(' ')[0] 
    });
    setErrorMessage('');
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
      const noteData = {
        note_id: selectedNote.note_id,
        note: editNote.note,
        note_at: editNote.note_at || undefined
      };
      
      const result = noteType === 'coach' 
        ? await editCoachNote(noteData as TEditCoachNoteData)
        : await editReaderNote(noteData as TEditReaderNoteData);
      
      if (result.success) {
        setIsEditOpen(false);
        setSelectedNote(null);
        setEditNote({ note: '', note_at: '' });
        setErrorMessage('');
        onRefresh?.();
      } else {
        setErrorMessage(asString(result.message, 'An error occurred while updating note'));
      }
    } catch {
      setErrorMessage('An error occurred while updating note');
    } finally {
      setIsSaving(false);
    }
  }, [selectedNote, editNote.note, editNote.note_at, noteType, onRefresh]);

  const handleEditCancel = useCallback(() => {
    setIsEditOpen(false);
    setSelectedNote(null);
    setEditNote({ note: '', note_at: '' });
    setErrorMessage('');
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
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                    Note
                  </th>
                  <th className="w-24 px-4 py-2 text-right border-b">
                    <Button 
                      variant='primary' 
                      onClick={handleOpenModal}
                      type="button"
                      className="text-xs px-2 py-1 whitespace-nowrap"
                    >
                      Add Note
                    </Button>
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
                      <td className="px-4 py-2 text-sm text-gray-900 border-b">
                        {note.note}
                      </td>
                      <td className="w-24 px-4 py-2 border-b"></td>
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
        <div className="mb-4 flex justify-end">
          <Button 
            variant='primary' 
            onClick={handleOpenModal}
            type="button"
            className="text-xs px-2 py-1 whitespace-nowrap"
          >
            Add Note
          </Button>
        </div>
        {(!data || data.length === 0) ? (
          <div className="p-4 text-center text-gray-500">No notes found</div>
        ) : (
          <div className="space-y-3">
            {data.map((note) => (
              <div key={note.note_id} className="bg-white border rounded-lg p-4 shadow-sm cursor-pointer" onClick={() => handleRowClick(note)}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{note.by_name}</h3>
                  <span className="text-xs text-gray-500">
                    {new Date(note.note_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{note.note}</p>
              </div>
            ))}
          </div>
        )}
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
                <label className='block text-sm font-medium text-gray-700 mb-1'>Note *</label>
                <textarea
                  className='w-full rounded-md border p-2'
                  rows={4}
                  value={editNote.note}
                  onChange={(e) => setEditNote({ ...editNote, note: e.target.value })}
                  placeholder='Enter note...'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Date *</label>
                <input
                  type='date'
                  className='w-full rounded-md border p-2'
                  value={editNote.note_at}
                  onChange={(e) => setEditNote({ ...editNote, note_at: e.target.value })}
                  required
                />
              </div>
              {errorMessage && (
                <div className='text-red-600 text-sm bg-red-50 p-2 rounded'>{errorMessage}</div>
              )}
              
              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='secondary' onClick={handleEditCancel}>
                  Cancel
                </Button>
                <Button onClick={handleEditNote} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
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
    </>
  );
}