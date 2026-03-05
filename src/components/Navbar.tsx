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
                <a href="/register">
                <li className="px-5 py-1 bg-true-gold opacity-100 hover:opacity-80 hover:cursor-pointer rounded-lg text-black" >Register</li> 
                </a>
                <a href="/signin">
                <li className="px-5 py-1 hover:text-true-gold hover:cursor-pointer rounded-lg text-gray-400">Sign In</li>
                </a>
            </ul>
        </nav>
    );
}

export default Navbar;