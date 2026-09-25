import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DURATIONS, type DurationValue, formatDate } from "@/lib/mentorship";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/UserAvatar";
import { StarRating } from "@/components/StarRating";

export const Route = createFileRoute("/mentors/$mentorId")({
  head: () => ({
    meta: [
      { title: "Mentor profile — YAA Mentorship" },
      {
        name: "description",
        content: "Read a YAA mentor's background, expertise, ratings and reviews.",
      },
      { property: "og:title", content: "Mentor profile — YAA Mentorship" },
      {
        property: "og:description",
        content: "Read a YAA mentor's background, expertise, ratings and reviews.",
      },
    ],
  }),
  component: MentorProfilePage,
});

function MentorProfilePage() {
  const { mentorId } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<DurationValue>("monthly");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["mentor", mentorId],
    queryFn: async () => {
      const [{ data: mentor, error }, { data: reviews }] = await Promise.all([
        supabase
          .from("mentor_details")
          .select(
            "user_id, headline, bio, expertise, pricing, rate_description, profiles!inner(id, full_name, avatar_url)",
          )
          .eq("user_id", mentorId)
          .maybeSingle(),
        supabase
          .from("ratings")
          .select("id, stars, review, created_at, mentee_id, profiles!ratings_mentee_id_fkey(full_name)")
          .eq("mentor_id", mentorId)
          .order("created_at", { ascending: false }),
      ]);
      if (error) throw error;
      return { mentor, reviews: reviews ?? [] };
    },
  });

  const { data: existingRequest } = useQuery({
    queryKey: ["my-request", mentorId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("match_requests")
        .select("id, status")
        .eq("mentor_id", mentorId)
        .eq("mentee_id", user!.id)
        .eq("status", "pending")
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) {
    return <div className="container-page py-14 text-sm text-muted-foreground">Loading…</div>;
  }

  const mentor = data?.mentor as
    | {
        user_id: string;
        headline: string;
        bio: string;
        expertise: string[];
        pricing: "pro_bono" | "paid";
        rate_description: string | null;
        profiles: { full_name: string; avatar_url: string | null };
      }
    | null
    | undefined;

  if (!mentor) {
    return (
      <div className="container-page py-14">
        <h1 className="text-2xl font-semibold">Mentor not found</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/mentors">Back to directory</Link>
        </Button>
      </div>
    );
  }

  const reviews = data?.reviews ?? [];
  const average =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length : 0;
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.stars === star).length,
  }));

  async function sendRequest() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("match_requests").insert({
      mentor_id: mentorId,
      mentee_id: user.id,
      message,
      proposed_duration: duration,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Request sent. You'll see it under My mentorships.");
    setOpen(false);
    setMessage("");
    void queryClient.invalidateQueries({ queryKey: ["my-request", mentorId, user.id] });
  }

  const isSelf = user?.id === mentorId;

  return (
    <div className="container-page grid gap-10 py-14 lg:grid-cols-[2fr_1fr]">
      <div>
        <div className="flex flex-wrap items-start gap-5">
          <UserAvatar
            path={mentor.profiles.avatar_url}
            name={mentor.profiles.full_name}
            className="size-20 text-lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold">{mentor.profiles.full_name}</h1>
            <p className="mt-1 text-muted-foreground">{mentor.headline}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-2">
                <StarRating value={average} />
                <span className="text-muted-foreground">
                  {reviews.length > 0
                    ? `${average.toFixed(1)} · ${reviews.length} review${reviews.length > 1 ? "s" : ""}`
                    : "No reviews yet"}
                </span>
              </span>
              <Badge variant={mentor.pricing === "pro_bono" ? "secondary" : "outline"}>
                {mentor.pricing === "pro_bono" ? "Pro bono" : "Paid"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {mentor.expertise.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {mentor.bio || "This mentor hasn't added a bio yet."}
          </p>
        </section>

        {mentor.pricing === "paid" && mentor.rate_description && (
          <section className="mt-8 rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Mentor's rate</h2>
            <p className="mt-2 text-sm text-muted-foreground">{mentor.rate_description}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Payment for the mentor's own time is arranged directly between the two of you,
              outside the platform.
            </p>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Reviews</h2>
          <div className="mt-4 space-y-1">
            {breakdown.map((b) => (
              <div key={b.star} className="flex items-center gap-3 text-sm">
                <span className="w-10 text-muted-foreground">{b.star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${reviews.length ? (b.count / reviews.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="w-6 text-right text-muted-foreground">{b.count}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {reviews.length === 0 && (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
            {reviews.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <StarRating value={r.stars} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(r.created_at)}
                  </span>
                </div>
                {r.review && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.review}</p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  — {(r as { profiles?: { full_name?: string } }).profiles?.full_name ?? "Mentee"}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-lg border border-border bg-card p-6 lg:sticky lg:top-8">
        <h2 className="text-base font-semibold">Request mentorship</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Propose a duration and introduce yourself. If {mentor.profiles.full_name.split(" ")[0]}{" "}
          accepts, you pay a one-time $3 platform fee to activate the match.
        </p>

        {isSelf ? (
          <p className="mt-5 text-sm text-muted-foreground">This is your own profile.</p>
        ) : existingRequest ? (
          <p className="mt-5 text-sm text-muted-foreground">
            You already have a pending request with this mentor.
          </p>
        ) : !user ? (
          <Button asChild className="mt-5 w-full">
            <Link to="/auth">Sign in to request</Link>
          </Button>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="mt-5 w-full">Request mentorship</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request {mentor.profiles.full_name}</DialogTitle>
                <DialogDescription>
                  Sent as {profile?.full_name || user.email}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Proposed duration</Label>
                  <Select
                    value={duration}
                    onValueChange={(v) => setDuration(v as DurationValue)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="msg">Short message</Label>
                  <Textarea
                    id="msg"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What you're working on and what you hope to get from the mentorship."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={sendRequest} disabled={sending || message.trim().length < 5}>
                  {sending ? "Sending…" : "Send request"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </aside>
    </div>
  );
}
