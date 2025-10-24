import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, DollarSign, FileText, MapPin, User, Briefcase, Check, X } from 'lucide-react';
import { format, eachDayOfInterval, parseISO, isSunday, isSaturday, isSameDay } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Leave, Attendance, Salary, TravelRequest, Holiday } from '@shared/schema';

const COLORS = {
  present: 'hsl(142, 76%, 36%)',  // Green
  absent: 'hsl(0, 84%, 60%)',     // Red
  leave: 'hsl(24, 95%, 53%)',     // Orange
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activityLog, setActivityLog] = useState('');
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(currentDate, 'yyyy-MM'));

  // Fetch today's attendance with real-time updates
  const { data: todayAttendance } = useQuery<Attendance>({
    queryKey: [`/api/attendance/today/${user?.id}`],
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  // Fetch all attendance for this month with real-time updates
  const { data: allAttendance = [] } = useQuery<Attendance[]>({
    queryKey: [`/api/attendance/user/${user?.id}`],
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  // Fetch holidays
  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ['/api/holidays'],
    enabled: !!user,
  });

  // Fetch recent leaves with real-time updates
  const { data: recentLeaves = [] } = useQuery<Leave[]>({
    queryKey: [`/api/leaves/user/${user?.id}`],
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  // Fetch recent salary
  const currentMonth = format(currentDate, 'yyyy-MM');
  const { data: currentSalary } = useQuery<Salary>({
    queryKey: [`/api/salaries/user/${user?.id}/month/${currentMonth}`],
    enabled: !!user,
  });

  // Fetch travel claims with real-time updates
  const { data: travelClaims = [] } = useQuery<TravelRequest[]>({
    queryKey: [`/api/travel/history/${user?.id}`],
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  // Fetch notifications
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: [`/api/notifications/${user?.id}`],
    enabled: !!user,
  });

  // Calculate stats
  const attendanceStatus = todayAttendance?.checkIn ? 'Present' : 'Absent';
  const thisMonthAttendance = allAttendance.filter(a => {
    const attDate = new Date(a.date);
    return attDate.getMonth() === currentDate.getMonth() && 
           attDate.getFullYear() === currentDate.getFullYear();
  }).length;

  const pendingLeaves = recentLeaves.filter(l => l.status === 'pending').length;
  const pendingTravel = travelClaims.filter(t => t.status === 'pending').length;
  
  // Get recent leaves for display (limit to 2)
  const displayLeaves = recentLeaves.slice(0, 2);

  const saveActivityMutation = useMutation({
    mutationFn: async () => {
      if (!activityLog.trim()) {
        throw new Error('Please enter some activity details');
      }
      return await apiRequest('POST', '/api/activity-logs', {
        userId: user?.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        activities: activityLog,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Activity Saved',
        description: 'Your daily activity log has been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/activity-logs/user/${user?.id}`] });
      setActivityLog('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get calendar data for selected month
  const getCalendarData = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    
    const days = eachDayOfInterval({
      start: monthStart,
      end: monthEnd
    });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayAttendance = allAttendance.find(a => {
        const attDate = typeof a.date === 'string' ? parseISO(a.date) : a.date;
        const recordDate = format(attDate, 'yyyy-MM-dd');
        return recordDate === dayStr;
      });
      
      const isHoliday = holidays.some(h => {
        const holidayDate = typeof h.date === 'string' ? parseISO(h.date) : h.date;
        return isSameDay(holidayDate, day);
      });
      
      const isWeekend = isSunday(day) || isSaturday(day);
      
      return {
        date: day,
        dayOfMonth: format(day, 'd'),
        dayOfWeek: format(day, 'EEE'),
        isWeekend,
        isHoliday,
        status: dayAttendance?.status || null,
        isPresent: dayAttendance?.status === 'present',
        isAbsent: dayAttendance?.status === 'absent',
        isLeave: dayAttendance?.status === 'leave',
      };
    });
  };

  const calendarData = getCalendarData();

  // Calculate monthly summary for donut chart
  const getMonthlyAttendanceSummary = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    
    const monthAttendance = allAttendance.filter(a => {
      const attDate = new Date(a.date);
      return attDate.getMonth() === month - 1 && attDate.getFullYear() === year;
    });
    
    const present = monthAttendance.filter(a => a.status === 'present').length;
    const absent = monthAttendance.filter(a => a.status === 'absent').length;
    const leave = monthAttendance.filter(a => a.status === 'leave').length;
    
    return [
      { name: 'Present', value: present, color: COLORS.present },
      { name: 'Absent', value: absent, color: COLORS.absent },
      { name: 'Leave', value: leave, color: COLORS.leave },
    ].filter(item => item.value > 0);
  };

  const monthlySummary = getMonthlyAttendanceSummary();

  // Generate month options for the last 12 months (for calendar month selection)
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

  const monthOptions = getMonthOptions();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground" data-testid="text-employee-welcome">
            Welcome back, {user?.fullName || 'Employee'}
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-employee-role">
            {user?.position || 'Employee'} • {user?.department || 'Department'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span data-testid="text-current-date">{format(currentDate, 'EEEE, MMMM d, yyyy')}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-attendance-status">{attendanceStatus}</div>
            <p className="text-xs text-muted-foreground mt-1">{thisMonthAttendance} Days this month</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-salary-amount">
              {currentSalary ? `₹${currentSalary.basicSalary.toLocaleString()}` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentSalary ? format(new Date(currentSalary.month), 'MMMM yyyy') : 'No salary data'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Balance</CardTitle>
            <Briefcase className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-leave-balance">{recentLeaves.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{pendingLeaves} pending approvals</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Travel Claims</CardTitle>
            <MapPin className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-travel-claims">{travelClaims.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{pendingTravel} pending approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Graphs Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Attendance Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daily Attendance</CardTitle>
                <CardDescription>Your attendance record for the selected month</CardDescription>
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40" data-testid="select-month">
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
            {/* Calendar Grid */}
            <div className="space-y-2">
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              
              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before the month starts */}
                {Array.from({ length: new Date(selectedMonth + '-01').getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                
                {/* Actual calendar days */}
                {calendarData.map((day, index) => (
                  <div
                    key={index}
                    className={`
                      aspect-square flex items-center justify-center rounded-md text-sm relative
                      ${day.isWeekend || day.isHoliday ? 'bg-muted/50' : 'bg-background'}
                      ${day.isPresent ? 'border-2 border-green-600' : ''}
                      ${day.isAbsent ? 'border-2 border-red-600' : ''}
                      ${day.isLeave ? 'border-2 border-orange-600' : ''}
                      hover:bg-muted/70 transition-colors
                    `}
                    data-testid={`calendar-day-${day.dayOfMonth}`}
                  >
                    <span className={`text-xs ${day.isWeekend || day.isHoliday ? 'text-muted-foreground' : ''}`}>
                      {day.dayOfMonth}
                    </span>
                    {day.isPresent && (
                      <Check className="absolute top-0.5 right-0.5 h-3 w-3 text-green-600" />
                    )}
                    {day.isAbsent && (
                      <X className="absolute top-0.5 right-0.5 h-3 w-3 text-red-600" />
                    )}
                    {day.isHoliday && (
                      <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 border-2 border-green-600 rounded flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-green-600" />
                  </div>
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 border-2 border-red-600 rounded flex items-center justify-center">
                    <X className="h-2.5 w-2.5 text-red-600" />
                  </div>
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-muted/50 rounded" />
                  <span>Weekend/Holiday</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Summary Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
            <CardDescription>Overview of your attendance for {format(new Date(selectedMonth), 'MMMM yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlySummary.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={monthlySummary}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      innerRadius={60}
                      outerRadius={100}
                      fill="hsl(var(--chart-1))"
                      dataKey="value"
                    >
                      {monthlySummary.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  {monthlySummary.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="text-2xl font-bold" style={{ color: item.color }}>
                        {item.value}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No attendance data for this month
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-ring" />
              Daily Activity Log
            </CardTitle>
            <CardDescription>Record your activities for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="What did you work on today?"
              value={activityLog}
              onChange={(e) => setActivityLog(e.target.value)}
              className="min-h-32"
              data-testid="input-activity-log"
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {format(currentDate, 'MMMM d, yyyy')}
              </p>
              <Button 
                size="sm" 
                onClick={() => saveActivityMutation.mutate()}
                disabled={saveActivityMutation.isPending || !activityLog.trim()}
                data-testid="button-save-activity"
              >
                {saveActivityMutation.isPending ? 'Saving...' : 'Save Log'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your attendance and requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              size="lg" 
              onClick={() => setLocation('/attendance')}
              data-testid="button-check-in"
            >
              <Clock className="mr-2 h-5 w-5" />
              Check In / Check Out
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              size="lg"
              onClick={() => setLocation('/leaves')}
              data-testid="button-apply-leave"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Apply for Leave
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              size="lg"
              onClick={() => setLocation('/travel')}
              data-testid="button-add-travel"
            >
              <MapPin className="mr-2 h-5 w-5" />
              Add Travel Bill
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              size="lg"
              onClick={() => setLocation('/salary')}
              data-testid="button-view-payslip"
            >
              <DollarSign className="mr-2 h-5 w-5" />
              View Payslip
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              size="lg"
              onClick={() => setLocation('/profile')}
              data-testid="button-update-profile"
            >
              <User className="mr-2 h-5 w-5" />
              Update Profile
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Notifications and Recent Leaves */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Your recent notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
              ) : (
                notifications.slice(0, 5).map((notification, index) => (
                  <div 
                    key={notification.id || index} 
                    className="flex items-start gap-3 border-l-2 border-l-ring pl-3 py-2"
                    data-testid={`notification-${index + 1}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      {notification.createdAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notification.createdAt), 'MMM dd, yyyy • hh:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Leaves */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Leave Applications</CardTitle>
            <CardDescription>Your leave history and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayLeaves.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No leave applications yet</p>
              ) : (
                displayLeaves.map((leave, index) => (
                  <div 
                    key={leave.id} 
                    className={`flex items-center justify-between border-l-4 pl-4 py-2 ${
                      leave.status === 'approved' ? 'border-l-chart-3' : 'border-l-chart-4'
                    }`}
                    data-testid={`leave-item-${index + 1}`}
                  >
                    <div>
                      <p className="font-medium">{leave.leaveType}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(leave.startDate), 'MMM dd')} - {format(new Date(leave.endDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <Badge 
                      variant="default" 
                      className={leave.status === 'approved' ? 'bg-chart-3 hover:bg-chart-3' : 'bg-chart-4 hover:bg-chart-4'}
                    >
                      {leave.status ? leave.status.charAt(0).toUpperCase() + leave.status.slice(1) : 'Unknown'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
