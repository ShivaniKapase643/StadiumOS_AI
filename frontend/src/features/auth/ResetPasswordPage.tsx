import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/validators/auth';
import { resetPassword } from '@/services/auth.service';
import { extractErrorMessage } from '@/services/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      toast.error('Missing or invalid reset token');
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPassword(token, values.newPassword);
      toast.success('Password reset. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password for your account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" type="password" {...register('newPassword')} />
          {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Reset password
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
