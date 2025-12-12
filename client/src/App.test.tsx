import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

// -----------------------------------------------------------------------------
// Mock all dependencies
vi.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./context/useAuth', () => ({
  useAuth: vi.fn(() => ({ role: null })),
}));

vi.mock('./routes/roleRoutes', () => ({
  roleRoutes: {},
}));

vi.mock('@components/Navbar/Navbar', () => ({
  default: () => <div>Connect</div>,
}));

vi.mock('@components/Navbar/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@lib/lazy', () => ({
  Dashboard: () => <div>Dashboard</div>,
  IntroText: () => <div>Intro Text</div>,
  TextPage: () => <div>Text Page</div>,
}));

vi.mock('@components/Common', () => ({
  Loading: () => <div>Loading</div>,
}));

vi.mock('@lib/config', () => ({
  environment: 'test',
  initConfig: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Route: ({ element }: { element: React.ReactNode }) => <div>{element}</div>,
    Navigate: () => <div>Navigate</div>,
  };
});
// -----------------------------------------------------------------------------

describe('App component', () => {
  it('renders the heading', () => {
    render(<App />);
    expect(screen.getAllByText(/connect/i)[0]).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
