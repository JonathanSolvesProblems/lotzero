# Provisioning LotZero on real AWS + Vercel

The app runs with zero setup locally (PGlite + in-memory firehose). These steps
move each plane onto production AWS and deploy the frontend on Vercel.

## 1. Aurora DSQL (the money ledger)

1. In the AWS console (or CLI) create an **Aurora DSQL** cluster. A single-Region
   cluster is enough for the demo; create a **multi-Region peered** cluster to
   demo active-active strong consistency across two endpoints.
2. Note the cluster endpoint: `<cluster-id>.dsql.<region>.on.aws`.
3. Grant your principal `dsql:DbConnect` / `dsql:DbConnectAdmin` on the cluster.
4. The app creates its tables on first connect. Then apply the async indexes:
   ```
   psql "host=<endpoint> user=admin dbname=postgres sslmode=require" -f infra/dsql-indexes.sql
   ```
5. Set env: `DSQL_CLUSTER_ENDPOINT`, `DSQL_REGION`, `DSQL_USER=admin`, `DSQL_DATABASE=postgres`.

Auth uses short-lived IAM tokens minted by `@aws/aurora-dsql-node-postgres-connector`
— no database password is ever stored.

## 2. DynamoDB (the social firehose)

```
aws dynamodb create-table --cli-input-json file://infra/dynamodb-table.json
aws dynamodb update-time-to-live --table-name lotzero_firehose \
  --time-to-live-specification "Enabled=true, AttributeName=ttl"
```
Set env: `DYNAMODB_TABLE=lotzero_firehose`.

## 3. Vercel

1. Push this folder to a Git repo and import it in Vercel (framework auto-detected).
2. Add the **AWS** integration from the Vercel Marketplace and connect Aurora DSQL,
   or add an OIDC-federated AWS role so functions get credentials with no static keys.
3. Add the env vars from steps 1–2 (Project → Settings → Environment Variables).
4. Deploy. Reseed demo data once with `BASE_URL=https://<app>.vercel.app node scripts/seed.mjs`.

## 4. Verify correctness in production

```
BASE_URL=https://<app>.vercel.app node scripts/loadtest.mjs
```
Expect every row to read `✅ held` with `oversell = 0` and `dblspend = 0`, and the
`mode` column to read `dsql`.
