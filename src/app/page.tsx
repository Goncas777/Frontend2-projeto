import { DM_Serif_Text } from "next/font/google";
import Card from "@/components/card";

const dmSerifText = DM_Serif_Text({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif-text",
});

export default function Home() {
  return (
    <main className={`${dmSerifText.variable} flex min-h-screen flex-col items-center mt-10 gap-8 p-10`}>
      <h1 className={`${dmSerifText.className} text-7xl font-bold mb-6 animate-float min-h-26 text-true-gold`} >ROYELLE</h1>
      <div className="grid grid-cols-4 gap-4">
        <Card />
      </div>
    </main>
  );
}
