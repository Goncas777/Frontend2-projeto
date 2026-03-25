import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const getStripeClient = () => {
  if (!stripeSecretKey) return null;
  return new Stripe(stripeSecretKey);
};

const getSupabaseWithToken = (accessToken: string) =>
  createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ message: "Missing Supabase environment variables." }, { status: 500 });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ message: "Missing STRIPE_SECRET_KEY." }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.replace("Bearer ", "").trim();

    if (!accessToken) {
      return NextResponse.json({ message: "Missing authentication." }, { status: 401 });
    }

    const body = (await request.json()) as { amount?: number };
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount < 1) {
      return NextResponse.json({ message: "Invalid deposit amount." }, { status: 400 });
    }

    const amountCents = Math.round(amount * 100);
    if (amountCents < 100) {
      return NextResponse.json({ message: "Minimum deposit is 1€." }, { status: 400 });
    }

    const supabase = getSupabaseWithToken(accessToken);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: "Invalid session." }, { status: 401 });
    }

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) {
      return NextResponse.json({ message: "Could not determine application URL." }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/?deposit=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?deposit=cancelled`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amountCents,
            product_data: {
              name: "Balance Deposit - Royelle",
              description: "Gaming balance top-up",
            },
          },
        },
      ],
      metadata: {
        userId: user.id,
        amountCents: String(amountCents),
        credited: "false",
      },
    });

    if (!session.url) {
      return NextResponse.json({ message: "Could not start checkout." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
