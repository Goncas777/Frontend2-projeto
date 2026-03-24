"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DM_Serif_Text } from "next/font/google";
import { supabase } from "@/lib/supabaseClients";

const dmSerifText = DM_Serif_Text({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-dm-serif-text",
});

type Profile = {
    username: string | null;
    saldo: number | null;
};

const Navbar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [username, setUsername] = useState<string | null>(null);
    const [saldo, setSaldo] = useState<number>(0);
    const [depositAmount, setDepositAmount] = useState<string>("10");
    const [showDepositPanel, setShowDepositPanel] = useState(false);
    const [depositError, setDepositError] = useState<string | null>(null);
    const [depositMessage, setDepositMessage] = useState<string | null>(null);
    const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
    const [isConfirmingDeposit, setIsConfirmingDeposit] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const handleBalanceUpdated = (event: Event) => {
            const customEvent = event as CustomEvent<number>;
            if (!isMounted) return;
            if (typeof customEvent.detail !== "number") return;
            setSaldo(customEvent.detail);
        };

        const loadUserProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                if (isMounted) setUsername(null);
                if (isMounted) setSaldo(0);
                return;
            }

            const { data } = await supabase
                .from("profiles")
                .select("username, saldo")
                .eq("id", session.user.id)
                .maybeSingle<Profile>();

            if (!isMounted) return;

            setUsername(
                data?.username ||
                session.user.user_metadata?.username ||
                session.user.email ||
                "User"
            );

            setSaldo(data?.saldo || 0);
        };

        void loadUserProfile();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session?.user) {
                if (isMounted) setUsername(null);
                if (isMounted) setSaldo(0);
                return;
            }

            void (async () => {
                const { data } = await supabase
                    .from("profiles")
                    .select("username, saldo")
                    .eq("id", session.user.id)
                    .maybeSingle<Profile>();

                if (!isMounted) return;

                setUsername(
                    data?.username ||
                    session.user.user_metadata?.username ||
                    session.user.email ||
                    "User"
                );

                setSaldo(data?.saldo || 0);
            })();
        });

        window.addEventListener("balance-updated", handleBalanceUpdated);

        return () => {
            isMounted = false;
            window.removeEventListener("balance-updated", handleBalanceUpdated);
            authListener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const depositStatus = searchParams.get("deposit");
        const sessionId = searchParams.get("session_id");

        if (!username) {
            return;
        }

        if (depositStatus === "cancelled") {
            setDepositMessage("Deposito cancelado.");
            setDepositError(null);
            router.replace(pathname);
            return;
        }

        if (depositStatus !== "success" || !sessionId || isConfirmingDeposit) {
            return;
        }

        const confirmDeposit = async () => {
            setIsConfirmingDeposit(true);
            setDepositError(null);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                    setDepositError("Sessao expirada. Inicia sessao novamente.");
                    return;
                }

                const response = await fetch("/api/stripe/confirm-deposit", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ sessionId }),
                });

                const result = (await response.json()) as {
                    ok?: boolean;
                    message?: string;
                    nextBalance?: number;
                    alreadyCredited?: boolean;
                };

                if (!response.ok || !result.ok) {
                    setDepositError(result.message || "Nao foi possivel confirmar o deposito.");
                    return;
                }

                if (typeof result.nextBalance === "number") {
                    setSaldo(result.nextBalance);
                    window.dispatchEvent(
                        new CustomEvent<number>("balance-updated", { detail: result.nextBalance })
                    );
                }

                setDepositMessage(result.alreadyCredited ? "Deposito ja confirmado." : "Deposito confirmado com sucesso.");
            } catch {
                setDepositError("Erro ao confirmar deposito. Tenta novamente.");
            } finally {
                setIsConfirmingDeposit(false);
                router.replace(pathname);
            }
        };

        void confirmDeposit();
    }, [searchParams, pathname, router, username, isConfirmingDeposit]);

    const handleDeposit = async () => {
        setDepositError(null);
        setDepositMessage(null);

        const amount = Number(depositAmount);
        if (!Number.isFinite(amount) || amount < 1) {
            setDepositError("Valor invalido. Deposita no minimo 1€.");
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            setDepositError("Sessao expirada. Inicia sessao novamente.");
            return;
        }

        setIsCreatingCheckout(true);

        try {
            const response = await fetch("/api/stripe/create-checkout-session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ amount }),
            });

            const result = (await response.json()) as { url?: string; message?: string };
            if (!response.ok || !result.url) {
                setDepositError(result.message || "Erro ao iniciar pagamento Stripe.");
                return;
            }

            window.location.assign(result.url);
        } catch {
            setDepositError("Erro de ligacao ao Stripe. Tenta novamente.");
        } finally {
            setIsCreatingCheckout(false);
        }
    };

    return (
        <nav className={`flex justify-between p-4 px-12 text-white border-b border-gray-600 ${dmSerifText.className}`}>
            <ul className={`${dmSerifText.className} `}>
                <li>
                    <button
                        type="button"
                        onClick={() => router.push("/")}
                        className="text-true-gold text-xl"
                    >
                        ROYELLE
                    </button>
                </li>
            </ul>
            <ul className="flex gap-4">
                {username ? (
                    <>
                        <li className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDepositPanel((prev) => !prev);
                                    setDepositError(null);
                                    setDepositMessage(null);
                                }}
                                className="px-5 py-1 bg-true-gold hover:opacity-80 rounded-lg text-black font-semibold"
                            >
                                Depositar
                            </button>

                            {showDepositPanel && (
                                <div className="absolute right-0 mt-3 w-72 rounded-xl border border-true-gold/40 bg-black/95 p-4 shadow-[0_0_25px_rgba(212,175,55,0.2)]">
                                    <p className="text-sm font-semibold text-true-gold">Depositar saldo</p>
                                    <div className="mt-3">
                                        <label htmlFor="deposit-amount" className="text-xs text-gray-300 uppercase tracking-wide">Valor (€)</label>
                                        <input
                                            id="deposit-amount"
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-true-gold/40 bg-zinc-900 px-3 py-2 text-true-gold outline-none focus:border-true-gold"
                                        />
                                    </div>

                                    <div className="mt-3 flex gap-2">
                                        {[10, 25, 50, 100].map((amount) => (
                                            <button
                                                key={amount}
                                                type="button"
                                                onClick={() => setDepositAmount(String(amount))}
                                                className="rounded-md border border-true-gold/40 px-2 py-1 text-xs text-true-gold hover:bg-true-gold hover:text-black"
                                            >
                                                {amount}€
                                            </button>
                                        ))}
                                    </div>

                                    {depositError && <p className="mt-3 text-xs text-red-400">{depositError}</p>}
                                    {depositMessage && <p className="mt-3 text-xs text-green-300">{depositMessage}</p>}

                                    <button
                                        type="button"
                                        onClick={handleDeposit}
                                        disabled={isCreatingCheckout || isConfirmingDeposit}
                                        className="mt-4 w-full rounded-lg bg-true-gold px-3 py-2 text-sm font-bold text-black hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isCreatingCheckout ? "A abrir Stripe..." : isConfirmingDeposit ? "A confirmar..." : "Ir para Checkout"}
                                    </button>
                                </div>
                            )}
                        </li>

                        <li className="px-5 py-1 text-true-gold border border-true-gold rounded-lg">
                            {saldo.toFixed(2)} €
                        </li>

                        <li>
                            <Image
                                src="/icondefault.png"
                                alt="User avatar"
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full object-cover object-[center_30%]"
                            />
                        </li>
                    </>
                ) : (
                    <>
                        <li>
                            <button
                                type="button"
                                onClick={() => router.push("/register")}
                                className="px-5 py-1 bg-true-gold opacity-100 hover:opacity-80 hover:cursor-pointer rounded-lg text-black block"
                            >
                                Register
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                onClick={() => router.push("/signin")}
                                className="px-5 py-1 hover:text-true-gold hover:cursor-pointer rounded-lg text-gray-400 block"
                            >
                                Sign In
                            </button>
                        </li>
                    </>
                )}
            </ul>
        </nav>
    );
}

export default Navbar;