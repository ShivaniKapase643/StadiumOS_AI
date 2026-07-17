import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Package, Store, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/shared/StatCard';
import { RoleGate } from '@/components/shared/RoleGate';
import { formatCurrency } from '@/lib/utils';
import { extractErrorMessage } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import * as vendorService from '@/services/vendor.service';

function VendorOwnerView() {
  const queryClient = useQueryClient();
  const [newItem, setNewItem] = useState({ name: '', sku: '', stock: '', price: '' });

  const { data: inventory = [] } = useQuery({ queryKey: ['vendor', 'inventory'], queryFn: vendorService.getMyInventory });
  const { data: orders = [] } = useQuery({ queryKey: ['vendor', 'orders'], queryFn: vendorService.getMyOrders });
  const { data: analytics } = useQuery({ queryKey: ['vendor', 'analytics'], queryFn: vendorService.getMyAnalytics });

  const addItemMutation = useMutation({
    mutationFn: () =>
      vendorService.addInventoryItem({
        name: newItem.name,
        sku: newItem.sku,
        stock: Number(newItem.stock),
        price: Number(newItem.price),
      }),
    onSuccess: () => {
      toast.success('Item added');
      setNewItem({ name: '', sku: '', stock: '', price: '' });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'inventory'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => vendorService.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'orders'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Revenue" value={formatCurrency(analytics?.totalRevenue ?? 0)} icon={TrendingUp} accent="success" />
        <StatCard label="Total Orders" value={String(analytics?.totalOrders ?? 0)} icon={Package} accent="primary" />
        <StatCard label="Inventory Items" value={String(inventory.length)} icon={Store} accent="primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Input placeholder="Name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
            <Input placeholder="SKU" value={newItem.sku} onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })} />
            <Input placeholder="Stock" type="number" value={newItem.stock} onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })} />
            <Input placeholder="Price" type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
            <Button onClick={() => addItemMutation.mutate()} disabled={addItemMutation.isPending}>
              {addItemMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.stock}</TableCell>
                  <TableCell>{formatCurrency(Number(item.price))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incoming Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.user.name}</TableCell>
                  <TableCell>{order.items.map((i) => i.name).join(', ')}</TableCell>
                  <TableCell>{formatCurrency(Number(order.totalAmount))}</TableCell>
                  <TableCell>
                    <select
                      aria-label={`Update status for order from ${order.user.name}`}
                      className="rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                      value={order.status}
                      onChange={(e) => updateStatusMutation.mutate({ id: order.id, status: e.target.value })}
                    >
                      {['PLACED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'].map((s) => (
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
    </div>
  );
}

function AdminVendorSummaryView() {
  const { data: vendors = [], isLoading } = useQuery({ queryKey: ['vendor', 'all'], queryFn: vendorService.getAllVendorsSummary });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">All Vendors</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.ownerName}</TableCell>
                  <TableCell>{v.category}</TableCell>
                  <TableCell>{v.inventoryCount}</TableCell>
                  <TableCell>{formatCurrency(v.totalRevenue)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{v.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function VendorManagementPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vendor Management</h1>
        <p className="text-sm text-muted-foreground">Inventory, orders, and sales analytics.</p>
      </div>

      <RoleGate roles={['VENDOR']}>
        <VendorOwnerView />
      </RoleGate>
      <RoleGate roles={['SUPER_ADMIN', 'STADIUM_ADMIN']}>
        <AdminVendorSummaryView />
      </RoleGate>
      {user && !['VENDOR', 'SUPER_ADMIN', 'STADIUM_ADMIN'].includes(user.role) && (
        <p className="text-sm text-muted-foreground">This module is available to vendors and stadium administrators.</p>
      )}
    </div>
  );
}
