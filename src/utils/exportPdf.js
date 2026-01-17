import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * Export the calendar to PDF
 */
export async function exportToPdf(calendarElement, title = 'Calendar') {
  if (!calendarElement) {
    console.error('No calendar element provided')
    return
  }

  try {
    // Hide elements we don't want in the PDF
    const elementsToHide = document.querySelectorAll('.task-sidebar, .project-switcher, .add-task-btn, .nav-btn')
    elementsToHide.forEach(el => el.style.visibility = 'hidden')

    // Capture the calendar
    const canvas = await html2canvas(calendarElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#faf8f5'
    })

    // Restore hidden elements
    elementsToHide.forEach(el => el.style.visibility = '')

    // Calculate PDF dimensions (A4 landscape for better calendar fit)
    const imgWidth = 297 // A4 landscape width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    // Add title
    pdf.setFontSize(16)
    pdf.setTextColor(45, 42, 38)
    pdf.text(title, 14, 15)

    // Add the calendar image
    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', 10, 25, imgWidth - 20, imgHeight - 20)

    // Add generation date
    pdf.setFontSize(8)
    pdf.setTextColor(154, 148, 141)
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 205)

    // Save the PDF
    pdf.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`)

    return true
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    return false
  }
}

/**
 * Print the calendar using browser print
 */
export function printCalendar() {
  window.print()
}

