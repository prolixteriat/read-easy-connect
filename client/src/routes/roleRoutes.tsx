import React, { Suspense } from 'react';

import { 
  ReviewsCalendar, 
  AuditReport, CoachDetailReport, ContactsReport, EnquiriesReport, 
  ReaderDetailReport, ReviewsReport,
  AreasTable, CoachesTable, LoansTable, Ons4Table, OrgsTable, ReadersTable, 
  ReferralsTable, UsersTable, TextPage, TrainingTable
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
    { path: '/about/contact-us', label: 'Contact Us', 
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
        { path: '/people/managers', label: 'Managers', 
          element: <Suspense fallback={<Loading />}><UsersTable roleType='manager'/></Suspense> },
        { path: '/people/viewers', label: 'Info Viewers', 
          element: <Suspense fallback={<Loading />}><UsersTable roleType='viewer'/></Suspense> },
        { path: '/people/coordinators', label: 'Coordinators', 
          element: <Suspense fallback={<Loading />}><UsersTable roleType='coordinator'/></Suspense> },
        { path: '/people/coaches', label: 'Coaches', 
          element: <Suspense fallback={<Loading />}><CoachesTable /></Suspense> },
        { path: '/people/readers', label: 'Readers', 
          element: <Suspense fallback={<Loading />}><ReadersTable /></Suspense> },
        { path: '/people/enquiries', label: 'Enquiries', 
          element: <Suspense fallback={<Loading />}><ReferralsTable /></Suspense> },
      ],
    },

    {
      path: '/places',
      label: 'Places',
      element: <div>Manager Places</div>,
      children: [
        { path: '/places/organisations', label: 'Organisations', 
          element: <Suspense fallback={<Loading />}><OrgsTable /></Suspense> },
        { path: '/places/areas', label: 'Areas', 
          element: <Suspense fallback={<Loading />}><AreasTable /></Suspense> },
      ],
    },

    {
      path: '/schedule',
      label: 'Schedule',
      element: <div>Manager Schedule</div>,
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
        { path: '/reports/coach-detail', label: 'Coach Detail', 
          element: <Suspense fallback={<Loading />}><CoachDetailReport /></Suspense> },
        { path: '/reports/training', label: 'Coach Training', 
          element: <Suspense fallback={<Loading />}><TrainingTable /></Suspense> },
        { path: '/reports/reader-detail', label: 'Reader Detail', 
          element: <Suspense fallback={<Loading />}><ReaderDetailReport /></Suspense> },
        { path: '/reports/ons4', label: 'ONS4 Completion', 
          element: <Suspense fallback={<Loading />}><Ons4Table /></Suspense> },
        { path: '/reports/contacts', label: 'Contacts', 
          element: <Suspense fallback={<Loading />}><ContactsReport /></Suspense> },
        { path: '/reports/enquiries', label: 'Enquiries', 
          element: <Suspense fallback={<Loading />}><EnquiriesReport /></Suspense> },
        { path: '/reports/reviews', label: 'Reviews', 
          element: <Suspense fallback={<Loading />}><ReviewsReport /></Suspense> },
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
        { path: '/people/coaches', label: 'Coaches', 
          element: <Suspense fallback={<Loading />}><CoachesTable /></Suspense> },
        { path: '/people/readers', label: 'Readers', 
          element: <Suspense fallback={<Loading />}><ReadersTable /></Suspense> },
        { path: '/people/enquiries', label: 'Enquiries', 
          element: <Suspense fallback={<Loading />}><ReferralsTable /></Suspense> },
      ],
    },

    {
      path: '/places',
      label: 'Places',
      element: <div>Coordinator Places</div>,
      children: [
        { path: '/places/organisations', label: 'Organisations', 
          element: <Suspense fallback={<Loading />}><OrgsTable /></Suspense> },
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
        { path: '/reports/coach-detail', label: 'Coach Detail', 
          element: <Suspense fallback={<Loading />}><CoachDetailReport /></Suspense> },
        { path: '/reports/training', label: 'Coach Training', 
          element: <Suspense fallback={<Loading />}><TrainingTable /></Suspense> },
        { path: '/reports/reader-detail', label: 'Reader Detail', 
          element: <Suspense fallback={<Loading />}><ReaderDetailReport /></Suspense> },
        { path: '/reports/ons4', label: 'ONS4 Completion', 
          element: <Suspense fallback={<Loading />}><Ons4Table /></Suspense> },
        { path: '/reports/contacts', label: 'Contacts', 
          element: <Suspense fallback={<Loading />}><ContactsReport /></Suspense> },
        { path: '/reports/enquiries', label: 'Enquiries', 
          element: <Suspense fallback={<Loading />}><EnquiriesReport /></Suspense> },
        { path: '/reports/reviews', label: 'Reviews', 
          element: <Suspense fallback={<Loading />}><ReviewsReport /></Suspense> },
      ],
    },
  ],

  viewer: [
    {
      path: '/people',
      label: 'People',
      element: <div>Viewer People</div>,
      children: [
        { path: '/people/enquiries', label: 'Enquiries', 
          element: <Suspense fallback={<Loading />}><ReferralsTable /></Suspense> },
      ],
    },
    
    {
      path: '/places',
      label: 'Places',
      element: <div>Viewer Places</div>,
      children: [
        { path: '/places/organisations', label: 'Organisations', 
          element: <Suspense fallback={<Loading />}><OrgsTable /></Suspense> },
      ],
    },

    {
      path: '/reports',
      label: 'Reports',
      element: <div>Viewer Reports</div>,
      children: [
        { path: '/reports/coach-detail', label: 'Coach Detail', 
          element: <Suspense fallback={<Loading />}><CoachDetailReport /></Suspense> },
        { path: '/reports/reader-detail', label: 'Reader Detail', 
          element: <Suspense fallback={<Loading />}><ReaderDetailReport /></Suspense> },
        { path: '/reports/contacts', label: 'Contacts', 
          element: <Suspense fallback={<Loading />}><ContactsReport /></Suspense> },
        { path: '/reports/enquiries', label: 'Enquiries', 
          element: <Suspense fallback={<Loading />}><EnquiriesReport /></Suspense> }
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
