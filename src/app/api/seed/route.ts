import { getDb } from "@/lib/db/client";
import { forceSeed } from "@/lib/db/seed";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Reset demo data. Handy for the demo video so every take starts clean.
export async function POST() {
  try {
    const db = await getDb();
    await forceSeed(db);
    return ok({ ok: true, mode: db.mode });
  } catch (e) {
    return handleError(e);
  }
}
