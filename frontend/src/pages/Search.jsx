import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Avatar from '../components/Avatar'
import { Link } from 'react-router-dom'

export default function Search(){
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])

  useEffect(()=>{
    if (!q) return setResults([])
    const t = setTimeout(async ()=>{
      try{
        const res = await axios.get(`/api/auth/search?query=${encodeURIComponent(q)}`)
        setResults(res.data || [])
      }catch(e){ setResults([]) }
    }, 300)
    return () => clearTimeout(t)
  },[q])

  return (
    <div className="min-h-screen bg-zinc-950 text-gray-100 p-4 pb-16 md:pb-0">
      <div className="max-w-[600px] mx-auto">
        <div className="mb-4">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search users" className="w-full px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 focus:outline-none" />
        </div>
        <div className="space-y-3">
          {results.length === 0 && q ? (
            <div className="text-center text-gray-400 p-6">User not found</div>
          ) : (
            results.map(u => (
              <Link key={u.id} to={`/profile/${u.id}`} className="flex items-center gap-3 p-2 rounded hover:bg-zinc-900">
                <Avatar user={u} size={40} />
                <div>
                  <div className="font-semibold">{u.username}</div>
                  <div className="text-sm text-gray-400">{u.bio}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
