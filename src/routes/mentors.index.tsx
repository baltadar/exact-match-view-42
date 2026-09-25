import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { StarRating } from "@/components/StarRating";

export const Route = createFileRoute("/mentors/")({
  head: () => ({
    meta: [
      { title: "Mentor directory — YAA Mentorship" },
      {
        name: "description",
        content:
          "Browse YAA mentors by area of expertise and see who offers mentorship pro bono or for a fee.",
      },
      { property: "og:title", content: "Mentor directory — YAA Mentorship" },
      {
        property: "og:description",
        content: "Browse YAA mentors by expertise, rating and pro bono or paid availability.",
      },
    ],
  }),
  component: MentorDirectory,
});

type MentorRow = {
  user_id: string;
  headline: string;
  bio: string;
  expertise: string[];
  pricing: "pro_bono" | "paid";
  rate_description: string | null;
  profiles: { id: string; full_name: string; avatar_url: string | null } | null;
};

export function useMentors() {
  return useQuery({
    queryKey: ["mentors"],
    queryFn: async () => {
      const [{ data: mentors, error }, { data: ratings }] = await Promise.all([
        supabase
          .from("mentor_details")
          .select(
            "user_id, headline, bio, expertise, pricing, rate_description, profiles!inner(id, full_name, avatar_url)",
          )
          .eq("is_published", true),
        supabase.from("ratings").select("mentor_id, stars"),
      ]);
      if (error) throw error;

      const summary = new Map<string, { total: number; count: number }>();
      for (const r of ratings ?? []) {
        const entry = summary.get(r.mentor_id) ?? { total: 0, count: 0 };
        entry.total += r.stars;
        entry.count += 1;
        summary.set(r.mentor_id, entry);
      }

      return ((mentors ?? []) as unknown as MentorRow[]).map((m) => {
        const s = summary.get(m.user_id);
        return {
          ...m,
          average: s ? s.total / s.count : 0,
          reviewCount: s?.count ?? 0,
        };
      });
    },
  });
}

function MentorDirectory() {
  const { data: mentors, isLoading } = useMentors();
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [pricing, setPricing] = useState<"all" | "pro_bono" | "paid">("all");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const m of mentors ?? []) m.expertise.forEach((t) => set.add(t));
    return [...set].sort();
  }, [mentors]);

  const filtered = (mentors ?? []).filter((m) => {
    if (pricing !== "all" && m.pricing !== pricing) return false;
    if (tag && !m.expertise.includes(tag)) return false;
    if (search) {
      const hay = `${m.profiles?.full_name} ${m.headline} ${m.expertise.join(" ")}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-semibold">Mentor directory</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Browse mentors offering their time to young advocates. Sign in when you are ready to send
        a match request.
      </p>

      <div className="mt-8 flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, headline or expertise"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "pro_bono", "paid"] as const).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={pricing === p ? "default" : "outline"}
              onClick={() => setPricing(p)}
            >
              {p === "all" ? "All mentors" : p === "pro_bono" ? "Pro bono" : "Paid"}
            </Button>
          ))}
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <button onClick={() => setTag(null)}>
              <Badge variant={tag === null ? "default" : "outline"}>All expertise</Badge>
            </button>
            {allTags.map((t) => (
              <button key={t} onClick={() => setTag(t === tag ? null : t)}>
                <Badge variant={tag === t ? "default" : "outline"}>{t}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading mentors…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          No mentors match these filters yet.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Link
              key={m.user_id}
              to="/mentors/$mentorId"
              params={{ mentorId: m.user_id }}
              className="flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <UserAvatar path={m.profiles?.avatar_url} name={m.profiles?.full_name ?? ""} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{m.profiles?.full_name}</p>
                  <p className="truncate text-sm text-muted-foreground">{m.headline}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {m.expertise.slice(0, 4).map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <StarRating value={m.average} />
                  {m.reviewCount > 0 ? (
                    <span>
                      {m.average.toFixed(1)} ({m.reviewCount})
                    </span>
                  ) : (
                    <span>No reviews</span>
                  )}
                </span>
                <Badge variant={m.pricing === "pro_bono" ? "secondary" : "outline"}>
                  {m.pricing === "pro_bono" ? "Pro bono" : "Paid"}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
