import { useState, useRef, useEffect } from 'react'
import { useTasks } from '../context/TaskContext'
import { GOOGLE_APPS_SCRIPT } from '../utils/googleAppsScript'
import './SyncToSheets.css'

function SyncToSheets({ currentDate }) {
  const { tasks, activeProject } = useTasks()
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState(() => 
    localStorage.getItem('sheets-webhook-url') || ''
  )
  const [urlInput, setUrlInput] = useState(webhookUrl)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null) // 'success' | 'error' | null
  const [copyStatus, setCopyStatus] = useState(null) // 'copied' | null
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSaveUrl = () => {
    localStorage.setItem('sheets-webhook-url', urlInput)
    setWebhookUrl(urlInput)
    setShowSettings(false)
  }

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleSync = async () => {
    if (!webhookUrl) {
      setShowSettings(true)
      setIsOpen(false)
      return
    }

    setIsSyncing(true)
    setSyncStatus(null)
    setIsOpen(false)

    const payload = {
      tasks: tasks,
      month: currentDate.getMonth(),
      year: currentDate.getFullYear(),
      projectName: activeProject?.name || 'Calendar'
    }

    console.log('Syncing to Google Sheets...')
    console.log('Tasks:', tasks.length)

    try {
      // Google Apps Script requires no-cors mode from localhost
      // The request goes through, we just can't read the response
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload),
      })
      
      // If we get here without throwing, the request was sent
      // Check your Google Sheet to verify it worked!
      setSyncStatus('success')
      console.log('✓ Sync request sent! Check your Google Sheet.')
      
    } catch (error) {
      console.error('Sync error:', error)
      setSyncStatus('error')
    } finally {
      setIsSyncing(false)
      setTimeout(() => setSyncStatus(null), 3000)
    }
  }

  const handleTestConnection = async () => {
    if (!urlInput) return
    
    try {
      const response = await fetch(urlInput)
      const text = await response.text()
      alert('Connection successful! Response: ' + text)
    } catch (error) {
      alert('Connection failed: ' + error.message + '\n\nMake sure the script is deployed with "Anyone" access.')
    }
  }

  return (
    <>
      <div className="sync-button-wrapper" ref={dropdownRef}>
        <button 
          className={`sync-btn ${syncStatus ? syncStatus : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <span className="spinner" />
          ) : syncStatus === 'success' ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 9L7.5 12.5L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : syncStatus === 'error' ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M12.5 5.5L5.5 12.5M5.5 5.5L12.5 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 9C3 5.68629 5.68629 3 9 3C11.2208 3 13.1599 4.26965 14.1973 6.11145" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M15 9C15 12.3137 12.3137 15 9 15C6.77915 15 4.84006 13.7304 3.80269 11.8885" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M14 3V6.5H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 15V11.5H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {syncStatus === 'success' ? 'Synced!' : syncStatus === 'error' ? 'Failed' : 'Sync'}
        </button>

        {isOpen && (
          <div className="sync-dropdown">
            <button className="sync-option" onClick={handleSync}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M1 6H15" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M4 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M4 11H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Sync to Google Sheet
            </button>
            <div className="sync-dropdown-divider" />
            <button className="sync-option settings" onClick={() => { setShowSettings(true); setIsOpen(false); }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 1V3M8 13V15M1 8H3M13 8H15M2.93 2.93L4.34 4.34M11.66 11.66L13.07 13.07M2.93 13.07L4.34 11.66M11.66 4.34L13.07 2.93" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Settings
            </button>
            {!webhookUrl && (
              <div className="sync-hint">
                ⚠️ Set up Google Sheets URL first
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal sync-settings-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Google Sheets Setup</h2>
              <button className="modal-close" onClick={() => setShowSettings(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            
            <div className="sync-settings-content">
              <div className="setup-instructions">
                <h3>Quick Setup (5 minutes)</h3>
                <ol>
                  <li>Create a new <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer">Google Sheet</a></li>
                  <li>Go to <strong>Extensions → Apps Script</strong></li>
                  <li>Delete any existing code and paste the script:
                    <button 
                      className={`copy-script-btn ${copyStatus === 'copied' ? 'copied' : ''}`}
                      onClick={handleCopyScript}
                    >
                      {copyStatus === 'copied' ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 7L5.5 10.5L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M2 10V2.5C2 2.22386 2.22386 2 2.5 2H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                          Copy Script
                        </>
                      )}
                    </button>
                  </li>
                  <li>Click <strong>Deploy → New deployment</strong></li>
                  <li>Choose <strong>Web app</strong>, set access to <strong>Anyone</strong></li>
                  <li>Copy the Web App URL and paste it below</li>
                </ol>
              </div>

              <div className="form-group">
                <label htmlFor="webhook-url">Google Apps Script Web App URL</label>
                <input
                  id="webhook-url"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/..."
                />
                {urlInput && (
                  <button 
                    type="button" 
                    className="test-connection-btn"
                    onClick={handleTestConnection}
                  >
                    Test Connection
                  </button>
                )}
              </div>

              <div className="troubleshooting">
                <h4>Troubleshooting</h4>
                <ul>
                  <li>Make sure you clicked <strong>"Deploy → New deployment"</strong> (not just save)</li>
                  <li>Set "Who has access" to <strong>"Anyone"</strong></li>
                  <li>After making changes, create a <strong>new deployment</strong> (not edit existing)</li>
                  <li>The URL should start with <code>https://script.google.com/macros/s/</code></li>
                  <li>Open browser console (F12) to see detailed sync logs</li>
                </ul>
              </div>

              <div className="sync-settings-actions">
                <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSaveUrl}
                  disabled={!urlInput.trim()}
                >
                  Save URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SyncToSheets
