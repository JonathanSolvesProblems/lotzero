"use client";

import { useState } from "react";
import { formatUSD } from "@/lib/money";
import { REGION_FLAG } from "@/lib/format";

interface ProofAttempt {
  i: number;
  user: string;
  region: string;
  outcome: "won" | "rejected";
  code?: string;
}
interface ProofReport {
  scenario: "oversell" | "double_spend";
  mode: "dsql" | "pglite";
  concurrency: number;
  qtyTotal: number;
  priceCents: number;
  winners: number;
  rejected: number;
  rejections: Record<string, number>;
  oversells: number;
  doubleSpends: number;
  moneyConserved: boolean;
  noNegativeBalances: boolean;
  invariantHeld: boolean;
  elapsedMs: number;
  sample: ProofAttempt[];
}

export default function ProofPage() {
  const [scenario, setScenario] = useState<"oversell" | "double_spend">("oversell");
  const [concurrency, setConcurrency] = useState(50);
  const [qty, setQty] = useState(1);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<ProofReport | null>(null);

  const run = async () => {
    setRunning(true);
    setReport(null);
    try {
      const res = await fetch("/api/proof", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario, concurrency, qty, priceCents: 100_00 }),
      });
      setReport(await res.json());
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-3xl space-y-2">
        <span className="chip">🧪 live correctness proof</span>
        <h1 className="text-3xl font-bold">Fire a global race. Watch the invariant hold.</h1>
        <p className="text-[var(--muted)]">
          This spins up many buyers across five AWS Regions and makes them collide on a scarce lot at the exact same
          moment — the situation an eventually-consistent store gets wrong. Aurora DSQL&apos;s strongly-consistent,
          optimistic-concurrency transactions let <span className="text-[var(--fg)]">exactly</span> the right number of
          winners through. Everything is created and torn down per run.
        </p>
      </div>

      <div className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-[var(--muted)]">Scenario</label>
            <div className="flex gap-2">
              <Toggle active={scenario === "oversell"} onClick={() => setScenario("oversell")}>
                Oversell race
              </Toggle>
              <Toggle active={scenario === "double_spend"} onClick={() => setScenario("double_spend")}>
                Double-spend race
              </Toggle>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {scenario === "oversell"
                ? `${concurrency} buyers worldwide rush a drop with only ${qty} unit${qty > 1 ? "s" : ""}.`
                : `One buyer funded for a single purchase tries to win ${concurrency} lots at once from many Regions.`}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-[var(--muted)]">
                Concurrency · {concurrency} simultaneous attempts
              </label>
              <input
                type="range"
                min={10}
                max={200}
                step={10}
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>
            {scenario === "oversell" && (
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-[var(--muted)]">
                  Units available · {qty}
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
              </div>
            )}
          </div>
        </div>

        <button className="btn btn-primary w-full" onClick={run} disabled={running}>
          {running ? "Running the race…" : "▶ Run the contention proof"}
        </button>
      </div>

      {report && <Report report={report} />}
    </div>
  );
}

function Report({ report }: { report: ProofReport }) {
  const held = report.invariantHeld;
  return (
    <div className="space-y-4">
      <div
        className={`card flex flex-wrap items-center gap-4 p-6 ${
          held ? "border-[var(--good)]/40" : "border-[var(--bad)]/40"
        }`}
        style={{ background: held ? "rgba(52,211,153,0.06)" : "rgba(251,113,133,0.06)" }}
      >
        <div className="text-5xl">{held ? "✅" : "❌"}</div>
        <div>
          <div className={`text-2xl font-bold ${held ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>
            {held ? "Invariant held" : "Invariant violated"}
          </div>
          <div className="text-sm text-[var(--muted)]">
            {report.concurrency} concurrent attempts · {report.winners} winner{report.winners === 1 ? "" : "s"} ·{" "}
            {report.rejected} cleanly rejected · {report.elapsedMs} ms ·{" "}
            <span className="mono">{report.mode === "dsql" ? "Aurora DSQL" : "PGlite (local)"}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Oversells" value={report.oversells} good={report.oversells === 0} target="= 0" />
        <Metric label="Double-spends" value={report.doubleSpends} good={report.doubleSpends === 0} target="= 0" />
        <Metric label="Money conserved" value={report.moneyConserved ? "yes" : "no"} good={report.moneyConserved} />
        <Metric label="Negative balances" value={report.noNegativeBalances ? "none" : "found"} good={report.noNegativeBalances} />
      </div>

      {report.mode === "pglite" && (
        <p className="text-xs text-[var(--muted)]">
          Note: locally, PGlite serializes the transactions, so the race is simulated and the invariant is enforced by
          the same SQL. On Aurora DSQL the attempts run with true multi-Region concurrency and the losing transactions
          fail with an OCC error and retry — identical guarantee, real contention.
        </p>
      )}

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Per-attempt outcomes (sample)</h3>
          <div className="flex gap-3 text-xs text-[var(--muted)]">
            <span><span className="inline-block h-2.5 w-2.5 rounded bg-[var(--good)]" /> won</span>
            <span><span className="inline-block h-2.5 w-2.5 rounded bg-[var(--bad)]" /> rejected</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 sm:grid-cols-10">
          {report.sample.map((a) => (
            <div
              key={a.i}
              title={`${a.region} · ${a.outcome}${a.code ? ` (${a.code})` : ""}`}
              className="flex aspect-square items-center justify-center rounded-lg text-xs"
              style={{
                background: a.outcome === "won" ? "rgba(52,211,153,0.18)" : "rgba(251,113,133,0.14)",
                border: `1px solid ${a.outcome === "won" ? "rgba(52,211,153,0.5)" : "rgba(251,113,133,0.4)"}`,
              }}
            >
              {REGION_FLAG[a.region] ?? "🌐"}
            </div>
          ))}
        </div>
        {Object.keys(report.rejections).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(report.rejections).map(([code, n]) => (
              <span key={code} className="chip">
                {n} × {code}
              </span>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-[var(--muted)]">
          Price per unit {formatUSD(report.priceCents)}. Expected winners:{" "}
          <span className="mono text-[var(--fg)]">
            {report.scenario === "double_spend" ? 1 : Math.min(report.qtyTotal, report.concurrency)}
          </span>
          .
        </p>
      </div>
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`btn px-3 py-2 text-sm ${active ? "btn-primary" : "btn-ghost"}`}
    >
      {children}
    </button>
  );
}

function Metric({ label, value, good, target }: { label: string; value: React.ReactNode; good: boolean; target?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
        {target && <span className="mono text-[10px] text-[var(--muted)]">{target}</span>}
      </div>
      <div className={`mono text-2xl font-bold ${good ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>{value}</div>
    </div>
  );
}
