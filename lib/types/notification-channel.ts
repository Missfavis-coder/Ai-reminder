
export type NotificationChannelType =
  | "whatsapp"
  | "instagram"
  | "web_push"
  | "desktop"
  | "email";

export interface NotificationChannel {
  id: string;
  type: NotificationChannelType;
  destination: string;
  enabled: boolean;
  verifiedAt: string | null;
  consentGrantedAt: string | null;
}

export interface NotificationChannelsResponse {
  channels: NotificationChannel[];
}
