import { useState, useContext } from 'react'
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

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, googleLogin } = useContext(AuthContext)
  const navigate = useNavigate()
  const hasClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleAllowed = hasClientId && 
    ALLOWED_GOOGLE_ORIGINS.includes(window.location.origin);
  const currentOrigin = window.location.origin;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const result = await login(form)
      if (!result.success) {
        setError(result.error || 'Login failed')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-dark-900 relative overflow-hidden">
      <ThreeBackground />

      {/* Left visual - gradient cards */}
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

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          <div className="card p-6 md:p-8 backdrop-blur-xl bg-dark-900/70 border-dark-700/50 hover:border-brand-500/20 transition-all duration-300 relative overflow-hidden">
            {/* Subtle glow behind card */}
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
              Welcome back
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-dark-400 text-sm text-center mb-6"
            >
              Log in to your account
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                  type="email"
                  className="input-field"
                  required
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
                <input
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                  type="password"
                  className="input-field"
                  required
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : 'Log in'}
                </button>
              </motion.div>
            </form>

            {hasClientId ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.65 }}
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
                      text="signin_with"
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-dark-500 mb-2">Google login requires setup:</p>
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
              transition={{ delay: 0.7 }}
              className="text-sm text-center text-dark-400 mt-6"
            >
              Don't have an account?{' '}
              <Link to="/signup" className="text-brand-400 font-semibold hover:underline">
                Sign up
              </Link>
            </motion.div>
            </div>{/* end relative z-10 */}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
