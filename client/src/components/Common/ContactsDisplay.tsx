import { useState, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { type TContactsSchema, type TContactSchema } from '@hooks/useContact';
import { addContact, editContact, type TAddContactData, type TEditContactData } from '@lib/api/apiContacts';
import { Button, ErrorDialog } from '@components/Common';
import { asString } from '@lib/helper';

// -----------------------------------------------------------------------------

interface ContactsDisplayProps {
  data: TContactsSchema | undefined;
  isLoading: boolean;
  error: Error | undefined;
  orgId?: number;
  onRefresh?: () => void;
}

export interface ContactsDisplayRef {
  openAddModal: () => void;
}

export const ContactsDisplay = forwardRef<ContactsDisplayRef, ContactsDisplayProps>(({ data, isLoading, error, orgId, onRefresh }, ref): React.JSX.Element => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedContact, setSelectedContact] = useState<TContactSchema | null>(null);
  const [newContact, setNewContact] = useState({ 
    name: '', 
    role: '',
    email: '',
    telephone: '',
    notes: '',
    marketing_consent: 0,
    marketing_consent_at: '',
    marketing_consent_source: ''
  });
  const [editContactData, setEditContactData] = useState({ 
    name: '', 
    role: '',
    email: '',
    telephone: '',
    notes: '',
    marketing_consent: 0,
    marketing_consent_at: '',
    marketing_consent_source: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [hasUnsavedEditChanges, setHasUnsavedEditChanges] = useState(false);
  const [showUnsavedEditDialog, setShowUnsavedEditDialog] = useState(false);
  const [originalEditContactData, setOriginalEditContactData] = useState({ 
    name: '', 
    role: '',
    email: '',
    telephone: '',
    notes: '',
    marketing_consent: 0,
    marketing_consent_at: '',
    marketing_consent_source: ''
  });
  const [hasUnsavedAddChanges, setHasUnsavedAddChanges] = useState(false);
  const [showUnsavedAddDialog, setShowUnsavedAddDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    if (!email.trim()) return true; // Empty is valid (optional field)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateTelephone = (telephone: string): boolean => {
    if (!telephone.trim()) return true; // Empty is valid (optional field)
    // Allow digits, spaces, hyphens, parentheses, and plus sign
    const phoneRegex = /^[\d\s\-()+]+$/;
    return phoneRegex.test(telephone) && telephone.replace(/\D/g, '').length >= 7;
  };

  const validateForm = useCallback((contactData: typeof newContact): {[key: string]: string} => {
    const errors: {[key: string]: string} = {};
    
    if (!contactData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (contactData.email && !validateEmail(contactData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (contactData.telephone && !validateTelephone(contactData.telephone)) {
      errors.telephone = 'Please enter a valid telephone number';
    }
    
    // Marketing consent validation
    if (contactData.marketing_consent === 1) {
      if (!contactData.marketing_consent_at.trim()) {
        errors.marketing_consent_at = 'Marketing consent date is required when consent is Yes';
      }
      if (!contactData.marketing_consent_source.trim()) {
        errors.marketing_consent_source = 'Marketing consent source is required when consent is Yes';
      }
    }
    
    return errors;
  }, []);

  // Filter contacts to only show enabled ones (disabled = 0)
  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(contact => contact.disabled === 0);
  }, [data]);

  const handleAddContact = useCallback(async () => {
    const errors = validateForm(newContact);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    if (!orgId) {
      setErrorMessage('Organization ID is required');
      return;
    }
    
    setIsSaving(true);
    setErrorMessage('');
    
    try {
      const contactData: TAddContactData = {
        org_id: orgId,
        name: newContact.name,
        role: newContact.role,
        email: newContact.email,
        telephone: newContact.telephone,
        notes: newContact.notes,
        marketing_consent: newContact.marketing_consent,
        marketing_consent_at: newContact.marketing_consent_at || undefined,
        marketing_consent_source: newContact.marketing_consent_source || undefined
      };
      
      const result = await addContact(contactData);
      
      if (result.success) {
        setIsAddOpen(false);
        setNewContact({ name: '', role: '', email: '', telephone: '', notes: '', marketing_consent: 0, marketing_consent_at: '', marketing_consent_source: '' });
        setErrorMessage('');
        setValidationErrors({});
        setHasUnsavedAddChanges(false);
        onRefresh?.();
      } else {
        setErrorMessage(asString(result.message, 'An error occurred while adding contact'));
      }
    } catch {
      setErrorMessage('An error occurred while adding contact');
    } finally {
      setIsSaving(false);
    }
  }, [orgId, newContact, onRefresh, validateForm]);

  const handleCancel = useCallback(() => {
    if (hasUnsavedAddChanges) {
      setShowUnsavedAddDialog(true);
    } else {
      setIsAddOpen(false);
      setNewContact({ name: '', role: '', email: '', telephone: '', notes: '', marketing_consent: 0, marketing_consent_at: '', marketing_consent_source: '' });
      setErrorMessage('');
      setValidationErrors({});
      setHasUnsavedAddChanges(false);
    }
  }, [hasUnsavedAddChanges]);

  const handleConfirmAddClose = useCallback(() => {
    setIsAddOpen(false);
    setNewContact({ name: '', role: '', email: '', telephone: '', notes: '', marketing_consent: 0, marketing_consent_at: '', marketing_consent_source: '' });
    setErrorMessage('');
    setValidationErrors({});
    setHasUnsavedAddChanges(false);
    setShowUnsavedAddDialog(false);
  }, []);

  const handleAddContactClick = useCallback(() => {
    setErrorMessage('');
    setValidationErrors({});
    setHasUnsavedAddChanges(false);
    setIsAddOpen(true);
  }, []);

  useImperativeHandle(ref, () => ({
    openAddModal: handleAddContactClick
  }), [handleAddContactClick]);

  const handleRowClick = useCallback((contact: TContactSchema) => {
    setSelectedContact(contact);
    
    // Format date for HTML date input (YYYY-MM-DD)
    let formattedDate = '';
    if (contact.marketing_consent_at) {
      const dateStr = String(contact.marketing_consent_at);
      
      // Simple approach: if it contains a date, extract it
      if (dateStr.includes('T')) {
        // ISO format: extract date part
        formattedDate = dateStr.split('T')[0];
      } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Already in YYYY-MM-DD format
        formattedDate = dateStr;
      } else {
        // Try basic date parsing
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          formattedDate = `${year}-${month}-${day}`;
        }
      }
    }
    
    const contactData = { 
      name: contact.name,
      role: contact.role || '',
      email: contact.email || '',
      telephone: contact.telephone || '',
      notes: contact.notes || '',
      marketing_consent: contact.marketing_consent,
      marketing_consent_at: formattedDate,
      marketing_consent_source: contact.marketing_consent_source || ''
    };
    setEditContactData(contactData);
    setOriginalEditContactData({ ...contactData });
    setErrorMessage('');
    setValidationErrors({});
    setHasUnsavedEditChanges(false);
    setIsEditOpen(true);
  }, []);

  const handleEditContact = useCallback(async () => {
    const errors = validateForm(editContactData);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    if (!selectedContact) {
      setErrorMessage('No contact selected');
      return;
    }
    
    setIsSaving(true);
    setErrorMessage('');
    
    try {
      const contactData: TEditContactData = {
        contact_id: selectedContact.contact_id,
        name: editContactData.name,
        role: editContactData.role || undefined,
        email: editContactData.email || undefined,
        telephone: editContactData.telephone || undefined,
        notes: editContactData.notes || undefined,
        marketing_consent: editContactData.marketing_consent,
        marketing_consent_at: editContactData.marketing_consent_at || undefined,
        marketing_consent_source: editContactData.marketing_consent_source || undefined
      };
      
      const result = await editContact(contactData);
      
      if (result.success) {
        setIsEditOpen(false);
        setSelectedContact(null);
        setEditContactData({ name: '', role: '', email: '', telephone: '', notes: '', marketing_consent: 0, marketing_consent_at: '', marketing_consent_source: '' });
        setOriginalEditContactData({ name: '', role: '', email: '', telephone: '', notes: '', marketing_consent: 0, marketing_consent_at: '', marketing_consent_source: '' });
        setErrorMessage('');
        setValidationErrors({});
        setHasUnsavedEditChanges(false);
        onRefresh?.();
      } else {
        setErrorMessage(asString(result.message, 'An error occurred while updating contact'));
      }
    } catch {
      setErrorMessage('An error occurred while updating contact');
    } finally {
      setIsSaving(false);
    }
  }, [selectedContact, editContactData, onRefresh, validateForm]);

  const handleDeleteContact = useCallback(async () => {
    if (!selectedContact) {
      setErrorMessage('No contact selected');
      return;
    }
    
    setIsSaving(true);
    setErrorMessage('');
    
    try {
      const contactData: TEditContactData = {
        contact_id: selectedContact.contact_id,
        disabled: 1
      };
      
      const result = await editContact(contactData);
      
      if (result.success) {
        setIsEditOpen(false);
        setSelectedContact(null);
        setEditContactData({ name: '', role: '', email: '', telephone: '', notes: '', marketing_consent: 0, marketing_consent_at: '', marketing_consent_source: '' });
        setOriginalEditContactData({ name: '', role: '', email: '', telephone: '', notes: '', marketing_consent: 0, marketing_consent_at: '', marketing_consent_source: '' });
        setErrorMessage('');
        setValidationErrors({});
        setHasUnsavedEditChanges(false);
        setShowDeleteDialog(false);
        onRefresh?.();
      } else {
        setErrorMessage(asString(result.message, 'An error occurred while deleting contact'));
      }
    } catch {
      setErrorMessage('An error occurred while deleting contact');
    } finally {
      setIsSaving(false);
    }
  }, [selectedContact, onRefresh]);

  // Track changes in add form
  const handleAddContactChange = useCallback((field: string, value: string | number) => {
    const newContactData = { ...newContact, [field]: value };
    setNewContact(newContactData);
    const initialContact = { name: '', role: '', email: '', telephone: '', notes: '', marketing_consent: 0, marketing_consent_at: '', marketing_consent_source: '' };
    const hasChanges = JSON.stringify(newContactData) !== JSON.stringify(initialContact);
    setHasUnsavedAddChanges(hasChanges);
  }, [newContact]);

  // Track changes in edit form
  const handleEditContactChange = useCallback((field: string, value: string | number) => {
    const newEditContactData = { ...editContactData, [field]: value };
    setEditContactData(newEditContactData);
    const hasChanges = JSON.stringify(newEditContactData) !== JSON.stringify(originalEditContactData);
    setHasUnsavedEditChanges(hasChanges);
  }, [editContactData, originalEditContactData]);

  const handleEditCancel = useCallback(() => {
    if (hasUnsavedEditChanges) {
      setShowUnsavedEditDialog(true);
    } else {
      setIsEditOpen(false);
      setSelectedContact(null);
      setEditContactData({ name: '', role: '', email: '', telephone: '', notes: '', marketing_consent: 0, marketing_consent_at: '', marketing_consent_source: '' });
      setOriginalEditContactData({ name: '', role: '', email: '', telephone: '', notes: '', marketing_consent: 0, marketing_consent_at: '', marketing_consent_source: '' });
      setErrorMessage('');
      setValidationErrors({});
      setHasUnsavedEditChanges(false);
    }
  }, [hasUnsavedEditChanges]);

  const handleConfirmEditClose = useCallback(() => {
    setIsEditOpen(false);
    setSelectedContact(null);
    setEditContactData({ name: '', role: '', email: '', telephone: '', notes: '', marketing_consent: 0, marketing_consent_at: '', marketing_consent_source: '' });
    setOriginalEditContactData({ name: '', role: '', email: '', telephone: '', notes: '', marketing_consent: 0, marketing_consent_at: '', marketing_consent_source: '' });
    setErrorMessage('');
    setValidationErrors({});
    setHasUnsavedEditChanges(false);
    setShowUnsavedEditDialog(false);
  }, []);

  if (isLoading) return <div className="p-4">Loading contacts...</div>;
  if (error) return <div className="p-4 text-red-600">Error loading contacts: {error.message}</div>;

  return (
    <>
      {/* Desktop table view */}
      <div className="hidden md:block">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <table className="min-w-full bg-white table-fixed">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-32 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                    Name
                  </th>
                  <th className="w-32 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                    Role
                  </th>
                  <th className="w-40 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                    Email
                  </th>
                  <th className="w-32 px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                    Telephone
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(!filteredData || filteredData.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No contacts found
                    </td>
                  </tr>
                ) : (
                  filteredData.map((contact) => (
                    <tr key={contact.contact_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(contact)}>
                      <td className="w-32 px-4 py-2 text-sm text-gray-900 border-b">
                        {contact.name}
                      </td>
                      <td className="w-32 px-4 py-2 text-sm text-gray-900 border-b">
                        {contact.role || ''}
                      </td>
                      <td className="w-40 px-4 py-2 text-sm text-gray-900 border-b">
                        {contact.email || ''}
                      </td>
                      <td className="w-32 px-4 py-2 text-sm text-gray-900 border-b">
                        {contact.telephone || ''}
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
          {(!filteredData || filteredData.length === 0) ? (
            <div className="p-4 text-center text-gray-500">No contacts found</div>
          ) : (
            filteredData.map((contact) => (
              <div key={contact.contact_id} className="bg-white border rounded-lg p-4 shadow-sm cursor-pointer" onClick={() => handleRowClick(contact)}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                </div>
                {contact.role && (
                  <p className="text-sm text-gray-600 mb-1">{contact.role}</p>
                )}
                {contact.email && (
                  <p className="text-sm text-blue-600 mb-1">{contact.email}</p>
                )}
                {contact.telephone && (
                  <p className="text-sm text-gray-600">{contact.telephone}</p>
                )}
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
              <DialogTitle className='text-lg font-semibold'>Add Contact</DialogTitle>
              <button onClick={handleCancel}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              <div>
                <label htmlFor='add-contact-name' className='block text-sm font-medium text-gray-700 mb-1'>Name *</label>
                <input
                  id='add-contact-name'
                  type='text'
                  autoComplete='off'
                  className={`w-full rounded-md border p-2 ${validationErrors.name ? 'border-red-500' : ''}`}
                  value={newContact.name}
                  onChange={(e) => handleAddContactChange('name', e.target.value)}
                  placeholder='Enter name...'
                  required
                />
                {validationErrors.name && <p className='text-red-500 text-xs mt-1'>{validationErrors.name}</p>}
              </div>
              <div>
                <label htmlFor='add-contact-role' className='block text-sm font-medium text-gray-700 mb-1'>Role</label>
                <input
                  id='add-contact-role'
                  type='text'
                  autoComplete='off'
                  className='w-full rounded-md border p-2'
                  value={newContact.role}
                  onChange={(e) => handleAddContactChange('role', e.target.value)}
                  placeholder='Enter role...'
                />
              </div>
              <div>
                <label htmlFor='add-contact-email' className='block text-sm font-medium text-gray-700 mb-1'>Email</label>
                <input
                  id='add-contact-email'
                  type='email'
                  autoComplete='off'
                  className={`w-full rounded-md border p-2 ${validationErrors.email ? 'border-red-500' : ''}`}
                  value={newContact.email}
                  onChange={(e) => handleAddContactChange('email', e.target.value)}
                  placeholder='Enter email...'
                />
                {validationErrors.email && <p className='text-red-500 text-xs mt-1'>{validationErrors.email}</p>}
              </div>
              <div>
                <label htmlFor='add-contact-telephone' className='block text-sm font-medium text-gray-700 mb-1'>Telephone</label>
                <input
                  id='add-contact-telephone'
                  type='tel'
                  autoComplete='off'
                  className={`w-full rounded-md border p-2 ${validationErrors.telephone ? 'border-red-500' : ''}`}
                  value={newContact.telephone}
                  onChange={(e) => handleAddContactChange('telephone', e.target.value)}
                  placeholder='Enter telephone...'
                />
                {validationErrors.telephone && <p className='text-red-500 text-xs mt-1'>{validationErrors.telephone}</p>}
              </div>
              <div>
                <label htmlFor='add-contact-notes' className='block text-sm font-medium text-gray-700 mb-1'>Notes</label>
                <textarea
                  id='add-contact-notes'
                  autoComplete='off'
                  className='w-full rounded-md border p-2'
                  rows={3}
                  value={newContact.notes}
                  onChange={(e) => handleAddContactChange('notes', e.target.value)}
                  placeholder='Enter notes...'
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label htmlFor='add-marketing-consent' className='block text-sm font-medium text-gray-700 mb-1'>Marketing Consent</label>
                  <select
                    id='add-marketing-consent'
                    className='w-full rounded-md border p-2'
                    value={newContact.marketing_consent}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      const updatedContact = { ...newContact, marketing_consent: value };
                      
                      // Clear date and source when consent is No
                      if (value === 0) {
                        updatedContact.marketing_consent_at = '';
                        updatedContact.marketing_consent_source = '';
                        // Clear validation errors for marketing consent fields
                        const newErrors = { ...validationErrors };
                        delete newErrors.marketing_consent_at;
                        delete newErrors.marketing_consent_source;
                        setValidationErrors(newErrors);
                      }
                      
                      setNewContact(updatedContact);
                      const initialContact = { name: '', role: '', email: '', telephone: '', notes: '', marketing_consent: 0, marketing_consent_at: '', marketing_consent_source: '' };
                      const hasChanges = JSON.stringify(updatedContact) !== JSON.stringify(initialContact);
                      setHasUnsavedAddChanges(hasChanges);
                    }}
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                {newContact.marketing_consent === 1 && (
                  <div>
                    <label htmlFor='add-marketing-consent-at' className='block text-sm font-medium text-gray-700 mb-1'>Marketing Consent Date</label>
                    <input
                      id='add-marketing-consent-at'
                      type='date'
                      className={`w-full rounded-md border p-2 ${validationErrors.marketing_consent_at ? 'border-red-500' : ''}`}
                      value={newContact.marketing_consent_at}
                      onChange={(e) => handleAddContactChange('marketing_consent_at', e.target.value)}
                    />
                    {validationErrors.marketing_consent_at && <p className='text-red-500 text-xs mt-1'>{validationErrors.marketing_consent_at}</p>}
                  </div>
                )}
              </div>
              {newContact.marketing_consent === 1 && (
                <div>
                  <label htmlFor='add-marketing-consent-source' className='block text-sm font-medium text-gray-700 mb-1'>Marketing Consent Source</label>
                  <input
                    id='add-marketing-consent-source'
                    type='text'
                    autoComplete='off'
                    className={`w-full rounded-md border p-2 ${validationErrors.marketing_consent_source ? 'border-red-500' : ''}`}
                    value={newContact.marketing_consent_source}
                    onChange={(e) => handleAddContactChange('marketing_consent_source', e.target.value)}
                    placeholder='Enter marketing consent source...'
                  />
                  {validationErrors.marketing_consent_source && <p className='text-red-500 text-xs mt-1'>{validationErrors.marketing_consent_source}</p>}
                </div>
              )}
              {errorMessage && (
                <div className='text-red-600 text-sm bg-red-50 p-2 rounded'>{errorMessage}</div>
              )}
            </div>
              
            <div className='flex justify-end gap-2 mt-4'>
              <Button variant='secondary' onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleAddContact} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog open={isEditOpen} onClose={() => {}} className='relative z-[60]'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <DialogTitle className='text-lg font-semibold'>Edit Contact</DialogTitle>
              <button onClick={handleEditCancel}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              <div>
                <label htmlFor='edit-contact-name' className='block text-sm font-medium text-gray-700 mb-1'>Name *</label>
                <input
                  id='edit-contact-name'
                  type='text'
                  autoComplete='off'
                  className={`w-full rounded-md border p-2 ${validationErrors.name ? 'border-red-500' : ''}`}
                  value={editContactData.name}
                  onChange={(e) => handleEditContactChange('name', e.target.value)}
                  placeholder='Enter name...'
                  required
                />
                {validationErrors.name && <p className='text-red-500 text-xs mt-1'>{validationErrors.name}</p>}
              </div>
              <div>
                <label htmlFor='edit-contact-role' className='block text-sm font-medium text-gray-700 mb-1'>Role</label>
                <input
                  id='edit-contact-role'
                  type='text'
                  autoComplete='off'
                  className='w-full rounded-md border p-2'
                  value={editContactData.role}
                  onChange={(e) => handleEditContactChange('role', e.target.value)}
                  placeholder='Enter role...'
                />
              </div>
              <div>
                <label htmlFor='edit-contact-email' className='block text-sm font-medium text-gray-700 mb-1'>Email</label>
                <input
                  id='edit-contact-email'
                  type='email'
                  autoComplete='off'
                  className={`w-full rounded-md border p-2 ${validationErrors.email ? 'border-red-500' : ''}`}
                  value={editContactData.email}
                  onChange={(e) => handleEditContactChange('email', e.target.value)}
                  placeholder='Enter email...'
                />
                {validationErrors.email && <p className='text-red-500 text-xs mt-1'>{validationErrors.email}</p>}
              </div>
              <div>
                <label htmlFor='edit-contact-telephone' className='block text-sm font-medium text-gray-700 mb-1'>Telephone</label>
                <input
                  id='edit-contact-telephone'
                  type='tel'
                  autoComplete='off'
                  className={`w-full rounded-md border p-2 ${validationErrors.telephone ? 'border-red-500' : ''}`}
                  value={editContactData.telephone}
                  onChange={(e) => handleEditContactChange('telephone', e.target.value)}
                  placeholder='Enter telephone...'
                />
                {validationErrors.telephone && <p className='text-red-500 text-xs mt-1'>{validationErrors.telephone}</p>}
              </div>
              <div>
                <label htmlFor='edit-contact-notes' className='block text-sm font-medium text-gray-700 mb-1'>Notes</label>
                <textarea
                  id='edit-contact-notes'
                  autoComplete='off'
                  className='w-full rounded-md border p-2'
                  rows={3}
                  value={editContactData.notes}
                  onChange={(e) => handleEditContactChange('notes', e.target.value)}
                  placeholder='Enter notes...'
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label htmlFor='edit-marketing-consent' className='block text-sm font-medium text-gray-700 mb-1'>Marketing Consent</label>
                  <select
                    id='edit-marketing-consent'
                    className='w-full rounded-md border p-2'
                    value={editContactData.marketing_consent}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      const updatedContact = { ...editContactData, marketing_consent: value };
                      
                      // Clear date and source when consent is No
                      if (value === 0) {
                        updatedContact.marketing_consent_at = '';
                        updatedContact.marketing_consent_source = '';
                        // Clear validation errors for marketing consent fields
                        const newErrors = { ...validationErrors };
                        delete newErrors.marketing_consent_at;
                        delete newErrors.marketing_consent_source;
                        setValidationErrors(newErrors);
                      }
                      
                      setEditContactData(updatedContact);
                      const hasChanges = JSON.stringify(updatedContact) !== JSON.stringify(originalEditContactData);
                      setHasUnsavedEditChanges(hasChanges);
                    }}
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                {editContactData.marketing_consent === 1 && (
                  <div>
                    <label htmlFor='edit-marketing-consent-at' className='block text-sm font-medium text-gray-700 mb-1'>Marketing Consent Date</label>
                    <input
                      id='edit-marketing-consent-at'
                      type='date'
                      className={`w-full rounded-md border p-2 ${validationErrors.marketing_consent_at ? 'border-red-500' : ''}`}
                      value={editContactData.marketing_consent_at}
                      onChange={(e) => handleEditContactChange('marketing_consent_at', e.target.value)}
                    />
                    {validationErrors.marketing_consent_at && <p className='text-red-500 text-xs mt-1'>{validationErrors.marketing_consent_at}</p>}
                  </div>
                )}
              </div>
              {editContactData.marketing_consent === 1 && (
                <div>
                  <label htmlFor='edit-marketing-consent-source' className='block text-sm font-medium text-gray-700 mb-1'>Marketing Consent Source</label>
                  <input
                    id='edit-marketing-consent-source'
                    type='text'
                    autoComplete='off'
                    className={`w-full rounded-md border p-2 ${validationErrors.marketing_consent_source ? 'border-red-500' : ''}`}
                    value={editContactData.marketing_consent_source}
                    onChange={(e) => handleEditContactChange('marketing_consent_source', e.target.value)}
                    placeholder='Enter marketing consent source...'
                  />
                  {validationErrors.marketing_consent_source && <p className='text-red-500 text-xs mt-1'>{validationErrors.marketing_consent_source}</p>}
                </div>
              )}
              {errorMessage && (
                <div className='text-red-600 text-sm bg-red-50 p-2 rounded'>{errorMessage}</div>
              )}
            </div>
              
            <div className='flex justify-between items-center gap-2 mt-4'>
              <Button variant='primary' type='button' onClick={() => setShowDeleteDialog(true)} className='bg-red-600 hover:bg-red-700'>
                Delete
              </Button>
              <div className='flex gap-2'>
                <Button variant='secondary' onClick={handleEditCancel}>
                  Cancel
                </Button>
                <Button onClick={handleEditContact} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog open={showDeleteDialog} onClose={() => {}} className='relative z-[70]'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <DialogTitle className='text-lg font-semibold mb-4'>Delete Contact</DialogTitle>
            <p className='text-sm text-gray-600 mb-6'>
              Deleting a contact is irreversible. Do you want to continue?
            </p>
            <div className='flex justify-end gap-2'>
              <Button variant='secondary' onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant='primary' onClick={handleDeleteContact} disabled={isSaving} className='bg-red-600 hover:bg-red-700'>
                {isSaving ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

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

      <ErrorDialog
        isOpen={showError}
        onClose={() => setShowError(false)}
        title='Error'
        message={errorMessage}
      />

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
