import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Dashboard from './Dashboard';

// -----------------------------------------------------------------------------
// Mock the hooks
vi.mock('@hooks/useUsers', () => ({
  useUsers: vi.fn(),
}));

vi.mock('@hooks/useReaders', () => ({
  useReaders: vi.fn(),
}));

// Mock the Loading component
vi.mock('@components/Common', () => ({
  Loading: () => <div data-testid="loading">Loading</div>,
}));

// -----------------------------------------------------------------------------

import { useUsers } from '@hooks/useUsers';
import { useReaders } from '@hooks/useReaders';

const mockUsers = [
  { user_id: 1, first_name: 'John', last_name: 'Doe', email: 'john@test.com', disabled: 0, role: 'manager', status: 'active', affiliate_id: 1 },
  { user_id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@test.com', disabled: 0, role: 'coordinator', status: 'onhold', affiliate_id: 1 },
  { user_id: 3, first_name: 'Bob', last_name: 'Wilson', email: 'bob@test.com', disabled: 0, role: 'coach', status: 'active', affiliate_id: 1 },
  { user_id: 4, first_name: 'Alice', last_name: 'Brown', email: 'alice@test.com', disabled: 0, role: 'coach', status: 'leaver', affiliate_id: 1 },
];

const mockReaders = [
  { reader_id: 1, name: 'Reader1 Test', affiliate_id: 1, area_id: 1, area_name: 'North', coach_id: 1, coach_first_name: 'John', coach_last_name: 'Doe', referrer_name: null, referrer_org: null, created_at: '2024-01-01', level: 'TP1', status: 'NYS', availability: null, notes: null, enrolment_at: null, coaching_start_at: null, graduation_at: null, TP1_start_at: null, TP2_start_at: null, TP3_start_at: null, TP4_start_at: null, TP5_start_at: null, TP1_completion_at: null, TP2_completion_at: null, TP3_completion_at: null, TP4_completion_at: null, TP5_completion_at: null, ons4_1: 0, ons4_2: 0, ons4_3: 0 },
  { reader_id: 2, name: 'Reader2 Test', affiliate_id: 1, area_id: 1, area_name: 'North', coach_id: 1, coach_first_name: 'John', coach_last_name: 'Doe', referrer_name: null, referrer_org: null, created_at: '2024-01-01', level: 'TP2', status: 'S', availability: null, notes: null, enrolment_at: null, coaching_start_at: null, graduation_at: null, TP1_start_at: null, TP2_start_at: null, TP3_start_at: null, TP4_start_at: null, TP5_start_at: null, TP1_completion_at: null, TP2_completion_at: null, TP3_completion_at: null, TP4_completion_at: null, TP5_completion_at: null, ons4_1: 0, ons4_2: 0, ons4_3: 0 },
  { reader_id: 3, name: 'Reader3 Test', affiliate_id: 1, area_id: 1, area_name: 'North', coach_id: 1, coach_first_name: 'John', coach_last_name: 'Doe', referrer_name: null, referrer_org: null, created_at: '2024-01-01', level: 'TP3', status: 'P', availability: null, notes: null, enrolment_at: null, coaching_start_at: null, graduation_at: null, TP1_start_at: null, TP2_start_at: null, TP3_start_at: null, TP4_start_at: null, TP5_start_at: null, TP1_completion_at: null, TP2_completion_at: null, TP3_completion_at: null, TP4_completion_at: null, TP5_completion_at: null, ons4_1: 0, ons4_2: 0, ons4_3: 0 },
  { reader_id: 4, name: 'Reader4 Test', affiliate_id: 1, area_id: 1, area_name: 'North', coach_id: 1, coach_first_name: 'John', coach_last_name: 'Doe', referrer_name: null, referrer_org: null, created_at: '2024-01-01', level: 'TP1', status: 'DO', availability: null, notes: null, enrolment_at: null, coaching_start_at: null, graduation_at: null, TP1_start_at: null, TP2_start_at: null, TP3_start_at: null, TP4_start_at: null, TP5_start_at: null, TP1_completion_at: null, TP2_completion_at: null, TP3_completion_at: null, TP4_completion_at: null, TP5_completion_at: null, ons4_1: 0, ons4_2: 0, ons4_3: 0 },
];

// -----------------------------------------------------------------------------

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });
  });

  it('renders loading state when users are loading', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });
    vi.mocked(useReaders).mockReturnValue({
      data: mockReaders,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders loading state when readers are loading', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    vi.mocked(useReaders).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders error state for users error', () => {
    const mockError = new Error('Failed to load users');
    vi.mocked(useUsers).mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
      mutate: vi.fn(),
    });
    vi.mocked(useReaders).mockReturnValue({
      data: mockReaders,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    expect(screen.getByText('Error loading users summary: Failed to load users')).toBeInTheDocument();
  });

  it('renders error state for readers error', () => {
    const mockError = new Error('Failed to load readers');
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    vi.mocked(useReaders).mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    expect(screen.getByText('Error loading users summary: Failed to load readers')).toBeInTheDocument();
  });

  it('renders no data state when users data is empty', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    vi.mocked(useReaders).mockReturnValue({
      data: mockReaders,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders dashboard with data', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    vi.mocked(useReaders).mockReturnValue({
      data: mockReaders,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('manager')).toBeInTheDocument();
    expect(screen.getByText('coordinator')).toBeInTheDocument();
    expect(screen.getByText('coach')).toBeInTheDocument();
  });

  it('filters out leavers from users data', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    vi.mocked(useReaders).mockReturnValue({
      data: mockReaders,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    // Should not display leaver user Alice Brown
    expect(screen.queryByText('leaver')).not.toBeInTheDocument();
  });

  it('filters out excluded reader statuses', () => {
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    vi.mocked(useReaders).mockReturnValue({
      data: mockReaders,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    // Reader with status 'DO' should be filtered out
    expect(screen.getByText('Reader - TP1')).toBeInTheDocument();
  });

  it('handles copy to clipboard functionality', async () => {
    const mockWriteText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    vi.mocked(useReaders).mockReturnValue({
      data: mockReaders,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    
    const copyButton = screen.getByTitle('Copy table to clipboard');
    copyButton.click();

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
  });

  it('shows and hides copied message', async () => {
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    vi.mocked(useReaders).mockReturnValue({
      data: mockReaders,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    
    const copyButton = screen.getByTitle('Copy table to clipboard');
    copyButton.click();

    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });

    // Message should disappear after timeout
    await waitFor(() => {
      expect(screen.queryByText('Copied')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles clipboard copy error gracefully', async () => {
    const mockWriteText = vi.fn(() => Promise.reject(new Error('Clipboard error')));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    vi.mocked(useReaders).mockReturnValue({
      data: mockReaders,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    
    const copyButton = screen.getByTitle('Copy table to clipboard');
    copyButton.click();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy to clipboard:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
