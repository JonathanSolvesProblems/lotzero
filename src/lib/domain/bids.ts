import { getDb, type Querier } from "../db/client";
import { newId } from "../ids";
import { mapLot } from "./map";
import { recordLedger } from "./wallet";
import { BidError } from "./errors";
import { currentPrice } from "./pricing";
import type { Lot } from "../types";

/**
 * THE CORE INVARIANTS (held by Aurora DSQL's strongly-consistent, OCC transactions):
 *
 *   1. A lot's high bid only ever increases, and there is exactly one high bidder.
 *   2. qty_claimed never exceeds qty_total  → zero oversells, globally.
 *   3. A wallet's held + spent never exceeds its funded balance → zero double-spends,
 *      even when the same user acts from two Regions at the same instant.
 *
 * Under concurrency, conflicting transactions hit an OCC error and are retried by
 * db.tx(); on retry the guards below re-evaluate against fresh state and the losing
 * caller is cleanly rejected. No locks held across Regions, no conflict resolution,
 * no "last write wins" data loss.
 */

export interface PlaceBidResult {
  ok: true;
  bidId: string;
  lot: Lot;
}

function rowToLot(r: Record<string, unknown>): Lot {
  return mapLot(r);
}

/** English ascending auction: place a bid that must beat the current high bid. */
export async function placeEnglishBid(
  lotId: string,
  userId: string,
  amountCents: number,
  region: string,
): Promise<PlaceBidResult> {
  const db = await getDb();
  return db.tx(async (q) => {
    const lot = await lockLot(q, lotId);
    if (lot.auction_type !== "english") throw new BidError("wrong_type", "Not an English auction");
    if (lot.status !== "live") throw new BidError("not_live", "Auction is not live");
    if (lot.ends_at && Date.parse(lot.ends_at) <= Date.now())
      throw new BidError("ended", "Auction has ended");
    if (lot.seller_id === userId) throw new BidError("self_bid", "Sellers cannot bid on their own lot");

    const minNext = lot.high_bid_cents == null ? lot.start_cents : lot.high_bid_cents + lot.min_increment_cents;
    if (amountCents < minNext)
      throw new BidError("too_low", `Bid must be at least ${minNext} cents`, minNext);

    const wallet = await lockWallet(q, userId);
    const available = wallet.balance - wallet.held;
    if (available < amountCents)
      throw new BidError("insufficient", "Not enough available balance", available);

    // Release the previous high bidder's hold (their hold equals their winning bid).
    if (lot.high_bidder_id && lot.high_bid_cents != null) {
      await q.query(
        "UPDATE wallets SET held_cents = held_cents - $1, version = version + 1, updated_at = now() WHERE user_id = $2",
        [lot.high_bid_cents, lot.high_bidder_id],
      );
      await q.query(
        "UPDATE bids SET status = 'outbid' WHERE lot_id = $1 AND user_id = $2 AND status = 'accepted'",
        [lotId, lot.high_bidder_id],
      );
      await recordLedger(q, lot.high_bidder_id, lotId, "release", lot.high_bid_cents, null);
    }

    // Hold the new bidder's funds and install them as high bidder.
    await q.query(
      "UPDATE wallets SET held_cents = held_cents + $1, version = version + 1, updated_at = now() WHERE user_id = $2",
      [amountCents, userId],
    );
    await recordLedger(q, userId, lotId, "hold", amountCents, null);

    const { rows } = await q.query(
      `UPDATE lots SET high_bid_cents = $1, high_bidder_id = $2, bid_count = bid_count + 1,
                       version = version + 1
       WHERE id = $3 RETURNING *`,
      [amountCents, userId, lotId],
    );

    const bidId = newId("bid");
    await q.query(
      "INSERT INTO bids (id, lot_id, user_id, amount_cents, region, status) VALUES ($1,$2,$3,$4,$5,'accepted')",
      [bidId, lotId, userId, amountCents, region],
    );

    return { ok: true as const, bidId, lot: rowToLot(rows[0]) };
  });
}

/** Dutch / fixed-price drop: claim one unit at the current price. First wins. */
export async function claimLot(
  lotId: string,
  userId: string,
  region: string,
): Promise<PlaceBidResult> {
  const db = await getDb();
  return db.tx(async (q) => {
    const lot = await lockLot(q, lotId);
    if (lot.auction_type !== "dutch" && lot.auction_type !== "drop")
      throw new BidError("wrong_type", "Not a claimable lot");
    if (lot.status !== "live") throw new BidError("not_live", "Lot is not live");
    if (lot.ends_at && Date.parse(lot.ends_at) <= Date.now())
      throw new BidError("ended", "Lot has ended");
    if (lot.qty_claimed >= lot.qty_total) throw new BidError("sold_out", "Sold out");
    if (lot.seller_id === userId) throw new BidError("self_bid", "Sellers cannot claim their own lot");

    const price = currentPrice(lot);

    const wallet = await lockWallet(q, userId);
    const available = wallet.balance - wallet.held;
    if (available < price) throw new BidError("insufficient", "Not enough available balance", available);

    const newClaimed = lot.qty_claimed + 1;
    const soldOut = newClaimed >= lot.qty_total;

    // Capture from buyer, pay the seller. Single transaction, strongly consistent.
    const { rows: br } = await q.query(
      "UPDATE wallets SET balance_cents = balance_cents - $1, version = version + 1, updated_at = now() WHERE user_id = $2 RETURNING balance_cents",
      [price, userId],
    );
    await recordLedger(q, userId, lotId, "capture", price, Number(br[0].balance_cents));
    await q.query(
      "UPDATE wallets SET balance_cents = balance_cents + $1, version = version + 1, updated_at = now() WHERE user_id = $2",
      [price, lot.seller_id],
    );
    await recordLedger(q, lot.seller_id, lotId, "payout", price, null);

    const { rows } = await q.query(
      `UPDATE lots SET qty_claimed = $1,
                       status = CASE WHEN $2 THEN 'settled' ELSE 'live' END,
                       settled_at = CASE WHEN $2 THEN now() ELSE settled_at END,
                       winner_id = CASE WHEN $2 THEN $3 ELSE winner_id END,
                       clearing_cents = $4,
                       version = version + 1
       WHERE id = $5 RETURNING *`,
      [newClaimed, soldOut, userId, price, lotId],
    );

    const bidId = newId("bid");
    await q.query(
      "INSERT INTO bids (id, lot_id, user_id, amount_cents, region, status) VALUES ($1,$2,$3,$4,$5,'won')",
      [bidId, lotId, userId, price, region],
    );

    return { ok: true as const, bidId, lot: rowToLot(rows[0]) };
  });
}

/** Settle an ended English auction: capture the held funds, pay the seller. */
export async function settleEnglishLot(lotId: string): Promise<Lot> {
  const db = await getDb();
  return db.tx(async (q) => {
    const lot = await lockLot(q, lotId);
    if (lot.auction_type !== "english") return lot;
    if (lot.status === "settled") return lot;
    if (!lot.ends_at || Date.parse(lot.ends_at) > Date.now())
      throw new BidError("not_live", "Auction has not ended yet");

    if (lot.high_bidder_id && lot.high_bid_cents != null) {
      // Convert the winner's hold into a payment, then pay the seller.
      const { rows: br } = await q.query(
        "UPDATE wallets SET balance_cents = balance_cents - $1, held_cents = held_cents - $1, version = version + 1, updated_at = now() WHERE user_id = $2 RETURNING balance_cents",
        [lot.high_bid_cents, lot.high_bidder_id],
      );
      await recordLedger(q, lot.high_bidder_id, lotId, "capture", lot.high_bid_cents, Number(br[0].balance_cents));
      await q.query(
        "UPDATE wallets SET balance_cents = balance_cents + $1, version = version + 1, updated_at = now() WHERE user_id = $2",
        [lot.high_bid_cents, lot.seller_id],
      );
      await recordLedger(q, lot.seller_id, lotId, "payout", lot.high_bid_cents, null);
      await q.query("UPDATE bids SET status = 'won' WHERE lot_id = $1 AND user_id = $2 AND status = 'accepted'", [
        lotId,
        lot.high_bidder_id,
      ]);
    }

    const { rows } = await q.query(
      `UPDATE lots SET status = 'settled', settled_at = now(),
                       winner_id = $1, clearing_cents = $2, version = version + 1
       WHERE id = $3 RETURNING *`,
      [lot.high_bidder_id, lot.high_bid_cents, lotId],
    );
    return rowToLot(rows[0]);
  });
}

// ---- locking helpers (SELECT ... FOR UPDATE; OCC-checked on DSQL) ----------
async function lockLot(q: Querier, lotId: string): Promise<Lot> {
  const { rows } = await q.query("SELECT * FROM lots WHERE id = $1 FOR UPDATE", [lotId]);
  if (!rows[0]) throw new BidError("not_found", "Lot not found");
  return mapLot(rows[0]);
}

async function lockWallet(q: Querier, userId: string): Promise<{ balance: number; held: number }> {
  const { rows } = await q.query("SELECT balance_cents, held_cents FROM wallets WHERE user_id = $1 FOR UPDATE", [
    userId,
  ]);
  if (!rows[0]) throw new BidError("no_wallet", "Wallet not found");
  return { balance: Number(rows[0].balance_cents), held: Number(rows[0].held_cents) };
}
