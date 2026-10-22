
export const INTEGRATION_PROVIDERS = [
    "vscode",
    "whatsapp",
    "instagram",
  ] as const;
  
  export type IntegrationProvider =
    (typeof INTEGRATION_PROVIDERS)[number];
  
  export type IntegrationStatus =
    | "disconnected"
    | "pending"
    | "connected"
    | "error";
  
  export type IntegrationConnection = {
    provider: IntegrationProvider;
    status: IntegrationStatus;
    connectedAt?: Date;
    lastCheckedAt?: Date;
  };
  
  export type IntegrationResult<T> =
    | {
        success: true;
        data: T;
      }
    | {
        success: false;
        error: {
          code: string;
          message: string;
          retryable: boolean;
        };
      };
  
  export type SendNotificationInput = {
    destination: string;
    message: string;
    idempotencyKey: string;
  };
  
  export type SendNotificationResult = {
    providerMessageId: string;
    accepted: boolean;
  };
  
  export interface NotificationProvider {
    readonly provider: "whatsapp" | "instagram" | "desktop";
  
    isConfigured(): boolean;
  
    send(
      input: SendNotificationInput,
    ): Promise<SendNotificationResult>;
  }
  