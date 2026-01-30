import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TrainingTable from './TrainingTable';

// -----------------------------------------------------------------------------
// Mock the useCoaches hook
vi.mock('@hooks/useCoaches', () => ({
  useCoaches: vi.fn(),
}));

// Mock the TTable component
vi.mock('./TTable', () => ({
  TTable: vi.fn(({ data }) => (
    <div data-testid="ttable">
      <div data-testid="data-length">{data.length}</div>
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
  { user_id: 1, first_name: 'John', last_name: 'Doe', user_status: 'active', training: 'not_booked', consol_training: 'completed', edib_training: 'completed', ref_completed: 1, dbs_completed: 1, coordinator_first_name: 'Jane', coordinator_last_name: 'Smith' },
  { user_id: 2, first_name: 'Jane', last_name: 'Smith', user_status: 'active', training: 'completed', consol_training: 'booked', edib_training: 'completed', ref_completed: 1, dbs_completed: 1, coordinator_first_name: 'John', coordinator_last_name: 'Doe' },
  { user_id: 3, first_name: 'Bob', last_name: 'Johnson', user_status: 'leaver', training: 'not_booked', consol_training: 'not_booked', edib_training: 'not_booked', ref_completed: 0, dbs_completed: 0, coordinator_first_name: null, coordinator_last_name: null },
  { user_id: 4, first_name: 'Alice', last_name: 'Williams', user_status: 'active', training: 'completed', consol_training: 'completed', edib_training: 'completed', ref_completed: 1, dbs_completed: 1, coordinator_first_name: 'Jane', coordinator_last_name: 'Smith' },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any;

// -----------------------------------------------------------------------------

describe('TrainingTable', () => {
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

    render(<TrainingTable />);
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

    render(<TrainingTable />);
    expect(screen.getByText('Error loading coaches: Failed to load coaches')).toBeInTheDocument();
  });

  it('renders no data state', () => {
    vi.mocked(useCoaches).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<TrainingTable />);
    expect(screen.getByText('No coaches found')).toBeInTheDocument();
  });

  it('renders table with filtered data excluding leavers', () => {
    vi.mocked(useCoaches).mockReturnValue({
      data: mockCoaches,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<TrainingTable />);
    expect(screen.getByTestId('ttable')).toBeInTheDocument();
    expect(screen.getByTestId('data-length')).toHaveTextContent('2');
  });

  it('renders no coaches requiring training message when all are complete', () => {
    const completeCoaches = [
      { user_id: 4, first_name: 'Alice', last_name: 'Williams', user_status: 'active', training: 'completed', consol_training: 'completed', edib_training: 'completed', ref_completed: 1, dbs_completed: 1, coordinator_first_name: 'Jane', coordinator_last_name: 'Smith' },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any;

    vi.mocked(useCoaches).mockReturnValue({
      data: completeCoaches,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<TrainingTable />);
    expect(screen.getByText('No coaches requiring training found')).toBeInTheDocument();
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
