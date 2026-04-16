import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@flowberry.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState<string | null>(null);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setRole = useAuthStore((s) => s.setRole);
  const navigate = useNavigate();

  async function submit() {
    setError(null);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.data.requires_mfa) {
        sessionStorage.setItem("flowberry_mfa_token", data.data.mfa_token);
        navigate("/mfa");
        return;
      }

      setTokens(data.data.access_token, data.data.refresh_token);
      const me = await api.get("/auth/me", { headers: { Authorization: `Bearer ${data.data.access_token}` } });
      setRole(me.data.data.role);
      navigate("/workflows");
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Login failed");
    }
  }

  return (
    <div className="mx-auto mt-20 max-w-md rounded-lg border border-zinc-700 bg-zinc-900/70 p-6">
      <h2 className="mb-4 text-xl font-semibold">Login</h2>
      <div className="space-y-3">
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border border-zinc-700 bg-zinc-800 p-2" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border border-zinc-700 bg-zinc-800 p-2" />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button onClick={submit} className="w-full rounded bg-berry-700 p-2 font-medium">Login</button>
      </div>
    </div>
  );
}
