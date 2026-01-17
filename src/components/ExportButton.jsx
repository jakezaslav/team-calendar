import { useState, useRef, useEffect } from 'react'
import { exportToPdf, printCalendar } from '../utils/exportPdf'
import { useTasks } from '../context/TaskContext'
import { format } from '../utils/dateUtils'
import './ExportButton.css'

function ExportButton({ currentDate }) {
  const { activeProject } = useTasks()
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

  const handleExportPdf = async () => {
    setIsExporting(true)
    setIsOpen(false)
    
    const calendarMain = document.querySelector('.app-main')
    const monthYear = format(currentDate, 'MMMM yyyy')
    const title = `${activeProject?.name || 'Calendar'} - ${monthYear}`
    
    await exportToPdf(calendarMain, title)
    setIsExporting(false)
  }

  const handlePrint = () => {
    setIsOpen(false)
    printCalendar()
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
          <button className="export-option" onClick={handleExportPdf}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 1H10L14 5V14C14 14.5523 13.5523 15 13 15H4C3.44772 15 3 14.5523 3 14V2C3 1.44772 3.44772 1 4 1Z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 1V5H14" stroke="currentColor" strokeWidth="1.5"/>
              <text x="5" y="12" fontSize="4" fontWeight="bold" fill="currentColor">PDF</text>
            </svg>
            Download PDF
          </button>
          <button className="export-option" onClick={handlePrint}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6V1H12V6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 12H2C1.44772 12 1 11.5523 1 11V7C1 6.44772 1.44772 6 2 6H14C14.5523 6 15 6.44772 15 7V11C15 11.5523 14.5523 12 14 12H12" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 9H12V15H4V9Z" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            Print
          </button>
        </div>
      )}
    </div>
  )
}

export default ExportButton

