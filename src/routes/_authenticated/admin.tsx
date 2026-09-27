import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { durationLabel, formatDate } from "@/lib/mentorship";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — YAA Mentorship" },
      { name: "description", content: "YAA staff overview of mentors, matches and platform counts." },
      { property: "og:title", content: "Admin — YAA Mentorship" },
      { property: "og:description", content: "YAA staff overview of mentors, matches and platform counts." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();

  const { data: isAdmin, isLoading: checking } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  const { data } = useQuery({
    queryKey: ["admin-data"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const [mentors, matches] = await Promise.all([
        supabase
          .from("mentor_details")
          .select(
            "user_id, headline, pricing, is_published, expertise, profiles!inner(full_name, email)",
          ),
        supabase
          .from("matches")
          .select(
            "id, duration, status, start_date, end_date, mentor:profiles!matches_mentor_id_fkey(full_name), mentee:profiles!matches_mentee_id_fkey(full_name)",
          )
          .order("created_at", { ascending: false }),
      ]);
      return { mentors: mentors.data ?? [], matches: matches.data ?? [] };
    },
  });

  if (checking) {
    return <div className="container-page py-14 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="container-page py-14">
        <h1 className="text-2xl font-semibold">Staff only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is limited to Youth Advocacy Africa staff accounts.
        </p>
      </div>
    );
  }

  const mentors = data?.mentors ?? [];
  const matches = data?.matches ?? [];
  const counts = [
    { label: "Mentors", value: mentors.length },
    { label: "Active matches", value: matches.filter((m) => m.status === "active").length },
    {
      label: "Completed matches",
      value: matches.filter((m) => m.status === "completed" || m.status === "ended_early").length,
    },
  ];

  return (
    <div className="container-page py-14">
      <h1 className="text-2xl font-semibold">Admin overview</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {counts.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">All mentors</h2>
        <div className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
          {mentors.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">No mentors yet.</p>
          )}
          {mentors.map((m) => {
            const p = m.profiles as unknown as { full_name: string; email: string | null };
            return (
              <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-medium">{p?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{m.headline}</p>
                  <p className="text-xs text-muted-foreground">{p?.email}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={m.pricing === "pro_bono" ? "secondary" : "outline"}>
                    {m.pricing === "pro_bono" ? "Pro bono" : "Paid"}
                  </Badge>
                  {!m.is_published && <Badge variant="outline">Hidden</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">All matches</h2>
        <div className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
          {matches.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">No matches yet.</p>
          )}
          {matches.map((m) => {
            const mentor = m.mentor as unknown as { full_name: string };
            const mentee = m.mentee as unknown as { full_name: string };
            return (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-medium">
                    {mentor?.full_name} → {mentee?.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {durationLabel(m.duration)} · {formatDate(m.start_date)} –{" "}
                    {formatDate(m.end_date)}
                  </p>
                </div>
                <Badge variant={m.status === "active" ? "default" : "outline"}>
                  {m.status.replace("_", " ")}
                </Badge>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
