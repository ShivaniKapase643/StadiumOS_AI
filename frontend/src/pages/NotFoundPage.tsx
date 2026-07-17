import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <p className="text-lg text-muted-foreground">This page doesn&apos;t exist yet.</p>
      <Button asChild>
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
