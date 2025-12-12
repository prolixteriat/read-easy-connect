import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoansTable from './LoansTable';

// -----------------------------------------------------------------------------
// Mock the hooks
vi.mock('@hooks/useLoans', () => ({
  useLoans: vi.fn(),
}));

vi.mock('@hooks/useReaders', () => ({
  useReaders: vi.fn(),
}));

// Mock the LTable component
vi.mock('./LTable', () => ({
  LTable: vi.fn(({ data, readers, onSave, showReturnedAndLost, setShowReturnedAndLost }) => (
    <div data-testid="ltable">
      <div data-testid="loans-length">{data.length}</div>
      <div data-testid="readers-length">{readers.length}</div>
      <div data-testid="show-returned-lost">{showReturnedAndLost ? 'true' : 'false'}</div>
      <button onClick={onSave} data-testid="save-button">Save</button>
      <button onClick={() => setShowReturnedAndLost?.(!showReturnedAndLost)} data-testid="toggle-returned-lost">Toggle</button>
    </div>
  )),
}));

// Mock the Loading component
vi.mock('@components/Common', () => ({
  Loading: () => <div data-testid="loading">Loading</div>,
}));

// -----------------------------------------------------------------------------

import { useLoans } from '@hooks/useLoans';
import { useReaders } from '@hooks/useReaders';

const mockLoans = [
  { loan_id: 1, reader_id: 1, item: 'Book A', loan_date: '2024-01-01', return_date: null, status: 'loaned', created_at: '2024-01-01', reader_name: 'John Doe' },
  { loan_id: 2, reader_id: 2, item: 'Book B', loan_date: '2024-01-02', return_date: '2024-01-15', status: 'returned', created_at: '2024-01-02', reader_name: 'Jane Smith' },
  { loan_id: 3, reader_id: 3, item: 'Book C', loan_date: '2024-01-03', return_date: null, status: 'lost', created_at: '2024-01-03', reader_name: 'Bob Wilson' },
];

const mockReaders = [
  { reader_id: 1, name: 'John Doe', affiliate_id: 1, area_id: 1, area_name: 'North Area', coach_id: 1, coach_first_name: 'Coach', coach_last_name: 'One', referrer_name: null, referrer_org: null, created_at: '2024-01-01', level: 'TP1', status: 'S', availability: null, notes: null, enrolment_at: null, coaching_start_at: null, graduation_at: null, TP1_start_at: null, TP2_start_at: null, TP3_start_at: null, TP4_start_at: null, TP5_start_at: null, TP1_completion_at: null, TP2_completion_at: null, TP3_completion_at: null, TP4_completion_at: null, TP5_completion_at: null, ons4_1: 0, ons4_2: 0, ons4_3: 0 },
  { reader_id: 2, name: 'Jane Smith', affiliate_id: 1, area_id: 1, area_name: 'North Area', coach_id: 2, coach_first_name: 'Coach', coach_last_name: 'Two', referrer_name: null, referrer_org: null, created_at: '2024-01-02', level: 'TP2', status: 'P', availability: null, notes: null, enrolment_at: null, coaching_start_at: null, graduation_at: null, TP1_start_at: null, TP2_start_at: null, TP3_start_at: null, TP4_start_at: null, TP5_start_at: null, TP1_completion_at: null, TP2_completion_at: null, TP3_completion_at: null, TP4_completion_at: null, TP5_completion_at: null, ons4_1: 0, ons4_2: 0, ons4_3: 0 },
];

// -----------------------------------------------------------------------------

describe('LoansTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when loans data is missing', () => {
    vi.mocked(useLoans).mockReturnValue({
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

    render(<LoansTable />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders loading state when readers data is missing', () => {
    vi.mocked(useLoans).mockReturnValue({
      data: mockLoans,
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

    render(<LoansTable />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders loans table with data', () => {
    vi.mocked(useLoans).mockReturnValue({
      data: mockLoans,
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

    render(<LoansTable />);
    expect(screen.getByTestId('ltable')).toBeInTheDocument();
    expect(screen.getByTestId('loans-length')).toHaveTextContent('3');
    expect(screen.getByTestId('readers-length')).toHaveTextContent('2');
  });

  it('initializes showReturnedAndLost as false', () => {
    vi.mocked(useLoans).mockReturnValue({
      data: mockLoans,
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

    render(<LoansTable />);
    expect(screen.getByTestId('show-returned-lost')).toHaveTextContent('false');
  });

  it('calls mutate when handleSave is triggered', async () => {
    const mockMutate = vi.fn();
    vi.mocked(useLoans).mockReturnValue({
      data: mockLoans,
      error: undefined,
      isLoading: false,
      mutate: mockMutate,
    });
    vi.mocked(useReaders).mockReturnValue({
      data: mockReaders,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<LoansTable />);
    
    const saveButton = screen.getByTestId('save-button');
    saveButton.click();

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it('toggles showReturnedAndLost state', async () => {
    vi.mocked(useLoans).mockReturnValue({
      data: mockLoans,
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

    render(<LoansTable />);
    
    expect(screen.getByTestId('show-returned-lost')).toHaveTextContent('false');
    
    const toggleButton = screen.getByTestId('toggle-returned-lost');
    toggleButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('show-returned-lost')).toHaveTextContent('true');
    });
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
