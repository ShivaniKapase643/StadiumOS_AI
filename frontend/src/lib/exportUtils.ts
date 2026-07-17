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
