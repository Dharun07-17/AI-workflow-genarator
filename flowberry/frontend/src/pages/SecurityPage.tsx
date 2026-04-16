import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function SecurityPage() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Security</h2>
        <p className="text-sm text-zinc-400">Enable Google Authenticator for login MFA.</p>
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
          <button onClick={enableMfa} className="rounded bg-berry-700 px-3 py-1 text-sm font-medium text-white">
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
    </div>
  );
}
