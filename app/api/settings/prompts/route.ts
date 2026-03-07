import { NextRequest, NextResponse } from "next/server";
import { PROMPT_REGISTRY } from "@/lib/prompts/registry";
import { loadPrompt, savePrompt, deletePromptOverride, hasPromptOverride } from "@/lib/prompts/loader";

export async function GET() {
  try {
    const prompts = PROMPT_REGISTRY.map((def) => ({
      key: def.key,
      label: def.label,
      description: def.description,
      category: def.category,
      value: await loadPrompt(def.key),
      isOverridden: hasPromptOverride(def.key),
      defaultValue: def.defaultValue,
    }));
    return NextResponse.json(prompts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, value } = await request.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }
    const def = PROMPT_REGISTRY.find((p) => p.key === key);
    if (!def) {
      return NextResponse.json({ error: "Unknown prompt key" }, { status: 400 });
    }
    savePrompt(key, value);
    return NextResponse.json({ success: true, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { key } = await request.json();
    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }
    deletePromptOverride(key);
    return NextResponse.json({ success: true, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
