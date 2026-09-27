import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/_authenticated/mentor-profile")({
  head: () => ({
    meta: [
      { title: "Mentor profile — YAA Mentorship" },
      { name: "description", content: "Set up your public mentor profile: bio, photo, expertise tags and pricing." },
      { property: "og:title", content: "Mentor profile — YAA Mentorship" },
      { property: "og:description", content: "Set up your public mentor profile on YAA Mentorship." },
    ],
  }),
  component: MentorOnboarding,
});

const SUGGESTED = [
  "Advocacy",
  "Climate",
  "Community organising",
  "Fundraising",
  "Gender equality",
  "Governance",
  "Health",
  "Human rights",
  "Law",
  "Media",
  "Policy",
  "Public speaking",
  "Research",
  "Youth leadership",
];

function MentorOnboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [paid, setPaid] = useState(false);
  const [rate, setRate] = useState("");
  const [published, setPublished] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("mentor_details")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setHeadline(data.headline);
        setBio(data.bio);
        setTags(data.expertise);
        setPaid(data.pricing === "paid");
        setRate(data.rate_description ?? "");
        setPublished(data.is_published);
      }
    })();
  }, [user]);

  function addTag(value: string) {
    const tag = value.trim();
    if (!tag || tags.includes(tag)) return;
    setTags([...tags, tag]);
    setTagInput("");
  }

  async function uploadPhoto(file: File) {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      { toast.error(error.message); return; }
    }
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
    await refreshProfile();
    setUploading(false);
    toast.success("Photo updated.");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (tags.length === 0) { toast.error("Add at least one expertise tag."); return; }
    setBusy(true);
    const payload = {
      user_id: user.id,
      headline,
      bio,
      expertise: tags,
      pricing: paid ? ("paid" as const) : ("pro_bono" as const),
      rate_description: paid ? rate : null,
      is_published: published,
    };
    const { error } = await supabase.from("mentor_details").upsert(payload);
    if (!error && !profile?.is_mentor) {
      await supabase.from("profiles").update({ is_mentor: true }).eq("id", user.id);
      await refreshProfile();
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mentor profile saved.");
  }

  return (
    <div className="container-page max-w-2xl py-14">
      <h1 className="text-2xl font-semibold">Your mentor profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This is what mentees see in the directory and on your public profile page.
      </p>

      <form className="mt-8 space-y-6 rounded-lg border border-border bg-card p-6" onSubmit={save}>
        <div className="flex items-center gap-4">
          <UserAvatar
            path={profile?.avatar_url}
            name={profile?.full_name ?? ""}
            className="size-16 text-base"
          />
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadPhoto(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Uploading…" : "Upload photo"}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">JPG or PNG, up to 5MB.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="headline">One-line headline</Label>
          <Input
            id="headline"
            required
            maxLength={120}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Climate policy advisor, 10 years across East Africa"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            rows={7}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Your background, the kind of mentee you can help, and how you like to work."
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="tags">Areas of expertise</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="gap-1">
                {t}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))}>
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="Add a tag and press Enter"
            />
            <Button type="button" variant="outline" onClick={() => addTag(tagInput)}>
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTED.filter((s) => !tags.includes(s)).map((s) => (
              <button key={s} type="button" onClick={() => addTag(s)}>
                <Badge variant="outline">+ {s}</Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-border p-4">
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>
              <span className="font-medium">I charge for my time</span>
              <span className="mt-1 block text-muted-foreground">
                Off means you offer mentorship pro bono.
              </span>
            </span>
            <Switch checked={paid} onCheckedChange={setPaid} />
          </label>
          {paid && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="rate">Rate description</Label>
              <Input
                id="rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="$40 per session, negotiable for students"
              />
              <p className="text-xs text-muted-foreground">
                You arrange this payment directly with your mentee — the platform only collects
                its flat $3 fee.
              </p>
            </div>
          )}
        </div>

        <label className="flex items-center justify-between gap-4 text-sm">
          <span>
            <span className="font-medium">Show my profile in the directory</span>
            <span className="mt-1 block text-muted-foreground">
              Turn off to pause new requests.
            </span>
          </span>
          <Switch checked={published} onCheckedChange={setPublished} />
        </label>

        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
