import { DM_Serif_Text } from "next/font/google";
import Card from "@/components/card";

const dmSerifText = DM_Serif_Text({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif-text",
});

export default function Home() {
  return (
    <main className={`${dmSerifText.variable} min-h-screen px-4 pb-16 pt-10 sm:px-8`}>
      <section className="mx-auto mb-10 max-w-7xl rounded-3xl border border-true-gold/20 bg-gradient-to-b from-black/75 via-zinc-950/80 to-black/85 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.65)] backdrop-blur-sm sm:p-12">
        <p className="mb-3 text-sm uppercase tracking-[0.22em] text-true-gold/85">Premium Online Casino</p>
        <h1 className={`${dmSerifText.className} text-5xl font-bold leading-tight text-true-gold sm:text-7xl`}>
          ROYELLE
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-300 sm:text-xl">
          High-stakes tables, polished gameplay, and instant action. Choose your game and play like a VIP.
        </p>
      </section>

      <div className="mx-auto max-w-7xl">
        <Card />
      </div>
    </main>
  );
}
