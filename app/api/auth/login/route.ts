
import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/server/db";
import { users } from "@/lib/server/db/schema";
import { createSession } from "@/lib/server/auth/session";



const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 },
    );
  }

  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide a valid email and password." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const passwordMatches = await compare(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch {
    console.error("Login failed.");

    return NextResponse.json(
      { error: "Unable to log in right now." },
      { status: 500 },
    );
  }
}
