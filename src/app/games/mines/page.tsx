import MinesGame from "./logic";

const Minegame = () => {
    return (
        <div
            className="relative w-full bg-cover bg-center"
            style={{ backgroundImage: `url(/BlackjackDealer.WebP)`, minHeight: '100vh' }}
        >
            <MinesGame />
        </div>
    );
}

export default Minegame;