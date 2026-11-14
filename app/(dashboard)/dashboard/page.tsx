"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  ListTodo,
  Monitor,
  Plus,
  RefreshCw,

} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";

import { useCurrentUser } from "@/lib/hooks/use-auth";
import {
  useActivityEvents,
  useWorkspaceSessions,
} from "@/lib/hooks/use-activity";
import {useCreateTask, useTasks, useUpdateTask,
} from "@/lib/hooks/use-tasks";
import { useReminderRules } from "@/lib/hooks/use-reminder-rules";
import { useWorkspaces } from "@/lib/hooks/use-workspace";

import type { Task } from "@/lib/types/tasks";

import { formatDate, getReminderDescription, getReminderIcon, getReminderTiming, getReminderTriggerTime, isTaskOverdue,  formatDuration } from "@/lib/utils/dashboard";

const EMPTY_ACTIVITY_EVENTS: never[] = [];
type TaskFilter = "Upcoming" | "Overdue" | "Completed";

const workspaceProviderLabels: Record<string, string> = {
  vscode: "Visual Studio Code",
  cursor: "Cursor",
  antigravity: "Antigravity",
  windsurf: "Windsurf",
  browser: "Browser",
  desktop: "Desktop",
};

const workspaceProviderOrder = [
  "vscode",
  "cursor",
  "antigravity",
  "windsurf",
  "browser",
  "desktop",
] as const;

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState("");
  const [greeting, setGreeting] = useState("Hello");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [activeTaskFilter, setActiveTaskFilter] =
    useState<TaskFilter>("Upcoming");
    const [activityByDay, setActivityByDay] = useState<
  { key: string; label: string; count: number }[]
>([]);
    

  useEffect(() => {
    const now = new Date();

    setCurrentDate(
      now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );

    const hour = now.getHours();

    setGreeting(
      hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening",
    );
  }, []);

  const {
    data: currentUserResponse,
    isLoading: userLoading,
  } = useCurrentUser();

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    isError: tasksError,
  } = useTasks();

  const {
    data: activityEvents = EMPTY_ACTIVITY_EVENTS,
    isLoading: activityLoading,
    isError: activityError,
    refetch: refetchActivity,
  } = useActivityEvents({
    period: "7d",
    limit: 100,
  });

  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useWorkspaceSessions({
    period: "7d",
    limit: 100,
  });

  const {
    data: workspaces = [],
    isLoading: workspacesLoading,
  } = useWorkspaces();

  const workspaceGroups = workspaceProviderOrder
    .map((provider) => ({
      provider,
      label: workspaceProviderLabels[provider],
      workspaces: workspaces.filter((workspace) => workspace.provider === provider),
    }))
    .filter((group) => group.workspaces.length > 0);

  const {
    data: reminderRules = [],
    isLoading: remindersLoading,
    isError: remindersError,
  } = useReminderRules();

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const userName =
    currentUserResponse?.user?.name?.trim().split(/\s+/)[0] ||
    "there";

  const completedTasks = tasks.filter(
    (task) => task.completed,
  );

  const openTasks = tasks.filter(
    (task) => !task.completed,
  );

  const overdueTasks = tasks.filter(isTaskOverdue);

  const activeReminderRules = reminderRules.filter(
    (rule) => rule.status === "active",
  );

  const activeSessions = sessions.filter(
    (session) => session.status === "active",
  );

  const totalActiveSeconds = sessions.reduce(
    (total, session) => total + session.activeSeconds,
    0,
  );

  const connectedWorkspaces = workspaces.filter(
    (workspace) =>
      workspace.status === "connected" &&
      workspace.monitoringEnabled,
  );

  const visibleTasks = useMemo(() => {
    switch (activeTaskFilter) {
      case "Completed":
        return tasks.filter((task) => task.completed);

      case "Overdue":
        return tasks.filter(isTaskOverdue);

      default:
        return tasks
          .filter(
            (task) =>
              !task.completed && !isTaskOverdue(task),
          )
          .sort((a, b) => {
            if (!a.dueAt) return 1;
            if (!b.dueAt) return -1;

            return (
              new Date(a.dueAt).getTime() -
              new Date(b.dueAt).getTime()
            );
          });
    }
  }, [tasks, activeTaskFilter]);

  useEffect(() => {
    const today = new Date();
  
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
  
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() - (6 - index));
  
      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
  
      const count = activityEvents.filter((event) => {
        const eventDate = new Date(event.occurredAt);
  
        const eventKey = [
          eventDate.getFullYear(),
          String(eventDate.getMonth() + 1).padStart(2, "0"),
          String(eventDate.getDate()).padStart(2, "0"),
        ].join("-");
  
        return eventKey === key;
      }).length;
  
      return {
        key,
        label: date.toLocaleDateString(undefined, {
          weekday: "short",
        }),
        count,
      };
    });
  
    setActivityByDay(days);
  }, [activityEvents]);
  const maxActivityCount = Math.max(
    1,
    ...activityByDay.map((day) => day.count),
  );

  const upcomingReminders = useMemo(() => {
    return reminderRules
      .filter((rule) => rule.status === "active")
      .sort((a, b) => {
        const aTime = getReminderTriggerTime(a.config);
        const bTime = getReminderTriggerTime(b.config);

        if (aTime === null && bTime === null) return 0;
        if (aTime === null) return 1;
        if (bTime === null) return -1;

        return aTime - bTime;
      })
      .slice(0, 4);
  }, [reminderRules]);

  async function handleCreateTask(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const title = newTaskTitle.trim();

    if (!title || createTask.isPending) return;

    try {
      await createTask.mutateAsync({ title });

      setNewTaskTitle("");
      setShowTaskInput(false);
    } catch {
      // The mutation error is displayed in the task panel.
    }
  }

  async function handleToggleTask(task: Task) {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        input: {
          completed: !task.completed,
          status: task.completed ? "To Do" : "Completed",
        },
      });
    } catch {
      // The mutation error is displayed in the task panel.
    }
  }

  async function refreshWorkspaceActivity() {
    await Promise.all([
      refetchActivity(),
      refetchSessions(),
    ]);
  }

  const taskFilters: TaskFilter[] = [
    "Upcoming",
    "Overdue",
    "Completed",
  ];

  return (
    <main className="min-h-full bg-white px-4 py-6 text-[#24251f] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        {/* Greeting */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm text-neutral-400">
              {currentDate || "Your workspace"}
            </p>

            <h1 className="text-2xl font-normal tracking-tight sm:text-3xl">
              <span className="text-neutral-600">
                {greeting},{" "}
              </span>
              <span className="font-semibold text-black">
                {userLoading ? "..." : userName}
              </span>
            </h1>

            <p className="mt-2 text-sm text-neutral-500">
              Here's an overview of your tasks, reminders and workspace activity.
            </p>
          </div>

          <Button
            variant="outline"
            className="h-9 flex rounded-lg border-border bg-white text-xs shadow-none hover:bg-[#f4f4ef]"
          >
            <Link href="/tasks" className="flex">
              <ListTodo className="mr-2 size-4" />
              Manage tasks
            </Link>
          </Button>
        </header>

        {/* Overview cards */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            {
              label: "Open tasks",
              value: openTasks.length,
              icon: ListTodo,
            },
            {
              label: "Overdue tasks",
              value: overdueTasks.length,
              icon: Clock3,
            },
            {
              label: "Completed tasks",
              value: completedTasks.length,
              icon: CheckCircle2,
            },
            {
              label: "Active reminders",
              value: activeReminderRules.length,
              icon: Bell,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-2xl bg-neutral-100 p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-neutral-500 sm:text-sm">
                    {item.label}
                  </p>

                  <span className="flex size-8 items-center justify-center rounded-xl bg-white text-[#838c08]">
                    <Icon className="size-4" />
                  </span>
                </div>

                <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
                  {tasksLoading || remindersLoading ? "—" : item.value}
                </p>
              </article>
            );
          })}
        </section>

        {/* Main dashboard */}
        <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
          {/* Tasks */}
          <div className="min-w-0 flex flex-col justify-between rounded-2xl bg-neutral-100 p-4 shadow-xs sm:p-5 xl:col-span-7 h-110">
          <div> 
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Your tasks
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Keep track of what needs your attention.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() =>
                  setShowTaskInput((current) => !current)
                }
                className="h-9 gap-2 bg-[#838c08] text-white hover:bg-[#707807]"
              >
                <Plus className="size-4" />
                Add task
              </Button>
           
             
            {showTaskInput && (
              <form
                onSubmit={handleCreateTask}
                className="mb-4 flex gap-2"
              >
                <input
                  value={newTaskTitle}
                  onChange={(event) =>
                    setNewTaskTitle(event.target.value)
                  }
                  placeholder="What do you need to do?"
                  maxLength={250}
                  autoFocus
                  className="h-10 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-[#838c08] focus:ring-2 focus:ring-[#838c08]/10"
                />

                <Button
                  type="submit"
                  disabled={
                    !newTaskTitle.trim() || createTask.isPending
                  }
                  className="h-10 bg-[#838c08] text-white hover:bg-[#707807]"
                >
                  {createTask.isPending ? "Saving..." : "Save"}
                </Button>
              </form>
            )}

            {createTask.isError && (
              <p className="mb-3 text-xs text-red-600">
                Could not create the task. Please try again.
              </p>
            )}

            <div className="mb-4 flex gap-5 overflow-x-auto border-b border-[#e8e8e1]">
              {taskFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveTaskFilter(filter)}
                  className={`shrink-0 pb-2 text-xs transition ${
                    activeTaskFilter === filter
                      ? "border-b-2 border-[#838c08] font-semibold text-[#838c08]"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  {filter}
                  <span className="ml-1.5 text-[10px] text-neutral-400">
                    {filter === "Upcoming"
                      ? tasks.filter(
                          (task) =>
                            !task.completed &&
                            !isTaskOverdue(task),
                        ).length
                      : filter === "Overdue"
                        ? overdueTasks.length
                        : completedTasks.length}
                  </span>
                </button>
              ))}
            </div>
            </div>

            {tasksLoading ? (
              <div className="py-10 text-center text-sm text-neutral-500">
                Loading your tasks...
              </div>
            ) : tasksError ? (
              <div className="py-10 text-center">
                <p className="text-sm text-red-600">
                  Could not load your tasks.
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Please refresh the page and try again.
                </p>
              </div>
            ) : visibleTasks.length === 0 ? (
              <div className="rounded-xl bg-white px-4 py-10 text-center">
                <ListTodo className="mx-auto size-7 text-neutral-400" />
                <p className="mt-3 text-sm font-medium text-neutral-700">
                  {activeTaskFilter === "Completed"
                    ? "No completed tasks yet"
                    : activeTaskFilter === "Overdue"
                      ? "You're all caught up"
                      : "No upcoming tasks"}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {activeTaskFilter === "Upcoming"
                    ? "Add a task to start organizing your work."
                    : "Tasks in this section will appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {visibleTasks.slice(0, 3).map((task) => (
                  <article
                    key={task.id}
                    className="flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => void handleToggleTask(task)}
                      disabled={updateTask.isPending}
                      aria-label={
                        task.completed
                          ? `Reopen ${task.title}`
                          : `Complete ${task.title}`
                      }
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition ${
                        task.completed
                          ? "border-[#838c08] bg-[#838c08] text-white"
                          : "border-neutral-300 bg-white text-transparent hover:border-[#838c08]"
                      }`}
                    >
                      {task.completed && (
                        <Check className="size-3.5" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`break-words text-sm font-medium ${
                          task.completed
                            ? "text-neutral-400 line-through"
                            : "text-neutral-800"
                        }`}
                      >
                        {task.title}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-white px-2 py-1 text-[10px] text-neutral-500">
                          {task.category}
                        </span>

                        <span
                          className={`rounded-md px-2 py-1 text-[10px] ${
                            task.priority === "High"
                              ? "bg-red-50 text-red-600"
                              : task.priority === "Medium"
                                ? "bg-orange-50 text-orange-600"
                                : "bg-neutral-200 text-neutral-600"
                          }`}
                        >
                          {task.priority}
                        </span>

                        {task.dueAt && (
                          <span
                            className={`flex items-center gap-1 text-[10px] ${
                              isTaskOverdue(task)
                                ? "text-red-600"
                                : "text-neutral-400"
                            }`}
                          >
                            <Clock3 className="size-3" />
                            {formatDate(task.dueAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {updateTask.isError && (
              <p className="mt-3 text-xs text-red-600">
                Could not update the task. Please try again.
              </p>
            )}
          </div>
            <div className="mt-8 border-t border-[#e8e8e1] pt-5">
              <Link
                href="/tasks"
                className="inline-flex items-center gap-2 text-xs font-medium text-[#838c08] transition hover:text-[#707807]"
              >
                View all tasks
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Workspace activity */}
          <div className="min-w-0 rounded-2xl bg-neutral-100 text-card p-4  sm:p-5 xl:col-span-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  Workspace activity
                </h2>
                <p className="mt-1 text-xs text-[#a4a49d]">
                  Activity recorded over the last 7 days.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void refreshWorkspaceActivity()}
                disabled={activityLoading || sessionsLoading}
                aria-label="Refresh workspace activity"
                className="rounded-lg p-2 text-[#b8b8b0] transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <RefreshCw className="size-4" />
              </button>
            </div>



            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-500">
                  Recorded events
                </p>
                <span className="text-xs text-neutral-400">
                  {activityLoading ? "—" : activityEvents.length} total
                </span>
              </div>

              {activityError || sessionsError ? (
                <div className="rounded-xl bg-white p-5 text-center">
                  <p className="text-xs text-[#d4d4ce]">
                    Workspace activity could not be loaded.
                  </p>
                </div>
              ) : activityLoading ? (
                <div className="flex h-36 items-center justify-center text-xs text-[#aaa99f]">
                  Loading activity...
                </div>
              ) : activityEvents.length === 0 ? (
                <div className="rounded-xl bg-white px-4 py-8 text-center">
                  <Activity className="mx-auto size-6 text-[#aaa99f]" />
                  <p className="mt-2 text-xs text-[#d4d4ce]">
                    No workspace activity recorded yet.
                  </p>
                  <p className="mt-1 text-[11px] text-[#888880]">
                    Connect a workspace to start tracking activity.
                  </p>
                </div>
              ) : (

<div className="rounded-xl bg-white p-3 pt-5">
  <div className="mb-4 flex items-center justify-between">
    <div>
      <p className="text-xs font-semibold text-neutral-800">
        Activity overview
      </p>
      <p className="mt-1 text-[10px] text-neutral-400">
        Events recorded each day
      </p>
    </div>

    <span className="flex items-center gap-1.5 text-[10px] text-[#838c08]">
      <span className="size-2 rounded-full bg-[#838c08]" />
      Activity
    </span>
  </div>

  <div className="h-44 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={activityByDay}
        margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
      >
        <defs>
          <linearGradient
            id="activityGradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#838c08"
              stopOpacity={0.25}
            />
            <stop
              offset="95%"
              stopColor="#838c08"
              stopOpacity={0.01}
            />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#eeeeea"
        />

        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#a3a3a3", fontSize: 10 }}
          dy={8}
        />

        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#a3a3a3", fontSize: 10 }}
          width={30}
        />

        <Tooltip
          cursor={{ stroke: "#838c08", strokeDasharray: "4 4" }}
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #eeeeea",
            borderRadius: "10px",
            fontSize: "11px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
          formatter={(value) => [
            `${value ?? 0} events`,
            "Activity",
          ]}
          labelStyle={{
            color: "#737373",
            marginBottom: "4px",
          }}
        />

        <Area
          type="monotone"
          dataKey="count"
          stroke="#838c08"
          strokeWidth={2.5}
          fill="url(#activityGradient)"
          activeDot={{
            r: 5,
            fill: "#838c08",
            stroke: "#ffffff",
            strokeWidth: 2,
          }}
          dot={{
            r: 3,
            fill: "#838c08",
            stroke: "#ffffff",
            strokeWidth: 1.5,
          }}
          animationDuration={700}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
</div>

              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div>
                <p className="text-xs font-medium">
                  {connectedWorkspaces.length} connected workspace
                  {connectedWorkspaces.length === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-[10px] text-[#aaa99f]">
                  With monitoring enabled
                </p>
              </div>

              <Link
                href="/activity"
                className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                View activity
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Reminders and workspace overview */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Reminders */}
          <div className="min-w-0 rounded-2xl bg-neutral-100 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  Your reminders
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Your active reminder rules and schedules.
                </p>
              </div>

              <Link
                href="/reminders"
                className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#838c08] hover:underline"
              >
                Manage
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {remindersLoading ? (
              <div className="py-8 text-center text-xs text-neutral-500">
                Loading reminders...
              </div>
            ) : remindersError ? (
              <div className="py-8 text-center text-xs text-red-600">
                Could not load your reminders.
              </div>
            ) : upcomingReminders.length === 0 ? (
              <div className="rounded-xl bg-white px-4 py-8 text-center">
                <Bell className="mx-auto size-6 text-neutral-400" />
                <p className="mt-2 text-sm font-medium text-neutral-700">
                  No active reminders
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Create a reminder to stay on top of important work.
                </p>
                <Button
                  size="sm"
                  className="mt-4 h-8 bg-[#838c08] text-white hover:bg-[#707807]"
                >
                  <Link href="/reminders">
                    <Plus className="mr-1.5 size-3.5" />
                    Create reminder
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingReminders.map((rule) => {
                  const Icon = getReminderIcon(rule.type);

                  return (
                    <article
                      key={rule.id}
                      className="flex items-start gap-3 rounded-xl bg-white p-3"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#838c08]/10 text-[#838c08]">
                        <Icon className="size-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium text-neutral-800">
                          {rule.name}
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-neutral-500">
                          {getReminderDescription(rule.config)}
                        </p>
                        <p className="mt-1 text-[10px] font-medium text-[#838c08]">
                          {getReminderTiming(rule)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Workspace snapshot */}
          <div className="min-w-0 rounded-2xl bg-neutral-100 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  Workspace snapshot
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Your connected development environments.
                </p>
              </div>

              <Monitor className="size-5 text-[#838c08]" />
            </div>

            {workspacesLoading ? (
              <div className="py-8 text-center text-xs text-neutral-500">
                Loading workspaces...
              </div>
            ) : workspaces.length === 0 ? (
              <div className="rounded-xl bg-white px-4 py-8 text-center">
                <Monitor className="mx-auto size-6 text-neutral-400" />
                <p className="mt-2 text-sm font-medium text-neutral-700">
                  No workspaces connected
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Connect an IDE such as VS Code, Cursor, Antigravity, or Windsurf to start tracking your development activity.
                </p>
                <Button
                  size="sm"
                  className="mt-4 h-8 bg-[#838c08] text-white hover:bg-[#707807]"
                >
                  <Link href="/integrations">
                    Connect workspace
                    <ArrowRight className="ml-1.5 size-3.5" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="max-h-[360px] space-y-4 overflow-y-auto">
                {workspaceGroups.map((group) => (
                  <section key={group.provider} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                        {group.label}
                      </h3>
                      <span className="text-[10px] text-neutral-400">
                        {group.workspaces.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.workspaces.slice(0, 1).map((workspace) => (
                        <article
                          key={workspace.id}
                          className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#838c08]/10 text-[#838c08]">
                              <Monitor className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-neutral-800">
                                {workspace.name}
                              </p>
                              <p className="mt-1 text-[10px] text-neutral-500">
                                {workspaceProviderLabels[workspace.provider] ?? workspace.provider}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                              workspace.status === "connected" && workspace.monitoringEnabled
                                ? "bg-green-50 text-green-700"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {workspace.status === "connected" && workspace.monitoringEnabled
                              ? "Monitoring"
                              : workspace.status === "connected"
                                ? "Connected"
                                : "Disconnected"}
                          </span>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-[#e8e8e1] pt-3">
              <Link
                href="/integrations"
                className="inline-flex items-center gap-2 text-xs font-medium text-[#838c08] transition hover:text-[#707807]"
              >
                Manage integrations
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}