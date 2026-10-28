
"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";

import {
  useCreateReminderRule,
  useReminderRules,
} from "@/lib/hooks/use-reminder-rules";

import { useNotificationChannels } from
  "@/lib/hooks/use-notification-channels";

import type {
  CreateReminderRuleInput,
  ReminderRuleConfig,
  ReminderRuleType,
} from "@/lib/types/reminder";

const reminderTypes: {
  value: ReminderRuleType;
  label: string;
  description: string;
}[] = [
  {
    value: "active_work",
    label: "Active work",
    description:
      "Remind me after working continuously for a set duration.",
  },
  {
    value: "inactivity",
    label: "Inactivity",
    description:
      "Remind me after my workspace has been inactive.",
  },
  {
    value: "deadline",
    label: "Deadline",
    description: "Remind me before a deadline.",
  },
  {
    value: "fixed_time",
    label: "Fixed time",
    description:
      "Send a reminder at a particular date and time.",
  },
];

const reminderFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a name for this reminder.")
      .max(120, "Reminder name cannot exceed 120 characters."),

    type: z.enum([
      "active_work",
      "inactivity",
      "deadline",
      "fixed_time",
    ]),

    thresholdMinutes: z.string(),
    leadTimeMinutes: z.string(),
    deadlineAt: z.string(),
    scheduledAt: z.string(),
    repeat: z.boolean(),

    channelIds: z
      .array(z.string().uuid("Select a valid notification channel."))
      .min(1, "Select at least one notification channel.")
      .max(5, "Select no more than 5 notification channels.")
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "A notification channel cannot be selected more than once.",
      ),
  })
  .superRefine((data, ctx) => {
    if (
      data.type === "active_work" ||
      data.type === "inactivity"
    ) {
      const minutes = Number(data.thresholdMinutes);

      if (
        data.thresholdMinutes.trim() === "" ||
        !Number.isFinite(minutes) ||
        minutes < 1 ||
        minutes > 1440
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["thresholdMinutes"],
          message: "Duration must be between 1 and 1440 minutes.",
        });
      }
    }

    if (data.type === "deadline") {
      const leadMinutes = Number(data.leadTimeMinutes);
      const deadline = new Date(data.deadlineAt);

      if (
        !data.deadlineAt ||
        Number.isNaN(deadline.getTime())
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["deadlineAt"],
          message: "Choose a valid deadline.",
        });
      } else if (deadline.getTime() <= Date.now()) {
        ctx.addIssue({
          code: "custom",
          path: ["deadlineAt"],
          message: "The deadline must be in the future.",
        });
      }

      if (
        data.leadTimeMinutes.trim() === "" ||
        !Number.isFinite(leadMinutes) ||
        leadMinutes < 1 ||
        leadMinutes > 1440
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["leadTimeMinutes"],
          message: "Lead time must be between 1 and 1440 minutes.",
        });
      }
    }

    if (data.type === "fixed_time") {
      const scheduled = new Date(data.scheduledAt);

      if (
        !data.scheduledAt ||
        Number.isNaN(scheduled.getTime())
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduledAt"],
          message: "Choose a valid reminder date and time.",
        });
      } else if (scheduled.getTime() <= Date.now()) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduledAt"],
          message: "The reminder time must be in the future.",
        });
      }
    }
  });

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function describeRule(config: ReminderRuleConfig) {
  switch (config.type) {
    case "active_work":
      return `After ${config.thresholdSeconds / 60} minutes of active work`;

    case "inactivity":
      return `After ${config.thresholdSeconds / 60} minutes of inactivity`;

    case "deadline":
      return `At ${formatDate(config.deadlineAt)}, ${config.leadTimeSeconds / 60} minutes before`;

    case "fixed_time":
      return `Scheduled for ${formatDate(config.scheduledAt)}`;
  }
}

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  web_push: "Web Push",
  desktop: "Desktop notifications",
  email: "Email",
  instagram: "Instagram",
};

export default function RemindersPage() {
  const {
    data: rules = [],
    isLoading,
    isError,
    error,
  } = useReminderRules();

  const createRule = useCreateReminderRule();

  const {
    data: channels = [],
    isLoading: channelsLoading,
    isError: channelsError,
  } = useNotificationChannels();

  const [name, setName] = useState("");
  const [type, setType] =
    useState<ReminderRuleType>("inactivity");
  const [thresholdMinutes, setThresholdMinutes] =
    useState("20");
  const [leadTimeMinutes, setLeadTimeMinutes] =
    useState("30");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [selectedChannelIds, setSelectedChannelIds] =
    useState<string[]>([]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const validation = reminderFormSchema.safeParse({
      name,
      type,
      thresholdMinutes,
      leadTimeMinutes,
      deadlineAt,
      scheduledAt,
      repeat,
      channelIds: selectedChannelIds,
    });

    if (!validation.success) {
      toast.error(
        validation.error.issues[0]?.message ??
          "Please check your input.",
      );
      return;
    }

    const values = validation.data;

    let config: ReminderRuleConfig;

    if (
      values.type === "active_work" ||
      values.type === "inactivity"
    ) {
      config = {
        type: values.type,
        thresholdSeconds: Number(values.thresholdMinutes) * 60,
        repeat: values.repeat,
      };
    } else if (values.type === "deadline") {
      config = {
        type: "deadline",
        deadlineAt: new Date(values.deadlineAt).toISOString(),
        leadTimeSeconds: Number(values.leadTimeMinutes) * 60,
      };
    } else {
      config = {
        type: "fixed_time",
        scheduledAt: new Date(values.scheduledAt).toISOString(),
      };
    }

    const input: CreateReminderRuleInput = {
      name: values.name,
      config,
      channelIds: values.channelIds,
    };

    try {
      await createRule.mutateAsync(input);

      toast.success("Reminder created successfully!");

      setName("");
      setType("inactivity");
      setThresholdMinutes("20");
      setLeadTimeMinutes("30");
      setDeadlineAt("");
      setScheduledAt("");
      setRepeat(false);
      setSelectedChannelIds([]);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not create the reminder. Please try again.",
      );
    }
  }

  function toggleChannel(
    channelId: string,
    checked: boolean,
  ) {
    setSelectedChannelIds((current) => {
      if (checked) {
        if (
          current.includes(channelId) ||
          current.length >= 5
        ) {
          return current;
        }

        return [...current, channelId];
      }

      return current.filter((id) => id !== channelId);
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 md:p-8">
      <header>
       

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Reminder settings
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Set rules for when you want to be reminded about your work,
          inactivity, and upcoming deadlines.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-border bg-card p-5 md:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Create a reminder
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Choose a trigger and configure when it should apply.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="reminder-name"
                className="text-sm font-medium"
              >
                Reminder name
              </label>

              <input
                id="reminder-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Take a short break"
                maxLength={120}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="reminder-type"
                className="text-sm font-medium"
              >
                Reminder type
              </label>

              <select
                id="reminder-type"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as ReminderRuleType)
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {reminderTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <p className="text-xs text-muted-foreground">
                {
                  reminderTypes.find((item) => item.value === type)
                    ?.description
                }
              </p>
            </div>

            {(type === "active_work" ||
              type === "inactivity") && (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="threshold"
                    className="text-sm font-medium"
                  >
                    Duration (minutes)
                  </label>

                  <input
                    id="threshold"
                    type="number"
                    min="1"
                    max="1440"
                    value={thresholdMinutes}
                    onChange={(event) =>
                      setThresholdMinutes(event.target.value)
                    }
                    required
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />

                  <p className="text-xs text-muted-foreground">
                    Minimum 1 minute; maximum 24 hours.
                  </p>
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <input
                    type="checkbox"
                    checked={repeat}
                    onChange={(event) =>
                      setRepeat(event.target.checked)
                    }
                    className="mt-1"
                  />

                  <span>
                    <span className="block text-sm font-medium">
                      Repeat this reminder
                    </span>

                    <span className="mt-1 block text-xs text-muted-foreground">
                      Allow the rule to remind me again when its
                      conditions are met, if supported by the evaluator.
                    </span>
                  </span>
                </label>
              </>
            )}

            {type === "deadline" && (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="deadline"
                    className="text-sm font-medium"
                  >
                    Deadline date and time
                  </label>

                  <input
                    id="deadline"
                    type="datetime-local"
                    value={deadlineAt}
                    onChange={(event) =>
                      setDeadlineAt(event.target.value)
                    }
                    required
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="lead-time"
                    className="text-sm font-medium"
                  >
                    Remind me this many minutes before
                  </label>

                  <input
                    id="lead-time"
                    type="number"
                    min="1"
                    max="1440"
                    value={leadTimeMinutes}
                    onChange={(event) =>
                      setLeadTimeMinutes(event.target.value)
                    }
                    required
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </>
            )}

            {type === "fixed_time" && (
              <div className="space-y-2">
                <label
                  htmlFor="scheduled-at"
                  className="text-sm font-medium"
                >
                  Reminder date and time
                </label>

                <input
                  id="scheduled-at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) =>
                    setScheduledAt(event.target.value)
                  }
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">
                  Where should we send this reminder?
                </label>

                <p className="mt-1 text-xs text-muted-foreground">
                  Select one or more verified notification channels.
                  You can select up to five.
                </p>
              </div>

              {channelsLoading && (
                <p className="text-sm text-muted-foreground">
                  Loading connected channels...
                </p>
              )}

              {channelsError && (
                <p className="text-sm text-destructive">
                  Could not load your notification channels.
                  Please refresh and try again.
                </p>
              )}

              {!channelsLoading &&
                !channelsError &&
                channels.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4">
                    <p className="text-sm font-medium">
                      No verified channels available
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Connect and verify a notification channel on
                      the Integrations page before creating this
                      reminder.
                    </p>

                    <a
                      href="/integrations"
                      className="mt-3 inline-block text-sm font-medium underline"
                    >
                      Go to Integrations
                    </a>
                  </div>
                )}

              {channels.map((channel) => (
                <label
                  key={channel.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedChannelIds.includes(channel.id)}
                    disabled={
                      !selectedChannelIds.includes(channel.id) &&
                      selectedChannelIds.length >= 5
                    }
                    onChange={(event) =>
                      toggleChannel(channel.id, event.target.checked)
                    }
                    className="size-4"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {channelLabels[channel.type] ?? channel.type}
                    </span>

                    <span className="block truncate text-xs text-muted-foreground">
                      {channel.destination}
                    </span>
                  </span>
                </label>
              ))}

              <p className="text-xs text-muted-foreground">
                {selectedChannelIds.length} of 5 channels selected.
              </p>
            </div>

            <button
              type="submit"
              disabled={
                createRule.isPending ||
                channelsLoading ||
                channelsError ||
                channels.length === 0 ||
                selectedChannelIds.length === 0
              }
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createRule.isPending
                ? "Creating reminder..."
                : "Create reminder"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 md:p-6">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Your reminders
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Reminder rules saved to your account.
              </p>
            </div>

            <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
              {rules.length}
            </span>
          </div>

          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading reminders...
            </p>
          )}

          {isError && (
            <p className="py-8 text-center text-sm text-destructive">
              {error instanceof Error
                ? error.message
                : "Could not load your reminders."}
            </p>
          )}

          {!isLoading && !isError && rules.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
              <div className="text-3xl" aria-hidden="true">
                🔔
              </div>

              <h3 className="mt-3 font-semibold">
                No reminders yet
              </h3>

              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                Create your first rule to decide when you want to be
                reminded.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {rules.map((rule) => (
              <article
                key={rule.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold">
                      {rule.name}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {describeRule(rule.config)}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      rule.status === "active"
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {rule.status}
                  </span>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  Type:{" "}
                  {reminderTypes.find(
                    (item) => item.value === rule.type,
                  )?.label ?? rule.type}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
