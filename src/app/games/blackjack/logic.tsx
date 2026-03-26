"use client";

import { dmSerifText } from "@/components/fonts";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClients";

const suits = ["♥", "♦", "♣", "♠"];
const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

type GamePhase = "intro" | "table";
type RoundState = "idle" | "playing" | "finished";

type Card = {
    suit: string;
    value: string;
};

const getBalance = async (): Promise<number> => {
    const { data: { session } } = await supabase.auth.getSession();

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

const getCardImageUrl = (card: Card): string => {
    const suitMap: Record<string, string> = { "♥": "H", "♦": "D", "♣": "C", "♠": "S" };
    const normalizedValue = card.value === "10" ? "0" : card.value;
    return `https://deckofcardsapi.com/static/img/${normalizedValue}${suitMap[card.suit]}.png`;
};

const PlayingCard = ({ card, hidden = false }: { card?: Card; hidden?: boolean }) => (
    <img
        src={hidden || !card ? "https://deckofcardsapi.com/static/img/back.png" : getCardImageUrl(card)}
        alt={hidden || !card ? "card back" : `${card.value}${card.suit}`}
        className="h-32 w-24 rounded-md object-cover shadow-[0_14px_32px_rgba(0,0,0,0.55)] sm:h-44 sm:w-32"
        draggable={false}
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
    const copiedDeck = [...deck];

    for (let index = copiedDeck.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [copiedDeck[index], copiedDeck[randomIndex]] = [copiedDeck[randomIndex], copiedDeck[index]];
    }

    return copiedDeck;
};

const calculateHandValue = (hand: Card[]): number => {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
        if (card.value === "A") {
            aces += 1;
            value += 11;
        } else if (card.value === "K" || card.value === "Q" || card.value === "J") {
            value += 10;
        } else {
            value += parseInt(card.value, 10);
        }
    }

    while (value > 21 && aces > 0) {
        value -= 10;
        aces -= 1;
    }

    return value;
};

const Hands = () => {
    const [gamePhase, setGamePhase] = useState<GamePhase>("intro");
    const [roundState, setRoundState] = useState<RoundState>("idle");
    const [deck, setDeck] = useState<Card[]>([]);
    const [playerHand, setPlayerHand] = useState<Card[]>([]);
    const [dealerHand, setDealerHand] = useState<Card[]>([]);
    const [hideDealerHoleCard, setHideDealerHoleCard] = useState(true);
    const [gameResult, setGameResult] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [balance, setBalance] = useState(0);
    const [betAmount, setBetAmount] = useState<string>("10");
    const [currentBet, setCurrentBet] = useState(0);
    const [isSettlingResult, setIsSettlingResult] = useState(false);

    const broadcastBalanceUpdate = (nextBalance: number) => {
        window.dispatchEvent(new CustomEvent<number>("balance-updated", { detail: nextBalance }));
    };

    const focusGameArea = () => {
        const gameSection = document.getElementById("blackjack-table");
        if (!gameSection) return;

        requestAnimationFrame(() => {
            gameSection.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
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

        void loadBalance();
        window.addEventListener("balance-updated", handleBalanceUpdated);

        return () => {
            isMounted = false;
            window.removeEventListener("balance-updated", handleBalanceUpdated);
        };
    }, []);

    const resetBoard = () => {
        setDeck([]);
        setPlayerHand([]);
        setDealerHand([]);
        setHideDealerHoleCard(true);
        setCurrentBet(0);
        setGameResult(null);
        setRoundState("idle");
    };

    const settleRound = async (result: "win" | "lose" | "tie", message: string, betValue: number) => {
        if (isSettlingResult) return;

        setIsSettlingResult(true);
        setGameResult(message);

        if (result === "tie") {
            setIsSettlingResult(false);
            return;
        }

        const delta = result === "win" ? betValue : -betValue;
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

    const finalizeRound = async (nextDealerHand: Card[], result: "win" | "lose" | "tie", message: string) => {
        setDealerHand(nextDealerHand);
        setHideDealerHoleCard(false);
        setRoundState("finished");
        await settleRound(result, message, currentBet);
    };

    const startRound = async () => {
        if (roundState === "playing" || isSettlingResult) return;

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
        const nextPlayerHand = [newDeck.pop()!, newDeck.pop()!];
        const nextDealerHand = [newDeck.pop()!, newDeck.pop()!];

        setDeck(newDeck);
        setPlayerHand(nextPlayerHand);
        setDealerHand(nextDealerHand);
        setHideDealerHoleCard(true);
        setCurrentBet(parsedBet);
        setErrorMessage(null);
        setGameResult(null);
        setRoundState("playing");

        const playerValue = calculateHandValue(nextPlayerHand);
        const dealerValue = calculateHandValue(nextDealerHand);

        if (playerValue === 21 || dealerValue === 21) {
            const naturalResult = playerValue === dealerValue ? "tie" : playerValue === 21 ? "win" : "lose";
            const naturalMessage = playerValue === dealerValue
                ? "Push! Both hit Blackjack."
                : playerValue === 21
                    ? "Blackjack! You win!"
                    : "Dealer Blackjack. You lose.";

            setRoundState("finished");
            await settleRound(naturalResult, naturalMessage, parsedBet);
        }
    };

    const hit = async () => {
        if (roundState !== "playing" || gameResult || isSettlingResult) return;

        const nextDeck = [...deck];
        const newCard = nextDeck.pop();
        if (!newCard) return;

        const nextPlayerHand = [...playerHand, newCard];
        setDeck(nextDeck);
        setPlayerHand(nextPlayerHand);

        if (calculateHandValue(nextPlayerHand) > 21) {
            setRoundState("finished");
            await settleRound("lose", "Bust! Dealer wins.", currentBet);
        }
    };

    const stand = async () => {
        if (roundState !== "playing" || gameResult || isSettlingResult) return;

        setHideDealerHoleCard(false);

        const nextDeck = [...deck];
        let nextDealerHand = [...dealerHand];

        while (calculateHandValue(nextDealerHand) < 17) {
            const drawnCard = nextDeck.pop();
            if (!drawnCard) break;
            nextDealerHand = [...nextDealerHand, drawnCard];
        }

        setDeck(nextDeck);

        const dealerValue = calculateHandValue(nextDealerHand);
        const playerValue = calculateHandValue(playerHand);

        if (dealerValue > 21 || playerValue > dealerValue) {
            await finalizeRound(nextDealerHand, "win", "You win!");
        } else if (dealerValue === playerValue) {
            await finalizeRound(nextDealerHand, "tie", "Push! It's a tie.");
        } else {
            await finalizeRound(nextDealerHand, "lose", "Dealer wins.");
        }
    };

    const dealerDisplayedValue = useMemo(() => {
        if (dealerHand.length === 0) return 0;
        if (hideDealerHoleCard) {
            return calculateHandValue([dealerHand[0]]);
        }
        return calculateHandValue(dealerHand);
    }, [dealerHand, hideDealerHoleCard]);

    const playerValue = useMemo(() => calculateHandValue(playerHand), [playerHand]);

    if (gamePhase === "intro") {
        return (
            <div className="absolute inset-0 flex items-center justify-center px-6">
                <button
                    onClick={() => {
                        setErrorMessage(null);
                        setGamePhase("table");
                        focusGameArea();
                    }}
                    className="group relative overflow-hidden rounded-2xl border border-true-gold/50 bg-black/60 px-14 py-7 text-3xl font-extrabold uppercase tracking-[0.2em] text-true-gold shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all duration-300 hover:scale-[1.03] hover:bg-true-gold hover:text-black"
                >
                    <span className="relative z-10">Start Blackjack</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-true-gold/25 to-transparent opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
                </button>
            </div>
        );
    }

    return (
        <div className={`${dmSerifText.variable} absolute inset-x-0 top-0 bottom-0 overflow-y-auto px-4 pt-24 pb-8 sm:px-6 sm:pt-30 sm:pb-10 ${dmSerifText.className}`}>
            <div className="relative mx-auto flex w-full max-w-7xl min-h-[860px] flex-col">
                <div className="z-40 flex flex-wrap items-center justify-between gap-2 px-1">
                    <p className="bg-black/45 px-3 py-1 text-xs uppercase tracking-[0.12em] text-zinc-200">Balance: <span className="font-semibold text-[#e9c987]">{balance.toFixed(2)}€</span></p>
                    <p className="bg-black/45 px-3 py-1 text-xs uppercase tracking-[0.12em] text-zinc-200">Current Bet: <span className="font-semibold text-[#e9c987]">{currentBet > 0 ? `${currentBet.toFixed(2)}€` : "No active bet"}</span></p>
                </div>

                <div className="h-[16vh] min-h-[96px] sm:h-[20vh] sm:min-h-[120px] lg:h-[24vh]" />

                <div className="z-30 flex min-h-[180px] w-full flex-col items-center justify-start px-3 sm:min-h-[210px]">
                    <p className="mb-3 bg-black/45 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-zinc-200">Dealer ({dealerDisplayedValue})</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        {dealerHand.length === 0 ? (
                            <>
                                <PlayingCard hidden />
                                <PlayingCard hidden />
                            </>
                        ) : (
                            dealerHand.map((card, index) => (
                                <PlayingCard key={`dealer-${index}`} card={card} hidden={index === 1 && hideDealerHoleCard} />
                            ))
                        )}
                    </div>
                </div>

                <div className="z-[25] mt-8 flex min-h-[210px] w-full flex-col items-center justify-start px-3 sm:mt-10 sm:min-h-[240px]">
                    <p className="mb-3 bg-black/45 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-zinc-200">Player ({playerHand.length === 0 ? 0 : playerValue})</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        {playerHand.length === 0 ? (
                            <>
                                <PlayingCard hidden />
                                <PlayingCard hidden />
                            </>
                        ) : (
                            playerHand.map((card, index) => (
                                <PlayingCard key={`player-${index}`} card={card} />
                            ))
                        )}
                    </div>
                </div>

                <div className="z-20 mt-4 w-full max-w-[520px] self-center px-3 sm:mt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={hit}
                            disabled={roundState !== "playing" || isSettlingResult}
                            className="border border-[#d2ad67]/70 bg-[linear-gradient(95deg,#d9b673,#c79a4d)] px-4 py-3 text-base font-bold uppercase tracking-[0.09em] text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
                            style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}
                        >
                            Hit
                        </button>
                        <button
                            type="button"
                            onClick={stand}
                            disabled={roundState !== "playing" || isSettlingResult}
                            className="border border-[#d2ad67]/70 bg-black/55 px-4 py-3 text-base font-bold uppercase tracking-[0.09em] text-[#e9c987] transition-all hover:bg-[#d2ad67] hover:text-black disabled:cursor-not-allowed disabled:opacity-55"
                            style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}
                        >
                            Stand
                        </button>
                    </div>

                    {roundState === "idle" && (
                        <p className="mt-3 bg-black/45 px-4 py-2 text-center text-xs text-zinc-300">
                            Place your bet and click <span className="font-semibold text-[#e9c987]">Deal Cards</span> to start the round.
                        </p>
                    )}

                    {gameResult && (
                        <p className="mt-3 bg-black/45 px-4 py-2 text-center text-xs text-[#e9c987]">
                            {gameResult}
                        </p>
                    )}

                    {errorMessage && (
                        <p className="mt-3 bg-red-950/45 px-4 py-2 text-center text-xs text-red-300">
                            {errorMessage}
                        </p>
                    )}
                </div>



                <div className="z-[15] mt-1 w-full px-3 sm:mt-2">
                    <div className="mx-auto w-full max-w-[980px] rounded-sm bg-[linear-gradient(165deg,rgba(8,8,8,0.9),rgba(4,4,4,0.82))] p-3 shadow-[0_20px_40px_rgba(0,0,0,0.45)] sm:p-4">
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                            <label htmlFor="blackjack-bet-amount" className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
                                Bet Amount
                            </label>
                            <div className="relative w-[150px] sm:w-[170px]">
                                <input
                                    id="blackjack-bet-amount"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={betAmount}
                                    onChange={(event) => setBetAmount(event.target.value)}
                                    className="w-full border border-[#d2ad67]/45 bg-black/70 px-4 py-2 pr-10 text-base font-semibold text-[#e9c987] outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-[#e9c987]"
                                    placeholder="10"
                                    style={{ clipPath: "polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px)" }}
                                    disabled={roundState === "playing"}
                                />
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#e9c987]">€</span>
                            </div>

                            {[10, 25, 50, 100].map((quickBet) => (
                                <button
                                    key={quickBet}
                                    type="button"
                                    onClick={() => setBetAmount(String(quickBet))}
                                    disabled={roundState === "playing"}
                                    className="border border-[#d2ad67]/45 px-3 py-1 text-xs font-semibold text-[#e9c987] transition-colors hover:bg-[#d2ad67] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                                    style={{ clipPath: "polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)" }}
                                >
                                    {quickBet} €
                                </button>
                            ))}

                            <button
                                type="button"
                                onClick={() => setBetAmount(balance.toFixed(2))}
                                disabled={balance <= 0 || roundState === "playing"}
                                className="border border-emerald-400/60 px-3 py-1 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                                style={{ clipPath: "polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)" }}
                            >
                                All In
                            </button>

                            <button
                                type="button"
                                onClick={startRound}
                                disabled={roundState === "playing" || isSettlingResult}
                                className="border border-[#d2ad67]/70 bg-[linear-gradient(95deg,#d9b673,#c79a4d)] px-4 py-2 text-sm font-bold uppercase tracking-[0.09em] text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                                style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}
                            >
                                {roundState === "playing" ? "Round in Progress" : "Deal Cards"}
                            </button>

                            {roundState === "finished" && (
                                <button
                                    type="button"
                                    onClick={resetBoard}
                                    className="border border-[#d2ad67]/55 bg-black/60 px-4 py-2 text-xs font-bold uppercase tracking-[0.09em] text-[#e9c987] transition-all hover:bg-[#d2ad67] hover:text-black"
                                    style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}
                                >
                                    New Hand
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    setErrorMessage(null);
                                    setGamePhase("intro");
                                    resetBoard();
                                }}
                                className="border border-zinc-600/80 bg-black/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.09em] text-zinc-300 transition-colors hover:bg-zinc-800"
                                style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}
                            >
                                Back
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[5] h-36 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
        </div>
    );
};

export { Hands };
