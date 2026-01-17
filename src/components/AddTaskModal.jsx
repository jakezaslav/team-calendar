import { useState } from 'react'
import { useTasks } from '../context/TaskContext'
import { format, formatDateForInput } from '../utils/dateUtils'
import './AddTaskModal.css'

const PRESET_COLORS = [
  { name: 'Terracotta', value: '#e07a5f' },
  { name: 'Sage', value: '#81a684' },
  { name: 'Ochre', value: '#f4d19b' },
  { name: 'Slate Blue', value: '#7d9bb8' },
  { name: 'Lavender', value: '#c9b8d4' },
  { name: 'Dusty Orange', value: '#d4a574' },
  { name: 'Yellow', value: '#f7e96c' },
  { name: 'Rose', value: '#d4a5a5' },
]

function AddTaskModal({ onClose, currentDate, initialDate }) {
  const { addTask } = useTasks()
  
  // Use initialDate if provided (from clicking a date), otherwise use current month view
  const defaultDate = formatDateForInput(initialDate || currentDate)
  
  const [form, setForm] = useState({
    name: '',
    assignee: '',
    startDate: defaultDate,
    endDate: defaultDate,
    color: PRESET_COLORS[0].value
  })
  
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleColorSelect = (color) => {
    setForm(prev => ({ ...prev, color }))
  }

  const validate = () => {
    const newErrors = {}
    
    if (!form.name.trim()) {
      newErrors.name = 'Task name is required'
    }
    
    if (!form.startDate) {
      newErrors.startDate = 'Start date is required'
    }
    
    if (!form.endDate) {
      newErrors.endDate = 'End date is required'
    }
    
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      newErrors.endDate = 'End date must be after start date'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validate()) return
    
    addTask({
      name: form.name.trim(),
      assignee: form.assignee.trim() || 'Unassigned',
      startDate: form.startDate,
      endDate: form.endDate,
      color: form.color
    })
    
    onClose()
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal" role="dialog" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">Add New Task</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">Task Name *</label>
            <input
              id="name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter task name"
              className={errors.name ? 'error' : ''}
              autoFocus
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="assignee">Assignee</label>
            <input
              id="assignee"
              type="text"
              name="assignee"
              value={form.assignee}
              onChange={handleChange}
              placeholder="Who is responsible?"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Start Date *</label>
              <input
                id="startDate"
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className={errors.startDate ? 'error' : ''}
              />
              {errors.startDate && <span className="error-message">{errors.startDate}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="endDate">End Date *</label>
              <input
                id="endDate"
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                min={form.startDate}
                className={errors.endDate ? 'error' : ''}
              />
              {errors.endDate && <span className="error-message">{errors.endDate}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="color-swatches">
              {PRESET_COLORS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  className={`color-swatch ${form.color === color.value ? 'selected' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => handleColorSelect(color.value)}
                  aria-label={color.name}
                  title={color.name}
                />
              ))}
              <label className="custom-color">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => handleColorSelect(e.target.value)}
                />
                <span className="custom-color-label">Custom</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="task-preview">
            <span className="preview-label">Preview</span>
            <div 
              className="preview-bar"
              style={{ backgroundColor: form.color }}
            >
              {form.name || 'Task Name'}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddTaskModal

