import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validators/auth';
import { forgotPassword } from '@/services/auth.service';
import { extractErrorMessage } from '@/services/api';

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await forgotPassword(values.email);
      setSent(true);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a secure link to reset it">
      {sent ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-6 text-center">
          <MailCheck className="h-8 w-8 text-success" />
          <p className="text-sm text-muted-foreground">
            If that email exists in our system, a reset link has been sent. In development, check the server logs for an Ethereal
            preview link.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@stadiumos.dev" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Send reset link
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
