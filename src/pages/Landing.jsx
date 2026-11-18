import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="landing-container">
      <nav className="landing-nav">
        <div className="nav-brand">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="8" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M4 14h24M16 8v6M12 20h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>MyVault</span>
        </div>
        <div className="nav-links">
          <Link to="/login" className="btn btn-primary">Sign In</Link>
        </div>
      </nav>

      <main className="landing-main">
        <div className="hero-section">
          <h1 className="hero-title">Your Personal Cloud Storage</h1>
          <p className="hero-subtitle">Store, organize, and manage all your files securely in one place</p>
          <Link to="/login" className="btn btn-large btn-primary">Get Started</Link>
        </div>

        <div className="features-section">
          <div className="feature-card">
            <div className="feature-icon">📁</div>
            <h3>Organized Storage</h3>
            <p>Keep your files organized with folders and favorites</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure & Private</h3>
            <p>Your files are encrypted and accessible only by you</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👁️</div>
            <h3>File Preview</h3>
            <p>Preview images, videos, PDFs, and more directly in browser</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📤</div>
            <h3>Easy Upload</h3>
            <p>Drag and drop files or browse to upload any format</p>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <p>&copy; 2026 MyVault - Personal Cloud Storage</p>
      </footer>
    </div>
  )
}
