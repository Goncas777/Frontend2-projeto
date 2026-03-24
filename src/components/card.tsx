"use client";

const gameNames = ["Roulette", "Mines", "Blackjack", "Slots"];
import { useRouter } from "next/navigation";

const Card = () => {
    const router = useRouter();
    return (
        <>
            {gameNames.map((game) => (
                <a onClick={() => router.push(`/games/${game.toLowerCase()}`)}>
                <div
                    key={game}
                    className="group relative w-100 h-60 bg-cover bg-center rounded-lg shadow-lg border border-gray-600 overflow-hidden cursor-pointer"
                    style={{ backgroundImage: `url(/${game}.jpg)` }}
                >

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300" />
                    

                    <h2 className="absolute bottom-4 left-4 text-2xl font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {game}
                    </h2>
                </div>
                </a>
            ))}
            {gameNames.reverse().map((game) => (
                <a onClick={() => router.push(`/games/${game.toLowerCase()}`)}>
                <div
                    key={game}
                    className="group relative w-100 h-60 bg-cover bg-center rounded-lg shadow-lg border border-gray-600 overflow-hidden cursor-pointer"
                    style={{ backgroundImage: `url(/${game}.jpg)` }}
                >

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300" />
                    

                    <h2 className="absolute bottom-4 left-4 text-2xl font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {game}
                    </h2>
                </div>
                </a>
            ))}
        </>
    );
};

export default Card;