import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart as BarChartIcon, Users, Calendar, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, eachDayOfInterval, parseISO, startOfDay } from 'date-fns';

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
  // Default to last 6 months for better monthly view
  const sixMonthsAgo = format(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(sixMonthsAgo);
  const [endDate, setEndDate] = useState(today);

  // Get dashboard KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery<DashboardKPIs>({
    queryKey: ['/api/analytics/dashboard'],
    enabled: !!user,
  });

  // Get all attendance records for the company with date range
  const { data: allAttendance, isLoading: attendanceLoading } = useQuery<Attendance[]>({
    queryKey: ['/api/attendance/company', startDate, endDate],
    enabled: !!user && !!startDate && !!endDate,
  });

  // Get leave report - only approved leaves
  const { data: leaveReport, isLoading: leaveLoading } = useQuery<LeaveReport>({
    queryKey: [`/api/reports/leaves?startDate=${startDate}&endDate=${endDate}&status=approved`],
    enabled: !!user && !!startDate && !!endDate,
  });

  // Process attendance data for month-wise graphs (only present employees)
  const getMonthWiseAttendanceData = () => {
    if (!allAttendance || !startDate || !endDate) return [];
    
    // Group by month
    const monthlyData: { [key: string]: { present: number; total: number } } = {};
    
    allAttendance.forEach(record => {
      const monthKey = format(parseISO(record.date), 'yyyy-MM'); // e.g., "2025-10"
      const monthLabel = format(parseISO(record.date), 'MMM yyyy'); // e.g., "Oct 2025"
      
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

  // Process leave data for month-wise radar chart (only approved leaves)
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
    
    // Convert to array for radar chart
    return Object.entries(monthlyLeaves)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, count]) => ({
        month: format(parseISO(monthKey + '-01'), 'MMM yyyy'),
        approvedLeaves: count,
        fullMark: Math.max(...Object.values(monthlyLeaves)) + 5 // For radar chart scale
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
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <Calendar className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <div className="text-2xl font-bold" data-testid="text-kpi-leaves">
                {kpis?.pendingLeaves || 0}
              </div>
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
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-report-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-report-end"
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
                      <p className="text-sm text-muted-foreground">Total Present (All Months)</p>
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
                    <h3 className="text-sm font-medium mb-4">Monthly Attendance - Present Employees</h3>
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
                  Select date range to view attendance report
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
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-leave-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leave-end">End Date</Label>
                  <Input
                    id="leave-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
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

                  {/* Monthly Approved Leaves - Radar Chart */}
                  {monthWiseLeaveData.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-4">Monthly Approved Leaves - Capability Analysis</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Radar chart showing approved leaves distribution across months
                      </p>
                      <ResponsiveContainer width="100%" height={400}>
                        <RadarChart data={monthWiseLeaveData}>
                          <PolarGrid />
                          <PolarAngleAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12 }}
                          />
                          <PolarRadiusAxis angle={90} domain={[0, 'dataMax']} />
                          <Radar
                            name="Approved Leaves"
                            dataKey="approvedLeaves"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.6}
                            strokeWidth={2}
                          />
                          <Tooltip />
                          <Legend />
                        </RadarChart>
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
