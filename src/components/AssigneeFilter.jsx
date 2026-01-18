import { useState, useRef, useEffect } from 'react'
import { useTasks } from '../context/TaskContext'
import './AssigneeFilter.css'

function AssigneeFilter() {
  const { assignees, assigneeFilter, setAssigneeFilter, tasks, allTasks } = useTasks()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Don't render if no assignees
  if (assignees.length === 0) return null

  const handleSelect = (assignee) => {
    setAssigneeFilter(assignee)
    setIsOpen(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    setAssigneeFilter(null)
    setIsOpen(false)
  }

  const isFiltered = assigneeFilter !== null
  const filterLabel = assigneeFilter || 'All Assignees'

  return (
    <div className="assignee-filter" ref={dropdownRef}>
      <button 
        className={`filter-btn ${isFiltered ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Filter by assignee"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M3 14C3 11.2386 5.23858 9 8 9C10.7614 9 13 11.2386 13 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="filter-label">{filterLabel}</span>
        {isFiltered && (
          <span className="filter-count">{tasks.length}/{allTasks.length}</span>
        )}
        <svg className="chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <div className="filter-dropdown">
          <button 
            className={`filter-option ${!assigneeFilter ? 'selected' : ''}`}
            onClick={() => handleSelect(null)}
          >
            <span className="option-label">All Assignees</span>
            <span className="option-count">{allTasks.length}</span>
          </button>
          
          <div className="filter-divider" />
          
          {assignees.map(assignee => {
            const count = allTasks.filter(t => t.assignee === assignee).length
            return (
              <button 
                key={assignee}
                className={`filter-option ${assigneeFilter === assignee ? 'selected' : ''}`}
                onClick={() => handleSelect(assignee)}
              >
                <span className="option-label">{assignee}</span>
                <span className="option-count">{count}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AssigneeFilter
