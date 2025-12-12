import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UsersTable from './UsersTable';

// -----------------------------------------------------------------------------
// Mock the useUsers hook
vi.mock('@hooks/useUsers', () => ({
  useUsers: vi.fn(),
}));

// Mock the UTable component
vi.mock('./UTable', () => ({
  UTable: vi.fn(({ data, onSave, roleType, showLeavers, setShowLeavers }) => (
    <div data-testid="utable">
      <div data-testid="data-length">{data.length}</div>
      <div data-testid="role-type">{roleType || 'none'}</div>
      <div data-testid="show-leavers">{showLeavers ? 'true' : 'false'}</div>
      <button onClick={onSave} data-testid="save-button">Save</button>
      <button onClick={() => setShowLeavers?.(!showLeavers)} data-testid="toggle-leavers">Toggle</button>
    </div>
  )),
}));

// Mock the Loading component
vi.mock('@components/Common', () => ({
  Loading: () => <div data-testid="loading">Loading</div>,
}));

// -----------------------------------------------------------------------------

import { useUsers } from '@hooks/useUsers';

const mockUsers = [
  { user_id: 1, first_name: 'John', last_name: 'Doe', email: 'john@test.com', role: 'admin', status: 'active', disabled: 0, affiliate_id: 1 },
  { user_id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@test.com', role: 'coordinator', status: 'leaver', disabled: 0, affiliate_id: 1 },
  { user_id: 3, first_name: 'Bob', last_name: 'Wilson', email: 'bob@test.com', role: 'coach', status: 'active', disabled: 1, affiliate_id: 1 },
];

// -----------------------------------------------------------------------------

describe('UsersTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<UsersTable />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const mockError = new Error('Failed to load users');
    vi.mocked(useUsers).mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<UsersTable />);
    expect(screen.getByText('Error loading users: Failed to load users')).toBeInTheDocument();
  });

  it('renders no data state', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<UsersTable />);
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('renders users table with data', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<UsersTable />);
    expect(screen.getByTestId('utable')).toBeInTheDocument();
    expect(screen.getByTestId('data-length')).toHaveTextContent('2'); // leavers filtered out by default
  });

  it('filters users by role type', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<UsersTable roleType="admin" />);
    expect(screen.getByTestId('data-length')).toHaveTextContent('1');
    expect(screen.getByTestId('role-type')).toHaveTextContent('admin');
  });

  it('filters out leavers by default', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<UsersTable />);
    expect(screen.getByTestId('data-length')).toHaveTextContent('2');
    expect(screen.getByTestId('show-leavers')).toHaveTextContent('false');
  });

  it('calls mutate when handleSave is triggered', async () => {
    const mockMutate = vi.fn();
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate: mockMutate,
    });

    render(<UsersTable />);
    
    const saveButton = screen.getByTestId('save-button');
    saveButton.click();

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it('toggles showLeavers state', async () => {
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<UsersTable />);
    
    expect(screen.getByTestId('show-leavers')).toHaveTextContent('false');
    
    const toggleButton = screen.getByTestId('toggle-leavers');
    toggleButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('show-leavers')).toHaveTextContent('true');
    });
  });

  it('combines role filtering and leaver filtering', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<UsersTable roleType="coordinator" />);
    expect(screen.getByTestId('data-length')).toHaveTextContent('0'); // coordinator is a leaver, filtered out
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
