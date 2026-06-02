import Link from "next/link";
import { LiveBoard } from "@/components/live-board";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="card relative overflow-hidden p-8 sm:p-12">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{ background: "radial-gradient(600px 300px at 80% -20%, rgba(34,211,238,0.18), transparent 60%)" }}
        />
        <div className="max-w-2xl space-y-5">
          <span className="chip">🌍 global live auctions · strongly consistent</span>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            One global hammer. <span className="gradient-text">Zero oversells.</span> Zero double-spends.
          </h1>
          <p className="text-[var(--muted)] sm:text-lg">
            LotZero runs real-time auctions for the whole planet at once. Two bidders in Tokyo and São Paulo can race
            for the last lot in the same millisecond — exactly one wins, money is never lost or duplicated, and every
            Region reads the truth instantly.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="#live" className="btn btn-primary">
              Browse live lots
            </Link>
            <Link href="/proof" className="btn btn-ghost">
              See the contention proof →
            </Link>
          </div>

          <dl className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3">
            {[
              ["Money ledger", "Aurora DSQL", "active-active, strongly consistent"],
              ["Social firehose", "DynamoDB", "chat · presence · leaderboard"],
              ["Frontend", "v0 + Vercel", "edge-rendered globally"],
            ].map(([k, v, sub]) => (
              <div key={k} className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-3">
                <dt className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{k}</dt>
                <dd className="font-semibold">{v}</dd>
                <dd className="text-xs text-[var(--muted)]">{sub}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="live" className="scroll-mt-20">
        <LiveBoard />
      </section>
    </div>
  );
}
