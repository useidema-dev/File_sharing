import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase, STORAGE_BUCKET, formatFileSize, formatDate } from '../lib/supabase'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const [stats, setStats] = useState({
    totalFiles: 0,
    sharedFiles: 0,
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

  // User profiles & permissions state
  const [availableUsers, setAvailableUsers] = useState([])
  const [profilesMap, setProfilesMap] = useState({})
  const [filePermissionsMap, setFilePermissionsMap] = useState({})

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadQueue, setUploadQueue] = useState([])
  const [uploadAccessType, setUploadAccessType] = useState('private') // 'private' | 'all' | 'specific'
  const [uploadSelectedUsers, setUploadSelectedUsers] = useState([])
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // Share modal state for existing files
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareTargetFile, setShareTargetFile] = useState(null)
  const [shareAccessType, setShareAccessType] = useState('private')
  const [shareSelectedUsers, setShareSelectedUsers] = useState([])
  const [savingShare, setSavingShare] = useState(false)

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

      // 1. Load profiles to list registered users for sharing
      try {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name')

        if (profilesData && profilesData.length > 0) {
          const pMap = {}
          profilesData.forEach(p => {
            pMap[p.id] = p
          })
          setProfilesMap(pMap)
          setAvailableUsers(profilesData.filter(p => p.id !== user.id))
        }
      } catch (e) {
        console.warn('Could not load profiles:', e)
      }

      // 2. Load file permissions
      try {
        const { data: permsData } = await supabase
          .from('file_permissions')
          .select('*')

        if (permsData) {
          const fpMap = {}
          permsData.forEach(p => {
            if (!fpMap[p.file_id]) fpMap[p.file_id] = []
            fpMap[p.file_id].push(p.user_id)
          })
          setFilePermissionsMap(fpMap)
        }
      } catch (e) {
        console.warn('Could not load file permissions (table may not exist yet):', e)
      }

      // 3. Load all files accessible to this user (handled by RLS: own files, 'all', or permitted)
      const { data: all, error: filesError } = await supabase
        .from('files')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (filesError) throw filesError

      const myFilesList = (all || []).filter(f => f.user_id === user.id)
      const sharedWithMeList = (all || []).filter(f => f.user_id !== user.id)
      const favoritesList = (all || []).filter(f => f.is_favorite)

      // 4. Folder count
      const { count: foldersCount } = await supabase
        .from('folders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // 5. Storage usage from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('storage_used, storage_limit')
        .eq('id', user.id)
        .maybeSingle()

      // 6. Folders
      const { data: foldersData } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .is('parent_id', null)
        .order('created_at', { ascending: false })

      setStats({
        totalFiles: myFilesList.length,
        sharedFiles: sharedWithMeList.length,
        totalFolders: foldersCount || 0,
        totalFavorites: favoritesList.length,
        storageUsed: profile?.storage_used || 0,
        storageLimit: profile?.storage_limit || 53687091200
      })

      setAllFiles(all || [])
      setRecentFiles((all || []).slice(0, 6))
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

  // Handle files queued for upload
  const handleFilesSelected = (filesList) => {
    if (!filesList || filesList.length === 0) return
    const validFiles = []
    for (const f of filesList) {
      if (f.size > 50 * 1024 * 1024) {
        alert(`File "${f.name}" exceeds the 50MB size limit.`)
      } else {
        validFiles.push(f)
      }
    }
    setUploadQueue(prev => [...prev, ...validFiles])
  }

  const handleRemoveFromQueue = (index) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== index))
  }

  // Upload files and attach permissions
  const handleConfirmUpload = async () => {
    if (uploadQueue.length === 0 || !user) return
    setUploading(true)

    try {
      for (const file of uploadQueue) {
        const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${user.id}/${Date.now()}_${sanitized}`

        // 1. Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file, { cacheControl: '3600', upsert: false })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          alert(`Failed to upload "${file.name}": ${uploadError.message}`)
          continue
        }

        // 2. Insert metadata into public.files
        const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''
        const insertPayload = {
          user_id: user.id,
          original_name: file.name,
          storage_path: storagePath,
          file_extension: ext,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
          is_favorite: false,
          access_type: uploadAccessType
        }

        let { data: insertedFile, error: dbError } = await supabase
          .from('files')
          .insert(insertPayload)
          .select()
          .single()

        // Fallback: If access_type column has not been added yet in database
        if (dbError && (dbError.message?.includes('access_type') || dbError.code === 'PGRST204')) {
          console.warn('access_type column missing, falling back to standard insert')
          delete insertPayload.access_type
          const retry = await supabase
            .from('files')
            .insert(insertPayload)
            .select()
            .single()
          insertedFile = retry.data
          dbError = retry.error
        }

        if (dbError) {
          console.error('Database record error:', dbError)
          alert(`Failed to save record for "${file.name}": ${dbError.message}`)
          continue
        }

        // 3. If access_type is specific, insert user permissions
        if (insertedFile && uploadAccessType === 'specific' && uploadSelectedUsers.length > 0) {
          const perms = uploadSelectedUsers.map(uid => ({
            file_id: insertedFile.id,
            user_id: uid,
            granted_by: user.id
          }))
          const { error: permError } = await supabase.from('file_permissions').insert(perms)
          if (permError) {
            console.warn('Failed to insert file_permissions (ensure ADD_FILE_SHARING.sql was run):', permError)
          }
        }
      }

      // Reset and close
      setUploadQueue([])
      setUploadAccessType('private')
      setUploadSelectedUsers([])
      setShowUploadModal(false)
      await loadDashboardData()
    } catch (err) {
      console.error('Error during upload:', err)
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // Open Share modal for an existing file
  const handleOpenShareModal = (file) => {
    setShareTargetFile(file)
    setShareAccessType(file.access_type || 'private')
    setShareSelectedUsers(filePermissionsMap[file.id] || [])
    setShowShareModal(true)
  }

  // Save updated share permissions
  const handleSaveShare = async () => {
    if (!shareTargetFile || !user) return
    setSavingShare(true)
    try {
      // 1. Update file access_type
      const { error: fileErr } = await supabase
        .from('files')
        .update({ access_type: shareAccessType })
        .eq('id', shareTargetFile.id)

      if (fileErr) throw fileErr

      // 2. Refresh file_permissions table
      await supabase.from('file_permissions').delete().eq('file_id', shareTargetFile.id)

      if (shareAccessType === 'specific' && shareSelectedUsers.length > 0) {
        const perms = shareSelectedUsers.map(uid => ({
          file_id: shareTargetFile.id,
          user_id: uid,
          granted_by: user.id
        }))
        const { error: permErr } = await supabase.from('file_permissions').insert(perms)
        if (permErr) throw permErr
      }

      setShowShareModal(false)
      setShareTargetFile(null)
      await loadDashboardData()
    } catch (err) {
      console.error('Error updating sharing permissions:', err)
      alert('Failed to update permissions: ' + err.message)
    } finally {
      setSavingShare(false)
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

  // Filtered views
  const myFiles = allFiles.filter(f => f.user_id === user?.id)
  const sharedWithMeFiles = allFiles.filter(f => f.user_id !== user?.id)
  const favoriteFiles = allFiles.filter(f => f.is_favorite)

  const renderFileCard = (file) => {
    const isOwner = file.user_id === user?.id
    const ownerProfile = profilesMap[file.user_id]
    const ownerDisplayName = ownerProfile?.full_name || ownerProfile?.email?.split('@')[0] || 'Another User'
    const specificPermsCount = (filePermissionsMap[file.id] || []).length

    return (
      <div key={file.id} className="file-card">
        <div className="file-preview">
          <span className="file-icon">{getFileIcon(file.mime_type)}</span>
        </div>
        <div className="file-info">
          <div className="file-name" title={file.original_name}>{file.original_name}</div>
          <div className="file-meta">{formatFileSize(file.file_size)} • {formatDate(file.created_at)}</div>
          
          {/* Access Badge */}
          {isOwner ? (
            file.access_type === 'all' ? (
              <span className="file-access-badge badge-all" title="All registered users can view this file">
                🌐 Everyone
              </span>
            ) : file.access_type === 'specific' ? (
              <span className="file-access-badge badge-specific" title={`Shared with ${specificPermsCount} user(s)`}>
                👥 Shared ({specificPermsCount})
              </span>
            ) : (
              <span className="file-access-badge badge-private" title="Only you can view this file">
                🔒 Private
              </span>
            )
          ) : (
            <span className="file-access-badge badge-shared-from" title={`Shared by ${ownerDisplayName} (${ownerProfile?.email || ''})`}>
              👥 From: {ownerDisplayName}
            </span>
          )}
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
          {isOwner && (
            <>
              <button
                type="button"
                className="file-action-btn btn btn-secondary"
                onClick={() => handleOpenShareModal(file)}
                title="Manage sharing & access"
              >
                👥
              </button>
              <button
                type="button"
                className="file-action-btn btn btn-danger"
                onClick={() => handleDeleteFile(file)}
                title="Delete file"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

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
            href="#my-files"
            className={`nav-item ${activePage === 'my-files' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActivePage('my-files'); setSidebarOpen(false); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>My Files ({myFiles.length})</span>
          </a>
          <a
            href="#shared"
            className={`nav-item ${activePage === 'shared' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActivePage('shared'); setSidebarOpen(false); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Shared with Me ({sharedWithMeFiles.length})</span>
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
              {activePage === 'all-files' && 'All Accessible Files'}
              {activePage === 'my-files' && 'My Uploaded Files'}
              {activePage === 'shared' && 'Shared with Me'}
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
                  <span>Upload & Share Files</span>
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

              {/* Stats Overview */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon stat-icon-primary">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                      <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalFiles}</div>
                    <div className="stat-label">My Files</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.sharedFiles}</div>
                    <div className="stat-label">Shared With Me</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon stat-icon-secondary">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalFavorites}</div>
                    <div className="stat-label">Favorites</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon stat-icon-info">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <div className="stat-value">{formatFileSize(stats.storageUsed)}</div>
                    <div className="stat-label">Storage Used ({Math.round((stats.storageUsed / stats.storageLimit) * 100)}%)</div>
                  </div>
                </div>
              </div>

              {/* Recent Files Section */}
              <div className="section-header">
                <h2>Recent Files</h2>
                <a href="#all-files" className="view-all-link" onClick={(e) => { e.preventDefault(); setActivePage('all-files'); }}>
                  View All &rarr;
                </a>
              </div>
              <div className="files-grid">
                {recentFiles.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                      <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                    <p>No files yet. Click &quot;Upload & Share Files&quot; to get started!</p>
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
                <h2>All Accessible Files ({allFiles.length})</h2>
                <button
                  type="button"
                  className="action-btn action-btn-primary"
                  onClick={() => setShowUploadModal(true)}
                >
                  <span>Upload & Share Files</span>
                </button>
              </div>
              <div className="files-grid">
                {allFiles.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                      <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                    <p>No files found.</p>
                  </div>
                ) : (
                  allFiles.map(renderFileCard)
                )}
              </div>
            </div>
          )}

          {/* My Files Page */}
          {activePage === 'my-files' && (
            <div className="page-content active">
              <div className="section-header">
                <h2>My Uploaded Files ({myFiles.length})</h2>
                <button
                  type="button"
                  className="action-btn action-btn-primary"
                  onClick={() => setShowUploadModal(true)}
                >
                  <span>Upload Files</span>
                </button>
              </div>
              <div className="files-grid">
                {myFiles.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    </svg>
                    <p>You haven&apos;t uploaded any files yet.</p>
                  </div>
                ) : (
                  myFiles.map(renderFileCard)
                )}
              </div>
            </div>
          )}

          {/* Shared with Me Page */}
          {activePage === 'shared' && (
            <div className="page-content active">
              <div className="section-header">
                <h2>Files Shared with Me ({sharedWithMeFiles.length})</h2>
              </div>
              <div className="files-grid">
                {sharedWithMeFiles.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                    <p>No files have been shared with you yet.</p>
                  </div>
                ) : (
                  sharedWithMeFiles.map(renderFileCard)
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

      {/* Upload & Share Modal */}
      {showUploadModal && (
        <div className="modal active">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2>Upload & Share Files</h2>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => !uploading && setShowUploadModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {/* Drag & Drop Area */}
              <div
                className={`upload-area ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files?.length) {
                    handleFilesSelected(Array.from(e.dataTransfer.files));
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
                      handleFilesSelected(Array.from(e.target.files));
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
                <h3>{uploading ? 'Uploading and sharing files...' : 'Select or Drop Files Here'}</h3>
                <p>Max 50MB per file</p>
              </div>

              {/* Selected Files Queue */}
              {uploadQueue.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Files to Upload ({uploadQueue.length}):
                  </div>
                  <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    {uploadQueue.map((file, idx) => (
                      <div key={idx} className="queued-file-item">
                        <span>{file.name} ({formatFileSize(file.size)})</span>
                        <button
                          type="button"
                          className="btn-remove-queue"
                          onClick={() => handleRemoveFromQueue(idx)}
                          disabled={uploading}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Permissions & Sharing Option */}
              <div className="access-section">
                <div className="access-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  <span>Who can access these files?</span>
                </div>

                <div className="access-options-grid">
                  <div 
                    className={`access-card ${uploadAccessType === 'private' ? 'selected' : ''}`}
                    onClick={() => setUploadAccessType('private')}
                  >
                    <div className="access-card-header">
                      <span>🔒 Only Me</span>
                    </div>
                    <span className="access-card-desc">Only you can view and download</span>
                  </div>

                  <div 
                    className={`access-card ${uploadAccessType === 'all' ? 'selected' : ''}`}
                    onClick={() => setUploadAccessType('all')}
                  >
                    <div className="access-card-header">
                      <span>🌐 Everyone</span>
                    </div>
                    <span className="access-card-desc">All registered users can view</span>
                  </div>

                  <div 
                    className={`access-card ${uploadAccessType === 'specific' ? 'selected' : ''}`}
                    onClick={() => setUploadAccessType('specific')}
                  >
                    <div className="access-card-header">
                      <span>👥 Specific Users</span>
                    </div>
                    <span className="access-card-desc">Select specific registered people</span>
                  </div>
                </div>

                {/* Specific Users Picker */}
                {uploadAccessType === 'specific' && (
                  <div className="users-picker-box">
                    <div className="users-picker-header">
                      <span>Select users who can access:</span>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => {
                          if (uploadSelectedUsers.length === availableUsers.length) {
                            setUploadSelectedUsers([])
                          } else {
                            setUploadSelectedUsers(availableUsers.map(u => u.id))
                          }
                        }}
                      >
                        {uploadSelectedUsers.length === availableUsers.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {availableUsers.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        No other users found in database yet.
                      </p>
                    ) : (
                      <div className="users-list-scroll">
                        {availableUsers.map(u => {
                          const isChecked = uploadSelectedUsers.includes(u.id)
                          return (
                            <label key={u.id} className="user-select-row">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setUploadSelectedUsers(prev => prev.filter(id => id !== u.id))
                                  } else {
                                    setUploadSelectedUsers(prev => [...prev, u.id])
                                  }
                                }}
                              />
                              <div className="user-avatar-mini">
                                {(u.full_name || u.email || 'U')[0].toUpperCase()}
                              </div>
                              <div className="user-select-info">
                                <div className="user-select-name">{u.full_name || u.email.split('@')[0]}</div>
                                <div className="user-select-email">{u.email}</div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadQueue([])
                }}
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmUpload}
                disabled={uploading || uploadQueue.length === 0}
              >
                {uploading ? 'Uploading...' : `Upload & Save (${uploadQueue.length} files)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share / Access Management Modal (For Existing Files) */}
      {showShareModal && shareTargetFile && (
        <div className="modal active">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h2>Share &quot;{shareTargetFile.original_name}&quot;</h2>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => !savingShare && setShowShareModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Manage who can view and download this file across accounts.
              </p>

              <div className="access-options-grid">
                <div 
                  className={`access-card ${shareAccessType === 'private' ? 'selected' : ''}`}
                  onClick={() => setShareAccessType('private')}
                >
                  <div className="access-card-header">
                    <span>🔒 Only Me</span>
                  </div>
                  <span className="access-card-desc">Only you can view and download</span>
                </div>

                <div 
                  className={`access-card ${shareAccessType === 'all' ? 'selected' : ''}`}
                  onClick={() => setShareAccessType('all')}
                >
                  <div className="access-card-header">
                    <span>🌐 Everyone</span>
                  </div>
                  <span className="access-card-desc">All registered users can view</span>
                </div>

                <div 
                  className={`access-card ${shareAccessType === 'specific' ? 'selected' : ''}`}
                  onClick={() => setShareAccessType('specific')}
                >
                  <div className="access-card-header">
                    <span>👥 Specific Users</span>
                  </div>
                  <span className="access-card-desc">Select specific registered people</span>
                </div>
              </div>

              {/* Specific Users Checklist */}
              {shareAccessType === 'specific' && (
                <div className="users-picker-box">
                  <div className="users-picker-header">
                    <span>Select people to share with:</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '12px' }}
                      onClick={() => {
                        if (shareSelectedUsers.length === availableUsers.length) {
                          setShareSelectedUsers([])
                        } else {
                          setShareSelectedUsers(availableUsers.map(u => u.id))
                        }
                      }}
                    >
                      {shareSelectedUsers.length === availableUsers.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {availableUsers.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      No other registered users found.
                    </p>
                  ) : (
                    <div className="users-list-scroll">
                      {availableUsers.map(u => {
                        const isChecked = shareSelectedUsers.includes(u.id)
                        return (
                          <label key={u.id} className="user-select-row">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setShareSelectedUsers(prev => prev.filter(id => id !== u.id))
                                } else {
                                  setShareSelectedUsers(prev => [...prev, u.id])
                                }
                              }}
                            />
                            <div className="user-avatar-mini">
                              {(u.full_name || u.email || 'U')[0].toUpperCase()}
                            </div>
                            <div className="user-select-info">
                              <div className="user-select-name">{u.full_name || u.email.split('@')[0]}</div>
                              <div className="user-select-email">{u.email}</div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowShareModal(false)}
                disabled={savingShare}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveShare}
                disabled={savingShare}
              >
                {savingShare ? 'Saving...' : 'Save Permissions'}
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
