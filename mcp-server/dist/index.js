#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import pg from "pg";
const DATABASE_URL = process.env.DATABASE_URL ||
    "postgresql://andrefigueira@localhost:5432/nexus";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
function errorResult(err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${message}` }] };
}
function textResult(data) {
    return { content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}
/** Strip SQL comments and normalize whitespace for safe prefix checking */
function stripSqlComments(sql) {
    return sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim().toLowerCase();
}
const server = new McpServer({
    name: "nexus-db",
    version: "1.0.0",
});
// ── Tool: Run a read-only SQL query ──
server.tool("query", "Run a read-only SQL query against the Nexus PostgreSQL database. Use for SELECT queries only.", {
    sql: z.string().describe("The SQL query to execute (SELECT only)"),
}, async ({ sql }) => {
    const cleaned = stripSqlComments(sql);
    if (!cleaned.startsWith("select") && !cleaned.startsWith("with") && !cleaned.startsWith("explain")) {
        return textResult("Error: Only SELECT, WITH, and EXPLAIN queries are allowed.");
    }
    try {
        const result = await pool.query(sql);
        return textResult(result.rows);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: List all tables ──
server.tool("list_tables", "List all tables in the Nexus database with row counts", {}, async () => {
    try {
        const result = await pool.query(`
        SELECT schemaname, relname as table_name, n_live_tup as row_count
        FROM pg_stat_user_tables ORDER BY relname
      `);
        return textResult(result.rows);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Describe a table ──
server.tool("describe_table", "Get the column definitions for a specific table in the Nexus database", {
    table: z.string().describe("The table name to describe"),
}, async ({ table }) => {
    try {
        const result = await pool.query(`SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_name = $1 AND table_schema = 'public'
         ORDER BY ordinal_position`, [table]);
        return textResult(result.rows);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Platform stats ──
server.tool("platform_stats", "Get a quick overview of the Nexus platform: signal counts, prediction accuracy, user count, active subscriptions", {}, async () => {
    try {
        const queries = await Promise.all([
            pool.query("SELECT COUNT(*) as count FROM signals"),
            pool.query("SELECT COUNT(*) as count FROM predictions"),
            pool.query("SELECT COUNT(*) as count FROM predictions WHERE outcome = 'confirmed'"),
            pool.query("SELECT COUNT(*) as count FROM predictions WHERE outcome IS NOT NULL"),
            pool.query("SELECT COUNT(*) as count FROM settings WHERE key LIKE 'user:%'"),
            pool.query("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'"),
            pool.query("SELECT COUNT(*) as count FROM chat_sessions"),
            pool.query("SELECT COUNT(*) as count FROM knowledge"),
            pool.query("SELECT COUNT(*) as count FROM trades"),
        ]);
        const [signals, predictions, confirmed, resolved, users, activeSubs, chatSessions, knowledge, trades] = queries.map((q) => parseInt(q.rows[0].count));
        const accuracy = resolved > 0 ? ((confirmed / resolved) * 100).toFixed(1) : "N/A";
        return textResult({
            signals,
            predictions: { total: predictions, resolved, confirmed, accuracy: `${accuracy}%` },
            users,
            activeSubscriptions: activeSubs,
            chatSessions,
            knowledgeEntries: knowledge,
            trades,
        });
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Recent activity ──
server.tool("recent_activity", "Get recent platform activity: latest signals, predictions, trades, and chat sessions", {
    limit: z.number().optional().default(5).describe("Number of items to return per category"),
}, async ({ limit }) => {
    try {
        const [signals, predictions, trades, chats] = await Promise.all([
            pool.query(`SELECT id, title, category, intensity, status, created_at FROM signals ORDER BY created_at DESC LIMIT $1`, [limit]),
            pool.query(`SELECT id, claim, category, confidence, outcome, deadline, created_at FROM predictions ORDER BY created_at DESC LIMIT $1`, [limit]),
            pool.query(`SELECT id, ticker, direction, status, environment, created_at FROM trades ORDER BY created_at DESC LIMIT $1`, [limit]),
            pool.query(`SELECT id, title, created_at, updated_at FROM chat_sessions ORDER BY updated_at DESC LIMIT $1`, [limit]),
        ]);
        return textResult({
            recentSignals: signals.rows,
            recentPredictions: predictions.rows,
            recentTrades: trades.rows,
            recentChats: chats.rows,
        });
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Get prediction by ID or UUID ──
server.tool("get_prediction", "Get a specific prediction by numeric ID or UUID, including signal and analysis data", {
    id: z.string().describe("Prediction ID (numeric) or UUID"),
}, async ({ id }) => {
    try {
        const isUuid = id.includes("-");
        const result = await pool.query(`SELECT p.*, s.title as signal_title, s.category as signal_category, s.intensity as signal_intensity
         FROM predictions p
         LEFT JOIN signals s ON p.signal_id = s.id
         WHERE ${isUuid ? "p.uuid" : "p.id"} = $1`, [isUuid ? id : parseInt(id)]);
        if (result.rows.length === 0)
            return textResult("Prediction not found");
        return textResult(result.rows[0]);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: List predictions with filters ──
server.tool("list_predictions", "List predictions with optional filters: pending, resolved, by category, overdue, etc.", {
    status: z.enum(["pending", "resolved", "overdue", "all"]).optional().default("all").describe("Filter by status"),
    category: z.string().optional().describe("Filter by category (market, geopolitical, celestial)"),
    limit: z.number().optional().default(20).describe("Max results"),
}, async ({ status, category, limit }) => {
    try {
        let where = "WHERE 1=1";
        const params = [];
        let idx = 1;
        if (status === "pending") {
            where += " AND p.outcome IS NULL";
        }
        else if (status === "resolved") {
            where += " AND p.outcome IS NOT NULL";
        }
        else if (status === "overdue") {
            where += ` AND p.outcome IS NULL AND p.deadline <= $${idx}`;
            params.push(new Date().toISOString().split("T")[0]);
            idx++;
        }
        if (category) {
            where += ` AND p.category = $${idx}`;
            params.push(category);
            idx++;
        }
        params.push(limit);
        const result = await pool.query(`SELECT p.id, p.uuid, p.claim, p.category, p.confidence, p.outcome, p.score, p.deadline, p.direction, p.reference_symbol, p.created_at, p.resolved_at, p.created_by
         FROM predictions p ${where}
         ORDER BY p.created_at DESC LIMIT $${idx}`, params);
        return textResult(result.rows);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Update prediction ──
server.tool("update_prediction", "Update a prediction's fields (outcome, score, notes, deadline, confidence, etc.)", {
    id: z.string().describe("Prediction ID (numeric) or UUID"),
    outcome: z.enum(["confirmed", "denied", "partial", "expired"]).optional().describe("Set outcome"),
    outcome_notes: z.string().optional().describe("Notes about the outcome"),
    score: z.number().optional().describe("Score 0-1"),
    deadline: z.string().optional().describe("New deadline (YYYY-MM-DD)"),
    confidence: z.number().optional().describe("Updated confidence 0-1"),
    direction_correct: z.number().optional().describe("1 if direction was correct, 0 if not"),
    level_correct: z.number().optional().describe("1 if level/target was correct, 0 if not"),
}, async ({ id, outcome, outcome_notes, score, deadline, confidence, direction_correct, level_correct }) => {
    try {
        const isUuid = id.includes("-");
        const sets = [];
        const params = [];
        let idx = 1;
        if (outcome !== undefined) {
            sets.push(`outcome = $${idx}`);
            params.push(outcome);
            idx++;
            sets.push(`resolved_at = $${idx}`);
            params.push(new Date().toISOString());
            idx++;
        }
        if (outcome_notes !== undefined) {
            sets.push(`outcome_notes = $${idx}`);
            params.push(outcome_notes);
            idx++;
        }
        if (score !== undefined) {
            sets.push(`score = $${idx}`);
            params.push(score);
            idx++;
        }
        if (deadline !== undefined) {
            sets.push(`deadline = $${idx}`);
            params.push(deadline);
            idx++;
        }
        if (confidence !== undefined) {
            sets.push(`confidence = $${idx}`);
            params.push(confidence);
            idx++;
        }
        if (direction_correct !== undefined) {
            sets.push(`direction_correct = $${idx}`);
            params.push(direction_correct);
            idx++;
        }
        if (level_correct !== undefined) {
            sets.push(`level_correct = $${idx}`);
            params.push(level_correct);
            idx++;
        }
        if (sets.length === 0)
            return textResult("No fields to update");
        params.push(isUuid ? id : parseInt(id));
        const result = await pool.query(`UPDATE predictions SET ${sets.join(", ")} WHERE ${isUuid ? "uuid" : "id"} = $${idx} RETURNING id, uuid, claim, outcome, score, deadline`, params);
        if (result.rows.length === 0)
            return textResult("Prediction not found");
        return textResult(`Updated: ${JSON.stringify(result.rows[0], null, 2)}`);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Prediction accuracy report ──
server.tool("prediction_accuracy", "Get prediction accuracy stats: overall, by category, Brier scores, hit/miss rates", {}, async () => {
    try {
        const [overall, byCategory, brierAvg, recent] = await Promise.all([
            pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE outcome IS NOT NULL) as resolved,
            COUNT(*) FILTER (WHERE outcome = 'confirmed') as hits,
            COUNT(*) FILTER (WHERE outcome = 'denied') as misses,
            COUNT(*) FILTER (WHERE outcome = 'partial') as partial,
            COUNT(*) FILTER (WHERE outcome IS NULL) as pending,
            COUNT(*) as total
          FROM predictions
        `),
            pool.query(`
          SELECT category,
            COUNT(*) FILTER (WHERE outcome IS NOT NULL) as resolved,
            COUNT(*) FILTER (WHERE outcome = 'confirmed') as hits,
            ROUND(AVG(score) FILTER (WHERE outcome IS NOT NULL)::numeric, 3) as avg_score
          FROM predictions GROUP BY category ORDER BY category
        `),
            pool.query(`
          SELECT ROUND(AVG(
            CASE WHEN outcome = 'confirmed' THEN (1 - confidence) * (1 - confidence)
                 WHEN outcome = 'denied' THEN confidence * confidence
                 WHEN outcome = 'partial' THEN (0.5 - confidence) * (0.5 - confidence)
            END
          )::numeric, 4) as brier_score
          FROM predictions WHERE outcome IS NOT NULL AND outcome != 'expired'
        `),
            pool.query(`
          SELECT id, claim, confidence, outcome, score, deadline, resolved_at
          FROM predictions WHERE outcome IS NOT NULL
          ORDER BY resolved_at DESC NULLS LAST LIMIT 10
        `),
        ]);
        const o = overall.rows[0];
        const accuracy = parseInt(o.resolved) > 0 ? ((parseInt(o.hits) / parseInt(o.resolved)) * 100).toFixed(1) : "N/A";
        return textResult({
            overall: { ...o, accuracy: `${accuracy}%` },
            byCategory: byCategory.rows,
            brierScore: brierAvg.rows[0]?.brier_score ?? "N/A",
            recentResolved: recent.rows,
        });
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Get signals ──
server.tool("list_signals", "List signals with optional filters by category, status, or intensity", {
    category: z.string().optional().describe("Filter: geopolitical, market, osint, systemic"),
    status: z.string().optional().describe("Filter: active, monitoring, resolved"),
    min_intensity: z.number().optional().describe("Minimum intensity (1-10)"),
    limit: z.number().optional().default(20),
}, async ({ category, status, min_intensity, limit }) => {
    try {
        let where = "WHERE 1=1";
        const params = [];
        let idx = 1;
        if (category) {
            where += ` AND category = $${idx}`;
            params.push(category);
            idx++;
        }
        if (status) {
            where += ` AND status = $${idx}`;
            params.push(status);
            idx++;
        }
        if (min_intensity) {
            where += ` AND intensity >= $${idx}`;
            params.push(min_intensity);
            idx++;
        }
        params.push(limit);
        const result = await pool.query(`SELECT id, uuid, title, description, category, intensity, status, layers, market_sectors, created_at
         FROM signals ${where} ORDER BY created_at DESC LIMIT $${idx}`, params);
        return textResult(result.rows);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: List blog posts ──
server.tool("list_blog_posts", "List blog posts with status, publication date, and metadata", {
    status: z.enum(["draft", "published", "all"]).optional().default("all"),
    limit: z.number().optional().default(20),
}, async ({ status, limit }) => {
    try {
        let where = "";
        const params = [];
        let idx = 1;
        if (status !== "all") {
            where = `WHERE status = $${idx}`;
            params.push(status);
            idx++;
        }
        params.push(limit);
        const result = await pool.query(`SELECT id, slug, title, status, category, author, published_at, created_at, tweet_id,
                LENGTH(content) as content_length
         FROM blog_posts ${where} ORDER BY created_at DESC LIMIT $${idx}`, params);
        return textResult(result.rows);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Get blog post ──
server.tool("get_blog_post", "Get a full blog post by ID or slug, including content", {
    id: z.string().describe("Blog post ID (numeric) or slug"),
}, async ({ id }) => {
    try {
        const isNumeric = /^\d+$/.test(id);
        const result = await pool.query(`SELECT * FROM blog_posts WHERE ${isNumeric ? "id" : "slug"} = $1`, [isNumeric ? parseInt(id) : id]);
        if (result.rows.length === 0)
            return textResult("Blog post not found");
        return textResult(result.rows[0]);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Update blog post ──
server.tool("update_blog_post", "Update a blog post's content, status, title, or metadata", {
    id: z.string().describe("Blog post ID (numeric) or slug"),
    title: z.string().optional(),
    content: z.string().optional(),
    excerpt: z.string().optional(),
    status: z.enum(["draft", "published"]).optional(),
    category: z.string().optional(),
    tags: z.string().optional().describe("Comma-separated tags"),
}, async ({ id, title, content, excerpt, status, category, tags }) => {
    try {
        const isNumeric = /^\d+$/.test(id);
        const sets = [];
        const params = [];
        let idx = 1;
        if (title !== undefined) {
            sets.push(`title = $${idx}`);
            params.push(title);
            idx++;
        }
        if (content !== undefined) {
            sets.push(`content = $${idx}`);
            params.push(content);
            idx++;
        }
        if (excerpt !== undefined) {
            sets.push(`excerpt = $${idx}`);
            params.push(excerpt);
            idx++;
        }
        if (status !== undefined) {
            sets.push(`status = $${idx}`);
            params.push(status);
            idx++;
            if (status === "published") {
                sets.push(`published_at = $${idx}`);
                params.push(new Date().toISOString());
                idx++;
            }
        }
        if (category !== undefined) {
            sets.push(`category = $${idx}`);
            params.push(category);
            idx++;
        }
        if (tags !== undefined) {
            sets.push(`tags = $${idx}`);
            params.push(tags);
            idx++;
        }
        sets.push(`updated_at = $${idx}`);
        params.push(new Date().toISOString());
        idx++;
        if (sets.length <= 1)
            return textResult("No fields to update");
        params.push(isNumeric ? parseInt(id) : id);
        const result = await pool.query(`UPDATE blog_posts SET ${sets.join(", ")} WHERE ${isNumeric ? "id" : "slug"} = $${idx} RETURNING id, slug, title, status`, params);
        if (result.rows.length === 0)
            return textResult("Blog post not found");
        return textResult(`Updated: ${JSON.stringify(result.rows[0], null, 2)}`);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Credit balance ──
server.tool("credit_balance", "Check credit balance for a user or all users", {
    user_id: z.string().optional().describe("Specific user ID, or omit for all users"),
}, async ({ user_id }) => {
    try {
        if (user_id) {
            const result = await pool.query(`SELECT * FROM credit_balances WHERE user_id = $1`, [user_id]);
            return textResult(result.rows[0] ?? { message: "No balance record found" });
        }
        const result = await pool.query(`SELECT cb.*, (cb.credits_granted - cb.credits_used) as remaining FROM credit_balances cb ORDER BY cb.updated_at DESC`);
        return textResult(result.rows);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Credit ledger ──
server.tool("credit_ledger", "View credit transaction history for a user", {
    user_id: z.string().describe("User ID to check"),
    limit: z.number().optional().default(20),
}, async ({ user_id, limit }) => {
    try {
        const result = await pool.query(`SELECT * FROM credit_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, [user_id, limit]);
        return textResult(result.rows);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: List users ──
server.tool("list_users", "List all registered users with their subscription status", {}, async () => {
    try {
        const result = await pool.query(`
        SELECT
          s.key as user_key,
          REPLACE(s.key, 'user:', '') as username,
          sub.status as subscription_status,
          st.name as tier_name,
          cb.credits_granted,
          cb.credits_used,
          (cb.credits_granted - COALESCE(cb.credits_used, 0)) as credits_remaining
        FROM settings s
        LEFT JOIN subscriptions sub ON sub.user_id = REPLACE(s.key, 'user:', '')
        LEFT JOIN subscription_tiers st ON sub.tier_id = st.id
        LEFT JOIN credit_balances cb ON cb.user_id = REPLACE(s.key, 'user:', '')
        WHERE s.key LIKE 'user:%'
        ORDER BY s.key
      `);
        return textResult(result.rows);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Knowledge bank search ──
server.tool("search_knowledge", "Search the knowledge bank by keyword (text search, not vector)", {
    query: z.string().describe("Search term"),
    limit: z.number().optional().default(10),
}, async ({ query, limit }) => {
    try {
        const result = await pool.query(`SELECT id, title, source, category, created_at, LENGTH(content) as content_length
         FROM knowledge
         WHERE title ILIKE $1 OR content ILIKE $1 OR source ILIKE $1
         ORDER BY created_at DESC LIMIT $2`, [`%${query}%`, limit]);
        return textResult(result.rows);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Active trades ──
server.tool("list_trades", "List trades with optional status filter", {
    status: z.string().optional().describe("Filter: open, closed, pending, all"),
    environment: z.string().optional().describe("Filter: demo, live"),
    limit: z.number().optional().default(20),
}, async ({ status, environment, limit }) => {
    try {
        let where = "WHERE 1=1";
        const params = [];
        let idx = 1;
        if (status && status !== "all") {
            where += ` AND status = $${idx}`;
            params.push(status);
            idx++;
        }
        if (environment) {
            where += ` AND environment = $${idx}`;
            params.push(environment);
            idx++;
        }
        params.push(limit);
        const result = await pool.query(`SELECT id, ticker, direction, quantity, entry_price, current_price, pnl, status, environment, signal_id, prediction_id, created_at
         FROM trades ${where} ORDER BY created_at DESC LIMIT $${idx}`, params);
        return textResult(result.rows);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Execute write query (local dev tool, blocks destructive DDL) ──
server.tool("execute", "Execute a write SQL query (INSERT, UPDATE, DELETE) against the Nexus database. Use with caution.", {
    sql: z.string().describe("The SQL query to execute"),
}, async ({ sql }) => {
    const cleaned = stripSqlComments(sql);
    if (cleaned.startsWith("drop") || cleaned.startsWith("truncate") || cleaned.startsWith("alter")) {
        return textResult("Error: DROP, TRUNCATE, and ALTER queries are not allowed. Use psql directly for schema changes.");
    }
    try {
        const result = await pool.query(sql);
        return textResult({
            command: result.command,
            rowCount: result.rowCount,
            rows: result.rows,
        });
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Tool: Game theory scenarios ──
server.tool("list_scenarios", "List game theory scenarios and their current states", {
    limit: z.number().optional().default(10),
}, async ({ limit }) => {
    try {
        const result = await pool.query(`SELECT ss.id, ss.scenario_id, ss.state, ss.created_at, ss.updated_at,
                gs.title as scenario_title, gs.actors, gs.status as scenario_status
         FROM scenario_states ss
         LEFT JOIN game_scenarios gs ON ss.scenario_id = gs.id
         ORDER BY ss.updated_at DESC LIMIT $1`, [limit]);
        return textResult(result.rows);
    }
    catch (err) {
        return errorResult(err);
    }
});
// ── Start server ──
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch(console.error);
