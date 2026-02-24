import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function LoginScreen() {
  const { login, loginStatus } = useInternetIdentity();

  const isLoggingIn = loginStatus === 'logging-in';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-6">
          <img
            src="/assets/generated/notes-logo.dim_512x512.png"
            alt="Notes App"
            className="w-32 h-32 mx-auto"
          />
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Notes App</h1>
            <p className="text-muted-foreground text-lg">
              Your private, secure notes with encryption
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <Button
            onClick={login}
            disabled={isLoggingIn}
            size="lg"
            className="w-full text-base h-12"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            Sign in securely with Internet Identity to access your private notes
          </p>
        </div>
      </div>
    </div>
  );
}
