export type AuctionType = "english" | "dutch" | "drop";
export type LotStatus = "scheduled" | "live" | "settled" | "cancelled";

export interface Lot {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  seller_id: string;
  seller_handle?: string;
  category: string | null;
  auction_type: AuctionType;
  status: LotStatus;
  currency: string;
  start_cents: number;
  min_increment_cents: number;
  high_bid_cents: number | null;
  high_bidder_id: string | null;
  high_bidder_handle?: string | null;
  bid_count: number;
  // dutch
  dutch_floor_cents: number | null;
  dutch_drop_cents: number | null;
  dutch_interval_secs: number | null;
  // limited inventory (drop / multi-unit dutch)
  qty_total: number;
  qty_claimed: number;
  ends_at: string | null;
  started_at: string | null;
  settled_at: string | null;
  winner_id: string | null;
  clearing_cents: number | null;
  created_at: string;
}

export interface Wallet {
  user_id: string;
  balance_cents: number;
  held_cents: number;
  updated_at: string;
}

export interface User {
  id: string;
  handle: string;
  region: string;
  avatar: string;
}

export interface Bid {
  id: string;
  lot_id: string;
  user_id: string;
  user_handle?: string;
  amount_cents: number;
  region: string;
  status: "accepted" | "rejected" | "outbid" | "won";
  reason: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  user_id: string;
  lot_id: string | null;
  kind: "topup" | "hold" | "release" | "capture" | "payout";
  amount_cents: number;
  balance_after_cents: number | null;
  created_at: string;
}
