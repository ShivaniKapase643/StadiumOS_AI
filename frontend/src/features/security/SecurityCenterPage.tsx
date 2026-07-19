import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, Loader2, Radio, ShieldAlert, Video, VideoOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { formatDateTime } from '@/lib/utils';
import { extractErrorMessage } from '@/services/api';
import * as securityService from '@/services/security.service';
import type { CameraDto } from '@/services/security.service';
import type { Role } from '@/types';

const SEVERITY_VARIANT: Record<string, 'default' | 'warning' | 'destructive'> = {
  LOW: 'default',
  MEDIUM: 'default',
  HIGH: 'warning',
  CRITICAL: 'destructive',
};

function IncidentsTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ type: '', severity: 'MEDIUM', description: '' });
  const [page, setPage] = useState(1);
  const { data } = useQuery({ queryKey: ['security', 'incidents', page], queryFn: () => securityService.listIncidents(page) });
  const incidents = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => securityService.createIncident(form),
    onSuccess: () => {
      toast.success('Incident reported');
      setForm({ type: '', severity: 'MEDIUM', description: '' });
      queryClient.invalidateQueries({ queryKey: ['security', 'incidents'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => securityService.updateIncidentStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['security', 'incidents'] }),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report an incident</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input placeholder="Type (e.g. Trespassing)" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button onClick={() => createMutation.mutate()} disabled={!form.type || !form.description || createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Report
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell className="font-medium">{incident.type}</TableCell>
                  <TableCell>
                    <Badge variant={SEVERITY_VARIANT[incident.severity]}>{incident.severity}</Badge>
                  </TableCell>
                  <TableCell>{incident.zone?.name ?? '—'}</TableCell>
                  <TableCell>{incident.reportedBy.name}</TableCell>
                  <TableCell>
                    <select
                      aria-label={`Update status for incident: ${incident.type}`}
                      className="rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                      value={incident.status}
                      onChange={(e) => updateMutation.mutate({ id: incident.id, status: e.target.value })}
                    >
                      {['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'].map((s) => (
                        <option key={s} value={s}>
                          {s}
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

      {data && data.meta.total > 0 && (
        <PaginationControls page={data.meta.page} pageSize={data.meta.pageSize} total={data.meta.total} onPageChange={setPage} />
      )}
    </div>
  );
}

function CameraFeedDialog({ camera, onClose }: { camera: CameraDto | null; onClose: () => void }) {
  return (
    <Dialog open={camera !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" /> {camera?.label}
          </DialogTitle>
          <DialogDescription>{camera?.zone.name}</DialogDescription>
        </DialogHeader>

        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-slate-950">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.04)_0px,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_3px)]" />
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> SIMULATED FEED
          </div>
          <div className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-[10px] text-white/70">
            {new Date().toLocaleTimeString()}
          </div>
          {camera?.status === 'ONLINE' ? (
            <Video className="h-10 w-10 text-white/20" />
          ) : (
            <VideoOff className="h-10 w-10 text-white/20" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          This preview build has no physical camera hardware connected — the feed above is a clearly-labeled placeholder, not real
          footage. In production, this pane would embed the camera's actual RTSP/HLS stream from{' '}
          <code className="rounded bg-muted px-1">streamUrl</code>.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function CctvTab() {
  const { data: cameras = [] } = useQuery({ queryKey: ['security', 'cctv'], queryFn: securityService.listCameras });
  const [activeCamera, setActiveCamera] = useState<CameraDto | null>(null);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cameras.map((cam) => (
        <Card
          key={cam.id}
          role="button"
          tabIndex={0}
          aria-label={`View ${cam.label} in ${cam.zone.name}, status ${cam.status}`}
          className="cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => setActiveCamera(cam)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveCamera(cam);
            }
          }}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">{cam.label}</p>
                <p className="text-xs text-muted-foreground">{cam.zone.name}</p>
              </div>
            </div>
            <Badge variant={cam.status === 'ONLINE' ? 'success' : 'destructive'}>{cam.status}</Badge>
          </CardContent>
        </Card>
      ))}
      {cameras.length === 0 && <p className="text-sm text-muted-foreground">No cameras configured.</p>}
      <CameraFeedDialog camera={activeCamera} onClose={() => setActiveCamera(null)} />
    </div>
  );
}

function PatrolLogsTab() {
  const { data: logs = [] } = useQuery({ queryKey: ['security', 'patrol-logs'], queryFn: securityService.listPatrolLogs });
  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Officer</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.officer.name}</TableCell>
                <TableCell>{log.zone.name}</TableCell>
                <TableCell>{log.notes ?? '—'}</TableCell>
                <TableCell>{formatDateTime(log.checkpointAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const ROLE_OPTIONS: Role[] = [
  'SUPER_ADMIN',
  'STADIUM_ADMIN',
  'TOURNAMENT_ORGANIZER',
  'SECURITY_OFFICER',
  'MEDICAL_TEAM',
  'MAINTENANCE_TEAM',
  'VENDOR',
  'VOLUNTEER',
  'REFEREE',
  'FAN',
];

function BroadcastTab() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [roles, setRoles] = useState<Role[]>(['FAN']);

  const { data: history = [] } = useQuery({ queryKey: ['security', 'broadcasts'], queryFn: securityService.listBroadcasts });

  const broadcastMutation = useMutation({
    mutationFn: () => securityService.sendBroadcast({ message, severity, audienceRoles: roles }),
    onSuccess: () => {
      toast.success('Broadcast sent');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['security', 'broadcasts'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const toggleRole = (role: Role) => {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4" /> Emergency Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Broadcast message" value={message} onChange={(e) => setMessage(e.target.value)} />
          <div className="flex items-center gap-3">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Audience roles</Label>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  aria-pressed={roles.includes(role)}
                  className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Badge variant={roles.includes(role) ? 'default' : 'outline'} className="cursor-pointer">
                    {role}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => broadcastMutation.mutate()} disabled={!message || broadcastMutation.isPending}>
            {broadcastMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <ShieldAlert className="h-4 w-4" /> Send Broadcast
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Broadcast History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 && <p className="text-sm text-muted-foreground">No broadcasts sent yet.</p>}
          {history.map((b) => (
            <div key={b.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <Badge variant={SEVERITY_VARIANT[b.severity]}>{b.severity}</Badge>
                <span className="text-xs text-muted-foreground">{formatDateTime(b.createdAt)}</span>
              </div>
              <p className="mt-1">{b.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                From {b.sender.name} &middot; To: {b.audienceRoles.length > 0 ? b.audienceRoles.join(', ') : 'All roles'}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SecurityCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Security Center</h1>
        <p className="text-sm text-muted-foreground">Incidents, CCTV, patrol logs, and emergency broadcasts.</p>
      </div>

      <Tabs defaultValue="incidents">
        <TabsList>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="cctv">CCTV</TabsTrigger>
          <TabsTrigger value="patrol">Patrol Logs</TabsTrigger>
          <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
        </TabsList>
        <TabsContent value="incidents">
          <IncidentsTab />
        </TabsContent>
        <TabsContent value="cctv">
          <CctvTab />
        </TabsContent>
        <TabsContent value="patrol">
          <PatrolLogsTab />
        </TabsContent>
        <TabsContent value="broadcast">
          <BroadcastTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
