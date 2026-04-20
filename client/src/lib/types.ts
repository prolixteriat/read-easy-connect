// -----------------------------------------------------------------------------

export type TAuditType = 'login' | 'logout' | 'user_added' | 'user_edited' | 
				        'coach_added' | 'coach_edited' | 'reader_added' | 
				        'reader_edited' | 'lesson_added' | 'lesson_edited' | 
				        'review_added' |  'review_edited' | 'status_change' | 
				        'password_reset' | 'other' |'admin' | 'org_added' | 
						'org_edited' | 'contact_added' | 'contact_edited' | 
						'referral_added' | 'referral_edited';

						export type TCoachStatus = 'unchecked' | 'untrained' | 'trained' | 'paired';

export type TLessonStatus = 'scheduled' | 'attended' | 'cancelled' | 'paused';

export type TLoanStatus = 'loaned' | 'returned' | 'lost';

export type TReaderLevel = 'TP1' | 'TP2' | 'TP3' | 'TP4' | 'TP5';


export type TReviewStatus = TLessonStatus;

export type TReaderStatus = 'NYS' | 'S' | 'P' | 'DO' | 'G' | 'C';

export type TRole = 'admin' | 'director' | 'manager' | 'coordinator' | 'coach' |
	 				'viewer';

export type TTrainingStatus = 'not_booked' | 'booked' | 'completed';

export type TUserStatus = 'active' | 'onhold' | 'leaver';

// -----------------------------------------------------------------------------

export type TOrgType = 'civic' | 'donor' | 'network' | 'referrer' | 'supplier' | 
						'supporter' | 'venue' | 'volunteer';

export const orgTypeLabels: Record<TOrgType, string> = {
  civic: 'Civic / Elected Rep',
  donor: 'Donor',
  network: 'Network and Info Facilitation',
  referrer: 'Referrer / Potential Referrer',
  supplier: 'Supplier',
  supporter: 'Supporter',
  venue: 'Venue',
  volunteer: 'Volunteer Source'
};
// -----------------------------------------------------------------------------

export type TReferralStatus = 'new' | 'pending' | 'onhold' | 
					'closed-successful' | 'closed-withdrew' | 'closed-unable';

export const referralfStatusLabels: Record<TReferralStatus, string> = {
  new: 'New',
  pending: 'Pending',
  onhold: 'On Hold',
  'closed-successful': 'Successful - Now new reader',
  'closed-withdrew': 'Closed - Reader withdrew',
  'closed-unable': 'Closed - REHC unable to help' 
};
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
