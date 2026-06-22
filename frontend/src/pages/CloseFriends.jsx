import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, CheckIcon, UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../utils/axiosConfig';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';

export default function CloseFriends() {
  const [currentUser, setCurrentUser] = useState(null);
  const [following, setFollowing] = useState([]);
  const [closeFriends, setCloseFriends] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await api.get('/profile/me');
        setCurrentUser(userRes.data);
        setCloseFriends((userRes.data.closeFriends || []).map(x => String(x._id || x)));
        setFollowing(userRes.data.following || []);
      } catch (err) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleCloseFriend = async (userId) => {
    setToggling(userId);
    try {
      await api.post(`/profile/${userId}/close-friend`);
      setCloseFriends(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
      toast.success('Updated close friends');
    } catch (err) {
      toast.error('Failed to update');
    } finally {
      setToggling(null);
    }
  };

  const filtered = following.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-4 p-4 border-b border-dark-700/50">
          <Link to="/settings" className="btn-icon text-dark-300">
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">Close Friends</h1>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-800 text-white rounded-xl py-2.5 pl-10 pr-4 text-sm placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-dark-400">
              <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{search ? 'No results found' : 'You are not following anyone yet'}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((u) => {
                const isClose = closeFriends.includes(u._id);
                return (
                  <div key={u._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-800/50 transition-colors">
                    <Avatar user={u} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.username}</p>
                      {u.name && <p className="text-xs text-dark-400 truncate">{u.name}</p>}
                    </div>
                    <button
                      onClick={() => toggleCloseFriend(u._id)}
                      disabled={toggling === u._id}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isClose
                          ? 'bg-brand-500 text-white'
                          : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                      }`}
                    >
                      {toggling === u._id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
