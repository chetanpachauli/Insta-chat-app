import { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { GoogleLogin } from '@react-oauth/google'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, googleLogin } = useContext(AuthContext)
  const navigate = useNavigate()

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

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-center mb-2 bg-gradient-brand bg-clip-text text-transparent">
              Welcome back
            </h2>
            <p className="text-dark-400 text-sm text-center mb-6">Log in to your account</p>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email"
                type="email"
                className="input-field"
                required
              />
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Password"
                type="password"
                className="input-field"
                required
              />
              <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2">
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Log in'}
              </button>
            </form>

            {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <div className="mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex-1 h-px bg-dark-600" />
                  <span className="text-dark-400 text-xs">or</span>
                  <span className="flex-1 h-px bg-dark-600" />
                </div>
                <GoogleLogin
                  onSuccess={async ({ credential }) => {
                    const result = await googleLogin(credential)
                    if (!result.success) setError(result.error || 'Google login failed')
                  }}
                  onError={() => setError('Google login failed')}
                  theme="filled_black"
                  size="large"
                  text="signin_with"
                />
              </div>
            )}

            <div className="text-sm text-center text-dark-400 mt-6">
              Don't have an account?{' '}
              <Link to="/signup" className="text-brand-400 font-semibold hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
