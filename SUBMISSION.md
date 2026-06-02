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

- [ ] ~3–5 min demo video (script below), uploaded to YouTube
- [ ] Published Vercel project link + Vercel Team ID
- [ ] Architecture diagram — ready at [docs/architecture.png](docs/architecture.png) (regenerate with `node -e` + sharp from `docs/architecture.svg` if edited)
- [ ] Screenshot: Vercel **Storage / Integration** configuration showing the AWS database
- [ ] Screenshot: the `/proof` console showing `Invariant held · 0 oversells · 0 double-spends`
- [ ] Text description (above) with the AWS databases named

---

## Demo video script (~4 minutes)

**0:00 — The problem (30s).** "Two shoppers on opposite sides of the world both grab the last
item at the same instant. Who gets it? On most weekend stacks the honest answer is: maybe
both, and someone gets a refund email later. LotZero makes that impossible."

**0:30 — The product (60s).** Open the live board. Show lots: an ascending auction, a Dutch
falling-price drop, a 50-unit fixed drop. Open a lot. Bid as **aria** from **us-east-1** —
you're the high bidder, funds show as *held* in the wallet. Switch identity to **kenji** in
**ap-northeast-1**, bid higher — aria's hold is released, kenji's is placed. Point out the
live chat, presence, and reactions: "this side is DynamoDB."

**1:30 — The architecture (60s).** Show the diagram. "Two planes. Money on Aurora DSQL —
active-active, strongly consistent. The social firehose on DynamoDB. The consistency boundary
is the whole idea." Mention DSQL specifics you respected: no foreign keys, no sequences, OCC
retry, IAM-token auth via the official connector, multi-Region peered cluster.

**2:30 — The proof (75s).** Open `/proof`. Run the **oversell** race: 200 buyers across five
Regions, 1 unit. Result: **1 winner, 0 oversells, invariant held**. Run **double-spend**: one
buyer funded for one purchase tries to win 150 lots at once. Result: **1 winner, 0
double-spends, balance never negative**. "This is the measured guarantee, not a claim."

**3:15 — Active-active, live (30s) [if two-Region cluster provisioned].** Still on `/proof`,
hit "Write in us-east-1 → read in eu-west-1". Show the value written through one Region's
endpoint and read straight back through the other, identical, with the cross-Region read
latency. "Two Regions, one strongly-consistent database. That's Aurora DSQL." (Trim the close
to ~10s to stay under 5 min.)

**3:45 — Close (15s).** "Built with v0, deployed on Vercel, on Aurora DSQL and DynamoDB. Same
code runs locally on an embedded Postgres and in production on DSQL. Zero oversells. Zero
double-spends. That's LotZero."

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
