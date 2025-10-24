import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, AlertCircle, Loader2 } from 'lucide-react';
import nanoflowsLogoJpg from '@/assets/nanoflows-logo.jpg';
import nanoflowsLogoPng from '@/assets/nanoflows-logo.png';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  companyName: z.string().min(2, 'Company name is required'),
  fullName: z.string().min(2, 'Full name is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

interface GeolocationPosition {
  latitude: number;
  longitude: number;
}

interface GeolocationError {
  code: number;
  message: string;
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'employee' | 'admin' | 'client'>('employee');
  const [isSignup, setIsSignup] = useState(false);
  
  // Geolocation state
  const [locationState, setLocationState] = useState<{
    status: 'idle' | 'requesting' | 'success' | 'error' | 'denied';
    position?: GeolocationPosition;
    error?: GeolocationError;
  }>({ status: 'idle' });
  
  // Show signup form by default when Client tab is active
  const handleTabChange = (tab: 'employee' | 'admin' | 'client') => {
    setActiveTab(tab);
    if (tab === 'client') {
      setIsSignup(true);
    } else {
      setIsSignup(false);
    }
  };

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', companyName: '', fullName: '' },
  });

  // Geolocation functions
  const requestLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({ code: 0, message: 'Geolocation is not supported by this browser' });
        return;
      }

      setLocationState({ status: 'requesting' });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocationState({ status: 'success', position: locationData });
          resolve(locationData);
        },
        (error) => {
          const errorData = {
            code: error.code,
            message: error.message,
          };
          setLocationState({ status: error.code === 1 ? 'denied' : 'error', error: errorData });
          reject(errorData);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  };

  const handleLogin = async (data: LoginFormData) => {
    try {
      // Request location first
      let locationData: GeolocationPosition | undefined;
      
      try {
        locationData = await requestLocation();
      } catch (error) {
        // If location is denied or fails, show warning but allow login attempt
        if (locationState.status === 'denied') {
          toast({
            title: 'Location access denied',
            description: 'Login may be restricted based on your location settings',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Location unavailable',
            description: 'Unable to verify location. Login may be restricted.',
            variant: 'destructive',
          });
        }
      }

      const loginPayload: any = {
        email: data.email,
        password: data.password,
      };

      // Include location data if available
      if (locationData) {
        loginPayload.latitude = locationData.latitude;
        loginPayload.longitude = locationData.longitude;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Check if it's a location-based rejection
        if (error.message && error.message.includes('location')) {
          toast({ 
            title: 'Login not permitted from this location', 
            description: error.message,
            variant: 'destructive' 
          });
        } else {
          toast({ 
            title: 'Login failed', 
            description: error.message || 'Invalid credentials',
            variant: 'destructive' 
          });
        }
        return;
      }

      const { user } = await response.json();
      
      toast({ title: 'Welcome back!', description: `Logged in as ${user.fullName}` });
      
      // Update auth state first
      login(user);
      
      // Then redirect based on role (we know the role from the response)
      setTimeout(() => {
        if (user.role === 'admin' || user.role === 'hr') {
          setLocation('/admin-dashboard');
        } else {
          setLocation('/employee-dashboard');
        }
      }, 0);
    } catch (error: any) {
      toast({ 
        title: 'Login error', 
        description: error.message || 'Something went wrong',
        variant: 'destructive' 
      });
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        toast({ 
          title: 'Signup failed', 
          description: error.message || 'Could not create company',
          variant: 'destructive' 
        });
        return;
      }

      const { user } = await response.json();
      
      toast({ 
        title: 'Company created!', 
        description: 'Your company has been set up successfully' 
      });
      
      // Update auth state first
      login(user);
      
      // Then redirect to admin dashboard
      setTimeout(() => {
        setLocation('/admin-dashboard');
      }, 0);
    } catch (error: any) {
      toast({ 
        title: 'Signup error', 
        description: error.message || 'Something went wrong',
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Gradient with logo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-ring items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent"></div>
        <div className="relative z-10 text-center space-y-8">
          <div className="flex justify-center mb-4">
            <img 
              src={nanoflowsLogoJpg} 
              alt="Nano Flows AI" 
              className="h-40 object-contain"
              data-testid="img-logo-large"
            />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-serif font-bold text-primary-foreground" data-testid="text-welcome-title">
              Employee Management System
            </h1>
            <p className="text-lg text-primary-foreground/90 max-w-md mx-auto" data-testid="text-welcome-description">
              Modern, intelligent, and seamless HR management for Startups to Enterprises
            </p>
            <p className="text-sm text-primary-foreground/70 max-w-md mx-auto">
              Powered by Nano Flows AI Software Technologies
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:hidden mb-8">
            <div className="flex justify-center mb-6">
              <img 
                src={nanoflowsLogoPng} 
                alt="Nano Flows AI" 
                className="h-24 object-contain"
                data-testid="img-logo-small"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as typeof activeTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="employee" data-testid="tab-employee">Employee</TabsTrigger>
              <TabsTrigger value="admin" data-testid="tab-admin">Admin</TabsTrigger>
              <TabsTrigger value="client" data-testid="tab-client">Client</TabsTrigger>
            </TabsList>

            <TabsContent value="employee">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-serif" data-testid="text-login-title">Employee Login</CardTitle>
                  <CardDescription data-testid="text-login-description">
                    Enter your credentials to access your dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    {/* Location Status */}
                    {locationState.status !== 'idle' && (
                      <Alert className={locationState.status === 'success' ? 'border-green-200 bg-green-50' : 
                                       locationState.status === 'error' || locationState.status === 'denied' ? 'border-red-200 bg-red-50' : 
                                       'border-yellow-200 bg-yellow-50'}>
                        <div className="flex items-center gap-2">
                          {locationState.status === 'requesting' && <Loader2 className="h-4 w-4 animate-spin" />}
                          {locationState.status === 'success' && <MapPin className="h-4 w-4 text-green-600" />}
                          {(locationState.status === 'error' || locationState.status === 'denied') && <AlertCircle className="h-4 w-4 text-red-600" />}
                          <AlertDescription className="text-sm">
                            {locationState.status === 'requesting' && 'Fetching your location...'}
                            {locationState.status === 'success' && 'Location verified successfully'}
                            {locationState.status === 'denied' && 'Location access denied - login may be restricted'}
                            {locationState.status === 'error' && 'Unable to verify location - login may be restricted'}
                          </AlertDescription>
                        </div>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="employee-email">Email</Label>
                      <Input
                        id="employee-email"
                        type="email"
                        placeholder="you@example.com"
                        data-testid="input-employee-email"
                        {...loginForm.register('email')}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employee-password">Password</Label>
                      <Input
                        id="employee-password"
                        type="password"
                        data-testid="input-employee-password"
                        {...loginForm.register('password')}
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" data-testid="button-employee-login">
                      Sign In
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-serif" data-testid="text-admin-login-title">Admin Login</CardTitle>
                  <CardDescription data-testid="text-admin-login-description">
                    Admin access to manage the entire system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-email">Email</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        placeholder="admin@nanoflows.com"
                        data-testid="input-admin-email"
                        {...loginForm.register('email')}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Password</Label>
                      <Input
                        id="admin-password"
                        type="password"
                        data-testid="input-admin-password"
                        {...loginForm.register('password')}
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" data-testid="button-admin-login">
                      Admin Sign In
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="client">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-serif" data-testid="text-client-title">
                    {isSignup ? 'Create Company Account' : 'Client Login'}
                  </CardTitle>
                  <CardDescription data-testid="text-client-description">
                    {isSignup ? 'Set up your company on Nano Flows EMS' : 'Access your company dashboard'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSignup ? (
                    <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="company-name">Company Name</Label>
                        <Input
                          id="company-name"
                          placeholder="Nano Flows AI Technologies"
                          data-testid="input-company-name"
                          {...signupForm.register('companyName')}
                        />
                        {signupForm.formState.errors.companyName && (
                          <p className="text-sm text-destructive">{signupForm.formState.errors.companyName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="full-name">Your Full Name</Label>
                        <Input
                          id="full-name"
                          placeholder="John Doe"
                          data-testid="input-full-name"
                          {...signupForm.register('fullName')}
                        />
                        {signupForm.formState.errors.fullName && (
                          <p className="text-sm text-destructive">{signupForm.formState.errors.fullName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="admin@yourcompany.com"
                          data-testid="input-signup-email"
                          {...signupForm.register('email')}
                        />
                        {signupForm.formState.errors.email && (
                          <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          data-testid="input-signup-password"
                          {...signupForm.register('password')}
                        />
                        {signupForm.formState.errors.password && (
                          <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      <Button type="submit" className="w-full" data-testid="button-signup">
                        Create Company Account
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={() => setIsSignup(false)}
                        data-testid="button-switch-to-login"
                      >
                        Already have an account? Sign in
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="client-email">Email</Label>
                        <Input
                          id="client-email"
                          type="email"
                          placeholder="admin@yourcompany.com"
                          data-testid="input-client-email"
                          {...loginForm.register('email')}
                        />
                        {loginForm.formState.errors.email && (
                          <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client-password">Password</Label>
                        <Input
                          id="client-password"
                          type="password"
                          data-testid="input-client-password"
                          {...loginForm.register('password')}
                        />
                        {loginForm.formState.errors.password && (
                          <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      <Button type="submit" className="w-full" data-testid="button-client-login">
                        Sign In
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setIsSignup(true)}
                        data-testid="button-switch-to-signup"
                      >
                        Create New Company Account
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
