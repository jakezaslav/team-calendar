// Google Apps Script code as a string for easy copying
export const GOOGLE_APPS_SCRIPT = `/**
 * GOOGLE APPS SCRIPT - Team Calendar Sync
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Click "Deploy" > "New deployment"
 * 5. Choose "Web app" as the type
 * 6. Set "Execute as" to "Me"
 * 7. Set "Who has access" to "Anyone"
 * 8. Click "Deploy" and authorize when prompted
 * 9. Copy the Web App URL and paste it into the calendar app
 */

// Handle POST requests from the calendar app
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { tasks, month, year, projectName } = data;
    
    console.log('Received sync request:', projectName, month, year);
    console.log('Tasks count:', tasks ? tasks.length : 0);
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.clear();
    
    // Build the sheet
    buildCalendarWithTasks(sheet, tasks, month, year, projectName);
    buildTaskList(sheet, tasks);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, tasksProcessed: tasks.length }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET requests (for testing)
function doGet(e) {
  return ContentService
    .createTextOutput('Calendar Sync is working! Use POST to sync data.')
    .setMimeType(ContentService.MimeType.TEXT);
}

// Build calendar with proper multi-task support
function buildCalendarWithTasks(sheet, tasks, month, year, projectName) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Title
  sheet.getRange('A1:G1').merge();
  sheet.getRange('A1').setValue(projectName + ' - ' + monthNames[month] + ' ' + year);
  sheet.getRange('A1').setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('A1').setBackground('#faf8f5');
  
  // Day headers
  for (let i = 0; i < 7; i++) {
    const cell = sheet.getRange(2, i + 1);
    cell.setValue(dayNames[i]);
    cell.setFontWeight('bold');
    cell.setHorizontalAlignment('center');
    cell.setBackground('#f5f2ed');
  }
  
  // Calculate calendar structure
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  // Build week data structure
  const weeks = [];
  let currentWeek = { dates: [], startCol: startDayOfWeek + 1 };
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    const col = ((startDayOfWeek + day - 1) % 7) + 1;
    
    currentWeek.dates.push({ day: day, dateStr: dateStr, col: col });
    
    if (col === 7 || day === daysInMonth) {
      weeks.push(currentWeek);
      currentWeek = { dates: [], startCol: 1 };
    }
  }
  
  // Calculate max tasks per week to determine row heights
  const tasksByWeek = weeks.map(week => {
    const weekStart = week.dates[0].dateStr;
    const weekEnd = week.dates[week.dates.length - 1].dateStr;
    return getTasksForWeek(tasks, weekStart, weekEnd);
  });
  
  // Assign task rows for each week (to avoid overlaps)
  const taskRowAssignments = tasksByWeek.map((weekTasks, weekIndex) => {
    return assignTaskRows(weekTasks, weeks[weekIndex]);
  });
  
  // Calculate row positions
  let currentRow = 3;
  const weekRowInfo = [];
  
  for (let w = 0; w < weeks.length; w++) {
    const numTaskRows = Math.max(1, taskRowAssignments[w].length);
    weekRowInfo.push({
      dateRow: currentRow,
      taskStartRow: currentRow + 1,
      numTaskRows: numTaskRows
    });
    currentRow += 1 + numTaskRows + 1; // date row + task rows + spacing
  }
  
  // Draw calendar dates
  for (let w = 0; w < weeks.length; w++) {
    const week = weeks[w];
    const rowInfo = weekRowInfo[w];
    
    // Draw date numbers
    for (const dateInfo of week.dates) {
      const cell = sheet.getRange(rowInfo.dateRow, dateInfo.col);
      cell.setValue(dateInfo.day);
      cell.setVerticalAlignment('top');
      cell.setHorizontalAlignment('center');
      cell.setFontWeight('bold');
    }
    
    // Set row heights
    sheet.setRowHeight(rowInfo.dateRow, 25);
    for (let r = 0; r < rowInfo.numTaskRows; r++) {
      sheet.setRowHeight(rowInfo.taskStartRow + r, 24);
    }
  }
  
  // Draw tasks
  for (let w = 0; w < weeks.length; w++) {
    const week = weeks[w];
    const rowInfo = weekRowInfo[w];
    const rowAssignments = taskRowAssignments[w];
    
    for (let rowIdx = 0; rowIdx < rowAssignments.length; rowIdx++) {
      const tasksInRow = rowAssignments[rowIdx];
      const taskRow = rowInfo.taskStartRow + rowIdx;
      
      for (const task of tasksInRow) {
        const position = getTaskPositionInWeek(task, week);
        if (!position) continue;
        
        const { startCol, span } = position;
        
        // Merge cells if spanning multiple days
        if (span > 1) {
          sheet.getRange(taskRow, startCol, 1, span).merge();
        }
        
        const cell = sheet.getRange(taskRow, startCol);
        cell.setValue(task.name);
        cell.setBackground(task.color);
        cell.setFontSize(9);
        cell.setFontWeight('bold');
        cell.setVerticalAlignment('middle');
        cell.setHorizontalAlignment('center');
        cell.setWrap(true);
        
        const brightness = getColorBrightness(task.color);
        cell.setFontColor(brightness > 128 ? '#2d2a26' : '#ffffff');
      }
    }
  }
  
  // Add borders
  const lastRow = weekRowInfo[weekRowInfo.length - 1].taskStartRow + weekRowInfo[weekRowInfo.length - 1].numTaskRows;
  sheet.getRange(2, 1, lastRow - 1, 7).setBorder(true, true, true, true, true, true, '#e8e4de', SpreadsheetApp.BorderStyle.SOLID);
  
  // Set column widths
  for (let i = 1; i <= 7; i++) {
    sheet.setColumnWidth(i, 110);
  }
}

// Get tasks that appear in a given week
function getTasksForWeek(tasks, weekStartStr, weekEndStr) {
  const weekStart = new Date(weekStartStr + 'T00:00:00');
  const weekEnd = new Date(weekEndStr + 'T00:00:00');
  
  return tasks.filter(task => {
    const taskStart = new Date(task.startDate + 'T00:00:00');
    const taskEnd = new Date(task.endDate + 'T00:00:00');
    return taskStart <= weekEnd && taskEnd >= weekStart;
  }).sort((a, b) => {
    // Sort by start date, then by duration (longer first)
    if (a.startDate < b.startDate) return -1;
    if (a.startDate > b.startDate) return 1;
    const durA = daysBetween(a.startDate, a.endDate);
    const durB = daysBetween(b.startDate, b.endDate);
    return durB - durA;
  });
}

// Assign tasks to rows to avoid overlaps
function assignTaskRows(weekTasks, week) {
  const rows = [];
  
  for (const task of weekTasks) {
    const position = getTaskPositionInWeek(task, week);
    if (!position) continue;
    
    const taskStart = position.startCol;
    const taskEnd = position.startCol + position.span - 1;
    
    // Find first row where this task fits
    let rowIndex = -1;
    for (let r = 0; r < rows.length; r++) {
      const hasOverlap = rows[r].some(existingTask => {
        const existingPos = getTaskPositionInWeek(existingTask, week);
        if (!existingPos) return false;
        const existingStart = existingPos.startCol;
        const existingEnd = existingPos.startCol + existingPos.span - 1;
        return !(taskEnd < existingStart || taskStart > existingEnd);
      });
      
      if (!hasOverlap) {
        rowIndex = r;
        break;
      }
    }
    
    if (rowIndex === -1) {
      rowIndex = rows.length;
      rows.push([]);
    }
    
    rows[rowIndex].push(task);
  }
  
  return rows;
}

// Get task position within a week
function getTaskPositionInWeek(task, week) {
  const taskStart = new Date(task.startDate + 'T00:00:00');
  const taskEnd = new Date(task.endDate + 'T00:00:00');
  
  const weekDates = week.dates;
  const weekStartDate = new Date(weekDates[0].dateStr + 'T00:00:00');
  const weekEndDate = new Date(weekDates[weekDates.length - 1].dateStr + 'T00:00:00');
  
  // Check if task overlaps this week
  if (taskEnd < weekStartDate || taskStart > weekEndDate) {
    return null;
  }
  
  // Find start column
  let startCol = null;
  let endCol = null;
  
  for (const dateInfo of weekDates) {
    const date = new Date(dateInfo.dateStr + 'T00:00:00');
    if (date >= taskStart && date <= taskEnd) {
      if (startCol === null) startCol = dateInfo.col;
      endCol = dateInfo.col;
    }
  }
  
  if (startCol === null) return null;
  
  return {
    startCol: startCol,
    span: endCol - startCol + 1
  };
}

// Build the task list (columns I-N)
function buildTaskList(sheet, tasks) {
  const startCol = 9;
  
  // Title
  sheet.getRange(1, startCol, 1, 5).merge();
  sheet.getRange(1, startCol).setValue('TASK LIST');
  sheet.getRange(1, startCol).setFontSize(14).setFontWeight('bold').setBackground('#faf8f5');
  
  // Headers
  const headers = ['Task', 'Start', 'End', 'Days', 'Assignee'];
  for (let i = 0; i < headers.length; i++) {
    const cell = sheet.getRange(2, startCol + i);
    cell.setValue(headers[i]);
    cell.setFontWeight('bold');
    cell.setBackground('#f5f2ed');
  }
  
  // Sort tasks by start date
  const sortedTasks = [...tasks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  
  // Add task rows
  for (let i = 0; i < sortedTasks.length; i++) {
    const task = sortedTasks[i];
    const row = i + 3;
    const duration = daysBetween(task.startDate, task.endDate) + 1;
    
    sheet.getRange(row, startCol).setValue(task.name);
    sheet.getRange(row, startCol).setBackground(task.color);
    const brightness = getColorBrightness(task.color);
    sheet.getRange(row, startCol).setFontColor(brightness > 128 ? '#2d2a26' : '#ffffff');
    
    sheet.getRange(row, startCol + 1).setValue(formatDate(task.startDate));
    sheet.getRange(row, startCol + 2).setValue(formatDate(task.endDate));
    sheet.getRange(row, startCol + 3).setValue(duration);
    sheet.getRange(row, startCol + 3).setHorizontalAlignment('center');
    sheet.getRange(row, startCol + 4).setValue(task.assignee || '');
  }
  
  // Add borders
  const lastRow = Math.max(sortedTasks.length + 2, 3);
  sheet.getRange(2, startCol, lastRow - 1, 5).setBorder(true, true, true, true, true, true, '#e8e4de', SpreadsheetApp.BorderStyle.SOLID);
  
  // Set column widths
  sheet.setColumnWidth(8, 30); // Spacer
  sheet.setColumnWidth(startCol, 180);
  sheet.setColumnWidth(startCol + 1, 80);
  sheet.setColumnWidth(startCol + 2, 80);
  sheet.setColumnWidth(startCol + 3, 45);
  sheet.setColumnWidth(startCol + 4, 100);
}

// Helper functions
function daysBetween(startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[date.getMonth()] + ' ' + date.getDate();
}

function getColorBrightness(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}`;
