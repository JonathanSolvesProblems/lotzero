-- Aurora DSQL secondary indexes.
--
-- DSQL creates indexes asynchronously, so the keyword is CREATE INDEX ASYNC
-- (plain CREATE INDEX is rejected). Apply these once after the tables exist.
-- The app creates the tables on first connect; run this afterward, e.g.:
--   psql "host=<endpoint> user=admin dbname=postgres sslmode=require" -f infra/dsql-indexes.sql
--
-- Check progress with: SELECT * FROM sys.jobs;  (DSQL surfaces async index jobs)

CREATE INDEX ASYNC idx_lots_status ON lots (status);
CREATE INDEX ASYNC idx_bids_lot ON bids (lot_id, created_at);
CREATE INDEX ASYNC idx_ledger_user ON ledger_entries (user_id, created_at);
