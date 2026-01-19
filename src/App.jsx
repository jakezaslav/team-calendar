import { useState, useEffect } from 'react'
import CalendarHeader from './components/CalendarHeader'
import CalendarGrid from './components/CalendarGrid'
import TaskSidebar from './components/TaskSidebar'
import AddTaskModal from './components/AddTaskModal'
import EditTaskModal from './components/EditTaskModal'
import ProjectSwitcher from './components/ProjectSwitcher'
import { useTasks } from './context/TaskContext'

function App() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDateForTask, setSelectedDateForTask] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const { undo, canUndo, selectedTask, selectedTaskId, deleteTask, activeProject, navigateToDate, clearNavigateToDate } = useTasks()

  // Update document title when project changes
  useEffect(() => {
    document.title = `${activeProject?.name || 'My Project'} - Plan It!`
  }, [activeProject])

  // Handle navigation requests (e.g., after duplicating a project)
  useEffect(() => {
    if (navigateToDate) {
      setCurrentDate(navigateToDate)
      clearNavigateToDate()
    }
  }, [navigateToDate, clearNavigateToDate])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input field
      const isInInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'
      
      // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (isInInput) return
        e.preventDefault()
        undo()
        return
      }
      
      // Delete selected task: Backspace or Delete key
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedTaskId) {
        if (isInInput) return
        e.preventDefault()
        if (window.confirm(`Delete "${selectedTask?.name}"?`)) {
          deleteTask(selectedTaskId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, selectedTaskId, selectedTask, deleteTask])

  const handleAddTask = () => {
    setSelectedDateForTask(null)
    setIsModalOpen(true)
  }

  const handleDateClick = (date) => {
    setSelectedDateForTask(date)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedDateForTask(null)
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
  }

  const handleCloseEditModal = () => {
    setEditingTask(null)
  }

  return (
    <div className="app">
      <main className="app-main">
        <ProjectSwitcher />
        <CalendarHeader 
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onAddTask={handleAddTask}
          onUndo={undo}
          canUndo={canUndo}
        />
        <CalendarGrid 
          currentDate={currentDate}
          onDateClick={handleDateClick}
          onEditTask={handleEditTask}
        />
      </main>
      
      <TaskSidebar onEditTask={handleEditTask} />
      
      {isModalOpen && (
        <AddTaskModal 
          onClose={handleCloseModal}
          currentDate={currentDate}
          initialDate={selectedDateForTask}
        />
      )}

      {editingTask && (
        <EditTaskModal 
          task={editingTask}
          onClose={handleCloseEditModal}
        />
      )}
    </div>
  )
}

export default App

