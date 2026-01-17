import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  parseISO,
  differenceInDays,
  addDays,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  addMonths,
  subMonths,
} from 'date-fns'

export {
  format,
  parseISO,
  differenceInDays,
  addDays,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  addMonths,
  subMonths,
}

/**
 * Get all days to display in a calendar month view
 * Includes days from previous/next months to fill complete weeks
 */
export function getCalendarDays(date) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
}

/**
 * Get the weeks for a calendar month (array of arrays)
 */
export function getCalendarWeeks(date) {
  const days = getCalendarDays(date)
  const weeks = []
  
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  
  return weeks
}

/**
 * Calculate the duration of a task in days
 */
export function getTaskDuration(startDate, endDate) {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
  return differenceInDays(end, start) + 1
}

/**
 * Format a date for display
 */
export function formatDate(date, formatStr = 'MMM d, yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr)
}

/**
 * Format a date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy-MM-dd')
}

/**
 * Check if a task spans a particular day
 */
export function taskSpansDay(task, day) {
  const taskStart = parseISO(task.startDate)
  const taskEnd = parseISO(task.endDate)
  const checkDay = typeof day === 'string' ? parseISO(day) : day
  
  return isWithinInterval(checkDay, { start: taskStart, end: taskEnd })
}

/**
 * Check if a task starts on a particular day
 */
export function taskStartsOnDay(task, day) {
  const taskStart = parseISO(task.startDate)
  const checkDay = typeof day === 'string' ? parseISO(day) : day
  return isSameDay(taskStart, checkDay)
}

/**
 * Get the position and width of a task bar within a week row
 * Returns { startCol, span } where startCol is 0-6 and span is number of days
 */
export function getTaskPositionInWeek(task, weekDays) {
  const taskStart = parseISO(task.startDate)
  const taskEnd = parseISO(task.endDate)
  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]
  
  // Find where the task starts in this week
  let startCol = 0
  for (let i = 0; i < 7; i++) {
    if (isSameDay(weekDays[i], taskStart) || weekDays[i] > taskStart) {
      startCol = i
      break
    }
  }
  
  // If task started before this week, it starts at column 0
  if (taskStart < weekStart) {
    startCol = 0
  }
  
  // Calculate span within this week
  const effectiveStart = taskStart < weekStart ? weekStart : taskStart
  const effectiveEnd = taskEnd > weekEnd ? weekEnd : taskEnd
  const span = differenceInDays(effectiveEnd, effectiveStart) + 1
  
  return { startCol, span: Math.min(span, 7 - startCol) }
}

/**
 * Check if a task appears in a given week
 */
export function taskAppearsInWeek(task, weekDays) {
  const taskStart = parseISO(task.startDate)
  const taskEnd = parseISO(task.endDate)
  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]
  
  // Task appears if it overlaps with the week at all
  return taskStart <= weekEnd && taskEnd >= weekStart
}

/**
 * Generate a unique ID
 */
export function generateId() {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

