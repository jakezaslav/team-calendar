import { jsPDF } from 'jspdf'
import { parseISO, format, getCalendarWeeks, isSameMonth, isSameDay, getTaskPositionInWeek, taskAppearsInWeek } from './dateUtils'

// Color utilities
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 }
}

function getColorBrightness(hex) {
  const { r, g, b } = hexToRgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000
}

// Get all unique months that have tasks
function getMonthsWithTasks(tasks) {
  const monthSet = new Set()
  
  for (const task of tasks) {
    const startDate = parseISO(task.startDate)
    const endDate = parseISO(task.endDate)
    
    // Add all months the task spans
    let current = new Date(startDate)
    while (current <= endDate) {
      monthSet.add(`${current.getFullYear()}-${String(current.getMonth()).padStart(2, '0')}`)
      current.setMonth(current.getMonth() + 1)
      current.setDate(1)
    }
  }
  
  return Array.from(monthSet).sort().map(key => {
    const [year, month] = key.split('-')
    return new Date(parseInt(year), parseInt(month), 1)
  })
}

// Get tasks for a specific month
function getTasksForMonth(tasks, monthDate) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  
  return tasks.filter(task => {
    const taskStart = parseISO(task.startDate)
    const taskEnd = parseISO(task.endDate)
    return taskStart <= monthEnd && taskEnd >= monthStart
  })
}

// Assign tasks to rows to avoid overlaps
function assignTaskRows(weekTasks, weekDays) {
  const rows = []
  
  const sortedTasks = [...weekTasks].sort((a, b) => {
    if (a.startDate < b.startDate) return -1
    if (a.startDate > b.startDate) return 1
    const durA = parseISO(a.endDate) - parseISO(a.startDate)
    const durB = parseISO(b.endDate) - parseISO(b.startDate)
    return durB - durA
  })
  
  for (const task of sortedTasks) {
    const position = getTaskPositionInWeek(task, weekDays)
    const taskStart = position.startCol
    const taskEnd = position.startCol + position.span - 1
    
    let rowIndex = -1
    for (let r = 0; r < rows.length; r++) {
      const hasOverlap = rows[r].some(existingTask => {
        const existingPos = getTaskPositionInWeek(existingTask, weekDays)
        const existingStart = existingPos.startCol
        const existingEnd = existingPos.startCol + existingPos.span - 1
        return !(taskEnd < existingStart || taskStart > existingEnd)
      })
      
      if (!hasOverlap) {
        rowIndex = r
        break
      }
    }
    
    if (rowIndex === -1) {
      rowIndex = rows.length
      rows.push([])
    }
    
    rows[rowIndex].push(task)
  }
  
  return rows
}

/**
 * Export all calendar months with tasks to a professional PDF
 */
export async function exportToPdf(tasks, projectName = 'Calendar') {
  if (!tasks || tasks.length === 0) {
    alert('No tasks to export')
    return false
  }

  try {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = 297
    const pageHeight = 210
    const margin = 15
    const contentWidth = pageWidth - (margin * 2)
    
    const monthsWithTasks = getMonthsWithTasks(tasks)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December']

    // Colors
    const colors = {
      primary: { r: 45, g: 42, b: 38 },
      muted: { r: 107, g: 101, b: 96 },
      light: { r: 154, g: 148, b: 141 },
      border: { r: 232, g: 228, b: 222 },
      background: { r: 250, g: 248, b: 245 },
      headerBg: { r: 245, g: 242, b: 237 }
    }

    // --- CALENDAR PAGES ---
    let isFirstPage = true
    for (const monthDate of monthsWithTasks) {
      if (!isFirstPage) {
        pdf.addPage()
      }
      isFirstPage = false
      
      // Background
      pdf.setFillColor(colors.background.r, colors.background.g, colors.background.b)
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')
      
      const monthTasks = getTasksForMonth(tasks, monthDate)
      const weeks = getCalendarWeeks(monthDate)
      
      // Month title
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(20)
      pdf.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b)
      pdf.text(`${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`, margin, margin + 8)
      
      // Project name subtitle
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(colors.muted.r, colors.muted.g, colors.muted.b)
      pdf.text(projectName, margin, margin + 15)
      
      // Calendar grid
      const calendarTop = margin + 25
      const cellWidth = contentWidth / 7
      const headerHeight = 8
      const dateRowHeight = 6
      const taskRowHeight = 5
      
      // Calculate task rows per week
      const weekTaskRows = weeks.map(week => {
        const weekTasks = monthTasks.filter(task => taskAppearsInWeek(task, week))
        return assignTaskRows(weekTasks, week)
      })
      
      // Calculate cell heights based on task count
      const cellHeights = weekTaskRows.map(rows => {
        const numRows = Math.max(1, rows.length)
        return dateRowHeight + (numRows * taskRowHeight) + 3
      })
      
      // Draw day headers
      pdf.setFillColor(colors.headerBg.r, colors.headerBg.g, colors.headerBg.b)
      pdf.rect(margin, calendarTop, contentWidth, headerHeight, 'F')
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(colors.muted.r, colors.muted.g, colors.muted.b)
      
      for (let i = 0; i < 7; i++) {
        const x = margin + (i * cellWidth) + (cellWidth / 2)
        pdf.text(dayNames[i], x, calendarTop + 5.5, { align: 'center' })
      }
      
      // Draw week rows
      let currentY = calendarTop + headerHeight
      
      for (let w = 0; w < weeks.length; w++) {
        const week = weeks[w]
        const cellHeight = cellHeights[w]
        const taskRows = weekTaskRows[w]
        
        // Draw cell backgrounds and borders
        for (let d = 0; d < 7; d++) {
          const day = week[d]
          const x = margin + (d * cellWidth)
          const isCurrentMonth = isSameMonth(day, monthDate)
          
          // Cell background
          if (!isCurrentMonth) {
            pdf.setFillColor(252, 251, 250)
            pdf.rect(x, currentY, cellWidth, cellHeight, 'F')
          }
          
          // Cell border
          pdf.setDrawColor(colors.border.r, colors.border.g, colors.border.b)
          pdf.setLineWidth(0.2)
          pdf.rect(x, currentY, cellWidth, cellHeight)
          
          // Date number
          pdf.setFont('helvetica', isCurrentMonth ? 'bold' : 'normal')
          pdf.setFontSize(9)
          pdf.setTextColor(
            isCurrentMonth ? colors.primary.r : colors.light.r,
            isCurrentMonth ? colors.primary.g : colors.light.g,
            isCurrentMonth ? colors.primary.b : colors.light.b
          )
          pdf.text(String(day.getDate()), x + 2, currentY + 4.5)
        }
        
        // Draw tasks
        for (let rowIdx = 0; rowIdx < taskRows.length; rowIdx++) {
          const tasksInRow = taskRows[rowIdx]
          const taskY = currentY + dateRowHeight + (rowIdx * taskRowHeight) + 1
          
          for (const task of tasksInRow) {
            const position = getTaskPositionInWeek(task, week)
            const taskX = margin + (position.startCol * cellWidth) + 1
            const taskWidth = (position.span * cellWidth) - 2
            
            // Task bar
            const taskColor = hexToRgb(task.color)
            pdf.setFillColor(taskColor.r, taskColor.g, taskColor.b)
            pdf.roundedRect(taskX, taskY, taskWidth, taskRowHeight - 1, 1, 1, 'F')
            
            // Task name
            const brightness = getColorBrightness(task.color)
            pdf.setTextColor(brightness > 128 ? 45 : 255, brightness > 128 ? 42 : 255, brightness > 128 ? 38 : 255)
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(6)
            
            // Truncate text if needed
            const maxWidth = taskWidth - 2
            let displayName = task.name
            while (pdf.getTextWidth(displayName) > maxWidth && displayName.length > 3) {
              displayName = displayName.slice(0, -4) + '...'
            }
            
            pdf.text(displayName, taskX + 1.5, taskY + 3.2)
          }
        }
        
        currentY += cellHeight
      }
      
      // Page footer
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(colors.light.r, colors.light.g, colors.light.b)
      pdf.text(`${projectName} · ${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`, margin, pageHeight - 10)
      pdf.text(`Page ${pdf.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
    }

    // --- TASK LIST PAGE ---
    pdf.addPage()
    
    // Background
    pdf.setFillColor(colors.background.r, colors.background.g, colors.background.b)
    pdf.rect(0, 0, pageWidth, pageHeight, 'F')
    
    // Title
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(20)
    pdf.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b)
    pdf.text('Task Summary', margin, margin + 8)
    
    // Subtitle
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(colors.muted.r, colors.muted.g, colors.muted.b)
    pdf.text(`${tasks.length} tasks in ${projectName}`, margin, margin + 15)
    
    // Task list
    const listTop = margin + 25
    const colWidths = { task: 90, start: 35, end: 35, days: 20, assignee: 60 }
    const rowHeight = 7
    
    // Headers
    let x = margin
    pdf.setFillColor(colors.headerBg.r, colors.headerBg.g, colors.headerBg.b)
    pdf.rect(margin, listTop, contentWidth, rowHeight, 'F')
    
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(colors.muted.r, colors.muted.g, colors.muted.b)
    
    pdf.text('Task', x + 2, listTop + 4.5)
    x += colWidths.task
    pdf.text('Start', x + 2, listTop + 4.5)
    x += colWidths.start
    pdf.text('End', x + 2, listTop + 4.5)
    x += colWidths.end
    pdf.text('Days', x + 2, listTop + 4.5)
    x += colWidths.days
    pdf.text('Assignee', x + 2, listTop + 4.5)
    
    // Sort tasks by start date
    const sortedTasks = [...tasks].sort((a, b) => a.startDate.localeCompare(b.startDate))
    
    // Task rows
    let y = listTop + rowHeight
    const maxRows = Math.floor((pageHeight - listTop - rowHeight - 20) / rowHeight)
    
    for (let i = 0; i < Math.min(sortedTasks.length, maxRows); i++) {
      const task = sortedTasks[i]
      const startDate = parseISO(task.startDate)
      const endDate = parseISO(task.endDate)
      const duration = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
      
      // Row background (alternating)
      if (i % 2 === 1) {
        pdf.setFillColor(252, 251, 250)
        pdf.rect(margin, y, contentWidth, rowHeight, 'F')
      }
      
      // Row border
      pdf.setDrawColor(colors.border.r, colors.border.g, colors.border.b)
      pdf.setLineWidth(0.1)
      pdf.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight)
      
      x = margin
      
      // Color indicator + Task name
      const taskColor = hexToRgb(task.color)
      pdf.setFillColor(taskColor.r, taskColor.g, taskColor.b)
      pdf.circle(x + 4, y + 3.5, 1.5, 'F')
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b)
      
      let taskName = task.name
      while (pdf.getTextWidth(taskName) > colWidths.task - 12 && taskName.length > 3) {
        taskName = taskName.slice(0, -4) + '...'
      }
      pdf.text(taskName, x + 8, y + 4.5)
      x += colWidths.task
      
      // Start date
      pdf.setTextColor(colors.muted.r, colors.muted.g, colors.muted.b)
      pdf.text(format(startDate, 'MMM d'), x + 2, y + 4.5)
      x += colWidths.start
      
      // End date
      pdf.text(format(endDate, 'MMM d'), x + 2, y + 4.5)
      x += colWidths.end
      
      // Duration
      pdf.text(String(duration), x + 2, y + 4.5)
      x += colWidths.days
      
      // Assignee
      let assignee = task.assignee || ''
      while (pdf.getTextWidth(assignee) > colWidths.assignee - 4 && assignee.length > 3) {
        assignee = assignee.slice(0, -4) + '...'
      }
      pdf.text(assignee, x + 2, y + 4.5)
      
      y += rowHeight
    }
    
    if (sortedTasks.length > maxRows) {
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(8)
      pdf.setTextColor(colors.light.r, colors.light.g, colors.light.b)
      pdf.text(`+ ${sortedTasks.length - maxRows} more tasks`, margin, y + 5)
    }
    
    // Page footer
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(colors.light.r, colors.light.g, colors.light.b)
    pdf.text(`${projectName} · Task Summary`, margin, pageHeight - 10)
    pdf.text(`Page ${pdf.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' })

    // Save the PDF
    const filename = `${projectName.toLowerCase().replace(/\s+/g, '-')}-calendar.pdf`
    pdf.save(filename)

    return true
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    alert('Error creating PDF. Please try again.')
    return false
  }
}

