#!/usr/bin/env node
// Reseed demo data on a running server. Useful before a demo take.
//   node scripts/seed.mjs   (against http://localhost:3000)
const BASE = process.env.BASE_URL || "http://localhost:3000";
const res = await fetch(`${BASE}/api/seed`, { method: "POST" });
const data = await res.json().catch(() => ({}));
if (res.ok) console.log(`✅ reseeded (${data.mode})`);
else {
  console.error("seed failed:", res.status, data);
  process.exit(1);
}
