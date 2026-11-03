
import { VSCodeApproval } from "@/components/extension-auth/vscode-approval";

interface PageProps {
  searchParams: Promise<{
    request?: string;
  }>;
}

export default async function ConnectVSCodePage({
  searchParams,
}: PageProps) {
  const { request } = await searchParams;

  if (!request) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">
            Invalid connection request
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This authorization link is missing its request ID.
            Return to VS Code and try connecting again.
          </p>
        </div>
      </main>
    );
  }

  return <VSCodeApproval requestId={request} />;
}
