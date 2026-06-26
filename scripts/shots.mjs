#!/usr/bin/env node
// Auto-capture preview screenshots of the running app into ./preview
// Requires: npm i -D playwright   (then: node scripts/shots.mjs)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = "preview";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function newPage(theme) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((t) => {
    localStorage.setItem("lz_user", "user_aria");
    localStorage.setItem("lz_region", "us-east-1");
    if (t === "dark") localStorage.setItem("lz_theme", "dark");
  }, theme);
  return ctx.newPage();
}

async function go(page, path, waitText) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  if (waitText) await page.getByText(waitText, { exact: false }).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1600);
}
async function shot(page, name, full = false) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log("✓", `${OUT}/${name}.png`);
}
async function runProof(page) {
  await page.getByRole("button", { name: /Run the contention proof/i }).click();
  await page.getByText(/Invariant held/i).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
}

// --- light (default) ---
const p = await newPage("light");
await go(p, "/", "Live now");
await shot(p, "01-home", true);
await go(p, "/auctions/lot_firebird", "Bid ledger");
await shot(p, "02-auction-english");
await go(p, "/auctions/lot_genesis", "Claim now");
await shot(p, "03-auction-dutch");
await go(p, "/proof", "Run the contention proof");
await runProof(p);
await shot(p, "04-proof", true);
await go(p, "/wallet", "wallet");
await shot(p, "05-wallet");

// --- dark theme ---
const d = await newPage("dark");
await go(d, "/", "Live now");
await shot(d, "06-home-dark", true);
await go(d, "/proof", "Run the contention proof");
await runProof(d);
await shot(d, "07-proof-dark", true);

await browser.close();
console.log("done");
