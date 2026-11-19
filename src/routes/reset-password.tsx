import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password · Majestic" }] }),
  component: ResetPasswordPage,
  pendingComponent: () => null,
});

// The emailed link signs the user in with a short-lived recovery session;
// this page only lets them set a new password while that session exists.
function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let settled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        settled = true;
        setStatus("ready");
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) { settled = true; setStatus("ready"); }
    });
    // Give the client a moment to read the token from the link before giving up.
    const timer = setTimeout(() => { if (!settled) setStatus("invalid"); }, 2500);
    return () => { sub.subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (password !== confirm) { toast.error("Passwords don't match."); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate({ to: "/" });
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4">
      <ThemeToggle className="absolute top-4 right-4 h-8 w-8" />
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-grid h-12 w-12 place-items-center rounded-lg bg-primary text-primary-foreground mx-auto">
            <Timer className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        </div>

        {status === "checking" && <p className="text-center text-sm text-muted-foreground">Checking your reset link…</p>}

        {status === "invalid" && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">This reset link is invalid or has expired. Request a new one from the sign-in page.</p>
            <Button asChild variant="secondary" className="w-full"><Link to="/auth">Back to sign in</Link></Button>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">New password</Label>
              <Input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Confirm new password</Label>
              <Input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : "Update password"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
