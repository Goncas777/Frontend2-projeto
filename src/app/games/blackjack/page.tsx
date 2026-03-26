import { Hands } from "./logic";

const Blackjack = () => {
    return (
        <div id="blackjack-table" className="relative w-full overflow-hidden" style={{ minHeight: "calc(100dvh - 72px)" }}>
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
    );
}

export default Blackjack;