import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  notificationService, 
  Notification, 
  NotificationType, 
  NotificationOptions 
} from '@/lib/services/notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { data: session } = useSession();

  useEffect(() => {
    // Initialize the notification service when the session is available
    if (session?.user) {
      notificationService.initialize();
      
      // Subscribe to notification changes
      const unsubscribe = notificationService.subscribe((newNotifications) => {
        setNotifications(newNotifications);
        setUnreadCount(newNotifications.filter(n => !n.read).length);
      });
      
      return unsubscribe;
    }
  }, [session]);

  const createNotification = (
    type: NotificationType,
    title: string,
    message: string,
    options?: NotificationOptions
  ) => {
    notificationService.createNotification(type, title, message, options);
  };

  const markAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const removeNotification = (id: string) => {
    notificationService.removeNotification(id);
  };

  const clearNotifications = () => {
    notificationService.clearNotifications();
  };

  // Convenience methods
  const info = (title: string, message: string, options?: NotificationOptions) => {
    notificationService.info(title, message, options);
  };

  const success = (title: string, message: string, options?: NotificationOptions) => {
    notificationService.success(title, message, options);
  };

  const warning = (title: string, message: string, options?: NotificationOptions) => {
    notificationService.warning(title, message, options);
  };

  const error = (title: string, message: string, options?: NotificationOptions) => {
    notificationService.error(title, message, options);
  };

  return {
    notifications,
    unreadCount,
    createNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
    info,
    success,
    warning,
    error,
  };
}