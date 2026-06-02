import { NextRequest } from "next/server";
import { topUp } from "@/lib/domain/wallet";
import { ok, fail, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = String(body.userId || "");
    const amount = Math.round(Number(body.amountCents));
    if (!userId || !Number.isFinite(amount) || amount <= 0)
      return fail(400, { error: "bad_request" });
    const wallet = await topUp(userId, amount);
    return ok({ wallet });
  } catch (e) {
    return handleError(e);
  }
}
