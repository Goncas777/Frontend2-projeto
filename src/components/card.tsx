const gameNames = ["Roulette", "Mines", "Blackjack", "Slots"];

const Card = () => {
    return (
        <>
            {gameNames.map((game) => (
                <div
                    key={game}
                    className="w-96 h-60 bg-[url(/roulette.jpg)] bg-cover bg-center rounded-lg shadow-lg border border-gray-600 flex items-end p-4"
                >
                    <h2 className="text-2xl font-bold mb-2 text-white">{game}</h2>
                </div>
            ))}
        </>
    );
};

export default Card;