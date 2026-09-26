import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyPayment } from "@/lib/paystack.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/payment/return")({
  validateSearch: (search: Record<string, unknown>) => ({
    reference: typeof search["reference"] === "string" ? search["reference"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Confirming payment — YAA Mentorship" },
      { name: "description", content: "Confirming your YAA Mentorship platform fee payment." },
      { property: "og:title", content: "Confirming payment — YAA Mentorship" },
      { property: "og:description", content: "Confirming your YAA Mentorship platform fee payment." },
    ],
  }),
  component: PaymentReturn,
});

function PaymentReturn() {
  const { reference } = Route.useSearch();
  const navigate = useNavigate();
  const verify = useServerFn(verifyPayment);
  const [state, setState] = useState<"checking" | "paid" | "failed">("checking");

  useEffect(() => {
    if (!reference) {
      setState("failed");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await verify({ data: { reference } });
        if (cancelled) return;
        setState(result.status === "paid" ? "paid" : "failed");
        if (result.status === "paid") {
          setTimeout(() => navigate({ to: "/mentorships" }), 1800);
        }
      } catch {
        if (!cancelled) setState("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reference, verify, navigate]);

  return (
    <div className="container-page max-w-md py-20 text-center">
      {state === "checking" && (
        <>
          <h1 className="text-xl font-semibold">Confirming your payment…</h1>
          <p className="mt-2 text-sm text-muted-foreground">This only takes a moment.</p>
        </>
      )}
      {state === "paid" && (
        <>
          <h1 className="text-xl font-semibold">Payment confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your mentorship is now active. Taking you to your dashboard…
          </p>
        </>
      )}
      {state === "failed" && (
        <>
          <h1 className="text-xl font-semibold">We couldn't confirm that payment</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            If money left your account, it will be confirmed automatically within a few minutes.
            Otherwise you can try again from your dashboard.
          </p>
          <Button asChild className="mt-6">
            <Link to="/mentorships">Back to my mentorships</Link>
          </Button>
        </>
      )}
    </div>
  );
}
