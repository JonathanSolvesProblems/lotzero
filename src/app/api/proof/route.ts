import { NextRequest } from "next/server";
import { runProof } from "@/lib/domain/proof";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const report = await runProof({
      scenario: body.scenario === "double_spend" ? "double_spend" : "oversell",
      concurrency: Number(body.concurrency) || 50,
      qty: Number(body.qty) || 1,
      priceCents: Number(body.priceCents) || 100_00,
    });
    return ok(report);
  } catch (e) {
    return handleError(e);
  }
}
