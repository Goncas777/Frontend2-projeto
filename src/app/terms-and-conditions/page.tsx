import { DM_Serif_Text } from "next/font/google";

const dmSerifText = DM_Serif_Text({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif-text",
});

export default function TermsPage() {
  return (
    <main className={`${dmSerifText.variable} min-h-screen px-4 pb-16 pt-10 sm:px-8`}>
      <section className="mx-auto max-w-4xl rounded-3xl border border-true-gold/20 bg-gradient-to-b from-black/75 via-zinc-950/80 to-black/85 p-6 text-zinc-300 shadow-[0_30px_90px_rgba(0,0,0,0.65)] backdrop-blur-sm sm:p-10">
        <p className="text-sm uppercase tracking-[0.22em] text-true-gold/85">Legal</p>
        <h1 className={`${dmSerifText.className} mt-2 text-4xl text-true-gold sm:text-5xl`}>
          Terms and Conditions
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-relaxed sm:text-base">
          <section>
            <h2 className="text-lg text-true-gold">1. Acceptance</h2>
            <p className="mt-2 text-zinc-300">
              By using the ROYELLE platform, you agree to these Terms and Conditions and to comply with applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-true-gold">2. Eligibility</h2>
            <p className="mt-2 text-zinc-300">
              Access is permitted only to users who are at least 18 years old.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-true-gold">3. Account and Usage</h2>
            <p className="mt-2 text-zinc-300">
              Each user is responsible for the security of their account and for the accuracy of the information provided.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-true-gold">4. Payments and Balance</h2>
            <p className="mt-2 text-zinc-300">
              Deposits and transactions must be made only through authorized payment methods. Suspicious activity may result in account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-true-gold">5. Limitation of Liability</h2>
            <p className="mt-2 text-zinc-300">
              ROYELLE is not liable for indirect losses, temporary service unavailability, or failures caused by third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-true-gold">6. Changes to Terms</h2>
            <p className="mt-2 text-zinc-300">
              These terms may be updated at any time. Continued use of the platform after updates implies acceptance of the revised terms.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
