import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import LoginPage from "@/pages/login";
import EmployeeDashboard from "@/pages/employee-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import AttendancePage from "@/pages/attendance";
import LeavesPage from "@/pages/leaves";
import TravelPage from "@/pages/travel";
import SalaryPage from "@/pages/salary";
import ProfilePage from "@/pages/profile";
import AdminEmployeesPage from "@/pages/admin/employees";
import AdminAttendancePage from "@/pages/admin/attendance";
import AdminLeavesPage from "@/pages/admin/leaves";
import AdminSalaryPage from "@/pages/admin/salary";
import AdminTravelPage from "@/pages/admin/travel";
import AdminTravelHistoryPage from "@/pages/admin/travel-history";
import AdminReportsPage from "@/pages/admin/reports";
import AdminActivityLogsPage from "@/pages/admin/activity-logs";
import NotificationsPage from "@/pages/notifications";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && user.role !== 'admin' && user.role !== 'hr') {
    return <Redirect to="/employee-dashboard" />;
  }

  return <Component />;
}

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      {/* Employee routes */}
      <Route path="/employee-dashboard">
        <ProtectedRoute component={EmployeeDashboard} />
      </Route>
      <Route path="/attendance">
        <ProtectedRoute component={AttendancePage} />
      </Route>
      <Route path="/leaves">
        <ProtectedRoute component={LeavesPage} />
      </Route>
      <Route path="/travel">
        <ProtectedRoute component={TravelPage} />
      </Route>
      <Route path="/salary">
        <ProtectedRoute component={SalaryPage} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={ProfilePage} />
      </Route>
      
      {/* Admin routes */}
      <Route path="/admin-dashboard">
        <ProtectedRoute component={AdminDashboard} adminOnly />
      </Route>
      <Route path="/admin/employees">
        <ProtectedRoute component={AdminEmployeesPage} adminOnly />
      </Route>
      <Route path="/admin/attendance">
        <ProtectedRoute component={AdminAttendancePage} adminOnly />
      </Route>
      <Route path="/admin/leaves">
        <ProtectedRoute component={AdminLeavesPage} adminOnly />
      </Route>
      <Route path="/admin/salary">
        <ProtectedRoute component={AdminSalaryPage} adminOnly />
      </Route>
      <Route path="/admin/travel">
        <ProtectedRoute component={AdminTravelPage} adminOnly />
      </Route>
      <Route path="/admin/travel-history">
        <ProtectedRoute component={AdminTravelHistoryPage} adminOnly />
      </Route>
      <Route path="/admin/reports">
        <ProtectedRoute component={AdminReportsPage} adminOnly />
      </Route>
      <Route path="/admin/activity-logs">
        <ProtectedRoute component={AdminActivityLogsPage} adminOnly />
      </Route>
      
      {/* Common routes */}
      <Route path="/notifications">
        <ProtectedRoute component={NotificationsPage} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>

      {/* Root redirect */}
      <Route path="/">
        {user ? <Redirect to={user.role === 'admin' || user.role === 'hr' ? '/admin-dashboard' : '/employee-dashboard'} /> : <Redirect to="/login" />}
      </Route>
      
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user } = useAuth();
  const [location] = useLocation();
  const isLoginPage = location === '/login';

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  if (isLoginPage || !user) {
    return <Router />;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
