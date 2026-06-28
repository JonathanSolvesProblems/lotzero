# Preview screenshots

Auto-captured from the live site (`https://lotzero-sandy.vercel.app`) with `node scripts/shots.mjs`.

| File | What it shows |
|---|---|
| `01-home.png` | Home: hero, spec plate (Aurora DSQL / DynamoDB), live lot board (light) |
| `02-auction-english.png` | English auction room: bid panel, wallet hold, Aurora DSQL bid ledger, live chat |
| `03-auction-dutch.png` | Dutch falling-price lot: claim panel |
| `04-proof.png` | Contention proof after a run: "Invariant held", 0 oversells / 0 double-spends, Aurora DSQL |
| `05-wallet.png` | Wallet: available / held / total, ledger |
| `06-faq.png` | FAQ page (built in v0) |
| `07-about.png` | About page (built in v0) |
| `08-home-dark.png` | Home in dark theme |
| `09-proof-dark.png` | Contention proof in dark theme |

## Manual screenshots (auth-gated, add these yourself)

These pages require a login, so they can't be auto-captured. Save them here with these names:

| File | Where to capture |
|---|---|
| `10-aws-aurora-dsql.png` | AWS Console → Aurora DSQL → cluster `dsql-cluster-1` overview (Active, Ohio) |
| `11-aws-dynamodb.png` | AWS Console → DynamoDB → table `lotzero_firehose` general info (pk/sk, On-demand, Active) |
| `12-vercel-deployments.png` | Vercel → project `lotzero` → Deployments (Production, Ready) |
| `13-github-v0-commits.png` | GitHub → repo commits showing the `v0agent` commits (v0 usage proof) |

For the Devpost "AWS database screenshot" field, `10-aws-aurora-dsql.png` or `11-aws-dynamodb.png`
is all that's required.
