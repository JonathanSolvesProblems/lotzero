"use client";

import { useCallback, useEffect, useState } from "react";
import { useIdentity } from "@/components/identity";
import { formatUSD } from "@/lib/money";
import { timeAgo } from "@/lib/format";

interface LedgerEntry {
  id: string;
  kind: string;
  amount_cents: number;
  balance_after_cents: number | null;
  lot_id: string | null;
  created_at: string;
}
interface WalletData {
  wallet: { balance_cents: number; held_cents: number };
  ledger: LedgerEntry[];
}

const KIND_LABEL: Record<string, { label: string; sign: string; color: string }> = {
  topup: { label: "Top-up", sign: "+", color: "var(--good)" },
  hold: { label: "Hold placed", sign: "•", color: "var(--warn)" },
  release: { label: "Hold released", sign: "•", color: "var(--muted)" },
  capture: { label: "Payment captured", sign: "−", color: "var(--bad)" },
  payout: { label: "Seller payout", sign: "+", color: "var(--good)" },
};

export default function WalletPage() {
  const { user, reload } = useIdentity();
  const [data, setData] = useState<WalletData | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/wallet?userId=${user.id}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, [user]);

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [load]);

  const topup = async (cents: number) => {
    if (!user) return;
    await fetch("/api/wallet/topup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: user.id, amountCents: cents }),
    });
    await Promise.all([load(), reload()]);
  };

  if (!user) return <div className="card p-8">Pick an identity from the top-right to view a wallet.</div>;

  // Seed from the identity (already loaded in the header) so the amounts show
  // instantly, then refine when the detailed wallet/ledger response arrives.
  const w = data?.wallet ?? { balance_cents: user.balance_cents, held_cents: user.held_cents };
  const available = w.balance_cents - w.held_cents;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl">
          {user.avatar} {user.handle}&apos;s wallet
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Balances live in Aurora DSQL. Every movement below is a strongly-consistent ledger row.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Balance label="Available" value={formatUSD(available)} accent="var(--good)" big />
        <Balance label="Held in active bids" value={formatUSD(w.held_cents)} accent="var(--warn)" />
        <Balance label="Total balance" value={formatUSD(w.balance_cents)} accent="var(--fg)" />
      </div>

      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">Add demo funds</h3>
          {[100_00, 1_000_00, 10_000_00].map((c) => (
            <button key={c} className="btn btn-ghost text-sm" onClick={() => topup(c)}>
              + {formatUSD(c)}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold">Ledger</h3>
        {!data || data.ledger.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No movements yet.</p>
        ) : (
          <div className="space-y-1">
            {data.ledger.map((e) => {
              const k = KIND_LABEL[e.kind] ?? { label: e.kind, sign: "•", color: "var(--muted)" };
              return (
                <div key={e.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm odd:bg-[var(--bg-2)]/40">
                  <span className="font-medium" style={{ color: k.color }}>
                    {k.label}
                  </span>
                  <span className="mono ml-auto" style={{ color: k.color }}>
                    {k.sign} {formatUSD(e.amount_cents)}
                  </span>
                  {e.balance_after_cents != null && (
                    <span className="mono w-24 shrink-0 text-right text-xs text-[var(--muted)]">
                      bal {formatUSD(e.balance_after_cents)}
                    </span>
                  )}
                  <span className="mono w-10 shrink-0 text-right text-xs text-[var(--muted)]">
                    {timeAgo(Date.parse(e.created_at))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Balance({ label, value, accent, big }: { label: string; value: string; accent: string; big?: boolean }) {
  return (
    <div className="card p-5">
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className={`mono font-bold ${big ? "text-3xl" : "text-2xl"}`} style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}
