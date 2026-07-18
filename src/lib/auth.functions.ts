import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyAuthStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdminData, error: adminErr } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (adminErr) throw new Error(adminErr.message);

    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, must_change_password")
      .eq("id", context.userId)
      .maybeSingle();

    return {
      userId: context.userId,
      isAdmin: !!isAdminData,
      roles: (roles ?? []).map((r: any) => r.role as string),
      profile: profile ?? null,
    };
  });

export const clearMustChangePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles").update({ must_change_password: false }).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
