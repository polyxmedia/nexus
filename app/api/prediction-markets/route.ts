import { NextRequest, NextResponse } from "next/server";
import { getPredictionMarkets } from "@/lib/prediction-markets";

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category");
    const snapshot = await getPredictionMarkets();

    if (category === "geopolitical") return NextResponse.json(snapshot.geopolitical);
    if (category === "economic") return NextResponse.json(snapshot.economic);
    if (category === "political") return NextResponse.json(snapshot.political);
    if (category === "movers") return NextResponse.json(snapshot.topMovers);

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Prediction markets API error:", error);
    return NextResponse.json({ markets: [], topMovers: [], geopolitical: [], economic: [], political: [], totalMarkets: 0 });
  }
}
