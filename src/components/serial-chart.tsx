"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatReading, type SerialPoint } from "@/lib/serial-capture";

// Validated categorical order (light surface, all pairs): CVD ΔE ≥ 9.3, normal-vision ΔE ≥ 18, contrast ≥ 3:1.
export const SERIES_COLORS = ["#0172e5", "#c76f00", "#06856b", "#7a3fa0"] as const;

const PANEL_HEIGHT = 112;
const AXIS_HEIGHT = 24;
const PAD = { top: 10, right: 18, bottom: 8, left: 52 };

function niceScale(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { lo: 0, hi: 1, ticks: [0, 1] };
  if (min === max) { const pad = Math.abs(min) * 0.1 || 1; min -= pad; max += pad; }
  const raw = (max - min) / 3;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / magnitude;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * magnitude;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = lo; value <= hi + step / 2; value += step) ticks.push(Number(value.toFixed(10)));
  return { lo, hi, ticks };
}

function nearestIndex(points: SerialPoint[], t: number) {
  let lo = 0, hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t < t) lo = mid + 1; else hi = mid;
  }
  if (lo > 0 && Math.abs(points[lo - 1].t - t) < Math.abs(points[lo].t - t)) return lo - 1;
  return lo;
}

function seconds(ms: number) {
  const s = ms / 1000;
  return s >= 100 ? `${Math.round(s)} s` : `${Number(s.toFixed(1))} s`;
}

type Props = {
  points: SerialPoint[];
  series: string[];
  /** Live mode: show only the most recent window, scrolling as data arrives. */
  windowMs?: number;
  label: string;
};

/** Small multiples: one panel per signal, each with its own y-axis, sharing one time axis and crosshair. */
export function SerialChart({ points, series, windowMs, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hoverT, setHoverT] = useState<number | null>(null);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const origin = points[0]?.t ?? 0;
  const visible = useMemo(() => {
    if (!windowMs || !points.length) return points;
    const start = points[points.length - 1].t - windowMs;
    const first = points.findIndex((point) => point.t >= start);
    return first <= 0 ? points : points.slice(first);
  }, [points, windowMs]);

  const t1 = visible.length ? visible[visible.length - 1].t : 1;
  const t0 = windowMs ? Math.min(visible[0]?.t ?? 0, t1 - windowMs) : visible[0]?.t ?? 0;
  const span = Math.max(1, t1 - t0);
  const plotWidth = width - PAD.left - PAD.right;
  const x = (t: number) => PAD.left + ((t - t0) / span) * plotWidth;

  const hoverIndex = hoverT === null || !visible.length ? null : nearestIndex(visible, hoverT);
  const hoverPoint = hoverIndex === null ? null : visible[hoverIndex];

  function pointerToT(clientX: number) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const px = Math.min(Math.max(clientX - rect.left, PAD.left), PAD.left + plotWidth);
    return t0 + ((px - PAD.left) / plotWidth) * span;
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!visible.length) return;
    const index = hoverIndex ?? visible.length - 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const next = Math.min(visible.length - 1, Math.max(0, index + (event.key === "ArrowLeft" ? -1 : 1)));
      setHoverT(visible[next].t);
    } else if (event.key === "Escape") setHoverT(null);
  }

  const xTicks = useMemo(() => {
    const count = Math.max(2, Math.min(6, Math.floor(plotWidth / 110)));
    return Array.from({ length: count + 1 }, (_, index) => t0 + (span * index) / count);
  }, [t0, span, plotWidth]);

  // Live charts read relative to "now"; recorded captures read as elapsed time from the first sample.
  const timeLabel = (t: number) => windowMs ? (t1 - t < 50 ? "now" : `−${seconds(t1 - t)}`) : seconds(t - origin);
  const panelHeight = series.length === 1 ? 220 : series.length === 2 ? 150 : PANEL_HEIGHT;
  // Keep the tooltip on the emptier side of the crosshair so it never covers the newest data.
  const hoverX = hoverPoint ? x(hoverPoint.t) : 0;
  const tooltipLeft = hoverX > width / 2 ? Math.max(0, hoverX - 12 - 160) : Math.min(hoverX + 12, width - 160);

  return <div
    ref={wrapRef}
    className="serial-chart"
    role="group"
    aria-label={`${label}. Use the left and right arrow keys to read values.`}
    tabIndex={0}
    onPointerMove={(event) => setHoverT(pointerToT(event.clientX))}
    onPointerLeave={() => setHoverT(null)}
    onKeyDown={onKeyDown}
    onBlur={() => setHoverT(null)}
  >
    {series.map((name, index) => {
      const color = SERIES_COLORS[index % SERIES_COLORS.length];
      let min = Infinity, max = -Infinity, latest = NaN;
      for (const point of visible) {
        const value = point.values[name];
        if (value === undefined) continue;
        if (value < min) min = value;
        if (value > max) max = value;
        latest = value;
      }
      const { lo, hi, ticks } = niceScale(min, max);
      const plotHeight = panelHeight - PAD.top - PAD.bottom;
      const y = (value: number) => PAD.top + (1 - (value - lo) / (hi - lo || 1)) * plotHeight;
      let path = "";
      let pen = false;
      let last: SerialPoint | null = null;
      for (const point of visible) {
        const value = point.values[name];
        if (value === undefined) { pen = false; continue; }
        path += `${pen ? "L" : "M"}${x(point.t).toFixed(1)},${y(value).toFixed(1)}`;
        pen = true;
        last = point;
      }
      const marker = hoverPoint ?? last;
      const markerValue = marker?.values[name];
      return <div className="serial-panel" key={name}>
        <div className="serial-panel-title"><span className="serial-key" style={{ background: color }} aria-hidden="true" /><span>{name}</span><strong>{formatReading(latest)}</strong></div>
        <svg width={width} height={panelHeight} role="img" aria-label={`${name}: latest ${formatReading(latest)}, range ${formatReading(min)} to ${formatReading(max)}`}>
          {ticks.map((tick) => <g key={tick}>
            <line x1={PAD.left} x2={PAD.left + plotWidth} y1={y(tick)} y2={y(tick)} className="serial-grid" />
            <text x={PAD.left - 8} y={y(tick)} className="serial-axis" textAnchor="end" dominantBaseline="middle">{formatReading(tick)}</text>
          </g>)}
          <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hoverPoint ? <line x1={x(hoverPoint.t)} x2={x(hoverPoint.t)} y1={PAD.top} y2={panelHeight - PAD.bottom} className="serial-crosshair" /> : null}
          {marker && markerValue !== undefined ? <circle cx={x(marker.t)} cy={y(markerValue)} r={4} fill={color} stroke="#ffffff" strokeWidth={2} /> : null}
        </svg>
      </div>;
    })}
    <svg width={width} height={AXIS_HEIGHT} aria-hidden="true" className="serial-x-axis">
      {xTicks.map((tick, index) => <text key={index} x={x(tick)} y={14} className="serial-axis" textAnchor={index === 0 ? "start" : index === xTicks.length - 1 ? "end" : "middle"}>{timeLabel(tick)}</text>)}
    </svg>
    {hoverPoint ? <div className="serial-tooltip" style={{ left: tooltipLeft }} role="presentation">
      <div className="serial-tooltip-time">{timeLabel(hoverPoint.t)}</div>
      {series.map((name, index) => <div key={name} className="serial-tooltip-row"><span className="serial-line-key" style={{ background: SERIES_COLORS[index % SERIES_COLORS.length] }} /><strong>{formatReading(hoverPoint.values[name] ?? NaN)}</strong><span>{name}</span></div>)}
    </div> : null}
  </div>;
}
