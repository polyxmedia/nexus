---
paths:
  - "app/api/**/*.ts"
---

# API Route Rules

@API-ROUTES.md

## Function Signature

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Next.js 15: params is a Promise
  // ...
}
```

- Use `NextRequest` (not `Request`)
- Params are `Promise<T>` in Next.js 15, always await them

## Security Checks (apply in order)

### 1. CSRF Protection (POST/PUT/DELETE on sensitive routes)

```typescript
import { validateOrigin } from "@/lib/security/csrf";

const csrfError = validateOrigin(request);
if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });
```

### 2. Auth (three tiers)

**Public endpoints** (e.g., market data): No auth, just input validation. Tag as **Public** in API-ROUTES.md.

**Tier-gated endpoints** (most platform features):

```typescript
import { requireTier } from "@/lib/auth/require-tier";

const tierCheck = await requireTier("analyst");
if ("response" in tierCheck) return tierCheck.response;
const { result } = tierCheck; // contains session, subscription info
```

**Admin-only endpoints** (`app/api/admin/**`):

```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
if (!(await isAdmin(session.user.name))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

### 3. Rate Limiting

```typescript
import { rateLimit } from "@/lib/rate-limit";

const rl = await rateLimit(`domain:action:${session.user.name}`, 60, 60 * 1000);
if (!rl.allowed) {
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfter / 1000)) } }
  );
}
```

### 4. Input Validation

Validate required fields, types, and length limits before processing.

## Response Pattern

- Success: `NextResponse.json(data)` (200 implied)
- Error: `NextResponse.json({ error: "message" }, { status: code })`
- Status codes: 400 (bad input), 401 (unauthed), 403 (forbidden/CSRF), 404 (not found), 429 (rate limited), 500 (server error)
- **Graceful fallbacks**: Return empty arrays `[]` or `null` on failure, not 500s, for non-critical data
- Wrap in try/catch with `console.error` for debugging
- Extract error message: `const message = error instanceof Error ? error.message : "Unknown error"`

## Conventions

- File: `app/api/{domain}/route.ts` for collection, `app/api/{domain}/[id]/route.ts` for items
- Export named functions: `GET`, `POST`, `PATCH`, `DELETE`
- Use `NextResponse.json()` for all responses
- Parse request body with `await request.json()`
- Parse search params with `new URL(request.url).searchParams`
- Database: Drizzle ORM queries (`.select()`, `.insert()`, `.update()`, `.delete()`), use `.returning()` for mutations
- Non-critical parallel calls: use `Promise.allSettled()` for graceful degradation
- Credit-consuming routes (AI calls) must debit via `lib/credits/`
- Streaming routes use `new Response(stream)` with proper headers
