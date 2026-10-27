
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  PiBell,
  PiBellRinging,
  PiCalendarBlank,
  PiCheck,
  PiCheckCircle,
  PiChecks,
  PiClock,
  PiEnvelopeSimple,
  PiMagnifyingGlass,
  PiSparkle,
  PiTrash,
  PiWarningCircle,
  PiWhatsappLogo,
  PiX,
} from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Category = "Reminder" | "Delivery" | "System";
type Filter = "All" | "Unread" | "Reminders" | "Delivery" | "System";

type Notification = {
  id: string;
  title: string;
  description: string;
  category: Category;
  unread: boolean;
  time: string;
  icon: "reminder" | "whatsapp" | "success" | "warning" | "system";
  actionLabel?: string;
  actionHref?: string;
};

const demoNotifications: Notification[] = [
  {
    id: "1",
    title: "Your meeting starts in 30 minutes",
    description:
      "Your project review meeting is coming up. Make sure you have your notes ready before joining.",
    category: "Reminder",
    unread: true,
    time: "10 min ago",
    icon: "reminder",
    actionLabel: "View tasks",
    actionHref: "/tasks",
  },
  {
    id: "2",
    title: "WhatsApp reminder delivered",
    description:
      "Your reminder about submitting the project report was successfully delivered.",
    category: "Delivery",
    unread: true,
    time: "35 min ago",
    icon: "whatsapp",
    actionLabel: "View integrations",
    actionHref: "/integrations",
  },
  {
    id: "3",
    title: "You have an overdue task",
    description:
      "Complete your monthly budget review. This task was due today at 9:00 AM.",
    category: "Reminder",
    unread: true,
    time: "1 hour ago",
    icon: "warning",
    actionLabel: "View tasks",
    actionHref: "/tasks",
  },
  {
    id: "4",
    title: "Reminder scheduled successfully",
    description:
      "Your dentist appointment reminder has been scheduled for tomorrow at 8:00 AM.",
    category: "Reminder",
    unread: false,
    time: "3 hours ago",
    icon: "success",
    actionLabel: "View tasks",
    actionHref: "/tasks",
  },
  {
    id: "5",
    title: "Welcome to AI Reminder!",
    description:
      "Your personal reminder assistant is ready. Create reminders and choose how you want to receive them.",
    category: "System",
    unread: false,
    time: "Yesterday",
    icon: "system",
    actionLabel: "Explore dashboard",
    actionHref: "/dashboard",
  },
  {
    id: "6",
    title: "WhatsApp connection needs attention",
    description:
      "Your WhatsApp channel has not been verified yet. Check your integration settings before relying on WhatsApp delivery.",
    category: "Delivery",
    unread: false,
    time: "Yesterday",
    icon: "warning",
    actionLabel: "Check integration",
    actionHref: "/integrations",
  },
];

const filters: Filter[] = [
  "All",
  "Unread",
  "Reminders",
  "Delivery",
  "System",
];

function NotificationIcon({
  type,
}: {
  type: Notification["icon"];
}) {
  const className = "size-5";

  switch (type) {
    case "reminder":
      return <PiCalendarBlank className={className} />;
    case "whatsapp":
      return <PiWhatsappLogo className={className} />;
    case "success":
      return <PiCheckCircle className={className} />;
    case "warning":
      return <PiWarningCircle className={className} />;
    case "system":
      return <PiSparkle className={className} />;
    default:
      return <PiBell className={className} />;
  }
}

function iconStyles(type: Notification["icon"]) {
  switch (type) {
    case "reminder":
      return "bg-[#fff6dc] text-[#a66b00]";
    case "whatsapp":
      return "bg-[#e9f8ed] text-[#208747]";
    case "success":
      return "bg-[#edf5df] text-[#667d16]";
    case "warning":
      return "bg-[#fff0e8] text-[#c45d26]";
    case "system":
      return "bg-[#f1efff] text-[#7460c5]";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function categoryStyles(category: Category) {
  switch (category) {
    case "Reminder":
      return "border-transparent bg-[#fff6dc] text-[#916100] hover:bg-[#fff6dc]";
    case "Delivery":
      return "border-transparent bg-[#e9f8ed] text-[#208747] hover:bg-[#e9f8ed]";
    case "System":
      return "border-transparent bg-muted text-muted-foreground hover:bg-muted";
  }
}

export default function InboxPage() {
  const [notifications, setNotifications] =
    useState<Notification[]>(demoNotifications);
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>("1");

  const unreadCount = notifications.filter((item) => item.unread).length;
  const reminderCount = notifications.filter(
    (item) => item.category === "Reminder",
  ).length;
  const deliveryCount = notifications.filter(
    (item) => item.category === "Delivery",
  ).length;

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return notifications.filter((item) => {
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query);

      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Unread" && item.unread) ||
        (activeFilter === "Reminders" && item.category === "Reminder") ||
        (activeFilter === "Delivery" && item.category === "Delivery") ||
        (activeFilter === "System" && item.category === "System");

      return matchesSearch && matchesFilter;
    });
  }, [notifications, activeFilter, searchQuery]);

  const selectedNotification =
    notifications.find((item) => item.id === selectedId) ?? null;

  function toggleRead(id: string) {
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, unread: !item.unread } : item,
      ),
    );
  }

  function markAllAsRead() {
    setNotifications((current) =>
      current.map((item) => ({ ...item, unread: false })),
    );
  }

  function deleteNotification(id: string) {
    setNotifications((current) => current.filter((item) => item.id !== id));

    if (selectedId === id) {
      setSelectedId(null);
    }
  }

  function selectNotification(item: Notification) {
    setSelectedId(item.id);

    if (item.unread) {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? { ...notification, unread: false }
            : notification,
        ),
      );
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 sm:px-6 lg:px-8">
      <div className=" space-y-7">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
        
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Inbox
              {unreadCount > 0 && (
                <span className="ml-3 inline-flex translate-y-[-3px] items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {unreadCount} new
                </span>
              )}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground ">
              All your reminders, delivery updates, and important alerts in one
              place.
            </p>
          </div>

          <Button
            variant="outline"
            className="h-10 gap-2 self-start rounded-xl bg-background px-4 sm:self-auto"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <PiChecks className="size-4" />
            Mark all as read
          </Button>
        </div>


        {/* Inbox workspace */}
        <section className="overflow-hidden rounded-2xl border border-border bg-background">
          {/* Toolbar */}
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Your notifications</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {filteredNotifications.length}{" "}
                  {filteredNotifications.length === 1
                    ? "notification"
                    : "notifications"}{" "}
                  found
                </p>
              </div>

              <div className="relative w-full lg:max-w-xs">
                <PiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search notifications..."
                  aria-label="Search notifications"
                  className="h-10 rounded-xl border-border bg-background pl-9 pr-9"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <PiX className="size-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {filters.map((filter) => {
                const active = activeFilter === filter;
                const count =
                  filter === "All"
                    ? notifications.length
                    : filter === "Unread"
                      ? unreadCount
                      : filter === "Reminders"
                        ? reminderCount
                        : filter === "Delivery"
                          ? deliveryCount
                          : notifications.filter(
                              (item) => item.category === "System",
                            ).length;

                return (
                  <Button
                    key={filter}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter(filter)}
                    className={`h-9 shrink-0 gap-2 rounded-xl cursor-pointer px-3 ${
                      active
                        ? ""
                        : " bg-background text-muted-foreground"
                    }`}
                  >
                    {filter}
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[11px] ${
                        active
                          ? "bg-primary-foreground/15 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="grid min-h-[500px] grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
            {/* Notification list */}
            <div className="min-w-0 border-b border-border lg:border-b-0 lg:border-r">
              {filteredNotifications.length > 0 ? (
                <div className="divide-y divide-border">
                  {filteredNotifications.map((item) => {
                    const selected = selectedId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`group relative transition-colors ${
                          selected
                            ? "bg-primary/[0.045]"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => selectNotification(item)}
                          className="flex w-full gap-3 p-4 text-left sm:p-5 cursor-pointer"
                          aria-label={`Open notification: ${item.title}`}
                        >
                          <div
                            className={`relative flex size-11 shrink-0 items-center justify-center rounded-xl ${iconStyles(
                              item.icon,
                            )}`}
                          >
                            <NotificationIcon type={item.icon} />
                            {item.unread && (
                              <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-background bg-primary" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 pr-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p
                                className={`text-sm ${
                                  item.unread
                                    ? "font-semibold text-foreground"
                                    : "font-medium text-foreground"
                                }`}
                              >
                                {item.title}
                              </p>
                              {item.unread && (
                                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                              )}
                            </div>

                            <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-muted-foreground">
                              {item.description}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Badge
                                className={categoryStyles(item.category)}
                              >
                                {item.category}
                              </Badge>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <PiClock className="size-3.5" />
                                {item.time}
                              </span>
                            </div>
                          </div>
                        </button>

                        <div className="absolute right-3 top-3 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={
                              item.unread
                                ? "Mark as read"
                                : "Mark as unread"
                            }
                            title={
                              item.unread
                                ? "Mark as read"
                                : "Mark as unread"
                            }
                            onClick={() => toggleRead(item.id)}
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {item.unread ? (
                              <PiCheck className="size-4" />
                            ) : (
                              <PiEnvelopeSimple className="size-4" />
                            )}
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete notification"
                            title="Delete notification"
                            onClick={() => deleteNotification(item.id)}
                            className="text-muted-foreground hover:bg-red-50 hover:text-red-600 cursor-pointer"
                          >
                            <PiTrash className="size-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[400px] flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    {searchQuery ? (
                      <PiMagnifyingGlass className="size-6" />
                    ) : (
                      <PiBell className="size-6" />
                    )}
                  </div>
                  <h3 className="mt-4 font-semibold">
                    {searchQuery
                      ? "No matching notifications"
                      : activeFilter === "Unread"
                        ? "You're all caught up!"
                        : "Nothing here yet"}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                    {searchQuery
                      ? "Try another search term or choose a different filter."
                      : "New reminders and updates will appear here when they arrive."}
                  </p>
                  {(searchQuery || activeFilter !== "All") && (
                    <Button
                      variant="outline"
                      className="mt-4 rounded-xl"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveFilter("All");
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Notification details */}
            <aside className="hidden min-w-0 lg:block">
              {selectedNotification ? (
                <div className="sticky top-0 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex size-12 items-center justify-center rounded-2xl ${iconStyles(
                        selectedNotification.icon,
                      )}`}
                    >
                      <NotificationIcon
                        type={selectedNotification.icon}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete selected notification"
                      onClick={() =>
                        deleteNotification(selectedNotification.id)
                      }
                      className="text-muted-foreground hover:text-red-600"
                    >
                      <PiTrash className="size-4" />
                    </Button>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Badge
                      className={categoryStyles(
                        selectedNotification.category,
                      )}
                    >
                      {selectedNotification.category}
                    </Badge>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <PiClock className="size-3.5" />
                      {selectedNotification.time}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-semibold leading-7">
                    {selectedNotification.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {selectedNotification.description}
                  </p>

                  <Separator className="my-6" />

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <PiCalendarBlank className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Notification type
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedNotification.category} notification
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <PiBell className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Read status</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedNotification.unread
                            ? "Unread — needs your attention"
                            : "Read"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedNotification.actionLabel &&
                    selectedNotification.actionHref && (
                      <Button
                       
                        className="mt-7 h-10 w-full rounded-xl cursor-pointer"
                      >
                        <Link href={selectedNotification.actionHref}>
                          {selectedNotification.actionLabel}
                        </Link>
                      </Button>
                    )}

                  <Button
                    variant="outline"
                    className="mt-3 h-10 w-full rounded-xl cursor-pointer"
                    onClick={() =>
                      toggleRead(selectedNotification.id)
                    }
                  >
                    {selectedNotification.unread ? (
                      <>
                        <PiCheck className="size-4" />
                        Mark as read
                      </>
                    ) : (
                      <>
                        <PiEnvelopeSimple className="size-4" />
                        Mark as unread
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex min-h-[500px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <PiBell className="size-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">
                    Select a notification
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                    Choose a notification from your inbox to see its details
                    and available actions.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* Bottom note */}
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4 sm:p-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PiSparkle className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Your reminders, in one place</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              This inbox currently uses sample data. Connect it to your
              notification database to display real reminder events, WhatsApp
              delivery results, and system alerts.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
