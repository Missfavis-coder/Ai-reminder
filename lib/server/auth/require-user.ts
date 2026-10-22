
import "server-only";

import { getCurrentUserId } from "./session";

export async function requireUser() {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("UNAUTHENTICATED");
  }

  return { id: userId };
}
