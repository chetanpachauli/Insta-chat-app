import React, { useState, useEffect } from 'react';

export default function PushPermission() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      setShow(true);
    }
  }, []);

  const handleEnable = async () => {
    try {
      const result = await Notification.requestPermission();
      console.log('Notification permission result:', result);
      if (result === 'granted') {
        setShow(false);
      }
    } catch (e) {
      console.error('Failed to request notification permission:', e);
    }
  };

  if (!show) return null;

  return (
    <div className="p-3 border-t border-dark-700/50">
      <div className="rounded-xl bg-dark-800/80 border border-dark-700/50 p-3 backdrop-blur-sm animate-fade-in">
        <p className="text-xs text-dark-300 mb-2">Enable notifications to stay connected</p>
        <button
          onClick={handleEnable}
          className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          Enable
        </button>
      </div>
    </div>
  );
}
