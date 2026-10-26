"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useSidebar } from "../ui/sidebar";
import { LogOut } from "lucide-react";
import { USER_MENU } from "@/lib/constants/user-menu";
import { PiKeyBold } from "react-icons/pi";


const NavSettings = () => {
  const { state } = useSidebar();

  if (state === "collapsed") {
    return (
      <div className="flex flex-col items-center gap-3 p-2">
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium">
          OA
        </div>
      </div>
    );
  }

  return ( 
    <Card className="w-full p-4 bg-secondary/[0.6] text-white ">

      <div className="space-y-1">
        <h1 className=" text-[13px] text-muted-foreground text-center tracking-wide" >
        Generate an API key to connect your MCP clients and integrations.
        </h1>
      </div>

      <div className=" border-t border-white/10">
        <Button
          variant="ghost"
          className="w-full text-sm font-bold text-center cursor-pointer gap-2 text-white hover:brightness-100 bg-primary rounded-md "
        >
          <Link href={USER_MENU.accountkeysHref} className="flex items-center gap-1.5 whitespace-nowrap ">
            <PiKeyBold className="size-3 text-primary" />
            <span>Api Keys</span>
          </Link>
        </Button>
      </div>
    </Card>
  );
};

export default NavSettings;