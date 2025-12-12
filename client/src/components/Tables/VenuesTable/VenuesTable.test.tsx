import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import VenuesTable from './VenuesTable';

// -----------------------------------------------------------------------------
// Mock the useVenues hook
vi.mock('@hooks/useOrg', () => ({
  useVenues: vi.fn(),
}));

// Mock the VTable component
vi.mock('./VTable', () => ({
  VTable: vi.fn(({ data, onSave, showDisabled, setShowDisabled }) => (
    <div data-testid="vtable">
      <div data-testid="data-length">{data.length}</div>
      <div data-testid="show-disabled">{showDisabled ? 'true' : 'false'}</div>
      <button onClick={onSave} data-testid="save-button">Save</button>
      <button onClick={() => setShowDisabled?.(!showDisabled)} data-testid="toggle-disabled">Toggle</button>
    </div>
  )),
}));

// Mock the Loading component
vi.mock('@components/Common', () => ({
  Loading: () => <div data-testid="loading">Loading</div>,
}));

// -----------------------------------------------------------------------------

import { useVenues } from '@hooks/useOrg';

const mockVenues = [
  { venue_id: 1, name: 'Main Library', affiliate_id: 1, address: '123 Main St', contact_name: 'John Doe', contact_email: 'john@library.com', contact_telephone: '555-0123', notes: 'Main venue', created_at: '2024-01-01', disabled: 0, affiliate_name: 'Main Affiliate' },
  { venue_id: 2, name: 'Community Center', affiliate_id: 1, address: '456 Oak Ave', contact_name: 'Jane Smith', contact_email: 'jane@center.com', contact_telephone: '555-0456', notes: 'Secondary venue', created_at: '2024-01-02', disabled: 1, affiliate_name: 'Main Affiliate' },
  { venue_id: 3, name: 'School Hall', affiliate_id: 2, address: '789 Pine Rd', contact_name: 'Bob Wilson', contact_email: 'bob@school.edu', contact_telephone: '555-0789', notes: null, created_at: '2024-01-03', disabled: 0, affiliate_name: 'Branch Affiliate' },
];

// -----------------------------------------------------------------------------

describe('VenuesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(useVenues).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<VenuesTable />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const mockError = new Error('Failed to load venues');
    vi.mocked(useVenues).mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<VenuesTable />);
    expect(screen.getByText('Error loading venues')).toBeInTheDocument();
  });

  it('renders no data state', () => {
    vi.mocked(useVenues).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<VenuesTable />);
    expect(screen.getByText('No venues found')).toBeInTheDocument();
  });

  it('renders venues table with data', () => {
    vi.mocked(useVenues).mockReturnValue({
      data: mockVenues,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<VenuesTable />);
    expect(screen.getByTestId('vtable')).toBeInTheDocument();
    expect(screen.getByTestId('data-length')).toHaveTextContent('3');
  });

  it('initializes showDisabled as false', () => {
    vi.mocked(useVenues).mockReturnValue({
      data: mockVenues,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<VenuesTable />);
    expect(screen.getByTestId('show-disabled')).toHaveTextContent('false');
  });

  it('calls mutate when handleSave is triggered', async () => {
    const mockMutate = vi.fn();
    vi.mocked(useVenues).mockReturnValue({
      data: mockVenues,
      error: undefined,
      isLoading: false,
      mutate: mockMutate,
    });

    render(<VenuesTable />);
    
    const saveButton = screen.getByTestId('save-button');
    saveButton.click();

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it('toggles showDisabled state', async () => {
    vi.mocked(useVenues).mockReturnValue({
      data: mockVenues,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<VenuesTable />);
    
    expect(screen.getByTestId('show-disabled')).toHaveTextContent('false');
    
    const toggleButton = screen.getByTestId('toggle-disabled');
    toggleButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('show-disabled')).toHaveTextContent('true');
    });
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
