import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ReadersTable from './ReadersTable';

// -----------------------------------------------------------------------------
// Mock the useReaders hook
vi.mock('@hooks/useReaders', () => ({
  useReaders: vi.fn(),
}));

// Mock the RTable component
vi.mock('./RTable', () => ({
  RTable: vi.fn(({ data, onSave, showGDOC, setShowGDOC }) => (
    <div data-testid="rtable">
      <div data-testid="data-length">{data.length}</div>
      <div data-testid="show-gdoc">{showGDOC ? 'true' : 'false'}</div>
      <button onClick={onSave} data-testid="save-button">Save</button>
      <button onClick={() => setShowGDOC?.(!showGDOC)} data-testid="toggle-gdoc">Toggle</button>
    </div>
  )),
}));

// Mock the Loading component
vi.mock('@components/Common', () => ({
  Loading: () => <div data-testid="loading">Loading</div>,
}));

// -----------------------------------------------------------------------------

import { useReaders, type TReadersSchema } from '@hooks/useReaders';

const mockReaders: TReadersSchema = [
  { reader_id: 1, name: 'John Doe', reader_first_name: 'Alan', affiliate_id: 1, area_id: 1, area_name: 'North Area', coach_id: 1, coach_first_name: 'Coach', coach_last_name: 'One', referral_id: null, created_at: '2024-01-01', level: 'TP1', status: 'S', availability: null, notes: null, enrolment_at: null, coaching_start_at: null, graduation_at: null, TP1_start_at: null, TP2_start_at: null, TP3_start_at: null, TP4_start_at: null, TP5_start_at: null, TP1_completion_at: null, TP2_completion_at: null, TP3_completion_at: null, TP4_completion_at: null, TP5_completion_at: null, TP1_certificate: 0, TP2_certificate: 0, TP3_certificate: 0, TP4_certificate: 0, TP5_certificate: 0, ons4_1: 'no', ons4_2: 'no', ons4_3: 'no' },
  { reader_id: 2, name: 'Jane Smith', reader_first_name: 'Brian', affiliate_id: 1, area_id: 1, area_name: 'North Area', coach_id: 2, coach_first_name: 'Coach', coach_last_name: 'Two', referral_id: null, created_at: '2024-01-02', level: 'TP2', status: 'G', availability: null, notes: null, enrolment_at: null, coaching_start_at: null, graduation_at: null, TP1_start_at: null, TP2_start_at: null, TP3_start_at: null, TP4_start_at: null, TP5_start_at: null, TP1_completion_at: null, TP2_completion_at: null, TP3_completion_at: null, TP4_completion_at: null, TP5_completion_at: null, TP1_certificate: 0, TP2_certificate: 0, TP3_certificate: 0, TP4_certificate: 0, TP5_certificate: 0, ons4_1: 'no', ons4_2: 'no', ons4_3: 'no' },
  { reader_id: 3, name: 'Bob Wilson', reader_first_name: 'Charles', affiliate_id: 1, area_id: 2, area_name: 'South Area', coach_id: 3, coach_first_name: 'Coach', coach_last_name: 'Three', referral_id: null, created_at: '2024-01-03', level: 'TP3', status: 'P', availability: null, notes: null, enrolment_at: null, coaching_start_at: null, graduation_at: null, TP1_start_at: null, TP2_start_at: null, TP3_start_at: null, TP4_start_at: null, TP5_start_at: null, TP1_completion_at: null, TP2_completion_at: null, TP3_completion_at: null, TP4_completion_at: null, TP5_completion_at: null, TP1_certificate: 0, TP2_certificate: 0, TP3_certificate: 0, TP4_certificate: 0, TP5_certificate: 0, ons4_1: 'no', ons4_2: 'no', ons4_3: 'no' },
  { reader_id: 4, name: 'Alice Brown', reader_first_name: 'David', affiliate_id: 1, area_id: 2, area_name: 'South Area', coach_id: 4, coach_first_name: 'Coach', coach_last_name: 'Four', referral_id: null, created_at: '2024-01-04', level: 'TP4', status: 'DO', availability: null, notes: null, enrolment_at: null, coaching_start_at: null, graduation_at: null, TP1_start_at: null, TP2_start_at: null, TP3_start_at: null, TP4_start_at: null, TP5_start_at: null, TP1_completion_at: null, TP2_completion_at: null, TP3_completion_at: null, TP4_completion_at: null, TP5_completion_at: null, TP1_certificate: 0, TP2_certificate: 0, TP3_certificate: 0, TP4_certificate: 0, TP5_certificate: 0, ons4_1: 'no', ons4_2: 'no', ons4_3: 'no' },
  { reader_id: 5, name: 'Charlie Green', reader_first_name: 'Edward', affiliate_id: 1, area_id: 1, area_name: 'North Area', coach_id: 5, coach_first_name: 'Coach', coach_last_name: 'Five', referral_id: null, created_at: '2024-01-05', level: 'TP5', status: 'C', availability: null, notes: null, enrolment_at: null, coaching_start_at: null, graduation_at: null, TP1_start_at: null, TP2_start_at: null, TP3_start_at: null, TP4_start_at: null, TP5_start_at: null, TP1_completion_at: null, TP2_completion_at: null, TP3_completion_at: null, TP4_completion_at: null, TP5_completion_at: null, TP1_certificate: 0, TP2_certificate: 0, TP3_certificate: 0, TP4_certificate: 0, TP5_certificate: 0, ons4_1: 'no', ons4_2: 'no', ons4_3: 'no' },
];

// -----------------------------------------------------------------------------

describe('ReadersTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(useReaders).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<ReadersTable />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const mockError = new Error('Failed to load readers');
    vi.mocked(useReaders).mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReadersTable />);
    expect(screen.getByText('Error loading readers: Failed to load readers')).toBeInTheDocument();
  });

  it('renders no data state', () => {
    vi.mocked(useReaders).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReadersTable />);
    expect(screen.getByText('No readers found')).toBeInTheDocument();
  });

  it('renders readers table with data', () => {
    vi.mocked(useReaders).mockReturnValue({
      data: mockReaders,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReadersTable />);
    expect(screen.getByTestId('rtable')).toBeInTheDocument();
    expect(screen.getByTestId('data-length')).toHaveTextContent('2'); // G, DO, C statuses filtered out by default
  });

  it('filters out G, DO, C statuses by default', () => {
    vi.mocked(useReaders).mockReturnValue({
      data: mockReaders,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReadersTable />);
    expect(screen.getByTestId('data-length')).toHaveTextContent('2'); // Only S and P statuses remain
    expect(screen.getByTestId('show-gdoc')).toHaveTextContent('false');
  });

  it('calls mutate when handleSave is triggered', async () => {
    const mockMutate = vi.fn();
    vi.mocked(useReaders).mockReturnValue({
      data: mockReaders,
      error: undefined,
      isLoading: false,
      mutate: mockMutate,
    });

    render(<ReadersTable />);
    
    const saveButton = screen.getByTestId('save-button');
    saveButton.click();

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it('toggles showGDOC state', async () => {
    vi.mocked(useReaders).mockReturnValue({
      data: mockReaders,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReadersTable />);
    
    expect(screen.getByTestId('show-gdoc')).toHaveTextContent('false');
    
    const toggleButton = screen.getByTestId('toggle-gdoc');
    toggleButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('show-gdoc')).toHaveTextContent('true');
    });
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
