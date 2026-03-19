import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, asc, and } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";
import { getQuoteData } from "@/lib/market-data/yahoo";

// GET - list all watchlists with items and live quotes
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const withQuotes = searchParams.get("quotes") !== "false";
    const watchlistId = searchParams.get("id");

    const lists = watchlistId
      ? await db.select().from(schema.watchlists).where(eq(schema.watchlists.id, parseInt(watchlistId)))
      : await db.select().from(schema.watchlists).orderBy(asc(schema.watchlists.position));

    const result = await Promise.all(
      lists.map(async (list) => {
        const items = await db
          .select()
          .from(schema.watchlistItems)
          .where(eq(schema.watchlistItems.watchlistId, list.id))
          .orderBy(asc(schema.watchlistItems.position));

        if (!withQuotes) {
          // Return last known prices from DB
          return {
            ...list,
            items: items.map((it) => ({
              ...it,
              quote: it.lastPrice != null
                ? {
                    symbol: it.symbol,
                    price: it.lastPrice,
                    change: it.lastChange ?? 0,
                    changePercent: it.lastChangePercent ?? 0,
                    volume: it.lastVolume ?? 0,
                    timestamp: it.lastUpdated ?? "",
                  }
                : null,
            })),
          };
        }

        // Fetch live quotes, persist to DB, fall back to last known
        const enriched: Record<string, unknown>[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          try {
            const quote = await getQuoteData(item.symbol);

            // Persist the quote to DB
            await db
              .update(schema.watchlistItems)
              .set({
                lastPrice: quote.price,
                lastChange: quote.change,
                lastChangePercent: quote.changePercent,
                lastVolume: quote.volume,
                lastUpdated: new Date().toISOString(),
              })
              .where(eq(schema.watchlistItems.id, item.id));

            enriched.push({ ...item, quote });
          } catch {
            // Fall back to last known price from DB
            enriched.push({
              ...item,
              quote: item.lastPrice != null
                ? {
                    symbol: item.symbol,
                    price: item.lastPrice,
                    change: item.lastChange ?? 0,
                    changePercent: item.lastChangePercent ?? 0,
                    volume: item.lastVolume ?? 0,
                    timestamp: item.lastUpdated ?? "",
                    stale: true,
                  }
                : null,
            });
          }
          // Rate limit buffer between calls
          if (i < items.length - 1) await new Promise((r) => setTimeout(r, 300));
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
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "add_item") {
      const { watchlistId, symbol } = body;
      if (!watchlistId || !symbol) {
        return NextResponse.json({ error: "watchlistId and symbol required" }, { status: 400 });
      }
      const existing = await db
        .select()
        .from(schema.watchlistItems)
        .where(
          and(
            eq(schema.watchlistItems.watchlistId, watchlistId),
            eq(schema.watchlistItems.symbol, symbol.toUpperCase())
          )
        );
      if (existing.length > 0) {
        return NextResponse.json({ error: "Symbol already in watchlist" }, { status: 409 });
      }
      const items = await db
        .select()
        .from(schema.watchlistItems)
        .where(eq(schema.watchlistItems.watchlistId, watchlistId));
      const maxPos = items.length > 0 ? Math.max(...items.map((i) => i.position)) + 1 : 0;

      // Try to fetch initial quote
      let initialPrice: Record<string, unknown> = {};
      try {
        const quote = await getQuoteData(symbol.toUpperCase());
        initialPrice = {
          lastPrice: quote.price,
          lastChange: quote.change,
          lastChangePercent: quote.changePercent,
          lastVolume: quote.volume,
          lastUpdated: new Date().toISOString(),
        };
      } catch {
        // No initial price available
      }

      const [item] = await db
        .insert(schema.watchlistItems)
        .values({
          watchlistId,
          symbol: symbol.toUpperCase(),
          position: maxPos,
          addedAt: new Date().toISOString(),
          ...initialPrice,
        })
        .returning();
      return NextResponse.json({ item });
    }

    // Default: create watchlist
    const { name } = body;
    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    const allLists = await db.select().from(schema.watchlists);
    const maxPos = allLists.length > 0 ? Math.max(...allLists.map((l) => l.position)) + 1 : 0;
    const [watchlist] = await db
      .insert(schema.watchlists)
      .values({ name, position: maxPos, createdAt: new Date().toISOString() })
      .returning();
    return NextResponse.json({ watchlist });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH - rename watchlist or reorder items
export async function PATCH(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "reorder_items") {
      const { watchlistId, itemIds } = body as { action: string; watchlistId: number; itemIds: number[] };
      for (let i = 0; i < itemIds.length; i++) {
        await db
          .update(schema.watchlistItems)
          .set({ position: i })
          .where(
            and(
              eq(schema.watchlistItems.id, itemIds[i]),
              eq(schema.watchlistItems.watchlistId, watchlistId)
            )
          );
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "reorder_lists") {
      const { listIds } = body as { action: string; listIds: number[] };
      for (let i = 0; i < listIds.length; i++) {
        await db.update(schema.watchlists).set({ position: i }).where(eq(schema.watchlists.id, listIds[i]));
      }
      return NextResponse.json({ ok: true });
    }

    // Default: rename
    const { id, name } = body;
    if (!id || !name) return NextResponse.json({ error: "id and name required" }, { status: 400 });
    await db.update(schema.watchlists).set({ name }).where(eq(schema.watchlists.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - delete watchlist or remove item
export async function DELETE(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "remove_item") {
      const { itemId } = body;
      if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });
      await db.delete(schema.watchlistItems).where(eq(schema.watchlistItems.id, itemId));
      return NextResponse.json({ ok: true });
    }

    // Default: delete watchlist
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.delete(schema.watchlistItems).where(eq(schema.watchlistItems.watchlistId, id));
    await db.delete(schema.watchlists).where(eq(schema.watchlists.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
