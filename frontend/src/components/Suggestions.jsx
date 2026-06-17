import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserPlusIcon } from '@heroicons/react/24/outline';

export default function Suggestions() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/profile/suggestions/all', { withCredentials: true });
        setUsers(res.data || []);
      } catch (e) { /* ignore */ }
    })();
  }, []);

  if (users.length === 0) return null;

  const handleFollow = async (userId) => {
    try {
      await axios.post(`/api/profile/${userId}/follow`, {}, { withCredentials: true });
      setUsers(p => p.filter(u => u._id !== userId));
    } catch (e) { /* ignore */ }
  };

  return (
    <div className="px-4 py-3">
      <h3 className="text-sm font-semibold text-dark-400 mb-3">Suggestions for you</h3>
      <div className="space-y-3">
        {users.slice(0, 5).map(u => (
          <div key={u._id} className="flex items-center gap-3">
            <img
              src={u.profilePic || '/default-avatar.png'}
              className="w-8 h-8 rounded-full object-cover cursor-pointer"
              alt=""
              loading="lazy"
              onClick={() => navigate(`/profile/${u.username}`)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate cursor-pointer hover:underline" onClick={() => navigate(`/profile/${u.username}`)}>
                {u.username}
              </p>
              <p className="text-xs text-dark-500 truncate">{u.name}</p>
            </div>
            <button onClick={() => handleFollow(u._id)} className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1">
              <UserPlusIcon className="w-3.5 h-3.5" /> Follow
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
