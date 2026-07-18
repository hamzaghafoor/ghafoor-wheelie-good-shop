import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password | Ghafoor Motors Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
  ssr: false,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  useEffect(() => {
    // Supabase automatically parses the recovery hash and sets a session
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg({});
    if (password.length < 8) return setMsg({ err: "Password must be at least 8 characters." });
    if (password !== confirm) return setMsg({ err: "Passwords do not match." });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg({ err: error.message });
    setMsg({ ok: "Password updated. Redirecting…" });
    setTimeout(() => navigate({ to: "/admin" as any }), 1200);
  }

  return (
    <div className="min-h-[80vh] bg-ink py-16">
      <div className="container-x max-w-md">
        <div className="card-surface bg-white p-6 md:p-8">
          <h1 className="font-display text-2xl">Reset your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready ? "Choose a strong new password." : "Waiting for reset link to activate…"}
          </p>
          {ready && (
            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">New password</span>
                <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Confirm password</span>
                <input required minLength={8} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm" />
              </label>
              {msg.err && <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-700">{msg.err}</div>}
              {msg.ok && <div className="rounded-md bg-green-50 p-2.5 text-sm text-green-700">{msg.ok}</div>}
              <button disabled={busy} className="btn-primary w-full">{busy ? "Updating…" : "Update password"}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
