#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import pg from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://andrefigueira@localhost:5432/nexus";

const pool = new pg.Pool({ connectionString: DATABASE_URL });

const server = new McpServer({
  name: "nexus-db",
  version: "1.0.0",
});

// ── Tool: Run a read-only SQL query ──
server.tool(
  "query",
  "Run a read-only SQL query against the Nexus PostgreSQL database. Use for SELECT queries only.",
  {
    sql: z.string().describe("The SQL query to execute (SELECT only)"),
  },
  async ({ sql }) => {
    const trimmed = sql.trim().toLowerCase();
    if (
      !trimmed.startsWith("select") &&
      !trimmed.startsWith("with") &&
      !trimmed.startsWith("explain")
    ) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Only SELECT, WITH, and EXPLAIN queries are allowed.",
          },
        ],
      };
    }

    try {
      const result = await pool.query(sql);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result.rows, null, 2),
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Query error: ${message}` }],
      };
    }
  }
);

// ── Tool: List all tables ──
server.tool(
  "list_tables",
  "List all tables in the Nexus database with row counts",
  {},
  async () => {
    try {
      const result = await pool.query(`
        SELECT
          schemaname,
          relname as table_name,
          n_live_tup as row_count
        FROM pg_stat_user_tables
        ORDER BY relname
      `);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result.rows, null, 2),
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
      };
    }
  }
);

// ── Tool: Describe a table ──
server.tool(
  "describe_table",
  "Get the column definitions for a specific table in the Nexus database",
  {
    table: z.string().describe("The table name to describe"),
  },
  async ({ table }) => {
    try {
      const result = await pool.query(
        `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `,
        [table]
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result.rows, null, 2),
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
      };
    }
  }
);

// ── Tool: Platform stats ──
server.tool(
  "platform_stats",
  "Get a quick overview of the Nexus platform: signal counts, prediction accuracy, user count, active subscriptions",
  {},
  async () => {
    try {
      const queries = await Promise.all([
        pool.query("SELECT COUNT(*) as count FROM signals"),
        pool.query("SELECT COUNT(*) as count FROM predictions"),
        pool.query(
          "SELECT COUNT(*) as count FROM predictions WHERE outcome = 'confirmed'"
        ),
        pool.query(
          "SELECT COUNT(*) as count FROM predictions WHERE outcome IS NOT NULL"
        ),
        pool.query(
          "SELECT COUNT(*) as count FROM settings WHERE key LIKE 'user:%'"
        ),
        pool.query("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'"),
        pool.query("SELECT COUNT(*) as count FROM chat_sessions"),
        pool.query("SELECT COUNT(*) as count FROM knowledge"),
        pool.query("SELECT COUNT(*) as count FROM trades"),
      ]);

      const [
        signals,
        predictions,
        confirmed,
        resolved,
        users,
        activeSubs,
        chatSessions,
        knowledge,
        trades,
      ] = queries.map((q) => parseInt(q.rows[0].count));

      const accuracy =
        resolved > 0 ? ((confirmed / resolved) * 100).toFixed(1) : "N/A";

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                signals,
                predictions: { total: predictions, resolved, confirmed, accuracy: `${accuracy}%` },
                users,
                activeSubscriptions: activeSubs,
                chatSessions,
                knowledgeEntries: knowledge,
                trades,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
      };
    }
  }
);

// ── Tool: Recent activity ──
server.tool(
  "recent_activity",
  "Get recent platform activity: latest signals, predictions, trades, and chat sessions",
  {
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Number of items to return per category"),
  },
  async ({ limit }) => {
    try {
      const [signals, predictions, trades, chats] = await Promise.all([
        pool.query(
          `SELECT id, title, category, intensity, status, created_at FROM signals ORDER BY created_at DESC LIMIT $1`,
          [limit]
        ),
        pool.query(
          `SELECT id, claim, category, confidence, outcome, deadline, created_at FROM predictions ORDER BY created_at DESC LIMIT $1`,
          [limit]
        ),
        pool.query(
          `SELECT id, ticker, direction, status, environment, created_at FROM trades ORDER BY created_at DESC LIMIT $1`,
          [limit]
        ),
        pool.query(
          `SELECT id, title, created_at, updated_at FROM chat_sessions ORDER BY updated_at DESC LIMIT $1`,
          [limit]
        ),
      ]);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                recentSignals: signals.rows,
                recentPredictions: predictions.rows,
                recentTrades: trades.rows,
                recentChats: chats.rows,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
      };
    }
  }
);

// ── Start server ──
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
