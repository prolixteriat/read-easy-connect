import React, { useState, useMemo } from 'react';
import { Calendar, momentLocalizer, Views, type View, type SlotInfo } from 'react-big-calendar';
import moment from 'moment';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import './calendar.css';

import { useReviews } from '@hooks/useReviews';
import { useUsers } from '@hooks/useUsers';
import { useReaders } from '@hooks/useReaders';
import { useVenues } from '@hooks/useOrg';
import { useCoaches } from '@hooks/useCoaches';

import { addReview, editReview, type TAddReviewData } from '@lib/api/apiReviews';
import { asString} from '@lib/helper';
import { type TReviewStatus } from '@lib/types';
import { JwtManager } from '@lib/jwtManager';

import { Button, ErrorDialog, ConfirmDialog, Loading, HoverHelp } from '@components/Common';

// -----------------------------------------------------------------------------

const localizer = momentLocalizer(moment);

type ReviewEvent = {
  id: number;
  title: string;
  start: Date;
  end: Date;
  color: string;
  review_id: number;
  coordinator_id: number;
  coach_id: number;
  reader_id: number;
  venue_id: number;
  status: TReviewStatus;
  notes: string | null;
  reader_name: string;
  coach_name: string;
  coordinator_name: string;
};

const READER_COLORS = [
  '#1E90FF', '#32CD32', '#FF6347', '#9370DB', '#20B2AA',
  '#FF69B4', '#FFA500', '#DC143C', '#00CED1', '#FFD700'
];

// -----------------------------------------------------------------------------

export default function ReviewsCalendar(): React.JSX.Element {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<ReviewEvent | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TReviewStatus | 'all'>('scheduled');
  const [isSaving, setIsSaving] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [originalEvent, setOriginalEvent] = useState<ReviewEvent | null>(null);

  const { data: reviewsData, mutate: mutateReviews, isLoading: reviewsLoading } = useReviews();
  const { data: usersData, isLoading: usersLoading } = useUsers();
  const { data: readersData, isLoading: readersLoading } = useReaders();
  const { data: venuesData, isLoading: venuesLoading } = useVenues();
  const { data: coachesData, isLoading: coachesLoading } = useCoaches();
  const jwtManager = new JwtManager();
  const currentUserId = jwtManager.getUserId();

  const [newReview, setNewReview] = useState<Omit<TAddReviewData, 'date' | 'coordinator_id' | 'coach_id'> & { date: Date; end: Date }>({
    reader_id: 0,
    date: new Date(),
    end: new Date(new Date().getTime() + 60 * 60 * 1000),
    venue_id: 0,
    status: 'scheduled',
    notes: '',
  });

  const readerColorMap = useMemo(() => {
    if (!reviewsData) return {};
    const uniqueReaders = [...new Set(reviewsData.map(r => r.reader_name))];
    return uniqueReaders.reduce((acc, reader, index) => {
      acc[reader] = READER_COLORS[index % READER_COLORS.length];
      return acc;
    }, {} as Record<string, string>);
  }, [reviewsData]);

  const events: ReviewEvent[] = useMemo(() => {
    if (!reviewsData || !usersData) return [];

    return reviewsData
      .filter(review => statusFilter === 'all' || review.status === statusFilter)
      .map(review => {
        const coordinator = usersData.find(u => u.user_id === review.coordinator_id);
        const reviewDate = new Date(review.date);
        const endDate = new Date(reviewDate.getTime() + 60 * 60 * 1000);

        return {
          id: review.review_id,
          title: review.reader_name,
          start: reviewDate,
          end: endDate,
          color: readerColorMap[review.reader_name] || '#1E90FF',
          review_id: review.review_id,
          coordinator_id: review.coordinator_id,
          coach_id: review.coach_id,
          reader_id: review.reader_id,
          venue_id: review.venue_id,
          status: review.status as TReviewStatus,
          notes: review.notes,
          reader_name: review.reader_name,
          coach_name: `${review.first_name} ${review.last_name}`,
          coordinator_name: coordinator ? `${coordinator.first_name} ${coordinator.last_name}` : 'Unknown',
        };
      });
  }, [reviewsData, usersData, statusFilter, readerColorMap]);

  const eventStyleGetter = (event: ReviewEvent) => ({
    style: {
      backgroundColor: event.color,
      color: 'white',
      borderRadius: '5px',
      border: 'none',
      padding: '2px 5px',
      cursor: 'pointer',
    },
  });

  const handleSelectEvent = (event: ReviewEvent) => {
    setSelectedEvent(event);
    setOriginalEvent({ ...event });
    setIsEditOpen(true);
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const start = slotInfo.start;
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setNewReview({
      reader_id: 0,
      date: start,
      end,
      venue_id: 0,
      status: 'scheduled',
      notes: '',
    });
    setIsAddOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedEvent) return;

    if (!selectedEvent.venue_id) {
      setErrorMessage('Please select a venue');
      setShowError(true);
      return;
    }

    setIsSaving(true);
    const result = await editReview({
      review_id: selectedEvent.review_id,
      coordinator_id: selectedEvent.coordinator_id,
      coach_id: selectedEvent.coach_id,
      reader_id: selectedEvent.reader_id,
      date: moment(selectedEvent.start).format('YYYY-MM-DD HH:mm:ss'),
      venue_id: selectedEvent.venue_id,
      status: selectedEvent.status,
      notes: selectedEvent.notes || undefined,
    });

    setIsSaving(false);
    if (result.success) {
      mutateReviews?.();
      setIsEditOpen(false);
    } else {
      setErrorMessage(asString(result.message, 'Failed to update review'));
      setShowError(true);
    }
  };

  const handleSaveAdd = async () => {
    if (!newReview.reader_id || !newReview.venue_id) {
      setErrorMessage('Please fill in all required fields');
      setShowError(true);
      return;
    }

    const selectedReader = availableReaders.find(r => r.reader_id === newReview.reader_id);
    const coachId = selectedReader?.coach_id || 0;

    setIsSaving(true);
    const result = await addReview({
      coordinator_id: currentUserId,
      coach_id: coachId,
      reader_id: newReview.reader_id,
      date: moment(newReview.date).format('YYYY-MM-DD HH:mm:ss'),
      venue_id: newReview.venue_id,
      status: newReview.status,
      notes: newReview.notes || undefined,
    });

    setIsSaving(false);
    if (result.success) {
      mutateReviews?.();
      setIsAddOpen(false);
      setNewReview({
        reader_id: 0,
        date: new Date(),
        end: new Date(new Date().getTime() + 60 * 60 * 1000),
        venue_id: 0,
        status: 'scheduled',
        notes: '',
      });
    } else {
      setErrorMessage(asString(result.message, 'Failed to add review'));
      setShowError(true);
    }
  };

  const availableReaders = readersData?.filter(r => 
    !['DO', 'G', 'C'].includes(r.status) && r.coach_id !== null
  ) || [];

  const availableVenues = venuesData?.filter(v => v.disabled === 0) || [];

  const selectedReader = availableReaders.find(r => r.reader_id === newReview.reader_id);
  const selectedCoachName = selectedReader ? 
    `${selectedReader.coach_first_name || ''} ${selectedReader.coach_last_name || ''}`.trim() : '';

  const hasEditChanges = selectedEvent && originalEvent && (
    selectedEvent.venue_id !== originalEvent.venue_id ||
    selectedEvent.status !== originalEvent.status ||
    selectedEvent.notes !== originalEvent.notes ||
    selectedEvent.start.getTime() !== originalEvent.start.getTime()
  );

  const hasAddChanges = newReview.reader_id !== 0 || 
    newReview.venue_id !== 0 || (newReview.notes && newReview.notes.trim() !== '');

  const handleEditCancel = () => {
    if (hasEditChanges) {
      setShowEditConfirm(true);
    } else {
      setIsEditOpen(false);
    }
  };

  const handleAddCancel = () => {
    if (hasAddChanges) {
      setShowAddConfirm(true);
    } else {
      setIsAddOpen(false);
    }
  };

  const handleConfirmEditCancel = () => {
    setShowEditConfirm(false);
    setIsEditOpen(false);
  };

  const handleConfirmAddCancel = () => {
    setShowAddConfirm(false);
    setIsAddOpen(false);
    setNewReview({
      reader_id: 0,
      date: new Date(),
      end: new Date(new Date().getTime() + 60 * 60 * 1000),
      venue_id: 0,
      status: 'scheduled',
      notes: '',
    });
  };

  const isDataLoading = reviewsLoading || usersLoading || readersLoading || venuesLoading || coachesLoading;

  if (isDataLoading) {
    return <Loading />;
  }

  return (
    <div className='px-2 sm:px-0 h-screen sm:h-auto flex flex-col' style={{ paddingTop: '10px' }}>


      <Calendar
        localizer={localizer}
        events={events}
        startAccessor='start'
        endAccessor='end'
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        selectable
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        style={{ height: window.innerWidth < 768 ? 'calc(100vh - 60px)' : 600, flex: window.innerWidth < 768 ? 1 : 'none' }}
        eventPropGetter={eventStyleGetter}
        tooltipAccessor='title'
        components={{
          toolbar: (props) => (
            <div className='rbc-toolbar flex flex-col sm:flex-row gap-2'>
              <div className='flex justify-between items-center w-full sm:w-auto'>
                <span className='rbc-btn-group'>
                  <button type='button' onClick={() => props.onNavigate('PREV')}>‹</button>
                  <button type='button' onClick={() => props.onNavigate('TODAY')}>Today</button>
                  <button type='button' onClick={() => props.onNavigate('NEXT')}>›</button>
                </span>
                <span className='rbc-toolbar-label text-sm sm:text-base font-medium sm:hidden'>{props.label}</span>
              </div>
              <div className='hidden sm:block sm:flex-1 text-center'>
                <span className='rbc-toolbar-label text-base font-medium'>{props.label}</span>
              </div>
              <div className='flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center'>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TReviewStatus | 'all')}
                  className='px-2 py-1 border border-gray-300 rounded text-sm'
                >
                  <option value='all'>All Statuses</option>
                  <option value='scheduled'>Scheduled</option>
                  <option value='attended'>Attended</option>
                  <option value='cancelled'>Cancelled</option>
                  <option value='paused'>Paused</option>
                </select>
                <span className='rbc-btn-group flex'>
                  <button type='button' className={`text-xs sm:text-sm px-2 py-1 ${props.view === 'month' ? 'rbc-active' : ''}`} onClick={() => props.onView('month')}>Month</button>
                  <button type='button' className={`text-xs sm:text-sm px-2 py-1 ${props.view === 'week' ? 'rbc-active' : ''}`} onClick={() => props.onView('week')}>Week</button>
                  <button type='button' className={`text-xs sm:text-sm px-2 py-1 ${props.view === 'day' ? 'rbc-active' : ''}`} onClick={() => props.onView('day')}>Day</button>
                  <button type='button' className={`text-xs sm:text-sm px-2 py-1 ${props.view === 'agenda' ? 'rbc-active' : ''}`} onClick={() => props.onView('agenda')}>Agenda</button>
                </span>
              </div>
            </div>
          )
        }}
      />

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onClose={() => {}} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-2 sm:p-4'>
          <DialogPanel className='w-full max-w-md mx-2 sm:mx-0 rounded-xl bg-white p-4 sm:p-6 shadow-lg max-h-[90vh] overflow-y-auto'>
            <div className='flex justify-between items-start mb-4'>
              <DialogTitle className='text-lg font-semibold'>Edit Review</DialogTitle>
              <button onClick={() => setIsEditOpen(false)}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>

            {selectedEvent && (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className='space-y-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Reader</label>
                  <input
                    className='w-full rounded-md border p-2 bg-gray-100'
                    value={selectedEvent.reader_name}
                    readOnly
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Coach
                    <HoverHelp text='Use the Send System Emails option in the individual Coach configuration to control whether automated invitations are sent' />
                  </label>
                  <input
                    className='w-full rounded-md border p-2 bg-gray-100'
                    value={selectedEvent.coach_name}
                    readOnly
                  />
                  {(() => {
                    const coach = coachesData?.find(c => c.coach_id === selectedEvent.coach_id);
                    return coach ? (
                      <p className='text-sm text-gray-600 mt-1'>
                        {coach.use_email === 1 ? 'Coach will receive an automated email invitation' : 'Coach will not receive an automated email invitation'}
                      </p>
                    ) : null;
                  })()}
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700'>Date & Time *</label>
                  <input
                    type='datetime-local'
                    className='w-full rounded-md border p-2'
                    value={moment(selectedEvent.start).format('YYYY-MM-DDTHH:mm')}
                    onChange={(e) => setSelectedEvent({
                      ...selectedEvent,
                      start: new Date(e.target.value),
                      end: new Date(new Date(e.target.value).getTime() + 60 * 60 * 1000)
                    })}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Venue *</label>
                  <select
                    className='w-full rounded-md border p-2'
                    value={selectedEvent.venue_id || 0}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, venue_id: Number(e.target.value) })}
                  >
                    <option value={0}>-- Select Venue --</option>
                    {availableVenues.map(venue => (
                      <option key={venue.venue_id} value={venue.venue_id}>
                        {venue.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Status</label>
                  <select
                    className='w-full rounded-md border p-2'
                    value={selectedEvent.status}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, status: e.target.value as TReviewStatus })}
                  >
                    <option value='scheduled'>Scheduled</option>
                    <option value='attended'>Attended</option>
                    <option value='cancelled'>Cancelled</option>
                    <option value='paused'>Paused</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Notes</label>
                  <textarea
                    className='w-full rounded-md border p-2'
                    rows={3}
                    value={selectedEvent.notes || ''}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, notes: e.target.value })}
                  />
                </div>
                <div className='flex justify-end gap-2 mt-4'>
                  <Button variant='secondary' type='button' onClick={handleEditCancel}>
                    Cancel
                  </Button>
                  <Button type='submit' disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            )}
          </DialogPanel>
        </div>
      </Dialog>

      {/* Add Modal */}
      <Dialog open={isAddOpen} onClose={() => {}} className='relative z-50'>
        <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
        <div className='fixed inset-0 flex items-center justify-center p-2 sm:p-4'>
          <DialogPanel className='w-full max-w-md mx-2 sm:mx-0 rounded-xl bg-white p-4 sm:p-6 shadow-lg max-h-[90vh] overflow-y-auto'>
            <div className='flex justify-between items-start mb-4'>
              <DialogTitle className='text-lg font-semibold'>Add Review</DialogTitle>
              <button onClick={handleAddCancel}>
                <X className='h-5 w-5 text-gray-500' />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveAdd(); }} className='space-y-3'>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Reader *</label>
                <select
                  className='w-full rounded-md border p-2'
                  value={newReview.reader_id}
                  onChange={(e) => setNewReview({ ...newReview, reader_id: Number(e.target.value) })}
                >
                  <option value={0}>-- Select Reader --</option>
                  {availableReaders.map(reader => (
                    <option key={reader.reader_id} value={reader.reader_id}>
                      {reader.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedCoachName && (
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Coach
                    <HoverHelp text='Use the Send System Emails option in the individual Coach configuration to control whether automated invitations are sent' />
                  </label>
                  <input
                    className='w-full rounded-md border p-2 bg-gray-100'
                    value={selectedCoachName}
                    readOnly
                  />
                  {(() => {
                    const coach = coachesData?.find(c => c.coach_id === selectedReader?.coach_id);
                    return coach ? (
                      <p className='text-sm text-gray-600 mt-1'>
                        {coach.use_email === 1 ? 'Coach will receive an automated email invitation' : 'Coach will not receive an automated email invitation'}
                      </p>
                    ) : null;
                  })()}
                </div>
              )}

              <div>
                <label className='block text-sm font-medium text-gray-700'>Date & Time *</label>
                <input
                  type='datetime-local'
                  className='w-full rounded-md border p-2'
                  value={moment(newReview.date).format('YYYY-MM-DDTHH:mm')}
                  onChange={(e) => setNewReview({
                    ...newReview,
                    date: new Date(e.target.value),
                    end: new Date(new Date(e.target.value).getTime() + 60 * 60 * 1000)
                  })}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Venue *</label>
                <select
                  className='w-full rounded-md border p-2'
                  value={newReview.venue_id}
                  onChange={(e) => setNewReview({ ...newReview, venue_id: Number(e.target.value) })}
                >
                  <option value={0}>-- Select Venue --</option>
                  {availableVenues.map(venue => (
                    <option key={venue.venue_id} value={venue.venue_id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Notes</label>
                <textarea
                  className='w-full rounded-md border p-2'
                  rows={3}
                  value={newReview.notes}
                  onChange={(e) => setNewReview({ ...newReview, notes: e.target.value })}
                  placeholder='Optional notes'
                />
              </div>
              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='secondary' type='button' onClick={handleAddCancel}>
                  Cancel
                </Button>
                <Button type='submit' disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <ErrorDialog
        isOpen={showError}
        onClose={() => setShowError(false)}
        title='Error'
        message={errorMessage}
      />

      <ConfirmDialog
        isOpen={showEditConfirm}
        onClose={() => setShowEditConfirm(false)}
        onConfirm={handleConfirmEditCancel}
        title='Unsaved Changes'
        message='You have unsaved changes. Are you sure you want to cancel?'
      />

      <ConfirmDialog
        isOpen={showAddConfirm}
        onClose={() => setShowAddConfirm(false)}
        onConfirm={handleConfirmAddCancel}
        title='Unsaved Changes'
        message='You have unsaved changes. Are you sure you want to cancel?'
      />

      {isSaving && <Loading />}
    </div>
  );
};
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
