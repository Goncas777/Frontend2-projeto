import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Serif_Text } from "next/font/google";
import Image from "next/image";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://royelle.vercel.app";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ROYELLE | Premium Online Casino",
    template: "%s | ROYELLE",
  },
  description: "Premium online casino experience with Roulette, Blackjack, Mines, and Slots.",
  applicationName: "ROYELLE",
  keywords: ["casino", "online casino", "blackjack", "roulette", "slots", "mines", "royelle"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "ROYELLE | Premium Online Casino",
    description: "Premium online casino experience with Roulette, Blackjack, Mines, and Slots.",
    siteName: "ROYELLE",
    images: [
      {
        url: "/background.png",
        width: 1200,
        height: 630,
        alt: "ROYELLE casino background",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ROYELLE | Premium Online Casino",
    description: "Premium online casino experience with Roulette, Blackjack, Mines, and Slots.",
    images: ["/background.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const dmSerifText = DM_Serif_Text({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif-text",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <main>
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          >
            <Image
              src="/background.png"
              alt=""
              fill
              priority
              style={{
                objectFit: 'cover',
                opacity: 1,
                filter: 'brightness(0.20) ',
              }}
            />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Suspense fallback={<div className="h-[72px]" />}>
              <Navbar />
            </Suspense>
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
