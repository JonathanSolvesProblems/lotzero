import Link from "next/link";

const SECTIONS = [
  {
    title: "The problem",
    body: "Real-time global commerce forced a choice — correctness or scale. A single-region SQL database keeps money exactly right, but it is slow for distant users. Eventually-consistent multi-region NoSQL scales worldwide, but it cannot safely hold money, because two regions can both accept the last unit.",
  },
  {
    title: "The insight",
    body: "Amazon Aurora DSQL gives active-active, multi-Region strong consistency. The money ledger becomes an ordinary strongly-consistent app — no exotic conflict resolution — paired with Amazon DynamoDB for the high-volume social firehose.",
  },
  {
    title: "The architecture",
    body: "Two planes. Aurora DSQL holds wallets, bids, holds and settlement. Amazon DynamoDB carries chat, presence, reactions, leaderboards and the activity feed. The consistency boundary between them is the design: money is exact, the firehose is fast.",
  },
  {
    title: "Proven, not claimed",
    body: "A built-in proof fires hundreds of concurrent claims across five AWS Regions and measures the invariants live — zero oversells and zero double-spends, every run.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <span className="eyebrow">About</span>
        <h1 className="display mt-3 text-4xl leading-[1.08] sm:text-5xl text-balance">
          Built so the last lot can only be won once
        </h1>
      </header>

      <div className="mt-12 space-y-12">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="display text-2xl leading-tight">{s.title}</h2>
            <p className="mt-4 leading-relaxed text-[var(--muted)] text-pretty">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="hairline mt-14 pt-10">
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">
            Browse live lots
          </Link>
          <Link href="/proof" className="btn btn-ghost">
            See the proof →
          </Link>
        </div>
      </div>
    </div>
  );
}
