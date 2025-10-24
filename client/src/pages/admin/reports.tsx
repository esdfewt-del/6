import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart as BarChartIcon, Users, Calendar, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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
  const oneWeekAgo = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(oneWeekAgo);
  const [endDate, setEndDate] = useState(today);

  // Get dashboard KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery<DashboardKPIs>({
    queryKey: ['/api/analytics/dashboard'],
    enabled: !!user,
  });

  // Get all attendance records for the company with date range
  const { data: allAttendance, isLoading: attendanceLoading } = useQuery<Attendance[]>({
    queryKey: ['/api/attendance/company', { startDate, endDate }],
    enabled: !!user && !!startDate && !!endDate,
  });

  // Get leave report - only approved leaves
  const { data: leaveReport, isLoading: leaveLoading } = useQuery<LeaveReport>({
    queryKey: ['/api/reports/leaves', { startDate, endDate, status: 'approved' }],
    enabled: !!user && !!startDate && !!endDate,
  });

  // Process attendance data for day-wise graphs
  const getDayWiseAttendanceData = () => {
    if (!allAttendance || !startDate || !endDate) return [];
    
    const days = eachDayOfInterval({
      start: new Date(startDate),
      end: new Date(endDate)
    });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayRecords = allAttendance.filter(a => {
        const recordDate = format(parseISO(a.date), 'yyyy-MM-dd');
        return recordDate === dayStr;
      });
      
      const present = dayRecords.filter(r => r.status === 'present').length;
      const absent = dayRecords.filter(r => r.status === 'absent').length;
      const leave = dayRecords.filter(r => r.status === 'leave').length;
      
      return {
        date: format(day, 'MMM dd'),
        fullDate: dayStr,
        present,
        absent,
        leave,
        total: present + absent + leave
      };
    });
  };

  const dayWiseData = getDayWiseAttendanceData();

  // Calculate totals for pie charts
  const totalPresent = dayWiseData.reduce((sum, d) => sum + d.present, 0);
  const totalAbsent = dayWiseData.reduce((sum, d) => sum + d.absent, 0);
  const totalLeave = dayWiseData.reduce((sum, d) => sum + d.leave, 0);

  const attendanceSummary = [
    { name: 'Present', value: totalPresent, color: COLORS[2] },
    { name: 'Absent', value: totalAbsent, color: COLORS[1] },
    { name: 'Leave', value: totalLeave, color: COLORS[3] }
  ].filter(item => item.value > 0);

  // Prepare bar chart data for leave types
  const leaveTypeData = leaveReport?.leaves ? 
    Object.entries(
      leaveReport.leaves.reduce((acc: any, leave: any) => {
        acc[leave.leaveType] = (acc[leave.leaveType] || 0) + 1;
        return acc;
      }, {})
    ).map(([type, count]) => ({ type, count })) : [];

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
              ) : dayWiseData.length > 0 ? (
                <>
                  {/* Statistics Cards */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="p-4 border rounded-md">
                      <p className="text-sm text-muted-foreground">Total Present</p>
                      <p className="text-2xl font-bold text-green-600" data-testid="text-total-present">{totalPresent}</p>
                    </div>
                    <div className="p-4 border rounded-md">
                      <p className="text-sm text-muted-foreground">Total Absent</p>
                      <p className="text-2xl font-bold text-red-600" data-testid="text-total-absent">{totalAbsent}</p>
                    </div>
                    <div className="p-4 border rounded-md">
                      <p className="text-sm text-muted-foreground">Total Leaves</p>
                      <p className="text-2xl font-bold text-blue-600" data-testid="text-total-leaves">{totalLeave}</p>
                    </div>
                    <div className="p-4 border rounded-md">
                      <p className="text-sm text-muted-foreground">Attendance Rate</p>
                      <p className="text-2xl font-bold" data-testid="text-attendance-rate">
                        {totalPresent + totalAbsent + totalLeave > 0 
                          ? ((totalPresent / (totalPresent + totalAbsent + totalLeave)) * 100).toFixed(1)
                          : '0'}%
                      </p>
                    </div>
                  </div>

                  {/* Absents / Leaves Graph */}
                  <div>
                    <h3 className="text-sm font-medium mb-4">Absents / Leaves Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dayWiseData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="absent" stroke={COLORS[1]} name="Absent" strokeWidth={2} />
                        <Line type="monotone" dataKey="leave" stroke={COLORS[3]} name="Leave" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Overall Employee Attendance Graph */}
                  <div>
                    <h3 className="text-sm font-medium mb-4">Overall Employee Attendance</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dayWiseData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="present" fill={COLORS[2]} name="Present" />
                        <Bar dataKey="absent" fill={COLORS[1]} name="Absent" />
                        <Bar dataKey="leave" fill={COLORS[3]} name="Leave" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Attendance Distribution Pie Chart */}
                  {attendanceSummary.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-4">Attendance Distribution</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={attendanceSummary}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={100}
                            fill="hsl(var(--chart-1))"
                            dataKey="value"
                          >
                            {attendanceSummary.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
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

                  {/* Leave Type Chart */}
                  {leaveTypeData.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-4">Approved Leaves by Type</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={leaveTypeData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="type" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="hsl(var(--chart-2))" />
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
