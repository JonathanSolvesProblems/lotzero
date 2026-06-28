import type { Db } from "./client";
import { newId } from "../ids";

export const DEMO_USERS = [
  { id: "user_aria", handle: "aria", region: "us-east-1", avatar: "🦊", balance: 5_000_00 },
  { id: "user_kenji", handle: "kenji", region: "ap-northeast-1", avatar: "🐯", balance: 5_000_00 },
  { id: "user_lena", handle: "lena", region: "eu-west-1", avatar: "🦉", balance: 5_000_00 },
  { id: "user_diego", handle: "diego", region: "sa-east-1", avatar: "🐆", balance: 5_000_00 },
  { id: "user_mara", handle: "mara", region: "us-west-2", avatar: "🦅", balance: 5_000_00 },
  { id: "user_house", handle: "LotZero House", region: "us-east-1", avatar: "🏛️", balance: 0 },
];

const SELLER = "user_house";
// Lots stay live for days so the deployed demo never shows everything "ended"
// during the judging window. Varied so countdowns differ across lots.
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

interface SeedLot {
  id: string;
  title: string;
  description: string;
  category: string;
  auction_type: "english" | "dutch" | "drop";
  start_cents: number;
  min_increment_cents?: number;
  dutch_floor_cents?: number;
  dutch_drop_cents?: number;
  dutch_interval_secs?: number;
  qty_total?: number;
  ends_at: string | null;
}

export const DEMO_LOTS: SeedLot[] = [
  {
    id: "lot_console",
    title: "Apollo-Era Flight Console",
    description: "Flight-qualified guidance console, restored. One of nine known to exist.",
    category: "Space",
    auction_type: "english",
    start_cents: 2_500_00,
    min_increment_cents: 100_00,
    ends_at: daysFromNow(9),
  },
  {
    id: "lot_firebird",
    title: "1965 Gibson Firebird I",
    description: "All-original reverse Firebird, sunburst. Provenance documented.",
    category: "Music",
    auction_type: "english",
    start_cents: 4_000_00,
    min_increment_cents: 250_00,
    ends_at: daysFromNow(7),
  },
  {
    id: "lot_neotokyo",
    title: "Original Concept Art, Neo Tokyo",
    description: "Hand-inked production cel, signed. Single global edition.",
    category: "Art",
    auction_type: "english",
    start_cents: 900_00,
    min_increment_cents: 50_00,
    ends_at: daysFromNow(5),
  },
  {
    id: "lot_genesis",
    title: "Genesis Sneaker, Last Mint",
    description: "Falling-price drop. First claim anywhere on Earth wins the only pair.",
    category: "Streetwear",
    auction_type: "dutch",
    start_cents: 400_00,
    dutch_floor_cents: 80_00,
    dutch_drop_cents: 20_00,
    dutch_interval_secs: 5,
    qty_total: 1,
    ends_at: daysFromNow(6),
  },
  {
    id: "lot_vip",
    title: "VIP Backstage Pass, World Tour",
    description: "Five passes, one global pool. Dutch price ticks down until they're gone.",
    category: "Experiences",
    auction_type: "dutch",
    start_cents: 600_00,
    dutch_floor_cents: 150_00,
    dutch_drop_cents: 25_00,
    dutch_interval_secs: 4,
    qty_total: 5,
    ends_at: daysFromNow(8),
  },
  {
    id: "lot_keeb",
    title: "Founders Edition Mechanical Keyboard",
    description: "Fixed-price global drop. 50 units, hard cap, no overselling, ever.",
    category: "Tech",
    auction_type: "drop",
    start_cents: 180_00,
    qty_total: 50,
    ends_at: daysFromNow(12),
  },
];

export async function seedIfEmpty(db: Db): Promise<void> {
  const { rows } = await db.query("SELECT count(*)::int AS n FROM users");
  if (Number(rows[0]?.n ?? 0) > 0) return;
  await forceSeed(db);
}

export async function forceSeed(db: Db): Promise<void> {
  await db.query("DELETE FROM ledger_entries");
  await db.query("DELETE FROM bids");
  await db.query("DELETE FROM lots");
  await db.query("DELETE FROM wallets");
  await db.query("DELETE FROM users");

  for (const u of DEMO_USERS) {
    await db.query(
      "INSERT INTO users (id, handle, region, avatar) VALUES ($1,$2,$3,$4)",
      [u.id, u.handle, u.region, u.avatar],
    );
    await db.query(
      "INSERT INTO wallets (user_id, balance_cents) VALUES ($1,$2)",
      [u.id, u.balance],
    );
    if (u.balance > 0) {
      await db.query(
        "INSERT INTO ledger_entries (id, user_id, lot_id, kind, amount_cents, balance_after_cents) VALUES ($1,$2,NULL,'topup',$3,$3)",
        [newId("led"), u.id, u.balance],
      );
    }
  }

  for (const l of DEMO_LOTS) {
    await db.query(
      `INSERT INTO lots
        (id, title, description, seller_id, category, auction_type, status, start_cents,
         min_increment_cents, dutch_floor_cents, dutch_drop_cents, dutch_interval_secs,
         qty_total, ends_at)
       VALUES ($1,$2,$3,$4,$5,$6,'live',$7,$8,$9,$10,$11,$12,$13)`,
      [
        l.id,
        l.title,
        l.description,
        SELLER,
        l.category,
        l.auction_type,
        l.start_cents,
        l.min_increment_cents ?? 100,
        l.dutch_floor_cents ?? null,
        l.dutch_drop_cents ?? null,
        l.dutch_interval_secs ?? null,
        l.qty_total ?? 1,
        l.ends_at,
      ],
    );
  }

  await seedActivity();
}

/**
 * Reset the social firehose (DynamoDB) and place a little *real* activity so the
 * home board isn't empty and the activity feed matches the live bid counts. These
 * are genuine bids/claims through the same domain logic, not fabricated feed text.
 * aria and kenji are left untouched so the demo's two-user race starts clean.
 */
async function seedActivity(): Promise<void> {
  const { placeEnglishBid, claimLot } = await import("../domain/bids");
  const { resetFeed, seedFeedEvent } = await import("../dynamo/firehose");
  const { formatUSD } = await import("../money");

  await resetFeed();

  const userBy = (h: string) => DEMO_USERS.find((u) => u.handle === h)!;
  const events: { kind: string; text: string; lotId: string; region: string }[] = [];

  const bidSeq: [string, string, number][] = [
    ["lot_console", "mara", 2_500_00],
    ["lot_console", "lena", 2_600_00],
    ["lot_console", "diego", 2_700_00],
    ["lot_firebird", "lena", 4_000_00],
    ["lot_firebird", "mara", 4_250_00],
    ["lot_neotokyo", "diego", 900_00],
    ["lot_neotokyo", "lena", 950_00],
  ];
  for (const [lotId, handle, cents] of bidSeq) {
    const u = userBy(handle);
    try {
      const res = await placeEnglishBid(lotId, u.id, cents, u.region);
      events.push({
        kind: "bid",
        text: `${u.avatar} ${u.handle} bid ${formatUSD(res.lot.high_bid_cents)} · ${res.lot.title}`,
        lotId,
        region: u.region,
      });
    } catch {
      /* best-effort demo seeding */
    }
  }

  const claimSeq: [string, string][] = [
    ["lot_vip", "diego"],
    ["lot_vip", "mara"],
    ["lot_keeb", "lena"],
    ["lot_keeb", "diego"],
    ["lot_keeb", "mara"],
  ];
  for (const [lotId, handle] of claimSeq) {
    const u = userBy(handle);
    try {
      const res = await claimLot(lotId, u.id, u.region);
      events.push({
        kind: "claim",
        text: `${u.avatar} ${u.handle} claimed ${res.lot.title} for ${formatUSD(res.lot.clearing_cents)} from ${u.region}`,
        lotId,
        region: u.region,
      });
    } catch {
      /* best-effort demo seeding */
    }
  }

  // Backdate so the feed reads like organic recent activity (newest last in array).
  const base = Date.now();
  const gap = 31_000;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    await seedFeedEvent(e.kind, e.text, e.lotId, e.region, base - (events.length - 1 - i) * gap);
  }
}
