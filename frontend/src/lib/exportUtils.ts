import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const value = row[h];
          const str = value === null || value === undefined ? '' : String(value);
          return /[",\n]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str;
        })
        .join(',')
    ),
  ];

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToPdf(title: string, filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows.map((row) => headers.map((h) => String(row[h] ?? ''))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [42, 120, 214] },
  });

  doc.save(`${filename}.pdf`);
}

interface ReportSection {
  title: string;
  rows: Array<Record<string, unknown>>;
}

/** AI Report Generator — one PDF combining several tabular sections plus a
 * summary line, each section laid out below the last using jspdf-autotable's
 * own `finalY` tracking rather than a fixed offset per section. */
export function exportMultiSectionPdf(opts: { title: string; filename: string; summaryLines: string[]; sections: ReportSection[] }) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(opts.title, 14, 18);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 24);

  let y = 30;
  doc.setFontSize(10);
  for (const line of opts.summaryLines) {
    doc.text(line, 14, y);
    y += 5;
  }
  y += 4;

  for (const section of opts.sections) {
    if (section.rows.length === 0) continue;
    if (y > 260) {
      doc.addPage();
      y = 18;
    }
    doc.setFontSize(11);
    doc.text(section.title, 14, y);
    const headers = Object.keys(section.rows[0]);
    autoTable(doc, {
      startY: y + 3,
      head: [headers],
      body: section.rows.map((row) => headers.map((h) => String(row[h] ?? ''))),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [42, 120, 214] },
      margin: { top: 18 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  doc.save(`${opts.filename}.pdf`);
}
