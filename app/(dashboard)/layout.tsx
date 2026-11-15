
import { Suspense, type PropsWithChildren } from "react";
import { redirect } from "next/navigation";

import { getCurrentUserId } from "@/lib/server/auth/session";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { SiteHeader } from "@/components/shared/dashboard-header";

async function ProtectedContent({ children }: PropsWithChildren) {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="sidebar" />

      <SidebarInset className="flex flex-col overflow-hidden">
        <Suspense
          fallback={<div className="h-14 border-b border-border" />}
        >
          <SiteHeader />
        </Suspense>

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-background" />}
    >
      <ProtectedContent>{children}</ProtectedContent>
    </Suspense>
  );
}
