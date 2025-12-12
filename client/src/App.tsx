import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { roleRoutes } from './routes/roleRoutes';

import Navbar from '@components/Navbar/Navbar';
import ProtectedRoute from '@components/Navbar/ProtectedRoute';
import { Dashboard, TextPage } from '@lib/lazy';
import { Loading } from '@components/Common';

import { environment, initConfig } from '@lib/config';

// -----------------------------------------------------------------------------

function AppRoutes(): React.JSX.Element {
  const { role } = useAuth();
  initConfig(environment);
  return (
    <Routes>
      <Route path='/' element={
        role ? (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <Dashboard />
            </Suspense>
          </ProtectedRoute>
        ) : (
          <Suspense fallback={<Loading />}>
            <TextPage blockType='intro' />
          </Suspense>
        )
      } />
      {role &&
        roleRoutes[role].map((route) => (
          <React.Fragment key={route.path}>
            <Route
              path={route.path}
              element={<ProtectedRoute>{route.element}</ProtectedRoute>}
            />
            {route.children?.map((child) => (
              <Route
                key={child.path}
                path={child.path}
                element={<ProtectedRoute>{child.element}</ProtectedRoute>}
              />
            ))}
          </React.Fragment>
        ))}
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
};
// -----------------------------------------------------------------------------

function AppContent(): React.JSX.Element {
  return (
    <div className='relative min-h-screen'>
      {/* Top Navbar / App Bar */}
      <Navbar />

      {/* Main content area */}
      <div className='flex'>
        <main className='flex-1 pt-12 p-4 transition-all duration-300 md:ml-56 overflow-hidden'>
          <AppRoutes />
        </main>
      </div>
    </div>
  );
};
// -----------------------------------------------------------------------------

export default function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
