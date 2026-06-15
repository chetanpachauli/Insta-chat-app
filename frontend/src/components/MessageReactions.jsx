import React, { useState } from 'react';
import axios from 'axios';

const EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '😡'];

export default function MessageReactions({ messageId, reactions = [], currentUserId, onReact }) {
  const [showPicker, setShowPicker] = useState(false);

  const handleReact = async (emoji) => {
    try {
      await axios.post(`/api/messages/react/${messageId}`, { emoji });
      onReact?.();
      setShowPicker(false);
    } catch (e) {
      console.error('Failed to react:', e);
    }
  };

  const grouped = reactions.reduce((acc, r) => {
    const existing = acc.find(e => e.emoji === r.emoji);
    if (existing) {
      existing.count++;
      existing.users.push(r.userId);
    } else {
      acc.push({ emoji: r.emoji, count: 1, users: [r.userId] });
    }
    return acc;
  }, []);

  const myReactions = reactions.filter(r => String(r.userId) === String(currentUserId)).map(r => r.emoji);

  return (
    <div className="relative flex items-center gap-1 mt-1.5 flex-wrap">
      {grouped.map(({ emoji, count, users }) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className={`text-xs flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border transition-all ${
            users.some(id => String(id) === String(currentUserId))
              ? 'bg-brand-500/20 border-brand-500/30'
              : 'bg-dark-800/30 border-dark-700/30 hover:bg-dark-700/50'
          }`}
        >
          <span className="text-sm leading-none">{emoji}</span>
          {count > 1 && <span className="text-[10px] text-dark-400 font-medium">{count}</span>}
        </button>
      ))}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-xs w-5 h-5 flex items-center justify-center rounded-full bg-dark-800/30 border border-dark-700/30 hover:bg-dark-700/50 transition-colors text-dark-400 hover:text-white"
        >
          +
        </button>
        {showPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
            <div className="absolute bottom-full left-0 mb-2 bg-dark-800 border border-dark-700 rounded-xl p-2 flex gap-1 shadow-xl z-50">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className={`hover:scale-125 transition-transform text-lg leading-none ${
                    myReactions.includes(emoji) ? 'scale-110' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
