import { useState, useEffect } from 'react'
import { useTasks } from '../context/TaskContext'
import { formatDate, getTaskDuration, formatDateForInput, parseISO, addDays, format, differenceInDays } from '../utils/dateUtils'
import './TaskSidebar.css'

function TaskSidebar() {
  const { tasks, selectedTaskId, selectTask, updateTask, deleteTask } = useTasks()
  
  // State for editable duration input (allows backspacing)
  const [editingDuration, setEditingDuration] = useState({ taskId: null, value: '', fallback: 1 })
  
  // State for locked tasks (when locked, start date change shifts end date proportionally)
  const [lockedTasks, setLockedTasks] = useState(new Set())

  // Sort tasks by start date
  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(a.startDate) - new Date(b.startDate)
  )

  const toggleLock = (taskId, e) => {
    e.stopPropagation()
    setLockedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const handleStartDateChange = (taskId, newStartDate, currentStartDate, currentEndDate) => {
    const newStart = parseISO(newStartDate)
    const oldStart = parseISO(currentStartDate)
    const end = parseISO(currentEndDate)
    
    // If locked, shift end date by the same amount
    if (lockedTasks.has(taskId)) {
      const duration = differenceInDays(end, oldStart)
      const newEnd = addDays(newStart, duration)
      updateTask(taskId, { 
        startDate: newStartDate, 
        endDate: format(newEnd, 'yyyy-MM-dd') 
      })
    } else {
      // If new start is after end, adjust end to match start
      if (newStart > end) {
        updateTask(taskId, { 
          startDate: newStartDate, 
          endDate: newStartDate 
        })
      } else {
        updateTask(taskId, { startDate: newStartDate })
      }
    }
  }

  const handleEndDateChange = (taskId, newEndDate, currentStartDate) => {
    const start = parseISO(currentStartDate)
    const end = parseISO(newEndDate)
    
    // If new end is before start, adjust start to match end
    if (end < start) {
      updateTask(taskId, { 
        startDate: newEndDate, 
        endDate: newEndDate 
      })
    } else {
      updateTask(taskId, { endDate: newEndDate })
    }
  }

  const handleDurationFocus = (taskId, currentDuration) => {
    setEditingDuration({ taskId, value: String(currentDuration), fallback: currentDuration })
  }

  const handleDurationInputChange = (e) => {
    setEditingDuration(prev => ({ ...prev, value: e.target.value }))
  }

  const handleDurationBlur = (taskId, currentStartDate) => {
    const duration = parseInt(editingDuration.value, 10)
    
    if (isNaN(duration) || duration < 1) {
      // Revert to fallback value - no change needed to task
      setEditingDuration({ taskId: null, value: '', fallback: 1 })
      return
    }
    
    const start = parseISO(currentStartDate)
    const newEnd = addDays(start, duration - 1)
    
    updateTask(taskId, { 
      endDate: format(newEnd, 'yyyy-MM-dd') 
    })
    
    setEditingDuration({ taskId: null, value: '', fallback: 1 })
  }

  const handleDurationKeyDown = (e, taskId, currentStartDate) => {
    if (e.key === 'Enter') {
      e.target.blur()
    } else if (e.key === 'Escape') {
      setEditingDuration({ taskId: null, value: '', fallback: 1 })
      e.target.blur()
    }
  }

  const handleDelete = (taskId, taskName) => {
    if (window.confirm(`Delete "${taskName}"?`)) {
      deleteTask(taskId)
    }
  }

  return (
    <aside className="task-sidebar">
      <div className="sidebar-header">
        <h2>All Tasks</h2>
        <span className="task-count">{tasks.length} tasks</span>
      </div>

      <div className="sidebar-content">
        {sortedTasks.length === 0 ? (
          <div className="sidebar-empty">
            <p>No tasks yet. Click a date on the calendar to add one.</p>
          </div>
        ) : (
          <div className="task-list">
            {sortedTasks.map(task => {
              const duration = getTaskDuration(task.startDate, task.endDate)
              const isSelected = task.id === selectedTaskId
              
              return (
                <div 
                  key={task.id}
                  className={`task-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectTask(task.id)}
                >
                  {/* Task header with color and name */}
                  <div className="task-item-header">
                    <span 
                      className="task-color-indicator"
                      style={{ backgroundColor: task.color }}
                    />
                    <span className="task-item-name" title={task.name}>
                      {task.name}
                    </span>
                    <button 
                      className="task-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(task.id, task.name)
                      }}
                      title="Delete task"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>

                  {/* Assignee */}
                  {task.assignee && (
                    <div className="task-item-assignee">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="4" r="2" stroke="currentColor" strokeWidth="1"/>
                        <path d="M2 10C2 8.34315 3.34315 7 5 7H7C8.65685 7 10 8.34315 10 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                      </svg>
                      {task.assignee}
                    </div>
                  )}

                  {/* Editable dates and duration */}
                  <div className="task-item-dates">
                    <div className="date-field">
                      <label>Start</label>
                      <input
                        type="date"
                        value={task.startDate}
                        onChange={(e) => handleStartDateChange(task.id, e.target.value, task.startDate, task.endDate)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    <div className="date-field">
                      <label>End</label>
                      <input
                        type="date"
                        value={task.endDate}
                        onChange={(e) => handleEndDateChange(task.id, e.target.value, task.startDate)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    <div className="duration-field">
                      <label>Days</label>
                      <div className="duration-input-wrapper">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editingDuration.taskId === task.id ? editingDuration.value : duration}
                          onFocus={() => handleDurationFocus(task.id, duration)}
                          onChange={handleDurationInputChange}
                          onBlur={() => handleDurationBlur(task.id, task.startDate)}
                          onKeyDown={(e) => handleDurationKeyDown(e, task.id, task.startDate)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          className={`lock-btn ${lockedTasks.has(task.id) ? 'locked' : ''}`}
                          onClick={(e) => toggleLock(task.id, e)}
                          title={lockedTasks.has(task.id) ? 'Unlock dates (end date will stay fixed when moving start)' : 'Lock dates (moving start will shift end proportionally)'}
                        >
                          {lockedTasks.has(task.id) ? (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <rect x="2" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                              <path d="M4 5V3.5C4 2.39543 4.89543 1.5 6 1.5C7.10457 1.5 8 2.39543 8 3.5V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <rect x="2" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                              <path d="M8 5V3.5C8 2.39543 8.89543 1.5 10 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

export default TaskSidebar
