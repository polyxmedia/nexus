// Reliable helper to get the effective username, accounting for impersonation.
// The next-auth session callback may silently fail to read cookies in some
// getServerSession contexts. This helper checks the impersonation cookie
// directly in the route handler context where cookies() is always available.

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { getImpersonationFromCookie } from "@/lib/auth/impersonation";

export async function getEffectiveUsername(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const sessionName = session?.user?.name ?? null;
  if (!sessionName) return null;

  // Check impersonation cookie directly (works reliably in route handlers)
  try {
    const impData = await getImpersonationFromCookie();
    if (impData) {
      // Session callback may or may not have already applied the override.
      // If sessionName matches the admin OR the target, impersonation is active.
      if (sessionName === impData.adminUsername || sessionName === impData.targetUsername) {
        return impData.targetUsername;
      }
    }
  } catch {
    // Cookie read failed — fall through to session username
  }

  return sessionName;
}
