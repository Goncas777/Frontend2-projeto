import { DM_Serif_Text } from "next/font/google";

const dmSerifText = DM_Serif_Text({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-dm-serif-text",
});

const Navbar = () => {
    return (
        <nav className={`flex justify-between p-4 px-12 text-white border-b border-gray-600 ${dmSerifText.className}`}>
            <ul className={`${dmSerifText.className} `}>
                <li><a href="/" className="text-true-gold text-xl">ROYELLE</a></li>
            </ul>
            <ul className="flex gap-4">
                <li className="px-5 py-1 bg-true-gold rounded-lg text-black"><a href="/register">Register</a></li> 
                <li className="px-5 py-1 rounded-lg text-gray-400"><a href="/signin">Sign In</a></li>
            </ul>
        </nav>
    );
}

export default Navbar;