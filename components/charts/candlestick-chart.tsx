"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from "lightweight-charts";

// ── Public types ────────────────────────────────────────────────────────────

export interface CandlestickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  symbol?: string;
  height?: number;
  showVolume?: boolean;
}

// ── Indicator registry ──────────────────────────────────────────────────────

type OverlayId = "sma9" | "sma20" | "sma50" | "ema9" | "ema21" | "bb" | "vwap";
type SubId = "rsi" | "macd";
type IndicatorId = OverlayId | SubId;

const OVERLAY_DEFS: { id: OverlayId; label: string; color: string }[] = [
  { id: "sma9",  label: "SMA 9",  color: "#06b6d4" },
  { id: "sma20", label: "SMA 20", color: "#f59e0b" },
  { id: "sma50", label: "SMA 50", color: "#8b5cf6" },
  { id: "ema9",  label: "EMA 9",  color: "#10b981" },
  { id: "ema21", label: "EMA 21", color: "#f43f5e" },
  { id: "bb",    label: "BB",     color: "#64748b" },
  { id: "vwap",  label: "VWAP",   color: "#94a3b8" },
];

const SUB_DEFS: { id: SubId; label: string }[] = [
  { id: "rsi",  label: "RSI" },
  { id: "macd", label: "MACD" },
];

// ── Indicator computation ───────────────────────────────────────────────────

type Point = { time: string; value: number };

function smaSeries(data: CandlestickData[], period: number): Point[] {
  const out: Point[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, d) => a + d.close, 0);
    out.push({ time: data[i].time, value: sum / period });
  }
  return out;
}

function emaSeries(data: CandlestickData[], period: number): Point[] {
  const out: Point[] = [];
  if (data.length < period) return out;
  const k = 2 / (period + 1);
  let val = data.slice(0, period).reduce((a, d) => a + d.close, 0) / period;
  out.push({ time: data[period - 1].time, value: val });
  for (let i = period; i < data.length; i++) {
    val = data[i].close * k + val * (1 - k);
    out.push({ time: data[i].time, value: val });
  }
  return out;
}

function bbSeries(data: CandlestickData[], period = 20, mult = 2) {
  const upper: Point[] = [], mid: Point[] = [], lower: Point[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sl = data.slice(i - period + 1, i + 1).map(d => d.close);
    const mean = sl.reduce((a, b) => a + b, 0) / period;
    const sd = Math.sqrt(sl.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    upper.push({ time: data[i].time, value: mean + mult * sd });
    mid.push({ time: data[i].time, value: mean });
    lower.push({ time: data[i].time, value: mean - mult * sd });
  }
  return { upper, mid, lower };
}

function vwapSeries(data: CandlestickData[]): Point[] {
  let tpv = 0, vol = 0;
  return data.map(d => {
    tpv += ((d.high + d.low + d.close) / 3) * (d.volume || 1);
    vol += d.volume || 1;
    return { time: d.time, value: tpv / vol };
  });
}

function rsiSeries(data: CandlestickData[], period = 14): Point[] {
  const c = data.map(d => d.close);
  const out: Point[] = [];
  if (c.length <= period) return out;
  let g = 0, l = 0;
  for (let i = 1; i <= period; i++) {
    const ch = c[i] - c[i - 1];
    ch > 0 ? (g += ch) : (l += -ch);
  }
  g /= period; l /= period;
  out.push({ time: data[period].time, value: l === 0 ? 100 : 100 - 100 / (1 + g / l) });
  for (let i = period + 1; i < c.length; i++) {
    const ch = c[i] - c[i - 1];
    if (ch > 0) { g = (g * (period - 1) + ch) / period; l = l * (period - 1) / period; }
    else { g = g * (period - 1) / period; l = (l * (period - 1) - ch) / period; }
    out.push({ time: data[i].time, value: l === 0 ? 100 : 100 - 100 / (1 + g / l) });
  }
  return out;
}

function macdSeries(data: CandlestickData[], fast = 12, slow = 26, sigPeriod = 9) {
  const empty = { line: [] as Point[], signal: [] as Point[], hist: [] as Array<{ time: string; value: number; color: string }> };
  if (data.length < slow + sigPeriod) return empty;
  const kf = 2 / (fast + 1), ks = 2 / (slow + 1);
  let ef = data.slice(0, fast).reduce((a, d) => a + d.close, 0) / fast;
  let es = data.slice(0, slow).reduce((a, d) => a + d.close, 0) / slow;
  for (let i = fast; i < slow; i++) ef = data[i].close * kf + ef * (1 - kf);
  const line: Point[] = [{ time: data[slow - 1].time, value: ef - es }];
  for (let i = slow; i < data.length; i++) {
    ef = data[i].close * kf + ef * (1 - kf);
    es = data[i].close * ks + es * (1 - ks);
    line.push({ time: data[i].time, value: ef - es });
  }
  if (line.length < sigPeriod) return { line, signal: [] as Point[], hist: [] as Array<{ time: string; value: number; color: string }> };
  const ksig = 2 / (sigPeriod + 1);
  let sig = line.slice(0, sigPeriod).reduce((a, d) => a + d.value, 0) / sigPeriod;
  const signal: Point[] = [{ time: line[sigPeriod - 1].time, value: sig }];
  const hist: Array<{ time: string; value: number; color: string }> = [];
  for (let i = sigPeriod; i < line.length; i++) {
    sig = line[i].value * ksig + sig * (1 - ksig);
    signal.push({ time: line[i].time, value: sig });
    const h = line[i].value - sig;
    hist.push({ time: line[i].time, value: h, color: h >= 0 ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)" });
  }
  return { line: line.slice(sigPeriod - 1), signal, hist };
}

// ── Shared chart config ─────────────────────────────────────────────────────

function chartOptions(el: HTMLElement, h: number, hideTime = false) {
  return {
    layout: {
      background: { type: ColorType.Solid, color: "transparent" },
      textColor: "#6b7280",
      fontSize: 10,
    },
    grid: {
      vertLines: { color: "rgba(255,255,255,0.02)" },
      horzLines: { color: "rgba(255,255,255,0.02)" },
    },
    crosshair: {
      vertLine: { color: "rgba(255,255,255,0.08)", width: 1 as const, style: LineStyle.Dashed },
      horzLine: { color: "rgba(255,255,255,0.08)", width: 1 as const, style: LineStyle.Dashed },
    },
    rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
    timeScale: { borderColor: "rgba(255,255,255,0.06)", timeVisible: false, visible: !hideTime },
    width: el.clientWidth,
    height: h,
  };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CandlestickChart({
  data,
  symbol,
  height = 400,
  showVolume = true,
}: CandlestickChartProps) {
  const [active, setActive] = useState<Set<IndicatorId>>(new Set());

  const mainRef = useRef<HTMLDivElement>(null);
  const rsiRef  = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef  = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  // Map from overlayId → list of lightweight-charts series instances
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaySeriesRef = useRef<Map<string, ISeriesApi<any>[]>>(new Map());

  const showRsi  = active.has("rsi");
  const showMacd = active.has("macd");

  const toggle = (id: IndicatorId) =>
    setActive(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Main chart ──────────────────────────────────────────────────────────

  // Deduplicate and sort data by time (lightweight-charts requires strictly ascending unique timestamps)
  const cleanData = useMemo(() => {
    const seen = new Set<string>();
    return data
      .slice()
      .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
      .filter(d => {
        if (seen.has(d.time)) return false;
        seen.add(d.time);
        return true;
      });
  }, [data]);

  useEffect(() => {
    if (!mainRef.current || !cleanData.length) return;
    const chart = createChart(mainRef.current, chartOptions(mainRef.current, height));
    mainChartRef.current = chart;
    overlaySeriesRef.current.clear();

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    candles.setData(cleanData.map(d => ({ time: d.time as any, open: d.open, high: d.high, low: d.low, close: d.close })));

    if (showVolume && cleanData.some(d => d.volume)) {
      const vol = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vol.setData(cleanData.map(d => ({ time: d.time as any, value: d.volume || 0, color: d.close >= d.open ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)" })));
    }

    chart.timeScale().fitContent();

    const resize = () => {
      if (mainRef.current) chart.applyOptions({ width: mainRef.current.clientWidth });
    };
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      overlaySeriesRef.current.clear();
      chart.remove();
      mainChartRef.current = null;
    };
  }, [cleanData, height, showVolume]);

  // ── Overlay indicators ──────────────────────────────────────────────────

  useEffect(() => {
    const chart = mainChartRef.current;
    if (!chart || !cleanData.length) return;
    const map = overlaySeriesRef.current;

    // Remove series for deactivated indicators
    for (const [id, seriesList] of map) {
      if (!active.has(id as IndicatorId)) {
        seriesList.forEach(s => { try { chart.removeSeries(s); } catch { /* already removed */ } });
        map.delete(id);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addLine = (pts: Point[], color: string, lineWidth: 1 | 2 | 3 | 4 = 1, style = LineStyle.Solid): ISeriesApi<any> => {
      const s = chart.addSeries(LineSeries, {
        color, lineWidth, lineStyle: style,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      s.setData(pts as any);
      return s;
    };

    for (const id of active) {
      if (map.has(id) || id === "rsi" || id === "macd") continue;

      if (id === "sma9")  { map.set(id, [addLine(smaSeries(cleanData, 9),  "#06b6d4")]); }
      else if (id === "sma20") { map.set(id, [addLine(smaSeries(cleanData, 20), "#f59e0b")]); }
      else if (id === "sma50") { map.set(id, [addLine(smaSeries(cleanData, 50), "#8b5cf6")]); }
      else if (id === "ema9")  { map.set(id, [addLine(emaSeries(cleanData, 9),  "#10b981")]); }
      else if (id === "ema21") { map.set(id, [addLine(emaSeries(cleanData, 21), "#f43f5e")]); }
      else if (id === "vwap")  { map.set(id, [addLine(vwapSeries(cleanData), "#94a3b8", 2)]); }
      else if (id === "bb") {
        const { upper, mid, lower } = bbSeries(cleanData);
        map.set(id, [
          addLine(upper, "rgba(100,116,139,0.7)", 1, LineStyle.Dashed),
          addLine(mid,   "rgba(100,116,139,0.4)", 1, LineStyle.Solid),
          addLine(lower, "rgba(100,116,139,0.7)", 1, LineStyle.Dashed),
        ]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, cleanData]);

  // ── RSI sub-chart ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!rsiRef.current || !cleanData.length || !showRsi) {
      rsiChartRef.current?.remove();
      rsiChartRef.current = null;
      return;
    }

    const chart = createChart(rsiRef.current, { ...chartOptions(rsiRef.current, 110, true), handleScroll: false, handleScale: false });
    rsiChartRef.current = chart;

    const rsiLine = chart.addSeries(LineSeries, {
      color: "#06b6d4", lineWidth: 1,
      priceLineVisible: false, lastValueVisible: true,
      crosshairMarkerVisible: false,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rsiLine.setData(rsiSeries(cleanData) as any);
    rsiLine.createPriceLine({ price: 70, color: "rgba(239,68,68,0.35)", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "OB" });
    rsiLine.createPriceLine({ price: 50, color: "rgba(255,255,255,0.08)", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: "" });
    rsiLine.createPriceLine({ price: 30, color: "rgba(34,197,94,0.35)", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "OS" });

    chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
    chart.timeScale().fitContent();

    // Sync time range with main chart
    const main = mainChartRef.current;
    if (main) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      main.timeScale().subscribeVisibleTimeRangeChange((range: any) => {
        if (range) rsiChartRef.current?.timeScale().setVisibleRange(range);
      });
    }

    const resize = () => {
      if (rsiRef.current) chart.applyOptions({ width: rsiRef.current.clientWidth });
    };
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
      rsiChartRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRsi, cleanData]);

  // ── MACD sub-chart ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!macdRef.current || !cleanData.length || !showMacd) {
      macdChartRef.current?.remove();
      macdChartRef.current = null;
      return;
    }

    const chart = createChart(macdRef.current, { ...chartOptions(macdRef.current, 110, true), handleScroll: false, handleScale: false });
    macdChartRef.current = chart;

    const { line, signal, hist } = macdSeries(cleanData);

    const histSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "right",
      priceLineVisible: false, lastValueVisible: false,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    histSeries.setData(hist as any);

    const macdLine = chart.addSeries(LineSeries, {
      color: "#06b6d4", lineWidth: 1,
      priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    macdLine.setData(line as any);

    const sigLine = chart.addSeries(LineSeries, {
      color: "#f59e0b", lineWidth: 1,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sigLine.setData(signal as any);

    macdLine.createPriceLine({ price: 0, color: "rgba(255,255,255,0.1)", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: "" });

    chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.15, bottom: 0.1 } });
    chart.timeScale().fitContent();

    const main = mainChartRef.current;
    if (main) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      main.timeScale().subscribeVisibleTimeRangeChange((range: any) => {
        if (range) macdChartRef.current?.timeScale().setVisibleRange(range);
      });
    }

    const resize = () => {
      if (macdRef.current) chart.applyOptions({ width: macdRef.current.clientWidth });
    };
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
      macdChartRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMacd, cleanData]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {/* ── Indicator toolbar ── */}
      <div className="flex items-center flex-wrap gap-x-1 gap-y-1 px-3 py-2 border-b border-white/[0.04]">
        <span className="font-mono text-[9px] uppercase tracking-wider text-navy-700 mr-1">Overlays</span>
        {OVERLAY_DEFS.map(ind => (
          <button
            key={ind.id}
            onClick={() => toggle(ind.id)}
            className="px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide rounded transition-all"
            style={
              active.has(ind.id)
                ? { color: ind.color, backgroundColor: `${ind.color}18`, outline: `1px solid ${ind.color}40` }
                : { color: "#374151" }
            }
          >
            {ind.label}
          </button>
        ))}

        <div className="w-px h-3 bg-navy-800 mx-1" />
        <span className="font-mono text-[9px] uppercase tracking-wider text-navy-700 mr-1">Oscillators</span>
        {SUB_DEFS.map(ind => (
          <button
            key={ind.id}
            onClick={() => toggle(ind.id)}
            className={`px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide rounded transition-all ${
              active.has(ind.id)
                ? "text-navy-200 bg-navy-700/60 outline outline-1 outline-navy-600"
                : "text-navy-700 hover:text-navy-500"
            }`}
          >
            {ind.label}
          </button>
        ))}

        {symbol && (
          <span className="ml-auto font-mono text-[10px] text-white/25">{symbol}</span>
        )}
      </div>

      {/* ── Main candlestick chart ── */}
      <div ref={mainRef} />

      {/* ── RSI panel ── */}
      {showRsi && (
        <div className="border-t border-white/[0.04]">
          <div className="px-3 py-1 flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-navy-600">RSI 14</span>
          </div>
          <div ref={rsiRef} />
        </div>
      )}

      {/* ── MACD panel ── */}
      {showMacd && (
        <div className="border-t border-white/[0.04]">
          <div className="px-3 py-1 flex items-center gap-3">
            <span className="font-mono text-[9px] uppercase tracking-wider text-navy-600">MACD (12, 26, 9)</span>
            <span className="font-mono text-[8px] text-navy-700">
              <span style={{ color: "#06b6d4" }}>MACD</span>
              {" / "}
              <span style={{ color: "#f59e0b" }}>Signal</span>
            </span>
          </div>
          <div ref={macdRef} />
        </div>
      )}
    </div>
  );
}
