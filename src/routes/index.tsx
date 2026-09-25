import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MessagesSquare, Star, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YAA Mentorship — Youth Advocacy Africa" },
      {
        name: "description",
        content:
          "Find a mentor or offer your experience. YAA Mentorship connects young African advocates with experienced mentors through simple, accountable matches.",
      },
      { property: "og:title", content: "YAA Mentorship — Youth Advocacy Africa" },
      {
        property: "og:description",
        content:
          "Browse mentors, request a match, and work together for an agreed period with in-app messaging.",
      },
    ],
  }),
  component: Home,
});

const steps = [
  {
    icon: UsersRound,
    title: "Browse mentors",
    body: "Search by area of expertise and see whether a mentor offers their time pro bono or for a fee. No account needed to look around.",
  },
  {
    icon: ArrowRight,
    title: "Request a match",
    body: "Pick a duration — a week, a month, six months or a year — and send a short message. The mentor accepts or declines.",
  },
  {
    icon: MessagesSquare,
    title: "Work together",
    body: "Accepted pairs get a private message thread and a visible end date. Calls and email happen on platforms you choose.",
  },
  {
    icon: Star,
    title: "Leave a review",
    body: "When the mentorship ends, mentees rate their mentor from 1 to 5 stars. Ratings show on public mentor profiles.",
  },
];

function Home() {
  return (
    <div>
      <section className="border-b border-border bg-card">
        <div className="container-page grid gap-10 py-20 md:grid-cols-[1.2fr_1fr] md:items-center md:py-28">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Youth Advocacy Africa
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              Mentorship that is simple, intentional and accountable.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              YAA Mentorship connects young advocates with experienced mentors across policy,
              climate, health, law, media and more. Agree on a duration, message in-app, and
              review the experience when it ends.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/mentors">Browse mentors</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Become a mentor</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              How the fee works
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Browsing and requesting is free. Once a mentor accepts a request, the mentee pays a
              one-time <span className="font-semibold text-foreground">$3 platform fee</span> to
              activate the match. That is the only fee the platform collects.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Mentors who charge for their own time arrange that directly with their mentee,
              outside the platform.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.title} className="rounded-lg border border-border bg-card p-6">
              <step.icon className="size-5 text-primary" />
              <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
