import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CoachDetailReport from './CoachDetailReport';

// -----------------------------------------------------------------------------
// Mock the useCoachDetail hook
vi.mock('@hooks/useReports', () => ({
  useCoachDetail: vi.fn(),
}));

// Mock lazy loaded components
vi.mock('@lib/lazy', () => ({
  CoachDetailChart: vi.fn(() => <div data-testid="coach-detail-chart">Chart</div>),
}));

// Mock CoachDetailable component
vi.mock('./CoachDetailTable', () => ({
  default: vi.fn(() => <div data-testid="coach-detail-table">Table</div>),
}));

// Mock the Loading component
vi.mock('@components/Common', () => ({
  Loading: () => <div data-testid="loading">Loading</div>,
}));
// -----------------------------------------------------------------------------

import { useCoachDetail } from '@hooks/useReports';

// -----------------------------------------------------------------------------

describe('CoachDetailReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(useCoachDetail).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<CoachDetailReport />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders table and chart when not loading', () => {
    vi.mocked(useCoachDetail).mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CoachDetailReport />);
    expect(screen.getByTestId('coach-detail-table')).toBeInTheDocument();
    expect(screen.getByTestId('coach-detail-chart')).toBeInTheDocument();
  });

  it('does not render table and chart when loading', () => {
    vi.mocked(useCoachDetail).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<CoachDetailReport />);
    expect(screen.queryByTestId('coach-detail-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('coach-detail-chart')).not.toBeInTheDocument();
  });

  it('renders components in correct order when loaded', () => {
    vi.mocked(useCoachDetail).mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CoachDetailReport />);
    
    const table = screen.getByTestId('coach-detail-table');
    const chart = screen.getByTestId('coach-detail-chart');
    
    expect(table).toBeInTheDocument();
    expect(chart).toBeInTheDocument();
    
    // Verify table appears before chart in DOM
    const container = table.parentElement;
    const tableIndex = Array.from(container!.children).indexOf(table);
    const chartIndex = Array.from(container!.children).indexOf(chart);
    expect(tableIndex).toBeLessThan(chartIndex);
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
