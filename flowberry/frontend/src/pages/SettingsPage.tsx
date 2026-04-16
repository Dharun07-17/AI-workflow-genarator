import { useEffect, useMemo, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { api } from "../services/api";
import {
  THEME_PRESETS,
  ThemeBackground,
  ThemeConfig,
  applyTheme,
  backgroundCss,
  defaultTheme,
  loadTheme,
  normalizeHex,
  presetToTheme,
  saveTheme,
} from "../theme/theme";

function ThemePreview({ accent, background }: { accent: string; background: ThemeBackground }) {
  const bg = backgroundCss(background);
  return (
    <div
      className="h-16 w-full rounded border border-zinc-800"
      style={{ background: bg }}
    >
      <div className="flex h-full items-end justify-between p-2">
        <div className="h-2 w-24 rounded" style={{ background: "rgba(255,255,255,0.15)" }} />
        <div className="h-6 w-6 rounded" style={{ background: accent }} />
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const safe = normalizeHex(value);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">{label}</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="w-24 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
            value={safe}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
          <div className="h-5 w-5 rounded border border-zinc-700" style={{ background: safe }} />
        </div>
      </div>
      <div className="rounded border border-zinc-800 bg-zinc-950/30 p-2">
        <HexColorPicker color={safe} onChange={(c) => onChange(c)} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [theme, setTheme] = useState<ThemeConfig>(() => loadTheme());
  const [activePresetId, setActivePresetId] = useState<string>(() => theme.presetId ?? "classic");

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  async function loadStatus() {
    const res = await api.get("/auth/me");
    setMfaEnabled(Boolean(res.data.data?.mfa_enabled));
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function enableMfa() {
    setError(null);
    setMessage(null);
    try {
      await api.post("/auth/mfa/enable");
      await loadStatus();
      setMessage("Email MFA enabled.");
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Failed to enable MFA");
    }
  }

  async function disableMfa() {
    setError(null);
    setMessage(null);
    try {
      await api.post("/auth/mfa/disable");
      await loadStatus();
      setMessage("Email MFA disabled.");
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Failed to disable MFA");
    }
  }

  const isCustom = theme.mode === "custom";
  const bgMode = theme.background.type;
  const solidBg = theme.background.type === "solid" ? theme.background : null;
  const gradientBg = theme.background.type === "gradient" ? theme.background : null;

  const selectedPreset = useMemo(
    () => THEME_PRESETS.find((p) => p.id === activePresetId) ?? THEME_PRESETS[0],
    [activePresetId],
  );

  function applyPreset(presetId: string) {
    const next = presetToTheme(presetId);
    setActivePresetId(presetId);
    setTheme(next);
  }

  function ensureCustom(): ThemeConfig {
    if (theme.mode === "custom") return theme;
    const base = theme.presetId ? presetToTheme(theme.presetId) : defaultTheme();
    return { ...base, mode: "custom", presetId: undefined };
  }

  function setAccent(hex: string) {
    const next = ensureCustom();
    setTheme({ ...next, accent: normalizeHex(hex) });
  }

  function setBackground(nextBg: ThemeBackground) {
    const next = ensureCustom();
    setTheme({ ...next, background: nextBg });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-zinc-400">Theme customization and account security.</p>
      </div>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Theme</h3>
          <p className="text-sm text-zinc-400">Choose a preset or build your own. Saved to this browser.</p>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Preset Themes</p>
            <button
              className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
              onClick={() => setTheme(defaultTheme())}
            >
              Reset
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {THEME_PRESETS.map((preset) => {
              const active = theme.mode === "preset" && theme.presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className={`rounded-lg border p-3 text-left ${
                    active ? "border-[color:var(--fb-accent-border)]" : "border-zinc-800"
                  } hover:border-zinc-700`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{preset.name}</p>
                    {active ? (
                      <span className="rounded px-2 py-1 text-[10px] text-zinc-200" style={{ background: "var(--fb-accent-soft)" }}>
                        Active
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2">
                    <ThemePreview accent={preset.accent} background={preset.background} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Custom Theme</p>
            <button
              className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
              onClick={() => setTheme({ ...presetToTheme(selectedPreset.id), mode: "custom", presetId: undefined })}
            >
              Start From {selectedPreset.name}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ColorField label="Accent" value={theme.accent} onChange={setAccent} />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">Background</p>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    className={`rounded px-2 py-1 ${bgMode === "solid" ? "text-white" : "text-zinc-300"} border border-zinc-700`}
                    style={bgMode === "solid" ? { background: "var(--fb-accent-soft)" } : undefined}
                    onClick={() =>
                      setBackground({
                        type: "solid",
                        color: theme.background.type === "solid" ? theme.background.color : "#0c0c0c",
                      })
                    }
                  >
                    Solid
                  </button>
                  <button
                    className={`rounded px-2 py-1 ${bgMode === "gradient" ? "text-white" : "text-zinc-300"} border border-zinc-700`}
                    style={bgMode === "gradient" ? { background: "var(--fb-accent-soft)" } : undefined}
                    onClick={() =>
                      setBackground({
                        type: "gradient",
                        angle: theme.background.type === "gradient" ? theme.background.angle : 145,
                        stops: theme.background.type === "gradient" ? theme.background.stops : ["#0c0c0c", "#2c2c2c", "#6f6f6f"],
                      })
                    }
                  >
                    Gradient
                  </button>
                </div>
              </div>

              {solidBg ? (
                <ColorField
                  label="Background Color"
                  value={solidBg.color}
                  onChange={(hex) => setBackground({ type: "solid", color: normalizeHex(hex) })}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-400">Angle</p>
                    <p className="text-xs text-zinc-300">{gradientBg?.angle ?? 145} deg</p>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={gradientBg?.angle ?? 145}
                    onChange={(e) =>
                      setBackground({
                        type: "gradient",
                        angle: Number(e.target.value),
                        stops: gradientBg?.stops ?? ["#0c0c0c", "#2c2c2c", "#6f6f6f"],
                      })
                    }
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <ColorField
                      label="Stop 1"
                      value={gradientBg?.stops[0] ?? "#0c0c0c"}
                      onChange={(hex) => {
                        const stops = [...(gradientBg?.stops ?? ["#0c0c0c", "#2c2c2c", "#6f6f6f"])];
                        stops[0] = normalizeHex(hex);
                        setBackground({ type: "gradient", angle: gradientBg?.angle ?? 145, stops });
                      }}
                    />
                    <ColorField
                      label="Stop 2"
                      value={gradientBg?.stops[1] ?? "#2c2c2c"}
                      onChange={(hex) => {
                        const stops = [...(gradientBg?.stops ?? ["#0c0c0c", "#2c2c2c", "#6f6f6f"])];
                        stops[1] = normalizeHex(hex);
                        setBackground({ type: "gradient", angle: gradientBg?.angle ?? 145, stops });
                      }}
                    />
                    <div className="md:col-span-2">
                      <ColorField
                        label="Stop 3 (optional)"
                        value={gradientBg?.stops[2] ?? "#6f6f6f"}
                        onChange={(hex) => {
                          const stops = [...(gradientBg?.stops ?? ["#0c0c0c", "#2c2c2c", "#6f6f6f"])];
                          stops[2] = normalizeHex(hex);
                          setBackground({ type: "gradient", angle: gradientBg?.angle ?? 145, stops });
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs text-zinc-400">Preview</p>
                <ThemePreview accent={theme.accent} background={theme.background} />
                <p className="text-[11px] text-zinc-500">
                  {isCustom ? "Custom theme is active." : "Preset theme is active. Change anything above to switch to custom."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Security</h3>
          <p className="text-sm text-zinc-400">MFA and account protections.</p>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4 space-y-3">
          <p className="text-sm">
            Status:{" "}
            {mfaEnabled ? (
              <span className="text-emerald-300">Enabled</span>
            ) : (
              <span className="text-amber-300">Disabled</span>
            )}
          </p>

          {!mfaEnabled ? (
            <button
              onClick={enableMfa}
              className="rounded px-3 py-1 text-sm font-medium text-white"
              style={{ background: "var(--fb-accent)" }}
            >
              Enable Email MFA
            </button>
          ) : (
            <button onClick={disableMfa} className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-200">
              Disable MFA
            </button>
          )}

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        </div>
      </section>
    </div>
  );
}
