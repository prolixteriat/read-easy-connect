import { z } from 'zod';

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

export type TOns4Status = 'no' | 'yes' | 'declined';
export const ONS4_STATUSES = ['no', 'yes', 'declined'] as const satisfies TOns4Status[];
export const ons4StatusEnum = z.enum(ONS4_STATUSES);
export const ons4StatusLabels: Record<TOns4Status, string> = {
  no: 'no',
  yes: 'yes',
  declined: 'declined'
};

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
					'closed-successful' | 'closed-withdrew' | 'closed-unable' | 
          'assessed' | 'awaiting-assessment';

export const referralfStatusLabels: Record<TReferralStatus, string> = {
  new: 'New',
  onhold: 'On hold',
  pending: 'Ready for assessment',
  'awaiting-assessment': 'Assessed - paused',
  'assessed': 'Assessed - ready to be paired',
  'closed-successful': 'Successful - now paired with coach',
  'closed-withdrew': 'Closed - reader withdrew',
  'closed-unable': 'Closed - REHC unable to help'
};
// Used by ReferralsTable and EnquiriesReports components
export const referralfStatusColors: Record<TReferralStatus, string> = {
  new: 'bg-green-100 text-green-800',
  onhold: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-blue-100 text-blue-800',
  'awaiting-assessment': 'bg-pink-100 text-pink-800',
  assessed: 'bg-amber-300 text-amber-800',
  'closed-successful': 'bg-fuchsia-100 text-fuchsia-800',
  'closed-withdrew': 'bg-orange-100 text-orange-800',
  'closed-unable': 'bg-red-100 text-red-800',
};
// Used by EnquiryChart component
export const referralfStatusChartColors: Record<TReferralStatus, string> = {
  new: '#bbf7d080',
  onhold: '#fef3c780',
  pending: '#bfdbfe80',
  'awaiting-assessment': '#fbcfe880',
  assessed: '#fcd34d',
  'closed-successful': '#f5d0fe80',
  'closed-withdrew': '#fed7aa80',
  'closed-unable': '#fecaca80',
};
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
