
"use client";

import { useMemo, useState } from "react";
import {
  PiCalendarBlank,
  PiCaretDown,
  PiCheck,
  PiChecks,
  PiClipboardText,
  PiClock,
  PiDotsThree,
  PiFunnel,
  PiMagnifyingGlass,
  PiPlus,
  PiSquaresFour,
  PiListBullets,
  PiTrash,
  PiX,
} from "react-icons/pi";

import { Button } from "@/components/ui/button";

type TaskStatus = "To Do" | "In Progress" | "Completed";
type TaskPriority = "Low" | "Medium" | "High";

type Task = {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  category: string;
};

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Finish landing page design",
    description: "Finalize the new dashboard and responsive layouts.",
    status: "In Progress",
    priority: "High",
    dueDate: "2026-10-28",
    category: "Design",
  },
  {
    id: 2,
    title: "Review project requirements",
    description: "Go through the requirements and update the checklist.",
    status: "To Do",
    priority: "Medium",
    dueDate: "2026-10-29",
    category: "Planning",
  },
  {
    id: 3,
    title: "Prepare weekly report",
    description: "Summarize the team's progress and outstanding tasks.",
    status: "To Do",
    priority: "Low",
    dueDate: "2026-10-30",
    category: "Work",
  },
  {
    id: 4,
    title: "Update component library",
    description: "Polish reusable buttons, cards, and form components.",
    status: "In Progress",
    priority: "High",
    dueDate: "2026-10-28",
    category: "Development",
  },
  {
    id: 5,
    title: "Test reminder notifications",
    description: "Verify reminder scheduling and delivery behaviour.",
    status: "Completed",
    priority: "Medium",
    dueDate: "2026-10-25",
    category: "Development",
  },
  {
    id: 6,
    title: "Organize team meeting",
    description: "Prepare the agenda and share the meeting details.",
    status: "Completed",
    priority: "Low",
    dueDate: "2026-10-24",
    category: "Planning",
  },
];

const statuses: TaskStatus[] = ["To Do", "In Progress", "Completed"];

const priorityStyles: Record<TaskPriority, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-secondary text-foreground",
  High: "bg-accent/20 text-foreground",
};

const statusStyles: Record<TaskStatus, string> = {
  "To Do": "bg-muted text-muted-foreground",
  "In Progress": "bg-secondary text-foreground",
  Completed: "bg-primary/10 text-primary",
};

function formatDate(date: string) {
  if (!date) return "No due date";

  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [view, setView] = useState<"List" | "Board">("List");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("Medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [newCategory, setNewCategory] = useState("General");

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.category.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  const counts = {
    all: tasks.length,
    todo: tasks.filter((task) => task.status === "To Do").length,
    inProgress: tasks.filter((task) => task.status === "In Progress").length,
    completed: tasks.filter((task) => task.status === "Completed").length,
  };

  function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = newTitle.trim();
    if (!title) return;

    const task: Task = {
      id: Date.now(),
      title,
      description: newDescription.trim(),
      status: "To Do",
      priority: newPriority,
      dueDate: newDueDate,
      category: newCategory.trim() || "General",
    };

    setTasks((current) => [task, ...current]);
    setNewTitle("");
    setNewDescription("");
    setNewPriority("Medium");
    setNewDueDate("");
    setNewCategory("General");
    setShowCreateForm(false);
  }

  function updateStatus(id: number, status: TaskStatus) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, status } : task))
    );
  }

  function deleteTask(id: number) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function TaskCard({ task }: { task: Task }) {
    return (
      <article className="group rounded-xl border border-border bg-white p-4 transition-colors hover:bg-secondary/30">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() =>
              updateStatus(
                task.id,
                task.status === "Completed" ? "To Do" : "Completed"
              )
            }
            aria-label={
              task.status === "Completed"
                ? `Reopen ${task.title}`
                : `Complete ${task.title}`
            }
            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition ${
              task.status === "Completed"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:border-primary"
            }`}
          >
            {task.status === "Completed" && <PiCheck className="size-3.5" />}
          </button>

          <div className="min-w-0 flex-1">
            <h3
              className={`break-words text-[14px] font-medium ${
                task.status === "Completed"
                  ? "text-muted-foreground line-through"
                  : "text-foreground"
              }`}
            >
              {task.title}
            </h3>

            {task.description && (
              <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
                {task.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md px-2 py-1 text-[10px] font-medium ${priorityStyles[task.priority]}`}
              >
                {task.priority} priority
              </span>

              <span className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                {task.category}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <PiCalendarBlank className="size-3.5" />
                {formatDate(task.dueDate)}
              </span>

              <select
                aria-label={`Status for ${task.title}`}
                value={task.status}
                onChange={(event) =>
                  updateStatus(task.id, event.target.value as TaskStatus)
                }
                className="max-w-full rounded-md border border-border bg-background px-2 py-1.5 text-[10px] text-foreground outline-none focus:ring-2 focus:ring-ring/30"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => deleteTask(task.id)}
            aria-label={`Delete ${task.title}`}
            className="rounded-md p-1.5 text-muted-foreground opacity-100 transition hover:bg-accent/20 hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
          >
            <PiTrash className="size-4" />
          </button>
        </div>
      </article>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Page heading */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-2xl">
              My Tasks
            </h1>

          </div>

          <Button
            onClick={() => setShowCreateForm(true)}
            className="h-10 gap-2 rounded-lg px-8 cursor-pointer"
          >
            <PiPlus className="size-4" />
            Create task
          </Button>
        </section>

        {/* Summary cards */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            {
              label: "All tasks",
              count: counts.all,
              icon: PiClipboardText,
            },
            {
              label: "To do",
              count: counts.todo,
              icon: PiClock,
            },
            {
              label: "In progress",
              count: counts.inProgress,
              icon: PiSquaresFour,
            },
            {
              label: "Completed",
              count: counts.completed,
              icon: PiChecks,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-xl bg-neutral-100 p-4 text-card-foreground"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-neutral-600">
                    {item.label}
                  </p>

                  <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-foreground">
                    <Icon className="size-4" />
                  </span>
                </div>

                <p className="mt-3 text-2xl  text-neutral-950 font-semibold tracking-tight">
                  {item.count}
                </p>
              </div>
            );
          })}
        </section>

        {/* Task workspace */}
        <section className="rounded-xl bg-neutral-100 text-card-foreground">
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-[15px] font-semibold text-neutral-900">All tasks</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage your work and track your progress.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-border bg-background p-1">
                  <button
                    type="button"
                    onClick={() => setView("List")}
                    className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition cursor-pointer ${
                      view === "List"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <PiListBullets className="size-4" />
                    List
                  </button>

                  <button
                    type="button"
                    onClick={() => setView("Board")}
                    className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition cursor-pointer ${
                      view === "Board"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <PiSquaresFour className="size-4" />
                    Board
                  </button>
                </div>

                <Button
                  size="icon"
                  aria-label="Toggle filters"
                  onClick={() => setShowFilters((current) => !current)}
                  className="pointer-events-none"
                >
                  <PiFunnel className="size-4" />
                </Button>
              </div>
            </div>

            {/* Search and filters */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <PiMagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tasks..."
                  className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/20"
                />
              </div>

              {showFilters && (
                <>
                  <select
                    aria-label="Filter by status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="All">All statuses</option>
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filter by priority"
                    value={priorityFilter}
                    onChange={(event) => setPriorityFilter(event.target.value)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="All">All priorities</option>
                    <option value="Low">Low priority</option>
                    <option value="Medium">Medium priority</option>
                    <option value="High">High priority</option>
                  </select>
                </>
              )}
            </div>
          </div>

          {/* List view */}
          {view === "List" && (
            <div className="space-y-3 p-4 sm:p-5">
              {filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}

              {filteredTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <PiClipboardText className="mb-3 size-8 text-muted-foreground" />
                  <p className="text-[15px] font-medium">No tasks found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try another search or create a new task.
                  </p>

                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("All");
                      setPriorityFilter("All");
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Board view */}
          {view === "Board" && (
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3 sm:p-5">
              {statuses.map((status) => {
                const columnTasks = filteredTasks.filter(
                  (task) => task.status === status
                );

                return (
                  <div
                    key={status}
                    className="min-w-0 rounded-xl bg-muted/50 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-3 rounded-full ${
                            status === "Completed"
                              ? "bg-primary"
                              : status === "In Progress"
                                ? "bg-accent"
                                : "bg-muted-foreground/50"
                          }`}
                        />

                        <h3 className="text-sm text-neutral-900 font-semibold">{status}</h3>
                      </div>

                      <span className="rounded-full bg-background flex items-center h-6 w-6 px-2 py-1 text-[13px] text-muted-foreground">
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {columnTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}

                      {columnTasks.length === 0 && (
                        <p className="rounded-lg border-2 border-dashed border-primary px-3 py-6 text-center text-sm text-neutral-700">
                          No tasks here
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(true);
                      }}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-xs text-neutral-700 transition hover:border-primary hover:text-foreground cursor-pointer"
                    >
                      <PiPlus className="size-3.5" />
                      Add task
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Create task dialog */}
        {showCreateForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-[2px]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowCreateForm(false);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-task-title"
              className="my-auto w-full max-w-lg rounded-2xl border border-border bg-background p-5 text-foreground shadow-xl sm:p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="create-task-title"
                    className="text-lg font-semibold"
                  >
                    Create a task
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add a task to your workspace.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close form"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <PiX className="size-4" />
                </button>
              </div>

              <form onSubmit={createTask} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="task-title"
                    className="text-xs font-medium"
                  >
                    Task title
                  </label>

                  <input
                    id="task-title"
                    autoFocus
                    required
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    placeholder="What needs to get done?"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="task-description"
                    className="text-xs font-medium"
                  >
                    Description
                  </label>

                  <textarea
                    id="task-description"
                    value={newDescription}
                    onChange={(event) =>
                      setNewDescription(event.target.value)
                    }
                    placeholder="Add a few details..."
                    rows={3}
                    className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="task-priority"
                      className="text-xs font-medium"
                    >
                      Priority
                    </label>

                    <select
                      id="task-priority"
                      value={newPriority}
                      onChange={(event) =>
                        setNewPriority(event.target.value as TaskPriority)
                      }
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="task-due-date"
                      className="text-xs font-medium"
                    >
                      Due date
                    </label>

                    <input
                      id="task-due-date"
                      type="date"
                      value={newDueDate}
                      onChange={(event) => setNewDueDate(event.target.value)}
                      className="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="task-category"
                    className="text-xs font-medium"
                  >
                    Category
                  </label>

                  <input
                    id="task-category"
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    placeholder="e.g. Work, Design, Personal"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>

                  <Button type="submit" className="gap-2 cursor-pointer">
                    <PiPlus className="size-4" />
                    Create task
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
