import { useState, useRef, useEffect } from 'react'
import { exportToPdf } from '../utils/exportPdf'
import { useTasks } from '../context/TaskContext'
import './ExportButton.css'

function ExportButton() {
  const { activeProject, allTasks, assignees } = useTasks()
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
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

  const handleExportAll = async () => {
    setIsExporting(true)
    setIsOpen(false)
    
    const projectName = activeProject?.name || 'Calendar'
    await exportToPdf(allTasks, projectName)
    setIsExporting(false)
  }

  const handleExportByAssignee = async (assignee) => {
    setIsExporting(true)
    setIsOpen(false)
    
    const filteredTasks = allTasks.filter(t => t.assignee === assignee)
    const projectName = `${activeProject?.name || 'Calendar'} - ${assignee}`
    await exportToPdf(filteredTasks, projectName)
    setIsExporting(false)
  }

  return (
    <div className="export-button-wrapper" ref={dropdownRef}>
      <button 
        className="export-btn"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
      >
        {isExporting ? (
          <span className="spinner" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M15.75 11.25V14.25C15.75 14.6478 15.592 15.0294 15.3107 15.3107C15.0294 15.592 14.6478 15.75 14.25 15.75H3.75C3.35218 15.75 2.97064 15.592 2.68934 15.3107C2.40804 15.0294 2.25 14.6478 2.25 14.25V11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5.25 7.5L9 11.25L12.75 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 11.25V2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        Export
      </button>

      {isOpen && (
        <div className="export-dropdown">
          <button className="export-option" onClick={handleExportAll}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 1H10L14 5V14C14 14.5523 13.5523 15 13 15H4C3.44772 15 3 14.5523 3 14V2C3 1.44772 3.44772 1 4 1Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 1V5H14" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            Export All Tasks
          </button>
          
          {assignees.length > 0 && (
            <>
              <div className="export-divider" />
              <div className="export-section-label">Export by Assignee</div>
              {assignees.map(assignee => (
                <button 
                  key={assignee}
                  className="export-option export-option-assignee"
                  onClick={() => handleExportByAssignee(assignee)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M3 14C3 11.2386 5.23858 9 8 9C10.7614 9 13 11.2386 13 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {assignee}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ExportButton
