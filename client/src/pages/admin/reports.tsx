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
import { format, eachDayOfInterval, parseISO, startOfDay, startOfMonth, endOfMonth } from 'date-fns';

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

  // Process attendance data for month-wise graphs (only present employees)
  const getMonthWiseAttendanceData = () => {
    if (!allAttendance || !attendanceStartDate || !attendanceEndDate) return [];
    
    // Group by month
    const monthlyData: { [key: string]: { present: number; total: number } } = {};
    
    allAttendance.forEach(record => {
      const monthKey = format(parseISO(record.date), 'yyyy-MM');
      const monthLabel = format(parseISO(record.date), 'MMM yyyy');
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { present: 0, total: 0 };
      }
      
      monthlyData[monthKey].total++;
      if (record.status === 'present') {
        monthlyData[monthKey].present++;
      }
    });
    
    // Convert to array and sort by month
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, data]) => ({
        month: format(parseISO(monthKey + '-01'), 'MMM yyyy'),
        monthKey,
        present: data.present,
        total: data.total
      }));
  };

  const monthWiseData = getMonthWiseAttendanceData();

  // Calculate totals
  const totalPresent = monthWiseData.reduce((sum, d) => sum + d.present, 0);
  const totalRecords = monthWiseData.reduce((sum, d) => sum + d.total, 0);

  // Process leave data for month-wise area chart (only approved leaves)
  const getMonthWiseLeaveData = () => {
    if (!leaveReport?.leaves || leaveReport.leaves.length === 0) return [];
    
    // Group approved leaves by month
    const monthlyLeaves: { [key: string]: number } = {};
    
    leaveReport.leaves.forEach((leave: any) => {
      if (leave.status === 'approved') {
        const monthKey = format(parseISO(leave.startDate), 'yyyy-MM');
        const monthLabel = format(parseISO(leave.startDate), 'MMM yyyy');
        
        if (!monthlyLeaves[monthKey]) {
          monthlyLeaves[monthKey] = 0;
        }
        monthlyLeaves[monthKey]++;
      }
    });
    
    // Convert to array for area chart
    return Object.entries(monthlyLeaves)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, count]) => ({
        month: format(parseISO(monthKey + '-01'), 'MMM yyyy'),
        approvedLeaves: count
      }));
  };

  const monthWiseLeaveData = getMonthWiseLeaveData();

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
              <CardDescription>View attendance data and statistics</CardDescription>
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
              ) : monthWiseData.length > 0 ? (
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

                  {/* Monthly Present Employees - Line Chart */}
                  <div>
                    <h3 className="text-sm font-medium mb-4">Monthly Attendance - Present Employees Only</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Showing number of present employees per month
                    </p>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={monthWiseData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
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
              <CardDescription>View all approved leave requests</CardDescription>
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

                  {/* Monthly Approved Leaves - Area Chart */}
                  {monthWiseLeaveData.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-4">Monthly Approved Leaves - Capability Analysis</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Area chart showing approved leaves distribution across months
                      </p>
                      <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={monthWiseLeaveData}>
                          <defs>
                            <linearGradient id="colorLeaves" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="month" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="approvedLeaves"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorLeaves)"
                            name="Approved Leaves"
                            strokeWidth={2}
                          />
                        </AreaChart>
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
