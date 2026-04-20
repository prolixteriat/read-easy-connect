import { lazy } from 'react';

// -----------------------------------------------------------------------------

// Calendars
export const ReviewsCalendar = lazy(() => import('@components/Calendars/ReviewsCalendar'));

// Charts
export const CoachDetailChart = lazy(() => import('@components/Charts/CoachDetailChart/CoachDetailChart'));
export const EnquiryChart = lazy(() => import('@components/Charts/EnquiryChart/EnquiryChart'));
export const ReaderDetailChart = lazy(() => import('@components/Charts/ReaderDetailChart/ReaderDetailChart'));
export const ReaderCoordsChart = lazy(() => import('@components/Charts/ReaderCoordsChart/ReaderCoordsChart'));

// Misc
export const TextPage = lazy(() => import('@components/Misc/TextPage/TextPage'));

// Toolbar
export const EditProfile = lazy(() => import('@components/Toolbar/EditProfile/EditProfile'));
export const Login = lazy(() => import('@components/Toolbar/Login/Login'));
export const QuickNote = lazy(() => import('@components/Toolbar/QuickNote/QuickNote'));

// Reports
export const AuditReport = lazy(() => import('@components/Reports/AuditReport/AuditReport'));
export const CoachDetailReport = lazy(() => import('@components/Reports/CoachDetailReport/CoachDetailReport'));
export const ContactsReport = lazy(() => import('@components/Reports/ContactsReport/ContactsReport'));
export const EnquiriesReport = lazy(() => import('@components/Reports/EnquiriesReport/EnquiriesReport'));
export const ReaderDetailReport = lazy(() => import('@components/Reports/ReaderDetailReport/ReaderDetailReport'));
export const ReviewsReport = lazy(() => import('@components/Reports/ReviewsReport/ReviewsReport'));

// Tables
export const AreasTable = lazy(() => import('@components/Tables/AreasTable/AreasTable'));
export const CoachesTable = lazy(() => import('@components/Tables/CoachesTable/CoachesTable'));
export const Dashboard = lazy(() => import('@components/Tables/Dashboard/Dashboard'));
export const LoansTable = lazy(() => import('@components/Tables/LoansTable/LoansTable'));
export const OrgsTable = lazy(() => import('@components/Tables/OrgsTable/OrgsTable'));
export const Ons4Table = lazy(() => import('@components/Tables/Ons4Table/Ons4Table'));
export const ReadersTable = lazy(() => import('@components/Tables/ReadersTable/ReadersTable'));
export const ReferralsTable = lazy(() => import('@components/Tables/ReferralsTable/ReferralsTable'));
export const TrainingTable = lazy(() => import('@components/Tables/TrainingTable/TrainingTable'));
export const UsersTable = lazy(() => import('@components/Tables/UsersTable/UsersTable'));
export const VenuesTable = lazy(() => import('@components/Tables/VenuesTable/VenuesTable'));

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
