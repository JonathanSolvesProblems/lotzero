// Aurora DSQL schema. Deliberately FK-free and sequence-free because DSQL does
// not support FOREIGN KEY constraints or SERIAL/sequences, and JSON/JSONB-free
// because DSQL does not support JSON types. Referential integrity is enforced in
// the strongly-consistent transactions in domain/. DSQL also allows only one DDL
// statement per transaction, so the client applies each CREATE TABLE separately.
// This exact DDL runs unchanged on PGlite (local) and Aurora DSQL (prod).

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  handle      TEXT NOT NULL,
  region      TEXT NOT NULL DEFAULT 'us-east-1',
  avatar      TEXT NOT NULL DEFAULT '🙂',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  user_id       TEXT PRIMARY KEY,
  balance_cents BIGINT NOT NULL DEFAULT 0,
  held_cents    BIGINT NOT NULL DEFAULT 0,
  version       BIGINT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lots (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  description         TEXT,
  image_url           TEXT,
  seller_id           TEXT NOT NULL,
  category            TEXT,
  auction_type        TEXT NOT NULL DEFAULT 'english',
  status              TEXT NOT NULL DEFAULT 'live',
  currency            TEXT NOT NULL DEFAULT 'USD',
  start_cents         BIGINT NOT NULL,
  min_increment_cents BIGINT NOT NULL DEFAULT 100,
  high_bid_cents      BIGINT,
  high_bidder_id      TEXT,
  bid_count           BIGINT NOT NULL DEFAULT 0,
  dutch_floor_cents   BIGINT,
  dutch_drop_cents    BIGINT,
  dutch_interval_secs INTEGER,
  qty_total           INTEGER NOT NULL DEFAULT 1,
  qty_claimed         INTEGER NOT NULL DEFAULT 0,
  ends_at             TIMESTAMPTZ,
  started_at          TIMESTAMPTZ DEFAULT now(),
  settled_at          TIMESTAMPTZ,
  winner_id           TEXT,
  clearing_cents      BIGINT,
  version             BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bids (
  id           TEXT PRIMARY KEY,
  lot_id       TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  region       TEXT NOT NULL DEFAULT 'us-east-1',
  status       TEXT NOT NULL DEFAULT 'accepted',
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  lot_id              TEXT,
  kind                TEXT NOT NULL,
  amount_cents        BIGINT NOT NULL,
  balance_after_cents BIGINT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

// Recommended secondary indexes. DSQL requires async index creation
// (CREATE INDEX ASYNC ...), so these live in infra/dsql-indexes.sql and are
// applied out-of-band. PGlite gets them via the plain statements below.
export const LOCAL_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_lots_status ON lots (status);
CREATE INDEX IF NOT EXISTS idx_bids_lot ON bids (lot_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_entries (user_id, created_at);
`;
