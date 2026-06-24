# H0 submission kit — LotZero

Everything you need to paste into Devpost, plus the demo-video script and the content-bonus
outline. Track: **Million-scale global app** (Track 3).

---

## Text description (Devpost)

**LotZero — global live auctions with zero oversells and zero double-spends.**

LotZero is a real-time auction marketplace for the whole planet at once. Bidders anywhere can
race for the same scarce lot in the same millisecond, and the system guarantees exactly one
winner, money that is never lost or duplicated, and a truthful view in every Region.

It runs on a deliberate two-store architecture. The **money + scarcity plane** — wallets,
bids, holds, settlement, limited inventory — runs on **Amazon Aurora DSQL**, using its
active-active, multi-Region strong consistency and optimistic concurrency control so that
contention resolves correctly without conflict-resolution or lost writes. The **social
firehose** — chat, presence, reactions, leaderboards, and a global activity feed — runs on
**Amazon DynamoDB** with a single-table design built for millions of append-mostly events.
The front-end is a Next.js app built with v0 and deployed on Vercel.

The insight: globally-consistent contention used to be impossible to build correctly on a
weekend stack. Aurora DSQL turns it into a CRUD app. We prove it: a built-in contention
console (and a CLI load test) fire hundreds of simultaneous claims across five AWS Regions and
measure **0 oversells, 0 double-spends, exactly the right number of winners**, every run.

**AWS database(s) used:** Amazon Aurora DSQL (primary system of record — wallets, lots, bids,
ledger, settlement) and Amazon DynamoDB (real-time social firehose).

---

## Required submission checklist

- [ ] **Under 3:00** demo video (script below), uploaded to YouTube (public, not unlisted)
- [ ] Published Vercel project link + Vercel Team ID
- [ ] Architecture diagram — ready at [docs/architecture.png](docs/architecture.png) (regenerate with `node -e` + sharp from `docs/architecture.svg` if edited)
- [ ] Screenshot proving AWS Database usage — either the **AWS Console** showing the Aurora DSQL
      cluster + DynamoDB table, or the **Vercel Storage / Integration** config (either is accepted)
- [ ] Text description (above) with the AWS databases named

---

## Demo video script (target 2:45, hard cap 3:00)

Hard constraint: the video must be **under 3 minutes**. Lead with the wow, keep one feature per
beat, and let the README/architecture image carry the rest. Record against the **live Vercel
URL on real Aurora DSQL + DynamoDB** (not localhost) — these 10 database judges will look.

**0:00–0:18 — Hook + problem (open on the race).** Two browser windows side by side, two users
in two Regions, on the last unit of a drop. Both click at once. "On most stacks, both might win
and someone gets a refund email. Watch." One wins, one is cleanly rejected, live. "That's
LotZero — global live auctions where exactly one person can win, ever."

**0:18–0:50 — The product (who/what).** Live board. Open a Dutch falling-price lot, claim it
from Tokyo as the price ticks down. Open an English lot, bid — funds show as *held* in the
wallet; another user outbids and the hold releases. "Money on Aurora DSQL. The live chat,
presence and reactions next to it are on DynamoDB."

**0:50–1:35 — The proof (the differentiator).** Open `/proof`. Run **oversell**: 200 buyers
across 5 Regions, 1 unit → **1 winner, 0 oversells**. Run **double-spend**: one buyer funded for
one purchase races 150 lots → **1 winner, 0 double-spends, never negative**. "This is measured
under real concurrency, not claimed."

**1:35–2:05 — Active-active, live [if two-Region cluster is up].** Still on `/proof`, hit "Write
in us-east-1 → read in eu-west-1". Value written through one Region's endpoint, read straight
back through the other, identical, with the cross-Region latency. "Two Regions, one
strongly-consistent database. That's Aurora DSQL." *(If single-Region, replace with a 15s
architecture-diagram beat instead.)*

**2:05–2:35 — Craft + why it's shippable.** Cut to the architecture diagram. "Deliberate
two-store design. On DSQL: no foreign keys, no sequences, OCC with automatic retry, IAM-token
auth via Vercel OIDC. Same code runs locally on embedded Postgres and in production on DSQL."

**2:35–2:50 — Close.** Show the live Vercel URL. "Built with v0, deployed on Vercel, on Aurora
DSQL and DynamoDB. Shippable today. Zero oversells, zero double-spends. That's LotZero."

> Negative-control option (if you have 5s to spare): on a sold-out lot, click claim again on
> camera and show the clean rejection. Proves the system stays correct, not just functional.

**Negative-control beat (optional, strong):** on a sold-out lot, click claim again on camera
and show the clean rejection. Proves the system stays silent when it should.

---

## Content-bonus outline (#H0Hackathon)

Title: *"Holding money on Aurora DSQL: building a globally-consistent auction with zero
oversells"* (dev.to / builder.aws.com / LinkedIn).

1. The consistency-vs-scale tradeoff and why it blocks real-time global commerce.
2. The two-plane design: DSQL for money, DynamoDB for the firehose.
3. Designing for DSQL: no FKs, no sequences, OCC retry loops, async indexes, IAM auth.
4. The bid/claim/settle transactions, with code.
5. The contention proof: how I measured 0 oversells / 0 double-spends, with the numbers.
6. Same SQL local-and-prod (PGlite → DSQL) and the Vercel OIDC deploy.

Include the required line: *"I created this content for the purposes of entering the H0: Hack
the Zero hackathon."* Use **#H0Hackathon**.
