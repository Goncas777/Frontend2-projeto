export const routes = {
  home: "/",
  register: "/register",
  signIn: "/signin",
  games: {
    blackjack: "/games/blackjack",
    mines: "/games/mines",
    roulette: "/games/roulette",
    slots: "/games/slots",
  },
} as const;
