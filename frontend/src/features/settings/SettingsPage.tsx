import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Key, Loader2, ScrollText, Trash2, Users as UsersIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { extractErrorMessage } from '@/services/api';
import { formatDateTime } from '@/lib/utils';
import * as settingsService from '@/services/settings.service';
import type { Role } from '@/types';

function OrganizationTab() {
  const queryClient = useQueryClient();
  const { data: org } = useQuery({ queryKey: ['settings', 'organization'], queryFn: settingsService.getOrganization });
  const [name, setName] = useState('');

  const updateMutation = useMutation({
    mutationFn: () => settingsService.updateOrganization({ name }),
    onSuccess: () => {
      toast.success('Organization updated');
      queryClient.invalidateQueries({ queryKey: ['settings', 'organization'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" /> Organization
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Input placeholder={org?.name ?? 'Organization name'} value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => updateMutation.mutate()} disabled={!name || updateMutation.isPending}>
          {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </Button>
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

function UsersTab() {
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ['settings', 'users'], queryFn: settingsService.listUsers });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => settingsService.updateUserRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'users'] }),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => settingsService.toggleUserActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'users'] }),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UsersIcon className="h-4 w-4" /> Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Last Login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <select
                    aria-label={`Change role for ${u.name}`}
                    className="rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                    value={u.role}
                    onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value as Role })}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <Switch checked={u.isActive} onCheckedChange={(checked) => activeMutation.mutate({ id: u.id, isActive: checked })} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ApiKeysTab() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null);
  const { data: keys = [] } = useQuery({ queryKey: ['settings', 'api-keys'], queryFn: settingsService.listApiKeys });

  const createMutation = useMutation({
    mutationFn: () => settingsService.createApiKey({ name, scopes: ['read'] }),
    onSuccess: (key) => {
      setLastCreatedKey(key.rawKey ?? null);
      setName('');
      queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => settingsService.revokeApiKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Key className="h-4 w-4" /> API Keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Input placeholder="Key name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate
          </Button>
        </div>
        {lastCreatedKey && (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
            <p className="font-medium">Copy this key now — it won&apos;t be shown again:</p>
            <code className="break-all">{lastCreatedKey}</code>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Scopes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.name}</TableCell>
                <TableCell>{key.scopes.join(', ')}</TableCell>
                <TableCell>
                  <Badge variant={key.revokedAt ? 'destructive' : 'success'}>{key.revokedAt ? 'Revoked' : 'Active'}</Badge>
                </TableCell>
                <TableCell>
                  {!key.revokedAt && (
                    <Button size="sm" variant="ghost" onClick={() => revokeMutation.mutate(key.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AuditLogsTab() {
  const [page, setPage] = useState(1);
  const { data } = useQuery({ queryKey: ['settings', 'audit-logs', page], queryFn: () => settingsService.getAuditLogs(page) });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="h-4 w-4" /> Audit Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.action.replaceAll('_', ' ')}</TableCell>
                <TableCell>{log.entityType}</TableCell>
                <TableCell>{log.user?.name ?? 'System'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {data?.meta.page ?? 1} of {Math.max(1, Math.ceil((data?.meta.total ?? 0) / (data?.meta.pageSize ?? 20)))}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!data || page * data.meta.pageSize >= data.meta.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Organization, users, API keys, and audit logs.</p>
      </div>

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="organization">
          <OrganizationTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="api-keys">
          <ApiKeysTab />
        </TabsContent>
        <TabsContent value="audit-logs">
          <AuditLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
