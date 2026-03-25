import MinesGame from "./logic";

const Minegame = () => {
    return (
        <div
            className="relative w-full bg-cover bg-center"
            style={{ backgroundImage: `url(/background.png)`, minHeight: "100dvh" }}
        >
            <MinesGame />
        </div>
    );
}

export default Minegame;