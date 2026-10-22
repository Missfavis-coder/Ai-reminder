
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/server/db";
import { users } from "@/lib/server/db/schema";
import { createSession } from "@/lib/server/auth/session";
import { eq } from "drizzle-orm";



const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "code" in error && error.code === "23505";
}

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

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please provide a valid email and a password of at least 12 characters.",
      },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await hash(parsed.data.password, 12);

  try {
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const [user] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email,
        passwordHash,
      })
      .returning({
        id: users.id,
        email: users.email,
      });

    if (!user) {
      throw new Error("User creation returned no record.");
    }

    await createSession(user.id);

    return NextResponse.json(
      {
        message: "Account created successfully.",
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    console.error("Registration failed.");

    return NextResponse.json(
      { error: "Unable to create your account right now." },
      { status: 500 },
    );
  }
}
