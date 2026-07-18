import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearMustChangePassword } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated/admin/change-password")({
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const navigate = useNavigate();
  const clearFlag = useServerFn(clearMustChangePassword);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg({});
    if (pw.length < 8) return setMsg({ err: "Password must be at least 8 characters." });
    if (pw !== confirm) return setMsg({ err: "Passwords do not match." });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setBusy(false); return setMsg({ err: error.message }); }
    try { await clearFlag(); } catch (e: any) { setBusy(false); return setMsg({ err: e.message }); }
    setBusy(false);
    setMsg({ ok: "Password updated." });
    setTimeout(() => navigate({ to: "/admin" as any }), 900);
  }

  return (
    <div className="max-w-md">
      <h1 className="font-display text-2xl">Set a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">You must change your password before continuing.</p>
      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <input type="password" required minLength={8} placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)}
          className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm" />
        <input type="password" required minLength={8} placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
          className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm" />
        {msg.err && <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-700">{msg.err}</div>}
        {msg.ok && <div className="rounded-md bg-green-50 p-2.5 text-sm text-green-700">{msg.ok}</div>}
        <button disabled={busy} className="btn-primary w-full">{busy ? "Updating…" : "Update password"}</button>
      </form>
    </div>
  );
}
