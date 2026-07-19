import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('jspdf', () => {
  // Must be a real `function`, not an arrow function — vitest mocks called
  // with `new` (as exportUtils.ts does) require a proper constructor.
  const jsPDF = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.text = vi.fn();
    this.setFontSize = vi.fn();
    this.save = vi.fn();
    this.addPage = vi.fn();
    this.lastAutoTable = { finalY: 50 };
  });
  return { default: jsPDF };
});
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

import { exportToCsv, exportToPdf, exportMultiSectionPdf } from './exportUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

describe('exportToCsv', () => {
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({ click: clickSpy, href: '', download: '' } as never);
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  it('does nothing for an empty row set (no download triggered)', () => {
    exportToCsv('report', []);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('triggers a download with the given filename', () => {
    exportToCsv('attendance-report', [{ name: 'Gate A', count: 40 }]);
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('quotes and escapes values containing commas, quotes, or newlines', () => {
    let csvContent = '';
    vi.spyOn(global, 'Blob').mockImplementation(function (parts: unknown) {
      csvContent = (parts as string[])[0];
      return {} as Blob;
    });

    exportToCsv('report', [{ note: 'Contains, a comma' }, { note: 'Has "quotes"' }]);

    expect(csvContent).toContain('"Contains, a comma"');
    expect(csvContent).toContain('"Has ""quotes"""'); // internal quotes doubled per CSV convention
  });

  it('renders null/undefined values as empty cells, not the literal string "null"', () => {
    let csvContent = '';
    vi.spyOn(global, 'Blob').mockImplementation(function (parts: unknown) {
      csvContent = (parts as string[])[0];
      return {} as Blob;
    });

    exportToCsv('report', [{ optional: null }, { optional: undefined }]);
    expect(csvContent).not.toContain('null');
    expect(csvContent).not.toContain('undefined');
  });
});

describe('exportToPdf', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does nothing for an empty row set', () => {
    exportToPdf('Title', 'file', []);
    expect(jsPDF).not.toHaveBeenCalled();
  });

  it('builds a titled, saved PDF for non-empty rows', () => {
    exportToPdf('Attendance Report', 'attendance', [{ gate: 'A', count: 40 }]);
    expect(jsPDF).toHaveBeenCalledOnce();
    expect(autoTable).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ head: [['gate', 'count']] })
    );
    const instance = vi.mocked(jsPDF).mock.results[0].value;
    expect(instance.text).toHaveBeenCalledWith('Attendance Report', 14, 16);
    expect(instance.save).toHaveBeenCalledWith('attendance.pdf');
  });
});

describe('exportMultiSectionPdf', () => {
  beforeEach(() => vi.clearAllMocks());

  it('skips sections with no rows entirely (no empty table rendered)', () => {
    exportMultiSectionPdf({
      title: 'Full Report',
      filename: 'full-report',
      summaryLines: ['Overall health: 95%'],
      sections: [
        { title: 'Attendance', rows: [{ gate: 'A', count: 40 }] },
        { title: 'Empty Section', rows: [] },
      ],
    });
    expect(autoTable).toHaveBeenCalledTimes(1); // only the non-empty section
  });

  it('writes every summary line before the sections', () => {
    exportMultiSectionPdf({
      title: 'Full Report',
      filename: 'full-report',
      summaryLines: ['Line 1', 'Line 2'],
      sections: [],
    });
    const instance = vi.mocked(jsPDF).mock.results[0].value;
    expect(instance.text).toHaveBeenCalledWith('Line 1', 14, expect.any(Number));
    expect(instance.text).toHaveBeenCalledWith('Line 2', 14, expect.any(Number));
  });

  it('saves the final PDF under the given filename', () => {
    exportMultiSectionPdf({ title: 'Report', filename: 'my-file', summaryLines: [], sections: [] });
    const instance = vi.mocked(jsPDF).mock.results[0].value;
    expect(instance.save).toHaveBeenCalledWith('my-file.pdf');
  });
});
