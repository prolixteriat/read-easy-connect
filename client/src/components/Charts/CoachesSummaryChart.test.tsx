import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CoachesSummaryChart from './CoachesSummaryChart';

// -----------------------------------------------------------------------------
// Mock the useCoachesSummary hook
vi.mock('@hooks/useReports', () => ({
  useCoachesSummary: vi.fn(),
}));

// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Bar: vi.fn(({ data }) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-labels">{data.labels.join(',')}</div>
      <div data-testid="chart-datasets">{data.datasets.length}</div>
    </div>
  )),
}));

// Mock chart.js
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));

// Mock the Loading component
vi.mock('@components/Common', () => ({
  Loading: () => <div data-testid="loading">Loading</div>,
}));

// -----------------------------------------------------------------------------

import { useCoachesSummary, type TCoachesSummarySchema } from '@hooks/useReports';

const mockCoachesSummary: TCoachesSummarySchema = [
  { coordinator_name: 'John Coordinator', paired: 5, waiting_pairing: 2, waiting_training: 1, waiting_checks: 3, on_break: 0, total: 11 },
  { coordinator_name: 'Jane Manager', paired: 3, waiting_pairing: 1, waiting_training: 2, waiting_checks: 1, on_break: 1, total: 8 },
  { coordinator_name: 'TOTAL_ROWS', paired: 8, waiting_pairing: 3, waiting_training: 3, waiting_checks: 4, on_break: 1, total: 19 },
  { coordinator_name: 'TOTAL_COLUMNS', paired: 0, waiting_pairing: 0, waiting_training: 0, waiting_checks: 0, on_break: 0, total: 0 },
];
// -----------------------------------------------------------------------------

describe('CoachesSummaryChart', () => {
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

    render(<CoachesSummaryChart />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const mockError = new Error('Failed to load coaches summary');
    vi.mocked(useCoachesSummary).mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CoachesSummaryChart />);
    expect(screen.getByText('Error loading coaches summary: Failed to load coaches summary')).toBeInTheDocument();
  });

  it('renders no data state', () => {
    vi.mocked(useCoachesSummary).mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CoachesSummaryChart />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders chart with filtered data', () => {
    vi.mocked(useCoachesSummary).mockReturnValue({
      data: mockCoachesSummary,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CoachesSummaryChart />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-labels')).toHaveTextContent('John Coordinator,Jane Manager'); // TOTAL rows filtered out
    expect(screen.getByTestId('chart-datasets')).toHaveTextContent('5'); // 5 datasets: paired, waiting_pairing, waiting_training, waiting_checks, on_break
  });

  it('filters out TOTAL_ROWS and TOTAL_COLUMNS from chart data', () => {
    vi.mocked(useCoachesSummary).mockReturnValue({
      data: mockCoachesSummary,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CoachesSummaryChart />);
    const chartLabels = screen.getByTestId('chart-labels').textContent;
    expect(chartLabels).not.toContain('TOTAL_ROWS');
    expect(chartLabels).not.toContain('TOTAL_COLUMNS');
    expect(chartLabels).toContain('John Coordinator');
    expect(chartLabels).toContain('Jane Manager');
  });

  it('handles undefined data gracefully', () => {
    vi.mocked(useCoachesSummary).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CoachesSummaryChart />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
