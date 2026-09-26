import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account & roles — YAA Mentorship" },
      { name: "description", content: "Update your name and whether you act as a mentor, a mentee, or both." },
      { property: "og:title", content: "Account & roles — YAA Mentorship" },
      { property: "og:description", content: "Update your name and your YAA Mentorship roles." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [isMentor, setIsMentor] = useState(false);
  const [isMentee, setIsMentee] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setIsMentor(profile.is_mentor);
      setIsMentee(profile.is_mentee);
    }
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!isMentor && !isMentee) return toast.error("Choose at least one role.");
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, is_mentor: isMentor, is_mentee: isMentee })
      .eq("id", user!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Account updated.");
  }

  return (
    <div className="container-page max-w-lg py-14">
      <h1 className="text-2xl font-semibold">Account & roles</h1>
      <form className="mt-8 space-y-6 rounded-lg border border-border bg-card p-6" onSubmit={save}>
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <fieldset className="space-y-3 rounded-md border border-border p-4">
          <legend className="px-1 text-sm font-medium">My roles</legend>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox checked={isMentee} onCheckedChange={(v) => setIsMentee(v === true)} />
            Mentee
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox checked={isMentor} onCheckedChange={(v) => setIsMentor(v === true)} />
            Mentor
          </label>
        </fieldset>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
