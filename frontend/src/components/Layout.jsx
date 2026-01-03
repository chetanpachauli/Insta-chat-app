import React, { useContext, useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  HomeIcon as HomeOutline,
  MagnifyingGlassIcon as SearchOutline,
  PlusCircleIcon as PlusOutline,
  HeartIcon as HeartOutline,
  UserCircleIcon as UserOutline,
  FilmIcon as VideoCameraOutline,
  ChatBubbleLeftRightIcon as ChatOutline,
  HomeIcon as HomeSolid,
  MagnifyingGlassIcon as SearchSolid,
  PlusCircleIcon as PlusSolid,
  HeartIcon as HeartSolid,
  UserCircleIcon as UserSolid,
  FilmIcon as VideoCameraSolid,
  ChatBubbleLeftRightIcon as ChatSolid
} from '@heroicons/react/24/outline';
import { useMediaQuery } from 'react-responsive';
import { AuthContext } from '../context/AuthContext';

export default function Layout({ children }) {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const location = useLocation();
  const auth = useContext(AuthContext);
  
  // Show loading state if auth context is not available yet
  if (!auth) {
    return <div className="bg-black h-screen flex items-center justify-center text-white">Loading Layout...</div>;
  }

  // Destructure user only after confirming auth exists
  const { user } = auth;
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const navItems = React.useMemo(() => {
    const items = [
      { 
        icon: (active) => active ? HomeSolid : HomeOutline, 
        path: '/', 
        label: 'Home', 
        activePaths: ['/'] 
      },
      { 
        icon: (active) => active ? SearchSolid : SearchOutline, 
        path: '/explore', 
        label: 'Search', 
        activePaths: ['/explore', '/search'] 
      },
      { 
        icon: (active) => active ? PlusSolid : PlusOutline, 
        path: '/create', 
        label: 'Create', 
        activePaths: ['/create'] 
      },
      { 
        icon: (active) => active ? VideoCameraSolid : VideoCameraOutline, 
        path: '/reels', 
        label: 'Reels', 
        activePaths: ['/reels'] 
      },
      { 
        icon: (active) => active ? ChatSolid : ChatOutline, 
        path: '/messages', 
        label: 'Messages', 
        activePaths: ['/messages', '/chat'] 
      },
      { 
        icon: (active) => active ? HeartSolid : HeartOutline, 
        path: '/notifications', 
        label: 'Notifications', 
        activePaths: ['/notifications'], 
        showBadge: true 
      }
    ];

    if (user?.username) {
      items.push(
        {
          icon: (active) => active ? UserSolid : UserOutline,
          path: `/profile/${user.username}`,
          label: 'Profile',
          activePaths: [`/profile/${user.username}`]
        },
        {
          icon: () => (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          ),
          label: 'Logout',
          isLogout: true,
          onClick: async (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            try {
              // Clear local storage first to prevent auto-login
              localStorage.removeItem('user');
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              
              // Then call the logout API
              await auth.logout();
              
              // Force a full page reload to reset all states
              window.location.href = '/login';
              window.location.reload();
            } catch (err) {
              console.error('Logout failed:', err);
              // Still redirect even if API call fails
              window.location.href = '/login';
              window.location.reload();
            }
          },
          className: 'mt-auto text-red-500 hover:text-red-400'
        }
      );
    } else {
      items.push({
        icon: (active) => active ? UserSolid : UserOutline,
        path: '/login',
        label: 'Login',
        activePaths: ['/login', '/signup']
      });
    }
    return items;
  }, [user?.username]);
  
  const isActive = (paths) => {
    if (!paths || !Array.isArray(paths)) return false;
    return paths.some(path => {
      if (!path) return false;
      return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    });
  };

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Sidebar */}
      {!isMobile && (
        <div className="w-64 border-r border-gray-800 bg-black pb-16">
          <div className="p-4">
            <h1 className="text-2xl font-bold mb-8">Instagram</h1>
            <nav className="space-y-1">
              {navItems.map((item, index) => {
                const IconComponent = item.icon?.(isActive(item.activePaths)) || item.icon;
                const isActiveItem = isActive(item.activePaths || []);
                
                return (
                  <NavLink
                    key={index}
                    to={!item.isLogout ? item.path : '#'}
                    className={`flex items-center space-x-4 w-full p-3 rounded-lg transition-all duration-200 ${
                      isActiveItem ? 'text-[#3b82f6] bg-gray-900' : 'text-white/80 hover:text-white hover:bg-gray-900'
                    } ${item.className || ''}`}
                    onClick={item.onClick}
                  >
                    <div className="relative">
                      {React.isValidElement(IconComponent) ? IconComponent : 
                        (typeof IconComponent === 'function' ? <IconComponent /> : null)}
                      {item.showBadge && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col h-full pb-16 ${!isMobile ? 'ml-64' : ''}`}>
        {/* Mobile Header */}
        {isMobile && (
          <header className="flex justify-between items-center p-4 border-b border-gray-800 bg-black/80 backdrop-blur-md sticky top-0 z-30">
            <h1 className="text-xl font-bold text-white">Instagram</h1>
            <NavLink to="/messages">
              <ChatOutline className="w-6 h-6 text-white flex-shrink-0" />
            </NavLink>
          </header>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 flex justify-around p-3 border-t border-gray-800 bg-black/95 z-30">
            {navItems.slice(0, 5).map((item) => {
              const active = isActive(item.activePaths);
              const IconComponent = item.icon(active);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`p-2 ${active ? 'text-blue-500' : 'text-gray-400'}`}
                >
                  {React.isValidElement(IconComponent) ? IconComponent : 
                    (typeof IconComponent === 'function' ? <IconComponent className="w-6 h-6" /> : null)}
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}