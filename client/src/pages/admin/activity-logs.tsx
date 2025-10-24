import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User as UserIcon, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import type { ActivityLog, User } from '@shared/schema';

interface ActivityLogWithUser extends ActivityLog {
  user: Pick<User, 'id' | 'fullName' | 'email' | 'role' | 'department' | 'position'>;
}

export default function AdminActivityLogsPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all employees for filter dropdown
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ['/api/employees?isActive=true'],
    enabled: !!user,
  });

  // Fetch activity logs with filters
  const { data: activityLogs = [], isLoading, error: activityLogsError } = useQuery<ActivityLogWithUser[]>({
    queryKey: [`/api/activity-logs/company/${user?.companyId}`, selectedDate, selectedUser],
    enabled: !!user,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDate) params.append('startDate', selectedDate);
      if (selectedUser && selectedUser !== 'all') params.append('userId', selectedUser);
      
      const response = await fetch(`/api/activity-logs/company/${user?.companyId}?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch activity logs');
      const data = await response.json();
      
      // Parse date strings to Date objects
      return data.map((log: any) => ({
        ...log,
        date: new Date(log.date),
        createdAt: new Date(log.createdAt)
      }));
    },
  });

  // Default activity logs as fallback
  const defaultActivityLogs: ActivityLogWithUser[] = [
    {
      id: '1',
      userId: 'user1',
      date: new Date(),
      activities: 'Completed project documentation and prepared client presentation. Attended team meeting to discuss quarterly goals.',
      createdAt: new Date(),
      user: {
        id: 'user1',
        fullName: 'John Doe',
        email: 'john@example.com',
        role: 'employee',
        department: 'Sales',
        position: 'Sales Executive'
      }
    },
    {
      id: '2',
      userId: 'user2',
      date: new Date(),
      activities: 'Conducted market research for new product launch. Met with stakeholders to finalize marketing strategy.',
      createdAt: new Date(),
      user: {
        id: 'user2',
        fullName: 'Jane Smith',
        email: 'jane@example.com',
        role: 'employee',
        department: 'Marketing',
        position: 'Marketing Manager'
      }
    },
    {
      id: '3',
      userId: 'user3',
      date: new Date(Date.now() - 86400000),
      activities: 'Developed new features for the mobile application. Fixed critical bugs reported by QA team.',
      createdAt: new Date(Date.now() - 86400000),
      user: {
        id: 'user3',
        fullName: 'Mike Johnson',
        email: 'mike@example.com',
        role: 'employee',
        department: 'Engineering',
        position: 'Software Developer'
      }
    }
  ];

  // Use API data if available, otherwise use default fallback
  const availableActivityLogs = activityLogsError ? defaultActivityLogs : activityLogs;
  
  // Debug logging
  console.log('Activity Logs Debug:', {
    activityLogs,
    activityLogsError,
    availableActivityLogs,
    isLoading
  });

  // Helper function to safely get date string
  const getDateString = (date: Date | string): string => {
    if (date instanceof Date) {
      return date.toISOString().slice(0, 10);
    }
    return new Date(date).toISOString().slice(0, 10);
  };

  // Filter logs by search term, user, and date
  const filteredLogs = availableActivityLogs.filter(log => {
    const matchesSearch = (log.activities || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user?.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUser = selectedUser === 'all' || log.user.id === selectedUser;
    
    const matchesDate = !selectedDate || getDateString(log.date) === selectedDate;
    
    return matchesSearch && matchesUser && matchesDate;
  });

  const todayLogs = availableActivityLogs.filter(log => 
    getDateString(log.date) === new Date().toISOString().slice(0, 10)
  );

  const uniqueUsersToday = new Set(todayLogs.map(log => log.user.id)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-admin-activity-logs-title">
          Employee Activity Logs
        </h1>
        <p className="text-muted-foreground mt-1">Monitor employee daily activities and work progress</p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs Today</CardTitle>
            <Calendar className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-logs-today">{todayLogs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Activity entries</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users Today</CardTitle>
            <UserIcon className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-users-today">{uniqueUsersToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Employees logged activities</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <UserIcon className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-employees">{employees.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Company employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date-filter">Date</Label>
              <Input
                id="date-filter"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                data-testid="input-date-filter"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="user-filter">Employee</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger data-testid="select-user-filter">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.fullName} ({employee.department || 'No Department'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search-filter">Search Activities</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-filter"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-filter"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            Showing {filteredLogs.length} activity log{filteredLogs.length !== 1 ? 's' : ''}
            {selectedDate && ` for ${format(new Date(selectedDate), 'MMMM d, yyyy')}`}
            {activityLogsError && (
              <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                Using sample data. Database connection unavailable.
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center space-y-4">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-muted-foreground">Loading activity logs...</p>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Activity Logs Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedUser ? 'Try adjusting your filters' : 'No employees have logged activities yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{log.user.fullName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {log.user.department && log.user.position 
                            ? `${log.user.position} • ${log.user.department}`
                            : log.user.department || log.user.position || 'No Department'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{format(new Date(log.createdAt), 'h:mm a')}</span>
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        {format(new Date(log.date), 'MMM d')}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 rounded-md p-3">
                    <p className="text-sm whitespace-pre-wrap">{log.activities}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
