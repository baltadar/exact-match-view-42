import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { daysLeft, formatDate, formatTime } from "@/lib/mentorship";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/_authenticated/chat/$matchId")({
  head: () => ({
    meta: [
      { title: "Mentorship chat — YAA Mentorship" },
      { name: "description", content: "Message your mentor or mentee inside an active mentorship." },
      { property: "og:title", content: "Mentorship chat — YAA Mentorship" },
      { property: "og:description", content: "Message your mentor or mentee inside an active mentorship." },
    ],
  }),
  component: ChatPage,
});

type Message = { id: string; sender_id: string; body: string; created_at: string };

function ChatPage() {
  const { matchId } = Route.useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: match } = useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select(
          "id, mentor_id, mentee_id, end_date, status, mentee:profiles!matches_mentee_id_fkey(id, full_name, avatar_url), mentor:profiles!matches_mentor_id_fkey(id, full_name, avatar_url)",
        )
        .eq("id", matchId)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });
      if (active) setMessages(data ?? []);
    })();

    const channel = supabase
      .channel(`messages-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!match || !user) {
    return <div className="container-page py-14 text-sm text-muted-foreground">Loading…</div>;
  }

  const person = (match.mentor_id === user.id ? match.mentee : match.mentor) as {
    full_name: string;
    avatar_url: string | null;
  };
  const isActive = match.status === "active";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    const { error } = await supabase
      .from("messages")
      .insert({ match_id: matchId, sender_id: user!.id, body: draft.trim() });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setDraft("");
  }

  return (
    <div className="container-page max-w-3xl py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-t-lg border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <UserAvatar path={person?.avatar_url} name={person?.full_name ?? ""} />
          <div>
            <p className="font-medium">{person?.full_name}</p>
            <p className="text-sm text-muted-foreground">
              {isActive
                ? `${daysLeft(match.end_date)} days left · ends ${formatDate(match.end_date)}`
                : "This mentorship has ended"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isActive && <Badge variant="outline">Read only</Badge>}
          <Button asChild variant="outline" size="sm">
            <Link to="/mentorships">Back</Link>
          </Button>
        </div>
      </div>

      <div className="h-[55vh] space-y-3 overflow-y-auto border-x border-border bg-background p-5">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet. Say hello.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  mine
                    ? "max-w-[75%] rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
                    : "max-w-[75%] rounded-lg border border-border bg-card px-4 py-2 text-sm"
                }
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p
                  className={
                    mine
                      ? "mt-1 text-[11px] text-primary-foreground/70"
                      : "mt-1 text-[11px] text-muted-foreground"
                  }
                >
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="space-y-3 rounded-b-lg border border-border bg-card p-5">
        <Textarea
          rows={3}
          value={draft}
          disabled={!isActive}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={isActive ? "Write a message…" : "This mentorship has ended."}
        />
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Text only. Arrange calls or emails on a platform of your choice.
          </p>
          <Button type="submit" disabled={!isActive || sending || !draft.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
