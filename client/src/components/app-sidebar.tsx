import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Bell,
  Settings,
  LogOut,
  MapPin,
  User as UserIcon,
  Clock,
} from 'lucide-react';
import nanoflowsLogoPng from '@/assets/nanoflows-logo.png';

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  
  const isAdmin = user?.role === 'admin';
  const isHR = user?.role === 'hr';

  const employeeItems = [
    {
      title: 'Dashboard',
      url: '/employee-dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Attendance',
      url: '/attendance',
      icon: Clock,
    },
    {
      title: 'My Leaves',
      url: '/leaves',
      icon: Calendar,
    },
    {
      title: 'Travel Claims',
      url: '/travel',
      icon: MapPin,
    },
    {
      title: 'Salary & Payslip',
      url: '/salary',
      icon: DollarSign,
    },
    {
      title: 'My Profile',
      url: '/profile',
      icon: UserIcon,
    },
  ];

  const adminItems = [
    {
      title: 'Dashboard',
      url: '/admin-dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Employees',
      url: '/admin/employees',
      icon: Users,
    },
    {
      title: 'Attendance',
      url: '/admin/attendance',
      icon: Clock,
    },
    {
      title: 'Leave Management',
      url: '/admin/leaves',
      icon: Calendar,
    },
    {
      title: 'Salary Management',
      url: '/admin/salary',
      icon: DollarSign,
    },
    {
      title: 'Travel Claims',
      url: '/admin/travel',
      icon: MapPin,
    },
    {
      title: 'Reports',
      url: '/admin/reports',
      icon: FileText,
    },
  ];

  const items = isAdmin || isHR ? adminItems : employeeItems;

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img src={nanoflowsLogoPng} alt="Nano Flows AI" className="h-10 object-contain" data-testid="img-sidebar-logo" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-sidebar-foreground">Nano Flows</p>
            <p className="text-xs text-muted-foreground">EMS</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <a href={item.url} onClick={(e) => { e.preventDefault(); setLocation(item.url); }}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-testid="nav-notifications">
                  <a href="/notifications" onClick={(e) => { e.preventDefault(); setLocation('/notifications'); }}>
                    <Bell className="h-4 w-4" />
                    <span>Notifications</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Only show settings for admin/HR users */}
              {(isAdmin || isHR) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-testid="nav-settings">
                    <a href="/settings" onClick={(e) => { e.preventDefault(); setLocation('/settings'); }}>
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.photo || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user?.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-sidebar-foreground truncate" data-testid="text-user-name">
              {user?.fullName || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
