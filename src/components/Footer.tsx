import Link from "next/link";
import { DM_Serif_Text } from "next/font/google";

const dmSerifText = DM_Serif_Text({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif-text",
});

const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className={`${dmSerifText.className} border-t border-true-gold/30 bg-black/70 px-4 py-10 text-zinc-300 backdrop-blur-md sm:px-8`}>
      <div className="mx-auto grid w-full max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-true-gold/80">ROYELLE</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
            Casino-inspired entertainment platform. Play responsibly.
          </p>
        </div>

        <div>
          <p className="text-sm uppercase tracking-[0.15em] text-true-gold/80">Navigation</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/" className="transition-colors hover:text-true-gold">
                Home
              </Link>
            </li>
            <li>
              <Link href="/register" className="transition-colors hover:text-true-gold">
                Register
              </Link>
            </li>
            <li>
              <Link href="/signin" className="transition-colors hover:text-true-gold">
                Sign In
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm uppercase tracking-[0.15em] text-true-gold/80">Legal</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/terms-and-conditions" className="transition-colors hover:text-true-gold">
                Terms and Conditions
              </Link>
            </li>
            <li>
              <p className="text-zinc-500">For users aged 18 and over only.</p>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-8 w-full max-w-7xl border-t border-true-gold/20 pt-5 text-center text-xs text-zinc-500 sm:text-left">
        © {currentYear} ROYELLE. All rights reserved.
      </div>
    </footer>
  );
}
