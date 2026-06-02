import { regionDemoStatus, crossRegionProbe } from "@/lib/db/region-demo";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    return ok(regionDemoStatus());
  } catch (e) {
    return handleError(e);
  }
}

export async function POST() {
  try {
    const status = regionDemoStatus();
    if (!status.configured) return ok({ ...status, ran: false });
    const result = await crossRegionProbe();
    return ok({ ...status, ran: true, result });
  } catch (e) {
    return handleError(e);
  }
}
