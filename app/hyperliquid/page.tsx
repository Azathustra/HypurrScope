"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Activity, AlertTriangle, Coins } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { hyperliquidChart, hyperliquidStats } from "@/lib/mock-data";

export default function HyperliquidPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan">Hyperliquid</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-5xl">Dashboard HYPE</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
          Suivi des volumes, revenus, open interest et risques de l'écosystème Hyperliquid.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {hyperliquidStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} detail={stat.delta} tone="positive" />
        ))}
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="premium-card rounded-[20px] p-5 lg:p-6">
          <div className="mb-5 flex items-center gap-3">
            <Activity className="text-cyan" size={20} />
            <div>
              <h2 className="text-xl font-semibold text-white">Volume / Open Interest</h2>
              <p className="mt-1 text-sm text-muted">Données hebdomadaires mockées en milliards de dollars.</p>
            </div>
          </div>
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hyperliquidChart}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#8B95A7", fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#8B95A7", fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0B0D13",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14,
                    color: "#fff"
                  }}
                />
                <Bar dataKey="volume" name="Volume" fill="#59D8FF" radius={[8, 8, 0, 0]} />
                <Line type="monotone" dataKey="oi" name="Open interest" stroke="#7C6DFF" strokeWidth={3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="premium-card rounded-[20px] p-5 lg:p-6">
            <div className="mb-4 flex items-center gap-3">
              <Coins className="text-positive" size={20} />
              <h2 className="text-xl font-semibold text-white">Thèse HYPE</h2>
            </div>
            <p className="text-sm leading-7 text-muted">
              Hyperliquid combine une expérience de trading proche d'un exchange centralisé avec une distribution de revenus
              plus transparente. La thèse repose sur la rétention des traders actifs, la profondeur des marchés perpétuels et la
              capacité des buybacks à transformer les frais en demande structurelle pour HYPE.
            </p>
          </div>
          <div className="premium-card rounded-[20px] p-5 lg:p-6">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="text-negative" size={20} />
              <h2 className="text-xl font-semibold text-white">Risques</h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-muted">
              <p>Compression des frais si les DEX perpétuels se livrent à une guerre d'incentives.</p>
              <p>Risque de liquidité lors d'un choc de marché concentré sur les mêmes collatéraux.</p>
              <p>Dépendance à la qualité d'exécution et à la confiance des traders professionnels.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
