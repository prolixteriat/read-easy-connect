import { useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, X, Copy } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

import { editUser, addUser } from '@lib/api/apiUsers';
import { asString} from '@lib/helper';
import { type TRole, type TUserStatus } from '@lib/types';
import { JwtManager } from '@lib/jwtManager';

import { Button, ConfirmDialog, ErrorDialog, Loading } from '@components/Common';

// -----------------------------------------------------------------------------

type User = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  disabled: number;
  role: string;
  status: string;
  affiliate_id: number;
};

// -----------------------------------------------------------------------------

interface UTableProps {
  data: User[];
  onSave: (updatedRow: User) => void;
  roleType?: TRole;
  showLeavers?: boolean;
  setShowLeavers?: (show: boolean) => void;
}

export function UTable({ data, onSave, roleType, showLeavers, setShowLeavers }: UTableProps): React.JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'first_name', desc: false }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedRow, setSelectedRow] = useState<User | null>(null);
  const [originalRow, setOriginalRow] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUser, setNewUser] = useState({ first_name: '', last_name: '', email: '', status: 'active' as TUserStatus });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  
  const jwtManager = new JwtManager();
  const currentUserId = jwtManager.getUserId();

  const copyToClipboard = useCallback(async () => {
    if (!data || data.length === 0) return;
    
    const headers = ['First Name', 'Last Name', 'Email', 'Status', 'Access Suspended'];
    const rows = data.map(user => [
      user.first_name,
      user.last_name,
      user.email,
      user.status,
      user.disabled ? 'yes' : 'no'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join('\t'))
      .join('\n');

    try {
      await navigator.clipboard.writeText(csvContent);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [data]);

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'first_name',
      header: () => (
        <div className='flex items-center justify-between relative'>
          <button className='flex items-center'>
            First Name <ArrowUpDown className='ml-1 h-4 w-4' />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard();
            }}
            className='p-1 hover:bg-gray-200 rounded transition-colors'
            title='Copy table to clipboard'
          >
            <Copy size={14} className='text-gray-600' />
          </button>
          {showCopied && (
            <div className='absolute right-0 top-10 bg-green-600 text-white px-2 py-1 rounded text-xs shadow-lg z-10 whitespace-nowrap'>
              Copied
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'last_name',
      header: () => (
        <button className='flex items-center'>
          Last Name <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
    },
    {
      accessorKey: 'email',
      header: () => (
        <button className='flex items-center'>
          Email <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
    },
    {
      accessorKey: 'status',
      header: () => (
        <button className='flex items-center'>
          Status <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
      cell: ({ getValue }) => {
        const status = getValue() as string;
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${
            status === 'leaver' ? 'bg-red-100 text-red-800' :
            status === 'onhold' ? 'bg-yellow-100 text-yellow-800' : ''
          }`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'disabled',
      header: () => (
        <button className='flex items-center'>
          Access Suspended <ArrowUpDown className='ml-1 h-4 w-4' />
        </button>
      ),
      cell: ({ getValue }) => {
        const isDisabled = getValue();
        const text = isDisabled ? 'yes' : 'no';
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${
            isDisabled ? 'bg-red-100 text-red-800' : ''
          }`}>
            {text}
          </span>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleRowClick = (row: User) => {
    setSelectedRow(row);
    setOriginalRow({ ...row });
    setIsOpen(true);
  };

  const hasChanges = selectedRow && originalRow && (
    selectedRow.first_name !== originalRow.first_name ||
    selectedRow.last_name !== originalRow.last_name ||
    selectedRow.disabled !== originalRow.disabled ||
    selectedRow.status !== originalRow.status
  );

  const handleCancel = () => {
    if (hasChanges) {
      setShowConfirm(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleConfirmCancel = () => {
    setShowConfirm(false);
    setIsOpen(false);
    setErrors({});
  };

  const hasAddChanges = newUser.first_name.trim() || newUser.last_name.trim() || newUser.email.trim() || newUser.status !== 'active';

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
    setNewUser({ first_name: '', last_name: '', email: '', status: 'active' });
    setErrors({});
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateAddForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newUser.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!newUser.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!newUser.email.trim()) newErrors.email = 'Email is required';
    else if (!validateEmail(newUser.email)) newErrors.email = 'Invalid email format';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEditForm = () => {
    const newErrors: Record<string, string> = {};
    if (selectedRow && !selectedRow.first_name.trim()) newErrors.first_name = 'First name is required';
    if (selectedRow && !selectedRow.last_name.trim()) newErrors.last_name = 'Last name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateEditForm()) return;
    
    if (selectedRow) {
      setIsSaving(true);
      const result = await editUser({
        user_id: selectedRow.user_id,
        first_name: selectedRow.first_name,
        last_name: selectedRow.last_name,
        status: selectedRow.status,
        disabled: selectedRow.disabled,
      });
      
      setIsSaving(false);
      if (result.success) {
        onSave(selectedRow);
        setIsOpen(false);
        setErrors({});
      } else {
        setErrorMessage(asString(result.message, 'An error occurred while saving'));
        setShowError(true);
      }
    }
  };

  const handleAddUser = async () => {
    if (!validateAddForm()) return;
    
    setIsSaving(true);
    const result = await addUser({
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      email: newUser.email,
      role: roleType || 'coordinator',
      status: newUser.status,
    });
    
    setIsSaving(false);
    if (result.success) {
      onSave({} as User);
      setIsAddOpen(false);
      setNewUser({ first_name: '', last_name: '', email: '', status: 'active' });
      setErrors({});
    } else {
      setErrorMessage(asString(result.message, 'An error occurred while adding user'));
      setShowError(true);
    }
  };

  return (
    <div className='w-full'>
      <div className='flex flex-col sm:flex-row gap-2 mb-4'>
        <div className='flex-1 relative'>
          <input
            type='text'
            placeholder='Filter...'
            className='w-full rounded-md border p-2 text-sm pr-32'
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
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
          Add {roleType === 'viewer' ? 'Info Viewer' : roleType ? roleType.charAt(0).toUpperCase() + roleType.slice(1) : 'User'}
        </Button>
      </div>

      {/* Desktop Table View */}
      <div className='hidden md:block overflow-x-auto rounded-lg border shadow-sm'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-100'>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className='cursor-pointer px-4 py-2 text-left text-sm font-medium text-gray-700'
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className='hover:bg-gray-50 cursor-pointer'
                onClick={() => handleRowClick(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className='px-4 py-2 text-sm text-gray-700'>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className='md:hidden space-y-3'>
        {table.getRowModel().rows.map((row) => {
          const user = row.original;
          return (
            <div
              key={row.id}
              className='bg-white border rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md'
              onClick={() => handleRowClick(user)}
            >
              <div className='flex justify-between items-start mb-2'>
                <h3 className='font-semibold text-gray-900'>
                  {user.first_name} {user.last_name}
                </h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  user.status === 'active' ? 'bg-green-100 text-green-800' :
                  user.status === 'onhold' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {user.status}
                </span>
              </div>
              <p className='text-sm text-gray-600 mb-1'>{user.email}</p>
              <div className='flex justify-between items-center text-xs text-gray-500'>
                <span>Access Suspended: {user.disabled ? 'Yes' : 'No'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      <Dialog open={isOpen} onClose={() => {}} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <div>
                <DialogTitle className='text-lg font-semibold'>Edit {selectedRow?.role === 'viewer' ? 'Info Viewer' : selectedRow?.role ? selectedRow.role.charAt(0).toUpperCase() + selectedRow.role.slice(1) : ''}</DialogTitle>
                <p className='text-sm text-blue-600 font-bold'>ID: {selectedRow?.user_id} • {selectedRow?.email}</p>
              </div>
              <button onClick={() => setIsOpen(false)}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>

            {selectedRow && (
              selectedRow.user_id === currentUserId ? (
                <div className='text-center py-8'>
                  <p className='text-gray-600 mb-4'>You cannot edit your own user record.</p>
                  <br />
                  <Button variant='secondary' onClick={() => setIsOpen(false)}>
                    Close
                  </Button>
                </div>
              ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className='space-y-3'
              >
                <div>
                  <label className='block text-sm font-medium text-gray-700'>First Name *</label>
                  <input
                    className={`w-full rounded-md border p-2 ${errors.first_name ? 'border-red-500' : ''}`}
                    value={selectedRow.first_name}
                    onChange={(e) =>
                      setSelectedRow({ ...selectedRow, first_name: e.target.value })
                    }
                  />
                  {errors.first_name && <p className='text-red-500 text-xs mt-1'>{errors.first_name}</p>}
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Last Name *</label>
                  <input
                    className={`w-full rounded-md border p-2 ${errors.last_name ? 'border-red-500' : ''}`}
                    value={selectedRow.last_name}
                    onChange={(e) =>
                      setSelectedRow({ ...selectedRow, last_name: e.target.value })
                    }
                  />
                  {errors.last_name && <p className='text-red-500 text-xs mt-1'>{errors.last_name}</p>}
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Status</label>
                  <select
                    className='w-full rounded-md border p-2'
                    value={selectedRow.status}
                    onChange={(e) =>
                      setSelectedRow({ ...selectedRow, status: e.target.value as TUserStatus })
                    }
                  >
                    <option value='active'>Active</option>
                    <option value='onhold'>On Hold</option>
                    <option value='leaver'>Leaver</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Access Suspended</label>
                  <select
                    className='w-full rounded-md border p-2'
                    value={selectedRow.disabled}
                    onChange={(e) =>
                      setSelectedRow({ ...selectedRow, disabled: Number(e.target.value) })
                    }
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
                <div className='flex justify-end gap-2 mt-4'>
                  <Button variant='secondary' type='button' onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type='submit' disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
              )
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
      
      {/* Add User Modal */}
      <Dialog open={isAddOpen} onClose={() => {}} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg'>
            <div className='flex justify-between items-start mb-4'>
              <div>
                <DialogTitle className='text-lg font-semibold'>Add {roleType === 'viewer' ? 'Info Viewer' : roleType ? roleType.charAt(0).toUpperCase() + roleType.slice(1) : 'User'}</DialogTitle>
              </div>
              <button onClick={handleAddCancel}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddUser();
              }}
              className='space-y-3'
            >
              <div>
                <label className='block text-sm font-medium text-gray-700'>First Name *</label>
                <input
                  className={`w-full rounded-md border p-2 ${errors.first_name ? 'border-red-500' : ''}`}
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                />
                {errors.first_name && <p className='text-red-500 text-xs mt-1'>{errors.first_name}</p>}
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Last Name *</label>
                <input
                  className={`w-full rounded-md border p-2 ${errors.last_name ? 'border-red-500' : ''}`}
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                />
                {errors.last_name && <p className='text-red-500 text-xs mt-1'>{errors.last_name}</p>}
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Email *</label>
                <input
                  type='email'
                  className={`w-full rounded-md border p-2 ${errors.email ? 'border-red-500' : ''}`}
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
                {errors.email && <p className='text-red-500 text-xs mt-1'>{errors.email}</p>}
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Status</label>
                <select
                  className='w-full rounded-md border p-2'
                  value={newUser.status}
                  onChange={(e) => setNewUser({ ...newUser, status: e.target.value as TUserStatus })}
                >
                  <option value='active'>Active</option>
                  <option value='onhold'>On Hold</option>
                  <option value='leaver'>Leaver</option>
                </select>
              </div>
              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='secondary' type='button' onClick={handleAddCancel}>
                  Cancel
                </Button>
                <Button type='submit' disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
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

      <ErrorDialog
        isOpen={showError}
        onClose={() => setShowError(false)}
        title='Error'
        message={errorMessage}
      />

      {isSaving && <Loading />}
    </div>
  );
}
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
