"use client";

import { useEffect, useState } from "react";
import { LotCard } from "./lot-card";
import { ActivityFeed } from "./activity-feed";
import type { LotView } from "@/lib/view-types";

// Auto-fit grid: cards keep a sensible min width and grow to fill the row,
// so the board looks balanced from mobile (1 col) to wide desktop (3-4 cols).
const GRID = "grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(232px,1fr))]";

export function LiveBoard() {
  const [lots, setLots] = useState<LotView[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/auctions", { cache: "no-store" });
        const data = await res.json();
        if (alive) {
          setLots(data.lots ?? []);
          setLoaded(true);
        }
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 2500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const live = lots.filter((l) => l.status === "live");
  const settled = lots.filter((l) => l.status !== "live");

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Live now</h2>
            <span className="chip">{live.length} lots</span>
          </div>
          {!loaded ? (
            <div className={GRID}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card h-64 animate-pulse opacity-40" />
              ))}
            </div>
          ) : (
            <div className={GRID}>
              {live.map((l) => (
                <LotCard key={l.id} lot={l} />
              ))}
            </div>
          )}
        </section>

        {settled.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Recently settled</h2>
            <div className={GRID}>
              {settled.map((l) => (
                <LotCard key={l.id} lot={l} />
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start">
        <ActivityFeed />
      </aside>
    </div>
  );
}
