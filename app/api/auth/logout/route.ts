
import { NextResponse } from "next/server";

import { destroySession } from
  "@/lib/server/auth/session";


export async function POST() {
  try {
    await destroySession();

    return NextResponse.json({
      message: "Logged out successfully.",
    });
  } catch {
    console.error("Logout failed.");

    return NextResponse.json(
      { error: "Unable to log out right now." },
      { status: 500 },
    );
  }
}
