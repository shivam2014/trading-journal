import { webSocketService, WebSocketMessageType } from './websocket';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, any>;
  link?: string;
}

export interface NotificationOptions {
  data?: Record<string, any>;
  link?: string;
}

export class NotificationService {
  private notifications: Notification[] = [];
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private initialized = false;
  private maxNotifications = 50; // Maximum number of notifications to keep in memory

  constructor() {
    // Load notifications from localStorage on client-side
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  /**
   * Initialize the notification service with WebSocket connection
   */
  public initialize(): void {
    if (this.initialized) return;
    
    // Listen to WebSocket notifications
    webSocketService.on(WebSocketMessageType.NOTIFICATION, (payload) => {
      if (!payload) return;
      
      const notification: Notification = {
        id: payload.id || crypto.randomUUID(),
        type: payload.type || 'info',
        title: payload.title || 'Notification',
        message: payload.message,
        timestamp: new Date(payload.timestamp || Date.now()),
        read: false,
        data: payload.data,
        link: payload.link,
      };
      
      this.addNotification(notification);
    });
    
    this.initialized = true;
  }

  /**
   * Add a notification
   */
  public addNotification(notification: Notification): void {
    // Add to the beginning of the array (newest first)
    this.notifications = [notification, ...this.notifications].slice(0, this.maxNotifications);
    
    // Save to storage if on client side
    this.saveToStorage();
    
    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Create a notification
   */
  public createNotification(
    type: NotificationType,
    title: string,
    message: string,
    options: NotificationOptions = {}
  ): void {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      data: options.data,
      link: options.link,
    };
    
    this.addNotification(notification);
  }
  
  /**
   * Convenience methods for creating different types of notifications
   */
  public info(title: string, message: string, options?: NotificationOptions): void {
    this.createNotification('info', title, message, options);
  }
  
  public success(title: string, message: string, options?: NotificationOptions): void {
    this.createNotification('success', title, message, options);
  }
  
  public warning(title: string, message: string, options?: NotificationOptions): void {
    this.createNotification('warning', title, message, options);
  }
  
  public error(title: string, message: string, options?: NotificationOptions): void {
    this.createNotification('error', title, message, options);
  }

  /**
   * Get all notifications
   */
  public getNotifications(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Get unread notifications count
   */
  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Mark a notification as read
   */
  public markAsRead(id: string): void {
    this.notifications = this.notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Mark all notifications as read
   */
  public markAllAsRead(): void {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Remove a notification
   */
  public removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Clear all notifications
   */
  public clearNotifications(): void {
    this.notifications = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Subscribe to notification changes
   * @returns A function to unsubscribe
   */
  public subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately notify the new listener with the current state
    listener([...this.notifications]);
    
    // Return an unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Load notifications from storage (client-side only)
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('tj-notifications');
      
      if (stored) {
        const parsed = JSON.parse(stored);
        
        if (Array.isArray(parsed)) {
          this.notifications = parsed.map(n => ({
            ...n,
            timestamp: new Date(n.timestamp),
          })).slice(0, this.maxNotifications);
        }
      }
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
    }
  }

  /**
   * Save notifications to storage (client-side only)
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('tj-notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications to storage:', error);
    }
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    const notificationsCopy = [...this.notifications];
    this.listeners.forEach(listener => listener(notificationsCopy));
  }
}

// Create a singleton instance
export const notificationService = new NotificationService();