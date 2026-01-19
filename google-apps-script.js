/**
 * GOOGLE APPS SCRIPT - Plan It! Sync
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
    const { tasks, projectName } = data;
    
    console.log('Received sync request:', projectName);
    console.log('Tasks count:', tasks ? tasks.length : 0);
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Find all months that have tasks
    const monthsWithTasks = getMonthsWithTasks(tasks);
    
    // Clean up old monthly tabs (delete sheets that match month pattern)
    cleanupMonthlyTabs(spreadsheet, monthNames);
    
    // === BUILD MAIN TAB ===
    let mainSheet = spreadsheet.getSheetByName('Main');
    if (!mainSheet) {
      // Rename the first sheet to "Main" if it exists, otherwise create it
      mainSheet = spreadsheet.getSheets()[0];
      if (mainSheet) {
        mainSheet.setName('Main');
      } else {
        mainSheet = spreadsheet.insertSheet('Main');
      }
    }
    spreadsheet.setActiveSheet(mainSheet);
    mainSheet.clear();
    
    // Build all calendars sequentially on Main tab
    let currentRow = 1;
    for (const monthInfo of monthsWithTasks) {
      currentRow = buildCalendarWithTasks(mainSheet, tasks, monthInfo.month, monthInfo.year, projectName, currentRow);
      currentRow += 2; // Add spacing between months
    }
    
    // Build task list and assignee due dates to the right on Main tab
    buildTaskList(mainSheet, tasks);
    buildAssigneeDueDates(mainSheet, tasks);
    
    // === BUILD MONTHLY TABS ===
    for (const monthInfo of monthsWithTasks) {
      const tabName = monthNames[monthInfo.month] + ' ' + monthInfo.year;
      const monthSheet = spreadsheet.insertSheet(tabName);
      
      // Build calendar for this month
      buildCalendarWithTasks(monthSheet, tasks, monthInfo.month, monthInfo.year, projectName, 1);
      
      // Build assignee due dates filtered to tasks due this month
      const tasksDueThisMonth = getTasksDueInMonth(tasks, monthInfo.month, monthInfo.year);
      buildMonthlyAssigneeDueDates(monthSheet, tasksDueThisMonth, monthInfo.month, monthInfo.year);
    }
    
    // Set Main as the active sheet when done
    spreadsheet.setActiveSheet(mainSheet);
    
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

// Clean up old monthly tabs before re-creating them
function cleanupMonthlyTabs(spreadsheet, monthNames) {
  const sheets = spreadsheet.getSheets();
  const monthPattern = new RegExp('^(' + monthNames.join('|') + ') \\d{4}$');
  
  for (const sheet of sheets) {
    const name = sheet.getName();
    if (monthPattern.test(name)) {
      // Don't delete if it's the only sheet
      if (spreadsheet.getSheets().length > 1) {
        spreadsheet.deleteSheet(sheet);
      }
    }
  }
}

// Handle GET requests (for testing)
function doGet(e) {
  return ContentService
    .createTextOutput('Calendar Sync is working! Use POST to sync data.')
    .setMimeType(ContentService.MimeType.TEXT);
}

// Get all unique months that have tasks, sorted chronologically
function getMonthsWithTasks(tasks) {
  const monthSet = new Set();
  
  for (const task of tasks) {
    // Add months for start date
    const startDate = new Date(task.startDate + 'T00:00:00');
    monthSet.add(startDate.getFullYear() + '-' + String(startDate.getMonth()).padStart(2, '0'));
    
    // Add months for end date (in case task spans multiple months)
    const endDate = new Date(task.endDate + 'T00:00:00');
    monthSet.add(endDate.getFullYear() + '-' + String(endDate.getMonth()).padStart(2, '0'));
    
    // Add any months in between
    let current = new Date(startDate);
    while (current <= endDate) {
      monthSet.add(current.getFullYear() + '-' + String(current.getMonth()).padStart(2, '0'));
      current.setMonth(current.getMonth() + 1);
    }
  }
  
  // Convert to array and sort
  const months = Array.from(monthSet).sort().map(key => {
    const [year, month] = key.split('-');
    return { year: parseInt(year), month: parseInt(month) };
  });
  
  return months;
}

// Build calendar with proper multi-task support
// Returns the last row used
function buildCalendarWithTasks(sheet, tasks, month, year, projectName, startRow) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Filter tasks for this month
  const monthTasks = getTasksForMonth(tasks, month, year);
  
  // Title
  sheet.getRange(startRow, 1, 1, 7).merge();
  sheet.getRange(startRow, 1).setValue(projectName + ' - ' + monthNames[month] + ' ' + year);
  sheet.getRange(startRow, 1).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(startRow, 1).setBackground('#faf8f5');
  
  // Day headers
  for (let i = 0; i < 7; i++) {
    const cell = sheet.getRange(startRow + 1, i + 1);
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
    return getTasksForWeek(monthTasks, weekStart, weekEnd);
  });
  
  // Assign task rows for each week (to avoid overlaps)
  const taskRowAssignments = tasksByWeek.map((weekTasks, weekIndex) => {
    return assignTaskRows(weekTasks, weeks[weekIndex]);
  });
  
  // Calculate row positions
  let currentRow = startRow + 2;
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
  sheet.getRange(startRow + 1, 1, lastRow - startRow, 7).setBorder(true, true, true, true, true, true, '#e8e4de', SpreadsheetApp.BorderStyle.SOLID);
  
  // Set column widths
  for (let i = 1; i <= 7; i++) {
    sheet.setColumnWidth(i, 110);
  }
  
  return lastRow;
}

// Get tasks for a specific month (tasks that overlap with the month)
function getTasksForMonth(tasks, month, year) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  
  return tasks.filter(task => {
    const taskStart = new Date(task.startDate + 'T00:00:00');
    const taskEnd = new Date(task.endDate + 'T00:00:00');
    return taskStart <= monthEnd && taskEnd >= monthStart;
  });
}

// Get tasks that are DUE (end date) in a specific month
function getTasksDueInMonth(tasks, month, year) {
  return tasks.filter(task => {
    const endDate = new Date(task.endDate + 'T00:00:00');
    return endDate.getMonth() === month && endDate.getFullYear() === year;
  });
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

// Build the task list (columns I-M)
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

// Build due dates grouped by assignee (columns O-P) for Main tab
function buildAssigneeDueDates(sheet, tasks) {
  const startCol = 15; // Column O
  
  // Title
  sheet.getRange(1, startCol, 1, 2).merge();
  sheet.getRange(1, startCol).setValue('DUE DATES BY ASSIGNEE');
  sheet.getRange(1, startCol).setFontSize(14).setFontWeight('bold').setBackground('#faf8f5');
  
  // Group tasks by assignee
  const tasksByAssignee = {};
  for (const task of tasks) {
    const assignee = task.assignee || 'Unassigned';
    if (!tasksByAssignee[assignee]) {
      tasksByAssignee[assignee] = [];
    }
    tasksByAssignee[assignee].push(task);
  }
  
  // Sort assignees alphabetically
  const assignees = Object.keys(tasksByAssignee).sort();
  
  let currentRow = 2;
  
  for (const assignee of assignees) {
    // Assignee header
    sheet.getRange(currentRow, startCol, 1, 2).merge();
    sheet.getRange(currentRow, startCol).setValue(assignee);
    sheet.getRange(currentRow, startCol).setFontWeight('bold');
    sheet.getRange(currentRow, startCol).setBackground('#f5f2ed');
    currentRow++;
    
    // Column headers
    sheet.getRange(currentRow, startCol).setValue('Task');
    sheet.getRange(currentRow, startCol + 1).setValue('Due Date');
    sheet.getRange(currentRow, startCol).setFontWeight('bold');
    sheet.getRange(currentRow, startCol + 1).setFontWeight('bold');
    sheet.getRange(currentRow, startCol, 1, 2).setBackground('#faf8f5');
    currentRow++;
    
    // Sort tasks by end date (due date)
    const assigneeTasks = tasksByAssignee[assignee].sort((a, b) => 
      a.endDate.localeCompare(b.endDate)
    );
    
    for (const task of assigneeTasks) {
      // Task name with color
      sheet.getRange(currentRow, startCol).setValue(task.name);
      sheet.getRange(currentRow, startCol).setBackground(task.color);
      const brightness = getColorBrightness(task.color);
      sheet.getRange(currentRow, startCol).setFontColor(brightness > 128 ? '#2d2a26' : '#ffffff');
      
      // Due date
      sheet.getRange(currentRow, startCol + 1).setValue(formatDate(task.endDate));
      
      currentRow++;
    }
    
    currentRow++; // Add spacing between assignees
  }
  
  // Add borders
  sheet.getRange(2, startCol, currentRow - 2, 2).setBorder(true, true, true, true, true, true, '#e8e4de', SpreadsheetApp.BorderStyle.SOLID);
  
  // Set column widths
  sheet.setColumnWidth(14, 30); // Spacer
  sheet.setColumnWidth(startCol, 180);
  sheet.setColumnWidth(startCol + 1, 80);
}

// Build due dates grouped by assignee for monthly tabs (columns I-J)
// Only shows tasks that are DUE in this specific month
function buildMonthlyAssigneeDueDates(sheet, tasksDueThisMonth, month, year) {
  const startCol = 9; // Column I (right after calendar)
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Title
  sheet.getRange(1, startCol, 1, 2).merge();
  sheet.getRange(1, startCol).setValue('DUE IN ' + monthNames[month].toUpperCase() + ' ' + year);
  sheet.getRange(1, startCol).setFontSize(14).setFontWeight('bold').setBackground('#faf8f5');
  
  if (tasksDueThisMonth.length === 0) {
    sheet.getRange(2, startCol).setValue('No tasks due this month');
    sheet.getRange(2, startCol).setFontStyle('italic');
    sheet.setColumnWidth(8, 30); // Spacer
    sheet.setColumnWidth(startCol, 180);
    return;
  }
  
  // Group tasks by assignee
  const tasksByAssignee = {};
  for (const task of tasksDueThisMonth) {
    const assignee = task.assignee || 'Unassigned';
    if (!tasksByAssignee[assignee]) {
      tasksByAssignee[assignee] = [];
    }
    tasksByAssignee[assignee].push(task);
  }
  
  // Sort assignees alphabetically
  const assignees = Object.keys(tasksByAssignee).sort();
  
  let currentRow = 2;
  
  for (const assignee of assignees) {
    // Assignee header
    sheet.getRange(currentRow, startCol, 1, 2).merge();
    sheet.getRange(currentRow, startCol).setValue(assignee);
    sheet.getRange(currentRow, startCol).setFontWeight('bold');
    sheet.getRange(currentRow, startCol).setBackground('#f5f2ed');
    currentRow++;
    
    // Column headers
    sheet.getRange(currentRow, startCol).setValue('Task');
    sheet.getRange(currentRow, startCol + 1).setValue('Due Date');
    sheet.getRange(currentRow, startCol).setFontWeight('bold');
    sheet.getRange(currentRow, startCol + 1).setFontWeight('bold');
    sheet.getRange(currentRow, startCol, 1, 2).setBackground('#faf8f5');
    currentRow++;
    
    // Sort tasks by end date (due date)
    const assigneeTasks = tasksByAssignee[assignee].sort((a, b) => 
      a.endDate.localeCompare(b.endDate)
    );
    
    for (const task of assigneeTasks) {
      // Task name with color
      sheet.getRange(currentRow, startCol).setValue(task.name);
      sheet.getRange(currentRow, startCol).setBackground(task.color);
      const brightness = getColorBrightness(task.color);
      sheet.getRange(currentRow, startCol).setFontColor(brightness > 128 ? '#2d2a26' : '#ffffff');
      
      // Due date
      sheet.getRange(currentRow, startCol + 1).setValue(formatDate(task.endDate));
      
      currentRow++;
    }
    
    currentRow++; // Add spacing between assignees
  }
  
  // Add borders
  if (currentRow > 3) {
    sheet.getRange(2, startCol, currentRow - 2, 2).setBorder(true, true, true, true, true, true, '#e8e4de', SpreadsheetApp.BorderStyle.SOLID);
  }
  
  // Set column widths
  sheet.setColumnWidth(8, 30); // Spacer
  sheet.setColumnWidth(startCol, 180);
  sheet.setColumnWidth(startCol + 1, 80);
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
}
