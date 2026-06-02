import { getFeed } from "@/lib/dynamo/firehose";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const feed = await getFeed(25);
    return ok({ feed });
  } catch (e) {
    return handleError(e);
  }
}
