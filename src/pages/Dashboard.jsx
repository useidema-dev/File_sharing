import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase, formatFileSize, formatDate } from '../lib/supabase'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalFolders: 0,
    totalFavorites: 0,
    storageUsed: 0,
    storageLimit: 53687091200
  })
  const [recentFiles, setRecentFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const loadDashboardData = async () => {
    try {
      // Get file stats
      const { count: filesCount } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)

      const { count: foldersCount } = await supabase
        .from('folders')
        .select('*', { count: 'exact', head: true })

      const { count: favoritesCount } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('is_favorite', true)
        .is('deleted_at', null)

      // Get storage usage
      const { data: profile } = await supabase
        .from('profiles')
        .select('storage_used, storage_limit')
        .single()

      // Get recent files
      const { data: files } = await supabase
        .from('files')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(6)

      setStats({
        totalFiles: filesCount || 0,
        totalFolders: foldersCount || 0,
        totalFavorites: favoritesCount || 0,
        storageUsed: profile?.storage_used || 0,
        storageLimit: profile?.storage_limit || 53687091200
      })

      setRecentFiles(files || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const loadFolders = async () => {
    try {
      const { data } = await supabase
        .from('folders')
        .select('*')
        .is('parent_id', null)
        .order('created_at', { ascending: false })

      setFolders(data || [])
    } catch (error) {
      console.error('Error loading folders:', error)
    }
  }

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await signOut()
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const getFileIcon = (mimeType) => {
    if (!mimeType) return '📄'
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎥'
    if (mimeType.startsWith('audio/')) return '🎵'
    if (mimeType.includes('pdf')) return '📕'
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
    if (mimeType.includes('presentation')) return '📽️'
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦'
    return '📄'
  }

  useEffect(() => {
    if (activePage === 'folders') {
      loadFolders()
    }
  }, [activePage])

  return (
    <div className="dashboard-body">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'active' : ''}`} id="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="8" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M4 14h24M16 8v6M12 20h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>MyVault</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a href="#" className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`} onClick={() => setActivePage('dashboard')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Dashboard</span>
          </a>
          <a href="#" className={`nav-item ${activePage === 'all-files' ? 'active' : ''}`} onClick={() => setActivePage('all-files')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
              <polyline points="13 2 13 9 20 9"></polyline>
            </svg>
            <span>All Files</span>
          </a>
          <a href="#" className={`nav-item ${activePage === 'folders' ? 'active' : ''}`} onClick={() => setActivePage('folders')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>My Folders</span>
          </a>
          <a href="#" className={`nav-item ${activePage === 'favorites' ? 'active' : ''}`} onClick={() => setActivePage('favorites')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>Favorites</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="user-info">
              <span className="user-name">{user?.email?.split('@')[0]}</span>
              <span className="user-email">{user?.email}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <button className="btn-icon mobile-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="page-title">
              {activePage === 'dashboard' && 'Dashboard'}
              {activePage === 'all-files' && 'All Files'}
              {activePage === 'folders' && 'My Folders'}
              {activePage === 'favorites' && 'Favorites'}
            </h1>
          </div>
          <div className="top-bar-right">
            <button className="btn-icon" onClick={toggleTheme} title="Toggle theme">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
              </svg>
            </button>
          </div>
        </header>

        <div className="content-area">
          {/* Dashboard Page */}
          {activePage === 'dashboard' && (
            <div className="page-content active">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon stat-icon-primary">📄</div>
                  <div className="stat-info">
                    <h3 className="stat-value">{stats.totalFiles}</h3>
                    <p className="stat-label">Total Files</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon stat-icon-success">💾</div>
                  <div className="stat-info">
                    <h3 className="stat-value">{formatFileSize(stats.storageUsed)}</h3>
                    <p className="stat-label">Storage Used</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon stat-icon-warning">📁</div>
                  <div className="stat-info">
                    <h3 className="stat-value">{stats.totalFolders}</h3>
                    <p className="stat-label">Folders</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon stat-icon-info">⭐</div>
                  <div className="stat-info">
                    <h3 className="stat-value">{stats.totalFavorites}</h3>
                    <p className="stat-label">Favorites</p>
                  </div>
                </div>
              </div>

              <div className="section-header">
                <h2>Recent Files</h2>
              </div>
              <div className="files-grid">
                {recentFiles.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                      <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                    <p>No files yet</p>
                  </div>
                ) : (
                  recentFiles.map(file => (
                    <div key={file.id} className="file-card">
                      <div className="file-preview">
                        <span className="file-icon">{getFileIcon(file.mime_type)}</span>
                      </div>
                      <div className="file-info">
                        <div className="file-name" title={file.original_name}>{file.original_name}</div>
                        <div className="file-meta">{formatFileSize(file.file_size)} • {formatDate(file.created_at)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Folders Page */}
          {activePage === 'folders' && (
            <div className="page-content active">
              <div className="folders-grid">
                {folders.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <p>No folders yet</p>
                  </div>
                ) : (
                  folders.map(folder => (
                    <div key={folder.id} className="folder-card">
                      <div className="folder-icon" style={{ backgroundColor: `${folder.color}20`, color: folder.color }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                      </div>
                      <div className="folder-info">
                        <div className="folder-name">{folder.name}</div>
                        <div className="folder-meta">{formatDate(folder.created_at)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
