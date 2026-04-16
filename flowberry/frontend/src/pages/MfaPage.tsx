import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function MfaPage() {
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setRole = useAuthStore((s) => s.setRole);
  const navigate = useNavigate();

  async function submit() {
    setError(null);
    try {
      const mfaToken = sessionStorage.getItem("flowberry_mfa_token");
      const { data } = await api.post("/auth/mfa/verify", { mfa_token: mfaToken, otp_code: otpCode });
      setTokens(data.data.access_token, data.data.refresh_token);
      const me = await api.get("/auth/me", { headers: { Authorization: `Bearer ${data.data.access_token}` } });
      setRole(me.data.data.role);
      navigate("/workflows");
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "MFA failed");
    }
  }

  return (
    <div className="mx-auto mt-20 max-w-md rounded-lg border border-zinc-700 bg-zinc-900/70 p-6">
      <h2 className="mb-4 text-xl font-semibold">MFA Verification</h2>
      <input
        value={otpCode}
        onChange={(e) => setOtpCode(e.target.value)}
        maxLength={6}
        className="w-full rounded border border-zinc-700 bg-zinc-800 p-2"
        placeholder="Enter 6-digit code"
      />
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      <button onClick={submit} className="mt-4 w-full rounded bg-berry-700 p-2 font-medium">Verify</button>
    </div>
  );
}
