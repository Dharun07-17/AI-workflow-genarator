import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";

function loadGoogleIdentityScript(): Promise<void> {
  if ((window as any).google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-identity]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity script"));
    document.head.appendChild(script);
  });
}

export default function LoginPage() {
  const [email, setEmail] = useState("admin@flowberry.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setRole = useAuthStore((s) => s.setRole);
  const navigate = useNavigate();
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  async function finishLogin(accessToken: string, refreshToken: string) {
    setTokens(accessToken, refreshToken);
    const me = await api.get("/auth/me", { headers: { Authorization: `Bearer ${accessToken}` } });
    setRole(me.data.data.role);
    navigate("/workflows");
  }

  async function submitPassword() {
    setError(null);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.data.requires_mfa) {
        sessionStorage.setItem("flowberry_mfa_token", data.data.mfa_token);
        navigate("/mfa");
        return;
      }

      await finishLogin(data.data.access_token, data.data.refresh_token);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Login failed");
    }
  }

  useEffect(() => {
    let mounted = true;
    api
      .get("/auth/public-config")
      .then((res) => {
        const id = res?.data?.data?.google_oauth_client_id ?? null;
        if (mounted) setGoogleClientId(id);
      })
      .catch(() => {
        // ignore; Google sign-in is optional
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!googleClientId) return;
    if (!googleBtnRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        await loadGoogleIdentityScript();
        if (cancelled) return;

        const google = (window as any).google;
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (resp: { credential?: string }) => {
            const credential = resp?.credential;
            if (!credential) {
              setError("Google sign-in failed (missing credential).");
              return;
            }
            try {
              const { data } = await api.post("/auth/google/login", { credential });
              if (data.data.requires_mfa) {
                sessionStorage.setItem("flowberry_mfa_token", data.data.mfa_token);
                navigate("/mfa");
                return;
              }
              await finishLogin(data.data.access_token, data.data.refresh_token);
            } catch (e: any) {
              setError(e?.response?.data?.error?.message ?? "Google sign-in failed");
            }
          },
        });

        // Render the official Google button into our container.
        googleBtnRef.current!.innerHTML = "";
        google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "signin_with",
          width: 320,
        });

        setGoogleReady(true);
      } catch (e: any) {
        setError(e?.message ?? "Failed to initialize Google sign-in");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [googleClientId, navigate]);

  return (
    <div className="mx-auto mt-20 max-w-md rounded-lg border border-zinc-700 bg-zinc-900/70 p-8 text-white">
      <h2 className="mb-6 text-2xl font-semibold tracking-wide text-white">Login</h2>
      <div className="space-y-5 text-white">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-3 text-lg leading-relaxed tracking-wide text-white placeholder:text-white/60"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-3 text-lg leading-relaxed tracking-wide text-white placeholder:text-white/60"
        />
        {error ? <p className="text-base leading-relaxed text-red-400 tracking-wide">{error}</p> : null}
        <button
          onClick={submitPassword}
          className="w-full rounded px-3 py-3 text-lg font-medium tracking-wide text-white"
          style={{ background: "var(--fb-accent)" }}
        >
          Login
        </button>

        <div className="pt-2">
          <div className="mb-2 text-center text-xs text-white/70">or</div>

          {googleClientId ? (
            <>
              <div className="flex justify-center">
                <div ref={googleBtnRef} />
              </div>
              {!googleReady ? <p className="mt-2 text-center text-xs text-white/70">Loading Google sign-in…</p> : null}
            </>
          ) : (
            <>
              <button
                type="button"
                disabled
                className="flex w-full items-center justify-center gap-3 rounded border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm text-zinc-300 opacity-60"
                title="Set GOOGLE_OAUTH_CLIENT_ID to enable Google sign-in."
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-white text-sm font-semibold text-zinc-900">
                  G
                </span>
                <span className="font-medium">Sign in with Google</span>
              </button>
              <p className="mt-2 text-center text-xs text-white/70">
                Google sign-in is disabled until <code className="text-white">GOOGLE_OAUTH_CLIENT_ID</code> is configured.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
