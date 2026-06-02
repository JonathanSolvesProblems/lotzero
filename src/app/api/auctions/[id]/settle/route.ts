import { settleEnglishLot } from "@/lib/domain/bids";
import { pushFeed } from "@/lib/dynamo/firehose";
import { ok, handleError } from "@/lib/api";
import { formatUSD } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const lot = await settleEnglishLot(id);
    if (lot.status === "settled" && lot.winner_id) {
      await pushFeed("settle", `🔨 ${lot.title} settled at ${formatUSD(lot.clearing_cents)}`, id, null);
    }
    return ok({ lot });
  } catch (e) {
    return handleError(e);
  }
}
