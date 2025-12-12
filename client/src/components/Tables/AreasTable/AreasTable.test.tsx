import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AreasTable from './AreasTable';

// -----------------------------------------------------------------------------
// Mock the useAreas hook
vi.mock('@hooks/useOrg', () => ({
  useAreas: vi.fn(),
}));

// Mock the ATable component
vi.mock('./ATable', () => ({
  ATable: vi.fn(({ data, onSave }) => (
    <div data-testid="atable">
      <div data-testid="data-length">{data.length}</div>
      <button onClick={onSave} data-testid="save-button">Save</button>
    </div>
  )),
}));

// Mock the Loading component
vi.mock('@components/Common', () => ({
  Loading: () => <div data-testid="loading">Loading</div>,
}));
// -----------------------------------------------------------------------------

import { useAreas } from '@hooks/useOrg';

const mockAreas = [
  { area_id: 1, name: 'North Area', affiliate_id: 1, created_at: '2024-01-01', disabled: 0, affiliate_name: 'Main Affiliate' },
  { area_id: 2, name: 'South Area', affiliate_id: 1, created_at: '2024-01-02', disabled: 0, affiliate_name: 'Main Affiliate' },
  { area_id: 3, name: 'East Area', affiliate_id: 2, created_at: '2024-01-03', disabled: 1, affiliate_name: 'Branch Affiliate' },
];

// -----------------------------------------------------------------------------

describe('AreasTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(useAreas).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<AreasTable />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const mockError = new Error('Failed to load areas');
    vi.mocked(useAreas).mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<AreasTable />);
    expect(screen.getByText('Error loading areas: Failed to load areas')).toBeInTheDocument();
  });

  it('renders no data state', () => {
    vi.mocked(useAreas).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<AreasTable />);
    expect(screen.getByText('No areas found')).toBeInTheDocument();
  });

  it('renders areas table with data', () => {
    vi.mocked(useAreas).mockReturnValue({
      data: mockAreas,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<AreasTable />);
    expect(screen.getByTestId('atable')).toBeInTheDocument();
    expect(screen.getByTestId('data-length')).toHaveTextContent('3');
  });

  it('calls mutate when handleSave is triggered', async () => {
    const mockMutate = vi.fn();
    vi.mocked(useAreas).mockReturnValue({
      data: mockAreas,
      error: undefined,
      isLoading: false,
      mutate: mockMutate,
    });

    render(<AreasTable />);
    
    const saveButton = screen.getByTestId('save-button');
    saveButton.click();

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
