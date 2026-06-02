import { getDb } from "../db/client";
import { mapLot, mapBid } from "./map";
import type { Lot, Bid, User } from "../types";

const LOT_SELECT = `
  SELECT l.*, s.handle AS seller_handle, h.handle AS high_bidder_handle
  FROM lots l
  LEFT JOIN users s ON s.id = l.seller_id
  LEFT JOIN users h ON h.id = l.high_bidder_id
`;

export async function listLots(): Promise<Lot[]> {
  const db = await getDb();
  const { rows } = await db.query(
    `${LOT_SELECT}
     ORDER BY (l.status = 'live') DESC, l.ends_at ASC NULLS LAST, l.created_at DESC`,
  );
  return rows.map(mapLot);
}

export async function getLot(lotId: string): Promise<Lot | null> {
  const db = await getDb();
  const { rows } = await db.query(`${LOT_SELECT} WHERE l.id = $1`, [lotId]);
  return rows[0] ? mapLot(rows[0]) : null;
}

export async function getBids(lotId: string, limit = 20): Promise<Bid[]> {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT b.*, u.handle AS user_handle
     FROM bids b LEFT JOIN users u ON u.id = b.user_id
     WHERE b.lot_id = $1
     ORDER BY b.created_at DESC LIMIT $2`,
    [lotId, limit],
  );
  return rows.map(mapBid);
}

export async function listUsers(): Promise<(User & { balance_cents: number; held_cents: number })[]> {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT u.id, u.handle, u.region, u.avatar,
            COALESCE(w.balance_cents, 0) AS balance_cents,
            COALESCE(w.held_cents, 0) AS held_cents
     FROM users u LEFT JOIN wallets w ON w.user_id = u.id
     WHERE u.id <> 'user_house'
     ORDER BY u.handle`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    handle: String(r.handle),
    region: String(r.region),
    avatar: String(r.avatar),
    balance_cents: Number(r.balance_cents),
    held_cents: Number(r.held_cents),
  }));
}

export async function getUser(userId: string): Promise<User | null> {
  const db = await getDb();
  const { rows } = await db.query("SELECT id, handle, region, avatar FROM users WHERE id = $1", [userId]);
  if (!rows[0]) return null;
  const r = rows[0];
  return { id: String(r.id), handle: String(r.handle), region: String(r.region), avatar: String(r.avatar) };
}
