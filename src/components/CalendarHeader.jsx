import { format, addMonths, subMonths } from '../utils/dateUtils'
import ExportButton from './ExportButton'
import SyncToSheets from './SyncToSheets'
import AssigneeFilter from './AssigneeFilter'
import './CalendarHeader.css'

function CalendarHeader({ currentDate, onDateChange, onAddTask, onUndo, canUndo }) {
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
        <AssigneeFilter />
        <button 
          className="undo-btn" 
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Cmd+Z)"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3.75 6.75H11.25C13.3211 6.75 15 8.42893 15 10.5C15 12.5711 13.3211 14.25 11.25 14.25H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6.75 3.75L3.75 6.75L6.75 9.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Undo
        </button>
        <SyncToSheets currentDate={currentDate} />
        <ExportButton />
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

