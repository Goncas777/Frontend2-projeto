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
      return NextResponse.json({ message: "Faltam variaveis de ambiente do Supabase." }, { status: 500 });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ message: "Falta STRIPE_SECRET_KEY." }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.replace("Bearer ", "").trim();

    if (!accessToken) {
      return NextResponse.json({ message: "Sem autenticacao." }, { status: 401 });
    }

    const body = (await request.json()) as { sessionId?: string };
    const sessionId = body.sessionId?.trim();

    if (!sessionId) {
      return NextResponse.json({ message: "Session ID em falta." }, { status: 400 });
    }

    const supabase = getSupabaseWithToken(accessToken);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: "Sessao invalida." }, { status: 401 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ message: "Pagamento ainda nao concluido." }, { status: 400 });
    }

    if (session.metadata?.credited === "true") {
      return NextResponse.json({ ok: true, alreadyCredited: true });
    }

    const userIdFromMetadata = session.metadata?.userId;
    if (!userIdFromMetadata || userIdFromMetadata !== user.id) {
      return NextResponse.json({ message: "Sessao de pagamento invalida para este utilizador." }, { status: 403 });
    }

    const amountCents = Number(session.metadata?.amountCents || session.amount_total || 0);
    const amount = amountCents / 100;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: "Valor de deposito invalido." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("saldo")
      .eq("id", user.id)
      .maybeSingle<{ saldo: number | null }>();

    if (profileError) {
      return NextResponse.json({ message: profileError.message }, { status: 500 });
    }

    const currentBalance = profile?.saldo || 0;
    const nextBalance = currentBalance + amount;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ saldo: nextBalance })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ message: updateError.message }, { status: 500 });
    }

    await stripe.checkout.sessions.update(sessionId, {
      metadata: {
        ...session.metadata,
        credited: "true",
      },
    });

    return NextResponse.json({ ok: true, amount, nextBalance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ message }, { status: 500 });
  }
}
