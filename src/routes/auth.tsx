import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { business } from "@/lib/business";

const OWNER_EMAIL = "ghafoormotorssprt@gmail.com";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff Sign In | Ghafoor Motors Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "owner-signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  // If already signed in, bounce to /admin
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" as any });
    });
  }, [navigate]);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg({});
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMsg({ err: error.message });
    await router.invalidate();
    navigate({ to: "/admin" as any });
  }

  async function onOwnerSignup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg({});
    if (email.trim().toLowerCase() !== OWNER_EMAIL) {
      setBusy(false);
      return setMsg({ err: "Sign-up is disabled. Only the shop owner can create the initial account." });
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setBusy(false);
    if (error) return setMsg({ err: error.message });
    setMsg({ ok: "Account created. Check your email to confirm, then sign in." });
    setMode("signin");
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg({});
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return setMsg({ err: error.message });
    setMsg({ ok: "If that account exists, a reset link has been sent." });
  }

  return (
    <div className="min-h-[80vh] bg-ink py-16">
      <div className="container-x max-w-md">
        <div className="card-surface bg-white p-6 md:p-8">
          <p className="eyebrow text-primary">{business.shortName} Admin</p>
          <h1 className="mt-2 font-display text-2xl">
            {mode === "signin" && "Staff Sign In"}
            {mode === "owner-signup" && "Create Owner Account"}
            {mode === "forgot" && "Reset Password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" && "Access is restricted to invited staff."}
            {mode === "owner-signup" && "One-time setup for the shop owner only."}
            {mode === "forgot" && "We'll email you a secure link."}
          </p>

          <form onSubmit={mode === "signin" ? onSignIn : mode === "owner-signup" ? onOwnerSignup : onForgot} className="mt-5 space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm" />
            </label>
            {mode !== "forgot" && (
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Password</span>
                <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm" />
              </label>
            )}

            {msg.err && <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-700">{msg.err}</div>}
            {msg.ok && <div className="rounded-md bg-green-50 p-2.5 text-sm text-green-700">{msg.ok}</div>}

            <button disabled={busy} className="btn-primary w-full">
              {busy ? "Please wait…" : mode === "signin" ? "Sign In" : mode === "owner-signup" ? "Create Account" : "Send Reset Link"}
            </button>
          </form>

          <div className="mt-5 space-y-1.5 text-center text-xs text-muted-foreground">
            {mode === "signin" && (
              <>
                <button className="underline hover:text-primary" onClick={() => { setMsg({}); setMode("forgot"); }}>Forgot password?</button>
                <div>
                  Owner first-time setup?{" "}
                  <button className="underline hover:text-primary" onClick={() => { setMsg({}); setMode("owner-signup"); }}>
                    Create owner account
                  </button>
                </div>
              </>
            )}
            {mode !== "signin" && (
              <button className="underline hover:text-primary" onClick={() => { setMsg({}); setMode("signin"); }}>← Back to sign in</button>
            )}
          </div>
        </div>
        <div className="mt-6 text-center text-xs text-white/60">
          <Link to="/" className="hover:text-primary">← Back to website</Link>
        </div>
      </div>
    </div>
  );
}
