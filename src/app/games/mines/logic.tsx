"use client";

import { dmSerifText } from "@/components/fonts";
import { useEffect, useState } from "react";
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
        return { ok: false, message: "Sessao expirada. Volta a iniciar sessao." };
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

type GamePhase = "intro" | "bet" | "playing" | "won" | "lost";

const MinesGame = () => {
    const gridSize = 5;
    const totalCells = gridSize * gridSize;
    const numMines = 5;

    const [gamePhase, setGamePhase] = useState<GamePhase>("intro");
    const [mines, setMines] = useState<number[]>([]);
    const [revealed, setRevealed] = useState<Set<number>>(new Set());
    const [balance, setBalance] = useState(0);
    const [betAmount, setBetAmount] = useState<string>("10");
    const [currentBet, setCurrentBet] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSettlingResult, setIsSettlingResult] = useState(false);
    const [selectedMultiplier, setSelectedMultiplier] = useState(1);
    const [gameWon, setGameWon] = useState(false);
    const [animatingCells, setAnimatingCells] = useState<Set<number>>(new Set());

    const broadcastBalanceUpdate = (nextBalance: number) => {
        window.dispatchEvent(
            new CustomEvent<number>("balance-updated", { detail: nextBalance })
        );
    };

    const getMultiplier = (revealedCount: number): number => {
        const multipliers = [1, 1.2, 1.5, 2, 2.8, 4, 6, 9, 13, 19];
        return multipliers[Math.min(revealedCount, multipliers.length - 1)] || 19;
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
        const newMines: number[] = [];
        while (newMines.length < numMines) {
            const randomIndex = Math.floor(Math.random() * totalCells);
            if (!newMines.includes(randomIndex)) {
                newMines.push(randomIndex);
            }
        }
        return newMines;
    };

    const startGame = () => {
        const parsedBet = Number(betAmount);

        if (!Number.isFinite(parsedBet) || parsedBet <= 0) {
            setErrorMessage("Aposta invalida. Introduz um valor maior que 0.");
            return;
        }

        if (parsedBet > balance) {
            setErrorMessage("Nao podes apostar mais do que o teu saldo.");
            return;
        }

        const newMines = generateMines();
        setMines(newMines);
        setRevealed(new Set());
        setSelectedMultiplier(1);
        setGameWon(false);
        setAnimatingCells(new Set());
        setCurrentBet(parsedBet);
        setGamePhase("playing");
        setErrorMessage(null);
    };

    const handleCellClick = async (cellIndex: number) => {
        if (revealed.has(cellIndex) || gamePhase !== "playing" || isSettlingResult) return;

        const newRevealed = new Set(revealed);
        newRevealed.add(cellIndex);

        // Animar célula clicada
        setAnimatingCells(new Set([cellIndex]));
        setTimeout(() => setAnimatingCells(new Set()), 500);

        if (mines.includes(cellIndex)) {
            // Perdeu!
            setRevealed(newRevealed);
            setGamePhase("lost");
            await settleRound("lose", "BOMBA! Perdeste a tua aposta!");
        } else {
            // Célula segura
            setRevealed(newRevealed);
            const newMultiplier = getMultiplier(newRevealed.size - 1);
            setSelectedMultiplier(newMultiplier);
        }
    };

    const cashOut = async () => {
        if (gamePhase !== "playing" || isSettlingResult) return;

        const profitAmount = Math.max(0, currentBet * (selectedMultiplier - 1));
        const newBalance = balance + profitAmount;

        setGameWon(true);
        setGamePhase("won");
        await settleRound("win", `GANHO! +${profitAmount.toFixed(2)}€`);

        const updateResult = await updateBalance(newBalance);
        if (updateResult.ok) {
            setBalance(newBalance);
            broadcastBalanceUpdate(newBalance);
        }
    };

    const settleRound = async (result: "win" | "lose", message: string) => {
        if (isSettlingResult) return;
        setIsSettlingResult(true);
        // Delay para mostrar a mensagem
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (result === "lose") {
            const newBalance = Math.max(0, balance - currentBet);
            const updateResult = await updateBalance(newBalance);
            if (updateResult.ok) {
                setBalance(newBalance);
                broadcastBalanceUpdate(newBalance);
            }
        }

        setIsSettlingResult(false);
    };

    const playAgain = () => {
        setGamePhase("bet");
        setBetAmount("10");
        setErrorMessage(null);
    };

    if (gamePhase === "intro") {
        return (
            <div className="absolute inset-0 flex items-center justify-center px-6">
                <button
                    onClick={() => {
                        setErrorMessage(null);
                        setGamePhase("bet");
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
                    <p className="mt-2 text-center text-sm text-gray-300">Saldo disponivel: <span className="font-semibold text-true-gold">{balance.toFixed(2)} €</span></p>

                    <div className="mt-6">
                        <label htmlFor="bet-amount" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Valor da aposta</label>
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
                            Start Game
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const isMine = (index: number) => mines.includes(index);
    const isRevealed = (index: number) => revealed.has(index);
    const isAnimating = (index: number) => animatingCells.has(index);
    const potentialProfit = Math.max(0, currentBet * (selectedMultiplier - 1));

    return (
        <div className={`${dmSerifText.variable} absolute inset-x-0 top-0 bottom-0 overflow-y-auto px-4 pt-2 pb-4 sm:px-6 sm:pt-2 ${dmSerifText.className}`}>
            <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-start sm:justify-center">
                <div className={`mb-4 rounded-2xl border-2 p-4 sm:mb-6 sm:p-6 text-center transition-all duration-300 ${
                    gameWon 
                        ? "border-green-400/80 bg-gradient-to-br from-green-950/60 via-black/80 to-green-950/60 shadow-[0_0_40px_rgba(74,222,128,0.4)]" 
                        : "border-true-gold/60 bg-gradient-to-br from-yellow-950/40 via-black/80 to-true-gold/20 shadow-[0_0_40px_rgba(212,175,55,0.3)]"
                }`}>
                    <div className="text-xs uppercase tracking-widest text-true-gold/80 font-semibold">Multiplicador Atual</div>
                    <div className={`mt-2 text-4xl sm:text-5xl lg:text-6xl font-black transition-all duration-300 ${
                        gameWon 
                            ? "text-green-300 drop-shadow-lg" 
                            : selectedMultiplier > 5
                            ? "text-orange-300 drop-shadow-lg animate-multiplier-pulse"
                            : "text-true-gold drop-shadow-lg"
                    }`}>
                        {selectedMultiplier.toFixed(2)}x
                    </div>
                    <div className="mt-2 text-sm text-gray-300">
                        Lucro Potencial: <span className={selectedMultiplier > 1 ? "font-bold text-true-gold" : ""}>{potentialProfit.toFixed(2)}€</span>
                    </div>
                </div>

                {/* Grid de Minas */}
                <div className="mb-4 rounded-2xl border border-true-gold/35 bg-gradient-to-b from-black/85 via-zinc-950/85 to-black/80 p-4 sm:mb-6 sm:p-5 shadow-[0_0_35px_rgba(212,175,55,0.16)]">
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                        {[...Array(totalCells)].map((_, index) => {
                            const revealed_cell = isRevealed(index);
                            const is_mine = isMine(index);
                            const is_animating = isAnimating(index);

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleCellClick(index)}
                                    disabled={revealed_cell || gamePhase !== "playing" || isSettlingResult}
                                    className={`relative aspect-square rounded-md sm:rounded-lg font-bold text-sm sm:text-base transition-all duration-300 ${
                                        is_animating ? "scale-95" : "scale-100"
                                    } ${
                                        revealed_cell ? "animate-cell-reveal" : ""
                                    } ${
                                        revealed_cell
                                            ? is_mine
                                                ? "bg-red-600 border-red-500 cursor-not-allowed shadow-[0_0_20px_rgba(220,38,38,0.6)]"
                                                : "bg-gradient-to-br from-green-500 to-green-600 border-green-400 cursor-not-allowed shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-green-glow"
                                            : "border border-true-gold/50 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black hover:from-true-gold/20 hover:via-zinc-800 hover:to-zinc-900 hover:border-true-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] cursor-pointer shadow-inner"
                                    } ${gamePhase !== "playing" ? "cursor-not-allowed" : ""}`}
                                >
                                    {revealed_cell && (
                                        <span className="text-2xl">
                                            {is_mine ? "💣" : "✓"}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Info e Botões */}
                <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-xl border border-true-gold/20 bg-black/65 p-3 backdrop-blur-sm">
                    <div className="text-center text-sm text-gray-300">
                        <p>Aposta: <span className="font-bold text-true-gold">{currentBet.toFixed(2)}€</span> | Saldo: <span className="font-bold text-true-gold">{balance.toFixed(2)}€</span></p>
                        <p className="mt-1 text-xs text-gray-400">Células seguras reveladas: {revealed.size} / {totalCells - numMines}</p>
                    </div>

                    {gamePhase === "playing" && (
                        <button
                            onClick={cashOut}
                            disabled={revealed.size === 0 || isSettlingResult}
                            className="w-full rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 font-bold text-black transition-all duration-200 hover:from-green-400 hover:to-green-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                        >
                            <span className="text-base sm:text-lg">
                                💰 Sacar Lucro ({potentialProfit.toFixed(2)}€)
                            </span>
                        </button>
                    )}

                    {(gamePhase === "won" || gamePhase === "lost") && (
                        <div className="space-y-3">
                            <div className={`rounded-lg px-4 py-3 text-center font-bold text-lg ${
                                gamePhase === "won"
                                    ? "bg-green-950/60 border border-green-400 text-green-300 shadow-[0_0_20px_rgba(74,222,128,0.4)]"
                                    : "bg-red-950/60 border border-red-400 text-red-300 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                            }`}>
                                {gamePhase === "won" ? `🎉 GANHO! +${potentialProfit.toFixed(2)}€` : "💥 PERDESTE!"}
                            </div>
                            <button
                                onClick={playAgain}
                                className="w-full rounded-lg bg-true-gold px-6 py-2 font-bold text-black transition-all duration-200 hover:opacity-85"
                            >
                                Jogar Novamente
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MinesGame;