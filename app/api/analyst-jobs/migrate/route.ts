import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// One-time migration to create analyst marketplace tables
// POST /api/analyst-jobs/migrate
export async function POST() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS analyst_profiles (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        bio TEXT,
        expertise TEXT,
        credentials TEXT,
        stripe_connect_id TEXT,
        payouts_enabled INTEGER NOT NULL DEFAULT 0,
        total_jobs INTEGER NOT NULL DEFAULT 0,
        total_earnings INTEGER NOT NULL DEFAULT 0,
        avg_accuracy DOUBLE PRECISION,
        scored_deliverables INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        updated_at TEXT
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS analyst_jobs (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        expertise TEXT,
        priority TEXT NOT NULL DEFAULT 'standard',
        payment_amount INTEGER NOT NULL,
        payment_type TEXT NOT NULL DEFAULT 'fixed',
        deadline TEXT,
        max_applications INTEGER NOT NULL DEFAULT 5,
        status TEXT NOT NULL DEFAULT 'open',
        created_by TEXT NOT NULL,
        assigned_to TEXT,
        source_type TEXT,
        source_id TEXT,
        deliverable_format TEXT NOT NULL DEFAULT 'analysis',
        knowledge_entry_id INTEGER,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        updated_at TEXT
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS analyst_applications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER NOT NULL REFERENCES analyst_jobs(id),
        analyst_id INTEGER NOT NULL REFERENCES analyst_profiles(id),
        user_id TEXT NOT NULL,
        cover_note TEXT,
        proposed_approach TEXT,
        estimated_hours INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        deliverable TEXT,
        delivered_at TEXT,
        review_score DOUBLE PRECISION,
        review_notes TEXT,
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        payment_reference TEXT,
        paid_at TEXT,
        created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        updated_at TEXT
      )
    `);

    return NextResponse.json({ success: true, message: "Analyst marketplace tables created" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
