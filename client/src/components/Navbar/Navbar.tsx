import React, { useState, useRef, useEffect, Suspense } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User, NotebookPen, ChevronRight, ChevronLeft } from 'lucide-react';

import AppIcon from '../../assets/app-icon.ico';

import { environment } from '@lib/config';
import { useAuth } from '../../context/useAuth';
import { useSidebar } from '../../context/useSidebar';
import { roleRoutes } from '../../routes/roleRoutes';
import { EditProfile, Login, QuickNote } from '@lib/lazy';
import { ConfirmDialog, Loading } from '@components/Common';
import { logout } from '@lib/api/apiUsers';
import { JwtManager } from '@lib/jwtManager';

// -----------------------------------------------------------------------------

export default function Navbar(): React.JSX.Element {
  const { role, setRole } = useAuth();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const navigate = useNavigate();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [prevScreenSize, setPrevScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };

    if (mobileMenuOpen || userMenuOpen || !sidebarCollapsed) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen, userMenuOpen, sidebarCollapsed, setSidebarCollapsed]);

  // Auto-collapse sidebar when transitioning from desktop to tablet
  useEffect(() => {
    const getScreenSize = (width: number): 'mobile' | 'tablet' | 'desktop' => {
      if (width < 768) return 'mobile';
      if (width < 1280) return 'tablet';
      return 'desktop';
    };

    const handleResize = () => {
      const width = window.innerWidth;
      const currentScreenSize = getScreenSize(width);
      
      // Auto-collapse when transitioning FROM desktop TO tablet
      if (prevScreenSize === 'desktop' && currentScreenSize === 'tablet') {
        setSidebarCollapsed(true);
      }
      // Auto-expand when transitioning TO desktop
      else if (currentScreenSize === 'desktop') {
        setSidebarCollapsed(false);
      }
      
      setPrevScreenSize(currentScreenSize);
    };

    window.addEventListener('resize', handleResize);
    // Set initial screen size
    const initialWidth = window.innerWidth;
    setPrevScreenSize(getScreenSize(initialWidth));
    if (getScreenSize(initialWidth) === 'tablet') {
      setSidebarCollapsed(true);
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [prevScreenSize, setSidebarCollapsed]);



  const toggleDropdown = (label: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
    setUserMenuOpen(false);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    const jwtManager = new JwtManager();
    jwtManager.logOut();
    setIsLoggingOut(false);
    setRole(null);
    setShowLogoutConfirm(false);
    setMobileMenuOpen(false);
  };

  return (
    <nav>
      {/* Top bar */}
      <div className='fixed top-0 left-0 w-full h-12 bg-gray-100 border-b border-gray-300 flex items-center justify-between px-4 z-50'>
        {/* App title with icon */}
        <button 
          onClick={() => navigate('/')}
          className='flex items-center space-x-2 font-bold text-lg hover:bg-gray-200 px-2 py-1 rounded transition-colors'
        >
          <img src={AppIcon} alt='App Icon' className='w-8 h-8' />
          <span>Connect{environment !== 'prod' ? ` (${environment})` : ''}</span>
        </button>

        {/* Top-right login/user menu */}
        <div className='flex items-center space-x-2'>
          {role && (
            <div className='relative group'>
              <button
                onClick={() => setQuickNoteOpen(true)}
                className='flex items-center px-2 py-1 rounded hover:bg-gray-200'
                aria-label='Quick Note'
              >
                <NotebookPen size={20} />
              </button>
              <div className='absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 text-xs text-black bg-white border border-black rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-500 pointer-events-none whitespace-nowrap'>
                Add a quick note
              </div>
            </div>
          )}
          {role ? (
            <div className='relative' ref={userMenuRef}>
              <div className='relative group'>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className='flex items-center px-2 py-1 rounded hover:bg-gray-200'
                  aria-label='User'
                >
                  <User size={20} />
                </button>
                <div className='absolute top-full right-0 mt-2 px-2 py-1 text-xs text-black bg-white border border-black rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-500 pointer-events-none whitespace-nowrap'>
                  Edit user profile and logout
                </div>
              </div>
              {userMenuOpen && (
                <div className='absolute right-0 mt-2 w-36 bg-white border rounded shadow-lg z-50'>
                  <button
                    className='w-full text-left px-4 py-2 hover:bg-gray-100'
                    onClick={() => {
                      setProfileOpen(true);
                      setUserMenuOpen(false);
                    }}
                  >
                    Profile
                  </button>
                  <button
                    className='w-full text-left px-4 py-2 hover:bg-gray-100'
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className='rounded-md border border-transparent px-4 py-2 font-medium text-indigo-600 bg-gray-100 hover:bg-gray-200 transition'
            >
              Login
            </button>
          )}

          {/* Sidebar toggle for tablet and Mobile burger / X icon */}
          {role && (
            <>
              <button
                className='md:hidden ml-2 transition-transform duration-200'
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label='Toggle mobile menu'
              >
                <div className={`transition-transform duration-200 ${mobileMenuOpen ? 'rotate-90' : ''}`}>
                  {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sidebar toggle for tablet mode */}
      {role && (
        <>
          <button
            className='hidden md:block xl:hidden fixed top-12 left-0 z-40 bg-gray-100 border-r border-b border-gray-300 p-1 hover:bg-gray-200 transition-colors group'
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label='Toggle sidebar'
            onMouseEnter={(e) => {
              const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
              if (tooltip) tooltip.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
              if (tooltip) tooltip.style.opacity = '0';
            }}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <div 
            className='hidden md:block xl:hidden fixed top-12 left-8 z-50 px-2 py-1 text-xs text-black bg-white border border-black rounded opacity-0 transition-opacity duration-200 pointer-events-none whitespace-nowrap'
            style={{ transitionDelay: '500ms' }}
          >
            {sidebarCollapsed ? 'Show menu' : 'Hide menu'}
          </div>
        </>
      )}

      {/* Left-side vertical menu (desktop and tablet) */}
      {role && (
        <aside ref={sidebarRef} className={`hidden md:block fixed top-12 left-0 h-[calc(100%-3rem)] w-56 bg-gray-50 border-r border-gray-300 overflow-auto pt-4 transition-transform duration-300 z-30 ${
          sidebarCollapsed ? 'xl:translate-x-0 -translate-x-full' : 'translate-x-0'
        }`} role='navigation' aria-label='Main navigation'>
          {roleRoutes[role].map((item, index) => (
            <div key={item.path}>
              {index > 0 && <hr className='mx-2 my-2 border-gray-300' />}
              <div className='px-2'>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleDropdown(item.label)}
                    className='flex justify-between w-full px-3 py-2 hover:bg-gray-200 rounded'
                  >
                    <span>{item.label}</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${
                        openDropdowns.has(item.label) ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openDropdowns.has(item.label) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `block px-6 py-2 rounded hover:bg-gray-100 ${
                            isActive ? 'bg-indigo-100 font-semibold' : ''
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                </>
              ) : (
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded hover:bg-gray-200 ${
                      isActive ? 'bg-indigo-100 font-semibold' : ''
                    }`
                  }

                >
                  {item.label}
                </NavLink>
              )}
              </div>
            </div>
          ))}
        </aside>
      )}

      {/* QuickNote Modal */}
      {role && (
        <Suspense fallback={<Loading />}>
          <QuickNote isOpen={quickNoteOpen} onClose={() => setQuickNoteOpen(false)} />
        </Suspense>
      )}

      {/* Mobile menu dropdown */}
      {role && mobileMenuOpen && (
        <aside ref={mobileMenuRef} className='md:hidden fixed top-12 left-0 w-full bg-gray-50 border-b border-gray-300 pt-4 pb-4 z-40' role='navigation' aria-label='Mobile navigation'>
          {roleRoutes[role].map((item, index) => (
            <div key={item.path}>
              {index > 0 && <hr className='mx-4 my-2 border-gray-300' />}
              <div className='px-4'>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleDropdown(item.label)}
                    className='flex justify-between w-full px-3 py-2 hover:bg-gray-200 rounded'
                  >
                    <span>{item.label}</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${
                        openDropdowns.has(item.label) ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openDropdowns.has(item.label) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `block px-6 py-2 rounded hover:bg-gray-100 ${
                            isActive ? 'bg-indigo-100 font-semibold' : ''
                          }`
                        }
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                </>
              ) : (
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded hover:bg-gray-200 ${
                      isActive ? 'bg-indigo-100 font-semibold' : ''
                    }`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              )}
              </div>
            </div>
          ))}
        </aside>
      )}
      
      {role && (
        <Suspense fallback={<Loading />}>
          <EditProfile
            isOpen={profileOpen}
            onClose={() => setProfileOpen(false)}
          />
        </Suspense>
      )}
      
      <Suspense fallback={<Loading />}>
        <Login
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
        />
      </Suspense>
      
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title='Logout Confirmation'
        message='Do you want to logout? Note that this will also log you out of any other devices to which you are currently logged in.'
      />
      
      {isLoggingOut && <Loading />}
    </nav>
  );
};
// -----------------------------------------------------------------------------
// End
// -----------------------------------------------------------------------------
