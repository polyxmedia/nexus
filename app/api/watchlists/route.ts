import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, asc, and } from "drizzle-orm";
import { getQuote } from "@/lib/market-data/alpha-vantage";

// GET - list all watchlists with items and live quotes
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const withQuotes = searchParams.get("quotes") !== "false";
    const watchlistId = searchParams.get("id");

    const lists = watchlistId
      ? db.select().from(schema.watchlists).where(eq(schema.watchlists.id, parseInt(watchlistId)))
      : db.select().from(schema.watchlists).orderBy(asc(schema.watchlists.position));

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    const result = await Promise.all(
      lists.map(async (list) => {
        const items = db.select().from(schema.watchlistItems).where(eq(schema.watchlistItems.watchlistId, list.id)).orderBy(asc(schema.watchlistItems.position));

        if (!withQuotes || !apiKey) {
          return { ...list, items: items.map((it) => ({ ...it, quote: null })) };
        }

        // Fetch quotes in batches of 3 to respect rate limits
        const enriched = [];
        for (let i = 0; i < items.length; i++) {
          try {
            const quote = await getQuote(items[i].symbol, apiKey);
            enriched.push({ ...items[i], quote });
          } catch {
            enriched.push({ ...items[i], quote: null });
          }
          // Small delay between requests to avoid rate limiting
          if (i < items.length - 1) await new Promise((r) => setTimeout(r, 250));
        }

        return { ...list, items: enriched };
      })
    );

    return NextResponse.json({ watchlists: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - create watchlist or add item
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "add_item") {
      const { watchlistId, symbol } = body;
      if (!watchlistId || !symbol) {
        return NextResponse.json({ error: "watchlistId and symbol required" }, { status: 400 });
      }
      // Check for duplicate
      const existing = db.select().from(schema.watchlistItems).where(and(eq(schema.watchlistItems.watchlistId, watchlistId), eq(schema.watchlistItems.symbol, symbol.toUpperCase())));
      if (existing) {
        return NextResponse.json({ error: "Symbol already in watchlist" }, { status: 409 });
      }
      // Get max position
      const items = db.select().from(schema.watchlistItems).where(eq(schema.watchlistItems.watchlistId, watchlistId));
      const maxPos = items.length > 0 ? Math.max(...items.map((i) => i.position)) + 1 : 0;
      const item = db.insert(schema.watchlistItems).values({ watchlistId, symbol: symbol.toUpperCase(), position: maxPos, addedAt: new Date().toISOString() }).returning();
      return NextResponse.json({ item });
    }

    // Default: create watchlist
    const { name } = body;
    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    const lists = db.select().from(schema.watchlists);
    const maxPos = lists.length > 0 ? Math.max(...lists.map((l) => l.position)) + 1 : 0;
    const watchlist = db.insert(schema.watchlists).values({ name, position: maxPos, createdAt: new Date().toISOString() }).returning();
    return NextResponse.json({ watchlist });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH - rename watchlist or reorder items
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "reorder_items") {
      const { watchlistId, itemIds } = body as { action: string; watchlistId: number; itemIds: number[] };
      for (let i = 0; i < itemIds.length; i++) {
        db.update(schema.watchlistItems).set({ position: i }).where(and(eq(schema.watchlistItems.id, itemIds[i]), eq(schema.watchlistItems.watchlistId, watchlistId)));
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "reorder_lists") {
      const { listIds } = body as { action: string; listIds: number[] };
      for (let i = 0; i < listIds.length; i++) {
        db.update(schema.watchlists).set({ position: i }).where(eq(schema.watchlists.id, listIds[i]));
      }
      return NextResponse.json({ ok: true });
    }

    // Default: rename
    const { id, name } = body;
    if (!id || !name) return NextResponse.json({ error: "id and name required" }, { status: 400 });
    db.update(schema.watchlists).set({ name }).where(eq(schema.watchlists.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - delete watchlist or remove item
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "remove_item") {
      const { itemId } = body;
      if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });
      db.delete(schema.watchlistItems).where(eq(schema.watchlistItems.id, itemId));
      return NextResponse.json({ ok: true });
    }

    // Default: delete watchlist
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    db.delete(schema.watchlistItems).where(eq(schema.watchlistItems.watchlistId, id));
    db.delete(schema.watchlists).where(eq(schema.watchlists.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
