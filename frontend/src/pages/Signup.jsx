import React, { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

export default function Signup() {
  const { signup } = useContext(AuthContext)
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', bio: '' })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  async function uploadToCloudinary(file) {
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
    try {
      let profilePic = ''
      if (file) profilePic = await uploadToCloudinary(file)
      await signup({ ...form, profilePic })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex bg-dark-900">
      {/* Left visual */}
      <div className="hidden md:flex w-1/2 items-center justify-center p-10 bg-dot-pattern">
        <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
          {[
            'from-brand-500 via-accent-pink to-accent-orange',
            'from-blue-600 via-indigo-600 to-brand-500',
            'from-accent-pink via-red-500 to-accent-orange',
            'from-cyan-600 via-sky-500 to-indigo-600',
          ].map((gradient, i) => (
            <div
              key={i}
              className={`aspect-square rounded-2xl bg-gradient-to-br ${gradient} opacity-80 hover:opacity-100 transition-opacity duration-300 animate-scale-in`}
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-center mb-2 bg-gradient-brand bg-clip-text text-transparent">
              Create account
            </h2>
            <p className="text-dark-400 text-sm text-center mb-6">Join the community</p>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <input name="username" value={form.username} onChange={onChange} placeholder="Username" className="input-field" />
              <input name="email" value={form.email} onChange={onChange} placeholder="Email" type="email" className="input-field" />
              <input name="password" value={form.password} onChange={onChange} placeholder="Password" type="password" className="input-field" />
              <textarea name="bio" value={form.bio} onChange={onChange} placeholder="Bio (optional)" className="input-field" rows={2} />

              <label className="flex items-center gap-3 text-sm text-dark-300">
                <span>Profile picture</span>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm text-dark-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-dark-700 file:text-white hover:file:bg-dark-600" />
              </label>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Sign up'}
              </button>
            </form>

            <div className="text-sm text-center text-dark-400 mt-6">
              Have an account?{' '}
              <Link to="/login" className="text-brand-400 font-semibold hover:underline">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
