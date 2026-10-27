
"use client";

import { useMemo, useState } from "react";
import {
  PiBellRinging,
  PiCheckCircle,
  PiChatCircleDots,
  PiCheck,
  PiEnvelopeSimple,
  PiGlobe,
  PiInstagramLogo,
  PiMagnifyingGlass,
  PiPlugsConnected,
  PiPlus,
  PiShieldCheck,
  PiSlackLogo,
  PiTelegramLogo,
  PiWhatsappLogo,
  PiX,
  PiArrowUpRight,
  PiInfo,
  PiSpinnerGap,
} from "react-icons/pi";

import { Button } from "@/components/ui/button";

type IntegrationCategory = "Messaging" | "Email" | "Productivity";

type Integration = {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: typeof PiWhatsappLogo;
  iconColor: string;
  iconBackground: string;
  available: boolean;
  connected: boolean;
  details?: string;
};

const initialIntegrations: Integration[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    description:
      "Receive reminders and important updates directly on WhatsApp.",
    category: "Messaging",
    icon: PiWhatsappLogo,
    iconColor: "#16803d",
    iconBackground: "#e9f8ee",
    available: true,
    connected: false,
    details: "Connect using the WhatsApp Business Cloud API.",
  },
  {
    id: "instagram",
    name: "Instagram",
    description:
      "Explore Instagram messaging integration for supported notifications.",
    category: "Messaging",
    icon: PiInstagramLogo,
    iconColor: "#c13584",
    iconBackground: "#fceaf4",
    available: false,
    connected: false,
    details: "Requires an eligible Instagram professional account and API setup.",
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Get personal reminders through a Telegram bot.",
    category: "Messaging",
    icon: PiTelegramLogo,
    iconColor: "#168ac4",
    iconBackground: "#e8f5fc",
    available: false,
    connected: false,
    details: "Telegram bot integration needs to be implemented.",
  },
  {
    id: "email",
    name: "Email",
    description: "Receive reminders and notifications in your inbox.",
    category: "Email",
    icon: PiEnvelopeSimple,
    iconColor: "#55574d",
    iconBackground: "#f0f0eb",
    available: false,
    connected: false,
    details: "Requires an email delivery provider and verified recipient.",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Bring your reminders into your team's Slack workspace.",
    category: "Productivity",
    icon: PiSlackLogo,
    iconColor: "#611f69",
    iconBackground: "#f5eafa",
    available: false,
    connected: false,
    details: "Slack OAuth and message delivery need to be implemented.",
  },
];

const categories = [
  "All integrations",
  "Messaging",
  "Email",
  "Productivity",
] as const;

type CategoryFilter = (typeof categories)[number];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] =
    useState<Integration[]>(initialIntegrations);
  const [search, setSearch] = useState("");
  const [category, setCategory] =
    useState<CategoryFilter>("All integrations");
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const connectedCount = integrations.filter(
    (integration) => integration.connected
  ).length;

  const filteredIntegrations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return integrations.filter((integration) => {
      const matchesSearch =
        integration.name.toLowerCase().includes(query) ||
        integration.description.toLowerCase().includes(query);

      const matchesCategory =
        category === "All integrations" ||
        integration.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [integrations, search, category]);

  function openIntegration(integration: Integration) {
    setNotice("");

    if (!integration.available) {
      setNotice(
        `${integration.name} is not available yet. Its delivery integration must be implemented before you can connect it.`
      );
      return;
    }

    if (integration.connected) {
      setIntegrations((current) =>
        current.map((item) =>
          item.id === integration.id
            ? { ...item, connected: false }
            : item
        )
      );

      setNotice(`${integration.name} disconnected in this demo.`);
      return;
    }

    setPhoneNumber("");
    setSelectedIntegration(integration);
  }

  function connectWhatsApp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!phoneNumber.trim()) return;

    setSaving(true);

    // Demo only: this does not verify the number or connect WhatsApp.
    // Replace with your authenticated server API integration.
    window.setTimeout(() => {
      setIntegrations((current) =>
        current.map((item) =>
          item.id === "whatsapp"
            ? { ...item, connected: true }
            : item
        )
      );

      setSaving(false);
      setSelectedIntegration(null);
      setNotice(
        "Demo connection saved locally. Connect your WhatsApp API before sending real reminders."
      );
    }, 400);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-7">
        {/* Heading */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            

            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Integrations
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Connect your favorite channels to receive reminders wherever
              you work.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-lg border border-border bg-primary text-white px-3 py-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
              <PiBellRinging className="size-4" />
            </span>

            <div>
              <p className="text-xs font-medium">Notification channels</p>
              <p className="text-[11px] text-white">
                {connectedCount} of {integrations.length} connected
              </p>
            </div>
          </div>
        </section>

        {/* Status banner */}
        <section className="flex flex-col justify-between gap-4 rounded-xl bg-secondary/60 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
              <PiShieldCheck className="size-5 text-primary" />
            </div>

            <div>
              <h2 className="text-sm font-semibold">
                Your reminders, your channels
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                Connect a supported channel to choose where your AI reminders
                are delivered. You stay in control of your notification
                preferences.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground">
            <PiCheckCircle className="size-3.5 text-primary" />
            Channel controls
          </span>
        </section>

        {/* Feedback */}
        {notice && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/50 p-3 text-xs leading-5"
          >
            <p>{notice}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
              className="shrink-0 rounded p-1 hover:bg-muted"
            >
              <PiX className="size-3.5" />
            </button>
          </div>
        )}

        {/* Stats
        
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              Available integrations
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {integrations.filter((item) => item.available).length}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Ready for connection setup
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              Connected channels
            </p>
            <p className="mt-2 text-2xl font-semibold">{connectedCount}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Enabled in this interface
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Coming soon</p>
            <p className="mt-2 text-2xl font-semibold">
              {integrations.filter((item) => !item.available).length}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Integrations awaiting implementation
            </p>
          </div>
        </section>
 */}
        {/* Integrations list */}
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-[15px] font-semibold">
                Your integrations
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage how AI Reminder reaches you.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <PiMagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search integrations..."
                aria-label="Search integrations"
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-lg border px-3 py-2 text-xs transition cursor-pointer ${
                  category === item
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredIntegrations.map((integration) => {
              const Icon = integration.icon;

              return (
                <article
                  key={integration.id}
                  className="flex min-w-0 flex-col rounded-xl  bg-neutral-100 p-4 transition hover:border-primary/40 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: integration.iconBackground,
                        color: integration.iconColor,
                      }}
                    >
                      <Icon className="size-6" />
                    </div>

                    {integration.connected ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
                        <span className="size-1.5 rounded-full bg-primary" />
                        Connected
                      </span>
                    ) : integration.available ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[10px] text-foreground">
                        Available
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">
                        Coming soon
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex-1">
                    <h3 className="text-sm font-semibold">
                      {integration.name}
                    </h3>
                    <p className="mt-1.5 min-h-10 text-sm leading-5 text-muted-foreground">
                      {integration.description}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-neural-100 pt-4">
                    <span className="text-[11px] text-muted-foreground">
                      {integration.category}
                    </span>

                    <Button
                      type="button"
                      size="sm"
                      variant={integration.connected ? "outline" : "default"}
                      disabled={!integration.available}
                      onClick={() => openIntegration(integration)}
                      className="gap-1.5 cursor-pointer"
                    >
                      {integration.connected ? (
                        <>
                          Disconnect
                          <PiX className="size-3.5" />
                        </>
                      ) : integration.available ? (
                        <>
                          Connect
                          <PiPlus className="size-3.5" />
                        </>
                      ) : (
                        "Coming soon"
                      )}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredIntegrations.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <PiMagnifyingGlass className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">
                No integrations found
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different search or category.
              </p>
            </div>
          )}
        </section>

        {/* Help footer */}
        <section className="flex flex-col justify-between gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <PiInfo className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Need help connecting a channel?
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Integrations may require provider credentials and account
                verification before reminders can be delivered.
              </p>
            </div>
          </div>

          <a
            href="/settings"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Notification settings
            <PiArrowUpRight className="size-3.5" />
          </a>
        </section>
      </div>

      {/* WhatsApp connection dialog */}
      {selectedIntegration && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setSelectedIntegration(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-dialog-title"
            className="my-auto w-full max-w-md rounded-2xl border border-border bg-background p-5 text-foreground shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: selectedIntegration.iconBackground,
                    color: selectedIntegration.iconColor,
                  }}
                >
                  <selectedIntegration.icon className="size-6" />
                </div>

                <div>
                  <h2
                    id="connect-dialog-title"
                    className="text-base font-semibold"
                  >
                    Connect {selectedIntegration.name}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Set up your reminder channel.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={saving}
                aria-label="Close dialog"
                onClick={() => setSelectedIntegration(null)}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted"
              >
                <PiX className="size-4" />
              </button>
            </div>

            <div className="my-5 rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-xs leading-5 text-muted-foreground">
                {selectedIntegration.details}
              </p>
            </div>

            <form onSubmit={connectWhatsApp} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="whatsapp-phone"
                  className="text-xs font-medium"
                >
                  WhatsApp phone number
                </label>

                <input
                  id="whatsapp-phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="+2348012345678"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                />

                <p className="text-[11px] leading-5 text-muted-foreground">
                  Enter the number you want to use for reminders, including
                  your country code.
                </p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-medium">Before you continue</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  Real WhatsApp delivery requires a configured WhatsApp
                  Business Cloud API, server-side credentials, and recipient
                  verification or consent as applicable.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setSelectedIntegration(null)}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? (
                    <>
                      <PiSpinnerGap className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue
                      <PiArrowUpRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
