import React, { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { GoogleLogin } from '@react-oauth/google'
import { motion } from 'framer-motion'
import ThreeBackground from '../components/ThreeBackground'

const ALLOWED_GOOGLE_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://insta-chat-app-five.vercel.app'
];

export default function Signup() {
  const { signup, googleLogin } = useContext(AuthContext)
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', bio: '' })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const googleAllowed = import.meta.env.VITE_GOOGLE_CLIENT_ID && 
    ALLOWED_GOOGLE_ORIGINS.includes(window.location.origin);
  const hasClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const currentOrigin = window.location.origin;

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
    <div className="min-h-screen flex bg-dark-900 relative overflow-hidden">
      <ThreeBackground />

      {/* Left visual */}
      <div className="hidden md:flex w-1/2 items-center justify-center p-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 gap-3 w-full max-w-lg"
        >
          {[
            'from-brand-500 via-accent-pink to-accent-orange',
            'from-blue-600 via-indigo-600 to-brand-500',
            'from-accent-pink via-red-500 to-accent-orange',
            'from-cyan-600 via-sky-500 to-indigo-600',
          ].map((gradient, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 0.8, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              whileHover={{ opacity: 1, scale: 1.03 }}
              className={`aspect-square rounded-2xl bg-gradient-to-br ${gradient} transition-all duration-300`}
            />
          ))}
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          <div className="card p-8 backdrop-blur-xl bg-dark-900/70 border-dark-700/50 hover:border-brand-500/20 transition-all duration-300 relative overflow-hidden">
            <div className="absolute -inset-20 pointer-events-none blur-3xl" style={{
              background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.12) 0%, rgba(236,72,153,0.08) 40%, transparent 70%)',
            }} />
            <div className="relative z-10">
            <motion.h2
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-center mb-2 bg-gradient-brand bg-clip-text text-transparent"
            >
              Create account
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-dark-400 text-sm text-center mb-6"
            >
              Join the community
            </motion.p>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 mb-4"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { name: 'username', placeholder: 'Username', type: 'text' },
                { name: 'email', placeholder: 'Email', type: 'email' },
                { name: 'password', placeholder: 'Password', type: 'password' },
              ].map((field, i) => (
                <motion.div
                  key={field.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                >
                  <input
                    name={field.name}
                    value={form[field.name]}
                    onChange={onChange}
                    placeholder={field.placeholder}
                    type={field.type}
                    className="input-field"
                  />
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
              >
                <textarea name="bio" value={form.bio} onChange={onChange} placeholder="Bio (optional)" className="input-field" rows={2} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <label className="flex items-center gap-3 text-sm text-dark-300">
                  <span>Profile picture</span>
                  <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm text-dark-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-dark-700 file:text-white hover:file:bg-dark-600" />
                </label>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
                className="pt-2"
              >
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : 'Sign up'}
                </button>
              </motion.div>
            </form>

            {hasClientId ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-4"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex-1 h-px bg-dark-600" />
                  <span className="text-dark-400 text-xs">or</span>
                  <span className="flex-1 h-px bg-dark-600" />
                </div>
                {googleAllowed ? (
                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={async ({ credential }) => {
                        const result = await googleLogin(credential)
                        if (!result.success) setError(result.error || 'Google login failed')
                      }}
                      onError={() => setError('Google login blocked. Add this origin to Google Cloud Console:\n' + currentOrigin)}
                      theme="filled_black"
                      size="large"
                      text="signup_with"
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-dark-500 mb-2">Google signup requires setup:</p>
                    <p className="text-xs text-dark-400 bg-dark-800/50 rounded-lg px-3 py-2 font-mono break-all">
                      Add <span className="text-brand-400">{currentOrigin}</span> to Authorized JavaScript origins in Google Cloud Console
                    </p>
                  </div>
                )}
              </motion.div>
            ) : null}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85 }}
              className="text-sm text-center text-dark-400 mt-6"
            >
              Have an account?{' '}
              <Link to="/login" className="text-brand-400 font-semibold hover:underline">
                Log in
              </Link>
            </motion.div>
            </div>{/* end relative z-10 */}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
