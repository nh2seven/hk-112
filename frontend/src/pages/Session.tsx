/**
 * Session Page
 * 
 * Manage current gameplay session and view past sessions
 * - Create/manage temporary item lists for gameplay sessions
 * - Add/remove items from the current session
 * - Save sessions to history
 * - View past sessions
 */

import { useState, useEffect, useCallback } from 'react'
import { 
  Session, HKItem 
} from '../types'
import { 
  fetchSessions, 
  createSession, 
  fetchSession, 
  deleteSession, 
  saveSession, 
  addSessionItem, 
  removeSessionItem, 
  clearSession,
  fetchItems
} from '../api'
import './Session.css'

export function SessionPage() {
  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Item picker modal state
  const [showItemPicker, setShowItemPicker] = useState(false)
  const [allItems, setAllItems] = useState<HKItem[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [itemsLoading, setItemsLoading] = useState(false)
  
  // New session modal state
  const [showNewSessionModal, setShowNewSessionModal] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      const data = await fetchSessions()
      setSessions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    }
  }, [])

  // Load all items for picker
  const loadAllItems = useCallback(async () => {
    setItemsLoading(true)
    try {
      const data = await fetchItems({ found: null, category: '', region: '', name: '' })
      setAllItems(data)
    } catch (err) {
      console.error('Failed to load items:', err)
    } finally {
      setItemsLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await loadSessions()
      setLoading(false)
    }
    init()
  }, [loadSessions])

  // Load items when opening picker
  useEffect(() => {
    if (showItemPicker && allItems.length === 0) {
      loadAllItems()
    }
  }, [showItemPicker, allItems.length, loadAllItems])

  // Create new session
  const handleCreateSession = async () => {
    try {
      const session = await createSession(newSessionName || undefined)
      await loadSessions()
      setActiveSession(session)
      setShowNewSessionModal(false)
      setNewSessionName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    }
  }

  // Select session
  const handleSelectSession = async (sessionId: number) => {
    try {
      const session = await fetchSession(sessionId)
      setActiveSession(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session')
    }
  }

  // Delete session
  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm('Are you sure you want to delete this session?')) return
    
    try {
      await deleteSession(sessionId)
      await loadSessions()
      if (activeSession?.id === sessionId) {
        setActiveSession(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session')
    }
  }

  // Save session
  const handleSaveSession = async () => {
    if (!activeSession) return
    
    try {
      const saved = await saveSession(activeSession.id)
      setActiveSession(saved)
      await loadSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session')
    }
  }

  // Add item to session
  const handleAddItem = async (itemId: number) => {
    if (!activeSession) return
    
    try {
      const updated = await addSessionItem(activeSession.id, itemId)
      setActiveSession(updated)
      await loadSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item')
    }
  }

  // Remove item from session
  const handleRemoveItem = async (itemId: number) => {
    if (!activeSession) return
    
    try {
      const updated = await removeSessionItem(activeSession.id, itemId)
      setActiveSession(updated)
      await loadSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item')
    }
  }

  // Clear session
  const handleClearSession = async () => {
    if (!activeSession) return
    if (!confirm('Are you sure you want to clear all items from this session?')) return
    
    try {
      const updated = await clearSession(activeSession.id)
      setActiveSession(updated)
      await loadSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear session')
    }
  }

  // Filter items for picker (exclude already added)
  const filteredItems = allItems.filter(item => {
    const notInSession = !activeSession?.items?.some(si => si.id === item.id)
    const matchesSearch = !itemSearch || 
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.region.toLowerCase().includes(itemSearch.toLowerCase())
    return notInSession && matchesSearch
  })

  // Separate active and saved sessions
  const activeSessions = sessions.filter(s => !s.saved_at)
  const savedSessions = sessions.filter(s => s.saved_at)

  if (loading) {
    return <div className="session-loading">Loading sessions...</div>
  }

  return (
    <div className="session-page">
      <header className="session-header">
        <h1>Current Session</h1>
        <p className="session-subtitle">Manage your gameplay session and track items to find</p>
      </header>

      {error && <div className="session-error">{error}</div>}

      <div className="session-layout">
        {/* Sessions List */}
        <aside className="sessions-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-header">
              <h2>Sessions</h2>
              <button 
                className="btn-new-session"
                onClick={() => setShowNewSessionModal(true)}
              >
                + New
              </button>
            </div>

            {activeSessions.length > 0 && (
              <div className="session-group">
                <h3>Active</h3>
                <ul className="session-list">
                  {activeSessions.map(session => (
                    <li 
                      key={session.id}
                      className={`session-item ${activeSession?.id === session.id ? 'active' : ''}`}
                    >
                      <button 
                        className="session-select"
                        onClick={() => handleSelectSession(session.id)}
                      >
                        <span className="session-name">{session.name}</span>
                        <span className="session-count">{session.item_count} items</span>
                      </button>
                      <button 
                        className="session-delete"
                        onClick={() => handleDeleteSession(session.id)}
                        title="Delete session"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {savedSessions.length > 0 && (
              <div className="session-group">
                <h3>Past Sessions</h3>
                <ul className="session-list">
                  {savedSessions.map(session => (
                    <li 
                      key={session.id}
                      className={`session-item saved ${activeSession?.id === session.id ? 'active' : ''}`}
                    >
                      <button 
                        className="session-select"
                        onClick={() => handleSelectSession(session.id)}
                      >
                        <span className="session-name">{session.name}</span>
                        <span className="session-meta">
                          {session.item_count} items • {new Date(session.saved_at!).toLocaleDateString()}
                        </span>
                      </button>
                      <button 
                        className="session-delete"
                        onClick={() => handleDeleteSession(session.id)}
                        title="Delete session"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sessions.length === 0 && (
              <p className="no-sessions">No sessions yet. Create one to get started!</p>
            )}
          </div>
        </aside>

        {/* Active Session Details */}
        <main className="session-main">
          {activeSession ? (
            <div className="active-session">
              <div className="active-session-header">
                <div>
                  <h2>{activeSession.name}</h2>
                  <p className="session-date">
                    Created: {new Date(activeSession.created_at).toLocaleString()}
                    {activeSession.saved_at && (
                      <> • Saved: {new Date(activeSession.saved_at).toLocaleString()}</>
                    )}
                  </p>
                </div>
                {!activeSession.saved_at && (
                  <div className="session-actions">
                    <button 
                      className="btn-add-items"
                      onClick={() => setShowItemPicker(true)}
                    >
                      + Add Items
                    </button>
                    <button 
                      className="btn-clear"
                      onClick={handleClearSession}
                      disabled={!activeSession.items?.length}
                    >
                      Clear
                    </button>
                    <button 
                      className="btn-save"
                      onClick={handleSaveSession}
                      disabled={!activeSession.items?.length}
                    >
                      Save Session
                    </button>
                  </div>
                )}
              </div>

              {activeSession.saved_at && (
                <div className="saved-notice">
                  This session has been saved and cannot be modified.
                </div>
              )}

              <div className="session-items">
                <h3>Items ({activeSession.item_count})</h3>
                {activeSession.items && activeSession.items.length > 0 ? (
                  <table className="session-items-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Region</th>
                        <th>Status</th>
                        {!activeSession.saved_at && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {activeSession.items.map(item => (
                        <tr key={item.id} className={item.found ? 'found' : ''}>
                          <td>{item.name}</td>
                          <td>
                            <span className="category-badge">
                              {item.category}
                            </span>
                          </td>
                          <td>{item.region}</td>
                          <td>
                            <span className={`status-badge ${item.found ? 'found' : 'not-found'}`}>
                              {item.found ? '✓ Found' : '○ Not Found'}
                            </span>
                          </td>
                          {!activeSession.saved_at && (
                            <td>
                              <button 
                                className="btn-remove-item"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                Remove
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-items">No items in this session yet. Add some items to track!</p>
                )}
              </div>
            </div>
          ) : (
            <div className="no-session-selected">
              <div className="empty-state">
                <span className="empty-icon">🎮</span>
                <h2>No Session Selected</h2>
                <p>Select a session from the sidebar or create a new one to get started.</p>
                <button 
                  className="btn-create-session"
                  onClick={() => setShowNewSessionModal(true)}
                >
                  Create New Session
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div className="modal-overlay" onClick={() => setShowNewSessionModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Session</h2>
              <button className="modal-close" onClick={() => setShowNewSessionModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <label>
                <span>Session Name (optional)</span>
                <input
                  type="text"
                  value={newSessionName}
                  onChange={e => setNewSessionName(e.target.value)}
                  placeholder="e.g., Greenpath Run"
                  autoFocus
                />
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowNewSessionModal(false)}>
                Cancel
              </button>
              <button className="btn-create" onClick={handleCreateSession}>
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Picker Modal */}
      {showItemPicker && (
        <div className="modal-overlay" onClick={() => setShowItemPicker(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Items to Session</h2>
              <button className="modal-close" onClick={() => setShowItemPicker(false)}>×</button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                className="item-search"
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                placeholder="Search items by name, category, or region..."
                autoFocus
              />
              
              {itemsLoading ? (
                <div className="items-loading">Loading items...</div>
              ) : (
                <div className="items-picker-list">
                  {filteredItems.length > 0 ? (
                    <table className="picker-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Category</th>
                          <th>Region</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.slice(0, 50).map(item => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.category}</td>
                            <td>{item.region}</td>
                            <td>
                              <button 
                                className="btn-add-item"
                                onClick={() => handleAddItem(item.id)}
                              >
                                Add
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="no-items-found">No items found matching your search.</p>
                  )}
                  {filteredItems.length > 50 && (
                    <p className="items-truncated">
                      Showing 50 of {filteredItems.length} items. Refine your search to see more specific results.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-done" onClick={() => setShowItemPicker(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
