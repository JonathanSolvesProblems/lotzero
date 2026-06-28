"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useIdentity } from "./identity";
import { Countdown } from "./countdown";
import { formatUSD } from "@/lib/money";
import { timeAgo, REGION_FLAG } from "@/lib/format";
import { lotVisual, TYPE_LABEL } from "@/lib/lot-visuals";
import type { LotView } from "@/lib/view-types";

interface Snapshot {
  lot: LotView;
  current_price_cents: number;
  min_next_cents: number;
  bids: { id: string; user_handle?: string; amount_cents: number; region: string; status: string; created_at: string }[];
  chat: { id: string; user: string; avatar: string; text: string; region: string; ts: number }[];
  presence: { count: number; users: { handle: string; avatar: string; region: string }[] };
  reactions: Record<string, number>;
  leaderboard: { handle: string; avatar: string; score: number }[];
  serverNow: number;
}

const REACTIONS = ["🔥", "👀", "💎", "😱", "🎉"];

async function postJSON(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function AuctionRoom({ lotId }: { lotId: string }) {
  const { user, region, reload } = useIdentity();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFlash = useCallback((kind: "ok" | "err", msg: string) => {
    setFlash({ kind, msg });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 3200);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/auctions/${lotId}`, { cache: "no-store" });
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    const data = await res.json();
    setSnap(data);
  }, [lotId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 1200);
    return () => clearInterval(t);
  }, [refresh]);

  // presence heartbeat
  useEffect(() => {
    if (!user) return;
    const beat = () => postJSON(`/api/auctions/${lotId}/heartbeat`, { userId: user.id, region });
    beat();
    const t = setInterval(beat, 5000);
    return () => clearInterval(t);
  }, [user, region, lotId]);

  if (notFound)
    return (
      <div className="card p-10 text-center">
        <p className="text-lg">Lot not found.</p>
        <Link href="/" className="btn btn-ghost mt-4 inline-flex">
          ← Back to live lots
        </Link>
      </div>
    );

  if (!snap) return <div className="card h-96 animate-pulse opacity-40" />;

  const { lot } = snap;
  const v = lotVisual(lot.category);
  const isClaim = lot.auction_type !== "english";
  const settled = lot.status === "settled";
  const remaining = lot.qty_total - lot.qty_claimed;
  const available = user ? user.balance_cents - user.held_cents : 0;
  const youWon = !!user && snap.bids.some((b) => b.status === "won" && b.user_handle === user.handle);

  const act = async (fn: () => Promise<{ ok: boolean; status: number; data: Record<string, unknown> }>, okMsg: string) => {
    if (!user) return showFlash("err", "Pick an identity first");
    const r = await fn();
    if (r.ok) {
      showFlash("ok", okMsg);
    } else {
      const d = r.data as { message?: string; error?: string; detail?: number };
      let msg = d.message || d.error || "Rejected";
      if (d.error === "too_low" && d.detail) msg = `Outbid, the minimum is now ${formatUSD(d.detail)}`;
      if (d.error === "sold_out") msg = "Sold out, another bidder claimed it first";
      if (d.error === "insufficient")
        msg =
          typeof d.detail === "number"
            ? `Not enough funds. You have ${formatUSD(d.detail)} available, top up your wallet to bid higher.`
            : "Not enough available funds, top up your wallet to bid.";
      showFlash("err", msg);
    }
    await Promise.all([refresh(), reload()]);
  };

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">
        ← All lots
      </Link>

      {flash && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-sm ${
            flash.kind === "ok"
              ? "border-[var(--good)]/40 bg-[var(--good)]/10 text-[var(--good)]"
              : "border-[var(--bad)]/40 bg-[var(--bad)]/10 text-[var(--bad)]"
          }`}
        >
          {flash.msg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* main */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div
              className="relative flex h-56 items-center justify-center overflow-hidden text-7xl"
              style={{ background: `linear-gradient(135deg, ${v.from}, ${v.to})` }}
            >
              {v.img ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.img} alt={lot.title} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                </>
              ) : (
                v.emoji
              )}
            </div>
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip !text-[var(--fg)]">{TYPE_LABEL[lot.auction_type]}</span>
                <span className="chip">{lot.category}</span>
                {!settled ? (
                  <span className="chip !text-[var(--bad)]">
                    <span className="live-dot" /> live
                  </span>
                ) : (
                  <span className="chip !text-[var(--good)]">settled</span>
                )}
                <span className="chip ml-auto">👥 {snap.presence.count} watching</span>
              </div>

              <div>
                <h1 className="display text-3xl">{lot.title}</h1>
                <p className="mt-2 text-sm text-[var(--muted)]">{lot.description}</p>
              </div>

              <PricePanel snap={snap} settled={settled} isClaim={isClaim} remaining={remaining} />

              {!settled &&
                (isClaim ? (
                  <ClaimPanel snap={snap} region={region} available={available} onClaim={() =>
                    act(() => postJSON(`/api/auctions/${lotId}/claim`, { userId: user?.id, region }), "Claimed! 🎉")
                  } />
                ) : (
                  <BidPanel
                    snap={snap}
                    region={region}
                    available={available}
                    onBid={(amountCents) =>
                      act(
                        () => postJSON(`/api/auctions/${lotId}/bid`, { userId: user?.id, region, amountCents }),
                        "Bid placed, you're the high bidder 🏆",
                      )
                    }
                  />
                ))}

              {settled && (
                <div
                  className={`rounded-xl border p-4 ${
                    !user
                      ? "border-[var(--good)]/30 bg-[var(--good)]/5"
                      : youWon
                      ? "border-[var(--good)]/40 bg-[var(--good)]/10"
                      : "border-[var(--bad)]/40 bg-[var(--bad)]/10"
                  }`}
                >
                  <div
                    className={`text-sm ${
                      !user ? "text-[var(--muted)]" : youWon ? "text-[var(--good)]" : "text-[var(--bad)]"
                    }`}
                  >
                    {!user
                      ? "Settled · strongly consistent final state"
                      : youWon
                      ? "🎉 You won this lot"
                      : "Sold out, you didn't win this one"}
                  </div>
                  <div className="mono text-lg font-bold">
                    Cleared at {formatUSD(lot.clearing_cents)}, exactly {lot.qty_claimed}/{lot.qty_total} units sold
                  </div>
                </div>
              )}
            </div>
          </div>

          <BidHistory bids={snap.bids} serverNow={snap.serverNow} />
        </div>

        {/* sidebar */}
        <div className="space-y-4">
          <Presence presence={snap.presence} />
          <Reactions
            reactions={snap.reactions}
            onReact={(emoji) => postJSON(`/api/auctions/${lotId}/react`, { emoji }).then(refresh)}
          />
          <Leaderboard rows={snap.leaderboard} />
          <ChatPanel
            chat={snap.chat}
            serverNow={snap.serverNow}
            onSend={(text) =>
              act(() => postJSON(`/api/auctions/${lotId}/chat`, { userId: user?.id, region, text }), "")
            }
          />
        </div>
      </div>
    </div>
  );
}

function PricePanel({ snap, settled, isClaim, remaining }: { snap: Snapshot; settled: boolean; isClaim: boolean; remaining: number }) {
  const { lot } = snap;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Stat
        label={settled ? "Sold for" : isClaim ? "Current price" : lot.high_bid_cents ? "High bid" : "Opening price"}
        value={formatUSD(settled ? lot.clearing_cents : isClaim ? snap.current_price_cents : lot.high_bid_cents ?? lot.start_cents)}
        big
      />
      {isClaim ? (
        <Stat label="Units left" value={`${remaining}/${lot.qty_total}`} />
      ) : (
        <Stat label="Min next bid" value={settled ? "n/a" : formatUSD(snap.min_next_cents)} />
      )}
      <Stat label={settled ? "Closed" : "Ends in"} value={<Countdown endsAt={settled ? null : lot.ends_at} />} />
    </div>
  );
}

function Stat({ label, value, big }: { label: string; value: React.ReactNode; big?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-3">
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className={`mono font-bold ${big ? "text-2xl" : "text-lg"}`}>{value}</div>
    </div>
  );
}

function BidPanel({ snap, region, available, onBid }: { snap: Snapshot; region: string; available: number; onBid: (cents: number) => void }) {
  const [val, setVal] = useState<number>(snap.min_next_cents);
  const minSeen = useRef(snap.min_next_cents);
  useEffect(() => {
    // keep input at/above the moving minimum
    if (snap.min_next_cents !== minSeen.current) {
      minSeen.current = snap.min_next_cents;
      setVal((cur) => (cur < snap.min_next_cents ? snap.min_next_cents : cur));
    }
  }, [snap.min_next_cents]);

  const inc = snap.lot.min_increment_cents;
  const short = val > available;
  return (
    <div className="space-y-3 rounded-xl border border-[var(--border-2)] bg-[var(--surface-2)] p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--muted)]">Your bid</span>
        <span className="chip">bidding from 🌐 {region}</span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className={`flex flex-1 items-center rounded-xl border bg-[var(--bg-2)] px-3 ${
            short ? "border-[var(--warn)]/60" : "border-[var(--border-2)]"
          }`}
        >
          <span className="text-[var(--muted)]">$</span>
          <input
            type="number"
            className="mono w-full bg-transparent px-2 py-2 text-lg outline-none"
            value={Math.round(val / 100)}
            min={Math.round(snap.min_next_cents / 100)}
            onChange={(e) => setVal(Math.round(Number(e.target.value) * 100))}
          />
        </div>
        {[1, 5, 10].map((m) => (
          <button key={m} className="btn btn-ghost px-3 py-2 text-sm" onClick={() => setVal((c) => c + inc * m)}>
            +{formatUSD(inc * m)}
          </button>
        ))}
      </div>
      {short && (
        <p className="text-xs text-[var(--warn)]">
          You have {formatUSD(available)} available (held funds excluded).{" "}
          <Link href="/wallet" className="underline hover:text-[var(--fg)]">
            Top up your wallet
          </Link>{" "}
          to bid this high.
        </p>
      )}
      <button
        className="btn btn-primary w-full"
        disabled={val < snap.min_next_cents || short}
        onClick={() => onBid(val)}
      >
        {short ? "Not enough funds for this bid" : `Place bid · ${formatUSD(val)}`}
      </button>
    </div>
  );
}

function ClaimPanel({ snap, region, available, onClaim }: { snap: Snapshot; region: string; available: number; onClaim: () => void }) {
  const short = snap.current_price_cents > available;
  return (
    <div className="space-y-3 rounded-xl border border-[var(--border-2)] bg-[var(--surface-2)] p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--muted)]">
          {snap.lot.auction_type === "dutch" ? "Price is falling, claim before it's gone" : "Fixed-price global drop"}
        </span>
        <span className="chip">claiming from 🌐 {region}</span>
      </div>
      <button className="btn btn-primary w-full text-lg" disabled={short} onClick={onClaim}>
        {short ? "Not enough funds to claim" : `Claim now · ${formatUSD(snap.current_price_cents)}`}
      </button>
      {short ? (
        <p className="text-center text-xs text-[var(--warn)]">
          You have {formatUSD(available)} available.{" "}
          <Link href="/wallet" className="underline hover:text-[var(--fg)]">
            Top up your wallet
          </Link>{" "}
          to claim.
        </p>
      ) : (
        <p className="text-center text-xs text-[var(--muted)]">
          First claim on Earth wins. DSQL guarantees exactly {snap.lot.qty_total} unit
          {snap.lot.qty_total === 1 ? "" : "s"} can ever be sold.
        </p>
      )}
    </div>
  );
}

function BidHistory({ bids, serverNow }: { bids: Snapshot["bids"]; serverNow: number }) {
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-sm font-semibold">Bid ledger · Aurora DSQL</h3>
      {bids.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No bids yet. Be the first.</p>
      ) : (
        <div className="space-y-1.5">
          {bids.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm odd:bg-[var(--bg-2)]/40">
              <span className="text-xs">{REGION_FLAG[b.region] ?? "🌐"}</span>
              <span className="font-medium">{b.user_handle ?? "someone"}</span>
              <span
                className={`chip ${
                  b.status === "accepted" || b.status === "won"
                    ? "!text-[var(--good)]"
                    : b.status === "outbid"
                    ? "!text-[var(--muted)]"
                    : "!text-[var(--bad)]"
                }`}
              >
                {b.status}
              </span>
              <span className="mono ml-auto font-semibold">{formatUSD(b.amount_cents)}</span>
              <span className="mono w-10 shrink-0 text-right text-xs text-[var(--muted)]">
                {timeAgo(Date.parse(b.created_at), serverNow)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Presence({ presence }: { presence: Snapshot["presence"] }) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="live-dot" />
        <h3 className="text-sm font-semibold">{presence.count} watching worldwide</h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presence.users.slice(0, 24).map((u, i) => (
          <span key={i} className="chip" title={`${u.handle} · ${u.region}`}>
            {u.avatar} {REGION_FLAG[u.region] ?? "🌐"}
          </span>
        ))}
        {presence.count === 0 && <span className="text-sm text-[var(--muted)]">Nobody here yet.</span>}
      </div>
    </div>
  );
}

function Reactions({ reactions, onReact }: { reactions: Record<string, number>; onReact: (e: string) => void }) {
  return (
    <div className="card p-4">
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map((e) => (
          <button key={e} className="btn btn-ghost px-3 py-2" onClick={() => onReact(e)}>
            <span className="text-lg">{e}</span>
            <span className="mono text-sm text-[var(--muted)]">{reactions[e] ?? 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Leaderboard({ rows }: { rows: Snapshot["leaderboard"] }) {
  if (rows.length === 0) return null;
  return (
    <div className="card p-4">
      <h3 className="mb-2 text-sm font-semibold">Top participants</h3>
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="mono w-5 text-[var(--muted)]">{i + 1}</span>
            <span>{r.avatar}</span>
            <span className="font-medium">{r.handle}</span>
            <span className="mono ml-auto text-[var(--muted)]">{r.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPanel({ chat, serverNow, onSend }: { chat: Snapshot["chat"]; serverNow: number; onSend: (t: string) => void }) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length]);

  return (
    <div className="card flex h-80 flex-col p-4">
      <h3 className="mb-2 text-sm font-semibold">Live chat · DynamoDB</h3>
      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {chat.length === 0 && <p className="text-sm text-[var(--muted)]">Say hi to the room 👋</p>}
        {chat.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="mr-1">{m.avatar}</span>
            <span className="font-medium">{m.user}</span>
            <span className="ml-1.5 text-[var(--fg)]/85">{m.text}</span>
            <span className="mono ml-1 text-xs text-[var(--muted)]">· {timeAgo(m.ts, serverNow)}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t) return;
          onSend(t);
          setText("");
        }}
      >
        <input
          className="input"
          placeholder="Message the room…"
          value={text}
          maxLength={280}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-ghost" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
