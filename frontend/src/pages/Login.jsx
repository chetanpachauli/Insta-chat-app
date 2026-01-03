import { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

export default function Login() {
  const [form, setForm] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useContext(AuthContext)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

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
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-zinc-950">
      {/* Left visual — hidden on small screens */}
      <div className="hidden md:flex w-1/2 items-center justify-center p-10">
        <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
          <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-purple-700 via-pink-600 to-orange-400"></div>
          <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-600 to-purple-500"></div>
          <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-pink-700 via-red-600 to-yellow-400"></div>
          <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-cyan-700 via-sky-600 to-indigo-500"></div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg p-8 shadow-sm">
          <h2 className="text-3xl font-semibold text-white mb-4 text-center">Log in</h2>
          {error && <div className="text-sm text-red-500 mb-3">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              name="email" 
              value={form.email} 
              onChange={handleChange} 
              placeholder="Email" 
              type="email" 
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-gray-100 placeholder-gray-400" 
              required
            />
            <input 
              name="password" 
              value={form.password} 
              onChange={handleChange} 
              placeholder="Password" 
              type="password" 
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-gray-100 placeholder-gray-400" 
              required
            />

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full px-4 py-2 rounded text-white font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 shadow-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
              ) : 'Log in'}
            </button>
          </form>

          <div className="text-sm text-center text-zinc-400 mt-6">Don't have an account? <Link to="/signup" className="text-white font-semibold">Sign up</Link></div>
        </div>
      </div>
    </div>
  )
}
