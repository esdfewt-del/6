import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Plus, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TravelClaim {
  id: string;
  userId: string;
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
  estimatedCost: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function TravelPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState('');

  // Get travel claims history
  const { data: travelClaims } = useQuery<TravelClaim[]>({
    queryKey: ['/api/travel/history', user?.id],
    enabled: !!user,
  });

  // Submit travel claim mutation
  const submitClaimMutation = useMutation({
    mutationFn: async (data: { destination: string; purpose: string; startDate: string; endDate: string; estimatedCost: string }) => {
      return await apiRequest('POST', '/api/travel/request', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/travel/history', user?.id] });
      toast({ title: 'Travel claim submitted', description: 'Your request has been sent for approval' });
      setIsDialogOpen(false);
      setDestination('');
      setPurpose('');
      setStartDate('');
      setEndDate('');
      setAmount('');
    },
    onError: (error: any) => {
      toast({ title: 'Failed to submit claim', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmitClaim = () => {
    if (!destination || !purpose || !startDate || !endDate || !amount) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    
    // Validate dates are in correct format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) {
      toast({ title: 'Invalid start date', description: 'Please select a valid start date', variant: 'destructive' });
      return;
    }
    if (!dateRegex.test(endDate)) {
      toast({ title: 'Invalid end date', description: 'Please select a valid end date', variant: 'destructive' });
      return;
    }
    
    // Ensure dates are in full ISO format
    const formattedStartDate = `${startDate}T00:00:00.000Z`;
    const formattedEndDate = `${endDate}T00:00:00.000Z`;
    
    submitClaimMutation.mutate({ 
      destination, 
      purpose, 
      startDate: formattedStartDate, 
      endDate: formattedEndDate, 
      estimatedCost: amount 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const pendingClaims = travelClaims?.filter(c => c.status === 'pending') || [];
  const totalPending = pendingClaims.reduce((sum, claim) => sum + parseFloat(claim.estimatedCost || '0'), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold" data-testid="text-travel-title">Travel & Expenses</h1>
          <p className="text-muted-foreground mt-1">Submit travel claims and track reimbursements</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-submit-claim">
              <Plus className="mr-2 h-4 w-4" />
              Submit Travel Claim
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Travel Claim</DialogTitle>
              <DialogDescription>Request reimbursement for your travel expenses</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., Mumbai"
                  data-testid="input-destination"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Reason for travel"
                  data-testid="input-purpose"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-travel-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-travel-end"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Total Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-amount"
                />
              </div>
              <Button 
                onClick={handleSubmitClaim} 
                disabled={submitClaimMutation.isPending}
                className="w-full"
                data-testid="button-submit-travel-claim"
              >
                {submitClaimMutation.isPending ? 'Submitting...' : 'Submit Claim'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
            <MapPin className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-claims">{travelClaims?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            <DollarSign className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-count">{pendingClaims.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-amount">₹{totalPending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Travel Claims History */}
      <Card>
        <CardHeader>
          <CardTitle>Travel Claims History</CardTitle>
          <CardDescription>Your travel expense claims and status</CardDescription>
        </CardHeader>
        <CardContent>
          {travelClaims && travelClaims.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destination</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Travel Dates</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {travelClaims.map((claim) => (
                  <TableRow key={claim.id} data-testid={`claim-row-${claim.id}`}>
                    <TableCell className="font-medium">{claim.destination}</TableCell>
                    <TableCell className="max-w-xs truncate">{claim.purpose}</TableCell>
                    <TableCell>
                      {format(parseISO(claim.startDate), 'MMM dd')} - {format(parseISO(claim.endDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>₹{parseFloat(claim.estimatedCost || '0').toFixed(2)}</TableCell>
                    <TableCell>{format(parseISO(claim.createdAt), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(claim.status)}>
                        {claim.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No travel claims found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
