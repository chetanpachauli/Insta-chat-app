import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Search, Compass, MessageSquare, User } from 'lucide-react'

export default function BottomNav({ user }){
  const loc = useLocation()
  const items = [
    { to: '/feed', icon: <Home className="w-6 h-6" />, key: 'feed' },
    { to: '/search', icon: <Search className="w-6 h-6" />, key: 'search' },
    { to: '/create', icon: <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>, key: 'create' },
    { to: '/reels', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M15 10l4.553-2.276A2 2 0 0122 9.618V14.382a2 2 0 01-2.447 1.894L15 14v-4z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, key: 'reels' },
    { to: user ? `/profile/${user.id}` : '/profile', icon: <User className="w-6 h-6" />, key: 'profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-zinc-950 border-t border-zinc-800 z-50">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-2">
        {items.map(it=> (
          <Link key={it.key} to={it.to} className={`flex-1 flex items-center justify-center ${loc.pathname === it.to ? 'text-white' : 'text-gray-400'}`}>
            {it.icon}
          </Link>
        ))}
      </div>
    </nav>
  )
}
