import type { Lot } from "../types";

/**
 * Current price in cents for a lot.
 *  - english: not used for "buy"; callers use minNextBid().
 *  - dutch:   start price decremented by drop_cents every interval, floored.
 *  - drop:    fixed start price.
 */
export function currentPrice(lot: Lot, atMs: number = Date.now()): number {
  if (lot.auction_type === "drop") return lot.start_cents;
  if (lot.auction_type === "dutch") {
    const anchor = lot.started_at ? Date.parse(lot.started_at) : atMs;
    const interval = (lot.dutch_interval_secs ?? 5) * 1000;
    const drop = lot.dutch_drop_cents ?? 0;
    const floor = lot.dutch_floor_cents ?? 0;
    const steps = Math.max(0, Math.floor((atMs - anchor) / interval));
    return Math.max(floor, lot.start_cents - steps * drop);
  }
  return lot.high_bid_cents ?? lot.start_cents;
}

export function minNextBid(lot: Lot): number {
  if (lot.high_bid_cents == null) return lot.start_cents;
  return lot.high_bid_cents + lot.min_increment_cents;
}

export function isClaimable(lot: Lot): boolean {
  return (
    (lot.auction_type === "dutch" || lot.auction_type === "drop") &&
    lot.status === "live" &&
    lot.qty_claimed < lot.qty_total
  );
}
