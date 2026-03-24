import { jsPDF } from 'jspdf'

const RISK_COLORS = {
  critical: [239, 68,  68],
  high:     [245, 158, 11],
  medium:   [249, 115, 22],
  low:      [100, 116, 139],
}

const RISK_BG = {
  critical: [80, 20, 20],
  high:     [80, 50, 10],
  medium:   [80, 40, 10],
  low:      [40, 45, 55],
}

function riskColor(level) {
  return RISK_COLORS[level] || RISK_COLORS.low
}

function wrap(doc, text, x, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text, maxWidth)
  lines.forEach(line => {
    const pageH = doc.internal.pageSize.getHeight()
    if (doc.y + lineHeight > pageH - 20) {
      doc.addPage()
      doc.y = 30
    }
    doc.text(line, x, doc.y)
    doc.y += lineHeight
  })
}

export function generatePDFReport(result, inputType, content) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()   // 210
  const ph = doc.internal.pageSize.getHeight()  // 297
  const margin = 18
  const contentW = pw - margin * 2
  doc.y = margin

  // ── Header bar ──
  doc.setFillColor(15, 17, 23)
  doc.rect(0, 0, pw, 28, 'F')

  // Shield icon (simplified as text glyph)
  doc.setTextColor(59, 130, 246)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('AI SECURE', margin, 17)

  doc.setTextColor(100, 116, 139)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Data Intelligence Platform', margin + 38, 17)

  // Report title right-aligned
  doc.setTextColor(180, 190, 210)
  doc.setFontSize(8)
  doc.text('Security Analysis Report', pw - margin, 12, { align: 'right' })
  doc.text(new Date().toLocaleString(), pw - margin, 18, { align: 'right' })

  doc.y = 38

  // ── Risk level banner ──
  const level = result.risk_level || 'low'
  const bannerColor = riskColor(level)
  doc.setFillColor(...bannerColor)
  doc.setGState(new doc.GState({ opacity: 0.12 }))
  doc.rect(margin, doc.y, contentW, 22, 'F')
  doc.setGState(new doc.GState({ opacity: 1 }))

  doc.setDrawColor(...bannerColor)
  doc.setLineWidth(0.6)
  doc.rect(margin, doc.y, contentW, 22, 'S')

  // Risk score circle
  doc.setFillColor(...bannerColor)
  doc.circle(margin + 11, doc.y + 11, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(String(result.risk_score ?? 0), margin + 11, doc.y + 12.5, { align: 'center' })

  doc.setTextColor(...bannerColor)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(level.toUpperCase() + ' RISK', margin + 24, doc.y + 10)

  doc.setTextColor(150, 160, 180)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Score: ${result.risk_score}/20  ·  ${(result.findings || []).length} findings  ·  Action: ${result.action || 'allowed'}`,
    margin + 24, doc.y + 17)

  doc.y += 30

  // ── Summary ──
  doc.setFillColor(25, 30, 45)
  doc.rect(margin, doc.y, contentW, 18, 'F')
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('SUMMARY', margin + 4, doc.y + 7)
  doc.setTextColor(200, 210, 225)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  const summaryLines = doc.splitTextToSize(result.summary || 'No summary available.', contentW - 8)
  doc.text(summaryLines[0], margin + 4, doc.y + 13)
  doc.y += 24

  // ── Metadata table ──
  doc.setFillColor(20, 24, 36)
  doc.rect(margin, doc.y, contentW, 7, 'F')
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  const cols = [
    ['INPUT TYPE', inputType?.toUpperCase() || 'LOG'],
    ['ANALYZED AT', new Date().toLocaleTimeString()],
    ['FINDINGS', String((result.findings || []).length)],
    ['RISK LEVEL', level.toUpperCase()],
  ]
  const colW = contentW / cols.length
  cols.forEach(([label, value], i) => {
    const x = margin + i * colW + 3
    doc.setTextColor(100, 116, 139)
    doc.text(label, x, doc.y + 4.5)
  })
  doc.y += 8
  doc.setFillColor(25, 30, 45)
  doc.rect(margin, doc.y, contentW, 8, 'F')
  cols.forEach(([label, value], i) => {
    const x = margin + i * colW + 3
    const color = label === 'RISK LEVEL' ? riskColor(level) : [200, 210, 225]
    doc.setTextColor(...color)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(value, x, doc.y + 5.5)
  })
  doc.y += 14

  // ── Severity breakdown ──
  const severities = ['critical', 'high', 'medium', 'low']
  const counts = {}
  severities.forEach(s => {
    counts[s] = (result.findings || []).filter(f => f.risk === s).length
  })

  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('SEVERITY BREAKDOWN', margin, doc.y + 4)
  doc.y += 7

  const boxW = (contentW - 9) / 4
  severities.forEach((s, i) => {
    const x = margin + i * (boxW + 3)
    const color = riskColor(s)
    doc.setFillColor(color[0], color[1], color[2], 0.1)
    doc.setFillColor(25, 30, 45)
    doc.rect(x, doc.y, boxW, 16, 'F')
    doc.setDrawColor(...color)
    doc.setLineWidth(0.4)
    doc.rect(x, doc.y, boxW, 16, 'S')
    doc.setTextColor(...color)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(String(counts[s]), x + boxW / 2, doc.y + 10, { align: 'center' })
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(s.toUpperCase(), x + boxW / 2, doc.y + 14.5, { align: 'center' })
  })
  doc.y += 22

  // ── Findings table ──
  if ((result.findings || []).length > 0) {
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('FINDINGS', margin, doc.y + 4)
    doc.y += 8

    // Table header
    doc.setFillColor(20, 24, 36)
    doc.rect(margin, doc.y, contentW, 7, 'F')
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('RISK',  margin + 2,  doc.y + 4.8)
    doc.text('TYPE',  margin + 22, doc.y + 4.8)
    doc.text('LINE',  margin + 70, doc.y + 4.8)
    doc.text('VALUE', margin + 88, doc.y + 4.8)
    doc.y += 8

    result.findings.forEach((f, idx) => {
      if (doc.y > ph - 25) { doc.addPage(); doc.y = 20 }

      const rowBg = idx % 2 === 0 ? [18, 22, 34] : [22, 26, 38]
      doc.setFillColor(...rowBg)
      doc.rect(margin, doc.y, contentW, 7.5, 'F')

      // Risk badge
      const rc = riskColor(f.risk)
      doc.setFillColor(...rc)
      doc.roundedRect(margin + 1, doc.y + 1.5, 18, 4.5, 1, 1, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.text(f.risk.toUpperCase(), margin + 10, doc.y + 4.8, { align: 'center' })

      // Type
      doc.setTextColor(200, 210, 225)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.text(f.type || '', margin + 22, doc.y + 5)

      // Line
      doc.setTextColor(100, 116, 139)
      doc.text(String((f.line ?? 0) + 1), margin + 70, doc.y + 5)

      // Value
      const val = f.value || ''
      const truncated = val.length > 35 ? val.slice(0, 35) + '…' : val
      doc.setTextColor(150, 160, 180)
      doc.setFont('courier', 'normal')
      doc.setFontSize(7)
      doc.text(truncated, margin + 88, doc.y + 5)

      doc.y += 8
    })
    doc.y += 6
  }

  // ── AI Insights ──
  if ((result.insights || []).length > 0) {
    if (doc.y > ph - 60) { doc.addPage(); doc.y = 20 }

    doc.setTextColor(100, 116, 139)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('AI-GENERATED INSIGHTS', margin, doc.y + 4)
    doc.y += 9

    result.insights.forEach((insight, i) => {
      if (doc.y > ph - 30) { doc.addPage(); doc.y = 20 }

      // Number bubble
      doc.setFillColor(30, 40, 70)
      doc.circle(margin + 3.5, doc.y + 3.5, 3.5, 'F')
      doc.setTextColor(96, 165, 250)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text(String(i + 1), margin + 3.5, doc.y + 4.5, { align: 'center' })

      // Insight text
      doc.setTextColor(180, 190, 210)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(insight, contentW - 12)
      lines.forEach((line, li) => {
        if (doc.y > ph - 15) { doc.addPage(); doc.y = 20 }
        doc.text(line, margin + 9, doc.y + 4.5 + li * 5)
      })
      doc.y += lines.length * 5 + 5

      // Separator
      doc.setDrawColor(30, 36, 55)
      doc.setLineWidth(0.3)
      doc.line(margin, doc.y, pw - margin, doc.y)
      doc.y += 4
    })
  }

  // ── Footer on every page ──
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFillColor(15, 17, 23)
    doc.rect(0, ph - 12, pw, 12, 'F')
    doc.setTextColor(60, 70, 90)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('AI Secure Data Intelligence Platform — Confidential Security Report',
      margin, ph - 4.5)
    doc.text(`Page ${p} of ${totalPages}`, pw - margin, ph - 4.5, { align: 'right' })
  }

  // ── Save ──
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  doc.save(`security-report-${timestamp}.pdf`)
}