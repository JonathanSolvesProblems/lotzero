"use client";

import { useEffect, useState } from "react";

interface Status {
  configured: boolean;
  regionA: string;
  regionB: string;
}
interface ProbeResult {
  written: string;
  readBack: string | null;
  consistent: boolean;
  writeMs: number;
  readMs: number;
}

export function RegionDemo() {
  const [status, setStatus] = useState<Status | null>(null);
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch("/api/region-demo", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, regionA: "us-east-1", regionB: "eu-west-1" }));
  }, []);

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/region-demo", { method: "POST" });
      const data = await res.json();
      if (data.ran) setResult(data.result);
    } finally {
      setRunning(false);
    }
  };

  if (!status) return null;

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center gap-2">
        <span className="chip">🌐 active-active</span>
        <h3 className="text-sm font-semibold">Cross-Region strong consistency</h3>
        <span className="chip ml-auto">optional</span>
      </div>
      <p className="text-sm text-[var(--muted)]">
        Write through one Region&apos;s endpoint of a peered Aurora DSQL cluster, then read it
        straight back through the other Region&apos;s endpoint. With strong consistency the value
        is already there, no replication lag to wait out.
      </p>

      {!status.configured ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-4 text-sm">
          <div className="mb-1 font-medium text-[var(--fg)]">Single-Region deployment, multi-Region ready</div>
          <p className="text-[var(--muted)]">
            This optional demo lights up a cross-Region read on a multi-Region peered Aurora DSQL
            cluster. The deployed cluster runs in a single Region (us-east-2) to keep the hackathon
            footprint small, so it stays off here, by design. The code is already wired: set{" "}
            <code className="mono">DSQL_CLUSTER_ENDPOINT_2</code> (with{" "}
            <code className="mono">DSQL_REGION_2</code>) and it turns on with no code changes. The
            contention proof above already runs on the real cluster.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary" onClick={run} disabled={running}>
              {running ? "Probing…" : `Write in ${status.regionA} → read in ${status.regionB}`}
            </button>
            <span className="mono text-xs text-[var(--muted)]">
              {status.regionA} ⟷ {status.regionB} (peered)
            </span>
          </div>

          {result && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Cell label={`Write · ${status.regionA}`} value={`${result.writeMs} ms`} />
              <Cell label={`Cross-Region read · ${status.regionB}`} value={`${result.readMs} ms`} />
              <div
                className="card p-4"
                style={{
                  background: result.consistent ? "rgba(52,211,153,0.06)" : "rgba(251,113,133,0.06)",
                  borderColor: result.consistent ? "rgba(52,211,153,0.4)" : "rgba(251,113,133,0.4)",
                }}
              >
                <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">Consistency</div>
                <div className={`mono text-xl font-bold ${result.consistent ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>
                  {result.consistent ? "✓ identical" : "✗ mismatch"}
                </div>
                <div className="mono mt-1 truncate text-[11px] text-[var(--muted)]">
                  {result.written} → {result.readBack ?? "∅"}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mono text-xl font-bold">{value}</div>
    </div>
  );
}
