import { DM_Serif_Text } from "next/font/google";
import Card from "@/components/card";

const dmSerifText = DM_Serif_Text({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif-text",
});

export default function Home() {
  return (
    <main className={`${dmSerifText.variable} flex min-h-screen flex-col items-center mt-10  p-10`}>
      <h1 className={`${dmSerifText.className} text-7xl font-bold animate-float min-h-26 text-true-gold`} >ROYELLE</h1>
      <p className="text-2xl text-gray-400 mb-24">Exclusive Games for Elite Players</p>
      <div className="grid grid-cols-4 gap-4">
        <Card />
      </div>
    </main>
  );
}
