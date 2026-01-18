import { useMemo } from 'react'
import { 
  getCalendarWeeks, 
  format, 
  isSameMonth,
  isSameDay,
  taskAppearsInWeek,
  getTaskPositionInWeek,
  parseISO
} from '../utils/dateUtils'
import { useTasks } from '../context/TaskContext'
import TaskBar from './TaskBar'
import './CalendarGrid.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function CalendarGrid({ currentDate, onDateClick, onEditTask }) {
  const { tasks } = useTasks()
  const today = new Date()
  
  const weeks = useMemo(() => getCalendarWeeks(currentDate), [currentDate])

  // Group tasks by their row position within each week
  const getTasksForWeek = (weekDays) => {
    const weekTasks = tasks.filter(task => taskAppearsInWeek(task, weekDays))
    
    // Sort tasks by start date, then by duration (longer tasks first)
    return weekTasks.sort((a, b) => {
      const startA = parseISO(a.startDate)
      const startB = parseISO(b.startDate)
      if (startA < startB) return -1
      if (startA > startB) return 1
      // Same start date - longer tasks first
      const durationA = parseISO(a.endDate) - startA
      const durationB = parseISO(b.endDate) - startB
      return durationB - durationA
    })
  }

  // Assign vertical positions to tasks to avoid overlap
  const assignTaskRows = (weekTasks, weekDays) => {
    const rows = [] // Array of arrays, each sub-array contains tasks in that row
    
    weekTasks.forEach(task => {
      const position = getTaskPositionInWeek(task, weekDays)
      const taskStart = position.startCol
      const taskEnd = position.startCol + position.span - 1
      
      // Find first row where this task fits
      let rowIndex = rows.findIndex(row => {
        return !row.some(existingTask => {
          const existingPos = getTaskPositionInWeek(existingTask, weekDays)
          const existingStart = existingPos.startCol
          const existingEnd = existingPos.startCol + existingPos.span - 1
          // Check for overlap
          return !(taskEnd < existingStart || taskStart > existingEnd)
        })
      })
      
      if (rowIndex === -1) {
        rowIndex = rows.length
        rows.push([])
      }
      
      rows[rowIndex].push(task)
    })
    
    return rows
  }

  return (
    <div className="calendar-grid">
      {/* Weekday headers */}
      <div className="calendar-weekdays">
        {WEEKDAYS.map(day => (
          <div key={day} className="weekday-header">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar weeks */}
      <div className="calendar-weeks">
        {weeks.map((week, weekIndex) => {
          const weekTasks = getTasksForWeek(week)
          const taskRows = assignTaskRows(weekTasks, week)
          
          return (
            <div key={weekIndex} className="calendar-week">
              {/* Day cells */}
              <div className="week-days">
                {week.map((day, dayIndex) => {
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isToday = isSameDay(day, today)
                  
                  return (
                    <div 
                      key={dayIndex}
                      className={`day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                      data-date={format(day, 'yyyy-MM-dd')}
                      onClick={() => onDateClick?.(day)}
                    >
                      <span className={`day-number ${isToday ? 'today-number' : ''}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                  )
                })}
              </div>
              
              {/* Task rows */}
              <div className="week-tasks">
                {taskRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="task-row">
                    {row.map(task => {
                      const position = getTaskPositionInWeek(task, week)
                      const isStart = isSameDay(parseISO(task.startDate), week[position.startCol]) || 
                                     parseISO(task.startDate) < week[0]
                      const isEnd = isSameDay(parseISO(task.endDate), week[position.startCol + position.span - 1]) ||
                                   parseISO(task.endDate) > week[6]
                      
                      return (
                        <TaskBar
                          key={task.id}
                          task={task}
                          startCol={position.startCol}
                          span={position.span}
                          isStart={parseISO(task.startDate) >= week[0]}
                          isEnd={parseISO(task.endDate) <= week[6]}
                          weekDays={week}
                          onEditTask={onEditTask}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarGrid

