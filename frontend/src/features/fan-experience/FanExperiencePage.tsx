import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Bot, Loader2, MapPin, Search, ShoppingBag, Send, Sparkles, Armchair, ParkingSquare, Utensils, CloudSun } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { formatCurrency } from '@/lib/utils';
import { extractErrorMessage } from '@/services/api';
import * as aiService from '@/services/ai.service';
import * as fanService from '@/services/fanExperience.service';
import type { SeatTier } from '@/types';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

function ChatbotTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'bot', text: 'Hi! Ask me about gates, parking, crowd levels, food courts, washrooms, or your tickets.' },
  ]);
  const [input, setInput] = useState('');

  const chatMutation = useMutation({
    mutationFn: (message: string) => aiService.askChatbot(message),
    onSuccess: (reply) => setMessages((prev) => [...prev, { role: 'bot', text: reply }]),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text: input }]);
    chatMutation.mutate(input);
    setInput('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4 text-primary" /> Fan Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-80 space-y-3 overflow-y-auto scrollbar-thin">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <Button onClick={send} disabled={chatMutation.isPending}>
            {chatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LostFoundTab() {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);

  const { data } = useQuery({ queryKey: ['fan', 'lost-found', page], queryFn: () => fanService.listLostFound(page) });
  const items = data?.data ?? [];

  const reportMutation = useMutation({
    mutationFn: () => fanService.reportLostFound({ description, category, location }),
    onSuccess: () => {
      toast.success('Item reported');
      setDescription('');
      setCategory('');
      setLocation('');
      queryClient.invalidateQueries({ queryKey: ['fan', 'lost-found'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report a lost or found item</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input placeholder="Category (e.g. wallet)" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Button
            className="sm:col-span-3"
            onClick={() => reportMutation.mutate()}
            disabled={!description || !category || reportMutation.isPending}
          >
            {reportMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit report
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-1 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{item.category}</p>
                <Badge variant="outline">{item.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              {item.location && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {item.location}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No items reported yet.</p>}
      </div>

      {data && data.meta.total > 0 && (
        <PaginationControls page={data.meta.page} pageSize={data.meta.pageSize} total={data.meta.total} onPageChange={setPage} />
      )}
    </div>
  );
}

function FoodOrderingTab() {
  const queryClient = useQueryClient();
  const { data: vendors = [] } = useQuery({ queryKey: ['fan', 'vendors'], queryFn: fanService.listVendorsForOrdering });
  const { data: myOrders = [] } = useQuery({ queryKey: ['fan', 'orders'], queryFn: fanService.getMyFoodOrders });

  const orderMutation = useMutation({
    mutationFn: (input: { vendorId: string; item: { id: string; name: string; price: number } }) =>
      fanService.placeFoodOrder({
        vendorId: input.vendorId,
        items: [{ inventoryItemId: input.item.id, name: input.item.name, price: input.item.price, quantity: 1 }],
      }),
    onSuccess: () => {
      toast.success('Order placed');
      queryClient.invalidateQueries({ queryKey: ['fan', 'orders'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      {vendors.map((vendor) => (
        <Card key={vendor.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-4 w-4" /> {vendor.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {vendor.inventory.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(Number(item.price))}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={item.stock === 0 || (orderMutation.isPending && orderMutation.variables?.item.id === item.id)}
                  onClick={() => orderMutation.mutate({ vendorId: vendor.id, item: { id: item.id, name: item.name, price: Number(item.price) } })}
                >
                  {orderMutation.isPending && orderMutation.variables?.item.id === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Order'
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {myOrders.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
          {myOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <div>
                <p className="font-medium">{order.vendor.name}</p>
                <p className="text-xs text-muted-foreground">{order.items.map((i) => i.name).join(', ')}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(Number(order.totalAmount))}</p>
                <Badge variant="outline" className="text-[10px]">
                  {order.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SeatFinderTab() {
  const [tier, setTier] = useState<SeatTier | 'ANY'>('ANY');
  const [section, setSection] = useState('');
  const [row, setRow] = useState('');
  const [number, setNumber] = useState('');

  const criteria = {
    tier: tier === 'ANY' ? undefined : tier,
    section: section.trim() || undefined,
    row: row.trim() || undefined,
    number: number.trim() || undefined,
  };

  const { data: seats = [], isFetching, refetch } = useQuery({
    queryKey: ['fan', 'seat-finder', criteria],
    queryFn: () => fanService.findSeats(criteria),
  });

  const isSpecificSearch = Boolean(criteria.section || criteria.row || criteria.number);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="h-4 w-4" /> Seat Finder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:items-end">
          <div className="space-y-1.5">
            <Label>Tier</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as SeatTier | 'ANY')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Any</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
                <SelectItem value="PREMIUM">Premium</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Section</Label>
            <Input placeholder="e.g. A" value={section} onChange={(e) => setSection(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Row</Label>
            <Input placeholder="e.g. B" value={row} onChange={(e) => setRow(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Seat #</Label>
            <Input placeholder="e.g. 5" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
            Search
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {isSpecificSearch
            ? `Showing exact matches for your search.`
            : `Showing up to 40 seats — narrow by section, row, or seat number to find a specific one.`}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(isSpecificSearch ? seats : seats.slice(0, 40)).map((seat) => (
            <div key={seat.id} className="rounded-md border border-border p-2 text-center text-xs">
              <p className="font-medium">
                {seat.section}-{seat.row}
                {seat.number}
              </p>
              <p className="text-muted-foreground">{seat.tier}</p>
            </div>
          ))}
          {seats.length === 0 && !isFetching && (
            <p className="col-span-full text-sm text-muted-foreground">No seats match that search.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ConciergeTab() {
  const { data: info, isLoading } = useQuery({ queryKey: ['fan', 'concierge'], queryFn: fanService.getConciergeInfo });

  if (isLoading || !info) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> Hello, {info.greetingName}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-md border border-border p-3">
          <Armchair className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Your seat</p>
            {info.seat ? (
              <p className="text-sm font-medium">
                {info.seat.section}-{info.seat.row}
                {info.seat.number} <Badge variant="outline">{info.seat.tier}</Badge>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No active ticket</p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-border p-3">
          <ParkingSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Parking</p>
            {info.parking ? (
              <>
                <p className="text-sm font-medium">
                  {info.parking.lotName} &middot; Slot {info.parking.slotCode}
                </p>
                {info.walkingTimeToSeatMinutes !== null && (
                  <p className="text-xs text-muted-foreground">~{info.walkingTimeToSeatMinutes} min walk to your seat</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No active reservation</p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-border p-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Nearest facilities</p>
            <p className="text-sm">{info.nearestWashroom ?? 'Not configured'}</p>
            <p className="text-sm">{info.nearestMedical ?? 'Not configured'}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-border p-3">
          <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Suggested food</p>
            {info.foodSuggestion ? (
              <>
                <p className="text-sm font-medium">
                  {info.foodSuggestion.itemName} &middot; {formatCurrency(info.foodSuggestion.price)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {info.foodSuggestion.vendorName}
                  {info.estimatedFoodWaitMinutes !== null && ` · ~${info.estimatedFoodWaitMinutes} min wait`}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No vendors available right now</p>
            )}
          </div>
        </div>

        {info.weather && (
          <div className="flex items-start gap-3 rounded-md border border-border p-3 sm:col-span-2">
            <CloudSun className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Weather</p>
              <p className="text-sm">
                {info.weather.temperatureC}&deg;C, {info.weather.condition.replaceAll('_', ' ').toLowerCase()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FanExperiencePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Fan Experience</h1>
        <p className="text-sm text-muted-foreground">AI assistant, lost &amp; found, food ordering, and seat finder.</p>
      </div>

      <Tabs defaultValue="chatbot">
        <TabsList>
          <TabsTrigger value="concierge">VIP Concierge</TabsTrigger>
          <TabsTrigger value="chatbot">AI Chatbot</TabsTrigger>
          <TabsTrigger value="lost-found">Lost &amp; Found</TabsTrigger>
          <TabsTrigger value="food">Food Ordering</TabsTrigger>
          <TabsTrigger value="seats">Seat Finder</TabsTrigger>
        </TabsList>
        <TabsContent value="concierge">
          <ConciergeTab />
        </TabsContent>
        <TabsContent value="chatbot">
          <ChatbotTab />
        </TabsContent>
        <TabsContent value="lost-found">
          <LostFoundTab />
        </TabsContent>
        <TabsContent value="food">
          <FoodOrderingTab />
        </TabsContent>
        <TabsContent value="seats">
          <SeatFinderTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
