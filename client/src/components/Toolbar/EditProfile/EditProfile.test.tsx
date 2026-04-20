import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EditProfile from './EditProfile';

// -----------------------------------------------------------------------------
// Mock the useUsers hook
vi.mock('@hooks/useUsers', () => ({
  useUsers: vi.fn(),
}));

// Mock JwtManager
vi.mock('@lib/jwtManager', () => ({
  JwtManager: vi.fn(() => ({
    getUserId: vi.fn(() => 1),
  })),
}));

// Mock API function
vi.mock('@lib/api/apiUsers', () => ({
  editProfile: vi.fn(),
}));

// Mock common components
vi.mock('@components/Common', () => ({
  Button: vi.fn(({ children, onClick, disabled, type, variant }) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      type={type}
      data-testid={variant === 'secondary' ? 'cancel-button' : 'save-button'}
    >
      {children}
    </button>
  )),
  ConfirmDialog: vi.fn(({ isOpen, onClose, onConfirm }) => 
    isOpen ? (
      <div data-testid="confirm-dialog">
        <button onClick={onClose} data-testid="confirm-close">Close</button>
        <button onClick={onConfirm} data-testid="confirm-ok">Confirm</button>
      </div>
    ) : null
  ),
  ErrorDialog: vi.fn(({ isOpen, onClose, message }) => 
    isOpen ? (
      <div data-testid="error-dialog">
        <div data-testid="error-message">{message}</div>
        <button onClick={onClose} data-testid="error-close">Close</button>
      </div>
    ) : null
  ),
  Loading: () => <div data-testid="loading">Loading</div>,
}));

// Mock Headless UI
vi.mock('@headlessui/react', () => ({
  Dialog: vi.fn(({ open, onClose, children }) => 
    open ? <div data-testid="dialog" onClick={onClose}>{children}</div> : null
  ),
  DialogPanel: vi.fn(({ children }) => <div data-testid="dialog-panel">{children}</div>),
  DialogTitle: vi.fn(({ children }) => <h2 data-testid="dialog-title">{children}</h2>),
}));
// -----------------------------------------------------------------------------

import { useUsers } from '@hooks/useUsers';
import { editProfile } from '@lib/api/apiUsers';

const mockUsers = [
  { user_id: 1, first_name: 'John', last_name: 'Doe', email: 'john@test.com', role: 'manager', status: 'active', disabled: 0, affiliate_id: 1 },
  { user_id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@test.com', role: 'coordinator', status: 'active', disabled: 0, affiliate_id: 1 },
];
// -----------------------------------------------------------------------------

describe('EditProfile', () => {
  const mockOnClose = vi.fn();
  const mockMutate = vi.fn();

  const setupMockUsers = (mutate = mockMutate) => {
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupMockUsers();
  });

  it('does not render when isOpen is false', () => {
    render(<EditProfile isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when isOpen is true', () => {
    render(<EditProfile isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Edit Profile');
  });

  it('displays current user information', () => {
    render(<EditProfile isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('manager')).toBeInTheDocument();
  });

  it('calls mutate when dialog opens', () => {
    render(<EditProfile isOpen={true} onClose={mockOnClose} />);
    expect(mockMutate).toHaveBeenCalled();
  });

  it('shows confirm dialog when canceling with changes', async () => {
    render(<EditProfile isOpen={true} onClose={mockOnClose} />);
    
    const firstNameInput = screen.getByDisplayValue('John') as HTMLInputElement;
    fireEvent.change(firstNameInput, { target: { value: 'Johnny' } });

    const cancelButton = screen.getByTestId('cancel-button');
    cancelButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    });
  });

  it('calls onClose directly when canceling without changes', () => {
    render(<EditProfile isOpen={true} onClose={mockOnClose} />);
    
    const cancelButton = screen.getByTestId('cancel-button');
    cancelButton.click();

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls editProfile API when save is clicked', async () => {
    const mockEditProfile = vi.mocked(editProfile);
    mockEditProfile.mockResolvedValue({ success: true, message: '', statusCode: 200 });

    render(<EditProfile isOpen={true} onClose={mockOnClose} />);
    
    const saveButton = screen.getByTestId('save-button');
    saveButton.click();

    await waitFor(() => {
      expect(mockEditProfile).toHaveBeenCalledWith({
        first_name: 'John',
        last_name: 'Doe',
      });
    });
  });

  it('shows error dialog when save fails', async () => {
    const mockEditProfile = vi.mocked(editProfile);
    mockEditProfile.mockResolvedValue({ success: false, message: 'Save failed', statusCode: 400 });

    render(<EditProfile isOpen={true} onClose={mockOnClose} />);
    
    const saveButton = screen.getByTestId('save-button');
    saveButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('error-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('Save failed');
    });
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
