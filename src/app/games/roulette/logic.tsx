"use client";

import { dmSerifText } from "@/components/fonts";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClients";

type GamePhase = "intro" | "bet";
type BetType = "number" | "red" | "black" | "odd" | "even" | "low" | "high";

type BetResolution = {
    won: boolean;
    payoutMultiplier: number;
    label: string;
};

const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const WHEEL_CENTER = 50;
const WHEEL_OUTER_RADIUS = 48;

const polarToCartesian = (angleFromTop: number, radius: number) => {
    const radians = ((angleFromTop - 90) * Math.PI) / 180;
    return {
        x: WHEEL_CENTER + Math.cos(radians) * radius,
        y: WHEEL_CENTER + Math.sin(radians) * radius,
    };
};

const buildSegmentPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(startAngle, WHEEL_OUTER_RADIUS);
    const end = polarToCartesian(endAngle, WHEEL_OUTER_RADIUS);
    return `M ${WHEEL_CENTER} ${WHEEL_CENTER} L ${start.x} ${start.y} A ${WHEEL_OUTER_RADIUS} ${WHEEL_OUTER_RADIUS} 0 0 1 ${end.x} ${end.y} Z`;
};

const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;

const getBalance = async (): Promise<number> => {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return 0;

    const { data } = await supabase
        .from("profiles")
        .select("saldo")
        .eq("id", session.user.id)
        .maybeSingle();

    return data?.saldo || 0;
};

const updateBalance = async (newBalance: number): Promise<{ ok: boolean; message?: string }> => {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
        return { ok: false, message: "Session expired. Please sign in again." };
    }

    const { error } = await supabase.from("profiles").update({ saldo: newBalance }).eq("id", session.user.id);

    if (error) {
        return { ok: false, message: error.message };
    }

    return { ok: true };
};

const RouletteGame = () => {
    const [gamePhase, setGamePhase] = useState<GamePhase>("intro");
    const [balance, setBalance] = useState(0);
    const [betAmount, setBetAmount] = useState<string>("10");
    const [selectedBetType, setSelectedBetType] = useState<BetType>("red");
    const [selectedNumber, setSelectedNumber] = useState<number>(7);
    const [isSpinning, setIsSpinning] = useState(false);
    const [resultMessage, setResultMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastNumber, setLastNumber] = useState<number | null>(null);
    const [lastColor, setLastColor] = useState<"red" | "black" | "green" | null>(null);
    const [wheelRotation, setWheelRotation] = useState(0);

    const segmentAngle = 360 / WHEEL_ORDER.length;
    const frameClip = "polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)";

    const broadcastBalanceUpdate = (nextBalance: number) => {
        window.dispatchEvent(new CustomEvent<number>("balance-updated", { detail: nextBalance }));
    };

    const focusGameArea = () => {
        const gameSection = document.getElementById("roulette-table");
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
            if (isMounted) setBalance(userBalance);
        };

        void loadBalance();
        window.addEventListener("balance-updated", handleBalanceUpdated);

        return () => {
            isMounted = false;
            window.removeEventListener("balance-updated", handleBalanceUpdated);
        };
    }, []);

    const getNumberColor = (number: number): "red" | "black" | "green" => {
        if (number === 0) return "green";
        return RED_NUMBERS.has(number) ? "red" : "black";
    };

    const resolveBet = (rolledNumber: number): BetResolution => {
        const color = getNumberColor(rolledNumber);

        switch (selectedBetType) {
            case "number":
                return {
                    won: rolledNumber === selectedNumber,
                    payoutMultiplier: 35,
                    label: `Number ${selectedNumber}`,
                };
            case "red":
                return { won: color === "red", payoutMultiplier: 1, label: "Red" };
            case "black":
                return { won: color === "black", payoutMultiplier: 1, label: "Black" };
            case "odd":
                return {
                    won: rolledNumber !== 0 && rolledNumber % 2 !== 0,
                    payoutMultiplier: 1,
                    label: "Odd",
                };
            case "even":
                return {
                    won: rolledNumber !== 0 && rolledNumber % 2 === 0,
                    payoutMultiplier: 1,
                    label: "Even",
                };
            case "low":
                return {
                    won: rolledNumber >= 1 && rolledNumber <= 18,
                    payoutMultiplier: 1,
                    label: "1-18",
                };
            case "high":
                return {
                    won: rolledNumber >= 19 && rolledNumber <= 36,
                    payoutMultiplier: 1,
                    label: "19-36",
                };
            default:
                return { won: false, payoutMultiplier: 0, label: "Bet" };
        }
    };

    const getPotentialProfit = () => {
        const amount = Number(betAmount);
        if (!Number.isFinite(amount) || amount <= 0) return 0;
        return selectedBetType === "number" ? amount * 35 : amount;
    };

    const spinRoulette = async () => {
        if (isSpinning) return;

        const parsedBet = Number(betAmount);
        if (!Number.isFinite(parsedBet) || parsedBet <= 0) {
            setErrorMessage("Invalid bet. Enter a value greater than 0.");
            return;
        }

        if (parsedBet > balance) {
            setErrorMessage("You cannot bet more than your balance.");
            return;
        }

        setErrorMessage(null);
        setResultMessage(null);
        setIsSpinning(true);

        const rolledNumber = Math.floor(Math.random() * 37);
        const wheelIndex = WHEEL_ORDER.indexOf(rolledNumber);
        const centerAngle = wheelIndex * segmentAngle + segmentAngle / 2;

        const currentMod = normalizeAngle(wheelRotation);
        const targetMod = normalizeAngle(-centerAngle);

        let rotationDiff = targetMod - currentMod;
        while (rotationDiff <= 0) {
            rotationDiff += 360;
        }

        const randomTurns = 5 + Math.floor(Math.random() * 3);
        const nextRotation = wheelRotation + rotationDiff + (randomTurns * 360);

        setWheelRotation(nextRotation);

        await new Promise((resolve) => setTimeout(resolve, 4200));

        const color = getNumberColor(rolledNumber);
        const resolution = resolveBet(rolledNumber);
        const delta = resolution.won ? parsedBet * resolution.payoutMultiplier : -parsedBet;
        const newBalance = Math.max(0, balance + delta);

        const updateResult = await updateBalance(newBalance);

        if (updateResult.ok) {
            setBalance(newBalance);
            broadcastBalanceUpdate(newBalance);
            if (resolution.won) {
                setResultMessage(`You won! ${resolution.label} hit and paid +${Math.abs(delta).toFixed(2)}€.`);
            } else {
                setResultMessage(`You lost. Result was ${rolledNumber} (${color.toUpperCase()}) and you lost ${parsedBet.toFixed(2)}€.`);
            }
        } else {
            setErrorMessage(updateResult.message || "Could not update balance. Please try again.");
        }

        setLastNumber(rolledNumber);
        setLastColor(color);
        setIsSpinning(false);
    };

    const wheelSegments = useMemo(() => {
        return WHEEL_ORDER.map((number, index) => {
            const start = index * segmentAngle;
            const end = (index + 1) * segmentAngle;
            const color = number === 0 ? "#15803d" : RED_NUMBERS.has(number) ? "#b91c1c" : "#111827";

            return {
                number,
                color,
                path: buildSegmentPath(start, end),
            };
        });
    }, [segmentAngle]);

    if (gamePhase === "intro") {
        return (
            <div className="absolute inset-0 flex items-center justify-center px-6">
                <button
                    onClick={() => {
                        setErrorMessage(null);
                        setGamePhase("bet");
                        focusGameArea();
                    }}
                    className="group relative overflow-hidden rounded-2xl border border-true-gold/50 bg-black/60 px-14 py-7 text-3xl font-extrabold uppercase tracking-[0.2em] text-true-gold shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all duration-300 hover:scale-[1.03] hover:bg-true-gold hover:text-black"
                >
                    <span className="relative z-10">Start Roulette</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-true-gold/25 to-transparent opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
                </button>
            </div>
        );
    }

    return (
        <div className={`${dmSerifText.variable} absolute inset-x-0 top-0 bottom-0 overflow-y-auto px-4 pt-20 pb-6 sm:px-6 sm:pt-24 ${dmSerifText.className}`}>
            <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.18fr_0.82fr]">
                <div
                    className="border border-[#c9a35b]/45 bg-[linear-gradient(165deg,rgba(7,20,18,0.88),rgba(4,9,9,0.94))] p-5 shadow-[0_30px_70px_rgba(0,0,0,0.65)] backdrop-blur-sm sm:p-7"
                    style={{ clipPath: frameClip }}
                >
                    <div className="mb-5 flex items-center justify-between border-b border-[#c9a35b]/25 pb-4">
                        <p className="text-sm uppercase tracking-[0.13em] text-zinc-300">Balance: <span className="font-semibold text-[#e9c987]">{balance.toFixed(2)}€</span></p>
                        <p className="text-sm uppercase tracking-[0.13em] text-zinc-300">Potential Profit: <span className="font-semibold text-emerald-300">{getPotentialProfit().toFixed(2)}€</span></p>
                    </div>

                    <div className="relative mx-auto mb-7 h-[340px] w-[340px] md:h-[460px] md:w-[460px]">
                        <div className="absolute left-1/2 top-1 z-30 h-0 w-0 -translate-x-1/2 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-[#e9c987] drop-shadow-[0_0_10px_rgba(233,201,135,0.8)]" />

                        <div
                            className="absolute inset-0 rounded-full border-[12px] border-[#d2ad67] shadow-[0_0_40px_rgba(201,163,91,0.3)]"
                            style={{
                                transform: `rotate(${wheelRotation}deg)`,
                                transition: isSpinning ? "transform 4.2s cubic-bezier(0.1, 0.7, 0.1, 1)" : "none",
                            }}
                        >
                            <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full">
                                {wheelSegments.map((segment) => (
                                    <path key={`segment-${segment.number}`} d={segment.path} fill={segment.color} />
                                ))}

                                {WHEEL_ORDER.map((number, index) => {
                                    const angle = (index + 0.5) * segmentAngle;
                                    const radians = ((angle - 90) * Math.PI) / 180;
                                    const x = 50 + Math.cos(radians) * 43;
                                    const y = 50 + Math.sin(radians) * 43;

                                    return (
                                        <text
                                            key={number}
                                            x={x}
                                            y={y}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fontSize="4"
                                            fontWeight="800"
                                            fill="#ffffff"
                                            stroke="#0a0a0a"
                                            strokeWidth="0.55"
                                            paintOrder="stroke"
                                            transform={`rotate(${-wheelRotation} ${x} ${y})`}
                                        >
                                            {number}
                                        </text>
                                    );
                                })}
                            </svg>
                        </div>

                        <div className="absolute left-1/2 top-1/2 z-30 h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-[#d2ad67] bg-gradient-to-b from-zinc-900 to-black shadow-[0_0_26px_rgba(201,163,91,0.35)]" />
                    </div>

                    <button
                        type="button"
                        onClick={spinRoulette}
                        disabled={isSpinning}
                        className="w-full border border-[#d2ad67]/70 bg-[linear-gradient(95deg,#d9b673,#c79a4d)] px-6 py-3 text-lg font-bold uppercase tracking-[0.09em] text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ clipPath: "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)" }}
                    >
                        {isSpinning ? "Spinning..." : "Spin Roulette"}
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

                    {lastNumber !== null && lastColor && (
                        <p className="mt-3 text-center text-xs uppercase tracking-[0.12em] text-gray-300">
                            Last Number: <span className="font-bold text-true-gold">{lastNumber}</span> ({lastColor})
                        </p>
                    )}
                </div>

                <div
                    className="border border-[#c9a35b]/45 bg-[linear-gradient(165deg,rgba(15,12,8,0.9),rgba(8,7,5,0.95))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-sm"
                    style={{ clipPath: frameClip }}
                >
                    <h3 className="text-center text-2xl font-bold uppercase tracking-[0.14em] text-[#e9c987]">Bet</h3>
                    <p className="mt-2 text-center text-sm text-zinc-300">
                        Choose your amount and bet type before spinning
                    </p>

                    <div className="mt-6">
                        <label htmlFor="roulette-bet-amount" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
                            Bet Amount
                        </label>
                        <div className="relative">
                            <input
                                id="roulette-bet-amount"
                                type="number"
                                min="1"
                                step="1"
                                value={betAmount}
                                onChange={(e) => setBetAmount(e.target.value)}
                                className="w-full border border-[#d2ad67]/45 bg-black/70 px-4 py-3 pr-10 text-lg font-semibold text-[#e9c987] outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-[#e9c987]"
                                placeholder="10"
                                style={{ clipPath: "polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px)" }}
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
                                className="border border-[#d2ad67]/45 px-3 py-1 text-xs font-semibold text-[#e9c987] transition-colors hover:bg-[#d2ad67] hover:text-black"
                                style={{ clipPath: "polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)" }}
                            >
                                {quickBet} €
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setBetAmount(balance.toFixed(2))}
                            disabled={balance <= 0}
                            className="border border-emerald-400/60 px-3 py-1 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ clipPath: "polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)" }}
                        >
                            All In
                        </button>
                    </div>

                    <div className="mt-6">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Bet Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedBetType("red")}
                                className={`border px-3 py-2 text-sm font-bold transition-colors ${selectedBetType === "red" ? "border-red-400 bg-red-500/25 text-red-200" : "border-zinc-700 text-zinc-300 hover:border-red-500/50"}`}
                                style={{ clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}
                            >
                                Red (1:1)
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedBetType("black")}
                                className={`border px-3 py-2 text-sm font-bold transition-colors ${selectedBetType === "black" ? "border-zinc-300 bg-zinc-700/40 text-zinc-100" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"}`}
                                style={{ clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}
                            >
                                Black (1:1)
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedBetType("odd")}
                                className={`border px-3 py-2 text-sm font-bold transition-colors ${selectedBetType === "odd" ? "border-[#e9c987] bg-[#e9c987]/20 text-[#e9c987]" : "border-zinc-700 text-zinc-300 hover:border-[#e9c987]/60"}`}
                                style={{ clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}
                            >
                                Odd (1:1)
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedBetType("even")}
                                className={`border px-3 py-2 text-sm font-bold transition-colors ${selectedBetType === "even" ? "border-[#e9c987] bg-[#e9c987]/20 text-[#e9c987]" : "border-zinc-700 text-zinc-300 hover:border-[#e9c987]/60"}`}
                                style={{ clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}
                            >
                                Even (1:1)
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedBetType("low")}
                                className={`border px-3 py-2 text-sm font-bold transition-colors ${selectedBetType === "low" ? "border-[#e9c987] bg-[#e9c987]/20 text-[#e9c987]" : "border-zinc-700 text-zinc-300 hover:border-[#e9c987]/60"}`}
                                style={{ clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}
                            >
                                1-18 (1:1)
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedBetType("high")}
                                className={`border px-3 py-2 text-sm font-bold transition-colors ${selectedBetType === "high" ? "border-[#e9c987] bg-[#e9c987]/20 text-[#e9c987]" : "border-zinc-700 text-zinc-300 hover:border-[#e9c987]/60"}`}
                                style={{ clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}
                            >
                                19-36 (1:1)
                            </button>
                        </div>
                    </div>

                    <div className="mt-4">
                        <button
                            type="button"
                            onClick={() => setSelectedBetType("number")}
                            className={`w-full border px-3 py-2 text-sm font-bold transition-colors ${selectedBetType === "number" ? "border-[#e9c987] bg-[#e9c987]/20 text-[#e9c987]" : "border-zinc-700 text-zinc-300 hover:border-[#e9c987]/60"}`}
                            style={{ clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}
                        >
                            Straight Number (35:1)
                        </button>

                        {selectedBetType === "number" && (
                            <div className="mt-3">
                                <label htmlFor="roulette-number" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
                                    Number (0-36)
                                </label>
                                <input
                                    id="roulette-number"
                                    type="number"
                                    min="0"
                                    max="36"
                                    value={selectedNumber}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        setSelectedNumber(Number.isFinite(value) ? Math.min(36, Math.max(0, value)) : 0);
                                    }}
                                    className="w-full border border-[#d2ad67]/45 bg-black/70 px-3 py-2 text-[#e9c987] outline-none focus:border-[#e9c987]"
                                    style={{ clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RouletteGame;
