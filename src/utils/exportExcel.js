import * as XLSX from 'xlsx-js-style'

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Header styles to match spreadsheet look (light grey like screenshot)
const HEADER_MONTH_TITLE = { rgb: 'F0F0F0', fontRgb: '2D2A26' }   // light grey
const HEADER_DAY_NAMES = { rgb: 'EEEEEE', fontRgb: '2D2A26' }     // soft grey for Sun-Sat row
const HEADER_SECTION = { rgb: 'EEEEEE', fontRgb: '2D2A26' }       // TASK LIST / DUE DATES headers and column headers

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return MONTH_NAMES_SHORT[date.getMonth()] + ' ' + date.getDate()
}

function daysBetween(startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00')
  const end = new Date(endStr + 'T00:00:00')
  return Math.round((end - start) / (1000 * 60 * 60 * 24))
}

function getColorBrightness(hex) {
  const hexClean = (hex || '').replace('#', '')
  if (hexClean.length !== 6) return 128
  const r = parseInt(hexClean.slice(0, 2), 16)
  const g = parseInt(hexClean.slice(2, 4), 16)
  const b = parseInt(hexClean.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000
}

function hexToRgb(hex) {
  return (hex || '#888888').replace('#', '').toUpperCase().padEnd(6, '0').slice(0, 6)
}

function getColorStyle(hex) {
  const rgb = hexToRgb(hex)
  const brightness = getColorBrightness(hex)
  const fontRgb = brightness > 128 ? '2D2A26' : 'FFFFFF'
  return { rgb, fontRgb }
}

function applyFills(ws, fills) {
  for (const fill of fills) {
    const ref = XLSX.utils.encode_cell({ r: fill.r, c: fill.c })
    if (!ws[ref]) continue
    if (fill.type === 'dateCell') {
      ws[ref].s = {
        alignment: { horizontal: 'right' },
        font: { bold: true },
      }
      continue
    }
    let rgb, fontRgb, bold = true
    if (fill.type === 'monthTitle') {
      rgb = HEADER_MONTH_TITLE.rgb
      fontRgb = HEADER_MONTH_TITLE.fontRgb
      ws[ref].s = {
        fill: { fgColor: { rgb }, patternType: 'solid' },
        font: { color: { rgb: fontRgb }, bold: true },
        alignment: { horizontal: 'center' },
      }
      continue
    }
    if (fill.type === 'dayHeader') {
      rgb = HEADER_DAY_NAMES.rgb
      fontRgb = HEADER_DAY_NAMES.fontRgb
      ws[ref].s = {
        fill: { fgColor: { rgb }, patternType: 'solid' },
        font: { color: { rgb: fontRgb }, bold: true },
        alignment: { horizontal: 'center' },
      }
      continue
    }
    if (fill.type === 'taskListTitle' || fill.type === 'taskListHeader' || fill.type === 'dueDatesTitle' || fill.type === 'dueDatesHeader') {
      rgb = HEADER_SECTION.rgb
      fontRgb = HEADER_SECTION.fontRgb
      ws[ref].s = {
        fill: { fgColor: { rgb }, patternType: 'solid' },
        font: { color: { rgb: fontRgb }, bold: true },
        alignment: { horizontal: 'left' },
      }
      continue
    }
    if (fill.type === 'assigneeHeader') {
      ws[ref].s = {
        font: { bold: true },
        alignment: { horizontal: 'left' },
      }
      continue
    }
    rgb = fill.rgb
    fontRgb = fill.fontRgb
    ws[ref].s = {
      fill: { fgColor: { rgb }, patternType: 'solid' },
      font: { color: { rgb: fontRgb }, bold: true },
      alignment: { horizontal: 'left' },
    }
  }
}

function getMonthsWithTasks(tasks) {
  const monthSet = new Set()
  for (const task of tasks) {
    const startDate = new Date(task.startDate + 'T00:00:00')
    monthSet.add(startDate.getFullYear() + '-' + String(startDate.getMonth()).padStart(2, '0'))
    const endDate = new Date(task.endDate + 'T00:00:00')
    monthSet.add(endDate.getFullYear() + '-' + String(endDate.getMonth()).padStart(2, '0'))
    let current = new Date(startDate)
    while (current <= endDate) {
      monthSet.add(current.getFullYear() + '-' + String(current.getMonth()).padStart(2, '0'))
      current.setMonth(current.getMonth() + 1)
    }
  }
  return Array.from(monthSet).sort().map((key) => {
    const [y, m] = key.split('-')
    return { year: parseInt(y, 10), month: parseInt(m, 10) }
  })
}

function getTasksForMonth(tasks, month, year) {
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)
  return tasks.filter((task) => {
    const taskStart = new Date(task.startDate + 'T00:00:00')
    const taskEnd = new Date(task.endDate + 'T00:00:00')
    return taskStart <= monthEnd && taskEnd >= monthStart
  })
}

function getTasksDueInMonth(tasks, month, year) {
  return tasks.filter((task) => {
    const endDate = new Date(task.endDate + 'T00:00:00')
    return endDate.getMonth() === month && endDate.getFullYear() === year
  })
}

function getTasksForWeek(tasks, weekStartStr, weekEndStr) {
  const weekStart = new Date(weekStartStr + 'T00:00:00')
  const weekEnd = new Date(weekEndStr + 'T00:00:00')
  return tasks
    .filter((task) => {
      const taskStart = new Date(task.startDate + 'T00:00:00')
      const taskEnd = new Date(task.endDate + 'T00:00:00')
      return taskStart <= weekEnd && taskEnd >= weekStart
    })
    .sort((a, b) => {
      if (a.startDate < b.startDate) return -1
      if (a.startDate > b.startDate) return 1
      return daysBetween(b.startDate, b.endDate) - daysBetween(a.startDate, a.endDate)
    })
}

function getTaskPositionInWeek(task, weekDates) {
  const taskStart = new Date(task.startDate + 'T00:00:00')
  const taskEnd = new Date(task.endDate + 'T00:00:00')
  let startCol = null
  let endCol = null
  for (const dateInfo of weekDates) {
    const date = new Date(dateInfo.dateStr + 'T00:00:00')
    if (date >= taskStart && date <= taskEnd) {
      if (startCol === null) startCol = dateInfo.col
      endCol = dateInfo.col
    }
  }
  if (startCol === null) return null
  return { startCol, span: endCol - startCol + 1 }
}

function assignTaskRows(weekTasks, weekDates) {
  const rows = []
  for (const task of weekTasks) {
    const position = getTaskPositionInWeek(task, weekDates)
    if (!position) continue
    const taskStart = position.startCol
    const taskEnd = position.startCol + position.span - 1
    let rowIndex = -1
    for (let r = 0; r < rows.length; r++) {
      const hasOverlap = rows[r].some((existingTask) => {
        const existingPos = getTaskPositionInWeek(existingTask, weekDates)
        if (!existingPos) return false
        const existingEnd = existingPos.startCol + existingPos.span - 1
        return !(taskEnd < existingPos.startCol || taskStart > existingEnd)
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
 * Build calendar block data and merges for one month. Returns { rows, merges, startRow }.
 * startRow is 0-based. rows is 2D array for A-G only (7 cols). merges are for this block only (relative to block top).
 */
function buildCalendarBlock(tasks, month, year, projectName, startRow) {
  const monthTasks = getTasksForMonth(tasks, month, year)
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const weeks = []
  let currentWeek = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0')
    const col = ((startDayOfWeek + day - 1) % 7) + 1
    currentWeek.push({ day, dateStr, col })
    if (col === 7 || day === daysInMonth) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  const tasksByWeek = weeks.map((week) => {
    const weekStart = week[0].dateStr
    const weekEnd = week[week.length - 1].dateStr
    return getTasksForWeek(monthTasks, weekStart, weekEnd)
  })
  const taskRowAssignments = tasksByWeek.map((weekTasks, wi) => assignTaskRows(weekTasks, weeks[wi]))

  const rows = []
  const merges = []
  const fills = []

  const titleRow = startRow
  rows[titleRow] = [projectName + ' - ' + MONTH_NAMES_FULL[month] + ' ' + year, '', '', '', '', '', '']
  merges.push({ s: { r: titleRow, c: 0 }, e: { r: titleRow, c: 6 } })
  fills.push({ r: titleRow, c: 0, type: 'monthTitle' })

  const headerRow = startRow + 1
  rows[headerRow] = DAY_NAMES.slice()
  for (let col = 0; col < 7; col++) {
    fills.push({ r: headerRow, c: col, type: 'dayHeader' })
  }

  let currentRow = startRow + 2
  for (let w = 0; w < weeks.length; w++) {
    const week = weeks[w]
    const rowAssignments = taskRowAssignments[w]
    const numTaskRows = Math.max(1, rowAssignments.length)

    const dateRow = currentRow
    const dateRowData = ['', '', '', '', '', '', '']
    for (const d of week) {
      dateRowData[d.col - 1] = d.day
      fills.push({ r: dateRow, c: d.col - 1, type: 'dateCell' })
    }
    rows[dateRow] = dateRowData
    currentRow++

    for (let tr = 0; tr < numTaskRows; tr++) {
      const taskRowData = ['', '', '', '', '', '', '']
      const tasksInRow = rowAssignments[tr] || []
      for (const task of tasksInRow) {
        const pos = getTaskPositionInWeek(task, week)
        if (!pos) continue
        const c0 = pos.startCol - 1
        taskRowData[c0] = task.name
        const { rgb, fontRgb } = getColorStyle(task.color)
        fills.push({ r: currentRow, c: c0, rgb, fontRgb })
        if (pos.span > 1) {
          merges.push({ s: { r: currentRow, c: c0 }, e: { r: currentRow, c: c0 + pos.span - 1 } })
        }
      }
      rows[currentRow] = taskRowData
      currentRow++
    }
    currentRow++ // spacing
  }

  return { rows, merges, fills, nextStartRow: currentRow }
}

/**
 * Build Main sheet: left = stacked calendars (A-G), center = task list (I-M), right = due dates (O-P).
 */
function buildMainSheet(tasks, projectName) {
  const monthsWithTasks = getMonthsWithTasks(tasks)
  const TASK_LIST_COL = 8 // 0-based, so column I
  const DUE_START_COL = 14 // column O

  const data = []
  const merges = []
  const fills = []

  let calendarEndRow = 0
  if (monthsWithTasks.length > 0) {
    let calStartRow = 0
    for (const { month, year } of monthsWithTasks) {
      const block = buildCalendarBlock(tasks, month, year, projectName, 0)
      const numBlockRows = block.nextStartRow
      for (let r = 0; r < numBlockRows; r++) {
        const rowIdx = calStartRow + r
        if (!data[rowIdx]) data[rowIdx] = []
        for (let c = 0; c < 7; c++) {
          const v = block.rows[r]?.[c]
          data[rowIdx][c] = v !== undefined ? v : ''
        }
      }
      block.merges.forEach((m) => {
        merges.push({
          s: { r: calStartRow + m.s.r, c: m.s.c },
          e: { r: calStartRow + m.e.r, c: m.e.c },
        })
      })
      block.fills.forEach((f) => {
        fills.push({ ...f, r: calStartRow + f.r })
      })
      calStartRow = calStartRow + block.nextStartRow + 2
      calendarEndRow = calStartRow - 3
    }
  }

  const sortedTasks = [...tasks].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const taskListRows = [['TASK LIST', '', '', '', ''], ['Task', 'Start', 'End', 'Days', 'Assignee']]
  for (const task of sortedTasks) {
    taskListRows.push([
      task.name,
      formatDate(task.startDate),
      formatDate(task.endDate),
      daysBetween(task.startDate, task.endDate),
      task.assignee || '',
    ])
  }
  for (let r = 0; r < taskListRows.length; r++) {
    if (!data[r]) data[r] = []
    for (let c = 0; c < 5; c++) {
      data[r][TASK_LIST_COL + c] = taskListRows[r][c]
    }
  }
  fills.push({ r: 0, c: TASK_LIST_COL, type: 'taskListTitle' })
  for (let c = 0; c < 5; c++) {
    fills.push({ r: 1, c: TASK_LIST_COL + c, type: 'taskListHeader' })
  }
  for (let i = 0; i < sortedTasks.length; i++) {
    const { rgb, fontRgb } = getColorStyle(sortedTasks[i].color)
    fills.push({ r: 2 + i, c: TASK_LIST_COL, rgb, fontRgb })
  }
  merges.push({ s: { r: 0, c: TASK_LIST_COL }, e: { r: 0, c: TASK_LIST_COL + 4 } })

  const tasksByAssignee = {}
  for (const task of tasks) {
    const assignee = task.assignee || 'Unassigned'
    if (!tasksByAssignee[assignee]) tasksByAssignee[assignee] = []
    tasksByAssignee[assignee].push(task)
  }
  const assignees = Object.keys(tasksByAssignee).sort()
  const dueRows = [['DUE DATES BY ASSIGNEE', '']]
  fills.push({ r: 0, c: DUE_START_COL, type: 'dueDatesTitle' })
  fills.push({ r: 0, c: DUE_START_COL + 1, type: 'dueDatesTitle' })
  let dueRowIdx = 1
  for (const assignee of assignees) {
    dueRows.push([assignee, ''])
    fills.push({ r: dueRowIdx, c: DUE_START_COL, type: 'assigneeHeader' })
    dueRowIdx++
    dueRows.push(['Task', 'Due Date'])
    fills.push({ r: dueRowIdx, c: DUE_START_COL, type: 'dueDatesHeader' })
    fills.push({ r: dueRowIdx, c: DUE_START_COL + 1, type: 'dueDatesHeader' })
    dueRowIdx++
    const assigneeTasks = tasksByAssignee[assignee].sort((a, b) => a.endDate.localeCompare(b.endDate))
    for (const task of assigneeTasks) {
      dueRows.push([task.name, formatDate(task.endDate)])
      const { rgb, fontRgb } = getColorStyle(task.color)
      fills.push({ r: dueRowIdx, c: DUE_START_COL, rgb, fontRgb })
      dueRowIdx++
    }
    dueRows.push(['', ''])
    dueRowIdx++
  }
  for (let r = 0; r < dueRows.length; r++) {
    if (!data[r]) data[r] = []
    data[r][DUE_START_COL] = dueRows[r][0]
    data[r][DUE_START_COL + 1] = dueRows[r][1]
  }
  merges.push({ s: { r: 0, c: DUE_START_COL }, e: { r: 0, c: DUE_START_COL + 1 } })

  const maxRows = Math.max(data.length, calendarEndRow + 1)
  const maxCols = 16
  const out = []
  for (let r = 0; r < maxRows; r++) {
    out[r] = []
    for (let c = 0; c <= maxCols; c++) {
      out[r][c] = data[r]?.[c] ?? ''
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(out)
  ws['!merges'] = merges
  applyFills(ws, fills)
  const maxTaskNameLen = tasks.length ? Math.max(...tasks.map((t) => (t.name || '').length)) : 20
  const taskColWch = Math.min(60, Math.max(22, maxTaskNameLen + 2))
  if (!ws['!cols']) ws['!cols'] = []
  for (let c = 0; c <= maxCols; c++) {
    if (!ws['!cols'][c]) ws['!cols'][c] = {}
  }
  for (let c = 0; c < 7; c++) {
    ws['!cols'][c] = { wch: 14 }
  }
  ws['!cols'][7] = { wch: 4 }
  ws['!cols'][TASK_LIST_COL] = { wch: taskColWch }
  ws['!cols'][TASK_LIST_COL + 1] = { wch: 10 }
  ws['!cols'][TASK_LIST_COL + 2] = { wch: 10 }
  ws['!cols'][TASK_LIST_COL + 3] = { wch: 6 }
  ws['!cols'][TASK_LIST_COL + 4] = { wch: 14 }
  ws['!cols'][DUE_START_COL] = { wch: taskColWch }
  ws['!cols'][DUE_START_COL + 1] = { wch: 12 }
  return ws
}

/**
 * Build one monthly sheet: calendar A-G, then DUE IN [MONTH] [YEAR] at I-J.
 */
function buildMonthSheet(tasks, month, year, projectName) {
  const tasksDueThisMonth = getTasksDueInMonth(tasks, month, year)
  const DUE_COL = 8

  const block = buildCalendarBlock(tasks, month, year, projectName, 0)
  const maxCalRow = block.nextStartRow
  const data = []
  const fills = [...block.fills]
  for (let r = 0; r < block.rows.length; r++) {
    data[r] = [...(block.rows[r] || ['', '', '', '', '', '', ''])]
  }
  const merges = [...block.merges]

  const dueTitle = 'DUE IN ' + MONTH_NAMES_FULL[month].toUpperCase() + ' ' + year
  const dueRows = [[dueTitle, '']]
  fills.push({ r: 0, c: DUE_COL, type: 'dueDatesTitle' })
  fills.push({ r: 0, c: DUE_COL + 1, type: 'dueDatesTitle' })
  let dueRowIdx = 1
  if (tasksDueThisMonth.length === 0) {
    dueRows.push(['No tasks due this month', ''])
  } else {
    const tasksByAssignee = {}
    for (const task of tasksDueThisMonth) {
      const assignee = task.assignee || 'Unassigned'
      if (!tasksByAssignee[assignee]) tasksByAssignee[assignee] = []
      tasksByAssignee[assignee].push(task)
    }
    const assignees = Object.keys(tasksByAssignee).sort()
    for (const assignee of assignees) {
      dueRows.push([assignee, ''])
      fills.push({ r: dueRowIdx, c: DUE_COL, type: 'assigneeHeader' })
      dueRowIdx++
      dueRows.push(['Task', 'Due Date'])
      fills.push({ r: dueRowIdx, c: DUE_COL, type: 'dueDatesHeader' })
      fills.push({ r: dueRowIdx, c: DUE_COL + 1, type: 'dueDatesHeader' })
      dueRowIdx++
      const assigneeTasks = tasksByAssignee[assignee].sort((a, b) => a.endDate.localeCompare(b.endDate))
      for (const task of assigneeTasks) {
        dueRows.push([task.name, formatDate(task.endDate)])
        const { rgb, fontRgb } = getColorStyle(task.color)
        fills.push({ r: dueRowIdx, c: DUE_COL, rgb, fontRgb })
        dueRowIdx++
      }
      dueRows.push(['', ''])
      dueRowIdx++
    }
  }
  for (let r = 0; r < dueRows.length; r++) {
    if (!data[r]) data[r] = []
    while (data[r].length < DUE_COL) data[r].push('')
    data[r][DUE_COL] = dueRows[r][0]
    data[r][DUE_COL + 1] = dueRows[r][1]
  }
  merges.push({ s: { r: 0, c: DUE_COL }, e: { r: 0, c: DUE_COL + 1 } })

  const maxRows = Math.max(data.length, maxCalRow)
  const maxCols = 10
  const out = []
  for (let r = 0; r < maxRows; r++) {
    out[r] = []
    for (let c = 0; c <= maxCols; c++) {
      out[r][c] = data[r]?.[c] ?? ''
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(out)
  ws['!merges'] = merges
  applyFills(ws, fills)
  const maxTaskNameLen = tasksDueThisMonth.length
    ? Math.max(...tasksDueThisMonth.map((t) => (t.name || '').length))
    : 20
  const taskColWch = Math.min(60, Math.max(22, maxTaskNameLen + 2))
  if (!ws['!cols']) ws['!cols'] = []
  ws['!cols'][DUE_COL] = { wch: taskColWch }
  ws['!cols'][DUE_COL + 1] = { wch: 12 }
  return ws
}

/**
 * Export tasks to .xlsx matching Google Sheets format:
 * - Main sheet: stacked month calendars (A-G), Task list (I-M), Due dates by assignee (O-P)
 * - One sheet per month (e.g. "Jan 2025"): calendar + "DUE IN [MONTH] [YEAR]"
 */
export function downloadTasksAsExcel(tasks, projectName) {
  const name = projectName || 'Calendar'
  const wb = XLSX.utils.book_new()

  const mainWs = buildMainSheet(tasks, name)
  XLSX.utils.book_append_sheet(wb, mainWs, 'Main')

  const monthsWithTasks = getMonthsWithTasks(tasks)
  for (const { month, year } of monthsWithTasks) {
    const tabName = MONTH_NAMES_SHORT[month] + ' ' + year
    const monthWs = buildMonthSheet(tasks, month, year, name)
    XLSX.utils.book_append_sheet(wb, monthWs, tabName)
  }

  const fileName = `Plan It - ${name.replace(/[/\\?*:[\]]/g, '-')}.xlsx`
  XLSX.writeFile(wb, fileName)
}
