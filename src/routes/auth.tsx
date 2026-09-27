import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — YAA Mentorship" },
      {
        name: "description",
        content: "Sign in or create a YAA Mentorship account as a mentor, a mentee, or both.",
      },
      { property: "og:title", content: "Sign in — YAA Mentorship" },
      {
        property: "og:description",
        content: "Sign in or create a YAA Mentorship account as a mentor, a mentee, or both.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [asMentor, setAsMentor] = useState(false);
  const [asMentee, setAsMentee] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/mentorships", replace: true });
  }, [loading, user, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/mentorships" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (!asMentor && !asMentee) { toast.error("Choose at least one role."); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    if (error) {
      setBusy(false);
      { toast.error(error.message); return; }
    }
    if (data.session) {
      await supabase
        .from("profiles")
        .update({ full_name: fullName, is_mentor: asMentor, is_mentee: asMentee })
        .eq("id", data.session.user.id);
      setBusy(false);
      navigate({ to: asMentor ? "/mentor-profile" : "/mentorships" });
      return;
    }
    localStorage.setItem("yaa_pending_roles", JSON.stringify({ asMentor, asMentee, fullName }));
    setBusy(false);
    setCheckEmail(true);
  }

  async function googleSignIn() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) { toast.error("Google sign-in failed. Please try again."); return; }
    if (result.redirected) return;
    navigate({ to: "/mentorships" });
  }

  return (
    <div className="container-page max-w-md py-16">
      <h1 className="text-2xl font-semibold">Welcome to YAA Mentorship</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to request a mentor or to offer mentorship.
      </p>

      {checkEmail ? (
        <div className="mt-8 rounded-lg border border-border bg-card p-6 text-sm">
          <p className="font-medium">Check your email</p>
          <p className="mt-2 text-muted-foreground">
            We sent a confirmation link to {email}. Click it to finish creating your account.
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-border bg-card p-6">
          <Button variant="outline" className="w-full" onClick={googleSignIn}>
            Continue with Google
          </Button>
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="mt-6 space-y-4" onSubmit={signIn}>
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input
                    id="si-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-pass">Password</Label>
                  <Input
                    id="si-pass"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="mt-6 space-y-4" onSubmit={signUp}>
                <div className="space-y-2">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input
                    id="su-name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input
                    id="su-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pass">Password</Label>
                  <Input
                    id="su-pass"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <fieldset className="space-y-3 rounded-md border border-border p-4">
                  <legend className="px-1 text-sm font-medium">I want to join as</legend>
                  <label className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={asMentee}
                      onCheckedChange={(v) => setAsMentee(v === true)}
                    />
                    Mentee — looking for a mentor
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={asMentor}
                      onCheckedChange={(v) => setAsMentor(v === true)}
                    />
                    Mentor — offering mentorship
                  </label>
                </fieldset>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
