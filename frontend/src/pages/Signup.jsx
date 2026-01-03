import React, { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {AuthContext} from '../context/AuthContext'

export default function Signup(){
  const { signup } = useContext(AuthContext)
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', bio: '' })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const onChange = (e) => setForm(f=>({ ...f, [e.target.name]: e.target.value }))

  async function uploadToCloudinary(file){
    const url = import.meta.env.VITE_CLOUDINARY_URL
    if (!url) throw new Error('Missing Cloudinary URL')
    const fd = new FormData()
    fd.append('file', file)
    const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || ''
    if (preset) fd.append('upload_preset', preset)
    const res = await fetch(url, { method: 'POST', body: fd })
    const data = await res.json()
    return data.secure_url || data.url
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try{
      let profilePic = ''
      if (file) profilePic = await uploadToCloudinary(file)
      await signup({ ...form, profilePic })
      navigate('/')
    }catch(err){
      setError(err.message || 'Signup failed')
    }finally{ setLoading(false) }
  }

  return (
    <div className="min-h-screen flex bg-zinc-950">
      {/* Left visual - hidden on small screens */}
      <div className="hidden md:flex w-1/2 items-center justify-center p-10">
        <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
          <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-purple-700 via-pink-600 to-orange-400"></div>
          <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-600 to-purple-500"></div>
          <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-pink-700 via-red-600 to-yellow-400"></div>
          <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-cyan-700 via-sky-600 to-indigo-500"></div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg p-8 shadow-sm">
          <h2 className="text-3xl font-semibold text-white mb-4 text-center">Create an account</h2>
          {error && <div className="text-sm text-red-500 mb-3">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input name="username" value={form.username} onChange={onChange} placeholder="Username" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-gray-100 placeholder-gray-400" />
            <input name="email" value={form.email} onChange={onChange} placeholder="Email" type="email" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-gray-100 placeholder-gray-400" />
            <input name="password" value={form.password} onChange={onChange} placeholder="Password" type="password" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-gray-100 placeholder-gray-400" />
            <textarea name="bio" value={form.bio} onChange={onChange} placeholder="Bio (optional)" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-gray-100 placeholder-gray-400" />

            <label className="flex items-center gap-3 text-sm text-gray-200">
              <span>Profile picture</span>
              <input type="file" accept="image/*" onChange={(e)=>setFile(e.target.files?.[0]||null)} className="text-sm text-gray-400" />
            </label>

            <button type="submit" disabled={loading} className="w-full px-4 py-2 rounded text-white font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 shadow-md flex items-center justify-center gap-2">
              {loading ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
              ) : 'Sign up'}
            </button>
          </form>

          <div className="text-sm text-center text-zinc-400 mt-6">Have an account? <Link to="/login" className="text-white font-semibold">Log in</Link></div>
        </div>
      </div>
    </div>
  )
}
