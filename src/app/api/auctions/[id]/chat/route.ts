import { NextRequest } from "next/server";
import { getUser } from "@/lib/domain/auctions";
import { postChat } from "@/lib/dynamo/firehose";
import { ok, fail, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const user = await getUser(String(body.userId));
    if (!user) return fail(400, { error: "no_user" });
    const text = String(body.text || "").trim();
    if (!text) return fail(400, { error: "empty" });
    const msg = await postChat(id, user.handle, user.avatar, text, body.region || user.region);
    return ok({ message: msg });
  } catch (e) {
    return handleError(e);
  }
}
