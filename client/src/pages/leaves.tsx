import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  maxDays: number;
  requiresApproval: boolean;
}

interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

interface Leave {
  id: string;
  userId: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
}

export default function LeavesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [forceFallback, setForceFallback] = useState(false);

  // Get leave types with better error handling
  const { data: leaveTypes, error: leaveTypesError, isLoading: leaveTypesLoading } = useQuery<LeaveType[]>({
    queryKey: ['/api/leave-types'],
    enabled: !!user,
    retry: 1, // Retry once
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    queryFn: async () => {
      try {
        const response = await fetch('/api/leave-types', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Leave types API response:', data);
        return data;
      } catch (error) {
        console.error('Leave types API error:', error);
        throw error;
      }
    },
  });

  // Default leave types as fallback
  const defaultLeaveTypes: LeaveType[] = [
    { id: '1', name: 'Sick Leave', description: 'Medical leave for illness', maxDays: 12, requiresApproval: true },
    { id: '2', name: 'Casual Leave', description: 'Personal leave', maxDays: 12, requiresApproval: true },
    { id: '3', name: 'Annual Leave', description: 'Annual vacation leave', maxDays: 21, requiresApproval: true },
    { id: '4', name: 'Maternity Leave', description: 'Maternity leave for female employees', maxDays: 90, requiresApproval: true },
    { id: '5', name: 'Paternity Leave', description: 'Paternity leave for male employees', maxDays: 15, requiresApproval: true },
  ];

  // Force fallback after 3 seconds if still loading
  useEffect(() => {
    if (leaveTypesLoading && !leaveTypesError) {
      const timer = setTimeout(() => {
        setForceFallback(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setForceFallback(false);
    }
  }, [leaveTypesLoading, leaveTypesError]);

  // Use API data if available, otherwise use default fallback
  const availableLeaveTypes = (leaveTypes && leaveTypes.length > 0) ? leaveTypes : defaultLeaveTypes;

  // Debug logging
  console.log('Leave Types Debug:', {
    leaveTypes,
    leaveTypesError,
    leaveTypesLoading,
    forceFallback,
    availableLeaveTypes,
    hasData: leaveTypes && leaveTypes.length > 0,
    hasError: !!leaveTypesError,
    usingFallback: availableLeaveTypes === defaultLeaveTypes
  });

  // Get leave balance
  const { data: leaveBalances } = useQuery<LeaveBalance[]>({
    queryKey: ['/api/leaves/balance', user?.id],
    enabled: !!user,
  });

  // Get leave history
  const { data: leaveHistory } = useQuery<Leave[]>({
    queryKey: ['/api/leaves/history', user?.id],
    enabled: !!user,
  });

  // Apply leave mutation
  const applyLeaveMutation = useMutation({
    mutationFn: async (data: { leaveTypeId: string; startDate: string; endDate: string; reason: string }) => {
      return await apiRequest('POST', '/api/leaves/apply', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leaves'] });
      toast({ title: 'Leave applied successfully', description: 'Your leave application has been submitted' });
      setIsDialogOpen(false);
      setSelectedLeaveType('');
      setStartDate('');
      setEndDate('');
      setReason('');
    },
    onError: (error: any) => {
      toast({ title: 'Failed to apply leave', description: error.message, variant: 'destructive' });
    },
  });

  const handleApplyLeave = () => {
    if (!selectedLeaveType || !startDate || !endDate || !reason) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    applyLeaveMutation.mutate({ leaveTypeId: selectedLeaveType, startDate, endDate, reason });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold" data-testid="text-leaves-title">Leave Management</h1>
          <p className="text-muted-foreground mt-1">Apply for leave and track your balance</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-apply-leave">
              <Plus className="mr-2 h-4 w-4" />
              Apply for Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>Submit your leave application</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="leave-type">Leave Type</Label>
                {(leaveTypesError || (availableLeaveTypes === defaultLeaveTypes)) && (
                  <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    {leaveTypesError ? 'Using default leave types. Database connection unavailable.' : 'Using default leave types. No leave types configured in database.'}
                  </div>
                )}
                <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType} disabled={leaveTypesLoading && !forceFallback}>
                  <SelectTrigger id="leave-type" data-testid="select-leave-type">
                    <SelectValue placeholder={leaveTypesLoading && !forceFallback ? "Loading leave types..." : "Select leave type"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLeaveTypes?.length > 0 ? (
                      availableLeaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-types" disabled>
                        No leave types available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide reason for leave"
                  data-testid="input-reason"
                />
              </div>
              <Button 
                onClick={handleApplyLeave} 
                disabled={applyLeaveMutation.isPending}
                className="w-full"
                data-testid="button-submit-leave"
              >
                {applyLeaveMutation.isPending ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {leaveBalances?.map((balance) => (
          <Card key={balance.id} className="hover-elevate" data-testid={`balance-card-${balance.leaveTypeId}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{balance.leaveTypeName || 'Leave'}</CardTitle>
              <Calendar className="h-4 w-4 text-ring" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balance.remainingDays} Days</div>
              <p className="text-xs text-muted-foreground mt-1">
                {balance.usedDays} used of {balance.totalDays}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leave History */}
      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
          <CardDescription>Your leave applications and approvals</CardDescription>
        </CardHeader>
        <CardContent>
          {leaveHistory && leaveHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveHistory.map((leave) => (
                  <TableRow key={leave.id} data-testid={`leave-row-${leave.id}`}>
                    <TableCell className="font-medium">{leave.leaveTypeName || 'Leave'}</TableCell>
                    <TableCell>{format(parseISO(leave.startDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{format(parseISO(leave.endDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{leave.days}</TableCell>
                    <TableCell>{format(parseISO(leave.appliedAt), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(leave.status)}>
                        {leave.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No leave applications found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
