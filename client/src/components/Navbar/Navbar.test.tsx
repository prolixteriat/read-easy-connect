import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './Navbar';

// -----------------------------------------------------------------------------
// Mock the useAuth hook
vi.mock('../../context/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    NavLink: vi.fn(({ children, to, className, onClick }) => (
      <a href={to} className={typeof className === 'function' ? className({ isActive: false }) : className} onClick={onClick}>
        {children}
      </a>
    )),
  };
});

// Mock roleRoutes
vi.mock('../../routes/roleRoutes', () => ({
  roleRoutes: {
    manager: [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/users', label: 'Users', children: [{ path: '/users/list', label: 'User List' }] },
    ],
    coordinator: [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/readers', label: 'Readers' },
    ],
  },
}));

// Mock JwtManager
vi.mock('@lib/jwtManager', () => ({
  JwtManager: vi.fn(() => ({
    setSelectedRole: vi.fn(),
    isLoggedIn: vi.fn(() => false),
    getRole: vi.fn(() => 'manager'),
    logOut: vi.fn(),
  })),
}));

// Mock API functions
vi.mock('@lib/api/apiUsers', () => ({
  logout: vi.fn(() => Promise.resolve({ success: true })),
  isValidToken: vi.fn(() => Promise.resolve({ success: true })),
}));

// Mock Common components
vi.mock('@components/Common', () => ({
  ConfirmDialog: vi.fn(({ isOpen, onConfirm, title, message }) => 
    isOpen ? <div data-testid="confirm-dialog" onClick={onConfirm}>{title}: {message}</div> : null
  ),
  Loading: vi.fn(() => <div data-testid="loading">Loading...</div>),
}));

// Mock lazy components
vi.mock('@lib/lazy', () => ({
  EditProfile: vi.fn(({ isOpen, onClose }) => 
    isOpen ? <div data-testid="edit-profile" onClick={onClose}>Edit Profile Modal</div> : null
  ),
  Login: vi.fn(({ isOpen, onClose }) => 
    isOpen ? <div data-testid="login-modal" onClick={onClose}>Login Modal</div> : null
  ),
}));

// -----------------------------------------------------------------------------

import { useAuth } from '../../context/useAuth';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);
// -----------------------------------------------------------------------------

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login button when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      role: null,
      setRole: vi.fn(),
      loading: false,
    });

    render(
      <TestWrapper>
        <Navbar />
      </TestWrapper>
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Connect')).toBeInTheDocument();
  });

  it('renders user menu when user is authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      role: 'manager',
      setRole: vi.fn(),
      loading: false,
    });

    render(
      <TestWrapper>
        <Navbar />
      </TestWrapper>
    );

    expect(screen.getByLabelText('User')).toBeInTheDocument();
    expect(screen.getByText('Connect')).toBeInTheDocument();
  });

  it('opens login modal when login is clicked', async () => {
    vi.mocked(useAuth).mockReturnValue({
      role: null,
      setRole: vi.fn(),
      loading: false,
    });

    render(
      <TestWrapper>
        <Navbar />
      </TestWrapper>
    );

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('login-modal')).toBeInTheDocument();
    });
  });

  it('shows user dropdown menu when user icon is clicked', async () => {
    vi.mocked(useAuth).mockReturnValue({
      role: 'manager',
      setRole: vi.fn(),
      loading: false,
    });

    render(
      <TestWrapper>
        <Navbar />
      </TestWrapper>
    );

    const userButton = screen.getByLabelText('User');
    userButton.click();

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  it('shows logout confirmation when logout is clicked', async () => {
    const mockSetRole = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      role: 'manager',
      setRole: mockSetRole,
      loading: false,
    });

    render(
      <TestWrapper>
        <Navbar />
      </TestWrapper>
    );

    const userButton = screen.getByLabelText('User');
    userButton.click();

    await waitFor(() => {
      const logoutButton = screen.getByText('Logout');
      logoutButton.click();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    });
  });

  it('shows mobile menu toggle when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      role: 'manager',
      setRole: vi.fn(),
      loading: false,
    });

    render(
      <TestWrapper>
        <Navbar />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Toggle mobile menu')).toBeInTheDocument();
  });

  it('opens profile modal when profile is clicked', async () => {
    vi.mocked(useAuth).mockReturnValue({
      role: 'manager',
      setRole: vi.fn(),
      loading: false,
    });

    render(
      <TestWrapper>
        <Navbar />
      </TestWrapper>
    );

    const userButton = screen.getByLabelText('User');
    userButton.click();

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
    
    const profileButton = screen.getByText('Profile');
    profileButton.click();
    
    await waitFor(() => {
      expect(screen.getByTestId('edit-profile')).toBeInTheDocument();
    });
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
