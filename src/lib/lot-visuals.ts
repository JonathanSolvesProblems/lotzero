// Pure visual helpers (no data deps) so the look is consistent everywhere.
// `img` is a real product photo served from /public/lots; emoji is the fallback.
const MAP: Record<string, { emoji: string; img: string; from: string; to: string }> = {
  Space: { emoji: "🛰️", img: "/lots/space.jpg", from: "#1e293b", to: "#3b2f6b" },
  Music: { emoji: "🎸", img: "/lots/music.jpg", from: "#3b1f3a", to: "#5b2333" },
  Art: { emoji: "🎨", img: "/lots/art.jpg", from: "#2a1f4d", to: "#1f3a4d" },
  Streetwear: { emoji: "👟", img: "/lots/streetwear.jpg", from: "#0f3b3a", to: "#13314d" },
  Experiences: { emoji: "🎫", img: "/lots/experiences.jpg", from: "#3a2a0f", to: "#4d1f3a" },
  Tech: { emoji: "⌨️", img: "/lots/tech.jpg", from: "#10243b", to: "#1b2f5b" },
};
const FALLBACK = { emoji: "📦", img: "", from: "#1c2030", to: "#262b40" };

export const lotVisual = (category: string | null) => MAP[category ?? ""] ?? FALLBACK;

export const TYPE_LABEL: Record<string, string> = {
  english: "Ascending",
  dutch: "Falling price",
  drop: "Fixed drop",
};
