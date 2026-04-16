import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function MfaPage() {
  const [otpCode, setOtpCode] = useState("");
  const [email, setEmail] = useState("depressed.jellybean1811@gmail.com");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setRole = useAuthStore((s) => s.setRole);
  const navigate = useNavigate();

  async function sendCode() {
    setError(null);
    setMessage(null);
    try {
      const mfaToken = sessionStorage.getItem("flowberry_mfa_token");
      const { data } = await api.post("/auth/mfa/request", { mfa_token: mfaToken, email });
      setSentTo(data.data.sent_to);
      setMessage("OTP sent. Check your email.");
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Failed to send OTP");
    }
  }

  async function submit() {
    setError(null);
    setMessage(null);
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
      <h2 className="mb-4 text-xl font-semibold">Email Verification</h2>
      <div className="space-y-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-zinc-800 p-2"
          placeholder="Enter email to receive OTP"
        />
        <button onClick={sendCode} className="w-full rounded border border-berry-700 p-2 text-sm text-berry-700">
          Send OTP
        </button>
        {sentTo ? <p className="text-xs text-zinc-400">Sent to: {sentTo}</p> : null}
      </div>
      <input
        value={otpCode}
        onChange={(e) => setOtpCode(e.target.value)}
        maxLength={6}
        className="w-full rounded border border-zinc-700 bg-zinc-800 p-2"
        placeholder="Enter 6-digit code"
      />
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-emerald-300">{message}</p> : null}
      <button onClick={submit} className="mt-4 w-full rounded bg-berry-700 p-2 font-medium">Verify</button>
    </div>
  );
}
