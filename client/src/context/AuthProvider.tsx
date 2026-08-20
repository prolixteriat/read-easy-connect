import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { type TRole } from '@lib/types';
import { JwtManager } from '@lib/jwtManager';
import { AuthContext } from './AuthContext';

// -----------------------------------------------------------------------------

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<TRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const jwtManager = new JwtManager();
    if (jwtManager.isLoggedIn()) {
      setRole(jwtManager.getRole());
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ role, setRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
