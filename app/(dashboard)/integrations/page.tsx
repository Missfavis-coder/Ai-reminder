
"use client";

import { useMemo, useState } from "react";
import {
  PiArrowUpRight,
  PiBellRinging,
  PiCheckCircle,
  PiCode,
  PiInfo,
  PiMagnifyingGlass,
  PiPlus,
  PiShieldCheck,
  PiSpinnerGap,
  PiWhatsappLogo,
  PiGlobe,
  PiEnvelopeSimple,
  PiInstagramLogo,
  PiPhoneCall,
  PiArrowLeft,
} from "react-icons/pi";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  useNotificationChannels,
  useUpdateNotificationChannel,
  useRequestWhatsAppVerification,
  useVerifyWhatsApp,
} from "@/lib/hooks/use-notification-channels";
import {
  useCreateWorkspace,
  useWorkspaces,
} from "@/lib/hooks/use-workspace";

const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^\+[1-9]\d{7,14}$/,
    "Enter a valid international number, e.g. +2348012345678.",
  );

const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the six-digit verification code.");

const workspaceSchema = z.object({
  provider: z.enum(["browser", "vscode"]),
  name: z.string().trim().min(1, "Enter a workspace name.").max(200),
});

type Provider = "browser" | "vscode";
type WhatsAppStep = "details" | "verification";

const channelOptions = [
  {
    type: "whatsapp" as const,
    name: "WhatsApp",
    description: "Receive reminders on your WhatsApp number.",
    icon: PiWhatsappLogo,
    color: "#16803d",
    background: "#e9f8ee",
    available: true,
  },
  {
    type: "email" as const,
    name: "Email",
    description: "Receive reminders in your inbox.",
    icon: PiEnvelopeSimple,
    color: "#55574d",
    background: "#f0f0eb",
    available: false,
  },
  {
    type: "web_push" as const,
    name: "Web push",
    description: "Receive browser notifications.",
    icon: PiGlobe,
    color: "#2563eb",
    background: "#eaf2ff",
    available: false,
  },
  {
    type: "instagram" as const,
    name: "Instagram",
    description: "Receive supported reminders through Instagram.",
    icon: PiInstagramLogo,
    color: "#c13584",
    background: "#fceaf4",
    available: false,
  },
];

export default function IntegrationsPage() {
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<Provider>("vscode");
  const [workspaceName, setWorkspaceName] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [showWhatsAppForm, setShowWhatsAppForm] = useState(false);
  const [whatsAppStep, setWhatsAppStep] =
    useState<WhatsAppStep>("details");

  const channelsQuery = useNotificationChannels();
  const workspacesQuery = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const updateChannel = useUpdateNotificationChannel();
  const requestVerification = useRequestWhatsAppVerification();
  const verifyWhatsApp = useVerifyWhatsApp();

  const channels = channelsQuery.data ?? [];
  const workspaces = workspacesQuery.data ?? [];

  const filteredChannels = useMemo(() => {
    const query = search.trim().toLowerCase();

    return channelOptions.filter(
      (channel) =>
        channel.name.toLowerCase().includes(query) ||
        channel.description.toLowerCase().includes(query),
    );
  }, [search]);

  const enabledChannels = channels.filter(
    (channel) =>
      channel.enabled &&
      channel.verifiedAt &&
      channel.consentGrantedAt,
  );

  async function handleConnectWorkspace(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const parsed = workspaceSchema.safeParse({
      provider,
      name: workspaceName,
    });

    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Invalid workspace.",
      );
      return;
    }

    try {
      await createWorkspace.mutateAsync(parsed.data);
      toast.success("Workspace registered successfully.");
      setWorkspaceName("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not register workspace.",
      );
    }
  }

  function openWhatsAppForm(destination = "") {
    setPhoneNumber(destination);
    setVerificationCode("");
    setConsent(false);
    setWhatsAppStep("details");
    setShowWhatsAppForm(true);
  }

  function closeWhatsAppForm() {
    setShowWhatsAppForm(false);
    setVerificationCode("");
    setWhatsAppStep("details");
  }

  async function handleRequestVerification(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const parsedPhone = phoneSchema.safeParse(phoneNumber);

    if (!parsedPhone.success) {
      toast.error(
        parsedPhone.error.issues[0]?.message ??
          "Enter a valid phone number.",
      );
      return;
    }

    if (!consent) {
      toast.error("Please consent to receive WhatsApp reminders.");
      return;
    }

    try {
      const result = await requestVerification.mutateAsync({
        phoneNumber: parsedPhone.data,
        consent: true,
      });

      setPhoneNumber(parsedPhone.data);
      setVerificationCode("");
      setWhatsAppStep("verification");
      toast.success(result.message || "Verification code sent.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not send the verification code.",
      );
    }
  }

  async function handleVerifyWhatsApp(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const parsedPhone = phoneSchema.safeParse(phoneNumber);
    const parsedCode = codeSchema.safeParse(verificationCode);

    if (!parsedPhone.success) {
      toast.error("Enter a valid international phone number.");
      setWhatsAppStep("details");
      return;
    }

    if (!parsedCode.success) {
      toast.error(
        parsedCode.error.issues[0]?.message ??
          "Enter the six-digit verification code.",
      );
      return;
    }

    try {
      const result = await verifyWhatsApp.mutateAsync({
        phoneNumber: parsedPhone.data,
        code: parsedCode.data,
      });

      toast.success(result.message || "WhatsApp number verified.");
      closeWhatsAppForm();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not verify the WhatsApp number.",
      );
    }
  }

  async function handleToggleChannel(
    id: string,
    enabled: boolean,
  ) {
    try {
      await updateChannel.mutateAsync({ id, enabled });

      toast.success(
        enabled
          ? "Notification channel enabled."
          : "Notification channel disabled.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update notification channel.",
      );
    }
  }

  const busy =
    updateChannel.isPending ||
    createWorkspace.isPending ||
    requestVerification.isPending ||
    verifyWhatsApp.isPending;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Integrations
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Connect the workspaces AI Reminder should monitor, then choose
              where you want your reminders delivered.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-primary px-3 py-2.5 text-white">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white/15">
              <PiBellRinging className="size-5" />
            </span>
            <div>
              <p className="text-xs font-medium">
                Ready notification channels
              </p>
              <p className="text-[11px]">
                {enabledChannels.length} enabled and verified
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-secondary/40 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <PiShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="text-sm font-semibold">
                How AI Reminder works
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Connect a workspace so activity can be recorded. Configure
                reminder rules for the activity or tasks you care about, then
                select the notification channels you want those reminders sent
                to. Connecting a workspace or channel does not automatically
                create a reminder rule.
              </p>
            </div>
          </div>
        </section>

        {/* Workspace monitoring */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">
              Workspaces to monitor
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Register the browser or VS Code workspace where your activity
              happens.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-border p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                  <PiCode className="size-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">
                    Register a workspace
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Add a workspace to your monitoring list.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleConnectWorkspace}
                className="mt-5 space-y-4"
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="workspace-provider"
                    className="text-xs font-medium"
                  >
                    Workspace provider
                  </label>
                  <select
                    id="workspace-provider"
                    value={provider}
                    onChange={(event) =>
                      setProvider(event.target.value as Provider)
                    }
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  >
                    <option value="vscode">Visual Studio Code</option>
                    <option value="browser">Browser</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="workspace-name"
                    className="text-xs font-medium"
                  >
                    Workspace name
                  </label>
                  <input
                    id="workspace-name"
                    value={workspaceName}
                    onChange={(event) =>
                      setWorkspaceName(event.target.value)
                    }
                    placeholder={
                      provider === "vscode"
                        ? "e.g. AI Reminder project"
                        : "e.g. Research workspace"
                    }
                    maxLength={200}
                    required
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-xs leading-5 text-muted-foreground">
                    Registering a workspace records it in your account.
                    Actual monitoring still depends on the workspace agent or
                    client sending activity events to AI Reminder.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full gap-2"
                >
                  {createWorkspace.isPending ? (
                    <PiSpinnerGap className="size-4 animate-spin" />
                  ) : (
                    <PiPlus className="size-4" />
                  )}
                  Register workspace
                </Button>
              </form>
            </div>

            <div className="rounded-xl border border-border p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    Your workspaces
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Workspaces registered to your account.
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                  {workspaces.length}
                </span>
              </div>

              {workspacesQuery.isPending ? (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <PiSpinnerGap className="size-4 animate-spin" />
                  Loading workspaces...
                </div>
              ) : workspacesQuery.isError ? (
                <div className="py-8">
                  <p className="text-sm text-destructive">
                    Could not load workspaces.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void workspacesQuery.refetch()}
                  >
                    Try again
                  </Button>
                </div>
              ) : workspaces.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-border p-6 text-center">
                  <PiPhoneCall className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">
                    No workspaces registered
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Add a browser or VS Code workspace to get started.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          {workspace.provider === "vscode" ? (
                            <PiCode className="size-4" />
                          ) : (
                            <PiGlobe className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {workspace.name}
                          </p>
                          <p className="mt-1 text-xs capitalize text-muted-foreground">
                            {workspace.provider === "vscode"
                              ? "Visual Studio Code"
                              : "Browser"}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[10px] capitalize">
                        {workspace.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Notification channels */}
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-base font-semibold">
                Notification channels
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect a destination for reminders, then enable the channels
                you want to use.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <PiMagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search channels..."
                aria-label="Search notification channels"
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>

          {channelsQuery.isError && (
            <div className="rounded-lg border border-destructive/30 p-3 text-sm">
              <p className="text-destructive">
                Could not load your notification channels.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => void channelsQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          )}

          {channelsQuery.isPending ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <PiSpinnerGap className="size-4 animate-spin" />
              Loading notification channels...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredChannels.map((option) => {
                const Icon = option.icon;
                const savedChannel = channels.find(
                  (channel) => channel.type === option.type,
                );

                const verified = Boolean(
                  savedChannel?.verifiedAt &&
                    savedChannel?.consentGrantedAt,
                );

                const isEnabled = Boolean(savedChannel?.enabled);

                return (
                  <article
                    key={option.type}
                    className="flex flex-col rounded-xl border border-border p-4 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="flex size-11 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: option.background,
                          color: option.color,
                        }}
                      >
                        <Icon className="size-6" />
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] ${
                          !option.available
                            ? "bg-muted text-muted-foreground"
                            : verified && isEnabled
                              ? "bg-primary/10 text-primary"
                              : savedChannel
                                ? "bg-secondary text-foreground"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {!option.available
                          ? "Coming soon"
                          : verified && isEnabled
                            ? "Enabled"
                            : savedChannel
                              ? verified
                                ? "Disabled"
                                : "Verification needed"
                              : "Not connected"}
                      </span>
                    </div>

                    <div className="mt-4 flex-1">
                      <h3 className="text-sm font-semibold">
                        {option.name}
                      </h3>
                      <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
                        {option.description}
                      </p>

                      {savedChannel && (
                        <p className="mt-2 break-all text-xs text-muted-foreground">
                          {savedChannel.destination}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                      <span className="text-[11px] text-muted-foreground">
                        {option.available
                          ? verified
                            ? "Ready for configuration"
                            : "Setup required"
                          : "Integration not implemented"}
                      </span>

                      {option.available && option.type === "whatsapp" ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          {savedChannel && verified && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void handleToggleChannel(
                                  savedChannel.id,
                                  !savedChannel.enabled,
                                )
                              }
                            >
                              {savedChannel.enabled ? "Disable" : "Enable"}
                            </Button>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              openWhatsAppForm(
                                savedChannel?.destination ?? "",
                              )
                            }
                          >
                            {savedChannel ? "Verify / edit number" : "Connect"}
                            <PiArrowUpRight className="ml-1 size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled
                        >
                          Coming soon
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}

              {filteredChannels.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No channels match your search.
                </div>
              )}
            </div>
          )}
        </section>

        {/* WhatsApp verification dialog */}
        {showWhatsAppForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-[2px]">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="whatsapp-dialog-title"
              className="my-auto w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl sm:p-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#e9f8ee] text-[#16803d]">
                  <PiWhatsappLogo className="size-6" />
                </span>
                <div>
                  <h2
                    id="whatsapp-dialog-title"
                    className="text-base font-semibold"
                  >
                    Connect WhatsApp
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {whatsAppStep === "details"
                      ? "Enter your number to receive a verification code."
                      : "Enter the six-digit code sent to your WhatsApp."}
                  </p>
                </div>
              </div>

              {whatsAppStep === "details" ? (
                <form
                  onSubmit={handleRequestVerification}
                  className="mt-5 space-y-4"
                >
                  <div className="space-y-1.5">
                    <label
                      htmlFor="whatsapp-number"
                      className="text-xs font-medium"
                    >
                      WhatsApp phone number
                    </label>
                    <input
                      id="whatsapp-number"
                      type="tel"
                      autoComplete="tel"
                      required
                      value={phoneNumber}
                      onChange={(event) =>
                        setPhoneNumber(event.target.value)
                      }
                      placeholder="+2348012345678"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                    <p className="text-[11px] leading-5 text-muted-foreground">
                      Use international format, including + and your country
                      code.
                    </p>
                  </div>

                  <label className="flex items-start gap-2 text-xs leading-5">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) =>
                        setConsent(event.target.checked)
                      }
                      className="mt-0.5"
                    />
                    <span>
                      I consent to receive AI Reminder notifications on this
                      WhatsApp number.
                    </span>
                  </label>

                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <div className="flex items-start gap-2">
                      <PiInfo className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <p className="text-xs leading-5 text-muted-foreground">
                        We'll send a verification code. Your number will only
                        be marked verified after the correct code is entered.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={requestVerification.isPending}
                      onClick={closeWhatsAppForm}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={requestVerification.isPending}
                      className="gap-2"
                    >
                      {requestVerification.isPending ? (
                        <PiSpinnerGap className="size-4 animate-spin" />
                      ) : (
                        <PiArrowUpRight className="size-4" />
                      )}
                      Send verification code
                    </Button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={handleVerifyWhatsApp}
                  className="mt-5 space-y-4"
                >
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">
                      Code sent to
                    </p>
                    <p className="mt-1 break-all text-sm font-medium">
                      +{phoneNumber.replace(/^\+/, "")}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="whatsapp-code"
                      className="text-xs font-medium"
                    >
                      Six-digit verification code
                    </label>
                    <input
                      id="whatsapp-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required
                      value={verificationCode}
                      onChange={(event) =>
                        setVerificationCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      placeholder="123456"
                      className="h-11 w-full rounded-lg border border-input bg-background px-3 text-center text-lg tracking-[0.4em] outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                    />
                    <p className="text-[11px] leading-5 text-muted-foreground">
                      The code expires after 10 minutes.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={verifyWhatsApp.isPending}
                      onClick={() => {
                        setWhatsAppStep("details");
                        setVerificationCode("");
                      }}
                    >
                      <PiArrowLeft className="mr-1 size-4" />
                      Back
                    </Button>

                    <Button
                      type="submit"
                      disabled={
                        verifyWhatsApp.isPending ||
                        verificationCode.length !== 6
                      }
                      className="gap-2"
                    >
                      {verifyWhatsApp.isPending ? (
                        <PiSpinnerGap className="size-4 animate-spin" />
                      ) : (
                        <PiCheckCircle className="size-4" />
                      )}
                      Verify number
                    </Button>
                  </div>

                  <button
                    type="button"
                    className="w-full text-center text-xs text-primary underline underline-offset-4 disabled:opacity-50"
                    disabled={
                      requestVerification.isPending ||
                      verifyWhatsApp.isPending
                    }
                    onClick={() => {
                      setWhatsAppStep("details");
                      setVerificationCode("");
                    }}
                  >
                    Use a different number or request a new code
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
