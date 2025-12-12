import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CoachesSummaryReport from './CoachesSummaryReport';

// -----------------------------------------------------------------------------
// Mock the useCoachesSummary hook
vi.mock('@hooks/useReports', () => ({
  useCoachesSummary: vi.fn(),
}));

// Mock lazy loaded components
vi.mock('@lib/lazy', () => ({
  CoachesSummaryChart: vi.fn(() => <div data-testid="coaches-summary-chart">Chart</div>),
}));

// Mock CoachesSummaryTable component
vi.mock('./CoachesSummaryTable', () => ({
  default: vi.fn(() => <div data-testid="coaches-summary-table">Table</div>),
}));

// Mock the Loading component
vi.mock('@components/Common', () => ({
  Loading: () => <div data-testid="loading">Loading</div>,
}));
// -----------------------------------------------------------------------------

import { useCoachesSummary } from '@hooks/useReports';

// -----------------------------------------------------------------------------

describe('CoachesSummaryReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(useCoachesSummary).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<CoachesSummaryReport />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders table and chart when not loading', () => {
    vi.mocked(useCoachesSummary).mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CoachesSummaryReport />);
    expect(screen.getByTestId('coaches-summary-table')).toBeInTheDocument();
    expect(screen.getByTestId('coaches-summary-chart')).toBeInTheDocument();
  });

  it('does not render table and chart when loading', () => {
    vi.mocked(useCoachesSummary).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<CoachesSummaryReport />);
    expect(screen.queryByTestId('coaches-summary-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('coaches-summary-chart')).not.toBeInTheDocument();
  });

  it('renders components in correct order when loaded', () => {
    vi.mocked(useCoachesSummary).mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CoachesSummaryReport />);
    
    const table = screen.getByTestId('coaches-summary-table');
    const chart = screen.getByTestId('coaches-summary-chart');
    
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
