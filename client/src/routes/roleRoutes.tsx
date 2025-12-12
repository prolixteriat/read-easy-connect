import React, { Suspense } from 'react';

import { 
  ReviewsCalendar, 
  AuditReport, CoachesSummaryReport, ReadersDetailReport, ReviewsReport,
  AreasTable, CoachesTable, ReadersTable, UsersTable, LoansTable, TextPage, 
  VenuesTable
 } from '@lib/lazy';

 import { Loading } from '@components/Common';

// -----------------------------------------------------------------------------

export interface RouteItem {
  path: string;
  label: string;
  element: React.ReactNode;
  children?: RouteItem[];
};

const aboutRoutes: RouteItem =  {
  path: '/about',
  label: 'About',
  element: <div>About</div>,
  children: [
    { path: '/about/contact', label: 'Contact', 
      element: <Suspense fallback={<Loading />}><TextPage blockType='contact' /></Suspense> },
    { path: '/about/privacy', label: 'Privacy', 
      element: <Suspense fallback={<Loading />}><TextPage blockType='privacy' /></Suspense> },
  ],
};

const roleSpecificRoutes: Record<string, RouteItem[]> = {
  admin: [
    {
      path: '/organisation',
      label: 'Organisation',
      element: <div>Admin Organisation</div>,
      children: [
        { path: '/organisation/directors', label: 'Directors', 
          element: <Suspense fallback={<Loading />}><TextPage blockType='contact' /></Suspense> },
      ],
    },
    {
      path: '/reports',
      label: 'Reports',
      element: <div>Admin Reports</div>,
      children: [
        { path: '/reports/personnel', label: 'Personnel',
           element: <Suspense fallback={<Loading />}><TextPage blockType='contact' /></Suspense> },
      ],
    }, 
  ],

  manager: [
    {
      path: '/people',
      label: 'People',
      element: <div>Manager People</div>,
      children: [
        { path: '/organisation/managers', label: 'Managers', 
          element: <Suspense fallback={<Loading />}><UsersTable roleType='manager'/></Suspense> },
        { path: '/organisation/coordinators', label: 'Coordinators', 
          element: <Suspense fallback={<Loading />}><UsersTable roleType='coordinator'/></Suspense> },
        { path: '/organisation/coaches', label: 'Coaches', 
          element: <Suspense fallback={<Loading />}><CoachesTable /></Suspense> },
        { path: '/organisation/readers', label: 'Readers', 
          element: <Suspense fallback={<Loading />}><ReadersTable /></Suspense> },
      ],
    },

    {
      path: '/places',
      label: 'Places',
      element: <div>Manager Places</div>,
      children: [
        { path: '/organisation/venues', label: 'Venues', 
          element: <Suspense fallback={<Loading />}><VenuesTable /></Suspense> },
        { path: '/organisation/areas', label: 'Areas', 
          element: <Suspense fallback={<Loading />}><AreasTable /></Suspense> },
      ],
    },

    {
      path: '/schedule',
      label: 'Schedule',
      element: <div>Coordinator Schedule</div>,
      children: [
        { path: '/schedule/loans', label: 'Loans', 
          element: <Suspense fallback={<Loading />}><LoansTable /></Suspense> },
      ],
    },

    {
      path: '/reports',
      label: 'Reports',
      element: <div>Manager Reports</div>,
      children: [
        { path: '/reports/coaches-summary', label: 'Coaches Summary', 
          element: <Suspense fallback={<Loading />}><CoachesSummaryReport /></Suspense> },
        { path: '/reports/readers-detail', label: 'Readers Detail', 
          element: <Suspense fallback={<Loading />}><ReadersDetailReport /></Suspense> },
        { path: '/reports/audit-log', label: 'Audit Log', 
          element: <Suspense fallback={<Loading />}><AuditReport /></Suspense> },
      ],
    },
  ],

  coordinator: [
    {
      path: '/people',
      label: 'People',
      element: <div>Coordinator People</div>,
      children: [
        { path: '/organisation/coaches', label: 'Coaches', 
          element: <Suspense fallback={<Loading />}><CoachesTable /></Suspense> },
        { path: '/organisation/readers', label: 'Readers', 
          element: <Suspense fallback={<Loading />}><ReadersTable /></Suspense> },
      ],
    },

    {
      path: '/schedule',
      label: 'Schedule',
      element: <div>Coordinator Schedule</div>,
      children: [
        { path: '/schedule/reviews', label: 'Reviews', 
          element: <Suspense fallback={<Loading />}><ReviewsCalendar /></Suspense> },
        { path: '/schedule/loans', label: 'Loans', 
          element: <Suspense fallback={<Loading />}><LoansTable /></Suspense> },
      ],
    },

    {
      path: '/reports',
      label: 'Reports',
      element: <div>Coordinator Reports</div>,
      children: [
        { path: '/reports/coaches-summary', label: 'Coaches Summary', 
          element: <Suspense fallback={<Loading />}><CoachesSummaryReport /></Suspense> },
        { path: '/reports/readers-detail', label: 'Readers Detail', 
          element: <Suspense fallback={<Loading />}><ReadersDetailReport /></Suspense> },
        { path: '/reports/reviews', label: 'Reviews', 
          element: <Suspense fallback={<Loading />}><ReviewsReport /></Suspense> },
      ],
    },
  ],

  coach: [
    {
      path: '/schedule',
      label: 'Schedule',
      element: <div>Coach Schedule</div>,
      children: [
        { path: '/schedule/lessons', label: 'Lessons', 
          element: <Suspense fallback={<Loading />}><TextPage blockType='contact' /></Suspense> },
      ],
    },
  ],
};
// -----------------------------------------------------------------------------

export const roleRoutes: Record<string, RouteItem[]> = Object.fromEntries(
  Object.entries(roleSpecificRoutes).map(([role, routes]) => [
    role,
    [...routes, aboutRoutes], // append About to each role
  ])
);
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
