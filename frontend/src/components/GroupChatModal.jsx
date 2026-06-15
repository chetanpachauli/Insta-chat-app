import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';

export default function GroupChatModal({ isOpen, onClose, onSuccess }) {
  const { user } = useContext(AuthContext) || {};
  const [groupName, setGroupName] = useState('');
  const [groupPic, setGroupPic] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/messages/users/${user.id}`);
        const allUsers = res.data || [];
        setUsers(allUsers.filter(u => String(u._id || u.id) !== String(user.id)));
      } catch (e) {
        console.error('Failed to fetch users:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [isOpen, user?.id]);

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    setCreating(true);
    try {
      await axios.post('/api/conversations', {
        participants: [user?.id, ...selectedUsers],
        isGroup: true,
        groupName: groupName.trim(),
      });
      onSuccess?.();
      handleClose();
    } catch (e) {
      console.error('Failed to create group:', e);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setGroupName('');
    setGroupPic(null);
    setSelectedUsers([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-dark-700/50">
          <h2 className="text-lg font-bold">Create Group</h2>
          <button onClick={handleClose} className="btn-icon text-dark-400 hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <input
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all text-sm"
            maxLength={50}
          />

          <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-dark-900 border border-dark-700/50 cursor-pointer hover:border-dark-600 transition-colors">
            <PhotoIcon className="w-5 h-5 text-dark-400" />
            <span className="text-sm text-dark-400">{groupPic ? groupPic.name : 'Add group photo'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                if (e.target.files[0]) setGroupPic(e.target.files[0]);
              }}
            />
          </label>

          <div>
            <p className="text-sm text-dark-400 mb-2">Add members ({selectedUsers.length} selected)</p>
            {loading ? (
              <div className="text-center text-dark-400 text-sm py-8">
                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading users...
              </div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {users.map(u => {
                  const uid = String(u._id || u.id);
                  const isSelected = selectedUsers.includes(uid);
                  return (
                    <label
                      key={uid}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        isSelected ? 'bg-brand-500/10 border border-brand-500/20' : 'hover:bg-dark-900 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUser(uid)}
                        className="w-4 h-4 rounded accent-brand-500"
                      />
                      <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-semibold">
                        {(u.username || 'U')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{u.username}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-dark-700/50">
          <button
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedUsers.length === 0 || creating}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Group'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
