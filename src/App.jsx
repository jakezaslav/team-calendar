import { useState } from 'react'
import CalendarHeader from './components/CalendarHeader'
import CalendarGrid from './components/CalendarGrid'
import TaskSidebar from './components/TaskSidebar'
import AddTaskModal from './components/AddTaskModal'
import ProjectSwitcher from './components/ProjectSwitcher'

function App() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 6, 1)) // July 2024
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDateForTask, setSelectedDateForTask] = useState(null)

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

  return (
    <div className="app">
      <main className="app-main">
        <ProjectSwitcher />
        <CalendarHeader 
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onAddTask={handleAddTask}
        />
        <CalendarGrid 
          currentDate={currentDate}
          onDateClick={handleDateClick}
        />
      </main>
      
      <TaskSidebar />
      
      {isModalOpen && (
        <AddTaskModal 
          onClose={handleCloseModal}
          currentDate={currentDate}
          initialDate={selectedDateForTask}
        />
      )}
    </div>
  )
}

export default App

