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
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(7,8,12,0.72)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[linear-gradient(180deg,#8a6dff,#6b4cf0)] text-sm">
            L0
          </span>
          <span className="text-lg">
            Lot<span className="gradient-text">Zero</span>
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
