import React, { useEffect, useState, useContext } from 'react';
import { Home, MessageSquare, Search, User, Compass } from 'lucide-react';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import NotificationBell from './NotificationBell';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import ChatContext from '../context/ChatContext';
import Avatar from './Avatar';

export default function Sidebar({ mobile = false }) {
  const { user, logout } = useContext(AuthContext);
  const { fetchUsers, setSelectedUser, onlineUsers } = useContext(ChatContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [remoteResults, setRemoteResults] = useState([]);

  useEffect(() => {
    if (!user) {
      setUsers([]);
      return;
    }
    (async () => {
      try {
        const list = await fetchUsers();
        // remove current user from list
        setUsers((list || []).filter(u => String(u.id) !== String(user.id)));
      } catch (err) {
        try { await logout(); } catch {}
        navigate('/login');
      }
    })();
  }, [user, fetchUsers, logout, navigate]);

  // live search: filter local list first, otherwise query remote
  useEffect(() => {
    if (!searchTerm) {
      setRemoteResults([]);
      return;
    }

    const localMatches = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));
    if (localMatches.length > 0) {
      setRemoteResults([]);
      return;
    }

    // debounce remote search
    const t = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/auth/search?query=${encodeURIComponent(searchTerm)}`);
        // exclude current user and already-known users
        const list = (res.data || []).filter(u => String(u.id) !== String(user.id));
        setRemoteResults(list);
      } catch (err) {
        // ignore errors; auth errors handled elsewhere
        setRemoteResults([]);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [searchTerm, users, user?.id]);

  const filtered = (searchTerm ? [...users, ...remoteResults] : users)
    .filter((v, i, a) => a.findIndex(x => String(x.id) === String(v.id)) === i) // unique by id
    .filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  const rootClass = mobile
    ? 'flex flex-col fixed left-0 top-0 h-screen w-64 bg-zinc-950 text-gray-100 p-3 z-50 overflow-hidden'
    : 'hidden md:flex flex-col fixed left-0 top-0 h-screen w-20 lg:w-64 bg-zinc-950 text-gray-100 p-3 z-40 overflow-hidden';

  return (
    <div className={rootClass}>
      <div className="flex flex-col h-full w-full">
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4 pt-3">
            <Link to="/feed" className="p-2 rounded hover:bg-zinc-900"><Home className="w-6 h-6" /></Link>
            <Link to="/explore" className="p-2 rounded hover:bg-zinc-900"><Compass className="w-6 h-6" /></Link>
            <button onClick={() => navigate('/')} className="p-2 rounded hover:bg-zinc-900"><MessageSquare className="w-6 h-6" /></button>
            <NotificationBell />
            <Link to={`/profile/${user?.id}`} className="p-2 rounded hover:bg-zinc-900">
              <User className="w-6 h-6" />
            </Link>
            <button 
              onClick={async () => { 
                try { 
                  await logout();
                  navigate('/login');
                } catch (err) {
                  console.error('Logout failed:', err);
                }
              }} 
              className="p-2 rounded hover:bg-zinc-900 text-red-400 hover:text-red-300"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="px-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input 
                aria-label="Search users" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Search" 
                className="w-full pl-10 pr-3 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-sm focus:outline-none" 
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 px-1 space-y-3">
          {filtered.map(u => (
            <div 
              key={u.id} 
              onClick={() => setSelectedUser(u)} 
              className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded cursor-pointer"
            >
              <div className="relative">
                <Avatar user={u} size={48} />
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${onlineUsers.includes(String(u.id)) ? 'bg-green-400 ring-2 ring-zinc-950' : 'bg-zinc-700'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{u.username}</div>
                <div className="text-xs text-gray-400 truncate">{u.bio}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto px-1 py-4 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-6"></div>
            <span className="hidden lg:inline">Switch accounts or log out</span>
          </div>
        </div>
      </div>
    </div>
  );
}
