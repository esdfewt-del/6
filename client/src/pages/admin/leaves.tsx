import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Clock, Check, X, Calendar, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Leave {
  id: string;
  userId: string;
  userName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  leaveType?: string;
  startDate: string;
  endDate: string;
  days: number;
  totalDays?: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: string;
  appliedAt?: string;
  approvedBy?: string;
  remarks?: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    position: string;
    department: string;
    role: string;
  };
}

export default function AdminLeavesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Get all leaves via reports API
  const { data: leaveReport } = useQuery<{ leaves: Leave[] }>({
    queryKey: ['/api/reports/leaves'],
    enabled: !!user,
  });

  // Filter leaves based on status
  const allLeaves = leaveReport?.leaves || [];
  const filteredLeaves = statusFilter === 'all' 
    ? allLeaves 
    : allLeaves.filter(leave => leave.status === statusFilter);
  
  const pendingLeaves = allLeaves.filter(leave => leave.status === 'pending');

  // Approve leave mutation
  const approveMutation = useMutation({
    mutationFn: async (leaveId: string) => {
      return await apiRequest('PUT', `/api/leaves/${leaveId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leaves/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/leaves'] });
      toast({ title: 'Leave approved', description: 'Employee has been notified' });
    },
    onError: (error: any) => {
      toast({ title: 'Approval failed', description: error.message, variant: 'destructive' });
    },
  });

  // Reject leave mutation
  const rejectMutation = useMutation({
    mutationFn: async (leaveId: string) => {
      return await apiRequest('PUT', `/api/leaves/${leaveId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leaves/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/leaves'] });
      toast({ title: 'Leave rejected', description: 'Employee has been notified' });
    },
    onError: (error: any) => {
      toast({ title: 'Rejection failed', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-admin-leaves-title">
          Leave Management
        </h1>
        <p className="text-muted-foreground mt-1">Review and manage all employee leave requests</p>
      </div>

      {/* Filter and Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filter by status:</span>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leaves</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="default" className="bg-chart-4">
            {pendingLeaves.length} Pending
          </Badge>
          <Badge variant="outline">
            {allLeaves.length} Total
          </Badge>
        </div>
      </div>

      {/* Leave Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Leave Requests</CardTitle>
              <CardDescription>
                {statusFilter === 'all' 
                  ? 'All employee leave applications' 
                  : `${statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'Unknown'} leave applications`
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLeaves.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {statusFilter === 'all' ? '' : statusFilter} leave requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeaves.map((leave) => (
                  <TableRow key={leave.id} data-testid={`leave-row-${leave.id}`}>
                    <TableCell className="font-medium">{leave.user?.fullName || leave.userName || 'Employee'}</TableCell>
                    <TableCell>{leave.leaveType || leave.leaveTypeName || 'Leave'}</TableCell>
                    <TableCell>
                      {format(parseISO(leave.startDate), 'MMM dd')} - {format(parseISO(leave.endDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{leave.totalDays || leave.days}</TableCell>
                    <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                    <TableCell>{(leave.appliedAt || leave.appliedDate) ? format(parseISO(leave.appliedAt || leave.appliedDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        leave.status === 'approved' ? 'default' : 
                        leave.status === 'rejected' ? 'destructive' : 
                        'secondary'
                      }>
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {leave.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => approveMutation.mutate(leave.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            data-testid={`button-approve-${leave.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectMutation.mutate(leave.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            data-testid={`button-reject-${leave.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {leave.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
