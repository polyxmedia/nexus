import NextAuth, { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { getValidatedImpersonation } from "@/lib/auth/impersonation";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed);
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) return null;

        // Rate limit: 10 login attempts per username per 15 minutes
        const rl = await rateLimit(`login:${credentials.username.toLowerCase()}`, 10, 15 * 60 * 1000);
        if (!rl.allowed) return null;

        // Rate limit: 20 login attempts per IP per 15 minutes (prevents credential stuffing across usernames)
        const forwarded = req?.headers?.["x-forwarded-for"];
        const ip = (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : null)
          || req?.headers?.["x-real-ip"]
          || "unknown";
        const ipRl = await rateLimit(`login-ip:${ip}`, 20, 15 * 60 * 1000);
        if (!ipRl.allowed) return null;

        try {
          let users = await db
            .select()
            .from(schema.settings)
            .where(eq(schema.settings.key, `user:${credentials.username}`));

          // If no match by username, try finding by email
          let resolvedUsername = credentials.username;
          if (users.length === 0 && credentials.username.includes("@")) {
            const allUsers = await db
              .select()
              .from(schema.settings)
              .where(like(schema.settings.key, "user:%"));
            for (const row of allUsers) {
              try {
                const data = JSON.parse(row.value);
                if (data.email?.toLowerCase() === credentials.username.toLowerCase()) {
                  users = [row];
                  resolvedUsername = row.key.replace("user:", "");
                  break;
                }
              } catch (err) { console.error("[Auth] user data parse failed:", err); }
            }
          }

          if (users.length === 0) {
            // Auto-create first user if no users exist
            const allUsers = await db
              .select()
              .from(schema.settings)
              .where(like(schema.settings.key, "user:%"));

            if (allUsers.length === 0) {
              const hashed = await hashPassword(credentials.password);
              await db.insert(schema.settings)
                .values({
                  key: `user:${credentials.username}`,
                  value: JSON.stringify({ password: hashed, role: "admin", createdAt: new Date().toISOString(), lastLogin: new Date().toISOString() }),
                });
              return { id: credentials.username, name: credentials.username, email: `${credentials.username}@nexus` };
            }
            return null;
          }

          const userData = JSON.parse(users[0].value);
          if (userData.blocked) return null;

          const valid = await verifyPassword(credentials.password, userData.password);
          if (!valid) return null;

          // Backfill createdAt for users who predate this field
          if (!userData.createdAt) {
            userData.createdAt = users[0].updatedAt || new Date().toISOString();
          }
          // Track last login
          userData.lastLogin = new Date().toISOString();
          await db
            .update(schema.settings)
            .set({ value: JSON.stringify(userData), updatedAt: new Date().toISOString() })
            .where(eq(schema.settings.key, `user:${resolvedUsername}`));

          return { id: resolvedUsername, name: resolvedUsername, email: userData.email || `${resolvedUsername}@nexus` };
        } catch (error) {
          console.error("[auth] authorize error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, read role from DB and persist in JWT
      if (user?.name) {
        try {
          const userSetting = await db
            .select()
            .from(schema.settings)
            .where(eq(schema.settings.key, `user:${user.name}`))
            .limit(1);
          if (userSetting[0]?.value) {
            const userData = JSON.parse(userSetting[0].value);
            token.role = userData.role || "user";
          }
        } catch {
          token.role = "user";
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Check for admin impersonation cookie with full validation
      // (re-checks admin role in DB and verifies token not revoked)
      try {
        const impData = await getValidatedImpersonation();
        if (impData && session.user?.name === impData.adminUsername) {
          // Override session with impersonated user
          session.user.name = impData.targetUsername;
          session.user.email = `${impData.targetUsername}@nexus`;
        }
      } catch {
        // cookies() may not be available in all contexts (e.g. middleware)
      }

      // Attach role from JWT token (cached at sign-in, no DB hit)
      if (token.role) {
        (session.user as Record<string, unknown>).role = token.role;
      }

      return session;
    },
  },
  secret: (() => {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("NEXTAUTH_SECRET must be set in production");
      }
      // Development only — still warn so devs set this before going live
      console.warn("⚠️  NEXTAUTH_SECRET not set. Set it in .env.local before going to production.");
    }
    return secret ?? "nexus-dev-secret-change-before-prod";
  })(),
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
