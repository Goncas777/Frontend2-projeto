"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClients";

const suits = ['♥', '♦', '♣', '♠'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const getBalance = async (): Promise<number> => {
    const {data: {session}}
        = await supabase.auth.getSession();

        if (!session?.user) {
            return 0;
        }
        
    const { data } = await supabase
        .from("profiles")
        .select("saldo")
        .eq("id", session.user.id)
        .maybeSingle();

    return data?.saldo || 0;
};

const updateBalance = async (newBalance: number): Promise<{ ok: boolean; message?: string }> => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
        return { ok: false, message: "Session expired. Please sign in again." };
    }

    const { error } = await supabase
        .from("profiles")
        .update({ saldo: newBalance })
        .eq("id", session.user.id);

    if (error) {
        return { ok: false, message: error.message };
    }

    return { ok: true };
};

type Card = {
  suit: string;
  value: string;
};

const getCardImageUrl = (card: Card): string => {
  const suitMap: Record<string, string> = { '♥': 'H', '♦': 'D', '♣': 'C', '♠': 'S' };
  const value = card.value === '10' ? '0' : card.value;
  return `https://deckofcardsapi.com/static/img/${value}${suitMap[card.suit]}.png`;
};

const PlayingCard = ({ card }: { card: Card }) => (
  <img
    src={getCardImageUrl(card)}
    alt={`${card.value}${card.suit}`}
    className="w-30 h-45 rounded shadow-xl"
  />
);

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  return deck;
};

const shuffleDeck = (deck: Card[]): Card[] => {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

const calculateHandValue = (hand: Card[]): number => {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
        if (card.value === 'A') {
            aces++;
            value += 11;
        } else if (card.value === 'K' || card.value === 'Q' || card.value === 'J') {
            value += 10;
        } else {
            value += parseInt(card.value);
        }
    }

    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return value;
};

const Hands = () => {
    const [deck, setDeck] = useState<Card[]>([]);
    const [playerHand, setPlayerHand] = useState<Card[]>([]);
    const [dealerHand, setDealerHand] = useState<Card[]>([]);
    const [gameResult, setGameResult] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [gamePhase, setGamePhase] = useState<"intro" | "bet" | "playing">("intro");
    const [balance, setBalance] = useState(0);
    const [betAmount, setBetAmount] = useState<string>("10");
    const [currentBet, setCurrentBet] = useState(0);
    const [isSettlingResult, setIsSettlingResult] = useState(false);

    const broadcastBalanceUpdate = (nextBalance: number) => {
        window.dispatchEvent(
            new CustomEvent<number>("balance-updated", { detail: nextBalance })
        );
    };

    const focusGame = () => {
        const gameSection = document.getElementById("blackjack-table");
        if (!gameSection) return;

        requestAnimationFrame(() => {
            gameSection.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    };

    const refreshBalance = async () => {
        const userBalance = await getBalance();
        setBalance(userBalance);
    };

    useEffect(() => {
        let isMounted = true;

        const handleBalanceUpdated = (event: Event) => {
            const customEvent = event as CustomEvent<number>;
            if (!isMounted) return;
            if (typeof customEvent.detail !== "number") return;
            setBalance(customEvent.detail);
        };

        const loadBalance = async () => {
            const userBalance = await getBalance();
            if (isMounted) {
                setBalance(userBalance);
            }
        };

        const handleWindowFocus = () => {
            void loadBalance();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                void loadBalance();
            }
        };

        void loadBalance();
        window.addEventListener("balance-updated", handleBalanceUpdated);
        window.addEventListener("focus", handleWindowFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            isMounted = false;
            window.removeEventListener("balance-updated", handleBalanceUpdated);
            window.removeEventListener("focus", handleWindowFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    useEffect(() => {
        if (gamePhase === "bet" || gamePhase === "intro") {
            void refreshBalance();
        }
    }, [gamePhase]);

    const settleRound = async (result: "win" | "lose" | "tie", message: string) => {
        if (isSettlingResult) return;

        setIsSettlingResult(true);
        setGameResult(message);

        if (result === "tie") {
            setIsSettlingResult(false);
            return;
        }

        const delta = result === "win" ? currentBet : -currentBet;
        const newBalance = Math.max(0, balance + delta);
        const updateResult = await updateBalance(newBalance);

        if (updateResult.ok) {
            setBalance(newBalance);
            broadcastBalanceUpdate(newBalance);
            setErrorMessage(null);
        } else {
            setErrorMessage(updateResult.message || "Could not update balance. Please try again.");
        }

        setIsSettlingResult(false);
    };

    const startGame = () => {
        const parsedBet = Number(betAmount);

        if (!Number.isFinite(parsedBet) || parsedBet <= 0) {
            setErrorMessage("Invalid bet. Enter a value greater than 0.");
            return;
        }

        if (parsedBet > balance) {
            setErrorMessage("You cannot bet more than your balance.");
            return;
        }

        const newDeck = shuffleDeck(createDeck());
        setPlayerHand([newDeck.pop()!, newDeck.pop()!]);
        setDealerHand([newDeck.pop()!]);
        setDeck(newDeck);
        setGameResult(null);
        setErrorMessage(null);
        setCurrentBet(parsedBet);
        setGamePhase("playing");
        focusGame();
    };

    const hit = async () => {
        if (gameResult || isSettlingResult) return;
        const newDeck = [...deck];
        const newCard = newDeck.pop()!;
        const newPlayerHand = [...playerHand, newCard];
        setDeck(newDeck);
        setPlayerHand(newPlayerHand);
        if (calculateHandValue(newPlayerHand) > 21) {
            await settleRound("lose", "Bust! Dealer wins!");
        }
    };

    const stand = async () => {
        if (gameResult || isSettlingResult) return;
        const newDeck = [...deck];
        let newDealerHand = [...dealerHand];
        while (calculateHandValue(newDealerHand) < 17) {
            newDealerHand = [...newDealerHand, newDeck.pop()!];
        }
        setDeck(newDeck);
        setDealerHand(newDealerHand);
        const dealerValue = calculateHandValue(newDealerHand);
        const playerValue = calculateHandValue(playerHand);
        if (dealerValue > 21 || playerValue > dealerValue) {
            await settleRound("win", "You win!");
        } else if (dealerValue === playerValue) {
            await settleRound("tie", "It's a tie!");
        } else {
            await settleRound("lose", "Dealer wins!");
        }
    };

    if (gamePhase === "intro") {
        return (
            <div className="absolute inset-0 flex items-center justify-center px-6">
                <button
                    onClick={() => {
                        setErrorMessage(null);
                        setGamePhase("bet");
                        focusGame();
                    }}
                    className="group relative overflow-hidden rounded-2xl border border-true-gold/50 bg-black/60 px-14 py-7 text-3xl font-extrabold uppercase tracking-[0.2em] text-true-gold shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all duration-300 hover:scale-[1.03] hover:bg-true-gold hover:text-black"
                >
                    <span className="relative z-10">Start Game</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-true-gold/25 to-transparent opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
                </button>
            </div>
        );
    }

    if (gamePhase === "bet") {
        return (
            <div className="absolute inset-0 flex items-end justify-end p-6 md:p-10">
                <div className="w-full max-w-md rounded-2xl border border-true-gold/35 bg-gradient-to-b from-black/85 via-zinc-950/85 to-black/80 p-7 shadow-[0_0_35px_rgba(212,175,55,0.16)] backdrop-blur-sm">
                    <h3 className="text-center text-2xl font-bold uppercase tracking-[0.14em] text-true-gold">Place Your Bet</h3>
                    <p className="mt-2 text-center text-sm text-gray-300">Available Balance: <span className="font-semibold text-true-gold">{balance.toFixed(2)} €</span></p>

                    <div className="mt-6">
                        <label htmlFor="bet-amount" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Bet Amount</label>
                        <div className="relative">
                            <input
                                id="bet-amount"
                                type="number"
                                min="1"
                                step="1"
                                value={betAmount}
                                onChange={(e) => setBetAmount(e.target.value)}
                                className="w-full rounded-xl border border-true-gold/40 bg-black/70 px-4 py-3 pr-10 text-lg font-semibold text-true-gold outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-true-gold focus:ring-2 focus:ring-true-gold/30"
                                placeholder="10"
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-true-gold/90">€</span>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        {[10, 25, 50, 100].map((quickBet) => (
                            <button
                                key={quickBet}
                                type="button"
                                onClick={() => setBetAmount(String(quickBet))}
                                className="rounded-md border border-true-gold/40 px-3 py-1 text-xs font-semibold text-true-gold transition-colors hover:bg-true-gold hover:text-black"
                            >
                                {quickBet} €
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setBetAmount(balance.toFixed(2))}
                            disabled={balance <= 0}
                            className="rounded-md border border-green-500/60 px-3 py-1 text-xs font-semibold text-green-300 transition-colors hover:bg-green-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            All In
                        </button>
                    </div>

                    {errorMessage && <span className="mt-4 block text-sm text-red-400">{errorMessage}</span>}

                    <div className="mt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setErrorMessage(null);
                                setGamePhase("intro");
                            }}
                            className="w-full rounded-lg border border-zinc-600 px-4 py-2 font-semibold text-zinc-300 transition-colors hover:bg-zinc-800"
                        >
                            Back
                        </button>
                        <button
                            onClick={startGame}
                            className="w-full rounded-lg bg-true-gold px-4 py-2 font-bold text-black transition-all duration-200 hover:opacity-85"
                        >
                            Confirm Bet
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0">
            {/* Dealer cards — below the dealer figure, centre of the table */}
            <div className="absolute top-[44%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                <span className="text-true-gold text-xs font-semibold bg-black/50 px-2 py-0.5 rounded">
                    Dealer ({calculateHandValue(dealerHand)})
                </span>
                <div className="flex gap-2">
                    {dealerHand.map((card, i) => (
                        <PlayingCard key={i} card={card} />
                    ))}
                </div>
            </div>

            {/* Player cards (left) + action buttons (right) — bottom of the table */}
            <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 justify-between w-full max-w-3xl px-10">
                <span className="text-true-gold text-xs font-semibold bg-black/50 px-2 py-0.5 rounded">
                    Current Bet: {currentBet.toFixed(2)} € | Balance: {balance.toFixed(2)} €
                </span>
                <div className="flex flex-col gap-1">
                    <span className="text-true-gold text-xs font-semibold bg-black/50 px-2 py-0.5 rounded ">
                        Your Hand ({calculateHandValue(playerHand)})
                    </span>
                    <div className="flex gap-2">
                        {playerHand.map((card, i) => (
                            <PlayingCard key={i} card={card} />
                        ))}
                    </div>
                </div>

                
            </div>
            <div className="absolute bottom-[5%] right-10">
            {gameResult ? (
                    <div className="flex flex-col items-center gap-3">
                        <span className="text-2xl font-bold text-true-gold bg-black/70 px-5 py-2 rounded-lg">
                            {gameResult}
                        </span>
                        {errorMessage && <span className="text-red-400 text-sm">{errorMessage}</span>}
                        <button
                            onClick={() => setGamePhase("bet")}
                            className="px-6 py-2 bg-true-gold hover:opacity-80 text-black font-bold rounded-lg"
                        >
                            Play Again
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 mb-1">
                        <button
                            onClick={hit}
                            disabled={isSettlingResult}
                            className="px-8 py-2 bg-true-gold hover:opacity-80 text-black font-bold rounded-lg"
                        >
                            Hit
                        </button>
                        <button
                            onClick={stand}
                            disabled={isSettlingResult}
                            className="px-8 py-2 border border-true-gold text-true-gold hover:bg-true-gold hover:text-black font-bold rounded-lg transition-colors"
                        >
                            Stand
                        </button>
                    </div>
                )}
                </div>
        </div>
    );
};

export { Hands };