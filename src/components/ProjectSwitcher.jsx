import { useState, useRef, useEffect } from 'react'
import { useTasks } from '../context/TaskContext'
import ProjectManager from './ProjectManager'
import './ProjectSwitcher.css'

function ProjectSwitcher() {
  const { projects, activeProject, switchProject } = useTasks()
  const [isOpen, setIsOpen] = useState(false)
  const [showManager, setShowManager] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleProjectSelect = (projectId) => {
    switchProject(projectId)
    setIsOpen(false)
  }

  return (
    <>
      <div className="project-switcher" ref={dropdownRef}>
        <button 
          className="project-switcher-trigger"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span 
            className="project-color-dot"
            style={{ backgroundColor: activeProject?.color }}
          />
          <span className="project-name">{activeProject?.name}</span>
          <svg 
            className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none"
          >
            <path 
              d="M4 6L8 10L12 6" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="project-dropdown" role="listbox">
            <div className="dropdown-header">Projects</div>
            
            {projects.map(project => (
              <button
                key={project.id}
                className={`dropdown-item ${project.id === activeProject?.id ? 'active' : ''}`}
                onClick={() => handleProjectSelect(project.id)}
                role="option"
                aria-selected={project.id === activeProject?.id}
              >
                <span 
                  className="project-color-dot"
                  style={{ backgroundColor: project.color }}
                />
                <span className="project-name">{project.name}</span>
                {project.id === activeProject?.id && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="check-icon">
                    <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
            
            <div className="dropdown-divider" />
            
            <button 
              className="dropdown-item manage-btn"
              onClick={() => {
                setIsOpen(false)
                setShowManager(true)
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4.5C2 3.67157 2.67157 3 3.5 3H6L7.5 5H12.5C13.3284 5 14 5.67157 14 6.5V11.5C14 12.3284 13.3284 13 12.5 13H3.5C2.67157 13 2 12.3284 2 11.5V4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Manage Projects</span>
            </button>
          </div>
        )}
      </div>

      {showManager && (
        <ProjectManager onClose={() => setShowManager(false)} />
      )}
    </>
  )
}

export default ProjectSwitcher

