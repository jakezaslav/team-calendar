import { format, addMonths, subMonths } from '../utils/dateUtils'
import ExportButton from './ExportButton'
import SyncToSheets from './SyncToSheets'
import './CalendarHeader.css'

function CalendarHeader({ currentDate, onDateChange, onAddTask }) {
  const handlePrevMonth = () => {
    onDateChange(subMonths(currentDate, 1))
  }

  const handleNextMonth = () => {
    onDateChange(addMonths(currentDate, 1))
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  return (
    <header className="calendar-header">
      <div className="calendar-header-left">
        <h1 className="calendar-title">
          {format(currentDate, 'MMMM yyyy')}
        </h1>
        <div className="calendar-nav">
          <button 
            className="nav-btn"
            onClick={handlePrevMonth}
            aria-label="Previous month"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button 
            className="nav-btn today-btn"
            onClick={handleToday}
          >
            Today
          </button>
          <button 
            className="nav-btn"
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="calendar-header-right">
        <SyncToSheets currentDate={currentDate} />
        <ExportButton currentDate={currentDate} />
        <button className="add-task-btn" onClick={onAddTask}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3.75V14.25M3.75 9H14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Add Task
        </button>
      </div>
    </header>
  )
}

export default CalendarHeader

