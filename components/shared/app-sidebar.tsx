"use client";

import * as React from "react";
import {
  PiChartBar,
  PiCreditCardBold,
  PiEnvelopeBold,
  PiEnvelopeSimple,
  PiFigmaLogo,
  PiFile,
  PiFlag,
  PiFolderOpenBold,
  PiHouse,
  PiHouseBold,
  PiImagesBold,
  PiListChecks,
  PiNoteBlank,
  PiNotebook,
  PiNoteFill,
  PiPaletteBold,
  PiPlugsConnectedBold,
  PiPlus,
  PiPlusCircleBold,
  PiShareBold,
  PiSparkleBold,
  PiUserBold,
  PiXBold,
} from "react-icons/pi";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../ui/sidebar";

import { Button } from "../ui/button";
import { NavMain } from "./nav-mains";
import NavSettings from "./nav-footer";


const navMain = [
  {
    group: "GENERAL",
    items: [
      {
        title: "Home",
        url: "/dashboard",
        icon: PiHouse,
      },
      {
        title: "My Tasks",
        url: "/tasks",
        icon: PiNotebook,
      },
      {
        title: "Inbox",
        url: "/inbox",
        icon: PiEnvelopeSimple,
      },
      {
        title: "Integration",
        url: "/integrations",
        icon: PiChartBar,
      },
      {
        title: "Goals",
        url: "/goals",
        icon: PiFlag,
      },

    ],
  },
  {
    group: "My workspace",
    items: [
      


    ],
  },


];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  return (
    <Sidebar
      className="  fixed bg-background "
      collapsible="icon"
      {...props}
    >

      <SidebarHeader className="relative z-10 pt-4 pb-6 px-3">
        <div className="flex items-center justify-between">
          <SidebarMenu className="flex-1">
            <SidebarMenuItem className="flex items-center justify-center">
              <SidebarMenuButton
                className=" pm-3  gap-2"
              >
                <a href="/" className="cursor-pointer text-xl font-bold">
                  Taskier
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
              onClick={() => setOpenMobile(false)}
            >
              <PiXBold className="h-5 w-5" />
              <span className="sr-only">Close sidebar</span>
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="relative z-10 px-3">
        <div className="w-full mb-4">
          <Button
          variant="default"
          size={"icon-lg"}
          className="w-full flex justify-between items-center py-6 px-4 cursor-pointer text-sm border-none"
          >
            Create
            <PiPlus size={20}/>
          </Button>
        </div>
        <NavMain items={navMain} />
      </SidebarContent>
      
     {/**<SidebarFooter className="relative z-10 p-4">
        <NavSettings />
      </SidebarFooter> */} 
    </Sidebar>
  );
}
