import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Radio, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as tournamentService from '@/services/tournament.service';
import { extractErrorMessage } from '@/services/api';
import type { Fixture, MatchStatus } from '@/types';

const STATUS_OPTIONS: MatchStatus[] = ['NOT_STARTED', 'FIRST_HALF', 'HALFTIME', 'SECOND_HALF', 'EXTRA_TIME', 'FULL_TIME', 'ABANDONED'];

interface FormValues {
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
}

export function UpdateScoreDialog({ fixture, tournamentId }: { fixture: Fixture; tournamentId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { register, control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      homeScore: fixture.match?.homeScore ?? 0,
      awayScore: fixture.match?.awayScore ?? 0,
      status: fixture.match?.status ?? 'NOT_STARTED',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => tournamentService.updateMatchScore(fixture.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toast.success('Score updated');
      setOpen(false);
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Radio className="h-4 w-4" /> Update Score
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {fixture.homeTeam.name} vs {fixture.awayTeam.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{fixture.homeTeam.name}</Label>
              <Input type="number" min={0} {...register('homeScore', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>{fixture.awayTeam.name}</Label>
              <Input type="number" min={0} {...register('awayScore', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Match status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replaceAll('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Broadcast Update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
