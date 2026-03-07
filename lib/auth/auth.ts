import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";

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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "nexus-default-secret-change-in-production",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
