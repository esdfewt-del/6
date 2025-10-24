import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Users, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface SalaryStructure {
  id: string;
  userId: string;
  userName?: string;
  basicSalary: string;
  hra: string;
  transportAllowance: string;
  otherAllowances: string;
  effectiveFrom: string;
}

export default function AdminSalaryPage() {
  const { user } = useAuth();

  // Get salary structures
  const { data: salaryStructures, isLoading } = useQuery<SalaryStructure[]>({
    queryKey: ['/api/salary-structures'],
    enabled: !!user,
  });

  const totalPayroll = salaryStructures?.reduce((sum, s) => 
    sum + parseFloat(s.basicSalary) + parseFloat(s.hra) + 
    parseFloat(s.transportAllowance) + parseFloat(s.otherAllowances), 0
  ) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-admin-salary-title">
          Salary Management
        </h1>
        <p className="text-muted-foreground mt-1">Manage employee salaries and payroll</p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-payroll">
              ₹{totalPayroll.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <Users className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-employee-count">
              {salaryStructures?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary Structures */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Employee Salary Structures</CardTitle>
              <CardDescription>View and manage employee compensation</CardDescription>
            </div>
            <Button data-testid="button-process-payroll">
              Process Payroll
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading salary data...</div>
          ) : salaryStructures && salaryStructures.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>HRA</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead>Other</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Effective From</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaryStructures.map((structure) => {
                  const total = parseFloat(structure.basicSalary) + 
                               parseFloat(structure.hra) + 
                               parseFloat(structure.transportAllowance) + 
                               parseFloat(structure.otherAllowances);
                  
                  return (
                    <TableRow key={structure.id} data-testid={`salary-row-${structure.id}`}>
                      <TableCell className="font-medium">{structure.userName || 'Employee'}</TableCell>
                      <TableCell>₹{parseFloat(structure.basicSalary).toLocaleString()}</TableCell>
                      <TableCell>₹{parseFloat(structure.hra).toLocaleString()}</TableCell>
                      <TableCell>₹{parseFloat(structure.transportAllowance).toLocaleString()}</TableCell>
                      <TableCell>₹{parseFloat(structure.otherAllowances).toLocaleString()}</TableCell>
                      <TableCell className="font-bold">₹{total.toLocaleString()}</TableCell>
                      <TableCell>
                        {format(parseISO(structure.effectiveFrom), 'MMM dd, yyyy')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No salary structures found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
