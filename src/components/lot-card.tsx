"use client";

import Link from "next/link";
import { Countdown } from "./countdown";
import { formatUSD } from "@/lib/money";
import { lotVisual, TYPE_LABEL } from "@/lib/lot-visuals";
import type { LotView } from "@/lib/view-types";

// Stable 2-digit lot number derived from the id, for the catalog motif.
function lotNo(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 97;
  return String((h % 99) + 1).padStart(2, "0");
}

export function LotCard({ lot }: { lot: LotView }) {
  const v = lotVisual(lot.category);
  const settled = lot.status === "settled";
  const isClaim = lot.auction_type !== "english";
  const price = isClaim ? lot.current_price_cents ?? lot.start_cents : lot.high_bid_cents ?? lot.start_cents;
  const remaining = lot.qty_total - lot.qty_claimed;

  return (
    <Link href={`/auctions/${lot.id}`} className="group block h-full">
      <article className="card flex h-full flex-col overflow-hidden transition group-hover:border-[var(--gold-deep)]">
        {/* catalog plate */}
        <div className="relative h-32 overflow-hidden border-b border-[var(--line)] bg-[var(--ink-2)]">
          {v.img ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.img}
                alt={lot.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-4xl opacity-90 transition group-hover:scale-105">{v.emoji}</span>
            </div>
          )}
          <span
            className="mono absolute left-3 top-1 select-none text-[3.4rem] leading-none text-white/15 mix-blend-overlay"
            aria-hidden
          >
            {lotNo(lot.id)}
          </span>
          <div className="absolute right-3 top-3">
            {!settled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white backdrop-blur-sm">
                <span className="live-dot" /> live
              </span>
            ) : (
              <span className="rounded-full bg-black/45 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--good)] backdrop-blur-sm">
                settled
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
            <span className="truncate">{lot.category}</span>
            <span className="shrink-0 whitespace-nowrap text-[var(--muted-2)]">{TYPE_LABEL[lot.auction_type]}</span>
          </div>
          <h3 className="display mt-3 line-clamp-2 min-h-[3.25rem] text-lg leading-snug">{lot.title}</h3>

          <div className="hairline mt-auto flex items-end justify-between pt-3">
            <div>
              <div className="eyebrow">
                {settled ? "Sold for" : isClaim ? "Current price" : lot.high_bid_cents ? "High bid" : "Opening"}
              </div>
              <div className="mono text-xl">{formatUSD(settled ? lot.clearing_cents : price)}</div>
            </div>
            <div className="text-right">
              <div className="eyebrow">
                {lot.auction_type === "english" ? `${lot.bid_count} bids` : `${remaining}/${lot.qty_total} left`}
              </div>
              <div className="mono text-sm text-[var(--muted)]">
                <Countdown endsAt={settled ? null : lot.ends_at} />
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
