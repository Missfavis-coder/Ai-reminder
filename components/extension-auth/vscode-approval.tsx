
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApproveExtensionAuth } from "@/lib/hooks/use-extension-auth";

interface VSCodeApprovalProps {
  requestId: string;
}

export function VSCodeApproval({ requestId }: VSCodeApprovalProps) {
  const approval = useApproveExtensionAuth();
  const router = useRouter();

  const handleApprove = () => {
    approval.mutate({ requestId });
  };

  useEffect(() => {
    if (!approval.isSuccess) return;

    const timeout = window.setTimeout(() => {
      router.replace("/integrations");
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [approval.isSuccess, router]);

  const errorMessage =
    approval.error instanceof Error
      ? approval.error.message
      : "Something went wrong. Please try again.";

  if (approval.isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-2xl bg-neutral-100 p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-8 w-8"
              aria-hidden="true"
            >
              <path
                d="m5 12 4 4L19 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold">
            VS Code authorized
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your Taskier account has successfully authorized this VS Code
            connection. VS Code will finish connecting automatically.
          </p>

          <p className="mt-6 text-xs text-muted-foreground">
            Redirecting you to Integrations...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-neutral-100 p-8 shadow-xl">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <path
                d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <p className="text-sm font-medium text-primary">Taskier</p>
            <p className="text-xs text-muted-foreground">
              VS Code integration
            </p>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          Connect VS Code
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          VS Code is requesting permission to connect to your Taskier
          account.
        </p>

        <div className="mt-7 rounded-xl border border-border bg-background/60 p-5">
          <h2 className="text-sm font-semibold">
            Permissions requested
          </h2>

          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="text-primary">✓</span>
              Register your VS Code workspace.
            </li>
            <li className="flex gap-3">
              <span className="text-primary">✓</span>
              Record development activity and work sessions.
            </li>
            <li className="flex gap-3">
              <span className="text-primary">✓</span>
              Send activity data to your Taskier dashboard.
            </li>
          </ul>
        </div>

        {approval.isError && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500"
          >
            <p>{errorMessage}</p>

            {errorMessage.toLowerCase().includes("unauthorized") && (
              <Link
                href="/login"
                className="mt-2 inline-block font-medium underline"
              >
                Sign in to Taskier
              </Link>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleApprove}
          disabled={approval.isPending || !requestId}
          className="mt-7 flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {approval.isPending ? "Authorizing..." : "Authorize connection"}
        </button>

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Only approve this request if you initiated the connection
          from your own VS Code installation.
        </p>
      </div>
    </main>
  );
}
