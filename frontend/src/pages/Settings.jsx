import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Settings() {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure? This cannot be undone.')) return;
    if (!window.confirm('All your data will be permanently deleted. Continue?')) return;
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
              <button className="w-full flex items-center justify-between p-4 text-sm hover:bg-dark-800/50 transition-colors rounded-xl">
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
                <span className="text-sm">Private Account</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
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
    </div>
  );
}
