import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Calendar, Download, Clock, TrendingUp } from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

const COLORS = {
  present: '#22c55e',
  absent: '#ef4444',
  leave: '#f59e0b',
  halfDay: '#3b82f6',
};

export default function AttendanceManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString().slice(0, 10);
  
  const [selectedDate, setSelectedDate] = useState(today);
  const [exportStartDate, setExportStartDate] = useState(thirtyDaysAgo);
  const [exportEndDate, setExportEndDate] = useState(today);

  // Fetch attendance data for date range
  const { data: attendanceData = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/company', exportStartDate, exportEndDate],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendance/company?startDate=${exportStartDate}&endDate=${exportEndDate}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch attendance');
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Filter records for selected date - only show PRESENT employees
  const selectedDateRecords = attendanceData.filter(record => {
    const recordDate = new Date(record.date).toISOString().slice(0, 10);
    return recordDate === selectedDate && record.status === 'present';
  });

  // Calculate overview stats
  const totalRecords = attendanceData.length;
  const presentCount = attendanceData.filter(r => r.status === 'present').length;
  const absentCount = attendanceData.filter(r => r.status === 'absent').length;
  const leaveCount = attendanceData.filter(r => r.status === 'leave').length;
  
  // Today's stats
  const todayRecords = attendanceData.filter(record => {
    const recordDate = new Date(record.date).toISOString().slice(0, 10);
    return recordDate === today;
  });
  const todayPresent = todayRecords.filter(r => r.status === 'present').length;

  // Prepare chart data - Group by date
  const dateGroups = attendanceData.reduce((acc, record) => {
    const date = new Date(record.date).toISOString().slice(0, 10);
    if (!acc[date]) {
      acc[date] = { date, present: 0, absent: 0, leave: 0 };
    }
    if (record.status === 'present') acc[date].present++;
    else if (record.status === 'absent') acc[date].absent++;
    else if (record.status === 'leave') acc[date].leave++;
    return acc;
  }, {} as Record<string, { date: string; present: number; absent: number; leave: number }>);

  const chartData = Object.values(dateGroups)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14); // Last 14 days

  // Pie chart data
  const pieData = [
    { name: 'Present', value: presentCount, color: COLORS.present },
    { name: 'Absent', value: absentCount, color: COLORS.absent },
    { name: 'On Leave', value: leaveCount, color: COLORS.leave },
  ].filter(item => item.value > 0);

  // Export to Excel
  const handleExport = () => {
    if (attendanceData.length === 0) {
      toast({
        title: 'No data to export',
        description: 'No attendance records found for the selected date range.',
        variant: 'destructive',
      });
      return;
    }

    const exportData = attendanceData.map(record => ({
      'Employee Name': record.userName || 'Unknown',
      'Date': format(parseISO(record.date), 'MMM dd, yyyy'),
      'Check In': format(parseISO(record.checkIn), 'hh:mm a'),
      'Check Out': record.checkOut ? format(parseISO(record.checkOut), 'hh:mm a') : 'Not checked out',
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

    const filename = `Attendance_${exportStartDate}_to_${exportEndDate}.xlsx`;
    XLSX.writeFile(wb, filename);

    toast({
      title: 'Export successful',
      description: `Exported ${attendanceData.length} records to ${filename}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-attendance-title">
          Attendance Management
        </h1>
        <p className="text-muted-foreground mt-1">Monitor and manage employee attendance</p>
      </div>

      {/* Attendance Overview - Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-records">
              {totalRecords}
            </div>
            <p className="text-xs text-muted-foreground">
              {exportStartDate} to {exportEndDate}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
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
            <CardTitle className="text-sm font-medium">Total Present</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-present">
              {presentCount}
            </div>
            <p className="text-xs text-muted-foreground">
              In selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-on-leave">
              {leaveCount}
            </div>
            <p className="text-xs text-muted-foreground">
              In selected period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Attendance Stats - Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart - Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Attendance Trend</CardTitle>
            <CardDescription>Last 14 days attendance breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => format(parseISO(date as string), 'MMM dd, yyyy')}
                  />
                  <Legend />
                  <Bar dataKey="present" fill={COLORS.present} name="Present" />
                  <Bar dataKey="absent" fill={COLORS.absent} name="Absent" />
                  <Bar dataKey="leave" fill={COLORS.leave} name="Leave" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Overall Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Distribution</CardTitle>
            <CardDescription>Overall breakdown for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
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
          <CardDescription>Download attendance records for custom date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="export-start">Start Date</Label>
              <Input
                id="export-start"
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                data-testid="input-export-start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-end">End Date</Label>
              <Input
                id="export-end"
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                max={today}
                data-testid="input-export-end"
              />
            </div>
            <div className="flex items-end md:col-span-2">
              <Button
                onClick={handleExport}
                className="w-full"
                disabled={isLoading}
                data-testid="button-export"
              >
                <Download className="h-4 w-4 mr-2" />
                Export to Excel ({attendanceData.length} records)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records - Table for Selected Day */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>Only showing employees marked PRESENT on selected date</CardDescription>
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
                Showing {selectedDateRecords.length} record(s) for {format(parseISO(selectedDate), 'MMMM dd, yyyy')}
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
                          {format(parseISO(record.checkIn), 'hh:mm a')}
                        </TableCell>
                        <TableCell>
                          {record.checkOut 
                            ? format(parseISO(record.checkOut), 'hh:mm a')
                            : <span className="text-muted-foreground">Not yet</span>
                          }
                        </TableCell>
                        <TableCell>
                          {record.totalHours || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={record.status === 'present' ? 'default' : 'secondary'}
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
              No employees marked as PRESENT on {format(parseISO(selectedDate), 'MMMM dd, yyyy')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
