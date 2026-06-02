import { NextRequest } from "next/server";
import { claimLot } from "@/lib/domain/bids";
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

    const res = await claimLot(id, user.id, region);

    await Promise.allSettled([
      pushFeed(
        "claim",
        `${user.avatar} ${user.handle} claimed ${res.lot.title} for ${formatUSD(res.lot.clearing_cents)} from ${region}`,
        id,
        region,
      ),
      bumpLeaderboard(id, user.id, user.handle, user.avatar, 1),
    ]);

    return ok(res);
  } catch (e) {
    return handleError(e);
  }
}
