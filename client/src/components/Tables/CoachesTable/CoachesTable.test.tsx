import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CoachesTable from './CoachesTable';

// -----------------------------------------------------------------------------
// Mock the useCoaches hook
vi.mock('@hooks/useCoaches', () => ({
  useCoaches: vi.fn(),
}));

// Mock the CTable component
vi.mock('./CTable', () => ({
  CTable: vi.fn(({ data, onSave, showLeavers, setShowLeavers }) => (
    <div data-testid="ctable">
      <div data-testid="data-length">{data.length}</div>
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

import { useCoaches } from '@hooks/useCoaches';

const mockCoaches = [
  { coach_id: 1, first_name: 'John', last_name: 'Doe', email: 'john@test.com', user_status: 'active', status: 'trained', disabled: 0, coordinator_id: 1, coordinator_first_name: 'Jane', coordinator_last_name: 'Smith', area_id: 1, area_name: 'North Area', email_consent: 1, whatsapp_consent: 1, dbs_completed: 1, ref_completed: 1, commitment_completed: 1, training_booked: 1, edib_train_completed: 1, consol_train_completed: 1, availability: 'weekends', preferences: 'none', notes: 'good coach', created_at: '2024-01-01', password_reset: 0 },
  { coach_id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@test.com', user_status: 'leaver', status: 'untrained', disabled: 0, coordinator_id: 1, coordinator_first_name: 'Jane', coordinator_last_name: 'Smith', area_id: 1, area_name: 'North Area', email_consent: 1, whatsapp_consent: 0, dbs_completed: 0, ref_completed: 0, commitment_completed: 0, training_booked: 0, edib_train_completed: 0, consol_train_completed: 0, availability: null, preferences: null, notes: null, created_at: '2024-01-02', password_reset: 0 },
  { coach_id: 3, first_name: 'Bob', last_name: 'Wilson', email: 'bob@test.com', user_status: 'active', status: 'paired', disabled: 1, coordinator_id: 2, coordinator_first_name: 'Bob', coordinator_last_name: 'Manager', area_id: 2, area_name: 'South Area', email_consent: 0, whatsapp_consent: 1, dbs_completed: 1, ref_completed: 1, commitment_completed: 1, training_booked: 1, edib_train_completed: 1, consol_train_completed: 0, availability: 'evenings', preferences: 'online', notes: 'experienced', created_at: '2024-01-03', password_reset: 1 },
];

// -----------------------------------------------------------------------------

describe('CoachesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(useCoaches).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<CoachesTable />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const mockError = new Error('Failed to load coaches');
    vi.mocked(useCoaches).mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CoachesTable />);
    expect(screen.getByText('Error loading coaches: Failed to load coaches')).toBeInTheDocument();
  });

  it('renders no data state', () => {
    vi.mocked(useCoaches).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CoachesTable />);
    expect(screen.getByText('No coaches found')).toBeInTheDocument();
  });

  it('renders coaches table with data', () => {
    vi.mocked(useCoaches).mockReturnValue({
      data: mockCoaches,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CoachesTable />);
    expect(screen.getByTestId('ctable')).toBeInTheDocument();
    expect(screen.getByTestId('data-length')).toHaveTextContent('2'); // leavers filtered out by default
  });

  it('filters out leavers by default', () => {
    vi.mocked(useCoaches).mockReturnValue({
      data: mockCoaches,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CoachesTable />);
    expect(screen.getByTestId('data-length')).toHaveTextContent('2');
    expect(screen.getByTestId('show-leavers')).toHaveTextContent('false');
  });

  it('calls mutate when handleSave is triggered', async () => {
    const mockMutate = vi.fn();
    vi.mocked(useCoaches).mockReturnValue({
      data: mockCoaches,
      error: undefined,
      isLoading: false,
      mutate: mockMutate,
    });

    render(<CoachesTable />);
    
    const saveButton = screen.getByTestId('save-button');
    saveButton.click();

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it('toggles showLeavers state', async () => {
    vi.mocked(useCoaches).mockReturnValue({
      data: mockCoaches,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CoachesTable />);
    
    expect(screen.getByTestId('show-leavers')).toHaveTextContent('false');
    
    const toggleButton = screen.getByTestId('toggle-leavers');
    toggleButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('show-leavers')).toHaveTextContent('true');
    });
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
