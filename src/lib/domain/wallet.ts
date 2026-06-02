import { getDb, type Querier } from "../db/client";
import { newId } from "../ids";
import { mapWallet, mapLedger } from "./map";
import type { Wallet, LedgerEntry } from "../types";

// Append a ledger row inside an existing transaction. Every cent that moves
// leaves a trace; the wallet balance is always reconstructable from this log.
export async function recordLedger(
  q: Querier,
  userId: string,
  lotId: string | null,
  kind: LedgerEntry["kind"],
  amountCents: number,
  balanceAfter: number | null,
): Promise<void> {
  await q.query(
    `INSERT INTO ledger_entries (id, user_id, lot_id, kind, amount_cents, balance_after_cents)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [newId("led"), userId, lotId, kind, amountCents, balanceAfter],
  );
}

export async function getWallet(userId: string): Promise<Wallet | null> {
  const db = await getDb();
  const { rows } = await db.query("SELECT * FROM wallets WHERE user_id = $1", [userId]);
  return rows[0] ? mapWallet(rows[0]) : null;
}

export async function topUp(userId: string, amountCents: number): Promise<Wallet> {
  const db = await getDb();
  return db.tx(async (q) => {
    const { rows } = await q.query(
      `UPDATE wallets SET balance_cents = balance_cents + $1, version = version + 1, updated_at = now()
       WHERE user_id = $2 RETURNING *`,
      [amountCents, userId],
    );
    const w = mapWallet(rows[0]);
    await recordLedger(q, userId, null, "topup", amountCents, w.balance_cents);
    return w;
  });
}

export async function getLedger(userId: string, limit = 25): Promise<LedgerEntry[]> {
  const db = await getDb();
  const { rows } = await db.query(
    "SELECT * FROM ledger_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
    [userId, limit],
  );
  return rows.map(mapLedger);
}
