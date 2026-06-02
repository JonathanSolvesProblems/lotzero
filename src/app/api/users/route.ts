import { listUsers } from "@/lib/domain/auctions";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

const REGION_LABELS: Record<string, string> = {
  "us-east-1": "N. Virginia",
  "us-west-2": "Oregon",
  "eu-west-1": "Ireland",
  "ap-northeast-1": "Tokyo",
  "sa-east-1": "São Paulo",
};

export async function GET() {
  try {
    const users = await listUsers();
    return ok({
      users,
      regions: Object.entries(REGION_LABELS).map(([id, label]) => ({ id, label })),
    });
  } catch (e) {
    return handleError(e);
  }
}
