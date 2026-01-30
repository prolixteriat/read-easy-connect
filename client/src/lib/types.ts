// -----------------------------------------------------------------------------

export type TRole = 'admin' | 'director' | 'manager' | 'coordinator' | 'coach' |
	 				'viewer';

export type TUserStatus = 'active' | 'onhold' | 'leaver';

export type TCoachStatus = 'unchecked' | 'untrained' | 'trained' | 'paired';

export type TTrainingStatus = 'not_booked' | 'booked' | 'completed';

export type TReaderLevel = 'TP1' | 'TP2' | 'TP3' | 'TP4' | 'TP5';

export type TReaderStatus = 'NYS' | 'S' | 'P' | 'DO' | 'G' | 'C';

export type TLoanStatus = 'loaned' | 'returned' | 'lost';

export type TLessonStatus = 'scheduled' | 'attended' | 'cancelled' | 'paused';

export type TReviewStatus = TLessonStatus;

export type TAuditType = 'login' | 'logout' | 'user_added' | 'user_edited' | 
				        'coach_added' | 'coach_edited' | 'reader_added' | 
				        'reader_edited' | 'lesson_added' | 'lesson_edited' | 
				        'review_added' |  'review_edited' | 'status_change' | 
				        'password_reset' | 'other';

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
