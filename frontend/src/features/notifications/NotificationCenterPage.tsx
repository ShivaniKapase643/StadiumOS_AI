import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, BellRing, Loader2, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RoleGate } from '@/components/shared/RoleGate';
import { formatDateTime } from '@/lib/utils';
import { extractErrorMessage } from '@/services/api';
import { useSocketEvent } from '@/hooks/useSocket';
import * as notificationsService from '@/services/notifications.service';
import type { Role } from '@/types';

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

function MyNotificationsTab() {
  const queryClient = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery({ queryKey: ['notifications', 'mine'], queryFn: notificationsService.getMyNotifications });

  useSocketEvent('notification:new', () => queryClient.invalidateQueries({ queryKey: ['notifications', 'mine'] }));

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'mine'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'mine'] }),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Notifications</CardTitle>
        <Button size="sm" variant="outline" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
          Mark all read
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!isLoading && notifications.length === 0 && <p className="text-sm text-muted-foreground">No notifications.</p>}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-start justify-between rounded-md border p-3 text-sm ${n.read ? 'border-border' : 'border-primary/40 bg-primary/5'}`}
          >
            <div className="flex gap-2">
              {n.read ? <Bell className="mt-0.5 h-4 w-4 text-muted-foreground" /> : <BellRing className="mt-0.5 h-4 w-4 text-primary" />}
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
                <p className="text-[10px] text-muted-foreground">{formatDateTime(n.createdAt)}</p>
              </div>
            </div>
            {!n.read && (
              <Button size="sm" variant="ghost" onClick={() => markReadMutation.mutate(n.id)}>
                Mark read
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ComposerTab() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState('IN_APP');
  const [roles, setRoles] = useState<Role[]>(['FAN']);

  const broadcastMutation = useMutation({
    mutationFn: () => notificationsService.broadcast({ title, body, type: 'GENERAL', channel, audienceRoles: roles }),
    onSuccess: (result) => {
      toast.success(`Sent to ${result.recipientCount} users`);
      setTitle('');
      setBody('');
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const toggleRole = (role: Role) => setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compose Broadcast</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Message body" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex items-center gap-3">
          <Label>Channel</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['IN_APP', 'EMAIL', 'SMS', 'PUSH'].map((c) => (
                <SelectItem key={c} value={c}>
                  {c.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Audience roles</Label>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((role) => (
              <button key={role} type="button" onClick={() => toggleRole(role)} className="focus:outline-none">
                <Badge variant={roles.includes(role) ? 'default' : 'outline'} className="cursor-pointer">
                  {role}
                </Badge>
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => broadcastMutation.mutate()} disabled={!title || !body || broadcastMutation.isPending}>
          {broadcastMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </Button>
      </CardContent>
    </Card>
  );
}

function LogsTab() {
  const { data: logs = [] } = useQuery({ queryKey: ['notifications', 'logs'], queryFn: notificationsService.getLogs });
  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.channel}</TableCell>
                <TableCell>{log.recipient}</TableCell>
                <TableCell>{log.subject ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{log.status}</Badge>
                </TableCell>
                <TableCell>{formatDateTime(log.sentAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function NotificationCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notification Center</h1>
        <p className="text-sm text-muted-foreground">Your notifications, broadcast composer, and delivery logs.</p>
      </div>

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">My Notifications</TabsTrigger>
          <RoleGate roles={['SUPER_ADMIN', 'STADIUM_ADMIN', 'SECURITY_OFFICER']}>
            <TabsTrigger value="compose">Compose</TabsTrigger>
          </RoleGate>
          <RoleGate roles={['SUPER_ADMIN', 'STADIUM_ADMIN']}>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </RoleGate>
        </TabsList>
        <TabsContent value="mine">
          <MyNotificationsTab />
        </TabsContent>
        <TabsContent value="compose">
          <ComposerTab />
        </TabsContent>
        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
