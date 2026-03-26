"use client";

import { useRouter } from "next/navigation";
import { routes } from "@/lib/routes";

const games = [
    { name: "Roulette", tag: "Classic Wheel", accent: "from-red-700/60 via-black/20 to-black/70", path: routes.games.roulette },
    { name: "Mines", tag: "High Risk", accent: "from-emerald-700/50 via-black/20 to-black/70", path: routes.games.mines },
    { name: "Blackjack", tag: "Table Favorite", accent: "from-amber-700/50 via-black/20 to-black/70", path: routes.games.blackjack },
    { name: "Slots", tag: "Jackpot Spin", accent: "from-sky-700/45 via-black/20 to-black/70", path: routes.games.slots },
];

const Card = () => {
    const router = useRouter();

    return (
        <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {games.map((game) => (
                <div
                    key={game.name}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(game.path)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(game.path);
                        }
                    }}
                    className="group relative h-64 cursor-pointer overflow-hidden rounded-2xl border border-true-gold/25 shadow-[0_16px_50px_rgba(0,0,0,0.55)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(0,0,0,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-true-gold/70"
                    style={{ backgroundImage: `url(/${game.name}.jpg)`, backgroundSize: "cover", backgroundPosition: "center" }}
                >
                    <div className={`absolute inset-0 bg-gradient-to-t ${game.accent}`} />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                        <p className="mb-2 inline-block rounded-full border border-true-gold/35 bg-black/45 px-3 py-1 text-xs uppercase tracking-[0.15em] text-true-gold/90">
                            {game.tag}
                        </p>
                        <h2 className="text-3xl font-bold uppercase tracking-[0.1em] text-white">{game.name}</h2>
                        <p className="mt-1 text-sm text-zinc-200/85 opacity-0 transition-opacity duration-300 group-hover:opacity-100">Enter Table</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Card;