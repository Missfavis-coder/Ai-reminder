import Link from "next/link";

import { USER_MENU } from "@/lib/constants/user-menu";
import { connection } from "next/server";
import { getCurrentUserId } from "@/lib/server/auth/session";
import { db } from "@/lib/server/db";
import { users } from "@/lib/server/db/schema";
import { eq } from "drizzle-orm";

import { UserMenu } from "./user-menu";

export async function Header() {
  const headerUser = await loadHeaderUser();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-30 flex justify-center px-3 sm:px-4">
      <div className="pointer-events-auto relative flex w-full max-w-4xl items-center justify-between gap-2 rounded-full border border-primary/8 bg-background/60 py-2.5 pl-5 pr-2.5 shadow-3xl backdrop-blur-xl sm:pl-6">
        <div>Taskier</div>

        <nav
          aria-label="Primary"
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:inline-flex"
        >
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/tasks"
            className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            Tasks
          </Link>
          <Link
            href="/settings"
            className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            Settings
          </Link>
        </nav>

        <div className="flex items-center gap-1.5">
          {headerUser ? (
            <UserMenu user={headerUser} />
          ) : (
            <a
              href={USER_MENU.signInHref}
              className="inline-flex h-9 items-center rounded-full bg-linear-to-b from-(--primary-glow) via-primary to-(--primary-deep) px-3.5 text-xs font-medium text-primary-foreground transition-all hover:brightness-110 sm:text-sm"
            >
              Sign in
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export async function loadHeaderUser() {
  await connection();
  try {
    const userId = await getCurrentUserId();

    if (!userId) return null;

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      displayName: user.name?.trim() || user.email,
      avatarUrl: null,
      hasBilling: false,
    };
  } catch (error) {
    console.error("Failed to load header user:", error);
    return null;
  }
}