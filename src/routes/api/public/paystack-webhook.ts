import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"];
        if (!secret) return new Response("Not configured", { status: 500 });

        const body = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const expected = createHmac("sha512", secret).update(body).digest("hex");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(body) as {
          event?: string;
          data?: { reference?: string };
        };
        if (event.event !== "charge.success" || !event.data?.reference) {
          return new Response("ok");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("id, match_id, status")
          .eq("reference", event.data.reference)
          .maybeSingle();
        if (!payment) return new Response("ok");

        if (payment.status !== "paid") {
          await supabaseAdmin.from("payments").update({ status: "paid" }).eq("id", payment.id);
          await supabaseAdmin
            .from("matches")
            .update({ status: "active" })
            .eq("id", payment.match_id)
            .eq("status", "pending_payment");
        }

        return new Response("ok");
      },
    },
  },
});
