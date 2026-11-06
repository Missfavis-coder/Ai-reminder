"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Code2,
  Info,
  Moon,
  Plus,
  RefreshCw,
  Send,
  Smartphone,
  Timer,
  WifiOff,
  Zap,
} from "lucide-react";

import {
  useCreateReminderRule,
  useReminderRules,
} from "@/lib/hooks/use-reminder-rules";
import { useNotificationChannels } from "@/lib/hooks/use-notification-channels";

import type {
  CreateReminderRuleInput,
  ReminderRuleConfig,
  ReminderRuleType,
} from "@/lib/types/reminder";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const reminderTypes: {
  value: ReminderRuleType;
  label: string;
  description: string;
  icon: typeof Clock3;
  requiresWorkspace: boolean;
}[] = [
  {
    value: "active_work",
    label: "Active work",
    description: "After continuous work",
    icon: Zap,
    requiresWorkspace: true,
  },
  {
    value: "inactivity",
    label: "Inactivity",
    description: "When your workspace is idle",
    icon: Moon,
    requiresWorkspace: true,
  },
  {
    value: "deadline",
    label: "Deadline",
    description: "Before a deadline",
    icon: CalendarClock,
    requiresWorkspace: false,
  },
  {
    value: "fixed_time",
    label: "Fixed time",
    description: "At a specific time",
    icon: Bell,
    requiresWorkspace: false,
  },
];

const reminderFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a name for this reminder.")
      .max(120, "Reminder name cannot exceed 120 characters."),
    description: z
      .string()
      .trim()
      .min(1, "Enter a description for this reminder.")
      .max(500, "Description cannot exceed 500 characters."),
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

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  web_push: "Web Push",
  desktop: "Desktop notifications",
  email: "Email",
  instagram: "Instagram",
};

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
      return `${config.leadTimeSeconds / 60} minutes before ${formatDate(config.deadlineAt)}`;

    case "fixed_time":
      return `Scheduled for ${formatDate(config.scheduledAt)}`;
  }
}

function ErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-destructive/30 bg-destructive/[0.03] px-5 py-8 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <WifiOff className="h-5 w-5" />
      </div>

      <h3 className="text-sm font-semibold">{title}</h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
        {description}
      </p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="mt-4 h-8 gap-2"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </Button>
    </div>
  );
}

export default function RemindersPage() {
  const {
    data: rules = [],
    isLoading,
    isError,
    refetch: refetchRules,
  } = useReminderRules();

  const createRule = useCreateReminderRule();

  const {
    data: channels = [],
    isLoading: channelsLoading,
    isError: channelsError,
    refetch: refetchChannels,
  } = useNotificationChannels();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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

  const selectedType = reminderTypes.find(
    (item) => item.value === type,
  )!;

  const activityBased = selectedType.requiresWorkspace;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const validation = reminderFormSchema.safeParse({
      name,
      description,
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
        thresholdSeconds:
          Number(values.thresholdMinutes) * 60,
        repeat: values.repeat,
      };
    } else if (values.type === "deadline") {
      config = {
        type: "deadline",
        deadlineAt: new Date(values.deadlineAt).toISOString(),
        leadTimeSeconds:
          Number(values.leadTimeMinutes) * 60,
      };
    } else {
      config = {
        type: "fixed_time",
        scheduledAt: new Date(values.scheduledAt).toISOString(),
      };
    }

    const input: CreateReminderRuleInput = {
      name: values.name,
      description: values.description,
      config,
      channelIds: values.channelIds,
    };

    try {
      await createRule.mutateAsync(input);

      toast.success("Reminder created successfully!");

      setName("");
      setDescription("");
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
    <div className="mx-auto w-full max-w-7xl space-y-7 p-4 md:p-8">
      {/* Page heading */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            Your reminders
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stay on top of your work, deadlines, and daily tasks.
          </p>
        </div>

        <Button
          onClick={() =>
            document
              .getElementById("create-reminder")
              ?.scrollIntoView({ behavior: "smooth" })
          }
          size="sm"
          className="w-fit gap-2 py-5 px-6 "
        >
          <Plus className="h-4 w-4" />
          New reminder
        </Button>
      </header>

      {/* Create reminder */}
      <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
      <section
        id="create-reminder"
        className="rounded-2xl bg-neutral-100 p-4 shadow-sm sm:p-6"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Plus className="h-4 w-4" />
          </div>

          <div>
            <h2 className="text-base font-semibold">
              Create a reminder
            </h2>
            <p className="text-xs text-muted-foreground">
              Choose when and where you want to be reminded.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 max-h-[500px] overflow-y-auto scrollbar-hide ">
          {/* Reminder name */}
          <div className="space-y-2">
            <Label htmlFor="reminder-name" className="text-sm font-semibold tracking-wide">
              Reminder name
            </Label>

            <Input
              id="reminder-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Take a short break"
              maxLength={120}
              required
              className="h-10"
            />
          </div>

          {/* Reminder description */}
          <div className="space-y-2">
            <Label htmlFor="reminder-description" className="text-sm font-semibold tracking-wide">
              What should we remind you about?
            </Label>
            <Textarea
              id="reminder-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. Wash the clothes in the laundry basket before the evening."
              maxLength={500}
              required
              rows={3}
              className="resize-none text-sm"
            />
            <p className="text-[13px] text-muted-foreground">
              Add details to help make your reminder meaningful.
            </p>
          </div>

          {/* Reminder type - horizontal scroll */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold tracking-wide">
                When should we remind you?
              </Label>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Select a reminder type.
              </p>
            </div>

            <div className="-mx-4 overflow-x-auto scrollbar-hide px-4 pb-2 sm:-mx-6 sm:px-6">
              <div className="flex w-max gap-2">
                {reminderTypes.map((item) => {
                  const Icon = item.icon;
                  const selected = type === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setType(item.value)}
                      aria-pressed={selected}
                      className={`flex w-[150px] shrink-0 items-center gap-2.5 rounded-xl border p-3 text-left transition-all sm:w-[170px] ${
                        selected
                          ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30"
                          : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          selected
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold">
                          {item.label}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {item.description}
                        </p>
                      </div>

                      {selected && (
                        <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dynamic settings */}
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold">
                Reminder settings
              </h3>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Configure your selected reminder.
              </p>
            </div>

            {(type === "active_work" ||
              type === "inactivity") && (
              <div className="space-y-4">
                <div className="max-w-xs space-y-2">
                  <Label htmlFor="threshold" className="text-sm font-semibold tracking-wide">
                    Duration (minutes)
                  </Label>

                  <Input
                    id="threshold"
                    type="number"
                    min="1"
                    max="1440"
                    value={thresholdMinutes}
                    onChange={(event) =>
                      setThresholdMinutes(event.target.value)
                    }
                    required
                    className="h-9"
                  />

                  <p className="text-[12px] text-muted-foreground">
                    Enter a duration between 1 minute and 24 hours.
                  </p>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3">
                  <Checkbox
                    id="repeat"
                    checked={repeat}
                    onCheckedChange={(checked) =>
                      setRepeat(checked === true)
                    }
                  />

                  <div>
                    <p className="text-[13px] font-medium">
                      Repeat this reminder
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      Allow it to trigger again when the conditions are met.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {type === "deadline" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="deadline" className="text-xs">
                    Deadline date and time
                  </Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={deadlineAt}
                    onChange={(event) =>
                      setDeadlineAt(event.target.value)
                    }
                    required
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lead-time" className="text-xs">
                    Remind me this many minutes before
                  </Label>
                  <Input
                    id="lead-time"
                    type="number"
                    min="1"
                    max="1440"
                    value={leadTimeMinutes}
                    onChange={(event) =>
                      setLeadTimeMinutes(event.target.value)
                    }
                    required
                    className="h-9"
                  />
                </div>
              </div>
            )}

            {type === "fixed_time" && (
              <div className="max-w-sm space-y-2">
                <Label htmlFor="scheduled-at" className="text-xs">
                  Reminder date and time
                </Label>
                <Input
                  id="scheduled-at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) =>
                    setScheduledAt(event.target.value)
                  }
                  required
                  className="h-9"
                />
              </div>
            )}
          </div>

          {/* Workspace information */}
          <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/20 p-3">
            {activityBased ? (
              <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            )}

            <div>
              <p className="text-xs font-medium">
                {activityBased
                  ? "Workspace connection required"
                  : "No workspace connection required"}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                {activityBased
                  ? "This reminder depends on development activity. Make sure your workspace is connected and sending activity events."
                  : "This reminder uses a scheduled date or deadline, so workspace activity is not needed."}
              </p>
            </div>
          </div>

          {/* Notification channels */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">
                  Notification delivery
                </h3>
                <p className="text-xs text-muted-foreground">
                  Where should we send your reminder?
                </p>
              </div>
            </div>

            {channelsLoading && (
              <p className="text-xs text-muted-foreground">
                Loading notification channels...
              </p>
            )}

            {channelsError && (
              <ErrorState
                title="Couldn't load your channels"
                description="Check your internet connection and try loading your notification channels again."
                onRetry={() => void refetchChannels()}
              />
            )}

            {!channelsLoading &&
              !channelsError &&
              channels.length === 0 && (
                <div className="rounded-xl border border-dashed px-4 py-6 text-center">
                  <Smartphone className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-2 text-xs font-semibold">
                    No notification channels connected
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Connect a channel before creating a reminder.
                  </p>
                  <Button
                    
                    variant="outline"
                    size="sm"
                    className="mt-3 h-8"
                  >
                    <a href="/integrations">
                      Configure integrations
                    </a>
                  </Button>
                </div>
              )}

            {!channelsLoading &&
              !channelsError &&
              channels.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {channels.map((channel) => {
                    const checked = selectedChannelIds.includes(
                      channel.id,
                    );

                    return (
                      <label
                        key={channel.id}
                        className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                          checked
                            ? "border-primary bg-primary/[0.04]"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={
                            !checked &&
                            selectedChannelIds.length >= 5
                          }
                          onCheckedChange={(value) =>
                            toggleChannel(
                              channel.id,
                              value === true,
                            )
                          }
                        />

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium">
                            {channelLabels[channel.type] ??
                              channel.type}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {channel.destination}
                          </p>
                        </div>

                        {checked && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

            {channels.length > 0 && !channelsError && (
              <p className="text-[11px] text-muted-foreground">
                {selectedChannelIds.length} of 5 channels selected.
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-muted-foreground">
              You can manage your reminders after creating them.
            </p>

            <Button
              type="submit"
              size="sm"
              className="gap-2"
              disabled={
                createRule.isPending ||
                channelsLoading ||
                channelsError ||
                channels.length === 0 ||
                selectedChannelIds.length === 0
              }
            >
              {createRule.isPending ? (
                <>
                  <Clock3 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create reminder
                </>
              )}
            </Button>
          </div>
        </form>
      </section>

      {/* Saved reminders */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">
              Saved reminders
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Your existing reminder rules.
            </p>
          </div>

          <Badge variant="secondary">
            {rules.length} {rules.length === 1 ? "reminder" : "reminders"}
          </Badge>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 rounded-xl border py-10 text-xs text-muted-foreground">
            <Clock3 className="h-4 w-4 animate-spin" />
            Loading your reminders...
          </div>
        )}

        {isError && (
          <ErrorState
            title="Couldn't load your reminders"
            description="Your reminders are safe. Check your connection and try again."
            onRetry={() => void refetchRules()}
          />
        )}

        {!isLoading && !isError && rules.length === 0 && (
          <div className="rounded-xl border border-dashed px-4 py-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="mt-3 text-sm font-semibold">
              No reminders yet
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
              Create your first reminder to stay on top of your work
              and important tasks.
            </p>
          </div>
        )}

        {!isLoading && !isError && rules.length > 0 && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide">
            {rules.map((rule) => {
              const ruleType = reminderTypes.find(
                (item) => item.value === rule.type,
              );

              const Icon = ruleType?.icon ?? Bell;

              return (
                <article
                  key={rule.id}
                  className="rounded-xl bg-neutral-100 p-4 transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="break-words text-sm font-semibold">
                          {rule.name}
                        </h3>

                        <Badge
                          variant={
                            rule.status === "active"
                              ? "default"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {rule.status}
                        </Badge>
                      </div>

                      {rule.description && (
                        <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                          {rule.description}
                        </p>
                      )}

                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {describeRule(rule.config)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {ruleType?.label ?? rule.type}
                        </Badge>

                        <Badge variant="outline" className="text-[10px]">
                          {rule.config.type === "active_work" ||
                          rule.config.type === "inactivity" ? (
                            <>
                              <Timer className="mr-1 h-3 w-3" />
                              Activity-based
                            </>
                          ) : (
                            <>
                              <CalendarClock className="mr-1 h-3 w-3" />
                              Scheduled
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      </div>

      {/* Small integrations link */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Need to change where reminders are delivered?
          </p>
        </div>

        <Button  variant="outline" size="sm" className="h-8">
          <a href="/integrations">Manage integrations</a>
        </Button>
      </div>
    </div>
  );
}