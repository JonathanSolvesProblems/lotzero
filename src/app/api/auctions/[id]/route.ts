import { getLot, getBids } from "@/lib/domain/auctions";
import { currentPrice, minNextBid } from "@/lib/domain/pricing";
import { getChat, getPresence, getReactions, getLeaderboard } from "@/lib/dynamo/firehose";
import { ok, fail, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const lot = await getLot(id);
    if (!lot) return fail(404, { error: "not_found" });

    const [bids, chat, presence, reactions, leaderboard] = await Promise.all([
      getBids(id),
      getChat(id),
      getPresence(id),
      getReactions(id),
      getLeaderboard(id),
    ]);

    return ok({
      lot,
      current_price_cents: currentPrice(lot),
      min_next_cents: minNextBid(lot),
      bids,
      chat,
      presence: { count: presence.length, users: presence },
      reactions,
      leaderboard,
      serverNow: Date.now(),
    });
  } catch (e) {
    return handleError(e);
  }
}
