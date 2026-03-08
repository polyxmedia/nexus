import { NextRequest, NextResponse } from "next/server";
import { getBacktestRun } from "@/lib/backtest/engine";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = getBacktestRun(id);

    if (!run) {
      return NextResponse.json({ error: "Backtest run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
