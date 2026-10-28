
"use client";

import { FormEvent, useState } from "react";
import {
  useCreateReminderRule,
  useReminderRules,
} from "@/lib/hooks/use-reminder-rules";
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
    description: "Remind me after working continuously for a set duration.",
  },
  {
    value: "inactivity",
    label: "Inactivity",
    description: "Remind me after my workspace has been inactive.",
  },
  {
    value: "deadline",
    label: "Deadline",
    description: "Remind me before a deadline.",
  },
  {
    value: "fixed_time",
    label: "Fixed time",
    description: "Send a reminder at a particular date and time.",
  },
];

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not scheduled";

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

export default function RemindersPage() {
  const { data: rules = [], isLoading, isError, error } =
    useReminderRules();

  const createRule = useCreateReminderRule();

  const [name, setName] = useState("");
  const [type, setType] =
    useState<ReminderRuleType>("inactivity");
  const [thresholdMinutes, setThresholdMinutes] = useState("20");
  const [leadTimeMinutes, setLeadTimeMinutes] = useState("30");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError("Enter a name for this reminder.");
      return;
    }

    let config: ReminderRuleConfig;

    if (type === "active_work" || type === "inactivity") {
      const minutes = Number(thresholdMinutes);

      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
        setFormError("Duration must be between 1 and 1440 minutes.");
        return;
      }

      config = {
        type,
        thresholdSeconds: Math.round(minutes * 60),
        repeat,
      };
    } else if (type === "deadline") {
      const leadMinutes = Number(leadTimeMinutes);

      if (!deadlineAt || Number.isNaN(new Date(deadlineAt).getTime())) {
        setFormError("Choose a valid deadline.");
        return;
      }

      if (
        !Number.isFinite(leadMinutes) ||
        leadMinutes < 1 ||
        leadMinutes > 1440
      ) {
        setFormError("Lead time must be between 1 and 1440 minutes.");
        return;
      }

      if (new Date(deadlineAt).getTime() <= Date.now()) {
        setFormError("The deadline must be in the future.");
        return;
      }

      config = {
        type: "deadline",
        deadlineAt: new Date(deadlineAt).toISOString(),
        leadTimeSeconds: Math.round(leadMinutes * 60),
      };
    } else {
      if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
        setFormError("Choose a valid reminder date and time.");
        return;
      }

      if (new Date(scheduledAt).getTime() <= Date.now()) {
        setFormError("The reminder time must be in the future.");
        return;
      }

      config = {
        type: "fixed_time",
        scheduledAt: new Date(scheduledAt).toISOString(),
      };
    }

    const input: CreateReminderRuleInput = {
      name: trimmedName,
      config,
    };

    try {
      await createRule.mutateAsync(input);
      setName("");
      setType("inactivity");
      setThresholdMinutes("20");
      setLeadTimeMinutes("30");
      setDeadlineAt("");
      setScheduledAt("");
      setRepeat(false);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Could not create the reminder. Please try again.",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 md:p-8">
      <header>
        <p className="text-sm font-medium text-primary">
          PERSONAL PRODUCTIVITY
        </p>
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
            <h2 className="text-lg font-semibold">Create a reminder</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a trigger and configure when it should apply.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="reminder-name" className="text-sm font-medium">
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
              <label htmlFor="reminder-type" className="text-sm font-medium">
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
                {reminderTypes.find((item) => item.value === type)?.description}
              </p>
            </div>

            {(type === "active_work" || type === "inactivity") && (
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
                    onChange={(event) => setRepeat(event.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      Repeat this reminder
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Allow the rule to remind me again when its conditions
                      are met, if supported by the rule evaluator.
                    </span>
                  </span>
                </label>
              </>
            )}

            {type === "deadline" && (
              <>
                <div className="space-y-2">
                  <label htmlFor="deadline" className="text-sm font-medium">
                    Deadline date and time
                  </label>
                  <input
                    id="deadline"
                    type="datetime-local"
                    value={deadlineAt}
                    onChange={(event) => setDeadlineAt(event.target.value)}
                    required
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="lead-time" className="text-sm font-medium">
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
                <label htmlFor="scheduled-at" className="text-sm font-medium">
                  Reminder date and time
                </label>
                <input
                  id="scheduled-at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            {formError && (
              <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            )}

            {createRule.isSuccess && (
              <p role="status" className="text-sm text-green-600">
                Reminder created successfully.
              </p>
            )}

            <button
              type="submit"
              disabled={createRule.isPending}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createRule.isPending ? "Creating reminder..." : "Create reminder"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 md:p-6">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Your reminders</h2>
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
            <p role="alert" className="py-8 text-center text-sm text-destructive">
              {error instanceof Error
                ? error.message
                : "Could not load your reminders."}
            </p>
          )}

          {!isLoading && !isError && rules.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
              <div className="text-3xl" aria-hidden="true">🔔</div>
              <h3 className="mt-3 font-semibold">No reminders yet</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                Create your first rule to decide when you want to be reminded.
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
                    <h3 className="break-words font-semibold">{rule.name}</h3>
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
                  {reminderTypes.find((item) => item.value === rule.type)?.label ??
                    rule.type}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
