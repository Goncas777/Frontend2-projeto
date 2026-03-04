import { DM_Serif_Text } from "next/font/google";

const dmSerifText = DM_Serif_Text({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif-text",
});

export default function Home() {
  return (
    <main className={`${dmSerifText.variable} flex min-h-screen flex-col items-center justify-between p-26`}>
      <h1 className={`${dmSerifText.className} text-7xl font-bold mb-6 animate-float min-h-26 text-true-gold`} >ROYELLE</h1>
    </main>
  );
}
