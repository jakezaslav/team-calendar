/**
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
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);
    const { tasks, month, year, projectName } = data;
    
    // Log for debugging (View > Executions in Apps Script)
    console.log('Received sync request:', projectName, month, year);
    console.log('Tasks count:', tasks ? tasks.length : 0);
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Clear existing content
    sheet.clear();
    
    // Build the calendar and task list
    buildCalendarGrid(sheet, tasks, month, year, projectName);
    buildTaskList(sheet, tasks);
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 14);
    
    // Return success
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

// Build the calendar grid (columns A-G)
function buildCalendarGrid(sheet, tasks, month, year, projectName) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Title row
  sheet.getRange('A1:G1').merge();
  sheet.getRange('A1').setValue(`${projectName || 'Calendar'} - ${monthNames[month]} ${year}`);
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
  
  // Calculate calendar days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  // Build calendar grid
  let currentRow = 3;
  let currentCol = startDayOfWeek + 1;
  
  // Track which rows have task content
  const taskRows = {};
  
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = sheet.getRange(currentRow, currentCol);
    cell.setValue(day);
    cell.setVerticalAlignment('top');
    cell.setHorizontalAlignment('center');
    
    // Store the row for this date for task placement
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!taskRows[currentRow]) {
      taskRows[currentRow] = { startCol: currentCol, dates: {} };
    }
    taskRows[currentRow].dates[dateStr] = currentCol;
    
    currentCol++;
    if (currentCol > 7) {
      currentCol = 1;
      currentRow += 2; // Leave a row for tasks
    }
  }
  
  // Set row heights
  const totalRows = currentRow + 1;
  for (let r = 3; r <= totalRows; r++) {
    if ((r - 3) % 2 === 0) {
      sheet.setRowHeight(r, 25); // Date row
    } else {
      sheet.setRowHeight(r, 30); // Task row
    }
  }
  
  // Place tasks on the calendar
  placeTasksOnCalendar(sheet, tasks, month, year, 3);
  
  // Add borders
  const lastCalRow = currentRow + 1;
  sheet.getRange(2, 1, lastCalRow - 1, 7).setBorder(true, true, true, true, true, true, '#e8e4de', SpreadsheetApp.BorderStyle.SOLID);
}

// Place tasks on the calendar grid
function placeTasksOnCalendar(sheet, tasks, month, year) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  // Build a map of date -> column for each week row
  const weekMap = []; // Array of { row, dates: { 'YYYY-MM-DD': col } }
  let currentRow = 3;
  let currentCol = startDayOfWeek + 1;
  let currentWeek = { row: currentRow, dates: {} };
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    currentWeek.dates[dateStr] = currentCol;
    
    currentCol++;
    if (currentCol > 7 || day === daysInMonth) {
      weekMap.push(currentWeek);
      currentCol = 1;
      currentRow += 2;
      currentWeek = { row: currentRow, dates: {} };
    }
  }
  
  // Sort tasks by start date, then by duration (longer first)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.startDate < b.startDate) return -1;
    if (a.startDate > b.startDate) return 1;
    const durA = daysBetween(a.startDate, a.endDate);
    const durB = daysBetween(b.startDate, b.endDate);
    return durB - durA;
  });
  
  // Place each task
  for (const task of sortedTasks) {
    const taskStart = new Date(task.startDate + 'T00:00:00');
    const taskEnd = new Date(task.endDate + 'T00:00:00');
    
    // Find weeks that this task spans
    for (const week of weekMap) {
      const weekDates = Object.keys(week.dates).sort();
      if (weekDates.length === 0) continue;
      
      const weekStart = new Date(weekDates[0] + 'T00:00:00');
      const weekEnd = new Date(weekDates[weekDates.length - 1] + 'T00:00:00');
      
      // Check if task overlaps this week
      if (taskEnd < weekStart || taskStart > weekEnd) continue;
      
      // Find start and end columns for this task in this week
      let startCol = null;
      let endCol = null;
      
      for (const dateStr of weekDates) {
        const date = new Date(dateStr + 'T00:00:00');
        if (date >= taskStart && date <= taskEnd) {
          if (startCol === null) startCol = week.dates[dateStr];
          endCol = week.dates[dateStr];
        }
      }
      
      if (startCol !== null && endCol !== null) {
        const taskRow = week.row + 1; // Task row is below date row
        const numCols = endCol - startCol + 1;
        
        // Merge cells and add task name
        if (numCols > 1) {
          sheet.getRange(taskRow, startCol, 1, numCols).merge();
        }
        
        const cell = sheet.getRange(taskRow, startCol);
        cell.setValue(task.name);
        cell.setBackground(task.color);
        cell.setFontSize(9);
        cell.setFontWeight('bold');
        cell.setVerticalAlignment('middle');
        cell.setHorizontalAlignment('center');
        cell.setWrap(true);
        
        // Set text color based on background brightness
        const brightness = getColorBrightness(task.color);
        cell.setFontColor(brightness > 128 ? '#2d2a26' : '#ffffff');
      }
    }
  }
}

// Build the task list (columns I-N)
function buildTaskList(sheet, tasks) {
  const startCol = 9; // Column I
  
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
  const sortedTasks = [...tasks].sort((a, b) => 
    a.startDate.localeCompare(b.startDate)
  );
  
  // Add task rows
  for (let i = 0; i < sortedTasks.length; i++) {
    const task = sortedTasks[i];
    const row = i + 3;
    const duration = daysBetween(task.startDate, task.endDate) + 1;
    
    // Color indicator + name
    sheet.getRange(row, startCol).setValue(task.name);
    sheet.getRange(row, startCol).setBackground(task.color);
    const brightness = getColorBrightness(task.color);
    sheet.getRange(row, startCol).setFontColor(brightness > 128 ? '#2d2a26' : '#ffffff');
    
    // Dates
    sheet.getRange(row, startCol + 1).setValue(formatDate(task.startDate));
    sheet.getRange(row, startCol + 2).setValue(formatDate(task.endDate));
    
    // Duration
    sheet.getRange(row, startCol + 3).setValue(duration);
    sheet.getRange(row, startCol + 3).setHorizontalAlignment('center');
    
    // Assignee
    sheet.getRange(row, startCol + 4).setValue(task.assignee || '');
  }
  
  // Add borders
  const lastRow = sortedTasks.length + 2;
  sheet.getRange(2, startCol, lastRow - 1, 5).setBorder(true, true, true, true, true, true, '#e8e4de', SpreadsheetApp.BorderStyle.SOLID);
  
  // Set column widths
  sheet.setColumnWidth(startCol, 180);     // Task name
  sheet.setColumnWidth(startCol + 1, 90);  // Start
  sheet.setColumnWidth(startCol + 2, 90);  // End
  sheet.setColumnWidth(startCol + 3, 50);  // Days
  sheet.setColumnWidth(startCol + 4, 100); // Assignee
  
  // Add spacer column
  sheet.setColumnWidth(8, 30);
}

// Helper: Calculate days between two date strings
function daysBetween(startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

// Helper: Format date string to readable format
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// Helper: Get color brightness (0-255)
function getColorBrightness(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

