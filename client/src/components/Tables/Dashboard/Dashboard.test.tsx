import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Dashboard from './Dashboard';

// -----------------------------------------------------------------------------
// Mock the hooks
vi.mock('@hooks/useReports', () => ({
  useDashboard: vi.fn(),
}));

// Mock the Loading component
vi.mock('@components/Common', () => ({
  Loading: () => <div data-testid="loading">Loading</div>,
}));

// -----------------------------------------------------------------------------

import { useDashboard } from '@hooks/useReports';
import type { TDashboardSchema } from '@hooks/useReports';

const mockDashboardData: TDashboardSchema = {
  affiliate: 'Test Affiliate',
  manager: { active: 1, onhold: 0, total: 1 },
  viewer: { active: 0, onhold: 0, total: 0 },
  coordinator: { active: 1, onhold: 1, total: 2 },
  coach: { active: 2, onhold: 0, total: 2 },
  reader_TP1: { active: 1, onhold: 0, total: 1 },
  reader_TP2: { active: 1, onhold: 0, total: 1 },
  reader_TP3: { active: 1, onhold: 0, total: 1 },
  reader_TP4: { active: 0, onhold: 0, total: 0 },
  reader_TP5: { active: 0, onhold: 0, total: 0 },
};

// -----------------------------------------------------------------------------

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });
  });

  it('renders loading state', () => {
    vi.mocked(useDashboard).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const mockError = new Error('Failed to load dashboard');
    vi.mocked(useDashboard).mockReturnValue({
      data: undefined,
      error: mockError,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    expect(screen.getByText('Error loading dashboard: Failed to load dashboard')).toBeInTheDocument();
  });

  it('renders no data state', () => {
    vi.mocked(useDashboard).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders dashboard with data', () => {
    vi.mocked(useDashboard).mockReturnValue({
      data: mockDashboardData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    expect(screen.getByText('Test Affiliate Dashboard')).toBeInTheDocument();
    expect(screen.getByText('manager')).toBeInTheDocument();
    expect(screen.getByText('coordinator')).toBeInTheDocument();
    expect(screen.getByText('coach')).toBeInTheDocument();
    expect(screen.getByText('Reader - TP1')).toBeInTheDocument();
  });

  it('handles copy to clipboard functionality', async () => {
    const mockWriteText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    vi.mocked(useDashboard).mockReturnValue({
      data: mockDashboardData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    
    const copyButton = screen.getByTitle('Copy table to clipboard');
    copyButton.click();

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
  });

  it('shows and hides copied message', async () => {
    vi.mocked(useDashboard).mockReturnValue({
      data: mockDashboardData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    
    const copyButton = screen.getByTitle('Copy table to clipboard');
    copyButton.click();

    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });

    // Message should disappear after timeout
    await waitFor(() => {
      expect(screen.queryByText('Copied')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles clipboard copy error gracefully', async () => {
    const mockWriteText = vi.fn(() => Promise.reject(new Error('Clipboard error')));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    vi.mocked(useDashboard).mockReturnValue({
      data: mockDashboardData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<Dashboard />);
    
    const copyButton = screen.getByTitle('Copy table to clipboard');
    copyButton.click();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy to clipboard:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
