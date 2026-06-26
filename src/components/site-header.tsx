"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIdentity } from "./identity";
import { formatUSD } from "@/lib/money";

const NAV = [
  { href: "/", label: "Live" },
  { href: "/proof", label: "Proof" },
  { href: "/wallet", label: "Wallet" },
];

export function SiteHeader() {
  const { user, users, regions, region, setUserId, setRegion } = useIdentity();
  const pathname = usePathname();

  return (
    <header className="topbar sticky top-0 z-40 border-b border-[var(--border)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
            {/* auctioneer's gavel mark */}
            <rect x="2.5" y="18.5" width="13" height="2.6" rx="1.3" fill="var(--gold)" />
            <rect
              x="12.2"
              y="4.2"
              width="7.2"
              height="4.2"
              rx="1.1"
              transform="rotate(45 12.2 4.2)"
              fill="var(--gold)"
            />
            <rect
              x="8.6"
              y="9.0"
              width="2.4"
              height="9.2"
              rx="1.2"
              transform="rotate(45 8.6 9.0)"
              fill="var(--gold-soft)"
            />
          </svg>
          <span className="display text-xl tracking-tight text-[var(--paper)]">
            Lot<span className="text-[var(--gold)]">Zero</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 sm:flex">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  active ? "bg-[var(--surface-2)] text-[var(--fg)]" : "text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user && (
            <div className="hidden items-center gap-1 rounded-xl border border-[var(--border-2)] bg-[var(--surface-2)] px-3 py-1.5 text-sm md:flex">
              <span className="text-[var(--muted)]">balance</span>
              <span className="mono font-semibold text-[var(--good)]">{formatUSD(user.balance_cents)}</span>
              {user.held_cents > 0 && (
                <span className="mono text-xs text-[var(--warn)]">· {formatUSD(user.held_cents)} held</span>
              )}
            </div>
          )}

          <select
            aria-label="Region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="hidden rounded-xl border border-[var(--border-2)] bg-[var(--surface-2)] px-2 py-1.5 text-sm text-[var(--fg)] sm:block"
            title="Act from this AWS Region"
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                🌐 {r.id}
              </option>
            ))}
          </select>

          <select
            aria-label="Acting as"
            value={user?.id ?? ""}
            onChange={(e) => setUserId(e.target.value)}
            className="rounded-xl border border-[var(--border-2)] bg-[var(--surface-2)] px-2 py-1.5 text-sm text-[var(--fg)]"
            title="Switch demo identity"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.avatar} {u.handle}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
