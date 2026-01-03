import React, { useEffect, useState, useRef, useContext } from 'react'
import axios from 'axios'
import { Bell } from 'lucide-react'
import ChatContext from '../context/ChatContext'
import Avatar from './Avatar'

export default function NotificationBell(){
  const [notes, setNotes] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { notifications, markNotificationsRead } = useContext(ChatContext)

  useEffect(()=>{
    (async ()=>{
      try{ const res = await axios.get('/api/notifications'); setNotes(res.data || []) }catch(e){}
    })()
  },[])

  // merge with real-time notifications
  useEffect(()=>{
    if (notifications && notifications.length) setNotes((prev) => {
      // prepend new notifs, avoid dupes
      const ids = new Set(prev.map(p=>p._id))
      const merged = [...notifications.filter(n=>!ids.has(n._id)), ...prev]
      return merged
    })
  },[notifications])

  useEffect(()=>{
    const onDoc = (e) => { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  },[open])

  return (
    <div ref={ref} className="relative">
      <button onClick={()=>{ setOpen(s=>!s); if (!open) markNotificationsRead().then(()=> setNotes(p => p.map(x => ({ ...x, read: true }))).catch(()=>{}) ) }} className="p-2 rounded hover:bg-zinc-900"><Bell className="w-5 h-5 text-gray-300" /></button>
      {notes.length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full text-xs px-1">{notes.filter(n=>!n.read).length}</span>}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded shadow-lg z-50 p-2">
          <div className="text-sm font-semibold text-white mb-2">Activity</div>
          <div className="max-h-64 overflow-auto space-y-2">
            {notes.map(n => (
              <div key={n._id} className="flex items-start gap-2 p-2 rounded hover:bg-zinc-800">
              <div className="w-8 h-8">
                <Avatar user={n.from} size={32} />
              </div>
                <div className="text-sm text-gray-300">{n.type === 'like' ? `${n.from.username} liked your post` : n.type === 'comment' ? `${n.from.username} commented on your post` : `${n.from.username} followed you`}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
