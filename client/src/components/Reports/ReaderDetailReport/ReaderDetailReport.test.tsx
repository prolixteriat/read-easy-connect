import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ReaderDetailReport from './ReaderDetailReport';

// -----------------------------------------------------------------------------
// Mock the useReaderDetail hook
vi.mock('@hooks/useReports', () => ({
  useReaderDetail: vi.fn(),
}));

// Mock lazy loaded components
vi.mock('@lib/lazy', () => ({
  ReaderDetailChart: vi.fn(({ filteredData }) => (
    <div data-testid="reader-detail-chart">Chart: {filteredData?.length || 0} readers</div>
  )),
  ReaderCoordsChart: vi.fn(({ filteredData }) => (
    <div data-testid="reader-coords-chart">Coords Chart: {filteredData?.length || 0} readers</div>
  )),
}));

// Mock child components
vi.mock('./ReaderDetailTable', () => ({
  default: vi.fn(({ filteredData }) => (
    <div data-testid="reader-detail-table">Table: {filteredData?.length || 0} readers</div>
  )),
}));

vi.mock('./ReaderStatusFilter', () => ({
  default: vi.fn(({ selectedStatuses, onStatusChange }) => (
    <div data-testid="reader-status-filter">
      <div data-testid="selected-statuses">{selectedStatuses.join(',')}</div>
      <button onClick={() => onStatusChange(['S', 'P'])} data-testid="change-status">Change Status</button>
    </div>
  )),
}));

// Mock the Loading component
vi.mock('@components/Common', () => ({
  Loading: () => <div data-testid="loading">Loading</div>,
}));
// -----------------------------------------------------------------------------

import { useReaderDetail } from '@hooks/useReports';

const mockReadersData = [
  { area_id: 1, area_name: 'North Area', coordinator_id: 1, coordinator_name: 'John Coordinator', reader_id: 1, reader_name: 'Reader One', reader_level: 'TP1', reader_status: 'S', reader_notes: null, TP1: 1, TP2: 0, TP3: 0, TP4: 0, TP5: 0 },
  { area_id: 1, area_name: 'North Area', coordinator_id: 1, coordinator_name: 'John Coordinator', reader_id: 2, reader_name: 'Reader Two', reader_level: 'TP2', reader_status: 'P', reader_notes: null, TP1: 1, TP2: 1, TP3: 0, TP4: 0, TP5: 0 },
  { area_id: 2, area_name: 'South Area', coordinator_id: 2, coordinator_name: 'Jane Manager', reader_id: 3, reader_name: 'Reader Three', reader_level: 'TP1', reader_status: 'G', reader_notes: null, TP1: 1, TP2: 0, TP3: 0, TP4: 0, TP5: 0 },
  { area_id: null, area_name: null, coordinator_id: null, coordinator_name: null, reader_id: null, reader_name: null, reader_level: null, reader_status: 'NYS', reader_notes: null, TP1: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0 },
];
// -----------------------------------------------------------------------------

describe('ReaderDetailReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  it('renders loading state', () => {
    vi.mocked(useReaderDetail).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<ReaderDetailReport />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders all components when not loading', () => {
    vi.mocked(useReaderDetail).mockReturnValue({
      data: mockReadersData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReaderDetailReport />);
    expect(screen.getByTestId('reader-status-filter')).toBeInTheDocument();
    expect(screen.getByTestId('reader-detail-table')).toBeInTheDocument();
    expect(screen.getByTestId('reader-detail-chart')).toBeInTheDocument();
    expect(screen.getByTestId('reader-coords-chart')).toBeInTheDocument();
  });

  it('filters data correctly by default', () => {
    vi.mocked(useReaderDetail).mockReturnValue({
      data: mockReadersData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReaderDetailReport />);
    // Should filter out null reader_id entries, so 3 readers remain
    expect(screen.getByText('Table: 3 readers')).toBeInTheDocument();
    expect(screen.getByText('Chart: 3 readers')).toBeInTheDocument();
    expect(screen.getByText('Coords Chart: 3 readers')).toBeInTheDocument();
  });

  it('updates filtered data when status changes', async () => {
    vi.mocked(useReaderDetail).mockReturnValue({
      data: mockReadersData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReaderDetailReport />);
    
    const changeStatusButton = screen.getByTestId('change-status');
    changeStatusButton.click();

    await waitFor(() => {
      // After filtering to only 'S' and 'P' statuses, should have 2 readers
      expect(screen.getByText('Table: 2 readers')).toBeInTheDocument();
      expect(screen.getByText('Chart: 2 readers')).toBeInTheDocument();
      expect(screen.getByText('Coords Chart: 2 readers')).toBeInTheDocument();
    });
  });

  it('initializes with default statuses', () => {
    vi.mocked(useReaderDetail).mockReturnValue({
      data: mockReadersData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReaderDetailReport />);
    expect(screen.getByTestId('selected-statuses')).toHaveTextContent('NYS,S,P,DO,G,C');
  });

  it('saves status changes to localStorage', async () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem');
    
    vi.mocked(useReaderDetail).mockReturnValue({
      data: mockReadersData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReaderDetailReport />);
    
    const changeStatusButton = screen.getByTestId('change-status');
    changeStatusButton.click();

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith('readersDetailReport_selectedStatuses', '["S","P"]');
    });
  });

  it('handles empty data gracefully', () => {
    vi.mocked(useReaderDetail).mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReaderDetailReport />);
    expect(screen.getByText('Table: 0 readers')).toBeInTheDocument();
    expect(screen.getByText('Chart: 0 readers')).toBeInTheDocument();
    expect(screen.getByText('Coords Chart: 0 readers')).toBeInTheDocument();
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
