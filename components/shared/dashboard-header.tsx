
import { UserMenu } from "./user-menu";
import { loadHeaderUser } from "./header";
import { SiteTitle } from "../dashboard/dashboard-title";
import { USER_MENU } from "@/lib/constants/user-menu";

export async function SiteHeader() {

  const headerUser = await loadHeaderUser();


  return (
    <header className="sticky top-0 z-50 flex md:pt-2 pt-2 items-center px-4 lg:px-6 pb-3 bg-background border-b border-border ">
      <div className="flex w-full items-center justify-between">

        <SiteTitle/>

        {/* RIGHT */}
        <div className="flex items-center md:gap-4 gap-2">

        <div className="flex items-center gap-1.5 bg-background">
          {headerUser ? (
            <UserMenu user={headerUser} />
          ) : (
            <a
              href={USER_MENU.signInHref}
              className=" h-9 items-center rounded-full bg-primary text-nowrap px-3.5 sm:text-sm text-[13px] font-medium text-primary-foreground transition-all hover:brightness-110 inline-flex"
            >
              Sign in
            </a>
          )}
          
        </div>

        </div>
      </div>
    </header>
  );
}