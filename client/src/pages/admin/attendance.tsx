import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserCheck, Calendar, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface AttendanceRecord {
  id: string;
  userId: string;
  userName?: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  totalHours: string | null;
  status: string;
  location?: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

const COLORS = {
  total: '#f97316',
  present: '#22c55e',
  absent: '#ef4444',
  leave: '#f59e0b',
};

export default function AttendanceManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const today = new Date().toISOString().slice(0, 10);
  
  const [selectedDate, setSelectedDate] = useState(today);

  // Fetch all employees
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!user,
  });

  // Fetch attendance data for selected date
  const { data: attendanceData = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/company', selectedDate, selectedDate],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendance/company?startDate=${selectedDate}&endDate=${selectedDate}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch attendance');
      return response.json();
    },
    enabled: !!user && !!selectedDate,
    refetchInterval: 30000,
  });

  // Fetch today's attendance separately for stats
  const { data: todayAttendanceData = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/company', today, today],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendance/company?startDate=${today}&endDate=${today}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch attendance');
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Calculate total active employees
  const totalEmployees = employees.filter(emp => emp.isActive && emp.role === 'employee').length;

  // Today's stats
  const todayPresent = todayAttendanceData.filter(r => r.status === 'present').length;
  const todayOnLeave = todayAttendanceData.filter(r => r.status === 'leave').length;

  // Selected date stats
  const selectedDatePresent = attendanceData.filter(r => r.status === 'present').length;
  const selectedDateOnLeave = attendanceData.filter(r => r.status === 'leave').length;
  const selectedDateAbsent = totalEmployees - selectedDatePresent - selectedDateOnLeave;

  // Create attendance records for ALL employees for selected date
  const employeeAttendanceMap = new Map(
    attendanceData.map(record => [record.userId, record])
  );

  const selectedDateRecords = employees
    .filter(emp => emp.isActive && emp.role === 'employee')
    .map(emp => {
      const attendance = employeeAttendanceMap.get(emp.id);
      if (attendance) {
        return { ...attendance, userName: emp.fullName };
      }
      // Employee has no attendance record - mark as absent
      return {
        id: `absent-${emp.id}`,
        userId: emp.id,
        userName: emp.fullName,
        date: selectedDate,
        checkIn: '',
        checkOut: null,
        totalHours: null,
        status: 'absent',
        location: '-',
      } as AttendanceRecord;
    })
    .sort((a, b) => {
      // Sort by status: present first, then leave, then absent
      const statusOrder = { present: 0, leave: 1, absent: 2 };
      return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
    });

  // Donut chart data for selected date
  const donutData = [
    { name: 'Present', value: selectedDatePresent, color: COLORS.present },
    { name: 'Absent', value: selectedDateAbsent, color: COLORS.absent },
    { name: 'On Leave', value: selectedDateOnLeave, color: COLORS.leave },
  ].filter(item => item.value > 0);

  // Calculate daily stats for last 7 days for the bar chart
  const { data: weekAttendanceData = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/company/week'],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      
      const start = startDate.toISOString().slice(0, 10);
      const end = endDate.toISOString().slice(0, 10);
      
      const response = await fetch(
        `/api/attendance/company?startDate=${start}&endDate=${end}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch attendance');
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Generate complete 7-day date range
  const generateLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().slice(0, 10));
    }
    return days;
  };

  const last7Days = generateLast7Days();

  // Initialize all days with zero attendance
  const dateGroups = last7Days.reduce((acc, date) => {
    acc[date] = { date, present: 0 };
    return acc;
  }, {} as Record<string, { date: string; present: number }>);

  // Fill in actual attendance counts
  weekAttendanceData.forEach(record => {
    const date = new Date(record.date).toISOString().slice(0, 10);
    if (dateGroups[date] && record.status === 'present') {
      dateGroups[date].present++;
    }
  });

  const dailyChartData = last7Days.map(date => dateGroups[date]);

  // Export to Excel - only selected date records
  const handleExport = () => {
    if (selectedDateRecords.length === 0) {
      toast({
        title: 'No data to export',
        description: `No present employees found for ${format(parseISO(selectedDate), 'MMM dd, yyyy')}.`,
        variant: 'destructive',
      });
      return;
    }

    const exportData = selectedDateRecords.map(record => ({
      'Employee Name': record.userName || 'Unknown',
      'Date': format(parseISO(record.date), 'MMM dd, yyyy'),
      'Check In': record.checkIn ? format(parseISO(record.checkIn), 'hh:mm a') : '-',
      'Check Out': record.checkOut ? format(parseISO(record.checkOut), 'hh:mm a') : record.checkIn ? 'Not checked out' : '-',
      'Total Hours': record.totalHours || '-',
      'Status': record.status.toUpperCase(),
      'Location': record.location || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    ws['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 12 }, 
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }
    ];

    const filename = `Attendance_${selectedDate}.xlsx`;
    XLSX.writeFile(wb, filename);

    toast({
      title: 'Export successful',
      description: `Exported ${selectedDateRecords.length} records to ${filename}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-attendance-title">
          Attendance Management
        </h1>
        <p className="text-muted-foreground mt-1">Daily attendance view for all employees</p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-employees">
              {totalEmployees}
            </div>
            <p className="text-xs text-muted-foreground">
              Active employees in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-present-today">
              {todayPresent}
            </div>
            <p className="text-xs text-muted-foreground">
              As of {format(new Date(), 'hh:mm a')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="stat-on-leave">
              {todayOnLeave}
            </div>
            <p className="text-xs text-muted-foreground">
              Employees on leave today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donut Chart - Attendance Distribution for Selected Day */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Distribution</CardTitle>
            <CardDescription>
              Breakdown for {format(parseISO(selectedDate), 'MMM dd, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Label htmlFor="chart-date" className="text-sm">Select Date:</Label>
                <Input
                  id="chart-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={today}
                  className="w-auto"
                  data-testid="input-chart-date"
                />
              </div>
              
              {donutData.length > 0 ? (
                <div className="relative">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className="text-3xl font-bold" style={{ color: COLORS.total }}>
                      {totalEmployees}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No data available for this date
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart - Daily Attendance (Last 7 Days) */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Attendance</CardTitle>
            <CardDescription>Employees present per day (Last 7 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                  />
                  <YAxis label={{ value: 'Employees', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    labelFormatter={(date) => format(parseISO(date as string), 'MMM dd, yyyy')}
                    formatter={(value) => [`${value} employees`, 'Present']}
                  />
                  <Bar 
                    dataKey="present" 
                    fill={COLORS.present} 
                    name="Present" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Attendance
          </CardTitle>
          <CardDescription>
            Download attendance records shown in the table below for selected date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExport}
            disabled={isLoading || selectedDateRecords.length === 0}
            data-testid="button-export"
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            Export to Excel ({selectedDateRecords.length} records for {format(parseISO(selectedDate), 'MMM dd')})
          </Button>
        </CardContent>
      </Card>

      {/* Attendance Records - Table for Selected Day */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>All employees for {format(parseISO(selectedDate), 'MMMM dd, yyyy')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="selected-date" className="text-sm">Select Date:</Label>
              <Input
                id="selected-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={today}
                className="w-auto"
                data-testid="input-selected-date"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading attendance records...
            </div>
          ) : selectedDateRecords.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Showing {selectedDateRecords.length} employee(s) - {selectedDatePresent} present, {selectedDateOnLeave} on leave, {selectedDateAbsent} absent
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDateRecords.map((record) => (
                      <TableRow key={record.id} data-testid={`record-${record.id}`}>
                        <TableCell className="font-medium">
                          {record.userName || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {record.checkIn 
                            ? format(parseISO(record.checkIn), 'hh:mm a')
                            : <span className="text-muted-foreground">-</span>
                          }
                        </TableCell>
                        <TableCell>
                          {record.checkOut 
                            ? format(parseISO(record.checkOut), 'hh:mm a')
                            : record.checkIn 
                              ? <span className="text-muted-foreground">Not yet</span>
                              : <span className="text-muted-foreground">-</span>
                          }
                        </TableCell>
                        <TableCell>
                          {record.totalHours || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="default"
                            className={
                              record.status === 'present' ? 'bg-green-500' :
                              record.status === 'absent' ? 'bg-red-500' :
                              record.status === 'leave' ? 'bg-orange-500' : ''
                            }
                          >
                            {record.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.location || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No employees found for {format(parseISO(selectedDate), 'MMMM dd, yyyy')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
