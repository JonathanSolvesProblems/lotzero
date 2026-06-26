import Link from "next/link";
import { LiveBoard } from "@/components/live-board";

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="relative">
        <div className="flex items-center gap-3 text-[var(--gold)]">
          <span className="live-dot" />
          <span className="eyebrow !text-[var(--gold)]">Est. 2026 — Global live auctions, settled with certainty</span>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <div>
            <h1 className="display text-5xl leading-[1.04] sm:text-6xl">
              One global hammer.
              <br />
              <span className="gradient-text">Zero oversells.</span>{" "}
              <span className="gradient-text">Zero double-spends.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[var(--muted)] sm:text-lg">
              LotZero runs real-time auctions for the whole planet at once. Two bidders in Tokyo and São Paulo can race
              for the last lot in the same millisecond. Exactly one wins, money is never lost or duplicated, and every
              Region reads the truth instantly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#live" className="btn btn-primary">
                Browse live lots
              </Link>
              <Link href="/proof" className="btn btn-ghost">
                See the contention proof →
              </Link>
            </div>
          </div>

          {/* catalog spec plate */}
          <dl className="card divide-y divide-[var(--line)] overflow-hidden">
            {[
              ["01", "Money & scarcity", "Amazon Aurora DSQL", "active-active · strongly consistent"],
              ["02", "Social firehose", "Amazon DynamoDB", "chat · presence · leaderboard"],
              ["03", "Front-end", "Next.js + Vercel", "edge-rendered worldwide"],
            ].map(([n, k, v, sub]) => (
              <div key={n} className="flex items-baseline gap-4 p-4">
                <span className="mono text-xs text-[var(--gold)]">{n}</span>
                <div className="flex-1">
                  <dt className="eyebrow">{k}</dt>
                  <dd className="display text-lg leading-tight">{v}</dd>
                  <dd className="text-xs text-[var(--muted-2)]">{sub}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="live" className="scroll-mt-24">
        <LiveBoard />
      </section>
    </div>
  );
}
