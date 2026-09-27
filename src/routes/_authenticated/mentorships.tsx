import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { initializePayment } from "@/lib/paystack.functions";
import { daysLeft, durationLabel, endDateFor, formatDate } from "@/lib/mentorship";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/UserAvatar";
import { StarRating } from "@/components/StarRating";

export const Route = createFileRoute("/_authenticated/mentorships")({
  head: () => ({
    meta: [
      { title: "My mentorships — YAA Mentorship" },
      { name: "description", content: "Your pending requests, active matches and past mentorships." },
      { property: "og:title", content: "My mentorships — YAA Mentorship" },
      { property: "og:description", content: "Your pending requests, active matches and past mentorships." },
    ],
  }),
  component: MentorshipsPage,
});

type Person = { id: string; full_name: string; avatar_url: string | null };

function MentorshipsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const startPayment = useServerFn(initializePayment);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Apply role choices made during email-confirmation signup.
  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem("yaa_pending_roles");
    if (!raw) return;
    localStorage.removeItem("yaa_pending_roles");
    try {
      const { asMentor, asMentee, fullName } = JSON.parse(raw) as {
        asMentor: boolean;
        asMentee: boolean;
        fullName: string;
      };
      void supabase
        .from("profiles")
        .update({ is_mentor: asMentor, is_mentee: asMentee, full_name: fullName })
        .eq("id", user.id)
        .then(() => refreshProfile());
    } catch {
      /* ignore malformed value */
    }
  }, [user, refreshProfile]);

  const { data, isLoading } = useQuery({
    queryKey: ["mentorships", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const [requests, matches, ratings] = await Promise.all([
        supabase
          .from("match_requests")
          .select(
            "id, mentee_id, mentor_id, message, proposed_duration, status, created_at, mentee:profiles!match_requests_mentee_id_fkey(id, full_name, avatar_url), mentor:profiles!match_requests_mentor_id_fkey(id, full_name, avatar_url)",
          )
          .or(`mentee_id.eq.${uid},mentor_id.eq.${uid}`)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("matches")
          .select(
            "id, mentor_id, mentee_id, duration, start_date, end_date, status, mentee:profiles!matches_mentee_id_fkey(id, full_name, avatar_url), mentor:profiles!matches_mentor_id_fkey(id, full_name, avatar_url)",
          )
          .or(`mentee_id.eq.${uid},mentor_id.eq.${uid}`)
          .order("created_at", { ascending: false }),
        supabase.from("ratings").select("id, match_id, stars, review"),
      ]);
      return {
        requests: requests.data ?? [],
        matches: matches.data ?? [],
        ratings: ratings.data ?? [],
      };
    },
  });

  if (!user) return null;

  const requests = data?.requests ?? [];
  const matches = data?.matches ?? [];
  const ratings = data?.ratings ?? [];

  const live = matches.filter((m) => m.status === "active" || m.status === "pending_payment");
  const past = matches.filter((m) => m.status === "completed" || m.status === "ended_early");

  function other(row: { mentor: unknown; mentee: unknown; mentor_id: string }) {
    return (row.mentor_id === user!.id ? row.mentee : row.mentor) as Person;
  }

  async function respond(
    req: { id: string; mentee_id: string; mentor_id: string; proposed_duration: string },
    accept: boolean,
  ) {
    setBusyId(req.id);
    if (!accept) {
      await supabase.from("match_requests").update({ status: "declined" }).eq("id", req.id);
    } else {
      const { error } = await supabase.from("match_requests").update({ status: "accepted" }).eq("id", req.id);
      if (!error) {
        const duration = req.proposed_duration as Parameters<typeof endDateFor>[0];
        await supabase.from("matches").insert({
          request_id: req.id,
          mentor_id: req.mentor_id,
          mentee_id: req.mentee_id,
          duration,
          end_date: endDateFor(duration),
        });
      }
    }
    setBusyId(null);
    toast.success(accept ? "Request accepted." : "Request declined.");
    void queryClient.invalidateQueries({ queryKey: ["mentorships", user!.id] });
  }

  async function cancelRequest(id: string) {
    setBusyId(id);
    await supabase.from("match_requests").update({ status: "cancelled" }).eq("id", id);
    setBusyId(null);
    void queryClient.invalidateQueries({ queryKey: ["mentorships", user!.id] });
  }

  async function pay(matchId: string) {
    setBusyId(matchId);
    try {
      const { authorizationUrl } = await startPayment({ data: { matchId } });
      window.location.href = authorizationUrl;
    } catch (err) {
      setBusyId(null);
      toast.error(err instanceof Error ? err.message : "Could not start the payment.");
    }
  }

  async function endMatch(matchId: string) {
    setBusyId(matchId);
    await supabase
      .from("matches")
      .update({ status: "ended_early", ended_at: new Date().toISOString() })
      .eq("id", matchId);
    setBusyId(null);
    toast.success("Mentorship ended.");
    void queryClient.invalidateQueries({ queryKey: ["mentorships", user!.id] });
  }

  return (
    <div className="container-page py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My mentorships</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Requests, active matches and past mentorships in one place.
          </p>
        </div>
        {profile?.is_mentor ? (
          <Button asChild variant="outline">
            <Link to="/mentor-profile">Edit mentor profile</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link to="/mentors">Browse mentors</Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Tabs defaultValue="pending" className="mt-8">
          <TabsList>
            <TabsTrigger value="pending">Pending ({requests.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({live.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6 space-y-4">
            {requests.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            )}
            {requests.map((r) => {
              const person = other(r);
              const iAmMentor = r.mentor_id === user.id;
              return (
                <div key={r.id} className="rounded-lg border border-border bg-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar path={person?.avatar_url} name={person?.full_name ?? ""} />
                      <div>
                        <p className="font-medium">{person?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {iAmMentor ? "Wants you as a mentor" : "Awaiting mentor's response"} ·{" "}
                          {durationLabel(r.proposed_duration)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {iAmMentor ? (
                        <>
                          <Button
                            size="sm"
                            disabled={busyId === r.id}
                            onClick={() => respond(r, true)}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === r.id}
                            onClick={() => respond(r, false)}
                          >
                            Decline
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === r.id}
                          onClick={() => cancelRequest(r.id)}
                        >
                          Cancel request
                        </Button>
                      )}
                    </div>
                  </div>
                  {r.message && (
                    <p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-sm text-muted-foreground">
                      {r.message}
                    </p>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="active" className="mt-6 space-y-4">
            {live.length === 0 && (
              <p className="text-sm text-muted-foreground">No active mentorships yet.</p>
            )}
            {live.map((m) => {
              const person = other(m);
              const awaitingPayment = m.status === "pending_payment";
              const iAmMentee = m.mentee_id === user.id;
              return (
                <div key={m.id} className="rounded-lg border border-border bg-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar path={person?.avatar_url} name={person?.full_name ?? ""} />
                      <div>
                        <p className="font-medium">{person?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {durationLabel(m.duration)} · ends {formatDate(m.end_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {awaitingPayment ? (
                        <>
                          <Badge variant="outline">Awaiting $3 platform fee</Badge>
                          {iAmMentee && (
                            <Button size="sm" disabled={busyId === m.id} onClick={() => pay(m.id)}>
                              {busyId === m.id ? "Opening…" : "Pay $3 to activate"}
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary">{daysLeft(m.end_date)} days left</Badge>
                          <Button asChild size="sm">
                            <Link to="/chat/$matchId" params={{ matchId: m.id }}>
                              Open chat
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === m.id}
                            onClick={() => endMatch(m.id)}
                          >
                            End early
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="past" className="mt-6 space-y-4">
            {past.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing here yet.</p>
            )}
            {past.map((m) => {
              const person = other(m);
              const rating = ratings.find((r) => r.match_id === m.id);
              const canRate = m.mentee_id === user.id && !rating;
              return (
                <div key={m.id} className="rounded-lg border border-border bg-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar path={person?.avatar_url} name={person?.full_name ?? ""} />
                      <div>
                        <p className="font-medium">{person?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {durationLabel(m.duration)} · ended {formatDate(m.end_date)}
                        </p>
                      </div>
                    </div>
                    {rating ? (
                      <div className="text-right">
                        <StarRating value={rating.stars} />
                        {rating.review && (
                          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                            {rating.review}
                          </p>
                        )}
                      </div>
                    ) : canRate ? (
                      <RateDialog
                        matchId={m.id}
                        mentorId={m.mentor_id}
                        menteeId={m.mentee_id}
                        onDone={() =>
                          queryClient.invalidateQueries({ queryKey: ["mentorships", user.id] })
                        }
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">No rating left</span>
                    )}
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function RateDialog({
  matchId,
  mentorId,
  menteeId,
  onDone,
}: {
  matchId: string;
  mentorId: string;
  menteeId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const { error } = await supabase.from("ratings").insert({
      match_id: matchId,
      mentor_id: mentorId,
      mentee_id: menteeId,
      stars,
      review: review.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setOpen(false);
    toast.success("Thanks for the review.");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Leave a review
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate your mentor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <StarRating value={stars} onChange={setStars} size={26} />
          <Textarea
            rows={5}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="A short review to help other mentees (optional)."
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Submitting…" : "Submit review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
