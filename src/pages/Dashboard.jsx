import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase, STORAGE_BUCKET, formatFileSize, formatDate } from '../lib/supabase'

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
  const [allFiles, setAllFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // Folder modal state
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const loadDashboardData = async () => {
    if (!user) return
    try {
      setLoading(true)

      // Get file count
      const { count: filesCount } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('deleted_at', null)

      // Get folder count
      const { count: foldersCount } = await supabase
        .from('folders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Get favorite count
      const { count: favoritesCount } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_favorite', true)
        .is('deleted_at', null)

      // Get storage usage from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('storage_used, storage_limit')
        .eq('id', user.id)
        .maybeSingle()

      // Get recent files
      const { data: recent } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(6)

      // Get all files
      const { data: all } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      // Get folders
      const { data: foldersData } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .is('parent_id', null)
        .order('created_at', { ascending: false })

      setStats({
        totalFiles: filesCount || 0,
        totalFolders: foldersCount || 0,
        totalFavorites: favoritesCount || 0,
        storageUsed: profile?.storage_used || 0,
        storageLimit: profile?.storage_limit || 53687091200
      })

      setRecentFiles(recent || [])
      setAllFiles(all || [])
      setFolders(foldersData || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
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

  const handleUploadFiles = async (filesList) => {
    if (!filesList || filesList.length === 0 || !user) return
    setUploading(true)

    try {
      for (const file of filesList) {
        if (file.size > 50 * 1024 * 1024) {
          alert(`File "${file.name}" exceeds the 50MB size limit.`)
          continue
        }

        const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${user.id}/${Date.now()}_${sanitized}`

        // Upload to Storage
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file, { cacheControl: '3600', upsert: false })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          alert(`Failed to upload "${file.name}": ${uploadError.message}`)
          continue
        }

        // Insert metadata into database
        const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''
        const { error: dbError } = await supabase.from('files').insert({
          user_id: user.id,
          original_name: file.name,
          storage_path: storagePath,
          file_extension: ext,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
          is_favorite: false
        })

        if (dbError) {
          console.error('Database record error:', dbError)
          alert(`Failed to save record for "${file.name}": ${dbError.message}`)
        }
      }

      setShowUploadModal(false)
      await loadDashboardData()
    } catch (err) {
      console.error('Error during upload:', err)
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (file) => {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(file.storage_path, 3600, {
          download: file.original_name
        })

      if (error) throw error

      if (data?.signedUrl) {
        const link = document.createElement('a')
        link.href = data.signedUrl
        link.download = file.original_name
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      console.error('Error downloading file:', err)
      alert('Failed to download file: ' + err.message)
    }
  }

  const handleToggleFavorite = async (file) => {
    try {
      const newStatus = !file.is_favorite
      const { error } = await supabase
        .from('files')
        .update({ is_favorite: newStatus })
        .eq('id', file.id)

      if (error) throw error

      setRecentFiles(prev => prev.map(f => f.id === file.id ? { ...f, is_favorite: newStatus } : f))
      setAllFiles(prev => prev.map(f => f.id === file.id ? { ...f, is_favorite: newStatus } : f))
      setStats(prev => ({
        ...prev,
        totalFavorites: newStatus ? prev.totalFavorites + 1 : Math.max(0, prev.totalFavorites - 1)
      }))
    } catch (err) {
      console.error('Error updating favorite:', err)
      alert('Failed to update favorite: ' + err.message)
    }
  }

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.original_name}"?`)) return
    try {
      await supabase.storage.from(STORAGE_BUCKET).remove([file.storage_path])
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id)

      if (error) throw error

      await loadDashboardData()
    } catch (err) {
      console.error('Error deleting file:', err)
      alert('Failed to delete file: ' + err.message)
    }
  }

  const handleCreateFolder = async (e) => {
    e.preventDefault()
    if (!newFolderName.trim() || !user) return

    try {
      const { error } = await supabase
        .from('folders')
        .insert({
          user_id: user.id,
          name: newFolderName.trim()
        })

      if (error) throw error

      setNewFolderName('')
      setShowFolderModal(false)
      await loadDashboardData()
    } catch (err) {
      console.error('Error creating folder:', err)
      alert('Failed to create folder: ' + err.message)
    }
  }

  const favoriteFiles = allFiles.filter(f => f.is_favorite)

  const renderFileCard = (file) => (
    <div key={file.id} className="file-card">
      <div className="file-preview">
        <span className="file-icon">{getFileIcon(file.mime_type)}</span>
      </div>
      <div className="file-info">
        <div className="file-name" title={file.original_name}>{file.original_name}</div>
        <div className="file-meta">{formatFileSize(file.file_size)} • {formatDate(file.created_at)}</div>
      </div>
      <div className="file-actions">
        <button
          type="button"
          className="file-action-btn btn btn-secondary"
          onClick={() => handleDownload(file)}
          title="Download file"
        >
          ⬇️
        </button>
        <button
          type="button"
          className="file-action-btn btn btn-secondary"
          onClick={() => handleToggleFavorite(file)}
          title={file.is_favorite ? 'Remove Favorite' : 'Add to Favorites'}
        >
          {file.is_favorite ? '⭐' : '☆'}
        </button>
        <button
          type="button"
          className="file-action-btn btn btn-danger"
          onClick={() => handleDeleteFile(file)}
          title="Delete file"
        >
          🗑️
        </button>
      </div>
    </div>
  )

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
          <a
            href="#dashboard"
            className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActivePage('dashboard'); setSidebarOpen(false); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Dashboard</span>
          </a>
          <a
            href="#all-files"
            className={`nav-item ${activePage === 'all-files' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActivePage('all-files'); setSidebarOpen(false); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
              <polyline points="13 2 13 9 20 9"></polyline>
            </svg>
            <span>All Files</span>
          </a>
          <a
            href="#folders"
            className={`nav-item ${activePage === 'folders' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActivePage('folders'); setSidebarOpen(false); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>My Folders</span>
          </a>
          <a
            href="#favorites"
            className={`nav-item ${activePage === 'favorites' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActivePage('favorites'); setSidebarOpen(false); }}
          >
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
              {/* Quick Actions */}
              <div className="quick-actions">
                <button
                  type="button"
                  className="action-btn action-btn-primary"
                  onClick={() => setShowUploadModal(true)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span>Upload Files</span>
                </button>
                <button
                  type="button"
                  className="action-btn action-btn-secondary"
                  onClick={() => setShowFolderModal(true)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    <line x1="12" y1="11" x2="12" y2="17"></line>
                    <line x1="9" y1="14" x2="15" y2="14"></line>
                  </svg>
                  <span>New Folder</span>
                </button>
              </div>

              {/* Stats Grid */}
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
                    <p>No files yet. Click &quot;Upload Files&quot; to get started!</p>
                  </div>
                ) : (
                  recentFiles.map(renderFileCard)
                )}
              </div>
            </div>
          )}

          {/* All Files Page */}
          {activePage === 'all-files' && (
            <div className="page-content active">
              <div className="section-header">
                <h2>All Files ({allFiles.length})</h2>
                <button
                  type="button"
                  className="action-btn action-btn-primary"
                  onClick={() => setShowUploadModal(true)}
                >
                  <span>Upload Files</span>
                </button>
              </div>
              <div className="files-grid">
                {allFiles.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                      <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                    <p>No files uploaded yet.</p>
                  </div>
                ) : (
                  allFiles.map(renderFileCard)
                )}
              </div>
            </div>
          )}

          {/* Folders Page */}
          {activePage === 'folders' && (
            <div className="page-content active">
              <div className="section-header">
                <h2>My Folders ({folders.length})</h2>
                <button
                  type="button"
                  className="action-btn action-btn-secondary"
                  onClick={() => setShowFolderModal(true)}
                >
                  <span>New Folder</span>
                </button>
              </div>
              <div className="folders-grid">
                {folders.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <p>No folders yet. Click &quot;New Folder&quot; to organize your files!</p>
                  </div>
                ) : (
                  folders.map(folder => (
                    <div key={folder.id} className="folder-card">
                      <div className="folder-icon" style={{ backgroundColor: `${folder.color || '#6366f1'}20`, color: folder.color || '#6366f1' }}>
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

          {/* Favorites Page */}
          {activePage === 'favorites' && (
            <div className="page-content active">
              <div className="section-header">
                <h2>Favorites ({favoriteFiles.length})</h2>
              </div>
              <div className="files-grid">
                {favoriteFiles.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    <p>No favorite files yet. Star files to find them easily here!</p>
                  </div>
                ) : (
                  favoriteFiles.map(renderFileCard)
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Upload Files</h2>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => !uploading && setShowUploadModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div
                className={`upload-area ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files?.length) {
                    handleUploadFiles(Array.from(e.dataTransfer.files));
                  }
                }}
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleUploadFiles(Array.from(e.target.files));
                      e.target.value = '';
                    }
                  }}
                  disabled={uploading}
                />
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <h3>{uploading ? 'Uploading files...' : 'Drag and drop files here'}</h3>
                <p>{uploading ? 'Please wait while files upload to storage...' : 'Or click to select files (Max 50MB per file)'}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Folder</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowFolderModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="folderName">Folder Name</label>
                  <input
                    type="text"
                    id="folderName"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name (e.g., Documents)"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowFolderModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
