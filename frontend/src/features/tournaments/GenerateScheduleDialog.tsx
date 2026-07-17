import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { generateScheduleSchema, type GenerateScheduleValues } from '@/lib/validators/tournament';
import * as tournamentService from '@/services/tournament.service';
import { extractErrorMessage } from '@/services/api';

export function GenerateScheduleDialog({ tournamentId }: { tournamentId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GenerateScheduleValues>({
    resolver: zodResolver(generateScheduleSchema),
    defaultValues: { daysBetweenRounds: 7, matchTimeUtc: '18:00' },
  });

  const mutation = useMutation({
    mutationFn: (values: GenerateScheduleValues) =>
      tournamentService.generateSchedule({
        tournamentId,
        startDate: new Date(values.startDate).toISOString(),
        daysBetweenRounds: values.daysBetweenRounds,
        matchTimeUtc: values.matchTimeUtc,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toast.success('Schedule generated');
      setOpen(false);
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarClock className="h-4 w-4" /> Generate Schedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Round-Robin Schedule</DialogTitle>
          <DialogDescription>Automatically creates fixtures pairing every team using the circle method.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">First round date</Label>
            <Input id="start-date" type="date" {...register('startDate')} />
            {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="days-between">Days between rounds</Label>
              <Input id="days-between" type="number" {...register('daysBetweenRounds')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-time">Match time (UTC)</Label>
              <Input id="match-time" placeholder="18:00" {...register('matchTimeUtc')} />
              {errors.matchTimeUtc && <p className="text-xs text-destructive">{errors.matchTimeUtc.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
