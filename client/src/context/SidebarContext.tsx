import React, { useState, type ReactNode } from 'react';
import { SidebarContext } from './SidebarContextTypes';

// -----------------------------------------------------------------------------

export const SidebarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
