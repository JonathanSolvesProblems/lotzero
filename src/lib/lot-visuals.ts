// Pure visual helpers (no data deps) so the look is consistent everywhere.
const MAP: Record<string, { emoji: string; from: string; to: string }> = {
  Space: { emoji: "🛰️", from: "#1e293b", to: "#3b2f6b" },
  Music: { emoji: "🎸", from: "#3b1f3a", to: "#5b2333" },
  Art: { emoji: "🎨", from: "#2a1f4d", to: "#1f3a4d" },
  Streetwear: { emoji: "👟", from: "#0f3b3a", to: "#13314d" },
  Experiences: { emoji: "🎫", from: "#3a2a0f", to: "#4d1f3a" },
  Tech: { emoji: "⌨️", from: "#10243b", to: "#1b2f5b" },
};
const FALLBACK = { emoji: "📦", from: "#1c2030", to: "#262b40" };

export const lotVisual = (category: string | null) => MAP[category ?? ""] ?? FALLBACK;

export const TYPE_LABEL: Record<string, string> = {
  english: "Ascending",
  dutch: "Dutch · falling price",
  drop: "Fixed drop",
};
