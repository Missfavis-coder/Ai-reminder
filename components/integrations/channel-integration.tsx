
"use client";

import { useMemo, useState } from "react";
import {
  PiArrowLeft,
  PiArrowUpRight,
  PiBellRinging,
  PiCheckCircle,
  PiEnvelopeSimple,
  PiGlobe,
  PiInfo,
  PiInstagramLogo,
  PiMagnifyingGlass,
  PiPhoneCall,
  PiSpinnerGap,
  PiWhatsappLogo,
} from "react-icons/pi";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { NotificationChannelsSkeleton } from "@/components/integrations/integrations-skeleton";

import {
  useNotificationChannels,
  useUpdateNotificationChannel,
  useRequestWhatsAppVerification,
  useVerifyWhatsApp,
} from "@/lib/hooks/use-notification-channels";

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

export default function ChannelIntegration() {
  const [search, setSearch] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [showWhatsAppForm, setShowWhatsAppForm] = useState(false);
  const [whatsAppStep, setWhatsAppStep] =
    useState<WhatsAppStep>("details");

  const channelsQuery = useNotificationChannels();
  const updateChannel = useUpdateNotificationChannel();
  const requestVerification = useRequestWhatsAppVerification();
  const verifyWhatsApp = useVerifyWhatsApp();

  const channels = channelsQuery.data ?? [];

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

  async function handleToggleChannel(id: string, enabled: boolean) {
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
    requestVerification.isPending ||
    verifyWhatsApp.isPending;

  return (
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
        <NotificationChannelsSkeleton />
      ) : channelsQuery.isError ? null : (
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
                          {updateChannel.isPending && (
                            <PiSpinnerGap className="mr-1.5 size-3.5 animate-spin" />
                          )}
                          {savedChannel.enabled ? "Disable" : "Enable"}
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          openWhatsAppForm(
                            savedChannel?.destination ?? "",
                          )
                        }
                      >
                        {savedChannel
                          ? "Verify / edit number"
                          : "Connect"}
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
                    Use international format, including + and your
                    country code.
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
                    I consent to receive AI Reminder notifications on
                    this WhatsApp number.
                  </span>
                </label>

                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex items-start gap-2">
                    <PiInfo className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <p className="text-xs leading-5 text-muted-foreground">
                      We'll send a verification code. Your number will
                      only be marked verified after the correct code is
                      entered.
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
                    {requestVerification.isPending
                      ? "Sending code..."
                      : "Send verification code"}
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
                    {phoneNumber}
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
                    {verifyWhatsApp.isPending
                      ? "Verifying..."
                      : "Verify number"}
                  </Button>
                </div>

                <button
                  type="button"
                  className="w-full text-center text-xs text-primary underline underline-offset-4 disabled:opacity-50"
                  disabled={busy}
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
    </section>
  );
}
