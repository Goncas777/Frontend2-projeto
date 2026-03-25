import { Hands } from "./logic";

const Blackjack = () => {

    return (
        <div
            id="blackjack-table"
            className="relative w-full overflow-hidden bg-black"
            style={{
                backgroundImage: "url(/BlackjackDealer.WebP)",
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center top",
                minHeight: "calc(100dvh - 72px)",
            }}
        >
            <Hands />
        </div>
    );
}

export default Blackjack;