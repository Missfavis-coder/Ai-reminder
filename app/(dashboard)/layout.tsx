

import { PropsWithChildren } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { SiteHeader } from "@/components/shared/dashboard-header";


export default function Applayout({ children }: PropsWithChildren) {

  return (

      <SidebarProvider className="">
        <AppSidebar variant="sidebar" />
        <SidebarInset className=" flex flex-col overflow-hidden">
          <SiteHeader/>
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>

  );
}
