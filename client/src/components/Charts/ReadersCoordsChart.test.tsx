import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ReadersCoordsChart from './ReadersCoordsChart';

// -----------------------------------------------------------------------------
// Mock react-chartjs-2
vi.mock('react-chartjs-2', () => ({
  Bar: vi.fn(({ data }) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-labels">{data.labels.join(',')}</div>
      <div data-testid="chart-datasets">{data.datasets.length}</div>
      <div data-testid="chart-data">{data.datasets.map((d: { data: number[] }) => d.data.join(':')).join('|')}</div>
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
// -----------------------------------------------------------------------------

const mockReadersData = [
  { area_id: 1, area_name: 'North Area', coordinator_id: 1, coordinator_name: 'John Coordinator', reader_id: 1, reader_name: 'Reader One', reader_level: 'TP1', reader_status: 'S', reader_notes: null, TP1: 1, TP2: 0, TP3: 0, TP4: 0, TP5: 0 },
  { area_id: 1, area_name: 'North Area', coordinator_id: 1, coordinator_name: 'John Coordinator', reader_id: 2, reader_name: 'Reader Two', reader_level: 'TP2', reader_status: 'P', reader_notes: null, TP1: 1, TP2: 1, TP3: 0, TP4: 0, TP5: 0 },
  { area_id: 2, area_name: 'South Area', coordinator_id: 2, coordinator_name: 'Jane Manager', reader_id: 3, reader_name: 'Reader Three', reader_level: 'TP1', reader_status: 'S', reader_notes: null, TP1: 1, TP2: 0, TP3: 0, TP4: 0, TP5: 0 },
  { area_id: null, area_name: null, coordinator_id: null, coordinator_name: null, reader_id: 4, reader_name: 'Reader Four', reader_level: 'TP3', reader_status: 'NYS', reader_notes: null, TP1: 1, TP2: 1, TP3: 1, TP4: 0, TP5: 0 },
];
// -----------------------------------------------------------------------------

describe('ReadersCoordsChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders no data message when filteredData is empty', () => {
    render(<ReadersCoordsChart filteredData={[]} />);
    expect(screen.getByText('No readers match the selected filters')).toBeInTheDocument();
  });

  it('renders no data message when filteredData is undefined', () => {
    render(<ReadersCoordsChart />);
    expect(screen.getByText('No readers match the selected filters')).toBeInTheDocument();
  });

  it('renders chart with grouped coordinator data', () => {
    render(<ReadersCoordsChart filteredData={mockReadersData} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-labels')).toHaveTextContent('Jane Manager,John Coordinator,Unassigned'); // Sorted with Unassigned last
  });

  it('groups readers by coordinator correctly', () => {
    render(<ReadersCoordsChart filteredData={mockReadersData} />);
    const chartLabels = screen.getByTestId('chart-labels').textContent;
    expect(chartLabels).toContain('John Coordinator');
    expect(chartLabels).toContain('Jane Manager');
    expect(chartLabels).toContain('Unassigned'); // null coordinator becomes 'Unassigned'
  });

  it('creates datasets for each reader status', () => {
    render(<ReadersCoordsChart filteredData={mockReadersData} />);
    expect(screen.getByTestId('chart-datasets')).toHaveTextContent('3'); // S, P, NYS statuses
  });

  it('sorts coordinators with Unassigned at the end', () => {
    render(<ReadersCoordsChart filteredData={mockReadersData} />);
    const chartLabels = screen.getByTestId('chart-labels').textContent;
    expect(chartLabels?.endsWith('Unassigned')).toBe(true);
  });

  it('handles readers with null coordinator_name as Unassigned', () => {
    const dataWithNullCoordinator = [
      { area_id: null, area_name: null, coordinator_id: null, coordinator_name: null, reader_id: 1, reader_name: 'Reader One', reader_level: 'TP1', reader_status: 'S', reader_notes: null, TP1: 1, TP2: 0, TP3: 0, TP4: 0, TP5: 0 },
    ];
    
    render(<ReadersCoordsChart filteredData={dataWithNullCoordinator} />);
    expect(screen.getByTestId('chart-labels')).toHaveTextContent('Unassigned');
  });

  it('handles readers with null reader_status as Unknown', () => {
    const dataWithNullStatus = [
      { area_id: 1, area_name: 'North Area', coordinator_id: 1, coordinator_name: 'John Coordinator', reader_id: 1, reader_name: 'Reader One', reader_level: 'TP1', reader_status: null, reader_notes: null, TP1: 1, TP2: 0, TP3: 0, TP4: 0, TP5: 0 },
    ];
    
    render(<ReadersCoordsChart filteredData={dataWithNullStatus} />);
    expect(screen.getByTestId('chart-datasets')).toHaveTextContent('1'); // One dataset for 'Unknown' status
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
