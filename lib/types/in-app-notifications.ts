export type NotificationCategory =
  | "Reminder"
  | "Delivery"
  | "System";

export type NotificationIcon =
  | "reminder"
  | "whatsapp"
  | "success"
  | "warning"
  | "system";

export interface InAppNotification {
  id: string;
  title: string;
  description: string;
  category: NotificationCategory;
  icon: NotificationIcon;
  actionLabel: string | null;
  actionHref: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface InAppNotificationsResponse {
  notifications: InAppNotification[];
}

export interface UpdateNotificationInput {
  read: boolean;
}