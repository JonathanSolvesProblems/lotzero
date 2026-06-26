#!/usr/bin/env node
// End-to-end functional test against a running LotZero (local or live).
//   BASE_URL=https://lotzero-sandy.vercel.app node scripts/e2e.mjs
// Exercises the real API + Aurora DSQL transactions and asserts behaviour.
const BASE = process.env.BASE_URL || "http://localhost:3000";

let pass = 0,
  fail = 0;
const ok = (name, cond, detail) => {
  if (cond) {
    pass++;
    console.log("  ✓", name);
  } else {
    fail++;
    console.log("  ✗", name, detail !== undefined ? JSON.stringify(detail) : "");
  }
};
const jget = async (p) => {
  const r = await fetch(BASE + p);
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const jpost = async (p, b) => {
  const r = await fetch(BASE + p, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(b || {}),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

console.log(`\nLotZero E2E → ${BASE}\n`);

// 0. clean slate
const seed = await jpost("/api/seed");
ok("seed resets demo data", seed.body.ok === true, seed.body);
console.log("  mode:", seed.body.mode);

// 1. catalog
const users = await jget("/api/users");
// /api/users excludes the house/seller account, so 5 bidders are expected.
ok("5 demo bidders (house excluded)", (users.body.users || []).length === 5, (users.body.users || []).length);
const lots = await jget("/api/auctions");
ok("6 lots, all live", (lots.body.lots || []).length === 6, (lots.body.lots || []).length);

// 2. English auction: bid, reject too-low, outbid, hold accounting
const b1 = await jpost("/api/auctions/lot_console/bid", { userId: "user_aria", amountCents: 260000, region: "us-east-1" });
ok("aria bid accepted", b1.body.ok === true && b1.body.lot.high_bid_cents === 260000, b1.body);

const low = await jpost("/api/auctions/lot_console/bid", { userId: "user_kenji", amountCents: 250000 });
ok("too-low bid rejected (409 too_low)", low.status === 409 && low.body.error === "too_low", low.body);

const b2 = await jpost("/api/auctions/lot_console/bid", { userId: "user_kenji", amountCents: 270000, region: "ap-northeast-1" });
ok("kenji outbids -> new high bidder", b2.body.ok === true && b2.body.lot.high_bidder_id === "user_kenji", b2.body);

const wAria = await jget("/api/wallet?userId=user_aria");
ok("outbid aria's hold released (held=0)", wAria.body.wallet.held_cents === 0, wAria.body.wallet);
const wKenji = await jget("/api/wallet?userId=user_kenji");
ok("kenji funds held = 270000", wKenji.body.wallet.held_cents === 270000, wKenji.body.wallet);

// 3. self-bid guard (house cannot bid) - use seller on its own lot is N/A; test seller guard via claim below

// 4. Dutch claim: first wins, second sold out
const c1 = await jpost("/api/auctions/lot_genesis/claim", { userId: "user_diego", region: "sa-east-1" });
ok("diego claims dutch lot -> settled", c1.body.ok === true && c1.body.lot.status === "settled", c1.body);
const c2 = await jpost("/api/auctions/lot_genesis/claim", { userId: "user_mara" });
ok("second claim rejected (sold out / not live)", c2.status === 409, c2.body);

// 5. wallet topup
const before = (await jget("/api/wallet?userId=user_lena")).body.wallet.balance_cents;
await jpost("/api/wallet/topup", { userId: "user_lena", amountCents: 100000 });
const after = (await jget("/api/wallet?userId=user_lena")).body.wallet.balance_cents;
ok("topup increases balance by 100000", after - before === 100000, { before, after });

// 6. firehose: chat, presence, reactions, feed (DynamoDB plane)
await jpost("/api/auctions/lot_console/chat", { userId: "user_aria", text: "e2e hello", region: "us-east-1" });
await jpost("/api/auctions/lot_console/heartbeat", { userId: "user_aria", region: "us-east-1" });
await jpost("/api/auctions/lot_console/react", { emoji: "🔥" });
const snap = await jget("/api/auctions/lot_console");
ok("chat message persisted", (snap.body.chat || []).some((m) => m.text === "e2e hello"), snap.body.chat);
ok("presence count >= 1", snap.body.presence.count >= 1, snap.body.presence);
ok("reaction counted", (snap.body.reactions || {})["🔥"] >= 1, snap.body.reactions);
const feed = await jget("/api/feed");
ok("global feed has events", (feed.body.feed || []).length > 0, (feed.body.feed || []).length);

// 7. settlement guard: cannot settle a not-yet-ended English lot
const settle = await jpost("/api/auctions/lot_firebird/settle");
ok("settle before end rejected (409)", settle.status === 409, settle.body);

// 8. contention proof on the real DB
const p1 = await jpost("/api/proof", { scenario: "oversell", concurrency: 100, qty: 3 });
ok("oversell race: invariant held, 0 oversells", p1.body.invariantHeld === true && p1.body.oversells === 0, p1.body);
const p2 = await jpost("/api/proof", { scenario: "double_spend", concurrency: 100 });
ok("double-spend race: invariant held, 1 winner", p2.body.invariantHeld === true && p2.body.winners === 1, p2.body);
console.log("  proof mode:", p1.body.mode);

// reset to a clean state for the demo
await jpost("/api/seed");
console.log("\n  (demo data reseeded clean)\n");

console.log(`${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
