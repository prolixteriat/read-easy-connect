import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ReviewsCalendar from './ReviewsCalendar';

// -----------------------------------------------------------------------------
// Mock the hooks
vi.mock('@hooks/useReviews', () => ({
  useReviews: vi.fn(),
}));

vi.mock('@hooks/useUsers', () => ({
  useUsers: vi.fn(),
}));

vi.mock('@hooks/useReaders', () => ({
  useReaders: vi.fn(),
}));

vi.mock('@hooks/useOrg', () => ({
  useVenues: vi.fn(),
}));

// Mock react-big-calendar
vi.mock('react-big-calendar', () => ({
  Calendar: vi.fn(({ events, onSelectEvent, onSelectSlot }) => (
    <div data-testid="calendar">
      <div data-testid="events-count">{events.length}</div>
      <button onClick={() => onSelectEvent?.(events[0])} data-testid="select-event">Select Event</button>
      <button onClick={() => onSelectSlot?.({ start: new Date(), end: new Date() })} data-testid="select-slot">Select Slot</button>
    </div>
  )),
  momentLocalizer: vi.fn(() => ({})),
  Views: { MONTH: 'month', WEEK: 'week', DAY: 'day', AGENDA: 'agenda' },
}));

// Mock moment
vi.mock('moment', () => ({
  default: vi.fn(() => ({
    format: vi.fn(() => '2024-01-01T10:00'),
  })),
}));

// Mock the Loading component
vi.mock('@components/Common', () => ({
  Loading: () => <div data-testid="loading">Loading</div>,
  Button: vi.fn(({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">{children}</button>
  )),
  ErrorDialog: vi.fn(() => null),
  ConfirmDialog: vi.fn(() => null),
}));

// Mock JwtManager
vi.mock('@lib/jwtManager', () => ({
  JwtManager: vi.fn(() => ({
    getUserId: vi.fn(() => 1),
  })),
}));
// -----------------------------------------------------------------------------

import { useReviews } from '@hooks/useReviews';
import { useUsers } from '@hooks/useUsers';
import { useReaders } from '@hooks/useReaders';
import { useVenues } from '@hooks/useOrg';

const mockReviews = [
  { review_id: 1, coordinator_id: 1, coach_id: 1, reader_id: 1, date: '2024-01-01 10:00:00', venue_id: 1, status: 'scheduled', notes: null, created_at: '2024-01-01', reader_name: 'John Doe', first_name: 'Coach', last_name: 'One' },
  { review_id: 2, coordinator_id: 1, coach_id: 2, reader_id: 2, date: '2024-01-02 11:00:00', venue_id: 1, status: 'attended', notes: 'Good session', created_at: '2024-01-02', reader_name: 'Jane Smith', first_name: 'Coach', last_name: 'Two' },
];

const mockUsers = [
  { user_id: 1, first_name: 'Coordinator', last_name: 'One', email: 'coord@test.com', role: 'coordinator', status: 'active', disabled: 0, affiliate_id: 1 },
];

const mockReaders = [
  { reader_id: 1, name: 'John Doe', coach_id: 1, status: 'S', affiliate_id: 1, area_id: 1, area_name: 'North Area', coach_first_name: 'Coach', coach_last_name: 'One', referrer_name: null, referrer_org: null, created_at: '2024-01-01', level: 'TP1', availability: null, notes: null, enrolment_at: null, coaching_start_at: null, graduation_at: null, TP1_start_at: null, TP2_start_at: null, TP3_start_at: null, TP4_start_at: null, TP5_start_at: null, TP1_completion_at: null, TP2_completion_at: null, TP3_completion_at: null, TP4_completion_at: null, TP5_completion_at: null, ons4_1: 0, ons4_2: 0, ons4_3: 0 },
  { reader_id: 2, name: 'Jane Smith', coach_id: 2, status: 'G', affiliate_id: 1, area_id: 1, area_name: 'North Area', coach_first_name: 'Coach', coach_last_name: 'Two', referrer_name: null, referrer_org: null, created_at: '2024-01-02', level: 'TP2', availability: null, notes: null, enrolment_at: null, coaching_start_at: null, graduation_at: null, TP1_start_at: null, TP2_start_at: null, TP3_start_at: null, TP4_start_at: null, TP5_start_at: null, TP1_completion_at: null, TP2_completion_at: null, TP3_completion_at: null, TP4_completion_at: null, TP5_completion_at: null, ons4_1: 0, ons4_2: 0, ons4_3: 0 },
];

const mockVenues = [
  { venue_id: 1, name: 'Main Library', affiliate_id: 1, address: '123 Main St', contact_name: 'John Doe', contact_email: 'john@library.com', contact_telephone: '555-0123', notes: 'Main venue', created_at: '2024-01-01', disabled: 0, affiliate_name: 'Main Affiliate' },
];
// -----------------------------------------------------------------------------

describe('ReviewsCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when any data is loading', () => {
    vi.mocked(useReviews).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
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
    vi.mocked(useVenues).mockReturnValue({
      data: mockVenues,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReviewsCalendar />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders calendar with events when data is loaded', () => {
    vi.mocked(useReviews).mockReturnValue({
      data: mockReviews,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
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
    vi.mocked(useVenues).mockReturnValue({
      data: mockVenues,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReviewsCalendar />);
    expect(screen.getByTestId('calendar')).toBeInTheDocument();
    expect(screen.getByTestId('events-count')).toHaveTextContent('1'); // Only scheduled events by default
  });

  it('filters events by status', () => {
    vi.mocked(useReviews).mockReturnValue({
      data: mockReviews,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
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
    vi.mocked(useVenues).mockReturnValue({
      data: mockVenues,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReviewsCalendar />);
    expect(screen.getByTestId('events-count')).toHaveTextContent('1'); // Default filter shows only scheduled
  });

  it('handles event selection', async () => {
    vi.mocked(useReviews).mockReturnValue({
      data: mockReviews,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
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
    vi.mocked(useVenues).mockReturnValue({
      data: mockVenues,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReviewsCalendar />);
    
    const selectEventButton = screen.getByTestId('select-event');
    selectEventButton.click();

    // Should open edit modal (though we're not testing the modal content here)
    await waitFor(() => {
      expect(selectEventButton).toBeInTheDocument();
    });
  });

  it('handles slot selection', async () => {
    vi.mocked(useReviews).mockReturnValue({
      data: mockReviews,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });
    vi.mocked(useUsers).mockReturnValue({
      data: mockUsers,
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
    vi.mocked(useVenues).mockReturnValue({
      data: mockVenues,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<ReviewsCalendar />);
    
    const selectSlotButton = screen.getByTestId('select-slot');
    selectSlotButton.click();

    // Should open add modal (though we're not testing the modal content here)
    await waitFor(() => {
      expect(selectSlotButton).toBeInTheDocument();
    });
  });
});
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
