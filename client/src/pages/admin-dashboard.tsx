import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Users, Calendar, DollarSign, Mail, Clock, CheckCircle, FileText, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import type { User, Leave, TravelRequest, Attendance, TravelClaim } from '@shared/schema';

type Employee = Omit<User, 'password'>;

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const currentDate = new Date();

  // Fetch all employees (active only) with refetch on focus
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees?isActive=true'],
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch today's attendance with real-time updates
  const { data: todayAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ['/api/attendance/company'],
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch pending leaves
  const { data: pendingLeaves = [] } = useQuery<(Leave & { user: Employee })[]>({
    queryKey: ['/api/leaves/pending'],
    enabled: !!user,
  });

  // Debug logging for pending leaves
  console.log('Admin Dashboard Pending Leaves Debug:', {
    pendingLeavesCount: pendingLeaves.length,
    pendingLeaves: pendingLeaves.map(leave => ({
      id: leave.id,
      userId: leave.userId,
      leaveType: leave.leaveType,
      status: leave.status,
      user: leave.user ? {
        id: leave.user.id,
        fullName: leave.user.fullName,
        email: leave.user.email
      } : null
    })),
    user: user ? {
      id: user.id,
      companyId: user.companyId,
      role: user.role
    } : null
  });

  // Fetch pending travel claims
  const { data: pendingTravelClaims = [] } = useQuery<(TravelRequest & { user: Employee })[]>({
    queryKey: ['/api/travel-claims/pending'],
    enabled: !!user,
  });

  // Fetch leave history (company-wide) via reports API
  const { data: leaveReport } = useQuery<{ leaves: (Leave & { user: Employee })[] }>({
    queryKey: ['/api/reports/leaves'],
    enabled: !!user,
  });

  // Fetch company travel claims (for dashboard history widget)
  const { data: companyTravelClaims = [] } = useQuery<(TravelClaim & { user: Employee })[]>({
    queryKey: ['/api/travel-claims/company'],
    enabled: !!user,
  });

  // Calculate stats
  const totalEmployees = employees.length;
  // Count employees who have checked in today (have checkIn timestamp and status is present)
  const presentToday = todayAttendance.filter(a => a.checkIn && a.status === 'present').length;
  const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;
  const pendingLeavesCount = pendingLeaves.length;

  // Debug logging for attendance data
  console.log('Admin Dashboard Debug:', {
    totalEmployees,
    todayAttendanceCount: todayAttendance.length,
    presentToday,
    attendanceRate,
    todayAttendance: todayAttendance.map(a => ({
      id: a.id,
      userId: a.userId,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      status: a.status,
      date: a.date
    }))
  });

  // If no attendance data, show 0 instead of undefined
  const displayPresentToday = presentToday || 0;
  const displayAttendanceRate = attendanceRate || 0;

  // Get recent pending leaves (limit to 2)
  const recentPendingLeaves = pendingLeaves.slice(0, 2);

  // Get recent pending travel claims (limit to 1)
  const recentPendingTravel = pendingTravelClaims.slice(0, 1);

  // Derive recent leave history (latest 5 non-pending leaves)
  const recentLeaveHistory: (Leave & { user: Employee })[] = (leaveReport?.leaves || [])
    .filter(l => l.status !== 'pending')
    .sort((a, b) => new Date(b.endDate as any).getTime() - new Date(a.endDate as any).getTime())
    .slice(0, 5);

  // Derive recent travel claims (latest 3)
  const recentTravelClaims = (companyTravelClaims || [])
    .slice()
    .sort((a, b) => new Date(b.submittedAt as any).getTime() - new Date(a.submittedAt as any).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground" data-testid="text-admin-welcome">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-admin-subtitle">
            Complete control over employee management
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span data-testid="text-admin-date">{format(currentDate, 'EEEE, MMMM d, yyyy')}</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-employees">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">Active employees</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-employees-present">{displayPresentToday}</div>
            <p className="text-xs text-muted-foreground mt-1">{displayAttendanceRate}% attendance rate</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <Calendar className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-leaves">{pendingLeavesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Require approval</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Travel</CardTitle>
            <DollarSign className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-monthly-payroll">{pendingTravelClaims.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Claims to review</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Approval Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Leave Approvals</CardTitle>
              <CardDescription>Review and approve pending leave requests</CardDescription>
            </div>
            <Badge variant="default" className="bg-chart-4 hover:bg-chart-4" data-testid="badge-pending-count">
              {pendingLeavesCount} Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPendingLeaves.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-2">No pending leave requests</p>
                <p className="text-xs text-muted-foreground">
                  When employees apply for leave, their requests will appear here for your review and approval.
                </p>
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation('/admin/leaves')}
                  >
                    View All Leaves
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : (
              recentPendingLeaves.map((leave, index) => (
                <div key={leave.id} className="rounded-lg border p-4 space-y-3" data-testid={`leave-approval-item-${index + 1}`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{leave.user?.fullName || 'Employee'} - {leave.leaveType}</p>
                      <p className="text-sm text-muted-foreground">{leave.user?.position || 'Position'} • {leave.user?.department || 'Department'}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(leave.startDate), 'MMM dd')} - {format(new Date(leave.endDate), 'MMM dd, yyyy')}
                      </p>
                      {leave.reason && <p className="text-sm mt-2">Reason: {leave.reason}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setLocation('/admin/leaves')}
                      data-testid={`button-view-leave-details-${index + 1}`}
                    >
                      View Details
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="pt-2 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setLocation('/admin/leaves')}
              data-testid="button-view-all-leaves"
            >
              View All Leave Requests
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Actions Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Salary Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-ring" />
              Salary Management
            </CardTitle>
            <CardDescription>Process monthly salaries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-3 flex items-center justify-between" data-testid="salary-item-1">
              <div>
                <p className="font-medium">{format(currentDate, 'MMMM yyyy')} Payroll</p>
                <p className="text-sm text-muted-foreground">{totalEmployees} employees</p>
              </div>
            </div>
            <Button 
              className="w-full"
              onClick={() => setLocation('/admin/salary')}
              data-testid="button-process-salary"
            >
              Manage Salaries
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Leave History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-chart-4" />
              Leave History
            </CardTitle>
            <CardDescription>Recent approved/rejected leaves</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLeaveHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent leave history</p>
            ) : (
              recentLeaveHistory.map((l, idx) => (
                <div key={l.id} className="rounded-lg border p-3 space-y-2" data-testid={`leave-history-item-${idx+1}`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{l.user?.fullName || 'Employee'} - {l.leaveType || l.leaveType}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(l.startDate as any), 'MMM dd')} - {format(new Date(l.endDate as any), 'MMM dd, yyyy')}
                      </p>
                      {l.reason && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs" title={l.reason}>
                          Reason: {l.reason}
                        </p>
                      )}
                      {l.approvedBy && (
                        <p className="text-xs text-muted-foreground">
                          {l.status === 'approved' ? 'Approved by' : 'Rejected by'}: {l.approvedBy}
                        </p>
                      )}
                    </div>
                    <Badge variant={l.status === 'approved' ? 'default' : 'secondary'}>
                      {l.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setLocation('/admin/leaves')}
                data-testid="button-view-leave-history"
              >
                View All Leaves
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Employee Activity Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-ring" />
              Activity Logs
            </CardTitle>
            <CardDescription>Monitor employee daily activities and work progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">View all employee activity logs</p>
              <Button 
                className="w-full"
                onClick={() => setLocation('/admin/activity-logs')}
                data-testid="button-view-activity-logs"
              >
                View Activity Logs
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Travel & Reimbursement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-ring" />
              Travel Claims
            </CardTitle>
            <CardDescription>Review and approve travel reimbursements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTravelClaims.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent travel claims</p>
            ) : (
              recentTravelClaims.map((c, index) => (
                <div key={c.id} className="rounded-lg border p-3 space-y-2" data-testid={`travel-claim-item-${index + 1}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{(c as any).user?.fullName || 'Employee'}</p>
                      <p className="text-sm text-muted-foreground">₹{parseFloat((c as any).amount as any).toLocaleString()} • {(c as any).category || 'Travel Expense'}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date((c as any).submittedAt as any), 'MMM dd, yyyy')}</p>
                    </div>
                    <Badge variant={c.status === 'approved' ? 'default' : c.status === 'rejected' ? 'destructive' : 'secondary'}>{c.status}</Badge>
                  </div>
                </div>
              ))
            )}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setLocation('/admin/travel')}
                data-testid="button-manage-travel"
              >
                Manage Claims
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setLocation('/admin/travel-history')}
                data-testid="button-travel-history"
              >
                View History
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Communication Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-ring" />
            Communication
          </CardTitle>
          <CardDescription>Send updates to all employees</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="Type your message to all employees..." 
            className="min-h-24"
            data-testid="input-broadcast-message"
          />
          <div className="flex flex-wrap gap-3">
            <Button data-testid="button-mail-employees">
              <Mail className="h-4 w-4 mr-2" />
              Mail All Employees
            </Button>
            <Button variant="outline" data-testid="button-whatsapp-updates">
              Send WhatsApp Updates
            </Button>
            <Button variant="outline" data-testid="button-daily-summary">
              Send Daily Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
