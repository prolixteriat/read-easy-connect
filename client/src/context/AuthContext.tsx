import { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { type TRole } from '@lib/types';
import { JwtManager } from '@lib/jwtManager';

// -----------------------------------------------------------------------------

interface AuthContextType {
  role: TRole | null;
  setRole: (role: TRole | null) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export default AuthContext;

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
