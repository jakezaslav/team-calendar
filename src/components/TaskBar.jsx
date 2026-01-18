import { useState, useRef, useEffect, useCallback } from 'react'
import { useTasks } from '../context/TaskContext'
import { format, addDays, parseISO, differenceInDays } from '../utils/dateUtils'
import './TaskBar.css'

function TaskBar({ task, startCol, span, isStart, isEnd, weekDays, onEditTask }) {
  const { selectedTaskId, selectTask, updateTask } = useTasks()
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(null) // 'left' or 'right'
  const [dragPreview, setDragPreview] = useState({ daysDelta: 0, newStart: null, newEnd: null })
  const barRef = useRef(null)
  const dragStartRef = useRef(null)
  
  const isSelected = selectedTaskId === task.id

  const handleClick = (e) => {
    if (!isDragging && !isResizing) {
      e.stopPropagation()
      selectTask(task.id)
    }
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation()
    if (onEditTask) {
      onEditTask(task)
    }
  }

  // Get the calendar grid element and calculate cell dimensions
  const getCalendarMetrics = useCallback(() => {
    const calendarGrid = barRef.current?.closest('.calendar-grid')
    const calendarWeeks = calendarGrid?.querySelector('.calendar-weeks')
    if (!calendarGrid || !calendarWeeks) return null
    
    const gridRect = calendarWeeks.getBoundingClientRect()
    const cellWidth = gridRect.width / 7
    const weekElements = calendarWeeks.querySelectorAll('.calendar-week')
    const cellHeight = weekElements.length > 0 ? weekElements[0].offsetHeight : 120
    
    return { gridRect, cellWidth, cellHeight, calendarWeeks }
  }, [])

  // Convert pixel position to date offset (works across weeks)
  const calculateDaysDelta = useCallback((clientX, clientY, startX, startY) => {
    const metrics = getCalendarMetrics()
    if (!metrics) return 0
    
    const { cellWidth, cellHeight } = metrics
    
    // Calculate horizontal days delta
    const deltaX = clientX - startX
    const daysX = Math.round(deltaX / cellWidth)
    
    // Calculate vertical weeks delta
    const deltaY = clientY - startY
    const weeksY = Math.round(deltaY / cellHeight)
    
    return daysX + (weeksY * 7)
  }, [getCalendarMetrics])

  // Calculate preview dates
  const calculatePreviewDates = useCallback((daysDelta, mode) => {
    if (!dragStartRef.current) return { newStart: null, newEnd: null }
    
    let newStart = parseISO(dragStartRef.current.startDate)
    let newEnd = parseISO(dragStartRef.current.endDate)
    
    if (mode === 'move') {
      newStart = addDays(newStart, daysDelta)
      newEnd = addDays(newEnd, daysDelta)
    } else if (mode === 'left') {
      newStart = addDays(newStart, daysDelta)
      if (newStart > newEnd) newStart = newEnd
    } else if (mode === 'right') {
      newEnd = addDays(newEnd, daysDelta)
      if (newEnd < newStart) newEnd = newStart
    }
    
    return { newStart, newEnd }
  }, [])

  // Drag to move entire task
  const handleDragStart = (e) => {
    if (isResizing) return
    
    e.preventDefault()
    e.stopPropagation()
    
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startDate: task.startDate,
      endDate: task.endDate
    }
    
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
  }

  const handleDragMove = useCallback((e) => {
    if (!dragStartRef.current || !isDragging) return
    
    const daysDelta = calculateDaysDelta(
      e.clientX, 
      e.clientY, 
      dragStartRef.current.x, 
      dragStartRef.current.y
    )
    
    const { newStart, newEnd } = calculatePreviewDates(daysDelta, 'move')
    setDragPreview({ daysDelta, newStart, newEnd })
  }, [isDragging, calculateDaysDelta, calculatePreviewDates])

  const handleDragEnd = useCallback((e) => {
    if (!dragStartRef.current) return
    
    const daysDelta = calculateDaysDelta(
      e.clientX, 
      e.clientY, 
      dragStartRef.current.x, 
      dragStartRef.current.y
    )
    
    if (daysDelta !== 0) {
      const { newStart, newEnd } = calculatePreviewDates(daysDelta, 'move')
      updateTask(task.id, {
        startDate: format(newStart, 'yyyy-MM-dd'),
        endDate: format(newEnd, 'yyyy-MM-dd')
      })
    }
    
    setIsDragging(false)
    setDragPreview({ daysDelta: 0, newStart: null, newEnd: null })
    dragStartRef.current = null
    
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
  }, [calculateDaysDelta, calculatePreviewDates, updateTask, task.id, handleDragMove])

  // Resize handlers - with cross-week support
  const handleResizeStart = (e, direction) => {
    e.stopPropagation()
    e.preventDefault()
    
    setIsResizing(direction)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startDate: task.startDate,
      endDate: task.endDate
    }
    
    // Add class to body for cursor
    document.body.classList.add('resizing-task')
    
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
  }

  const handleResizeMove = useCallback((e) => {
    if (!dragStartRef.current || !isResizing) return
    
    const daysDelta = calculateDaysDelta(
      e.clientX, 
      e.clientY, 
      dragStartRef.current.x, 
      dragStartRef.current.y
    )
    
    const { newStart, newEnd } = calculatePreviewDates(daysDelta, isResizing)
    setDragPreview({ daysDelta, newStart, newEnd })
  }, [isResizing, calculateDaysDelta, calculatePreviewDates])

  const handleResizeEnd = useCallback((e) => {
    if (!dragStartRef.current) return
    
    const daysDelta = calculateDaysDelta(
      e.clientX, 
      e.clientY, 
      dragStartRef.current.x, 
      dragStartRef.current.y
    )
    
    if (daysDelta !== 0) {
      const { newStart, newEnd } = calculatePreviewDates(daysDelta, isResizing)
      updateTask(task.id, {
        startDate: format(newStart, 'yyyy-MM-dd'),
        endDate: format(newEnd, 'yyyy-MM-dd')
      })
    }
    
    document.body.classList.remove('resizing-task')
    setIsResizing(null)
    setDragPreview({ daysDelta: 0, newStart: null, newEnd: null })
    dragStartRef.current = null
    
    document.removeEventListener('mousemove', handleResizeMove)
    document.removeEventListener('mouseup', handleResizeEnd)
  }, [isResizing, calculateDaysDelta, calculatePreviewDates, updateTask, task.id, handleResizeMove])

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('resizing-task')
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [handleDragMove, handleDragEnd, handleResizeMove, handleResizeEnd])

  const style = {
    gridColumnStart: startCol + 1,
    gridColumnEnd: `span ${span}`,
    backgroundColor: task.color,
  }

  // Format the drag info tooltip
  const getDragInfo = () => {
    if (!dragPreview.newStart || !dragPreview.newEnd) return null
    
    const duration = differenceInDays(dragPreview.newEnd, dragPreview.newStart) + 1
    
    if (isDragging) {
      const delta = dragPreview.daysDelta
      const direction = delta > 0 ? '+' : ''
      return `${direction}${delta} day${Math.abs(delta) !== 1 ? 's' : ''}`
    } else if (isResizing) {
      return `${format(dragPreview.newStart, 'MMM d')} - ${format(dragPreview.newEnd, 'MMM d')} (${duration}d)`
    }
    
    return null
  }

  const isActive = isDragging || isResizing

  return (
    <div
      ref={barRef}
      className={`task-bar ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      style={style}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleDragStart}
    >
      {/* Left resize handle */}
      {isStart && (
        <div 
          className="resize-handle resize-left"
          onMouseDown={(e) => handleResizeStart(e, 'left')}
        >
          <div className="resize-handle-grip" />
        </div>
      )}
      
      <span className="task-bar-name">{task.name}</span>
      
      {/* Drag/resize info tooltip */}
      {isActive && dragPreview.daysDelta !== 0 && (
        <div className="drag-tooltip">{getDragInfo()}</div>
      )}
      
      {/* Right resize handle */}
      {isEnd && (
        <div 
          className="resize-handle resize-right"
          onMouseDown={(e) => handleResizeStart(e, 'right')}
        >
          <div className="resize-handle-grip" />
        </div>
      )}
    </div>
  )
}

export default TaskBar
