"use client";

import { useState } from "react";

const suits = ['♥', '♦', '♣', '♠'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

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
    className="w-16 h-24 rounded shadow-xl"
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
    const [gameStarted, setGameStarted] = useState(false);

    const startGame = () => {
        const newDeck = shuffleDeck(createDeck());
        setPlayerHand([newDeck.pop()!, newDeck.pop()!]);
        setDealerHand([newDeck.pop()!]);
        setDeck(newDeck);
        setGameResult(null);
        setGameStarted(true);
    };

    const hit = () => {
        if (gameResult) return;
        const newDeck = [...deck];
        const newCard = newDeck.pop()!;
        const newPlayerHand = [...playerHand, newCard];
        setDeck(newDeck);
        setPlayerHand(newPlayerHand);
        if (calculateHandValue(newPlayerHand) > 21) {
            setGameResult('Bust! Dealer wins!');
        }
    };

    const stand = () => {
        if (gameResult) return;
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
            setGameResult('You win!');
        } else if (dealerValue === playerValue) {
            setGameResult("It's a tie!");
        } else {
            setGameResult('Dealer wins!');
        }
    };

    if (!gameStarted) {
        return (
            <div className="absolute inset-0 flex items-end justify-end p-10">
                <button
                    onClick={startGame}
                    className="px-6 py-2 bg-true-gold hover:opacity-80 text-black font-bold rounded-lg"
                >
                    Start Game
                </button>
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
            <div className="absolute bottom-[8%] left-0 right-0 px-8 flex items-end justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-true-gold text-xs font-semibold bg-black/50 px-2 py-0.5 rounded self-start">
                        Your Hand ({calculateHandValue(playerHand)})
                    </span>
                    <div className="flex gap-2">
                        {playerHand.map((card, i) => (
                            <PlayingCard key={i} card={card} />
                        ))}
                    </div>
                </div>

                {gameResult ? (
                    <div className="flex flex-col items-center gap-3">
                        <span className="text-2xl font-bold text-true-gold bg-black/70 px-5 py-2 rounded-lg">
                            {gameResult}
                        </span>
                        <button
                            onClick={startGame}
                            className="px-6 py-2 bg-true-gold hover:opacity-80 text-black font-bold rounded-lg"
                        >
                            Play Again
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 mb-1">
                        <button
                            onClick={hit}
                            className="px-8 py-2 bg-true-gold hover:opacity-80 text-black font-bold rounded-lg"
                        >
                            Hit
                        </button>
                        <button
                            onClick={stand}
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