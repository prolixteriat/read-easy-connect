import { createContext } from 'react';
import { type TRole } from '@lib/types';

// -----------------------------------------------------------------------------

export interface AuthContextType {
  role: TRole | null;
  setRole: (role: TRole | null) => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
