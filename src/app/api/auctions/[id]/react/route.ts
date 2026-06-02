import { NextRequest } from "next/server";
import { addReaction } from "@/lib/dynamo/firehose";
import { ok, fail, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["🔥", "👀", "💎", "😱", "🎉"]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const emoji = String(body.emoji || "");
    if (!ALLOWED.has(emoji)) return fail(400, { error: "bad_emoji" });
    await addReaction(id, emoji);
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
