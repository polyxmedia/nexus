---
paths:
  - "lib/chat/tools.ts"
  - "lib/chat/prompt.ts"
  - "app/api/chat/**/*.ts"
  - "components/chat/**/*.tsx"
---

# Chat System Rules

@SYSTEMS.md @COMPONENTS.md

## Tool Definition Pattern (lib/chat/tools.ts)

Tools follow Anthropic's tool_use format:

```typescript
{
  name: "tool_name",
  description: "What the tool does and when to use it",
  input_schema: {
    type: "object" as const,
    properties: {
      param: { type: "string", description: "..." }
    },
    required: ["param"]
  }
}
```

## Tool Executor Pattern

Tool execution uses `executeTool()` dispatcher in `lib/chat/tools.ts`:

```typescript
// Dispatcher routes to specific executor functions
export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  context?: ToolContext // { username, sessionId, projectId }
): Promise<Record<string, unknown>> {
  switch (toolName) {
    case "tool_name": return executeToolName(input, context);
    // ...
  }
}
```

Each executor function:
1. Extracts and validates parameters from tool input
2. Calls the relevant lib/ function or queries DB via Drizzle
3. Returns a structured result object for the widget renderer
4. On error, returns `{ error: string }` (never throws)

## Widget Renderer Pattern

Chat tool results render via widgets in `components/chat/widgets/`:

```tsx
"use client";

interface MyWidgetData {
  // typed to match executor output
  error?: string;
}

interface MyWidgetProps {
  data: MyWidgetData;
}

export function MyWidget({ data }: MyWidgetProps) {
  // Always handle error state first
  if (data.error) {
    return (
      <div className="rounded-lg border border-accent-rose/30 bg-navy-950 p-4">
        <p className="text-[10px] font-mono uppercase tracking-wider text-accent-rose">Error</p>
        <p className="text-sm text-navy-300">{data.error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-navy-800 bg-navy-950 p-4">
      <p className="text-[10px] font-mono uppercase tracking-wider text-navy-400">Section Label</p>
      {/* Widget content using design system */}
    </div>
  );
}
```

Widgets are registered in `components/chat/tool-result-renderer.tsx`.

## Adding a New Chat Tool (4 steps)

1. **Define** in `lib/chat/tools.ts` - add tool object to `TOOL_DEFINITIONS` array
2. **Execute** in `lib/chat/tools.ts` - add case to `executeTool()` switch + executor function
3. **Widget** in `components/chat/widgets/` - create renderer component with error boundary
4. **Register** in `components/chat/tool-result-renderer.tsx` - map tool name to widget

## Conventions

- Tool names use snake_case
- Descriptions should guide the AI on WHEN to use the tool
- Input schemas must have explicit `type: "object" as const`
- Support optional filtering params (status, limit, search) where appropriate
- Results should include enough data for the widget to render standalone
- Executor functions return graceful errors, never throw
- Credit-consuming tools must debit credits
- Chat sessions auto-compress after 12 messages (older messages summarized)
