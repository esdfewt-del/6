import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-serif font-bold text-foreground" data-testid="text-404">404</h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground" data-testid="text-not-found-title">
            Page Not Found
          </h2>
          <p className="text-muted-foreground max-w-md" data-testid="text-not-found-description">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button onClick={() => setLocation('/login')} data-testid="button-go-home">
          <Home className="mr-2 h-4 w-4" />
          Go to Login
        </Button>
      </div>
    </div>
  );
}
