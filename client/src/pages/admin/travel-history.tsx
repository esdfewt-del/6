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
import { MapPin, Filter, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TravelRequest {
  id: string;
  userId: string;
  userName?: string;
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
  estimatedCost: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
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

export default function AdminTravelHistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Get all travel requests via reports endpoint
  const { data: travelReport, isLoading } = useQuery<{ travelRequests: TravelRequest[] }>({
    queryKey: ['/api/reports/travel-requests'],
    enabled: !!user,
  });

  // Filter requests based on status
  const allRequests = travelReport?.travelRequests || [];
  const filteredRequests = statusFilter === 'all' 
    ? allRequests 
    : allRequests.filter(request => request.status === statusFilter);
  
  const pendingRequests = allRequests.filter(request => request.status === 'pending');
  const totalPendingAmount = pendingRequests.reduce((sum, request) => sum + parseFloat(request.estimatedCost || '0'), 0);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-admin-travel-history-title">
          Travel Requests History
        </h1>
        <p className="text-muted-foreground mt-1">Review and manage all employee travel requests</p>
      </div>

      {/* Filter and Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filter by status:</span>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="default" className="bg-chart-4">
            {pendingRequests.length} Pending
          </Badge>
          <Badge variant="outline">
            ₹{totalPendingAmount.toFixed(2)} Pending Amount
          </Badge>
          <Badge variant="secondary">
            {allRequests.length} Total
          </Badge>
        </div>
      </div>

      {/* Travel Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Travel Requests</CardTitle>
              <CardDescription>
                {statusFilter === 'all' 
                  ? 'All employee travel requests' 
                  : `${statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'Unknown'} travel requests`
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading travel requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {statusFilter === 'all' ? '' : statusFilter} travel requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Travel Dates</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id} data-testid={`request-row-${request.id}`}>
                    <TableCell className="font-medium">
                      {request.user?.fullName || request.userName || 'Employee'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {request.destination}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{request.purpose}</TableCell>
                    <TableCell>
                      {format(parseISO(request.startDate), 'MMM dd')} - {format(parseISO(request.endDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-bold">
                        <DollarSign className="h-4 w-4" />
                        ₹{parseFloat(request.estimatedCost || '0').toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>{format(parseISO(request.createdAt), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant={
                        request.status === 'approved' ? 'default' : 
                        request.status === 'rejected' ? 'destructive' : 
                        'secondary'
                      }>
                        {request.status}
                      </Badge>
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
