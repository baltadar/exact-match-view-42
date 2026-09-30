import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MessagesSquare, Star, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import classroomPhoto from "@/assets/mentorship-classroom.jpg.asset.json";
import studentsPhoto from "@/assets/student-friendship.jpg.asset.json";
import youthPhoto from "@/assets/youth-group.jpg.asset.json";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
        <div className="container-page grid gap-10 py-12 md:grid-cols-[1fr_0.92fr] md:items-center md:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase text-primary">
              Youth Advocacy Africa
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">
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
          <div className="relative grid h-[390px] grid-cols-5 grid-rows-5 gap-3 md:h-[470px]">
            <img
              src={classroomPhoto.url}
              alt="A mentor supporting a young student in class"
              className="col-span-4 row-span-4 h-full w-full rounded-md object-cover"
            />
            <img
              src={studentsPhoto.url}
              alt="Two students smiling together"
              className="col-span-3 col-start-3 row-span-2 row-start-4 h-full w-full rounded-md border-4 border-card object-cover"
            />
            <div className="col-span-2 row-span-2 row-start-1 flex items-end bg-primary p-4 text-primary-foreground sm:p-5">
              <p className="font-display text-lg font-semibold leading-snug">Guidance for the work that matters.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <div className="grid gap-6 border-y border-border py-8 md:grid-cols-[0.7fr_1.3fr] md:items-center">
          <h2 className="font-display text-2xl font-semibold">A clear path from introduction to impact.</h2>
          <div className="grid gap-3 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
            <p>
              Browse and request for free. After a mentor accepts, the mentee pays a one-time
              <span className="font-semibold text-foreground"> $3 platform fee</span> to activate the match.
            </p>
            <p>Mentors who charge for their own time arrange that directly with their mentee outside the platform.</p>
          </div>
        </div>

        <p className="mt-14 text-sm font-semibold uppercase text-primary">How it works</p>
        <div className="relative mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="flex min-h-72 flex-col justify-center border border-border bg-card px-7 py-10 text-center shadow-sm odd:rounded-[48%_52%_46%_54%/54%_43%_57%_46%] even:rounded-[54%_46%_52%_48%/46%_56%_44%_54%] lg:even:translate-y-7"
            >
              <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-accent text-primary">
                <step.icon className="size-5" />
              </span>
              <p className="mt-4 text-xs font-semibold text-primary">0{index + 1}</p>
              <h3 className="mt-2 font-display text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary">
        <div className="container-page grid gap-8 py-14 md:grid-cols-[0.9fr_1.1fr] md:items-center md:py-16">
          <img
            src={youthPhoto.url}
            alt="Young African students gathered together"
            className="aspect-[16/10] h-full w-full rounded-md object-cover"
          />
          <div className="max-w-lg md:pl-6">
            <p className="text-sm font-semibold uppercase text-primary">Built around people</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight">
              Experience shared. Confidence built. Advocacy strengthened.
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Meaningful mentorship gives young advocates a trusted person to ask, test ideas with,
              and learn from as they shape their contribution.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/mentors">Meet the mentors</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
