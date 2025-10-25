import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart as BarChartIcon, Users, Calendar, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area } from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, eachDayOfInterval, parseISO, startOfDay, startOfMonth, endOfMonth, isWithinInterval, isBefore, isAfter } from 'date-fns';

interface DashboardKPIs {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  avgAttendanceRate: string;
  pendingLeaves: number;
  pendingTravelClaims: number;
  totalPayroll: string;
}

interface AttendanceReport {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  totalOvertimeHours: number;
  attendanceRate: number;
  records: any[];
}

interface LeaveReport {
  totalLeaves: number;
  approvedLeaves: number;
  pendingLeaves: number;
  rejectedLeaves: number;
  totalDays: number;
  approvalRate: number;
  leaves: any[];
}

interface Attendance {
  id: string;
  userId: string;
  userName?: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  totalHours: string | null;
  status: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function AdminReportsPage() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const currentMonthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  
  // Separate date ranges for Attendance and Leave reports
  const [attendanceStartDate, setAttendanceStartDate] = useState(currentMonthStart);
  const [attendanceEndDate, setAttendanceEndDate] = useState(currentMonthEnd);
  const [leaveStartDate, setLeaveStartDate] = useState(currentMonthStart);
  const [leaveEndDate, setLeaveEndDate] = useState(currentMonthEnd);

  // Get dashboard KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery<DashboardKPIs>({
    queryKey: ['/api/analytics/dashboard'],
    enabled: !!user,
  });

  // Get approved leaves for current month (for KPI card)
  const { data: currentMonthLeaves } = useQuery<LeaveReport>({
    queryKey: [`/api/reports/leaves?startDate=${currentMonthStart}&endDate=${currentMonthEnd}&status=approved`],
    enabled: !!user,
  });

  // Get all attendance records for the company with date range
  const { data: allAttendance, isLoading: attendanceLoading } = useQuery<Attendance[]>({
    queryKey: ['/api/attendance/company', attendanceStartDate, attendanceEndDate],
    enabled: !!user && !!attendanceStartDate && !!attendanceEndDate,
  });

  // Get leave report - only approved leaves
  const { data: leaveReport, isLoading: leaveLoading } = useQuery<LeaveReport>({
    queryKey: [`/api/reports/leaves?startDate=${leaveStartDate}&endDate=${leaveEndDate}&status=approved`],
    enabled: !!user && !!leaveStartDate && !!leaveEndDate,
  });

  // Process attendance data for day-wise graphs (only present employees)
  const getDayWiseAttendanceData = () => {
    if (!allAttendance || !attendanceStartDate || !attendanceEndDate) return [];
    
    const startDate = parseISO(attendanceStartDate);
    const endDate = parseISO(attendanceEndDate);
    
    // Get all days in the date range
    const dateRange = eachDayOfInterval({
      start: startDate,
      end: endDate
    });
    
    // Initialize all days with zero count
    const dailyData: { [key: string]: { present: number; total: number } } = {};
    dateRange.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      dailyData[dateKey] = { present: 0, total: 0 };
    });
    
    // Count present employees for each day (only within selected range)
    allAttendance.forEach(record => {
      const recordDate = parseISO(record.date);
      
      // Skip records outside the selected date range
      if (isBefore(recordDate, startDate) || isAfter(recordDate, endDate)) {
        return;
      }
      
      const dateKey = format(recordDate, 'yyyy-MM-dd');
      
      if (dailyData[dateKey]) {
        dailyData[dateKey].total++;
        if (record.status === 'present') {
          dailyData[dateKey].present++;
        }
      }
    });
    
    // Convert to array and sort by date
    return Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, data]) => ({
        date: format(parseISO(dateKey), 'MMM dd'),
        fullDate: dateKey,
        present: data.present,
        total: data.total
      }));
  };

  const dayWiseData = getDayWiseAttendanceData();

  // Calculate totals
  const totalPresent = dayWiseData.reduce((sum, d) => sum + d.present, 0);
  const totalRecords = dayWiseData.reduce((sum, d) => sum + d.total, 0);

  // Process leave data for day-wise bar chart (only approved leaves)
  const getDayWiseLeaveData = () => {
    if (!leaveReport?.leaves || leaveReport.leaves.length === 0 || !leaveStartDate || !leaveEndDate) return [];
    
    const startDate = parseISO(leaveStartDate);
    const endDate = parseISO(leaveEndDate);
    
    // Get all days in the date range
    const dateRange = eachDayOfInterval({
      start: startDate,
      end: endDate
    });
    
    // Initialize all days with zero count
    const dailyLeaves: { [key: string]: number } = {};
    dateRange.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      dailyLeaves[dateKey] = 0;
    });
    
    // Count approved leaves for each day
    leaveReport.leaves.forEach((leave: any) => {
      if (leave.status === 'approved') {
        // Get all days covered by this leave
        const leaveStart = parseISO(leave.startDate);
        const leaveEnd = parseISO(leave.endDate);
        
        const leaveDays = eachDayOfInterval({
          start: leaveStart,
          end: leaveEnd
        });
        
        // Increment count for each day of the leave period (only within selected range)
        leaveDays.forEach(day => {
          // Skip days outside the selected date range
          if (isBefore(day, startDate) || isAfter(day, endDate)) {
            return;
          }
          
          const dateKey = format(day, 'yyyy-MM-dd');
          if (dailyLeaves[dateKey] !== undefined) {
            dailyLeaves[dateKey]++;
          }
        });
      }
    });
    
    // Convert to array for chart
    return Object.entries(dailyLeaves)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, count]) => ({
        date: format(parseISO(dateKey), 'MMM dd'),
        fullDate: dateKey,
        approvedLeaves: count
      }));
  };

  const dayWiseLeaveData = getDayWiseLeaveData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-admin-reports-title">
          Reports & Analytics
        </h1>
        <p className="text-muted-foreground mt-1">View insights and generate reports</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-kpi-employees">
                  {kpis?.totalEmployees || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis?.activeEmployees || 0} active
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <Calendar className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-kpi-present">
                  {kpis?.presentToday || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis?.avgAttendanceRate || '0'}% avg rate
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leaves Approved This Month</CardTitle>
            <Calendar className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-kpi-leaves">
                  {currentMonthLeaves?.approvedLeaves || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(), 'MMMM yyyy')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <div className="text-2xl font-bold" data-testid="text-kpi-payroll">
                ₹{kpis?.totalPayroll ? parseFloat(kpis.totalPayroll).toLocaleString() : '0'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList>
          <TabsTrigger value="attendance" data-testid="tab-attendance-report">Attendance</TabsTrigger>
          <TabsTrigger value="leaves" data-testid="tab-leave-report">Leaves</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChartIcon className="h-5 w-5 text-ring" />
                  <CardTitle>Attendance Report</CardTitle>
                </div>
              </div>
              <CardDescription>View day-wise attendance data for the selected period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="attendance-start-date">Start Date</Label>
                  <Input
                    id="attendance-start-date"
                    type="date"
                    value={attendanceStartDate}
                    onChange={(e) => setAttendanceStartDate(e.target.value)}
                    data-testid="input-attendance-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendance-end-date">End Date</Label>
                  <Input
                    id="attendance-end-date"
                    type="date"
                    value={attendanceEndDate}
                    onChange={(e) => setAttendanceEndDate(e.target.value)}
                    data-testid="input-attendance-end"
                  />
                </div>
              </div>

              {attendanceLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading attendance data...</div>
              ) : dayWiseData.length > 0 ? (
                <>
                  {/* Statistics Cards */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-md">
                      <p className="text-sm text-muted-foreground">Total Present</p>
                      <p className="text-2xl font-bold text-green-600" data-testid="text-total-present">{totalPresent}</p>
                    </div>
                    <div className="p-4 border rounded-md">
                      <p className="text-sm text-muted-foreground">Total Records</p>
                      <p className="text-2xl font-bold" data-testid="text-total-records">{totalRecords}</p>
                    </div>
                    <div className="p-4 border rounded-md">
                      <p className="text-sm text-muted-foreground">Attendance Rate</p>
                      <p className="text-2xl font-bold" data-testid="text-attendance-rate">
                        {totalRecords > 0 
                          ? ((totalPresent / totalRecords) * 100).toFixed(1)
                          : '0'}%
                      </p>
                    </div>
                  </div>

                  {/* Day-wise Present Employees - Line Chart */}
                  <div>
                    <h3 className="text-sm font-medium mb-4">Day-wise Attendance - Present Employees Only</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Showing number of present employees for each day in the selected period
                    </p>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={dayWiseData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="present" 
                          stroke="#22c55e" 
                          name="Present Employees" 
                          strokeWidth={3}
                          dot={{ fill: '#22c55e', r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance data found for the selected date range
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-ring" />
                <CardTitle>Leave Report (Approved)</CardTitle>
              </div>
              <CardDescription>View day-wise approved leaves for the selected period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leave-start">Start Date</Label>
                  <Input
                    id="leave-start"
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    data-testid="input-leave-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leave-end">End Date</Label>
                  <Input
                    id="leave-end"
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    data-testid="input-leave-end"
                  />
                </div>
              </div>

              {leaveLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading leave data...</div>
              ) : leaveReport && leaveReport.leaves.length > 0 ? (
                <>
                  {/* Statistics */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-md">
                      <p className="text-sm text-muted-foreground">Total Approved</p>
                      <p className="text-2xl font-bold" data-testid="text-approved-leaves">{leaveReport.approvedLeaves}</p>
                    </div>
                    <div className="p-4 border rounded-md">
                      <p className="text-sm text-muted-foreground">Total Days</p>
                      <p className="text-2xl font-bold" data-testid="text-total-leave-days">{leaveReport.totalDays}</p>
                    </div>
                    <div className="p-4 border rounded-md">
                      <p className="text-sm text-muted-foreground">Avg Days/Leave</p>
                      <p className="text-2xl font-bold" data-testid="text-avg-leave-days">
                        {leaveReport.approvedLeaves > 0 ? (leaveReport.totalDays / leaveReport.approvedLeaves).toFixed(1) : '0'}
                      </p>
                    </div>
                  </div>

                  {/* Day-wise Approved Leaves - Bar Chart */}
                  {dayWiseLeaveData.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-4">Day-wise Approved Leaves</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Showing number of employees on approved leave for each day in the selected period
                      </p>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={dayWiseLeaveData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="approvedLeaves"
                            fill="#3b82f6"
                            name="Employees on Leave"
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Approved Leaves Table */}
                  <div>
                    <h3 className="text-sm font-medium mb-4">Approved Leave Requests</h3>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Leave Type</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Days</TableHead>
                            <TableHead>Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leaveReport.leaves.map((leave: any) => (
                            <TableRow key={leave.id} data-testid={`row-leave-${leave.id}`}>
                              <TableCell>{leave.user?.fullName || 'N/A'}</TableCell>
                              <TableCell className="capitalize">{leave.leaveType}</TableCell>
                              <TableCell>{format(new Date(leave.startDate), 'MMM dd, yyyy')}</TableCell>
                              <TableCell>{format(new Date(leave.endDate), 'MMM dd, yyyy')}</TableCell>
                              <TableCell>{leave.totalDays}</TableCell>
                              <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No approved leave requests found for the selected date range
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
