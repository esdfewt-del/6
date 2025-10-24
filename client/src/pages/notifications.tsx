import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Bell, Check } from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

interface Notification {
  id: string;
  userId: string | null;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Get user notifications
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications/user', user?.id],
    enabled: !!user,
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest('PUT', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/user', user?.id] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to mark as read', description: error.message, variant: 'destructive' });
    },
  });

  const unreadNotifications = notifications?.filter(n => !n.isRead) || [];
  const readNotifications = notifications?.filter(n => n.isRead) || [];

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM dd, yyyy');
  };

  const NotificationItem = ({ notification }: { notification: Notification }) => (
    <Card key={notification.id} className={notification.isRead ? 'opacity-60' : ''} data-testid={`notification-${notification.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-4 w-4 text-ring" />
              <CardTitle className="text-base">{notification.title}</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">{notification.message}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">{notification.type}</Badge>
              <span className="text-xs text-muted-foreground">
                {getDateLabel(notification.createdAt)} at {format(parseISO(notification.createdAt), 'hh:mm a')}
              </span>
            </div>
          </div>
          {!notification.isRead && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markReadMutation.mutate(notification.id)}
              disabled={markReadMutation.isPending}
              data-testid={`button-mark-read-${notification.id}`}
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-notifications-title">
          Notifications
        </h1>
        <p className="text-muted-foreground mt-1">Stay updated with important alerts</p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Bell className="h-4 w-4 text-ring" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-unread-count">
              {unreadNotifications.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">
            All ({notifications?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="unread" data-testid="tab-unread">
            Unread ({unreadNotifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading notifications...</div>
          ) : notifications && notifications.length > 0 ? (
            notifications.map(notification => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No notifications found
            </div>
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4 mt-6">
          {unreadNotifications.length > 0 ? (
            unreadNotifications.map(notification => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No unread notifications
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
