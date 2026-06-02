import type { Lot, Wallet, Bid, LedgerEntry } from "../types";

// pg / PGlite return BIGINT as strings. Coerce numeric columns so the rest of
// the app never juggles string-vs-number money bugs.
const num = (v: unknown): number => Number(v ?? 0);
const numOrNull = (v: unknown): number | null => (v == null ? null : Number(v));
const str = (v: unknown): string => String(v ?? "");
const strOrNull = (v: unknown): string | null => (v == null ? null : String(v));

export function mapLot(r: Record<string, unknown>): Lot {
  return {
    id: str(r.id),
    title: str(r.title),
    description: strOrNull(r.description),
    image_url: strOrNull(r.image_url),
    seller_id: str(r.seller_id),
    seller_handle: r.seller_handle ? str(r.seller_handle) : undefined,
    category: strOrNull(r.category),
    auction_type: str(r.auction_type) as Lot["auction_type"],
    status: str(r.status) as Lot["status"],
    currency: str(r.currency || "USD"),
    start_cents: num(r.start_cents),
    min_increment_cents: num(r.min_increment_cents),
    high_bid_cents: numOrNull(r.high_bid_cents),
    high_bidder_id: strOrNull(r.high_bidder_id),
    high_bidder_handle: r.high_bidder_handle ? str(r.high_bidder_handle) : null,
    bid_count: num(r.bid_count),
    dutch_floor_cents: numOrNull(r.dutch_floor_cents),
    dutch_drop_cents: numOrNull(r.dutch_drop_cents),
    dutch_interval_secs: numOrNull(r.dutch_interval_secs),
    qty_total: num(r.qty_total),
    qty_claimed: num(r.qty_claimed),
    ends_at: strOrNull(r.ends_at),
    started_at: strOrNull(r.started_at),
    settled_at: strOrNull(r.settled_at),
    winner_id: strOrNull(r.winner_id),
    clearing_cents: numOrNull(r.clearing_cents),
    created_at: str(r.created_at),
  };
}

export function mapWallet(r: Record<string, unknown>): Wallet {
  return {
    user_id: str(r.user_id),
    balance_cents: num(r.balance_cents),
    held_cents: num(r.held_cents),
    updated_at: str(r.updated_at),
  };
}

export function mapBid(r: Record<string, unknown>): Bid {
  return {
    id: str(r.id),
    lot_id: str(r.lot_id),
    user_id: str(r.user_id),
    user_handle: r.user_handle ? str(r.user_handle) : undefined,
    amount_cents: num(r.amount_cents),
    region: str(r.region),
    status: str(r.status) as Bid["status"],
    reason: strOrNull(r.reason),
    created_at: str(r.created_at),
  };
}

export function mapLedger(r: Record<string, unknown>): LedgerEntry {
  return {
    id: str(r.id),
    user_id: str(r.user_id),
    lot_id: strOrNull(r.lot_id),
    kind: str(r.kind) as LedgerEntry["kind"],
    amount_cents: num(r.amount_cents),
    balance_after_cents: numOrNull(r.balance_after_cents),
    created_at: str(r.created_at),
  };
}
