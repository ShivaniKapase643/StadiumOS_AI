import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.';

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div>
        <p className="text-lg font-semibold">Something went wrong on this page</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload page
        </Button>
        <Button asChild>
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
