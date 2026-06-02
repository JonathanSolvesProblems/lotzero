import { NextRequest } from "next/server";
import { getUser } from "@/lib/domain/auctions";
import { heartbeat } from "@/lib/dynamo/firehose";
import { ok, fail, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const user = await getUser(String(body.userId));
    if (!user) return fail(400, { error: "no_user" });
    await heartbeat(id, {
      userId: user.id,
      handle: user.handle,
      avatar: user.avatar,
      region: body.region || user.region,
      ts: Date.now(),
    });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
