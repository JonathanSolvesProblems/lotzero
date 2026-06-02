import { listLots } from "@/lib/domain/auctions";
import { currentPrice, minNextBid } from "@/lib/domain/pricing";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const lots = await listLots();
    const enriched = lots.map((l) => ({
      ...l,
      current_price_cents: currentPrice(l),
      min_next_cents: minNextBid(l),
    }));
    return ok({ lots: enriched, serverNow: Date.now() });
  } catch (e) {
    return handleError(e);
  }
}
