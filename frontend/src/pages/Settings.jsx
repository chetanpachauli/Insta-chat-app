import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useConfirm } from '../hooks/useConfirm';

export default function Settings() {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Change Password states
  const [showCPModal, setShowCPModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('New password is required');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await axios.put('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      toast.success('Password changed successfully');
      setShowCPModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  useEffect(() => {
    axios.get('/api/auth/check').then(res => {
      if (res.data?.user?.isPrivate !== undefined) setIsPrivate(res.data.user.isPrivate);
    }).catch(() => {});
  }, []);

  const confirmDel = useConfirm();

  const handleTogglePrivacy = async () => {
    setToggling(true);
    try {
      const res = await axios.put('/api/profile/privacy/toggle');
      setIsPrivate(res.data.isPrivate);
      toast.success(res.data.isPrivate ? 'Account set to Private' : 'Account set to Public');
    } catch (e) {
      toast.error('Failed to update privacy');
    } finally {
      setToggling(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!(await confirmDel('This cannot be undone.', 'Delete Account?'))) return;
    if (!(await confirmDel('All your data will be permanently deleted. Continue?', 'Are you sure?'))) return;
    setDeleting(true);
    try {
      await axios.delete('/api/auth/delete-account');
      toast.success('Account deleted');
      localStorage.clear();
      window.location.href = '/login';
    } catch (err) {
      toast.error('Failed to delete account');
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white pb-20 md:pb-0">
      <div className="max-w-[500px] mx-auto min-h-screen">
        <div className="sticky top-0 z-10 bg-dark-900/80 backdrop-blur-md border-b border-dark-700/50 p-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="btn-icon">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>

        <div className="p-4 space-y-6">
          {/* Account */}
          <div>
            <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">Account</h2>
            <div className="card divide-y divide-dark-700/50">
              <button className="w-full flex items-center justify-between p-4 text-sm hover:bg-dark-800/50 transition-colors rounded-xl">
                <span>Edit Profile</span>
                <span className="text-dark-500">&rarr;</span>
              </button>
              <button 
                onClick={() => setShowCPModal(true)} 
                className="w-full flex items-center justify-between p-4 text-sm hover:bg-dark-800/50 transition-colors rounded-xl"
              >
                <span>Change Password</span>
                <span className="text-dark-500">&rarr;</span>
              </button>
            </div>
          </div>

          {/* Privacy */}
          <div>
            <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">Privacy</h2>
            <div className="card divide-y divide-dark-700/50">
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <span className="text-sm">Private Account</span>
                      <p className="text-xs text-dark-500 mt-0.5">{isPrivate ? 'Only followers can see your posts' : 'Everyone can see your posts'}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={isPrivate} onChange={handleTogglePrivacy} disabled={toggling} />
                      <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
                    </label>
                  </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-sm">Show Activity Status</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
                </label>
              </div>
            </div>
          </div>

          {/* Close Friends */}
          <div>
            <h2 className="text-sm font-semibold text-brand-400 uppercase tracking-wider mb-3">Close Friends</h2>
            <div className="card">
              <button
                onClick={() => navigate('/close-friends')}
                className="w-full flex items-center justify-between p-4 text-sm hover:bg-dark-800/50 transition-colors rounded-xl"
              >
                <span>Manage Close Friends</span>
                <span className="text-dark-500">&rarr;</span>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">Danger Zone</h2>
            <div className="card">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="w-full flex items-center justify-between p-4 text-sm text-red-400 hover:bg-red-500/10 transition-colors rounded-xl disabled:opacity-50"
              >
                <span>Delete Account</span>
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-dark-500">&rarr;</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showCPModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowCPModal(false)}>
          <div 
            className="bg-dark-800 border border-dark-700/60 rounded-2xl w-full max-w-[400px] overflow-hidden flex flex-col shadow-2xl animate-scale-in text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-dark-700/50 flex justify-between items-center bg-dark-900/40">
              <h3 className="font-bold text-sm tracking-wide text-brand-400">
                Change Password
              </h3>
              <button 
                onClick={() => setShowCPModal(false)} 
                className="text-dark-400 hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleChangePassword} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-300">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password (if set)"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-300">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-300">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>

              {/* Modal Footer / Buttons */}
              <div className="flex gap-2 justify-end pt-2 border-t border-dark-700/50 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCPModal(false)}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-xl text-xs font-semibold transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {changingPassword ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
