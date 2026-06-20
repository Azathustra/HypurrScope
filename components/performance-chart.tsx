"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { performanceHistory } from "@/lib/mock-data";

type TooltipPayload = {
  color: string;
  name: string;
  value: number;
};

function CustomTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-line bg-[#0B0D13]/95 p-3 shadow-panel">
      <p className="mb-2 text-xs font-medium text-muted">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center justify-between gap-6 text-sm">
          <span style={{ color: item.color }}>{item.name}</span>
          <span className="font-semibold text-white">${Math.round(item.value / 1000)}K</span>
        </div>
      ))}
    </div>
  );
}

export function PerformanceChart() {
  return (
    <div className="h-[310px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={performanceHistory} margin={{ left: 0, right: 10, top: 18, bottom: 0 }}>
          <defs>
            <linearGradient id="portfolioFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#7C6DFF" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#7C6DFF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#8B95A7", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={18}
          />
          <YAxis
            tickFormatter={(value) => `$${Number(value) / 1000}K`}
            tick={{ fill: "#8B95A7", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ color: "#8B95A7", fontSize: 12, top: -2 }}
          />
          <Area
            type="monotone"
            dataKey="portfolio"
            name="Portfolio"
            fill="url(#portfolioFill)"
            stroke="transparent"
          />
          <Line
            type="monotone"
            dataKey="portfolio"
            name="Portfolio"
            stroke="#7C6DFF"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, fill: "#7C6DFF", stroke: "#fff" }}
          />
          <Line
            type="monotone"
            dataKey="bitcoin"
            name="Bitcoin"
            stroke="#F7931A"
            strokeWidth={2.4}
            dot={false}
            activeDot={{ r: 5, fill: "#F7931A", stroke: "#fff" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
