import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  const { signIn, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    if (isSignUp) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.')
        setLoading(false)
        return
      }

      const { data, error } = await signUp(email, password, fullName)

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        // If session created automatically, redirect to dashboard
        if (data?.session) {
          navigate('/dashboard')
        } else {
          setSuccessMessage('Account created successfully! If email confirmation is required, please check your inbox, or you can now sign in.')
          setIsSignUp(false)
          setLoading(false)
        }
      }
    } else {
      const { error } = await signIn(email, password)

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        navigate('/dashboard')
      }
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
          <h1>{isSignUp ? 'Create an Account' : 'Welcome to MyVault'}</h1>
          <p>{isSignUp ? 'Sign up to upload and share files securely' : 'Sign in to access your files'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignUp}
                placeholder="Enter your full name"
                disabled={loading}
              />
            </div>
          )}

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
              placeholder={isSignUp ? 'Create a password (min 6 characters)' : 'Enter your password'}
              disabled={loading}
            />
          </div>

          {!isSignUp && (
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
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>

          {error && (
            <div className="auth-message error">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="auth-message success">
              {successMessage}
            </div>
          )}
        </form>

        <div className="auth-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div>
            {isSignUp ? (
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  className="link-text"
                  style={{ fontWeight: '600' }}
                  onClick={() => {
                    setIsSignUp(false)
                    setError('')
                    setSuccessMessage('')
                  }}
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  className="link-text"
                  style={{ fontWeight: '600' }}
                  onClick={() => {
                    setIsSignUp(true)
                    setError('')
                    setSuccessMessage('')
                  }}
                >
                  Create Account
                </button>
              </span>
            )}
          </div>
          <Link to="/" className="link-text">← Back to home</Link>
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
