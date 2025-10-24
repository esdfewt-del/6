import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Check, X, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TravelClaim {
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
}

export default function AdminTravelPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Get pending travel claims
  const { data: pendingClaims } = useQuery<TravelClaim[]>({
    queryKey: ['/api/travel-claims/pending'],
    enabled: !!user,
  });

  // Approve claim mutation
  const approveMutation = useMutation({
    mutationFn: async (claimId: string) => {
      return await apiRequest('PUT', `/api/travel-claims/${claimId}/status`, {
        status: 'approved',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/travel-claims/pending'] });
      toast({ title: 'Travel claim approved', description: 'Employee has been notified' });
    },
    onError: (error: any) => {
      toast({ title: 'Approval failed', description: error.message, variant: 'destructive' });
    },
  });

  // Reject claim mutation
  const rejectMutation = useMutation({
    mutationFn: async (claimId: string) => {
      return await apiRequest('PUT', `/api/travel-claims/${claimId}/status`, {
        status: 'rejected',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/travel-claims/pending'] });
      toast({ title: 'Travel claim rejected', description: 'Employee has been notified' });
    },
    onError: (error: any) => {
      toast({ title: 'Rejection failed', description: error.message, variant: 'destructive' });
    },
  });

  const totalPending = pendingClaims?.reduce((sum, claim) => sum + parseFloat(claim.estimatedCost || '0'), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-admin-travel-title">
          Travel Claims Management
        </h1>
        <p className="text-muted-foreground mt-1">Review and approve travel expense claims</p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            <MapPin className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-claims">
              {pendingClaims?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-amount">
              ₹{totalPending.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Claims */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Travel Claims</CardTitle>
          <CardDescription>Review and approve reimbursement requests</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingClaims && pendingClaims.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Travel Dates</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingClaims.map((claim) => (
                  <TableRow key={claim.id} data-testid={`claim-row-${claim.id}`}>
                    <TableCell className="font-medium">{claim.userName || 'Employee'}</TableCell>
                    <TableCell>{claim.destination}</TableCell>
                    <TableCell className="max-w-xs truncate">{claim.purpose}</TableCell>
                    <TableCell>
                      {format(parseISO(claim.startDate), 'MMM dd')} - {format(parseISO(claim.endDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="font-bold">₹{parseFloat(claim.estimatedCost || '0').toFixed(2)}</TableCell>
                    <TableCell>{format(parseISO(claim.createdAt), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(claim.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          data-testid={`button-approve-${claim.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectMutation.mutate(claim.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          data-testid={`button-reject-${claim.id}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No pending travel claims
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
