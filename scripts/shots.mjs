#!/usr/bin/env node
// Auto-capture preview screenshots of the running app into ./preview
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = "preview";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
// act as a known identity so header balance + wallet render
await ctx.addInitScript(() => {
  localStorage.setItem("lz_user", "user_aria");
  localStorage.setItem("lz_region", "us-east-1");
});
const page = await ctx.newPage();

async function go(path, waitText) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  if (waitText) await page.getByText(waitText, { exact: false }).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1600);
}

async function shot(name, full = false) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log("✓", `${OUT}/${name}.png`);
}

// 1. Home
await go("/", "Live now");
await shot("01-home", true);

// 2. English auction room
await go("/auctions/lot_firebird", "Bid ledger");
await shot("02-auction-english");

// 3. Dutch falling-price lot
await go("/auctions/lot_genesis", "Claim now");
await shot("03-auction-dutch");

// 4. Proof — run it, then capture the report
await go("/proof", "Run the contention proof");
await page.getByRole("button", { name: /Run the contention proof/i }).click();
await page.getByText(/Invariant held/i).first().waitFor({ timeout: 30000 });
await page.waitForTimeout(800);
await shot("04-proof", true);

// 5. Wallet
await go("/wallet", "wallet");
await shot("05-wallet");

await browser.close();
console.log("done");
