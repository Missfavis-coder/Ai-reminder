
import {
    pgEnum,
    pgTable,
    text,
    varchar,
    boolean,
    integer,
    timestamp,
    jsonb,
    uuid,
    uniqueIndex,
    index,
  } from "drizzle-orm/pg-core";
  
  import type { ReminderRuleConfig } from "@/lib/server/rules/definition";
  
  export const workspaceProviderEnum = pgEnum("workspace_provider", [
    "vscode",
    "desktop",
    "browser",
  ]);
  
  export const workspaceStatusEnum = pgEnum("workspace_status", [
    "connected",
    "disconnected",
  ]);
  
  export const activityEventTypeEnum = pgEnum("activity_event_type", [
    "workspace_focused",
    "workspace_blurred",
    "editor_changed",
    "heartbeat",
    "workspace_stopped",
    "idle_started",
    "idle_ended",
  ]);
  
  export const sessionStatusEnum = pgEnum("session_status", [
    "active",
    "idle",
    "paused",
    "ended",
  ]);
  
  export const reminderRuleTypeEnum = pgEnum("reminder_rule_type", [
    "active_work",
    "inactivity",
    "deadline",
    "fixed_time",
  ]);
  
  export const reminderRuleStatusEnum = pgEnum("reminder_rule_status", [
    "active",
    "paused",
    "completed",
  ]);
  
  export const notificationChannelTypeEnum = pgEnum(
    "notification_channel_type",
    ["whatsapp", "instagram", "web_push", "desktop", "email"],
  );
  
  export const notificationJobStatusEnum = pgEnum(
    "notification_job_status",
    ["pending", "processing", "sent", "failed", "cancelled", "review"],
  );
  
  export const deliveryStatusEnum = pgEnum("delivery_status", [
    "pending",
    "sent",
    "delivered",
    "failed",
    "unknown",
  ]);
  
  export const users = pgTable("users", {
    id: text("id").primaryKey(),
    passwordHash: text("password_hash").notNull(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    timezone: varchar("timezone", { length: 100 })
      .notNull()
      .default("UTC"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    }).notNull().defaultNow(),
  });
  
  export const workspaces = pgTable(
    "workspaces",
    {
      id: uuid("id").defaultRandom().primaryKey(),
      userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      provider: workspaceProviderEnum("provider").notNull(),
      name: varchar("name", { length: 200 }).notNull(),
      deviceId: varchar("device_id", { length: 200 }),
      status: workspaceStatusEnum("status")
        .notNull()
        .default("connected"),
      lastSeenAt: timestamp("last_seen_at", {
        withTimezone: true,
      }),
      createdAt: timestamp("created_at", {
        withTimezone: true,
      }).notNull().defaultNow(),
    },
    (table) => [
      index("workspaces_user_id_idx").on(table.userId),
    ],
  );
  
  export const activityEvents = pgTable(
    "activity_events",
    {
      id: uuid("id").defaultRandom().primaryKey(),
      eventId: uuid("event_id").notNull().unique(),
      userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      workspaceId: uuid("workspace_id")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),
      eventType: activityEventTypeEnum("event_type").notNull(),
      occurredAt: timestamp("occurred_at", {
        withTimezone: true,
      }).notNull(),
      receivedAt: timestamp("received_at", {
        withTimezone: true,
      }).notNull().defaultNow(),
      metadata: jsonb("metadata")
        .$type<Record<string, unknown>>()
        .notNull()
        .default({}),
    },
    (table) => [
      index("activity_events_user_time_idx").on(
        table.userId,
        table.occurredAt,
      ),
      index("activity_events_workspace_time_idx").on(
        table.workspaceId,
        table.occurredAt,
      ),
    ],
  );
  
  export const workspaceSessions = pgTable(
    "workspace_sessions",
    {
      id: uuid("id").defaultRandom().primaryKey(),
      userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      workspaceId: uuid("workspace_id")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),
      status: sessionStatusEnum("status").notNull().default("active"),
      startedAt: timestamp("started_at", {
        withTimezone: true,
      }).notNull().defaultNow(),
      lastActivityAt: timestamp("last_activity_at", {
        withTimezone: true,
      }),

idleSinceAt: timestamp("idle_since_at", {
  withTimezone: true,
}),

      activeSeconds: integer("active_seconds").notNull().default(0),
      endedAt: timestamp("ended_at", {
        withTimezone: true,
      }),
      createdAt: timestamp("created_at", {
        withTimezone: true,
      }).notNull().defaultNow(),
      
      lastEventOccurredAt: timestamp("last_event_occurred_at", {
        withTimezone: true,
      }),
    },
    (table) => [
      index("sessions_user_status_idx").on(
        table.userId,
        table.status,
      ),
      index("sessions_workspace_status_idx").on(
        table.workspaceId,
        table.status,
      ),
    ],
  );


export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    // Store the SHA-256 hash of the session token,
    // never the raw cookie token.
    tokenHash: text("token_hash").notNull().unique(),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),

    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("auth_sessions_user_id_idx").on(table.userId),
    index("auth_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

  
  export const reminderRules = pgTable(
    "reminder_rules",
    {
      id: uuid("id").defaultRandom().primaryKey(),
      userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      name: varchar("name", { length: 200 }).notNull(),
      type: reminderRuleTypeEnum("type").notNull(),
      config: jsonb("config")
        .$type<ReminderRuleConfig>()
        .notNull(),
      status: reminderRuleStatusEnum("status")
        .notNull()
        .default("active"),
      createdAt: timestamp("created_at", {
        withTimezone: true,
      }).notNull().defaultNow(),
      updatedAt: timestamp("updated_at", {
        withTimezone: true,
      }).notNull().defaultNow(),
    },
    (table) => [
      index("reminder_rules_user_status_idx").on(
        table.userId,
        table.status,
      ),
      index("reminder_rules_type_idx").on(table.type),
    ],
  );
  
  export const notificationChannels = pgTable(
    "notification_channels",
    {
      id: uuid("id").defaultRandom().primaryKey(),
      userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      type: notificationChannelTypeEnum("type").notNull(),
      destination: varchar("destination", { length: 320 }).notNull(),
      consentGrantedAt: timestamp("consent_granted_at", {
        withTimezone: true,
      }),
      verifiedAt: timestamp("verified_at", {
        withTimezone: true,
      }),
      enabled: boolean("enabled").notNull().default(false),
      createdAt: timestamp("created_at", {
        withTimezone: true,
      }).notNull().defaultNow(),
    },
    (table) => [
      index("notification_channels_user_idx").on(table.userId),
    ],
  );
  
  export const notificationJobs = pgTable(
    "notification_jobs",
    {
      id: uuid("id").defaultRandom().primaryKey(),
      userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      ruleId: uuid("rule_id").references(() => reminderRules.id, {
        onDelete: "set null",
      }),
      channelId: uuid("channel_id").references(
        () => notificationChannels.id,
        { onDelete: "set null" },
      ),
      scheduledAt: timestamp("scheduled_at", {
        withTimezone: true,
      }).notNull(),
      status: notificationJobStatusEnum("status")
        .notNull()
        .default("pending"),
      idempotencyKey: varchar("idempotency_key", {
        length: 300,
      }).notNull().unique(),

processingStartedAt: timestamp("processing_started_at", {
  withTimezone: true,
}),
lastError: text("last_error"),
updatedAt: timestamp("updated_at", {
  withTimezone: true,
})
  .defaultNow()
  .notNull(),

      payload: jsonb("payload")
        .$type<Record<string, unknown>>()
        .notNull()
        .default({}),
      attempts: integer("attempts").notNull().default(0),
      createdAt: timestamp("created_at", {
        withTimezone: true,
      }).notNull().defaultNow(),
    },
    (table) => [
      index("notification_jobs_due_idx").on(
        table.status,
        table.scheduledAt,
      ),
      index("notification_jobs_user_idx").on(table.userId),
    ],
  );
  
  export const notificationDeliveries = pgTable(
    "notification_deliveries",
    {
      id: uuid("id").defaultRandom().primaryKey(),
      jobId: uuid("job_id")
        .notNull()
        .references(() => notificationJobs.id, {
          onDelete: "cascade",
        }),
      status: deliveryStatusEnum("status")
        .notNull()
        .default("pending"),
      providerMessageId: varchar("provider_message_id", {
        length: 300,
      }),
      errorMessage: text("error_message"),
      attemptedAt: timestamp("attempted_at", {
        withTimezone: true,
      }).notNull().defaultNow(),
      deliveredAt: timestamp("delivered_at", {
        withTimezone: true,
      }),
    },
    (table) => [
      index("notification_deliveries_job_idx").on(table.jobId),
    ],
  );

  export const whatsappWebhookEvents = pgTable(
    "whatsapp_webhook_events",
    {
      id: uuid("id").defaultRandom().primaryKey(),
      eventKey: text("event_key").notNull().unique(),
      providerMessageId: text("provider_message_id"),
      providerStatus: varchar("provider_status", { length: 30 }).notNull(),
      payload: jsonb("payload").notNull(),
      status: varchar("status", { length: 20 }).notNull().default("pending"),
      attempts: integer("attempts").notNull().default(0),
      processingStartedAt: timestamp("processing_started_at", {
        withTimezone: true,
      }),
      nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
      lastError: text("last_error"),
      receivedAt: timestamp("received_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
      processedAt: timestamp("processed_at", { withTimezone: true }),
    },
    (table) => [
      index("whatsapp_webhook_events_pending_idx").on(
        table.status,
        table.nextAttemptAt,
        table.receivedAt,
      ),
      index("whatsapp_webhook_events_message_idx").on(
        table.providerMessageId,
      ),
    ],
  );
  