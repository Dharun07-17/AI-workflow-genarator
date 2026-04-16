export type ThemeBackground =
  | { type: "solid"; color: string }
  | { type: "gradient"; angle: number; stops: string[] };

export type ThemeConfig = {
  version: 1;
  mode: "preset" | "custom";
  presetId?: string;
  accent: string; // hex
  background: ThemeBackground;
};

export type ThemePreset = {
  id: string;
  name: string;
  accent: string;
  background: ThemeBackground;
};

const STORAGE_KEY = "flowberry_theme_v1";

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "berry-noir",
    name: "Berry Noir",
    accent: "#c34b8a",
    background: { type: "gradient", angle: 135, stops: ["#07060a", "#1b1022", "#3a1b2f"] },
  },
  {
    id: "oxide-dusk",
    name: "Oxide Dusk",
    accent: "#ff5a3d",
    background: { type: "gradient", angle: 145, stops: ["#0a0a0b", "#201312", "#3b1b12"] },
  },
  {
    id: "arctic-ink",
    name: "Arctic Ink",
    accent: "#60a5fa",
    background: { type: "gradient", angle: 160, stops: ["#050b12", "#0c1b2e", "#1a2b3a"] },
  },
  {
    id: "sage-night",
    name: "Sage Night",
    accent: "#22c55e",
    background: { type: "gradient", angle: 145, stops: ["#050a07", "#0f1b12", "#1b2a22"] },
  },
  {
    id: "classic",
    name: "Classic Flowberry",
    accent: "#5a3b6f",
    background: { type: "gradient", angle: 145, stops: ["#0c0c0c", "#2c2c2c", "#6f6f6f"] },
  },
];

export function defaultTheme(): ThemeConfig {
  const preset = THEME_PRESETS.find((p) => p.id === "classic") ?? THEME_PRESETS[0];
  return {
    version: 1,
    mode: "preset",
    presetId: preset.id,
    accent: preset.accent,
    background: preset.background,
  };
}

export function loadTheme(): ThemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultTheme();
    const parsed = JSON.parse(raw) as ThemeConfig;
    if (!parsed || parsed.version !== 1) return defaultTheme();
    if (!parsed.accent || !isHex(parsed.accent)) return defaultTheme();
    return parsed;
  } catch {
    return defaultTheme();
  }
}

export function saveTheme(config: ThemeConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function applyTheme(config: ThemeConfig): void {
  const root = document.documentElement;
  root.style.setProperty("--fb-accent", config.accent);
  const rgbaSoft = toRgba(config.accent, 0.25);
  const rgbaBorder = toRgba(config.accent, 0.6);
  root.style.setProperty("--fb-accent-soft", rgbaSoft);
  root.style.setProperty("--fb-accent-border", rgbaBorder);
  root.style.setProperty("--fb-background", backgroundCss(config.background));
}

export function initTheme(): void {
  applyTheme(loadTheme());
}

export function presetToTheme(presetId: string): ThemeConfig {
  const preset = THEME_PRESETS.find((p) => p.id === presetId) ?? THEME_PRESETS[0];
  return {
    version: 1,
    mode: "preset",
    presetId: preset.id,
    accent: preset.accent,
    background: preset.background,
  };
}

export function backgroundCss(bg: ThemeBackground): string {
  if (bg.type === "solid") return bg.color;
  const angle = Number.isFinite(bg.angle) ? bg.angle : 135;
  const stops = (bg.stops || []).filter((s) => typeof s === "string" && s.trim().length > 0);
  const safeStops = stops.length >= 2 ? stops : ["#0c0c0c", "#2c2c2c"];
  return `linear-gradient(${angle}deg, ${safeStops.join(", ")})`;
}

export function isHex(value: string): boolean {
  return /^#([0-9a-fA-F]{6})$/.test(value);
}

export function normalizeHex(value: string): string {
  const v = (value || "").trim();
  if (/^#([0-9a-fA-F]{6})$/.test(v)) return v.toLowerCase();
  return "#000000";
}

export function toRgba(hex: string, alpha: number): string {
  const cleaned = normalizeHex(hex).slice(1);
  const r = Number.parseInt(cleaned.slice(0, 2), 16);
  const g = Number.parseInt(cleaned.slice(2, 4), 16);
  const b = Number.parseInt(cleaned.slice(4, 6), 16);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

