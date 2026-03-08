import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Whitepapers — NEXUS Intelligence Research",
  description:
    "Internal NEXUS research papers. Restricted access.",
  robots: { index: false, follow: false },
};

export default async function WhitepapersLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.name) {
    redirect("/login");
  }

  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${session.user.name}`));

  if (!rows[0]) {
    redirect("/login");
  }

  const userData = JSON.parse(rows[0].value);

  if (userData.role !== "admin") {
    redirect("/");
  }

  return <>{children}</>;
}
