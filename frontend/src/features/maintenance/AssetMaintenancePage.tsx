import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { extractErrorMessage } from '@/services/api';
import * as maintenanceService from '@/services/maintenance.service';

const PRIORITY_VARIANT: Record<string, 'default' | 'warning' | 'destructive'> = {
  LOW: 'default',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
};

function AssetsTab() {
  const { data: assets = [] } = useQuery({ queryKey: ['maintenance', 'assets'], queryFn: maintenanceService.listAssets });
  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell>{asset.category}</TableCell>
                <TableCell>{asset.healthScore.toFixed(0)}%</TableCell>
                <TableCell>
                  <Badge variant={asset.status === 'ACTIVE' ? 'success' : 'outline'}>{asset.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function WorkOrdersTab() {
  const queryClient = useQueryClient();
  const { data: workOrders = [] } = useQuery({ queryKey: ['maintenance', 'work-orders'], queryFn: maintenanceService.listWorkOrders });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => maintenanceService.updateWorkOrderStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] }),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.map((wo) => (
              <TableRow key={wo.id}>
                <TableCell className="font-medium">{wo.title}</TableCell>
                <TableCell>{wo.asset.name}</TableCell>
                <TableCell>
                  <Badge variant={PRIORITY_VARIANT[wo.priority]}>{wo.priority}</Badge>
                </TableCell>
                <TableCell>{wo.assignedTo?.name ?? 'Unassigned'}</TableCell>
                <TableCell>
                  <select
                    aria-label={`Update status for work order: ${wo.title}`}
                    className="rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                    value={wo.status}
                    onChange={(e) => updateMutation.mutate({ id: wo.id, status: e.target.value })}
                  >
                    {['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
                      <option key={s} value={s}>
                        {s.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PredictionsTab() {
  const queryClient = useQueryClient();
  const { data: predictions = [], isLoading } = useQuery({ queryKey: ['maintenance', 'predictions'], queryFn: maintenanceService.listPredictions });

  const recomputeMutation = useMutation({
    mutationFn: maintenanceService.recomputePredictions,
    onSuccess: () => {
      toast.success('Predictions recomputed');
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'predictions'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Predictive Maintenance</CardTitle>
        <Button size="sm" variant="outline" onClick={() => recomputeMutation.mutate()} disabled={recomputeMutation.isPending}>
          {recomputeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Recompute
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Remaining Useful Life</TableHead>
                <TableHead>Recommendation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {predictions.map((p) => (
                <TableRow key={p.asset.id}>
                  <TableCell className="font-medium">{p.asset.name}</TableCell>
                  <TableCell>
                    <Badge variant={p.prediction.riskScore >= 70 ? 'destructive' : p.prediction.riskScore >= 40 ? 'warning' : 'success'}>
                      {p.prediction.riskScore}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.prediction.remainingUsefulLifeDays} days</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.prediction.recommendation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!isLoading && predictions.length === 0 && (
          <p className="text-sm text-muted-foreground">No predictions yet — click Recompute to generate them.</p>
        )}
      </CardContent>
    </Card>
  );
}

function InspectionsTab() {
  const queryClient = useQueryClient();
  const { data: assets = [] } = useQuery({ queryKey: ['maintenance', 'assets'], queryFn: maintenanceService.listAssets });
  const [assetId, setAssetId] = useState('');
  const [findings, setFindings] = useState('');
  const [score, setScore] = useState('90');

  const createMutation = useMutation({
    mutationFn: () => maintenanceService.createInspection({ assetId, findings, score: Number(score) }),
    onSuccess: () => {
      toast.success('Inspection report filed');
      setFindings('');
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'inspections'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="h-4 w-4" /> File Inspection Report
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Select value={assetId} onValueChange={setAssetId}>
          <SelectTrigger>
            <SelectValue placeholder="Select asset" />
          </SelectTrigger>
          <SelectContent>
            {assets.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Findings" value={findings} onChange={(e) => setFindings(e.target.value)} />
        <Input placeholder="Score (0-100)" type="number" value={score} onChange={(e) => setScore(e.target.value)} />
        <Button onClick={() => createMutation.mutate()} disabled={!assetId || !findings || createMutation.isPending}>
          {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          File inspection
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AssetMaintenancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Asset &amp; Maintenance</h1>
        <p className="text-sm text-muted-foreground">Assets, work orders, inspections, and predictive maintenance.</p>
      </div>

      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="predictions">Predictive Maintenance</TabsTrigger>
        </TabsList>
        <TabsContent value="assets">
          <AssetsTab />
        </TabsContent>
        <TabsContent value="work-orders">
          <WorkOrdersTab />
        </TabsContent>
        <TabsContent value="inspections">
          <InspectionsTab />
        </TabsContent>
        <TabsContent value="predictions">
          <PredictionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
