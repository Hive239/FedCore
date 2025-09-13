import jsPDF from 'jspdf'
import { format } from 'date-fns'

interface UpdateLogPDFData {
  id: string
  projectId: string
  projectName: string
  projectCode: string
  title: string
  description: string
  date: Date
  teamMember: string
  photos: string[]
  weather?: {
    temp: number
    description: string
    humidity: number
    windSpeed: number
  }
  tasksCompleted: string[]
  issues?: string[]
  createdBy: string
  createdAt: Date
  // Template data
  companyHeader: string
  companySubheader?: string
  companyInfo?: {
    name: string
    address: string
    phone: string
    email: string
    website?: string
  }
  signatureTitle?: string
  signature: string
  footerText?: string
  ref: string
  attn: string
  includePageNumbers?: boolean
  includeGenerationDate?: boolean
}

export const generatePDF = async (data: UpdateLogPDFData): Promise<void> => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margin = 20
  let yPosition = margin

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10): number => {
    doc.setFontSize(fontSize)
    const lines = doc.splitTextToSize(text, maxWidth)
    doc.text(lines, x, y)
    return y + (lines.length * fontSize * 0.4) // Return next Y position
  }

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number): number => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage()
      return margin
    }
    return yPosition
  }

  // ===== HEADER SECTION =====
  // Company header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(data.companyHeader, margin, yPosition)
  yPosition += 20

  // Document info line
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`REF: ${data.ref}`, margin, yPosition)
  doc.text(`ATTN: ${data.attn}`, pageWidth - margin - 80, yPosition)
  doc.text(`DATE: ${format(data.date, 'MMMM d, yyyy')}`, pageWidth - margin - 80, yPosition + 10)
  yPosition += 25

  // Title line
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 15

  // ===== PROJECT INFORMATION =====
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PROJECT INFORMATION', margin, yPosition)
  yPosition += 15

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Project Code: ${data.projectCode}`, margin, yPosition)
  yPosition += 10
  doc.text(`Project Name: ${data.projectName}`, margin, yPosition)
  yPosition += 10
  doc.text(`Team Member: ${data.teamMember}`, margin, yPosition)
  yPosition += 10
  doc.text(`Report Date: ${format(data.createdAt, 'MMMM d, yyyy - h:mm a')}`, margin, yPosition)
  yPosition += 20

  // ===== UPDATE DETAILS =====
  yPosition = checkPageBreak(40)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('UPDATE DETAILS', margin, yPosition)
  yPosition += 15

  // Update title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Title:', margin, yPosition)
  doc.setFont('helvetica', 'normal')
  yPosition = addWrappedText(data.title, margin + 25, yPosition, pageWidth - margin - 25, 12)
  yPosition += 10

  // Description
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Description:', margin, yPosition)
  yPosition += 8
  doc.setFont('helvetica', 'normal')
  yPosition = addWrappedText(data.description, margin, yPosition, pageWidth - 2 * margin, 10)
  yPosition += 15

  // ===== TASKS COMPLETED =====
  if (data.tasksCompleted && data.tasksCompleted.length > 0) {
    yPosition = checkPageBreak(30 + data.tasksCompleted.length * 8)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('TASKS COMPLETED', margin, yPosition)
    yPosition += 15

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    data.tasksCompleted.forEach((task) => {
      // Add checkmark symbol
      doc.text('✓', margin, yPosition)
      yPosition = addWrappedText(task, margin + 10, yPosition, pageWidth - margin - 15, 10)
      yPosition += 5
    })
    yPosition += 10
  }

  // ===== ISSUES/DELAYS =====
  if (data.issues && data.issues.length > 0) {
    yPosition = checkPageBreak(30 + data.issues.length * 8)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('ISSUES & DELAYS', margin, yPosition)
    yPosition += 15

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    data.issues.forEach((issue) => {
      // Add warning symbol
      doc.text('⚠', margin, yPosition)
      yPosition = addWrappedText(issue, margin + 10, yPosition, pageWidth - margin - 15, 10)
      yPosition += 5
    })
    yPosition += 10
  }

  // ===== WEATHER CONDITIONS =====
  if (data.weather) {
    yPosition = checkPageBreak(40)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('WEATHER CONDITIONS', margin, yPosition)
    yPosition += 15

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Temperature: ${data.weather.temp}°F`, margin, yPosition)
    doc.text(`Conditions: ${data.weather.description}`, margin + 80, yPosition)
    yPosition += 10
    doc.text(`Humidity: ${data.weather.humidity}%`, margin, yPosition)
    doc.text(`Wind Speed: ${data.weather.windSpeed} mph`, margin + 80, yPosition)
    yPosition += 20
  }

  // ===== PHOTOS SECTION =====
  if (data.photos && data.photos.length > 0) {
    yPosition = checkPageBreak(60)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('PROGRESS PHOTOS', margin, yPosition)
    yPosition += 15

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`${data.photos.length} photo(s) attached to this report.`, margin, yPosition)
    yPosition += 10

    // Note about photos (since we can't easily embed remote images in jsPDF without CORS issues)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Note: Photos are available in the digital version of this report.', margin, yPosition)
    yPosition += 20

    // List photo references
    data.photos.forEach((photo, index) => {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Photo ${index + 1}: Available in digital format`, margin + 10, yPosition)
      yPosition += 8
    })
    yPosition += 10
  }

  // ===== FOOTER SECTION =====
  yPosition = checkPageBreak(60)
  
  // Signature section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('REPORT SUBMITTED BY', margin, yPosition)
  yPosition += 20

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Signature: _________________________________', margin, yPosition)
  yPosition += 15
  
  doc.text(`Name: ${data.createdBy}`, margin, yPosition)
  doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, margin + 120, yPosition)
  yPosition += 10

  if (data.signature) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    yPosition = addWrappedText(data.signature, margin, yPosition, pageWidth - 2 * margin, 9)
  }

  // ===== PAGE FOOTER =====
  const totalPages = doc.internal.pages.length - 1 // Subtract 1 because pages array includes a null first element
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Project Update Report - ${data.projectCode} - Page ${i} of ${totalPages}`,
      margin,
      pageHeight - 10
    )
    doc.text(
      `Generated on ${format(new Date(), 'MM/dd/yyyy')}`,
      pageWidth - margin - 60,
      pageHeight - 10
    )
  }

  // Save the PDF
  const fileName = `${data.projectCode}_Update_${format(data.date, 'yyyyMMdd')}_${data.id.slice(0, 8)}.pdf`
  doc.save(fileName)
}

// Alternative function to generate PDF with custom template
export const generateCustomPDF = async (
  data: UpdateLogPDFData,
  template: {
    header?: string
    footer?: string
    logoUrl?: string
    colors?: {
      primary: string
      secondary: string
      text: string
    }
  }
): Promise<void> => {
  // This could be extended for custom templates
  await generatePDF({
    ...data,
    companyHeader: template.header || data.companyHeader,
    signature: template.footer || data.signature
  })
}

// Utility function to preview PDF data structure
export const previewPDFData = (data: UpdateLogPDFData): object => {
  return {
    documentInfo: {
      ref: data.ref,
      attn: data.attn,
      date: format(data.date, 'MMMM d, yyyy')
    },
    project: {
      code: data.projectCode,
      name: data.projectName,
      teamMember: data.teamMember
    },
    update: {
      title: data.title,
      description: data.description,
      tasksCount: data.tasksCompleted?.length || 0,
      issuesCount: data.issues?.length || 0,
      photosCount: data.photos?.length || 0
    },
    weather: data.weather ? {
      temperature: `${data.weather.temp}°F`,
      conditions: data.weather.description,
      humidity: `${data.weather.humidity}%`,
      windSpeed: `${data.weather.windSpeed} mph`
    } : null
  }
}