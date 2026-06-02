export function timeAgo(ts: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export const REGION_FLAG: Record<string, string> = {
  "us-east-1": "🇺🇸",
  "us-west-2": "🇺🇸",
  "eu-west-1": "🇮🇪",
  "ap-northeast-1": "🇯🇵",
  "sa-east-1": "🇧🇷",
};
