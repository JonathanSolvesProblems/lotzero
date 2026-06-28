# LotZero data model

Two stores, each with a deliberate model chosen for its job. The boundary between them is the
architecture: **money must be exactly right** (Aurora DSQL), **the firehose must be fast and
huge** (DynamoDB).

---

## 1. Amazon Aurora DSQL, the money + scarcity plane (relational)

Strongly-consistent, optimistic-concurrency transactions hold everything that must be correct
under global contention. Modeled for DSQL specifically: **no foreign keys, no sequences, no JSON
types, one DDL statement per transaction**; integrity is enforced inside the transactions, and
`SELECT … FOR UPDATE` enrolls rows in the OCC conflict set rather than locking.

| Table | Primary key | Holds | Notes |
|---|---|---|---|
| `users` | `id` | identity, home Region, avatar | app-generated IDs (no sequences) |
| `wallets` | `user_id` | `balance_cents`, `held_cents`, `version` | money in integer cents; never floats |
| `lots` | `id` | auction state, type, high bid, qty, settlement | `english` / `dutch` / `drop` |
| `bids` | `id` | append-only bid ledger | status: accepted / outbid / won / rejected |
| `ledger_entries` | `id` | every cent that moves | kinds: topup / hold / release / capture / payout |

**Invariants enforced by the transactions** (see `src/lib/domain/bids.ts`):
1. A lot's high bid only ever increases; exactly one high bidder.
2. `qty_claimed` never exceeds `qty_total` → zero oversells, globally.
3. `held + spent` never exceeds funded balance → zero double-spends, even across Regions.

On conflict, the transaction fails with `40001` and `db.tx()` retries the whole thing.

---

## 2. Amazon DynamoDB, the social firehose (single-table design)

One table (`lotzero_firehose`), many entity types, keyed for the app's access patterns. Item
collections are grouped by lot (`LOT#<id>`) so chat, presence, and reactions for a lot live in a
single partition and come back in one query. TTL auto-expires ephemeral data. Counters use atomic
`ADD` to avoid read-modify-write races.

### Entities and keys

| Entity | PK | SK | Write |
|---|---|---|---|
| Chat message | `LOT#<lot>` | `MSG#<ts>#<id>` | PutItem (+ TTL) |
| Presence | `LOT#<lot>` | `PRES#<userId>` | PutItem (+ TTL ~60s) |
| Reaction counter | `LOT#<lot>` | `REACT#<emoji>` | UpdateItem `ADD count :1` |
| Leaderboard entry | `LB#<lot>` | `USER#<userId>` | UpdateItem `ADD score :n` |
| Global feed event | `FEED#GLOBAL` | `<ts>#<id>` | PutItem (+ TTL) |

### Access patterns → query

| # | Access pattern | Operation |
|---|---|---|
| 1 | Recent chat for a lot | `Query pk=LOT#<lot> AND begins_with(sk,'MSG#')`, `ScanIndexForward=false`, `Limit` |
| 2 | Who's watching a lot | `Query pk=LOT#<lot> AND begins_with(sk,'PRES#')`, filter `ts > cutoff` |
| 3 | Increment a reaction | `UpdateItem ADD count` (atomic counter) |
| 4 | Reaction tallies for a lot | `Query pk=LOT#<lot> AND begins_with(sk,'REACT#')` |
| 5 | Bump a participant's score | `UpdateItem ADD score` |
| 6 | Top participants for a lot | `Query pk=LB#<lot>` → top-N by score |
| 7 | Append a global activity event | `PutItem pk=FEED#GLOBAL` |
| 8 | Recent global activity | `Query pk=FEED#GLOBAL`, `ScanIndexForward=false`, `Limit` |

Implementation: `src/lib/dynamo/firehose.ts`. Billing is **on-demand** (pay-per-request); the
table scales with traffic and costs nothing at idle.

### Scaling notes (honest)
- `FEED#GLOBAL` is a single hot partition. Fine for the demo; at true millions/sec it would be
  **sharded by time bucket** (`FEED#<yyyymmddhh>`) or fanned out, and the leaderboard would move
  to a GSI keyed by score. The single-table shape is chosen so those evolutions don't require new
  tables.

---

Why two databases at all: money needs **strong consistency under contention** (DSQL); the
firehose needs **very high write throughput where eventual consistency is fine** (DynamoDB).
Putting either workload on the other store would be the wrong tool.
