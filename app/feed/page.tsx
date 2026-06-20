"use client";

import { useMemo, useState } from "react";
import { Filter, SignalHigh } from "lucide-react";
import { AssetIcon } from "@/components/asset-icon";
import { feedPosts } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const filters = ["All", "Bitcoin", "L1", "DeFi", "AI", "Hyperliquid", "TradFi"];

export default function FeedPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const posts = useMemo(() => {
    if (activeFilter === "All") return feedPosts;
    return feedPosts.filter((post) => post.tag === activeFilter);
  }, [activeFilter]);

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Alpha Feed</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-5xl">Signaux research</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
          Posts courts, signaux de marché et lectures tactiques pour suivre l'alpha crypto au quotidien.
        </p>
      </div>

      <div className="premium-card rounded-[20px] p-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="ml-2 mr-1 text-muted">
            <Filter size={16} />
          </span>
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition",
                activeFilter === filter ? "bg-white text-ink" : "text-muted hover:bg-white/[0.04] hover:text-white"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {posts.map((post) => (
          <article key={post.id} className="premium-card rounded-[20px] p-5 transition hover:border-white/16 hover:bg-panelSoft">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <AssetIcon ticker={post.asset} />
                <div>
                  <p className="text-xs text-muted">{post.date}</p>
                  <p className="text-sm font-semibold text-white">{post.asset}</p>
                </div>
              </div>
              <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-medium text-white">
                {post.tag}
              </span>
            </div>
            <h2 className="mt-5 text-xl font-semibold leading-snug text-white">{post.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{post.summary}</p>
            <div className="mt-5 flex items-center gap-2 text-sm text-positive">
              <SignalHigh size={16} />
              Conviction {post.conviction.toLowerCase()}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
