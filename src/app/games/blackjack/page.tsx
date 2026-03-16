import { Hands } from "./logic";

const Blackjack = () => {

    return (
        <div
            className="relative w-full bg-cover bg-center"
            style={{ backgroundImage: `url(/BlackjackDealer.WebP)`, minHeight: '100vh' }}
        >
            <Hands />
        </div>
    );
}

export default Blackjack;