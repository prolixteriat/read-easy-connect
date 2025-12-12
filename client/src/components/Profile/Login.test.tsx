import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Login from './Login';

// -----------------------------------------------------------------------------
// Mock the Button component
vi.mock('@components/Common', () => ({
  Button: vi.fn(({ children, onClick, disabled, variant, type }) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      data-testid={`button-${children.toLowerCase()}`}
      data-variant={variant}
      type={type}
    >
      {children}
    </button>
  )),
  ErrorDialog: vi.fn(({ isOpen, onClose, title, message }) => 
    isOpen ? <div data-testid="error-dialog" onClick={onClose}>{title}: {message}</div> : null
  ),
  Loading: vi.fn(() => <div data-testid="loading">Loading...</div>),
}));

// Mock Headless UI Dialog components
vi.mock('@headlessui/react', () => ({
  Dialog: vi.fn(({ open, onClose, children, className }) => 
    open ? <div data-testid="dialog" className={className} onClick={onClose}>{children}</div> : null
  ),
  DialogPanel: vi.fn(({ children, className }) => 
    <div data-testid="dialog-panel" className={className}>{children}</div>
  ),
  DialogTitle: vi.fn(({ children, className }) => 
    <h2 data-testid="dialog-title" className={className}>{children}</h2>
  ),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Eye: () => <span data-testid="eye-icon">Eye</span>,
  EyeOff: () => <span data-testid="eye-off-icon">EyeOff</span>,
}));

// Mock useAuth hook
vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({
    role: null,
    setRole: vi.fn(),
  }),
}));

// Mock API functions
vi.mock('@lib/api/apiUsers', () => ({
  login: vi.fn(() => Promise.resolve({ success: true, message: { token: 'mock-token' } })),
  createResetToken: vi.fn(() => Promise.resolve({ success: true, message: 'Success' })),
}));

// Mock JwtManager
vi.mock('@lib/jwtManager', () => ({
  JwtManager: vi.fn().mockImplementation(() => ({
    writeToken: vi.fn(),
    getRole: vi.fn(() => 'user'),
  })),
}));

// Mock helper functions
vi.mock('@lib/helper', () => ({
  hasStringKey: vi.fn((obj, key) => obj && typeof obj === 'object' && key in obj && typeof obj[key] === 'string'),
}));

// -----------------------------------------------------------------------------

describe('Login', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login dialog when open', () => {
    render(<Login isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Login');
  });

  it('does not render dialog when closed', () => {
    render(<Login isOpen={false} onClose={mockOnClose} />);
    
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders email and password inputs with placeholders', () => {
    render(<Login isOpen={true} onClose={mockOnClose} />);
    
    const emailInput = screen.getByPlaceholderText('Enter email address...');
    const passwordInput = screen.getByPlaceholderText('Enter password...');
    
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  it('renders password visibility toggle button', () => {
    render(<Login isOpen={true} onClose={mockOnClose} />);
    
    const eyeIcon = screen.getByTestId('eye-icon');
    
    expect(eyeIcon).toBeInTheDocument();
    expect(eyeIcon.parentElement).toBeInTheDocument();
  });

  it('shows email validation error for invalid email', async () => {
    render(<Login isOpen={true} onClose={mockOnClose} />);
    
    const emailInput = screen.getByPlaceholderText('Enter email address...');
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('disables login button when email is invalid', () => {
    render(<Login isOpen={true} onClose={mockOnClose} />);
    
    const emailInput = screen.getByPlaceholderText('Enter email address...');
    const loginButton = screen.getByTestId('button-login');
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    expect(loginButton).toBeDisabled();
  });

  it('disables login button when password is empty', () => {
    render(<Login isOpen={true} onClose={mockOnClose} />);
    
    const emailInput = screen.getByPlaceholderText('Enter email address...');
    const loginButton = screen.getByTestId('button-login');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    expect(loginButton).toBeDisabled();
  });

  it('enables login button when email and password are valid', () => {
    render(<Login isOpen={true} onClose={mockOnClose} />);
    
    const emailInput = screen.getByPlaceholderText('Enter email address...');
    const passwordInput = screen.getByPlaceholderText('Enter password...');
    const loginButton = screen.getByTestId('button-login');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(loginButton).not.toBeDisabled();
  });

  it('opens forgot password dialog when link is clicked', async () => {
    render(<Login isOpen={true} onClose={mockOnClose} />);
    
    const forgotPasswordLink = screen.getByText('Forgotten password?');
    
    fireEvent.click(forgotPasswordLink);
    
    await waitFor(() => {
      expect(screen.getByText('Forgotten Password')).toBeInTheDocument();
      expect(screen.getByText(/Enter your email address below/)).toBeInTheDocument();
    });
  });

  it('validates email in forgot password dialog', async () => {
    render(<Login isOpen={true} onClose={mockOnClose} />);
    
    const forgotPasswordLink = screen.getByText('Forgotten password?');
    fireEvent.click(forgotPasswordLink);
    
    await waitFor(() => {
      const resetEmailInput = screen.getAllByPlaceholderText('Enter email address...')[1];
      fireEvent.change(resetEmailInput, { target: { value: 'invalid-email' } });
      
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<Login isOpen={true} onClose={mockOnClose} />);
    
    const cancelButton = screen.getByTestId('button-cancel');
    
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when X button is clicked', () => {
    render(<Login isOpen={true} onClose={mockOnClose} />);
    
    const xButton = screen.getByTestId('x-icon').parentElement;
    
    fireEvent.click(xButton!);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('submits form with valid credentials', async () => {
    render(<Login isOpen={true} onClose={mockOnClose} />);
    
    const emailInput = screen.getByPlaceholderText('Enter email address...');
    const passwordInput = screen.getByPlaceholderText('Enter password...');
    const loginButton = screen.getByTestId('button-login');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------