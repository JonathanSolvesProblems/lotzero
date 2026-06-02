"use client";

import { useEffect, useState } from "react";
import { timeAgo, REGION_FLAG } from "@/lib/format";

interface FeedEvent {
  id: string;
  kind: string;
  text: string;
  region: string | null;
  ts: number;
}

export function ActivityFeed({ compact = false }: { compact?: boolean }) {
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/feed", { cache: "no-store" });
        const data = await res.json();
        if (alive) setFeed(data.feed ?? []);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 2000);
    const c = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(t);
      clearInterval(c);
    };
  }, []);

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="live-dot" />
        <h3 className="text-sm font-semibold">Global activity</h3>
        <span className="chip ml-auto">DynamoDB firehose</span>
      </div>
      <div className={`space-y-2 overflow-y-auto ${compact ? "max-h-64" : "max-h-[28rem]"}`}>
        {feed.length === 0 && <p className="text-sm text-[var(--muted)]">Waiting for the world to wake up…</p>}
        {feed.map((e) => (
          <div key={e.id} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 text-xs">{e.region ? REGION_FLAG[e.region] ?? "🌐" : "🌐"}</span>
            <span className="flex-1 text-[var(--fg)]/90">{e.text}</span>
            <span className="mono shrink-0 text-xs text-[var(--muted)]">{timeAgo(e.ts, now)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
