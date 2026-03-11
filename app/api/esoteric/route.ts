import { NextRequest, NextResponse } from "next/server";
import {
  getCyclicalReading,
  gannSquareOf9,
  scoreChineseNumerology,
  getNameNumerology,
  getSexagenaryCycle,
  getFlyingStarReading,
  getLunarPhase,
  getArmstrongPiCycle,
  getKondratieffPosition,
  getUniversalYearNumber,
} from "@/lib/signals/structural-cycles";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Full reading for a date
  if (!action || action === "reading") {
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T");
    const d = new Date(dateStr + "T12:00:00Z");
    const reading = getCyclicalReading(d);
    return NextResponse.json(reading);
  }

  // Gann Square of 9 for a price
  if (action === "gann") {
    const price = parseFloat(searchParams.get("price") || "100");
    const levels = gannSquareOf9(price);
    return NextResponse.json({ pivot: price, levels });
  }

  // Chinese numerology score for any number
  if (action === "numerology") {
    const input = searchParams.get("number") || searchParams.get("input") || "0";
    const score = scoreChineseNumerology(input);
    return NextResponse.json(score);
  }

  // Name numerology (Pythagorean)
  if (action === "name") {
    const name = searchParams.get("name") || "";
    const result = getNameNumerology(name);
    return NextResponse.json(result);
  }

  // Sexagenary cycle for a year
  if (action === "cycle") {
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const cycle = getSexagenaryCycle(year);
    return NextResponse.json(cycle);
  }

  // Flying stars for a year
  if (action === "flyingstars") {
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const stars = getFlyingStarReading(year);
    return NextResponse.json(stars);
  }

  // Lunar phase for a date
  if (action === "lunar") {
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T");
    const phase = getLunarPhase(new Date(dateStr + "T12:00:00Z"));
    return NextResponse.json(phase);
  }

  // Armstrong Pi Cycle
  if (action === "pi") {
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T");
    const points = getArmstrongPiCycle(new Date(dateStr + "T12:00:00Z"));
    return NextResponse.json({ points });
  }

  // Kondratieff wave
  if (action === "kondratieff") {
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const position = getKondratieffPosition(year);
    return NextResponse.json(position);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
