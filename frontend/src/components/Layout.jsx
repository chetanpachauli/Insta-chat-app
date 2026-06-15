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
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { AuthContext } from '../context/AuthContext';
import Suggestions from './Suggestions';
import PushPermission from './PushPermission';

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    setMatches(media.matches);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  return matches;
};

export default function Layout({ children }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const { user, logout } = auth || {};

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const isActive = (paths) => {
    if (!paths) return false;
    return paths.some(path => {
      if (!path) return false;
      if (path === '/') return location.pathname === '/';
      return location.pathname.startsWith(path);
    });
  };

  const navItems = React.useMemo(() => {
    const items = [
      { icon: () => HomeOutline, path: '/', label: 'Home', paths: ['/'] },
      { icon: () => SearchOutline, path: '/explore', label: 'Explore', paths: ['/explore', '/search'] },
      { icon: () => PlusOutline, path: '/create', label: 'Create', paths: ['/create'] },
      { icon: () => VideoCameraOutline, path: '/reels', label: 'Reels', paths: ['/reels'] },
      { icon: () => ChatOutline, path: '/messages', label: 'Messages', paths: ['/messages'] },
      { icon: () => HeartOutline, path: '/notifications', label: 'Activity', paths: ['/notifications'] },
    ];
    if (user?.username) {
      items.push({
        icon: () => UserOutline,
        path: `/profile/${user.username}`,
        label: 'Profile',
        paths: [`/profile/${user.username}`],
      });
    }
    return items;
  }, [user?.username]);

  const hideLayout = location.pathname === '/login' || location.pathname === '/signup';

  if (hideLayout) return <>{children}</>;

  return (
    <div className={`flex min-h-screen ${theme === 'light' ? 'bg-white text-gray-900' : 'bg-dark-900 text-white'}`}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className={`fixed left-0 top-0 h-screen w-72 border-r z-40 flex flex-col ${
          theme === 'light' ? 'bg-white border-gray-200' : 'bg-dark-900 border-dark-700/50'
        }`}>
          <div className="p-6 pb-4">
            <h1 className="text-2xl font-bold bg-gradient-brand bg-clip-text text-transparent">
              Instagram
            </h1>
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin">
            {navItems.map((item) => {
              const active = isActive(item.paths);
              const Icon = item.icon(active);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                    active
                      ? 'bg-brand-500/10 text-brand-400 font-medium'
                      : theme === 'light'
                        ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        : 'text-dark-300 hover:text-white hover:bg-dark-800/50'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Suggestions */}
          <div className={`border-t ${theme === 'light' ? 'border-gray-200' : 'border-dark-700/50'}`}>
            <Suggestions />
          </div>

          {/* Theme Toggle + Logout */}
          <div className={`p-3 border-t ${theme === 'light' ? 'border-gray-200' : 'border-dark-700/50'} space-y-1`}>
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl w-full transition-all duration-200 ${
                theme === 'light' ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
              }`}
            >
              {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
            {user && (
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl w-full transition-all duration-200 ${
                  theme === 'light' ? 'text-gray-600 hover:text-red-500 hover:bg-gray-100' : 'text-dark-400 hover:text-red-400 hover:bg-dark-800/50'
                }`}
              >
                <ArrowRightOnRectangleIcon className="w-6 h-6" />
                <span>Log out</span>
              </button>
            )}
          </div>
          <PushPermission />
        </aside>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen ${!isMobile ? 'ml-72' : ''}`}>
        <main className="flex-1">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <nav className={`fixed bottom-0 left-0 right-0 backdrop-blur-md border-t z-50 safe-area-bottom ${
            theme === 'light' ? 'bg-white/95 border-gray-200' : 'bg-dark-900/95 border-dark-700/50'
          }`}>
            <div className="flex items-center justify-around py-2 px-2">
              {navItems.slice(0, 5).map((item) => {
                const active = isActive(item.paths);
                const Icon = item.icon(active);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`p-3 rounded-xl transition-all duration-200 ${
                      active ? 'text-brand-400' : theme === 'light' ? 'text-gray-500' : 'text-dark-400'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </NavLink>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
