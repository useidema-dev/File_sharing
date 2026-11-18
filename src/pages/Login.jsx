import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  const { signIn, resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setResetMessage('')
    setLoading(true)

    const { error } = await resetPassword(resetEmail)

    if (error) {
      setResetMessage(error.message)
    } else {
      setResetMessage('Password reset email sent! Check your inbox.')
    }
    setLoading(false)
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="8" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M4 14h24M16 8v6M12 20h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1>Welcome to MyVault</h1>
          <p>Sign in to access your files</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              className="link-text"
              onClick={() => setShowResetModal(true)}
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {error && (
            <div className="auth-message error">
              {error}
            </div>
          )}
        </form>

        <div className="auth-footer">
          <a href="/" className="link-text">← Back to home</a>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Reset Password</h2>
              <button className="modal-close" onClick={() => setShowResetModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="form-group" style={{ padding: '0 24px' }}>
                <label htmlFor="resetEmail">Email</label>
                <input
                  type="email"
                  id="resetEmail"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>
              {resetMessage && (
                <div className={`auth-message ${resetMessage.includes('sent') ? 'success' : 'error'}`} style={{ margin: '16px 24px' }}>
                  {resetMessage}
                </div>
              )}
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
