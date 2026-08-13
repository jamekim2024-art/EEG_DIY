import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  ReferenceLine,
} from "recharts";
import type { LivePayload } from "../types";

type Props = { data: LivePayload; mode: "raw" | "filtered"; height?: number; onTryDemo?: () => void };

export function LiveBiosignalChart({ data, mode, height = 300, onTryDemo }: Props) {
  const points = useMemo(() => {
    const series = mode === "raw" ? data.waveform?.raw : data.waveform?.filtered;
    const timeS = data.waveform?.time_s;
    if (!series?.length) return [];
    const start = Math.max(0, series.length - 2000);
    return series.slice(start).map((v, i) => ({
      t: timeS?.[start + i] ?? (start + i) / 250,
      v,
    }));
  }, [data, mode]);

  if (!points.length) {
    return (
      <div className="empty-chart">
        <p>No live signal yet</p>
        <p className="muted">Connect your ESP32 in the sidebar, or try demo mode to preview the chart.</p>
        {onTryDemo && (
          <button type="button" className="btn primary" onClick={onTryDemo}>
            Try demo signal
          </button>
        )}
      </div>
    );
  }

  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;

  return (
    <div className="chart-wrap hero-chart">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={points} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            type="number"
            domain={[tMin, tMax]}
            tickFormatter={(v) => `${v.toFixed(1)}s`}
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
          />
          <YAxis
            domain={["auto", "auto"]}
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            width={48}
            tickFormatter={(v) => Number(v).toFixed(3)}
          />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            formatter={(v: number) => [`${v.toFixed(4)} V`, mode]}
            labelFormatter={(l) => `${Number(l).toFixed(2)} s`}
          />
          <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="v"
            stroke="#60a5fa"
            fill="url(#waveGrad)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SerialPlotterPanel({ data, height = 200 }: { data: LivePayload; height?: number }) {
  const points = useMemo(() => {
    const raw = data.waveform?.raw ?? [];
    const filt = data.waveform?.filtered ?? [];
    const n = Math.min(raw.length, filt.length, 800);
    if (!n) return [];
    const off = Math.max(0, raw.length - n);
    return Array.from({ length: n }, (_, i) => ({
      i,
      voltage: filt[off + i] ?? raw[off + i],
      rawScaled: (raw[off + i] ?? 0) / 2048,
    }));
  }, [data]);

  if (!points.length) return <p className="muted center">Waiting for stream…</p>;

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={points} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <XAxis dataKey="i" hide />
          <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} width={40} />
          <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
          <Legend wrapperStyle={{ color: "#94a3b8" }} />
          <Line name="Voltage" type="monotone" dataKey="voltage" stroke="#22c55e" dot={false} strokeWidth={1.5} isAnimationActive={false} />
          <Line name="Raw ÷ 2048" type="monotone" dataKey="rawScaled" stroke="#f59e0b" dot={false} strokeWidth={1} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WaveformChart({ data, mode, height }: Props) {
  return <LiveBiosignalChart data={data} mode={mode} height={height} />;
}

export function SpectrumChart({ data, height = 220 }: { data: LivePayload; height?: number }) {
  const freqs = data.psd?.freqs ?? [];
  const values = data.psd?.values ?? [];
  if (!freqs.length) return <p className="muted center">Spectrum will appear once data is streaming.</p>;
  const points = freqs.map((f, i) => ({ f: Number(f.toFixed(1)), p: values[i] }));

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={points} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <XAxis dataKey="f" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} label={{ value: "Hz", position: "insideBottomRight", fill: "#94a3b8" }} />
          <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} width={40} />
          <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
          <Area type="monotone" dataKey="p" stroke="#a78bfa" fill="#7c3aed55" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
