import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed);
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // Rate limit: 10 login attempts per username per 15 minutes
        const rl = rateLimit(`login:${credentials.username.toLowerCase()}`, 10, 15 * 60 * 1000);
        if (!rl.allowed) return null; // Return null (not an error) so NextAuth shows generic "Sign in failed"

        try {
          const users = await db
            .select()
            .from(schema.settings)
            .where(eq(schema.settings.key, `user:${credentials.username}`));

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
                  value: JSON.stringify({ password: hashed, role: "admin" }),
                });
              return { id: credentials.username, name: credentials.username, email: `${credentials.username}@nexus` };
            }
            return null;
          }

          const userData = JSON.parse(users[0].value);
          const valid = await verifyPassword(credentials.password, userData.password);
          if (!valid) return null;

          return { id: credentials.username, name: credentials.username, email: `${credentials.username}@nexus` };
        } catch {
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
  secret: (() => {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("NEXTAUTH_SECRET must be set in production");
      }
      // Development only — still warn so devs set this before going live
      console.warn("⚠️  NEXTAUTH_SECRET not set. Set it in .env.local before going to production.");
    }
    return secret || "nexus-dev-fallback-" + process.env.DATABASE_URL?.slice(-8) || "nexus-dev";
  })(),
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
