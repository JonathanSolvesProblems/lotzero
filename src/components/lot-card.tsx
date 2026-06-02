"use client";

import Link from "next/link";
import { Countdown } from "./countdown";
import { formatUSD } from "@/lib/money";
import { lotVisual, TYPE_LABEL } from "@/lib/lot-visuals";
import type { LotView } from "@/lib/view-types";

export function LotCard({ lot }: { lot: LotView }) {
  const v = lotVisual(lot.category);
  const settled = lot.status === "settled";
  const isClaim = lot.auction_type !== "english";
  const price = isClaim ? lot.current_price_cents ?? lot.start_cents : lot.high_bid_cents ?? lot.start_cents;
  const remaining = lot.qty_total - lot.qty_claimed;

  return (
    <Link href={`/auctions/${lot.id}`} className="group block">
      <div className="card overflow-hidden transition group-hover:border-[var(--border-2)] group-hover:-translate-y-0.5">
        <div
          className="relative flex h-36 items-center justify-center text-6xl"
          style={{ background: `linear-gradient(135deg, ${v.from}, ${v.to})` }}
        >
          <span className="drop-shadow-lg">{v.emoji}</span>
          <div className="absolute left-3 top-3 flex gap-2">
            <span className="chip !text-[var(--fg)]">{TYPE_LABEL[lot.auction_type]}</span>
          </div>
          {!settled ? (
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 text-xs">
              <span className="live-dot" /> live
            </div>
          ) : (
            <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-1 text-xs text-[var(--good)]">
              settled
            </div>
          )}
        </div>

        <div className="space-y-3 p-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold leading-tight">{lot.title}</h3>
            </div>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{lot.category}</p>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                {settled ? "Sold for" : isClaim ? "Current price" : lot.high_bid_cents ? "High bid" : "Opening"}
              </div>
              <div className="mono text-xl font-bold">{formatUSD(settled ? lot.clearing_cents : price)}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                {lot.auction_type === "english" ? `${lot.bid_count} bids` : `${remaining}/${lot.qty_total} left`}
              </div>
              <div className="text-sm">
                <Countdown endsAt={settled ? null : lot.ends_at} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
