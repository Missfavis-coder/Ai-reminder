
import { UserMenu } from "./user-menu";
import { SiteTitle } from "../dashboard/dashboard-title";
import { USER_MENU } from "@/lib/constants/user-menu";

export async function SiteHeader() {

  

  return (
    <header className="sticky top-0 z-50 flex md:pt-5 pt-5 items-center px-4 lg:px-6 pb-5 bg-white border-b border-border ">
      <div className="flex w-full items-center justify-between">

        <SiteTitle/>

        {/* RIGHT */}
        <div className="flex items-center md:gap-4 gap-2">


        </div>
      </div>
    </header>
  );
}