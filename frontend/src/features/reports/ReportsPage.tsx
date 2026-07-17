import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportToCsv, exportToPdf } from '@/lib/exportUtils';
import * as reportsService from '@/services/reports.service';
import type { ReportType } from '@/services/reports.service';

const REPORT_LABELS: Record<ReportType, string> = {
  attendance: 'Attendance',
  revenue: 'Revenue',
  crowd: 'Crowd',
  security: 'Security',
  vendor: 'Vendor',
  parking: 'Parking',
  maintenance: 'Maintenance',
};

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>('attendance');
  const { data: rows = [], isLoading } = useQuery({ queryKey: ['reports', type], queryFn: () => reportsService.getReport(type) });

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports &amp; Analytics</h1>
        <p className="text-sm text-muted-foreground">Generate and export operational reports.</p>
      </div>

      <Tabs value={type} onValueChange={(v) => setType(v as ReportType)}>
        <TabsList className="flex-wrap">
          {(Object.keys(REPORT_LABELS) as ReportType[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {REPORT_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> {REPORT_LABELS[type]} Report
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportToCsv(`${type}-report`, rows)} disabled={rows.length === 0}>
              <Download className="h-4 w-4" /> Excel (CSV)
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportToPdf(`${REPORT_LABELS[type]} Report`, `${type}-report`, rows)} disabled={rows.length === 0}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available for this report.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col} className="capitalize">
                      {col.replace(/([A-Z])/g, ' $1')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 100).map((row, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => (
                      <TableCell key={col}>{String(row[col] ?? '—')}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
