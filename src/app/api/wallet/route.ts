import { NextRequest } from "next/server";
import { getWallet, getLedger } from "@/lib/domain/wallet";
import { ok, fail, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return fail(400, { error: "missing_user" });
    const [wallet, ledger] = await Promise.all([getWallet(userId), getLedger(userId)]);
    if (!wallet) return fail(404, { error: "not_found" });
    return ok({ wallet, ledger });
  } catch (e) {
    return handleError(e);
  }
}
