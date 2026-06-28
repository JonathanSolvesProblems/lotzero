const FAQS = [
  {
    q: "What is LotZero?",
    a: "A global live-auction marketplace where bidders worldwide compete in real time, with a guarantee of zero oversells and zero double-spends.",
  },
  {
    q: "How does it stay correct when two people bid at the same instant?",
    a: "The money ledger runs on Amazon Aurora DSQL, which uses optimistic concurrency control with strong consistency. Conflicting transactions are detected at commit and retried; exactly one writer wins, with no cross-Region locks and no lost writes.",
  },
  {
    q: "Which AWS databases does it use?",
    a: "Aurora DSQL for the money and scarcity plane (wallets, bids, holds, settlement) and Amazon DynamoDB for the social firehose (chat, presence, reactions, leaderboards, activity feed).",
  },
  {
    q: "Why two databases?",
    a: "Different jobs. Money must be exactly right under global contention (DSQL, strongly consistent). The firehose is high-volume and append-mostly, where eventual consistency is fine (DynamoDB).",
  },
  {
    q: "Is this real money?",
    a: "No. The demo uses sandboxed wallets. Production would add a payment processor, KYC and tax.",
  },
  {
    q: "How is zero oversells proven?",
    a: "The Proof page fires hundreds of concurrent claims tagged across five AWS Regions and measures the invariants live.",
  },
  {
    q: "What auction types are supported?",
    a: "English ascending, Dutch falling-price (first claim wins), and fixed-price drops.",
  },
  {
    q: "Can it scale to millions?",
    a: "Aurora DSQL is serverless and scales horizontally, DynamoDB handles very high write volume, and the front end is edge-rendered on Vercel.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <span className="eyebrow">FAQ</span>
        <h1 className="display mt-3 text-4xl leading-[1.08] sm:text-5xl text-balance">Questions, answered</h1>
      </header>

      <div className="mt-12 space-y-4">
        {FAQS.map((item) => (
          <div key={item.q} className="card p-6">
            <h2 className="display text-lg leading-snug">{item.q}</h2>
            <p className="mt-3 leading-relaxed text-[var(--muted)] text-pretty">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
