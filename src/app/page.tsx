import { Playfair_Display } from "next/font/google";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-playfair-display", 
});

export default function Home() {
  return (
    <main className={`${playfairDisplay.variable} flex min-h-screen flex-col items-center justify-between p-26`}>
      <h1 className="text-7xl font-bold mb-6 animate-float min-h-26 text-true-gold font-family" >ROYELLE</h1>
    </main>
  );
}
