#!/usr/bin/env node
/**
 * Contention load test / CI gate.
 *
 * Hits a running LotZero server's /api/proof endpoint across several scenarios
 * and concurrency levels, prints a table, and exits non-zero if any invariant
 * is ever violated (zero oversells, zero double-spends, money conserved).
 *
 *   node scripts/loadtest.mjs                 # against http://localhost:3000
 *   BASE_URL=https://your.vercel.app node scripts/loadtest.mjs
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

const RUNS = [
  { scenario: "oversell", concurrency: 50, qty: 1 },
  { scenario: "oversell", concurrency: 100, qty: 3 },
  { scenario: "oversell", concurrency: 200, qty: 10 },
  { scenario: "double_spend", concurrency: 50, qty: 1 },
  { scenario: "double_spend", concurrency: 150, qty: 1 },
];

async function runOne(cfg) {
  const res = await fetch(`${BASE}/api/proof`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...cfg, priceCents: 10000 }),
  });
  if (!res.ok) throw new Error(`proof endpoint returned ${res.status}`);
  return res.json();
}

function pad(s, n) {
  s = String(s);
  return s + " ".repeat(Math.max(0, n - s.length));
}

const main = async () => {
  console.log(`\nLotZero contention proof → ${BASE}\n`);
  console.log(
    pad("scenario", 15) + pad("conc", 6) + pad("winners", 9) + pad("oversell", 10) + pad("dblspend", 10) + pad("ms", 7) + pad("mode", 8) + "result",
  );
  console.log("-".repeat(78));

  let allHeld = true;
  for (const cfg of RUNS) {
    const r = await runOne(cfg);
    if (!r.invariantHeld) allHeld = false;
    console.log(
      pad(r.scenario, 15) +
        pad(r.concurrency, 6) +
        pad(r.winners, 9) +
        pad(r.oversells, 10) +
        pad(r.doubleSpends, 10) +
        pad(r.elapsedMs, 7) +
        pad(r.mode, 8) +
        (r.invariantHeld ? "✅ held" : "❌ VIOLATED"),
    );
  }

  console.log("-".repeat(78));
  console.log(allHeld ? "\n✅ All invariants held under contention.\n" : "\n❌ Invariant violation detected.\n");
  process.exit(allHeld ? 0 : 1);
};

main().catch((e) => {
  console.error("load test failed:", e.message);
  process.exit(1);
});
