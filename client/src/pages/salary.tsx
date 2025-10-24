import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Download, FileText, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Salary {
  id: string;
  userId: string;
  month: string;
  basicSalary: string;
  allowances: string;
  deductions: string;
  netSalary: string;
  status: string;
  paymentDate: string | null;
}

interface SalaryStructure {
  id: string;
  userId: string;
  basicSalary: string;
  hra: string;
  transportAllowance: string;
  otherAllowances: string;
  effectiveFrom: string;
}

export default function SalaryPage() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Get salary history
  const { data: salaryHistory } = useQuery<Salary[]>({
    queryKey: ['/api/salaries/user', user?.id],
    enabled: !!user,
  });

  // Get current month salary
  const currentMonth = format(new Date(), 'yyyy-MM');
  const { data: currentSalary } = useQuery<Salary>({
    queryKey: ['/api/salaries/user', user?.id, 'month', currentMonth],
    enabled: !!user,
  });

  // Get salary structure
  const { data: salaryStructure } = useQuery<SalaryStructure>({
    queryKey: ['/api/salary-structures/user', user?.id],
    enabled: !!user,
  });

  const filteredSalaries = salaryHistory?.filter(s => s.month.startsWith(selectedYear)) || [];
  const totalEarned = filteredSalaries.reduce((sum, s) => sum + parseFloat(s.netSalary), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-salary-title">Salary & Payslips</h1>
        <p className="text-muted-foreground mt-1">View your salary details and download payslips</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month</CardTitle>
            <DollarSign className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-current-salary">
              ₹{currentSalary ? parseFloat(currentSalary.netSalary).toLocaleString() : '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentSalary?.status === 'paid' ? 'Paid' : 'Pending'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-annual-earnings">
              ₹{totalEarned.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{selectedYear}</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base Salary</CardTitle>
            <FileText className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-base-salary">
              ₹{salaryStructure ? parseFloat(salaryStructure.basicSalary).toLocaleString() : '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per month</p>
          </CardContent>
        </Card>
      </div>

      {/* Salary Breakdown */}
      {salaryStructure && (
        <Card>
          <CardHeader>
            <CardTitle>Salary Structure</CardTitle>
            <CardDescription>Your current salary breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Basic Salary</span>
                  <span className="font-medium" data-testid="text-struct-basic">
                    ₹{parseFloat(salaryStructure.basicSalary).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">HRA</span>
                  <span className="font-medium" data-testid="text-struct-hra">
                    ₹{parseFloat(salaryStructure.hra).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transport Allowance</span>
                  <span className="font-medium" data-testid="text-struct-transport">
                    ₹{parseFloat(salaryStructure.transportAllowance).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Other Allowances</span>
                  <span className="font-medium" data-testid="text-struct-other">
                    ₹{parseFloat(salaryStructure.otherAllowances).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payslip History */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Payslip History</CardTitle>
              <CardDescription>Download your salary statements</CardDescription>
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 border rounded-md text-sm"
              data-testid="select-year"
            >
              {[2025, 2024, 2023].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSalaries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Basic</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalaries.map((salary) => (
                  <TableRow key={salary.id} data-testid={`salary-row-${salary.id}`}>
                    <TableCell className="font-medium">
                      {format(parseISO(salary.month + '-01'), 'MMMM yyyy')}
                    </TableCell>
                    <TableCell>₹{parseFloat(salary.basicSalary).toLocaleString()}</TableCell>
                    <TableCell>₹{parseFloat(salary.allowances).toLocaleString()}</TableCell>
                    <TableCell>₹{parseFloat(salary.deductions).toLocaleString()}</TableCell>
                    <TableCell className="font-bold">₹{parseFloat(salary.netSalary).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={salary.status === 'paid' ? 'default' : 'secondary'}>
                        {salary.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" data-testid={`button-download-${salary.id}`}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No salary records for {selectedYear}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
