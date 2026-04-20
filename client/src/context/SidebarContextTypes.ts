import { createContext } from 'react';

// -----------------------------------------------------------------------------

export interface SidebarContextType {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------