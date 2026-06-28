"use client";

import { useEffect, useState } from "react";

export function Countdown({ endsAt, className = "" }: { endsAt: string | null; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!endsAt) return <span className={className}>open</span>;
  const ms = Date.parse(endsAt) - now;
  if (ms <= 0) return <span className={`${className} text-[var(--bad)]`}>ended</span>;

  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const urgent = ms < 60_000;

  let label: string;
  if (d > 0) label = `${d}d ${pad(h)}:${pad(m)}`;
  else if (h > 0) label = `${h}:${pad(m)}:${pad(sec)}`;
  else label = `${pad(m)}:${pad(sec)}`;

  return <span className={`mono ${className} ${urgent ? "text-[var(--bad)]" : ""}`}>{label}</span>;
}
