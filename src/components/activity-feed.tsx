"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { timeAgo, REGION_FLAG } from "@/lib/format";

interface FeedEvent {
  id: string;
  kind: string;
  text: string;
  region: string | null;
  lotId: string | null;
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
    <div className="card flex max-h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="live-dot" />
        <h3 className="text-sm font-semibold">Global activity</h3>
        <span className="chip ml-auto">DynamoDB firehose</span>
      </div>
      <div
        className={`-mx-1 flex-1 space-y-0.5 overflow-y-auto px-1 ${compact ? "max-h-64" : "max-h-[calc(100vh-9rem)]"}`}
      >
        {feed.length === 0 && <p className="text-sm text-[var(--muted)]">Waiting for the world to wake up…</p>}
        {feed.map((e) => {
          const row = (
            <>
              <span className="mt-0.5 shrink-0 text-xs">{e.region ? REGION_FLAG[e.region] ?? "🌐" : "🌐"}</span>
              <span className="flex-1 leading-snug">{e.text}</span>
              <span className="mono mt-0.5 shrink-0 text-xs text-[var(--muted-2)]">{timeAgo(e.ts, now)}</span>
            </>
          );
          return e.lotId ? (
            <Link
              key={e.id}
              href={`/auctions/${e.lotId}`}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--fg)]/90 transition hover:bg-[var(--surface-2)]"
            >
              {row}
            </Link>
          ) : (
            <div key={e.id} className="flex items-start gap-2 px-2 py-1.5 text-sm text-[var(--fg)]/90">
              {row}
            </div>
          );
        })}
      </div>
    </div>
  );
}
