import SlotsGame from "./logic";

const SlotsPage = () => {
    return (
        <div id="slots-table" className="relative w-full overflow-hidden" style={{ minHeight: "calc(100dvh - 72px)" }}>
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-black"
                style={{
                    backgroundImage: "url(/background.png)",
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    filter: "brightness(0.2)",
                }}
            />
            <div className="relative z-10" style={{ minHeight: "calc(100dvh - 72px)" }}>
                <SlotsGame />
            </div>
        </div>
    );
};

export default SlotsPage;
