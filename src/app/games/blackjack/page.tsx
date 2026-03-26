import { Hands } from "./logic";

const Blackjack = () => {
    return (
        <div id="blackjack-table" className="relative w-full overflow-hidden" style={{ minHeight: "calc(100dvh - 72px)" }}>
            <div className="relative flex min-h-[calc(100dvh-72px)] items-center justify-center bg-black px-6 text-center lg:hidden">
                <div className="max-w-md rounded-xl border border-true-gold/40 bg-black/70 p-6 text-true-gold">
                    <h2 className="text-2xl font-bold uppercase tracking-[0.08em]">Blackjack unavailable</h2>
                    <p className="mt-3 text-sm text-zinc-200">
                        This game is available on desktop resolution only.
                    </p>
                </div>
            </div>

            <div className="hidden lg:block">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-black"
                    style={{
                        backgroundImage: "url(/BlackjackDealer.WebP)",
                        backgroundSize: "contain",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center top",
                    }}
                />
                <div className="relative z-10" style={{ minHeight: "calc(100dvh - 72px)" }}>
                    <Hands />
                </div>
            </div>
        </div>
    );
}

export default Blackjack;