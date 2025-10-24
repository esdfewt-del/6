import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Building, MapPin } from 'lucide-react';

interface CompanySettings {
  id: string;
  companyId: string;
  workingHoursPerDay: string;
  workingDaysPerWeek: number;
  weekendDays: string[];
  overtimeRate: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  fiscalYearStart: string;
  enableBiometricAuth: boolean;
  enableGeofencing: boolean;
}

interface Company {
  id: string;
  name: string;
}

interface User {
  id: string;
  allowedLatitude: string | null;
  allowedLongitude: string | null;
  allowedRadius: string | null;
  enableLocationAuth: boolean;
}

interface AuthMeResponse {
  user: User;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Get company settings
  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ['/api/settings/company'],
    enabled: !!user,
  });

  // Get company info
  const { data: company } = useQuery<Company>({
    queryKey: ['/api/settings/company-info'],
    enabled: !!user,
  });

  // Get user info for location settings
  const { data: authMeData } = useQuery<AuthMeResponse>({
    queryKey: ['/api/auth/me'],
    enabled: !!user,
  });

  const userInfo = authMeData?.user;

  // Form state
  const [workingHours, setWorkingHours] = useState('');
  const [workingDays, setWorkingDays] = useState('');
  const [overtimeRate, setOvertimeRate] = useState('');
  const [currency, setCurrency] = useState('');
  const [timezone, setTimezone] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Location settings state
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('100');
  const [enableLocation, setEnableLocation] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Initialize form when settings load
  useEffect(() => {
    if (settings) {
      setWorkingHours(settings.workingHoursPerDay);
      setWorkingDays(settings.workingDaysPerWeek.toString());
      setOvertimeRate(settings.overtimeRate);
      setCurrency(settings.currency);
      setTimezone(settings.timezone);
    }
    if (company) {
      setCompanyName(company.name);
    }
    if (userInfo) {
      setLatitude(userInfo.allowedLatitude || '');
      setLongitude(userInfo.allowedLongitude || '');
      setRadius(userInfo.allowedRadius || '100');
      setEnableLocation(userInfo.enableLocationAuth || false);
    }
  }, [settings, company, userInfo]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PUT', '/api/settings/company', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/company'] });
      toast({ title: 'Settings updated', description: 'Company settings have been saved' });
    },
    onError: (error: any) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });

  // Update company info mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return await apiRequest('PUT', '/api/settings/company-info', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/company-info'] });
      toast({ title: 'Company name updated', description: 'Changes have been saved' });
    },
    onError: (error: any) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });

  // Update location settings mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PUT', '/api/settings/location', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({ title: 'Location settings updated', description: 'Location-based authentication has been configured' });
    },
    onError: (error: any) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      workingHoursPerDay: workingHours,
      workingDaysPerWeek: parseInt(workingDays),
      overtimeRate,
      currency,
      timezone,
    });
  };

  const handleSaveCompany = () => {
    if (!companyName.trim()) {
      toast({ title: 'Validation error', description: 'Company name is required', variant: 'destructive' });
      return;
    }
    updateCompanyMutation.mutate({ name: companyName });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ 
        title: 'Geolocation not supported', 
        description: 'Your browser does not support geolocation',
        variant: 'destructive'
      });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(8));
        setLongitude(position.coords.longitude.toFixed(8));
        setGettingLocation(false);
        toast({ 
          title: 'Location obtained', 
          description: 'Current location has been set'
        });
      },
      (error) => {
        setGettingLocation(false);
        toast({ 
          title: 'Location error', 
          description: error.message,
          variant: 'destructive'
        });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSaveLocation = () => {
    if (enableLocation && (!latitude || !longitude)) {
      toast({ 
        title: 'Validation error', 
        description: 'Please provide latitude and longitude',
        variant: 'destructive'
      });
      return;
    }

    updateLocationMutation.mutate({
      allowedLatitude: latitude || null,
      allowedLongitude: longitude || null,
      allowedRadius: radius || '100',
      enableLocationAuth: enableLocation,
    });
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'hr';

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Settings are only accessible to administrators</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-settings-title">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage company and system settings</p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList>
          <TabsTrigger value="company" data-testid="tab-company">Company</TabsTrigger>
          <TabsTrigger value="work" data-testid="tab-work">Work Hours</TabsTrigger>
          <TabsTrigger value="location" data-testid="tab-location">Location</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-ring" />
                <CardTitle>Company Information</CardTitle>
              </div>
              <CardDescription>Update your company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName || company?.name || ''}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company Name"
                  data-testid="input-company-name"
                />
              </div>
              <Button 
                onClick={handleSaveCompany}
                disabled={updateCompanyMutation.isPending}
                data-testid="button-save-company"
              >
                {updateCompanyMutation.isPending ? 'Saving...' : 'Save Company Info'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-ring" />
                <CardTitle>Work Hours Configuration</CardTitle>
              </div>
              <CardDescription>Configure work hours and overtime settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="working-hours">Working Hours Per Day</Label>
                      <Input
                        id="working-hours"
                        type="number"
                        value={workingHours || settings?.workingHoursPerDay || ''}
                        onChange={(e) => setWorkingHours(e.target.value)}
                        placeholder="8"
                        data-testid="input-working-hours"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="working-days">Working Days Per Week</Label>
                      <Input
                        id="working-days"
                        type="number"
                        value={workingDays || settings?.workingDaysPerWeek.toString() || ''}
                        onChange={(e) => setWorkingDays(e.target.value)}
                        placeholder="5"
                        data-testid="input-working-days"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="overtime-rate">Overtime Rate (multiplier)</Label>
                      <Input
                        id="overtime-rate"
                        type="number"
                        step="0.1"
                        value={overtimeRate || settings?.overtimeRate || ''}
                        onChange={(e) => setOvertimeRate(e.target.value)}
                        placeholder="1.5"
                        data-testid="input-overtime-rate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={currency || settings?.currency} onValueChange={setCurrency}>
                        <SelectTrigger id="currency" data-testid="select-currency">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select value={timezone || settings?.timezone} onValueChange={setTimezone}>
                        <SelectTrigger id="timezone" data-testid="select-timezone">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                          <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                          <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    onClick={handleSaveSettings}
                    disabled={updateSettingsMutation.isPending}
                    data-testid="button-save-settings"
                  >
                    {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-ring" />
                <CardTitle>Location-Based Authentication</CardTitle>
              </div>
              <CardDescription>
                Configure office location and allowed radius for employee login
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-md">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-location">Enable Location-Based Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require employees to be within specified range to login
                  </p>
                </div>
                <Switch
                  id="enable-location"
                  checked={enableLocation}
                  onCheckedChange={setEnableLocation}
                  data-testid="switch-enable-location"
                />
              </div>

              {enableLocation && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="0.00000001"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        placeholder="17.6868"
                        data-testid="input-latitude"
                      />
                      <p className="text-xs text-muted-foreground">Office latitude coordinate</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="0.00000001"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        placeholder="83.2185"
                        data-testid="input-longitude"
                      />
                      <p className="text-xs text-muted-foreground">Office longitude coordinate</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="radius">Allowed Radius (meters)</Label>
                    <Input
                      id="radius"
                      type="number"
                      value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                      placeholder="100"
                      data-testid="input-radius"
                    />
                    <p className="text-xs text-muted-foreground">
                      Employees must be within this radius to login (default: 100 meters)
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleGetCurrentLocation}
                    disabled={gettingLocation}
                    className="w-full"
                    data-testid="button-get-location"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    {gettingLocation ? 'Getting Location...' : 'Use Current Location'}
                  </Button>

                  <div className="p-4 bg-muted rounded-md">
                    <h4 className="text-sm font-medium mb-2">How it works:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Employees must be within the specified radius to login</li>
                      <li>If outside the range, they'll see their distance from the office</li>
                      <li>Distance shown in meters (if less than 1000m) or kilometers</li>
                      <li>Use "Get Current Location" button to set your current position</li>
                    </ul>
                  </div>
                </>
              )}

              <Button
                onClick={handleSaveLocation}
                disabled={updateLocationMutation.isPending}
                data-testid="button-save-location"
              >
                {updateLocationMutation.isPending ? 'Saving...' : 'Save Location Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
