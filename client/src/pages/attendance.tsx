import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Clock, LogIn, LogOut, Coffee, Play, Pause } from 'lucide-react';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  present: 'hsl(142, 76%, 36%)',
  absent: 'hsl(0, 84%, 60%)',
  leave: 'hsl(24, 95%, 53%)',
};

interface Attendance {
  id: string;
  userId: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  location: string | null;
  totalHours: string | null;
  overtimeHours: string | null;
  status: string;
}

interface Break {
  id: string;
  attendanceId: string;
  breakStart: string;
  breakEnd: string | null;
  breakType: string;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Get today's attendance
  const { data: todayAttendance, isLoading: loadingToday } = useQuery<Attendance & { breaks?: Break[] }>({
    queryKey: ['/api/attendance/today', user?.id],
    enabled: !!user,
  });

  // Get all attendance records for the user
  const { data: allAttendance = [] } = useQuery<Attendance[]>({
    queryKey: [`/api/attendance/user/${user?.id}`],
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/attendance/check-in', {
        location: 'Office',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
      queryClient.invalidateQueries({ queryKey: [`/api/attendance/user/${user?.id}`] });
      toast({ title: 'Checked in successfully', description: 'Your attendance has been recorded' });
    },
    onError: (error: any) => {
      toast({ title: 'Check-in failed', description: error.message, variant: 'destructive' });
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/attendance/check-out');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/history'] });
      queryClient.invalidateQueries({ queryKey: [`/api/attendance/user/${user?.id}`] });
      toast({ title: 'Checked out successfully', description: 'Have a great day!' });
    },
    onError: (error: any) => {
      toast({ title: 'Check-out failed', description: error.message, variant: 'destructive' });
    },
  });

  // Break start mutation
  const breakStartMutation = useMutation({
    mutationFn: async () => {
      if (!todayAttendance?.id) throw new Error('No active check-in found');
      return await apiRequest('POST', '/api/attendance/break-start', {
        attendanceId: todayAttendance.id,
        breakType: 'regular',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
      toast({ title: 'Break started', description: 'Enjoy your break!' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to start break', description: error.message, variant: 'destructive' });
    },
  });

  // Break end mutation
  const breakEndMutation = useMutation({
    mutationFn: async (breakId: string) => {
      return await apiRequest('PUT', `/api/attendance/break-end/${breakId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
      toast({ title: 'Break ended', description: 'Welcome back!' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to end break', description: error.message, variant: 'destructive' });
    },
  });

  // Get attendance trend for the month (for attendance tracker)
  const getAttendanceTrend = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    
    const days = eachDayOfInterval({
      start: monthStart,
      end: monthEnd
    });
    
    let cumulativePresent = 0;
    let cumulativeAbsent = 0;
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayAttendance = allAttendance.find(a => {
        const attDate = typeof a.date === 'string' ? parseISO(a.date) : a.date;
        const recordDate = format(attDate, 'yyyy-MM-dd');
        return recordDate === dayStr;
      });
      
      if (dayAttendance?.status === 'present') {
        cumulativePresent++;
      } else if (dayAttendance?.status === 'absent') {
        cumulativeAbsent++;
      }
      
      return {
        date: format(day, 'MMM dd'),
        present: cumulativePresent,
        absent: cumulativeAbsent,
      };
    }).filter((_, index) => index % 3 === 0);
  };

  // Generate month options for the last 12 months
  const getMonthOptions = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy')
      });
    }
    return months;
  };

  const activeBreak = todayAttendance?.breaks?.find(b => !b.breakEnd);
  const isCheckedIn = todayAttendance && !todayAttendance.checkOut;
  const isOnBreak = !!activeBreak;
  const attendanceTrend = getAttendanceTrend();
  const monthOptions = getMonthOptions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-attendance-title">Attendance</h1>
        <p className="text-muted-foreground mt-1">Manage your check-ins and view attendance history</p>
      </div>

      {/* Today's Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-ring" />
            Today's Status - {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingToday ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Check-in Time</p>
                  <p className="text-xl font-semibold" data-testid="text-checkin-time">
                    {todayAttendance?.checkIn ? format(parseISO(todayAttendance.checkIn), 'hh:mm a') : 'Not checked in'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Check-out Time</p>
                  <p className="text-xl font-semibold" data-testid="text-checkout-time">
                    {todayAttendance?.checkOut ? format(parseISO(todayAttendance.checkOut), 'hh:mm a') : 'Not checked out'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Hours</p>
                  <p className="text-xl font-semibold" data-testid="text-total-hours">
                    {todayAttendance?.totalHours ? `${todayAttendance.totalHours} hrs` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge variant={isCheckedIn ? 'default' : 'secondary'} data-testid="badge-attendance-status">
                    {isCheckedIn ? (isOnBreak ? 'On Break' : 'Active') : 'Not Started'}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {!isCheckedIn && !todayAttendance && (
                  <Button 
                    onClick={() => checkInMutation.mutate()}
                    disabled={checkInMutation.isPending}
                    data-testid="button-check-in"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    {checkInMutation.isPending ? 'Checking in...' : 'Check In'}
                  </Button>
                )}
                
                {isCheckedIn && (
                  <>
                    <Button 
                      onClick={() => checkOutMutation.mutate()}
                      disabled={checkOutMutation.isPending || isOnBreak}
                      variant="destructive"
                      data-testid="button-check-out"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {checkOutMutation.isPending ? 'Checking out...' : 'Check Out'}
                    </Button>

                    {!isOnBreak ? (
                      <Button 
                        onClick={() => breakStartMutation.mutate()}
                        disabled={breakStartMutation.isPending}
                        variant="outline"
                        data-testid="button-break-start"
                      >
                        <Coffee className="mr-2 h-4 w-4" />
                        {breakStartMutation.isPending ? 'Starting...' : 'Start Break'}
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => activeBreak && breakEndMutation.mutate(activeBreak.id)}
                        disabled={breakEndMutation.isPending}
                        variant="outline"
                        data-testid="button-break-end"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {breakEndMutation.isPending ? 'Ending...' : 'End Break'}
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Break History Today */}
              {todayAttendance?.breaks && todayAttendance.breaks.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Today's Breaks</p>
                  <div className="space-y-2">
                    {todayAttendance.breaks.map((breakItem, index) => (
                      <div key={breakItem.id} className="flex items-center gap-4 text-sm" data-testid={`break-item-${index}`}>
                        <Pause className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(parseISO(breakItem.breakStart), 'hh:mm a')} - {' '}
                          {breakItem.breakEnd ? format(parseISO(breakItem.breakEnd), 'hh:mm a') : 'Ongoing'}
                        </span>
                        <Badge variant="outline">{breakItem.breakType}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Attendance Tracker with Trend Graph */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Attendance Tracker</CardTitle>
              <CardDescription>Cumulative attendance trend for the selected month</CardDescription>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40" data-testid="select-month-tracker">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {attendanceTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="present" 
                  stroke={COLORS.present} 
                  strokeWidth={2}
                  name="Present Days"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="absent" 
                  stroke={COLORS.absent} 
                  strokeWidth={2}
                  name="Absent Days"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No attendance records for this month
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
