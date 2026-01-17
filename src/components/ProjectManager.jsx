import { useState } from 'react'
import { useTasks } from '../context/TaskContext'
import './ProjectManager.css'

const PROJECT_COLORS = [
  '#e07a5f', '#81a684', '#f4d19b', '#7d9bb8', 
  '#c9b8d4', '#d4a574', '#f7e96c', '#d4a5a5'
]

function ProjectManager({ onClose }) {
  const { projects, activeProjectId, addProject, updateProject, deleteProject, switchProject } = useTasks()
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', color: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', color: PROJECT_COLORS[0] })

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleEdit = (project) => {
    setEditingId(project.id)
    setEditForm({ name: project.name, color: project.color })
  }

  const handleSaveEdit = () => {
    if (editForm.name.trim()) {
      updateProject(editingId, { name: editForm.name.trim(), color: editForm.color })
    }
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ name: '', color: '' })
  }

  const handleDelete = (projectId) => {
    const message = projects.length <= 1 
      ? 'Delete this project and start fresh with a new default project?'
      : 'Are you sure? All tasks in this project will be deleted.'
    
    if (window.confirm(message)) {
      deleteProject(projectId)
    }
  }

  const handleCreate = () => {
    if (newProject.name.trim()) {
      const created = addProject({ name: newProject.name.trim(), color: newProject.color })
      switchProject(created.id)
      setNewProject({ name: '', color: PROJECT_COLORS[0] })
      setIsCreating(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal project-manager-modal">
        <div className="modal-header">
          <h2>Manage Projects</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="project-manager-content">
          {/* Existing Projects */}
          <div className="project-list">
            {projects.map(project => (
              <div 
                key={project.id} 
                className={`project-item ${project.id === activeProjectId ? 'active' : ''}`}
              >
                {editingId === project.id ? (
                  /* Edit Mode */
                  <div className="project-edit-form">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Project name"
                      autoFocus
                    />
                    <div className="color-options">
                      {PROJECT_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          className={`color-option ${editForm.color === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setEditForm(prev => ({ ...prev, color }))}
                        />
                      ))}
                    </div>
                    <div className="edit-actions">
                      <button className="btn btn-sm btn-secondary" onClick={handleCancelEdit}>
                        Cancel
                      </button>
                      <button className="btn btn-sm btn-primary" onClick={handleSaveEdit}>
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <>
                    <div className="project-info">
                      <span 
                        className="project-color-dot"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="project-name">{project.name}</span>
                      {project.id === activeProjectId && (
                        <span className="current-badge">Current</span>
                      )}
                    </div>
                    <div className="project-actions">
                      <button 
                        className="icon-btn"
                        onClick={() => handleEdit(project)}
                        title="Edit"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button 
                        className="icon-btn delete"
                        onClick={() => handleDelete(project.id)}
                        title="Delete"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 4H13M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Create New Project */}
          {isCreating ? (
            <div className="new-project-form">
              <input
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                placeholder="New project name"
                autoFocus
              />
              <div className="color-options">
                {PROJECT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${newProject.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewProject(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
              <div className="form-actions">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setIsCreating(false)
                    setNewProject({ name: '', color: PROJECT_COLORS[0] })
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleCreate}
                  disabled={!newProject.name.trim()}
                >
                  Create Project
                </button>
              </div>
            </div>
          ) : (
            <button 
              className="add-project-btn"
              onClick={() => setIsCreating(true)}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 3.75V14.25M3.75 9H14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              New Project
            </button>
          )}

          {/* Danger Zone */}
          <div className="danger-zone">
            <button 
              className="clear-data-btn"
              onClick={() => {
                if (window.confirm('Delete ALL projects and tasks? This cannot be undone.')) {
                  localStorage.clear()
                  window.location.reload()
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 4H13M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectManager

