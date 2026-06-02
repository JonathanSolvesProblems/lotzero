import { NextRequest } from "next/server";
import { placeEnglishBid } from "@/lib/domain/bids";
import { getUser } from "@/lib/domain/auctions";
import { pushFeed, bumpLeaderboard } from "@/lib/dynamo/firehose";
import { ok, fail, handleError } from "@/lib/api";
import { formatUSD } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const user = await getUser(String(body.userId));
    if (!user) return fail(400, { error: "no_user", message: "Unknown user" });
    const region = String(body.region || user.region);
    const amount = Math.round(Number(body.amountCents));

    const res = await placeEnglishBid(id, user.id, amount, region);

    // Firehose side-effects (DynamoDB) are best-effort and never block the ledger.
    await Promise.allSettled([
      pushFeed("bid", `${user.avatar} ${user.handle} bid ${formatUSD(res.lot.high_bid_cents)} · ${res.lot.title}`, id, region),
      bumpLeaderboard(id, user.id, user.handle, user.avatar, 1),
    ]);

    return ok(res);
  } catch (e) {
    return handleError(e);
  }
}
