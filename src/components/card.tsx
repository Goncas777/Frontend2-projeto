const gameNames = ["Roulette", "Mines", "Blackjack", "Slots"];

const Card = () => {
    return (
        <>
            {gameNames.map((game) => (
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
            ))}
            {gameNames.reverse().map((game) => (
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
            ))}
        </>
    );
};

export default Card;