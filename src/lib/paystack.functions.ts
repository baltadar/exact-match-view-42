import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLATFORM_FEE_CENTS = 300;

export const initializePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { matchId: string }) => {
    if (!input?.matchId) throw new Error("matchId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const secret = process.env["PAYSTACK_SECRET_KEY"];
    if (!secret) throw new Error("Payments are not configured yet.");

    const { data: match, error } = await context.supabase
      .from("matches")
      .select("id, mentee_id, status")
      .eq("id", data.matchId)
      .maybeSingle();
    if (error) throw error;
    if (!match || match.mentee_id !== context.userId) throw new Error("Match not found.");
    if (match.status !== "pending_payment") throw new Error("This match does not need payment.");

    const email = context.claims?.email as string | undefined;
    if (!email) throw new Error("No email on your account.");

    const reference = `yaa_${match.id.replace(/-/g, "").slice(0, 12)}_${Date.now()}`;
    const origin = new URL(getRequest().url).origin;

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: PLATFORM_FEE_CENTS,
        currency: "USD",
        reference,
        callback_url: `${origin}/payment/return?reference=${reference}`,
        metadata: { match_id: match.id, mentee_id: context.userId },
      }),
    });
    const payload = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string };
    };
    if (!res.ok || !payload.status || !payload.data?.authorization_url) {
      throw new Error(payload.message ?? "Could not start the payment.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("payments").insert({
      match_id: match.id,
      mentee_id: context.userId,
      reference,
      amount_cents: PLATFORM_FEE_CENTS,
      status: "pending",
    });

    return { authorizationUrl: payload.data.authorization_url };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reference: string }) => {
    if (!input?.reference) throw new Error("reference is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const secret = process.env["PAYSTACK_SECRET_KEY"];
    if (!secret) throw new Error("Payments are not configured yet.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, match_id, mentee_id, status")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!payment || payment.mentee_id !== context.userId) {
      throw new Error("Payment not found.");
    }
    if (payment.status === "paid") return { status: "paid" as const, matchId: payment.match_id };

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const payload = (await res.json()) as {
      status?: boolean;
      data?: { status?: string };
    };
    const paid = payload.status === true && payload.data?.status === "success";

    await supabaseAdmin
      .from("payments")
      .update({ status: paid ? "paid" : "failed" })
      .eq("id", payment.id);

    if (paid) {
      await supabaseAdmin.from("matches").update({ status: "active" }).eq("id", payment.match_id);
    }

    return {
      status: paid ? ("paid" as const) : ("failed" as const),
      matchId: payment.match_id,
    };
  });
