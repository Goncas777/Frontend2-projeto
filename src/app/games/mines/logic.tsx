"use client";

import { dmSerifText } from "@/components/fonts";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClients";

const getBalance = async (): Promise<number> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return 0;

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

type GamePhase = "intro" | "table";
type RoundState = "idle" | "playing" | "won" | "lost";

const MinesGame = () => {
    const gridSize = 5;
    const totalCells = gridSize * gridSize;
    const numMines = 5;

    const [gamePhase, setGamePhase] = useState<GamePhase>("intro");
    const [roundState, setRoundState] = useState<RoundState>("idle");
    const [mines, setMines] = useState<number[]>([]);
    const [revealed, setRevealed] = useState<Set<number>>(new Set());
    const [animatingCells, setAnimatingCells] = useState<Set<number>>(new Set());
    const [balance, setBalance] = useState(0);
    const [betAmount, setBetAmount] = useState<string>("10");
    const [currentBet, setCurrentBet] = useState(0);
    const [isSettlingResult, setIsSettlingResult] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const frameClip = "polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)";

    const broadcastBalanceUpdate = (nextBalance: number) => {
        window.dispatchEvent(new CustomEvent<number>("balance-updated", { detail: nextBalance }));
    };

    const focusGameArea = () => {
        const gameSection = document.getElementById("mines-table");
        if (!gameSection) return;

        requestAnimationFrame(() => {
            gameSection.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    };

    const getMultiplier = (safeRevealedCount: number): number => {
        const multipliers = [1, 1.2, 1.5, 2, 2.8, 4, 6, 9, 13, 19];
        const index = Math.max(0, Math.min(safeRevealedCount - 1, multipliers.length - 1));
        return safeRevealedCount <= 0 ? 1 : multipliers[index];
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
            if (isMounted) setBalance(userBalance);
        };

        void loadBalance();
        window.addEventListener("balance-updated", handleBalanceUpdated);

        return () => {
            isMounted = false;
            window.removeEventListener("balance-updated", handleBalanceUpdated);
        };
    }, []);

    const generateMines = () => {
        const nextMines: number[] = [];

        while (nextMines.length < numMines) {
            const randomIndex = Math.floor(Math.random() * totalCells);
            if (!nextMines.includes(randomIndex)) {
                nextMines.push(randomIndex);
            }
        }
        return nextMines;
    };

    const resetRound = () => {
        setRoundState("idle");
        setMines([]);
        setRevealed(new Set());
        setAnimatingCells(new Set());
        setCurrentBet(0);
        setErrorMessage(null);
    };

    const settleLoss = async () => {
        if (isSettlingResult) return;

        setIsSettlingResult(true);
        const newBalance = Math.max(0, balance - currentBet);
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

    const startRound = () => {
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

        setCurrentBet(parsedBet);
        setMines(generateMines());
        setRevealed(new Set());
        setAnimatingCells(new Set());
        setErrorMessage(null);
        setRoundState("playing");
    };

    const handleCellClick = async (cellIndex: number) => {
        if (roundState !== "playing" || isSettlingResult || revealed.has(cellIndex)) return;

        const nextRevealed = new Set(revealed);
        nextRevealed.add(cellIndex);

        setAnimatingCells(new Set([cellIndex]));
        setTimeout(() => setAnimatingCells(new Set()), 350);

        if (mines.includes(cellIndex)) {
            const revealedWithAllMines = new Set(nextRevealed);
            mines.forEach((mineIndex) => revealedWithAllMines.add(mineIndex));

            setRevealed(revealedWithAllMines);
            setRoundState("lost");
            await settleLoss();
            return;
        }

        setRevealed(nextRevealed);
    };

    const safeRevealedCount = useMemo(() => {
        return Array.from(revealed).filter((cellIndex) => !mines.includes(cellIndex)).length;
    }, [revealed, mines]);

    const selectedMultiplier = useMemo(() => getMultiplier(safeRevealedCount), [safeRevealedCount]);
    const potentialProfit = useMemo(() => Math.max(0, currentBet * (selectedMultiplier - 1)), [currentBet, selectedMultiplier]);

    const cashOut = async () => {
        if (roundState !== "playing" || safeRevealedCount === 0 || isSettlingResult) return;

        setIsSettlingResult(true);

        const newBalance = balance + potentialProfit;
        const updateResult = await updateBalance(newBalance);

        if (updateResult.ok) {
            setBalance(newBalance);
            broadcastBalanceUpdate(newBalance);
            setRoundState("won");
            setErrorMessage(null);
        } else {
            setErrorMessage(updateResult.message || "Could not update balance. Please try again.");
        }

        setIsSettlingResult(false);
    };

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
                    <span className="relative z-10">Start Mines</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-true-gold/25 to-transparent opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
                </button>
            </div>
        );
    }

    const isMine = (index: number) => mines.includes(index);
    const isRevealed = (index: number) => revealed.has(index);
    const isAnimating = (index: number) => animatingCells.has(index);

    return (
        <div className={`${dmSerifText.variable} absolute inset-x-0 top-0 bottom-0 overflow-y-auto px-4 pt-20 pb-6 sm:px-6 sm:pt-24 ${dmSerifText.className}`}>
            <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.12fr_0.88fr]">
                <div
                    className="border border-[#c9a35b]/45 bg-[linear-gradient(165deg,rgba(7,20,18,0.88),rgba(4,9,9,0.94))] p-5 shadow-[0_30px_70px_rgba(0,0,0,0.65)] backdrop-blur-sm sm:p-7"
                    style={{ clipPath: frameClip }}
                >
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#c9a35b]/25 pb-4">
                        <p className="text-sm uppercase tracking-[0.13em] text-zinc-300">Balance: <span className="font-semibold text-[#e9c987]">{balance.toFixed(2)}€</span></p>
                        <p className="text-sm uppercase tracking-[0.13em] text-zinc-300">Current Bet: <span className="font-semibold text-[#e9c987]">{currentBet > 0 ? `${currentBet.toFixed(2)}€` : "No active bet"}</span></p>
                    </div>

                    <div className="mb-5 rounded-xl border border-[#d2ad67]/30 bg-black/40 p-4 text-center">
                        <div className="text-xs uppercase tracking-[0.14em] text-zinc-300">Current Multiplier</div>
                        <div className={`mt-2 text-4xl font-black ${selectedMultiplier > 1 ? "text-[#e9c987]" : "text-zinc-300"}`}>
                            {selectedMultiplier.toFixed(2)}x
                        </div>
                        <div className="mt-2 text-sm text-zinc-300">
                            Potential Profit: <span className="font-semibold text-emerald-300">{potentialProfit.toFixed(2)}€</span>
                        </div>
                    </div>

                    <div className="rounded-xl border border-[#d2ad67]/35 bg-black/45 p-3 sm:p-4">
                        <div className="grid grid-cols-5 gap-2 sm:gap-3">
                            {[...Array(totalCells)].map((_, index) => {
                                const revealedCell = isRevealed(index);
                                const mineCell = isMine(index);
                                const cellAnimating = isAnimating(index);

                                return (
                                    <button
                                        key={index}
                                        onClick={() => void handleCellClick(index)}
                                        disabled={revealedCell || roundState !== "playing" || isSettlingResult}
                                        className={`relative aspect-square rounded-md sm:rounded-lg font-bold text-sm transition-all duration-300 ${
                                            cellAnimating ? "scale-95" : "scale-100"
                                        } ${
                                            revealedCell
                                                ? mineCell
                                                    ? "border border-red-500 bg-red-600/90 text-white"
                                                    : "border border-emerald-400 bg-emerald-600/85 text-white"
                                                : "border border-[#d2ad67]/45 bg-[linear-gradient(165deg,rgba(24,24,27,0.9),rgba(8,8,8,0.95))] hover:border-[#e9c987] hover:bg-[#d2ad67]/20"
                                        } ${roundState !== "playing" ? "cursor-not-allowed" : "cursor-pointer"}`}
                                    >
                                        {revealedCell && <span className="text-xl sm:text-2xl">{mineCell ? "💣" : "✓"}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {roundState === "idle" && (
                        <p className="mt-4 border border-[#d2ad67]/35 bg-black/55 px-4 py-3 text-sm text-zinc-300" style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}>
                            Place your bet and start the round to unlock the grid.
                        </p>
                    )}

                    {roundState === "won" && (
                        <p className="mt-4 border border-emerald-500/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300" style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}>
                            You cashed out and won +{potentialProfit.toFixed(2)}€.
                        </p>
                    )}

                    {roundState === "lost" && (
                        <p className="mt-4 border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm text-red-300" style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}>
                            Boom! You hit a mine. All bomb locations are now revealed.
                        </p>
                    )}

                    {errorMessage && (
                        <p className="mt-4 border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300" style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}>
                            {errorMessage}
                        </p>
                    )}
                </div>

                <div
                    className="border border-[#c9a35b]/45 bg-[linear-gradient(165deg,rgba(15,12,8,0.9),rgba(8,7,5,0.95))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-sm"
                    style={{ clipPath: frameClip }}
                >
                    <h3 className="text-center text-2xl font-bold uppercase tracking-[0.14em] text-[#e9c987]">Bet</h3>
                    <p className="mt-2 text-center text-sm text-zinc-300">
                        Choose your stake before opening cells
                    </p>

                    <div className="mt-6">
                        <label htmlFor="mines-bet-amount" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
                            Bet Amount
                        </label>
                        <div className="relative">
                            <input
                                id="mines-bet-amount"
                                type="number"
                                min="1"
                                step="1"
                                value={betAmount}
                                onChange={(event) => setBetAmount(event.target.value)}
                                className="w-full border border-[#d2ad67]/45 bg-black/70 px-4 py-3 pr-10 text-lg font-semibold text-[#e9c987] outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-[#e9c987]"
                                placeholder="10"
                                style={{ clipPath: "polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px)" }}
                                disabled={roundState === "playing"}
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#e9c987]">€</span>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
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
                    </div>

                    <button
                        type="button"
                        onClick={startRound}
                        disabled={roundState === "playing" || isSettlingResult}
                        className="mt-6 w-full border border-[#d2ad67]/70 bg-[linear-gradient(95deg,#d9b673,#c79a4d)] px-6 py-3 text-lg font-bold uppercase tracking-[0.09em] text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}
                    >
                        {roundState === "playing" ? "Round in Progress" : "Start Round"}
                    </button>

                    <button
                        type="button"
                        onClick={cashOut}
                        disabled={roundState !== "playing" || safeRevealedCount === 0 || isSettlingResult}
                        className="mt-3 w-full border border-emerald-400/70 bg-emerald-500/20 px-6 py-3 text-base font-bold uppercase tracking-[0.09em] text-emerald-300 transition-all hover:bg-emerald-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-55"
                        style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}
                    >
                        Cash Out ({potentialProfit.toFixed(2)}€)
                    </button>

                    {(roundState === "won" || roundState === "lost") && (
                        <button
                            type="button"
                            onClick={resetRound}
                            className="mt-3 w-full border border-[#d2ad67]/55 bg-black/60 px-6 py-3 text-sm font-bold uppercase tracking-[0.09em] text-[#e9c987] transition-all hover:bg-[#d2ad67] hover:text-black"
                            style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}
                        >
                            New Round
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            resetRound();
                            setGamePhase("intro");
                        }}
                        className="mt-3 w-full border border-zinc-600/80 bg-black/35 px-6 py-3 text-sm font-semibold uppercase tracking-[0.09em] text-zinc-300 transition-colors hover:bg-zinc-800"
                        style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}
                    >
                        Back
                    </button>

                    <p className="mt-4 text-center text-xs uppercase tracking-[0.12em] text-zinc-400">
                        Safe cells: {safeRevealedCount} / {totalCells - numMines}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MinesGame;
