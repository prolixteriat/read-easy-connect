import { lazy } from 'react';

// -----------------------------------------------------------------------------

// Calendars
export const ReviewsCalendar = lazy(() => import('@components/Calendars/ReviewsCalendar'));

// Charts
export const CoachDetailChart = lazy(() => import('@components/Charts/CoachDetailChart'));
export const ReaderDetailChart = lazy(() => import('@components/Charts/ReaderDetailChart'));
export const ReaderCoordsChart = lazy(() => import('@components/Charts/ReaderCoordsChart'));

// Misc
export const TextPage = lazy(() => import('@components/Misc/TextPage/TextPage'));

// Profile
export const EditProfile = lazy(() => import('@components/Profile/EditProfile'));
export const Login = lazy(() => import('@components/Profile/Login'));

// Reports
export const AuditReport = lazy(() => import('@components/Reports/AuditReport'));
export const CoachDetailReport = lazy(() => import('@components/Reports/CoachDetailReport'));
export const ReaderDetailReport = lazy(() => import('@components/Reports/ReaderDetailReport'));
export const ReviewsReport = lazy(() => import('@components/Reports/ReviewsReport'));

// Tables
export const AreasTable = lazy(() => import('@components/Tables/AreasTable/AreasTable'));
export const CoachesTable = lazy(() => import('@components/Tables/CoachesTable/CoachesTable'));
export const Dashboard = lazy(() => import('@components/Tables/Dashboard/Dashboard'));
export const LoansTable = lazy(() => import('@components/Tables/LoansTable/LoansTable'));
export const ReadersTable = lazy(() => import('@components/Tables/ReadersTable/ReadersTable'));
export const TrainingTable = lazy(() => import('@components/Tables/TrainingTable/TrainingTable'));
export const UsersTable = lazy(() => import('@components/Tables/UsersTable/UsersTable'));
export const VenuesTable = lazy(() => import('@components/Tables/VenuesTable/VenuesTable'));

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
