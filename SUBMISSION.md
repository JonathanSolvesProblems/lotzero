# H0 submission kit — LotZero

Everything you need to paste into Devpost, plus the demo-video script and the content-bonus
outline. Track: **Million-scale global app** (Track 3).

---

## Devpost form — paste these in (field by field)

**Project name** (≤60 chars)
```
LotZero — global live auctions with zero oversells
```

**Elevator pitch** (≤200 chars)
```
Global live auctions where the last lot can only be won once. Money runs on Amazon Aurora DSQL (strongly consistent), the social firehose on DynamoDB. Zero oversells, zero double-spends, proven live.
```

**Built with** (comma-separated tags)
```
next.js, react, typescript, tailwind-css, amazon-aurora-dsql, amazon-dynamodb, postgresql, aws-sdk, vercel, v0, pglite, node.js
```

**App Status:** `New`

**Which Track:** `Million-scale global app`

**Published Vercel/v0 Link** (the live site, NOT the repo)
```
https://lotzero-sandy.vercel.app
```

**Vercel Team ID** (format `team_xxxxx` — this is the TEAM id, not the Project id)
```
team_oCnzopTq37mAxxAWcS9lpNVl
```

**Which database did you use?** (select all that apply)
```
Amazon Aurora DSQL, Amazon DynamoDB
```

**Architecture diagram (required):** upload `docs/architecture.png` (PNG is allowed; the
editable source is `docs/architecture.drawio`, openable at app.diagrams.net).

**Screenshot proving AWS database usage (required):** upload your AWS Console screenshot of the
Aurora DSQL cluster `dsql-cluster-1` (Active, Ohio) and/or the DynamoDB table `lotzero_firehose`.

**Testing Instructions for the Judges** (private to judges)
```
Open https://lotzero-sandy.vercel.app — no login required, demo wallets are pre-funded.
Use the identity switcher (top-right) to act as different users and the Region selector to
act from different AWS Regions. Open any lot and place a bid; open the same lot in two tabs as
two different users to feel the contention. To see the core guarantee, go to /proof and click
"Run the contention proof": it fires hundreds of concurrent claims across five AWS Regions
against the real Aurora DSQL cluster and reports zero oversells and zero double-spends.
```

**URL(s) to your OPTIONAL content for Bonus Points:** leave blank unless you publish the
#H0Hackathon post (see outline at the bottom). If you do, paste the URL and include the line:
"I created this content for the purposes of entering the H0: Hack the Zero hackathon."

---

## Project Story (the "About the project" markdown field)

## Inspiration
Real-time global commerce forces a brutal tradeoff. Put your money ledger in a single Region
and it is correct but slow for everyone far away. Spread it across Regions with
eventually-consistent NoSQL and it is fast but unsafe: two Regions can both sell the last item,
and someone gets a refund email. I wanted to build the thing that is supposed to be impossible
on a weekend stack: a worldwide live auction where the last lot can only ever be won once.

## What it does
LotZero runs real-time auctions for the whole planet at once. Bidders anywhere compete for the
same lot in the same millisecond, and the platform guarantees exactly one winner, money that is
never lost or duplicated, and a truthful view in every Region. It supports English (ascending),
Dutch (falling-price, first-claim-wins), and fixed-price drops, with live chat, presence,
reactions, leaderboards, and a global activity feed. A built-in Proof page fires hundreds of
concurrent claims across five AWS Regions and measures the guarantee live.

## How we built it
A two-plane architecture with a deliberate consistency boundary:
- Money and scarcity (Amazon Aurora DSQL): wallets, bids, holds, settlement and limited
  inventory run as strongly-consistent, optimistic-concurrency transactions. DSQL's
  active-active, multi-Region strong consistency means contention resolves correctly with no
  cross-Region locks and no lost writes.
- Social firehose (Amazon DynamoDB): chat, presence, reactions, leaderboards and the activity
  feed use a single-table design built for very high write volume, where eventual consistency
  is fine.
- Front-end: Next.js deployed on Vercel; the home "How it works" section and the About and FAQ
  pages were built in v0. Auth to DSQL uses short-lived IAM tokens (no static password), and
  the same SQL runs locally on embedded PGlite and in production on DSQL.

## Challenges we ran into
Aurora DSQL is PostgreSQL-compatible but deliberately different: no foreign keys, no sequences,
no JSON types, exactly one DDL statement per transaction, and `SELECT ... FOR UPDATE` is an
optimistic-concurrency conflict check rather than a lock. We modeled around all of it:
application-generated IDs, referential integrity enforced inside the transactions, automatic
retry on serialization conflicts, and async indexes applied out of band. Getting the "exactly
one winner under true concurrency" invariant right, and proving it, was the heart of the work.

## Accomplishments that we're proud of
Measured correctness, not claims. Under 200 concurrent global claims on a real Aurora DSQL
cluster, the system holds zero oversells and zero double-spends, with money conserved and no
negative balances, every run. It is deployed and shippable, and an end-to-end test suite plus a
contention load test gate it.

## What we learned
Aurora DSQL turns a previously-hard problem (globally-consistent contention) into an ordinary
CRUD app, which frees you to pair it with DynamoDB for the parts that just need to be fast and
huge. Good architecture here is choosing the right database per job and drawing the consistency
boundary on purpose.

## What's next for LotZero
A real payment processor, accounts and KYC, anti-fraud and bid-sniping protection, WebSockets
and DynamoDB Streams for the firehose instead of polling, and a multi-Region peered DSQL
deployment to light up the live cross-Region demo (the code is already wired for it).

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
The front-end is a Next.js app deployed on Vercel; the home page's "How it works"
section was built in v0.

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

**2:35–2:50 — Close.** Show the live Vercel URL. "Next.js on Vercel, on Aurora DSQL and
DynamoDB. Shippable today. Zero oversells, zero double-spends. That's LotZero."

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
