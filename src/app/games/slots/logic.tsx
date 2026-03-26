"use client";

import { dmSerifText } from "@/components/fonts";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClients";

type GamePhase = "intro" | "table";
type RoundState = "idle" | "spinning" | "resolved";

type SymbolDef = {
    key: string;
    label: string;
    weight: number;
    payouts: Partial<Record<3 | 4 | 5, number>>;
    imagePath: string;
};

type WinLine = {
    lineIndex: number;
    symbol: string;
    count: number;
    amount: number;
    cells: Array<{ reel: number; row: number }>;
};

type SpinSummary = {
    baseWin: number;
    totalWin: number;
    multiplierApplied: number;
    multiplierValues: number[];
    zeusCount: number;
    zeusWin: number;
    cascadeCount: number;
    lines: WinLine[];
};

const REELS = 5;
const ROWS = 3;
const QUICK_BETS = [10, 25, 50, 100];
const MULTIPLIER_VALUES = [2, 2, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100];
const FREE_SPINS_TRIGGER = 4;
const FREE_SPINS_AWARD = 15;
const MAX_CASCADES = 1;
const LINE_PATTERNS = [
    [0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
] as const;

const SYMBOLS: SymbolDef[] = [
    { key: "WILD", label: "Wild", weight: 3, payouts: { 3: 4, 4: 10, 5: 25 }, imagePath: "/slots/symbols/wild.svg" },
    { key: "CROWN", label: "Crown", weight: 8, payouts: { 3: 2, 4: 6, 5: 16 }, imagePath: "/slots/symbols/crown.svg" },
    { key: "COINS", label: "Ring", weight: 9, payouts: { 3: 2, 4: 5, 5: 12 }, imagePath: "/slots/symbols/ring.svg" },
    { key: "SCROLL", label: "Blue Gem", weight: 14, payouts: { 3: 1, 4: 4, 5: 10 }, imagePath: "/slots/symbols/blue-gem.svg" },
    { key: "SHIELD", label: "Shield", weight: 18, payouts: { 3: 1, 4: 3, 5: 8 }, imagePath: "/slots/symbols/shield.svg" },
    { key: "GEM", label: "Green Gem", weight: 24, payouts: { 3: 1, 4: 2, 5: 6 }, imagePath: "/slots/symbols/green-gem.svg" },
    { key: "ZEUS", label: "Zeus", weight: 3, payouts: {}, imagePath: "/slots/symbols/zeus.svg" },
    { key: "MULT", label: "Multiplier", weight: 3, payouts: {}, imagePath: "/slots/symbols/mult.svg" },
];

const ZEUS_PAYOUTS: Record<number, number> = {
    3: 1,
    4: 4,
    5: 10,
};

const SYMBOL_TILE_STYLES: Record<string, string> = {
    WILD: "bg-[radial-gradient(circle_at_30%_20%,#fff5d1,#dbb05a_45%,#7d551a)] text-black",
    CROWN: "bg-[radial-gradient(circle_at_30%_20%,#ffe59c,#d49a35_45%,#6e410d)] text-black",
    COINS: "bg-[radial-gradient(circle_at_30%_20%,#ffd0fa,#c24bf2_45%,#5f1c7c)] text-white",
    SCROLL: "bg-[radial-gradient(circle_at_30%_20%,#7bd6ff,#2990cf_45%,#154d79)] text-white",
    SHIELD: "bg-[radial-gradient(circle_at_30%_20%,#d8e6ff,#8198c4_45%,#35486b)] text-white",
    GEM: "bg-[radial-gradient(circle_at_30%_20%,#97ffe7,#27bb95_45%,#145d4d)] text-white",
    ZEUS: "bg-[radial-gradient(circle_at_30%_20%,#d6f2ff,#5eb8ff_45%,#1b4a8e)] text-white",
    MULT: "bg-[radial-gradient(circle_at_30%_20%,#f1c4ff,#ad4cff_45%,#55138e)] text-white",
};

const SYMBOL_FRAME_STYLES: Record<string, string> = {
    WILD: "border-[#ffe3a1]/85",
    CROWN: "border-[#ffd27a]/85",
    COINS: "border-[#f0b2ff]/85",
    SCROLL: "border-[#8cd8ff]/85",
    SHIELD: "border-[#b4caef]/85",
    GEM: "border-[#8af6dd]/85",
    ZEUS: "border-[#9fd9ff]/85",
    MULT: "border-[#d7a8ff]/85",
};

const SYMBOL_BY_KEY = Object.fromEntries(SYMBOLS.map((symbol) => [symbol.key, symbol])) as Record<string, SymbolDef>;

const createEmptyMultiplierGrid = () => Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => null as number | null));

const createVisibleMultiplierGrid = (grid: string[][]) => {
    return Array.from({ length: REELS }, (_, reelIndex) =>
        Array.from({ length: ROWS }, (_, rowIndex) => (grid[reelIndex]?.[rowIndex] === "MULT" ? pickMultiplierValue() : null))
    );
};

const getMultiplierValuesFromVisibleGrid = (grid: string[][], visibleGrid: (number | null)[][]) => {
    const values: number[] = [];

    for (let reel = 0; reel < REELS; reel += 1) {
        for (let row = 0; row < ROWS; row += 1) {
            if (grid[reel]?.[row] === "MULT") {
                const value = visibleGrid[reel]?.[row];
                if (typeof value === "number" && value > 0) {
                    values.push(value);
                }
            }
        }
    }

    return values;
};

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

const weightedSymbol = () => {
    const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const symbol of SYMBOLS) {
        roll -= symbol.weight;
        if (roll <= 0) return symbol.key;
    }

    return SYMBOLS[0].key;
};

const randomGrid = () => {
    return Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => weightedSymbol()));
};

const pickMultiplierValue = () => MULTIPLIER_VALUES[Math.floor(Math.random() * MULTIPLIER_VALUES.length)];

const resolveGridBase = (grid: string[][], bet: number) => {
    const lines: WinLine[] = [];
    let lineWinTotal = 0;

    LINE_PATTERNS.forEach((pattern, lineIndex) => {
        const lineSymbols = pattern.map((row, reel) => grid[reel][row]);
        const firstNonWild = lineSymbols.find((symbol) => symbol !== "WILD" && symbol !== "ZEUS" && symbol !== "MULT");

        if (!firstNonWild && lineSymbols[0] !== "WILD") {
            return;
        }

        const target = firstNonWild || "WILD";
        let count = 0;

        for (const symbol of lineSymbols) {
            const isValid = symbol === target || symbol === "WILD";
            if (!isValid) break;
            count += 1;
        }

        if (count < 3) return;

        const symbolDef = SYMBOL_BY_KEY[target];
        const payout = symbolDef?.payouts[count as 3 | 4 | 5];
        if (!payout) return;

        const amount = bet * payout;
        const cells = pattern.slice(0, count).map((row, reel) => ({ reel, row }));
        lines.push({ lineIndex: lineIndex + 1, symbol: target, count, amount, cells });
        lineWinTotal += amount;
    });

    const flatten = grid.flat();
    const zeusCount = flatten.filter((symbol) => symbol === "ZEUS").length;
    const zeusPayout = ZEUS_PAYOUTS[zeusCount] || 0;
    const zeusWin = zeusPayout > 0 ? bet * zeusPayout : 0;

    const baseWin = lineWinTotal + zeusWin;

    return {
        baseWin,
        zeusCount,
        zeusWin,
        lines,
    };
};

const SlotsGame = () => {
    const [gamePhase, setGamePhase] = useState<GamePhase>("intro");
    const [roundState, setRoundState] = useState<RoundState>("idle");
    const [balance, setBalance] = useState(0);
    const [betAmount, setBetAmount] = useState<string>("10");
    const [currentBet, setCurrentBet] = useState(0);
    const [grid, setGrid] = useState<string[][]>(() => randomGrid());
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [resultMessage, setResultMessage] = useState<string | null>(null);
    const [lastSummary, setLastSummary] = useState<SpinSummary | null>(null);
    const [isSettlingResult, setIsSettlingResult] = useState(false);
    const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0);
    const [freeSpinMultiplierTotal, setFreeSpinMultiplierTotal] = useState(0);
    const [visibleMultiplierGrid, setVisibleMultiplierGrid] = useState<(number | null)[][]>(() => createEmptyMultiplierGrid());
    const [winningCellKeys, setWinningCellKeys] = useState<Set<string>>(new Set());

    const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const frameClip = "polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)";

    const broadcastBalanceUpdate = (nextBalance: number) => {
        window.dispatchEvent(new CustomEvent<number>("balance-updated", { detail: nextBalance }));
    };

    const focusGameArea = () => {
        const gameSection = document.getElementById("slots-table");
        if (!gameSection) return;

        requestAnimationFrame(() => {
            gameSection.scrollIntoView({ behavior: "smooth", block: "start" });
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
            if (isMounted) setBalance(userBalance);
        };

        void loadBalance();
        window.addEventListener("balance-updated", handleBalanceUpdated);

        return () => {
            isMounted = false;
            window.removeEventListener("balance-updated", handleBalanceUpdated);
            if (spinIntervalRef.current) {
                clearInterval(spinIntervalRef.current);
                spinIntervalRef.current = null;
            }
        };
    }, []);

    const startSpin = async () => {
        if (roundState === "spinning" || isSettlingResult) return;

        const isFreeSpinRound = freeSpinsRemaining > 0;
        const parsedBet = Number(betAmount);
        const effectiveBet = isFreeSpinRound ? currentBet : parsedBet;

        if (!Number.isFinite(effectiveBet) || effectiveBet <= 0) {
            setErrorMessage("Invalid bet. Enter a value greater than 0.");
            return;
        }

        if (!isFreeSpinRound && effectiveBet > balance) {
            setErrorMessage("You cannot bet more than your balance.");
            return;
        }

        if (!isFreeSpinRound) {
            setCurrentBet(effectiveBet);
            setFreeSpinMultiplierTotal(0);
        }

        setErrorMessage(null);
        setResultMessage(null);
        setWinningCellKeys(new Set());
        setRoundState("spinning");
        setIsSettlingResult(true);

        if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = setInterval(() => {
            const rollingGrid = randomGrid();
            setGrid(rollingGrid);
            setVisibleMultiplierGrid(createEmptyMultiplierGrid());
        }, 120);

        await new Promise((resolve) => setTimeout(resolve, 2100));

        if (spinIntervalRef.current) {
            clearInterval(spinIntervalRef.current);
            spinIntervalRef.current = null;
        }

        let activeGrid = randomGrid();
        let activeVisibleMultiplierGrid = createVisibleMultiplierGrid(activeGrid);
        setGrid(activeGrid);
        setVisibleMultiplierGrid(activeVisibleMultiplierGrid);

        let totalBaseWin = 0;
        let cascadeCount = 0;
        let maxZeusCount = 0;
        let lastZeusWin = 0;
        let allLines: WinLine[] = [];
        const multiplierValuesForSpin: number[] = [];

        for (let cascadeIndex = 0; cascadeIndex < MAX_CASCADES; cascadeIndex += 1) {
            const gridOutcome = resolveGridBase(activeGrid, effectiveBet);
            maxZeusCount = Math.max(maxZeusCount, gridOutcome.zeusCount);
            lastZeusWin = gridOutcome.zeusWin;

            if (gridOutcome.baseWin <= 0) {
                break;
            }

            cascadeCount += 1;
            totalBaseWin += gridOutcome.baseWin;
            allLines = [...allLines, ...gridOutcome.lines];

            const cascadeMultiplierValues = getMultiplierValuesFromVisibleGrid(activeGrid, activeVisibleMultiplierGrid);

            multiplierValuesForSpin.push(...cascadeMultiplierValues);
            if (cascadeIndex < MAX_CASCADES - 1) {
                activeGrid = randomGrid();
                activeVisibleMultiplierGrid = createVisibleMultiplierGrid(activeGrid);
                setGrid(activeGrid);
                setVisibleMultiplierGrid(activeVisibleMultiplierGrid);
            }
        }

        const spinMultiplierSum = multiplierValuesForSpin.reduce((sum, value) => sum + value, 0);
        const nextFreeSpinMultiplierTotal = isFreeSpinRound ? freeSpinMultiplierTotal + spinMultiplierSum : 0;
        const appliedMultiplier = isFreeSpinRound
            ? (nextFreeSpinMultiplierTotal > 0 ? nextFreeSpinMultiplierTotal : 1)
            : totalBaseWin > 0 && spinMultiplierSum > 0
                ? spinMultiplierSum
                : 1;

        const totalWin = totalBaseWin > 0 ? totalBaseWin * appliedMultiplier : 0;
        const summary: SpinSummary = {
            baseWin: totalBaseWin,
            totalWin,
            multiplierApplied: appliedMultiplier,
            multiplierValues: multiplierValuesForSpin,
            zeusCount: maxZeusCount,
            zeusWin: lastZeusWin,
            cascadeCount,
            lines: allLines,
        };

        const delta = isFreeSpinRound ? summary.totalWin : summary.totalWin - effectiveBet;
        const newBalance = Math.max(0, balance + delta);

        const updateResult = await updateBalance(newBalance);

        if (updateResult.ok) {
            setBalance(newBalance);
            broadcastBalanceUpdate(newBalance);
            setLastSummary(summary);
            const nextWinningKeys = new Set(summary.lines.flatMap((line) => line.cells.map((cell) => `${cell.reel}-${cell.row}`)));
            setWinningCellKeys(nextWinningKeys);

            if (isFreeSpinRound) {
                setFreeSpinMultiplierTotal(nextFreeSpinMultiplierTotal);
                setFreeSpinsRemaining((prev) => Math.max(0, prev - 1));
            }

            const zeusTriggerCount = summary.zeusCount;
            if (!isFreeSpinRound && zeusTriggerCount >= FREE_SPINS_TRIGGER) {
                setFreeSpinsRemaining(FREE_SPINS_AWARD);
                setFreeSpinMultiplierTotal(0);
            }

            if (summary.totalWin > 0) {
                const multiplierText = summary.multiplierApplied > 1 ? ` with x${summary.multiplierApplied} multiplier` : "";
                setResultMessage(`WIN! You earned +${summary.totalWin.toFixed(2)}€${multiplierText}.`);
            } else {
                const freeSpinLabel = isFreeSpinRound ? "on free spin" : `you lost ${effectiveBet.toFixed(2)}€.`;
                setResultMessage(`No winning combinations, ${freeSpinLabel}`);
            }

            if (!isFreeSpinRound && zeusTriggerCount >= FREE_SPINS_TRIGGER) {
                setResultMessage(`FREE SPINS TRIGGERED! ${FREE_SPINS_AWARD} spins awarded.`);
            }
        } else {
            setErrorMessage(updateResult.message || "Could not update balance. Please try again.");
        }

        setRoundState("resolved");
        setIsSettlingResult(false);
    };

    const potentialTopWin = useMemo(() => {
        const amount = Number(betAmount);
        if (!Number.isFinite(amount) || amount <= 0) return 0;
        return amount * 25 * 50;
    }, [betAmount]);

    const currentDisplayedMultiplier = useMemo(() => {
        if (roundState === "spinning") return 1;
        if (freeSpinsRemaining > 0) return freeSpinMultiplierTotal > 0 ? freeSpinMultiplierTotal : 1;
        return lastSummary?.multiplierApplied || 1;
    }, [roundState, freeSpinsRemaining, freeSpinMultiplierTotal, lastSummary]);

    const currentDisplayedValue = useMemo(() => {
        if (!lastSummary) return 0;
        return lastSummary.totalWin;
    }, [lastSummary]);

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
                    <span className="relative z-10">Start Slots</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-true-gold/25 to-transparent opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
                </button>
            </div>
        );
    }

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

                    <div className="mx-auto max-w-[720px] rounded-2xl border border-[#d2ad67]/35 bg-black/45 p-4 sm:p-5">
                        <div className="mb-4 text-center text-xs uppercase tracking-[0.16em] text-zinc-300">
                            Olympus Style Slot · 10 Paylines · Free Spins + Multipliers
                        </div>

                        {freeSpinsRemaining > 0 && (
                            <div className="mb-4 rounded-lg border border-violet-400/40 bg-violet-950/35 px-3 py-2 text-center text-xs uppercase tracking-[0.14em] text-violet-200">
                                Free Spins: {freeSpinsRemaining} · Accumulated Multiplier: x{freeSpinMultiplierTotal > 0 ? freeSpinMultiplierTotal : 1}
                            </div>
                        )}

                        <div className="grid grid-cols-5 gap-2 sm:gap-3">
                            {Array.from({ length: REELS }).map((_, reelIndex) => (
                                <div key={`reel-${reelIndex}`} className="rounded-lg border border-[#d2ad67]/30 bg-black/55 p-2">
                                    <div className="grid gap-2">
                                        {Array.from({ length: ROWS }).map((_, rowIndex) => {
                                            const symbol = grid[reelIndex]?.[rowIndex] || "GEM";
                                            const symbolDef = SYMBOL_BY_KEY[symbol] || SYMBOL_BY_KEY.GEM;
                                            const multiplierValue = visibleMultiplierGrid[reelIndex]?.[rowIndex];
                                            const isWinningCell = winningCellKeys.has(`${reelIndex}-${rowIndex}`);
                                            const multiplierLabel = roundState === "spinning" || !multiplierValue ? "x?" : `x${multiplierValue}`;
                                            return (
                                                <div
                                                    key={`cell-${reelIndex}-${rowIndex}`}
                                                    className={`relative flex h-20 items-center justify-center overflow-hidden rounded-md border-2 shadow-[inset_0_0_16px_rgba(0,0,0,0.35),0_0_10px_rgba(255,185,95,0.15)] ${SYMBOL_TILE_STYLES[symbol] || SYMBOL_TILE_STYLES.GEM} ${SYMBOL_FRAME_STYLES[symbol] || SYMBOL_FRAME_STYLES.GEM} ${roundState === "spinning" ? "animate-pulse" : ""} ${isWinningCell ? "ring-4 ring-amber-100 animate-pulse shadow-[0_0_28px_rgba(255,230,140,1),0_0_52px_rgba(255,176,69,0.75),inset_0_0_28px_rgba(255,233,163,0.45)]" : ""}`}
                                                >
                                                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(255,255,255,0.35),transparent_45%)]" />
                                                    {isWinningCell && (
                                                        <>
                                                            <span className="pointer-events-none absolute inset-[2px] rounded-[6px] border-2 border-amber-100/95" />
                                                            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,244,176,0.32),transparent_62%)]" />
                                                        </>
                                                    )}

                                                    {symbol !== "MULT" && (
                                                        <img
                                                            src={symbolDef.imagePath}
                                                            alt={symbolDef.label}
                                                            className="relative z-10 h-11 w-11 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]"
                                                            draggable={false}
                                                        />
                                                    )}

                                                    {symbol === "MULT" ? (
                                                        <div className="relative flex h-full w-full items-center justify-center">
                                                            <span className="rounded-md border border-violet-100/45 bg-black/25 px-2 py-1 text-2xl font-black tracking-[0.03em] text-violet-50 drop-shadow-[0_0_8px_rgba(245,210,255,0.9)]">
                                                                {multiplierLabel}
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => void startSpin()}
                        disabled={roundState === "spinning" || isSettlingResult}
                        className="mt-6 w-full border border-[#d2ad67]/70 bg-[linear-gradient(95deg,#d9b673,#c79a4d)] px-6 py-3 text-lg font-bold uppercase tracking-[0.09em] text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}
                    >
                        {roundState === "spinning" ? "Spinning..." : freeSpinsRemaining > 0 ? "Play Free Spin" : "Spin Slots"}
                    </button>

                    {resultMessage && (
                        <p className="mt-4 border border-[#d2ad67]/35 bg-black/55 px-4 py-3 text-sm text-[#e9c987]" style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}>
                            {resultMessage}
                        </p>
                    )}

                    {errorMessage && (
                        <p className="mt-4 border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300" style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}>
                            {errorMessage}
                        </p>
                    )}

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-violet-300/35 bg-violet-950/25 px-4 py-3 text-center">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-violet-200">Current Multiplier</p>
                            <p className="mt-1 text-3xl font-black text-violet-100">x{currentDisplayedMultiplier}</p>
                        </div>
                        <div className="rounded-lg border border-emerald-300/35 bg-emerald-950/20 px-4 py-3 text-center">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-200">Current Value</p>
                            <p className="mt-1 text-3xl font-black text-emerald-100">{currentDisplayedValue.toFixed(2)}€</p>
                        </div>
                    </div>
                </div>

                <div
                    className="border border-[#c9a35b]/45 bg-[linear-gradient(165deg,rgba(15,12,8,0.9),rgba(8,7,5,0.95))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-sm"
                    style={{ clipPath: frameClip }}
                >
                    <h3 className="text-center text-2xl font-bold uppercase tracking-[0.14em] text-[#e9c987]">Bet</h3>
                    <p className="mt-2 text-center text-sm text-zinc-300">Set your stake and spin for multipliers</p>

                    <div className="mt-6">
                        <label htmlFor="slots-bet-amount" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
                            Bet Amount
                        </label>
                        <div className="relative">
                            <input
                                id="slots-bet-amount"
                                type="number"
                                min="1"
                                step="1"
                                value={betAmount}
                                onChange={(event) => setBetAmount(event.target.value)}
                                className="w-full border border-[#d2ad67]/45 bg-black/70 px-4 py-3 pr-10 text-lg font-semibold text-[#e9c987] outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-[#e9c987]"
                                placeholder="10"
                                disabled={roundState === "spinning" || freeSpinsRemaining > 0}
                                style={{ clipPath: "polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px)" }}
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#e9c987]">€</span>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        {QUICK_BETS.map((quickBet) => (
                            <button
                                key={quickBet}
                                type="button"
                                onClick={() => setBetAmount(String(quickBet))}
                                disabled={roundState === "spinning" || freeSpinsRemaining > 0}
                                className="border border-[#d2ad67]/45 px-3 py-1 text-xs font-semibold text-[#e9c987] transition-colors hover:bg-[#d2ad67] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                                style={{ clipPath: "polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)" }}
                            >
                                {quickBet} €
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setBetAmount(balance.toFixed(2))}
                            disabled={balance <= 0 || roundState === "spinning" || freeSpinsRemaining > 0}
                            className="border border-emerald-400/60 px-3 py-1 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ clipPath: "polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)" }}
                        >
                            All In
                        </button>
                    </div>

                    <p className="mt-5 text-center text-xs uppercase tracking-[0.12em] text-zinc-400">Top potential win: {potentialTopWin.toFixed(2)}€</p>

                    <div className="mt-6 rounded-xl border border-[#d2ad67]/35 bg-black/45 p-3">
                        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">Paytable Multipliers (x Bet)</p>
                        <div className="overflow-hidden rounded-md border border-[#d2ad67]/20">
                            <table className="w-full text-xs">
                                <thead className="bg-black/55 text-zinc-300">
                                    <tr>
                                        <th className="px-2 py-2 text-left">Symbol</th>
                                        <th className="px-2 py-2 text-center">3x</th>
                                        <th className="px-2 py-2 text-center">4x</th>
                                        <th className="px-2 py-2 text-center">5x</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {SYMBOLS.filter((symbol) => symbol.payouts[3] || symbol.payouts[4] || symbol.payouts[5]).map((symbol) => (
                                        <tr key={`pay-${symbol.key}`} className="border-t border-[#d2ad67]/20 text-zinc-200">
                                            <td className="px-2 py-2 font-semibold">{symbol.label}</td>
                                            <td className="px-2 py-2 text-center">{symbol.payouts[3] || "-"}</td>
                                            <td className="px-2 py-2 text-center">{symbol.payouts[4] || "-"}</td>
                                            <td className="px-2 py-2 text-center">{symbol.payouts[5] || "-"}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t border-[#d2ad67]/20 text-zinc-200">
                                        <td className="px-2 py-2 font-semibold">Zeus</td>
                                        <td className="px-2 py-2 text-center">1</td>
                                        <td className="px-2 py-2 text-center">4</td>
                                        <td className="px-2 py-2 text-center">10</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-3 rounded-md border border-[#c084fc]/35 bg-[#2f1148]/35 px-3 py-2 text-[16px] text-zinc-200">
                            Base game: dropped multipliers are summed and applied only if there is a win. Free spins: multiplier values accumulate and stay active for all remaining free spins.
                        </div>

                        <div className="mt-3 rounded-md border border-amber-400/35 bg-amber-950/30 px-3 py-2 text-[16px] text-zinc-200">
                            Trigger free spins with 4 Zeus symbols: 15 free spins.
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setErrorMessage(null);
                            setResultMessage(null);
                            setLastSummary(null);
                            setCurrentBet(0);
                            setFreeSpinsRemaining(0);
                            setFreeSpinMultiplierTotal(0);
                            setWinningCellKeys(new Set());
                            setGamePhase("intro");
                        }}
                        className="mt-4 w-full border border-zinc-600/80 bg-black/35 px-6 py-3 text-sm font-semibold uppercase tracking-[0.09em] text-zinc-300 transition-colors hover:bg-zinc-800"
                        style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}
                    >
                        Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SlotsGame;
