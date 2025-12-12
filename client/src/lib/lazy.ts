import { lazy } from 'react';

// -----------------------------------------------------------------------------

// Calendars
export const ReviewsCalendar = lazy(() => import('@components/Calendars/ReviewsCalendar'));

// Charts
export const CoachesSummaryChart = lazy(() => import('@components/Charts/CoachesSummaryChart'));
export const ReadersDetailChart = lazy(() => import('@components/Charts/ReadersDetailChart'));
export const ReadersCoordsChart = lazy(() => import('@components/Charts/ReadersCoordsChart'));

// Misc
export const TextPage = lazy(() => import('@components/Misc/TextPage/TextPage'));

// Profile
export const EditProfile = lazy(() => import('@components/Profile/EditProfile'));
export const Login = lazy(() => import('@components/Profile/Login'));

// Reports
export const AuditReport = lazy(() => import('@components/Reports/AuditReport'));
export const CoachesSummaryReport = lazy(() => import('@components/Reports/CoachesSummaryReport'));
export const ReadersDetailReport = lazy(() => import('@components/Reports/ReadersDetailReport'));
export const ReviewsReport = lazy(() => import('@components/Reports/ReviewsReport'));

// Tables
export const AreasTable = lazy(() => import('@components/Tables/AreasTable/AreasTable'));
export const CoachesTable = lazy(() => import('@components/Tables/CoachesTable/CoachesTable'));
export const Dashboard = lazy(() => import('@components/Tables/Dashboard/Dashboard'));
export const LoansTable = lazy(() => import('@components/Tables/LoansTable/LoansTable'));
export const ReadersTable = lazy(() => import('@components/Tables/ReadersTable/ReadersTable'));
export const UsersTable = lazy(() => import('@components/Tables/UsersTable/UsersTable'));
export const VenuesTable = lazy(() => import('@components/Tables/VenuesTable/VenuesTable'));

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
