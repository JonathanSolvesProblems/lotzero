import { getDb } from "../db/client";
import { claimLot } from "./bids";
import { BidError } from "./errors";
import { newId } from "../ids";

/**
 * The contention proof. We deliberately create a race that a single-region SQL
 * box would have to serialize (slow) and an eventually-consistent multi-region
 * store would get WRONG (oversell / double-spend), then fire it concurrently and
 * measure that Aurora DSQL's strongly-consistent OCC transactions keep the
 * invariant exactly. Everything is created and torn down per run.
 */

const REGIONS = ["us-east-1", "us-west-2", "eu-west-1", "ap-northeast-1", "sa-east-1"];

export interface ProofAttempt {
  i: number;
  user: string;
  region: string;
  outcome: "won" | "rejected";
  code?: string;
}

export interface ProofReport {
  scenario: "oversell" | "double_spend";
  mode: "dsql" | "pglite";
  concurrency: number;
  qtyTotal: number;
  priceCents: number;
  winners: number;
  rejected: number;
  rejections: Record<string, number>;
  // invariants
  oversells: number;
  doubleSpends: number;
  moneyConserved: boolean;
  noNegativeBalances: boolean;
  invariantHeld: boolean;
  elapsedMs: number;
  sample: ProofAttempt[];
}

function tally(results: PromiseSettledResult<{ ok: true }>[], regions: string[], users: string[]) {
  const attempts: ProofAttempt[] = [];
  const rejections: Record<string, number> = {};
  let winners = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      winners++;
      attempts.push({ i, user: users[i], region: regions[i], outcome: "won" });
    } else {
      const code = r.reason instanceof BidError ? r.reason.code : "error";
      rejections[code] = (rejections[code] ?? 0) + 1;
      attempts.push({ i, user: users[i], region: regions[i], outcome: "rejected", code });
    }
  });
  return { attempts, rejections, winners };
}

export async function runProof(opts: {
  scenario?: "oversell" | "double_spend";
  concurrency?: number;
  qty?: number;
  priceCents?: number;
}): Promise<ProofReport> {
  const scenario = opts.scenario ?? "oversell";
  const concurrency = Math.min(Math.max(opts.concurrency ?? 50, 2), 200);
  const priceCents = opts.priceCents ?? 100_00;
  const qtyTotal = scenario === "double_spend" ? 1 : Math.min(opts.qty ?? 1, concurrency);
  const db = await getDb();
  const run = newId("proof").replace("proof_", "");
  const seller = `pseller_${run}`;
  const far = new Date(Date.now() + 3_600_000).toISOString();

  await db.query("INSERT INTO users (id, handle, region, avatar) VALUES ($1,'proof-seller','us-east-1','🏷️')", [seller]);
  await db.query("INSERT INTO wallets (user_id, balance_cents) VALUES ($1,0)", [seller]);

  const buyers: string[] = [];
  const regions: string[] = [];
  const lotIds: string[] = [];

  try {
    if (scenario === "oversell") {
      // One scarce lot, many buyers racing for it from many Regions.
      const lot = `plot_${run}`;
      lotIds.push(lot);
      await db.query(
        `INSERT INTO lots (id, title, seller_id, auction_type, status, start_cents, qty_total, ends_at)
         VALUES ($1,'PROOF: scarce drop',$2,'drop','live',$3,$4,$5)`,
        [lot, seller, priceCents, qtyTotal, far],
      );
      for (let i = 0; i < concurrency; i++) {
        const u = `pbuyer_${run}_${i}`;
        buyers.push(u);
        regions.push(REGIONS[i % REGIONS.length]);
        await db.query("INSERT INTO users (id, handle, region, avatar) VALUES ($1,$2,$3,'🤖')", [u, `bot-${i}`, regions[i]]);
        await db.query("INSERT INTO wallets (user_id, balance_cents) VALUES ($1,$2)", [u, priceCents]);
      }

      const t0 = Date.now();
      const results = await Promise.allSettled(buyers.map((u, i) => claimLot(lot, u, regions[i])));
      const elapsedMs = Date.now() - t0;

      const { attempts, rejections, winners } = tally(results, regions, buyers);
      const { rows } = await db.query("SELECT qty_claimed, qty_total FROM lots WHERE id = $1", [lot]);
      const claimed = Number(rows[0].qty_claimed);
      const { rows: srows } = await db.query("SELECT balance_cents FROM wallets WHERE user_id = $1", [seller]);
      const sellerBal = Number(srows[0].balance_cents);
      const { rows: neg } = await db.query(
        "SELECT count(*)::int AS n FROM wallets WHERE balance_cents < 0 OR held_cents < 0",
      );
      const oversells = Math.max(0, claimed - qtyTotal);

      return finalize({
        scenario,
        mode: db.mode,
        concurrency,
        qtyTotal,
        priceCents,
        winners,
        rejections,
        attempts,
        oversells,
        doubleSpends: 0,
        moneyConserved: sellerBal === winners * priceCents,
        noNegativeBalances: Number(neg[0].n) === 0,
        elapsedMs,
      });
    } else {
      // One buyer with funds for ONE claim races to win MANY lots at once.
      const buyer = `pbuyer_${run}`;
      await db.query("INSERT INTO users (id, handle, region, avatar) VALUES ($1,'proof-buyer','us-east-1','🤖')", [buyer]);
      await db.query("INSERT INTO wallets (user_id, balance_cents) VALUES ($1,$2)", [buyer, priceCents]);
      for (let i = 0; i < concurrency; i++) {
        const lot = `plot_${run}_${i}`;
        lotIds.push(lot);
        buyers.push(buyer);
        regions.push(REGIONS[i % REGIONS.length]);
        await db.query(
          `INSERT INTO lots (id, title, seller_id, auction_type, status, start_cents, qty_total, ends_at)
           VALUES ($1,'PROOF: double-spend lot',$2,'drop','live',$3,1,$4)`,
          [lot, seller, priceCents, far],
        );
      }

      const t0 = Date.now();
      const results = await Promise.allSettled(lotIds.map((lot, i) => claimLot(lot, buyer, regions[i])));
      const elapsedMs = Date.now() - t0;

      const { attempts, rejections, winners } = tally(results, regions, buyers);
      const { rows: brows } = await db.query("SELECT balance_cents FROM wallets WHERE user_id = $1", [buyer]);
      const buyerBal = Number(brows[0].balance_cents);
      // The buyer could fund exactly one claim. Any extra win is a double-spend.
      const doubleSpends = Math.max(0, winners - 1);

      return finalize({
        scenario,
        mode: db.mode,
        concurrency,
        qtyTotal,
        priceCents,
        winners,
        rejections,
        attempts,
        oversells: 0,
        doubleSpends,
        moneyConserved: buyerBal === priceCents - winners * priceCents,
        noNegativeBalances: buyerBal >= 0,
        elapsedMs,
      });
    }
  } finally {
    // Tear down all proof artifacts so the marketplace stays clean.
    const allUsers = [seller, ...new Set(buyers)];
    for (const lot of lotIds) {
      await db.query("DELETE FROM bids WHERE lot_id = $1", [lot]);
      await db.query("DELETE FROM lots WHERE id = $1", [lot]);
    }
    for (const u of allUsers) {
      await db.query("DELETE FROM ledger_entries WHERE user_id = $1", [u]);
      await db.query("DELETE FROM wallets WHERE user_id = $1", [u]);
      await db.query("DELETE FROM users WHERE id = $1", [u]);
    }
  }
}

function finalize(
  p: Omit<ProofReport, "rejected" | "invariantHeld" | "sample"> & { attempts: ProofAttempt[] },
): ProofReport {
  const expectedWinners = p.scenario === "double_spend" ? 1 : p.qtyTotal;
  const invariantHeld =
    p.oversells === 0 &&
    p.doubleSpends === 0 &&
    p.moneyConserved &&
    p.noNegativeBalances &&
    p.winners === Math.min(expectedWinners, p.concurrency);
  return {
    scenario: p.scenario,
    mode: p.mode,
    concurrency: p.concurrency,
    qtyTotal: p.qtyTotal,
    priceCents: p.priceCents,
    winners: p.winners,
    rejected: p.concurrency - p.winners,
    rejections: p.rejections,
    oversells: p.oversells,
    doubleSpends: p.doubleSpends,
    moneyConserved: p.moneyConserved,
    noNegativeBalances: p.noNegativeBalances,
    invariantHeld,
    elapsedMs: p.elapsedMs,
    sample: p.attempts.slice(0, 14),
  };
}
