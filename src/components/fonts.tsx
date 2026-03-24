import { DM_Serif_Text } from "next/font/google";


const dmSerifText = DM_Serif_Text({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif-text",
});

export { dmSerifText };