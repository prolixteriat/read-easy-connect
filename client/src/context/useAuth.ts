import { useContext } from 'react';
import AuthContext from './AuthContext';
import { type TRole } from '@lib/types';

// -----------------------------------------------------------------------------

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export type { TRole };

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
