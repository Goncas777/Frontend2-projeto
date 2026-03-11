import { DM_Serif_Text } from "next/font/google";

const dmSerifText = DM_Serif_Text({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-dm-serif-text",
});

const Register = () => {
    return (
        <div className={`${dmSerifText.variable} flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white relative overflow-hidden`}>
            {/* Decorative elements */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-true-gold/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-true-gold/5 rounded-full blur-3xl pointer-events-none" />
            
            {/* Header */}
            <div className="text-center mb-10 z-10">
                <h1 className={`${dmSerifText.className} text-5xl font-bold text-true-gold mb-3 tracking-wide`}>
                    Welcome Back
                </h1>
                <p className="text-gray-400 text-lg">Continue your exclusive gaming journey</p>
            </div>

            {/* Form Card */}
            <form className="relative z-10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 backdrop-blur-sm p-10 rounded-2xl shadow-2xl w-full max-w-md border border-true-gold/20 hover:border-true-gold/40 transition-all duration-500">
                {/* Golden accent line */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-true-gold to-transparent rounded-full" />
                
                <div className="mb-6">
                    <label htmlFor="username" className="block text-sm font-medium mb-2 text-gray-300 tracking-wide uppercase">
                        Username
                    </label>
                    <input 
                        type="text" 
                        id="username" 
                        name="username" 
                        placeholder="Enter your username"
                        className="w-full px-4 py-3 bg-black/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-true-gold focus:ring-1 focus:ring-true-gold/50 transition-all duration-300" 
                    />
                </div>
                
                <div className="mb-6">
                    <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-300 tracking-wide uppercase">
                        Email
                    </label>
                    <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        placeholder="Enter your email"
                        className="w-full px-4 py-3 bg-black/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-true-gold focus:ring-1 focus:ring-true-gold/50 transition-all duration-300" 
                    />
                </div>
                
                <div className="mb-8">
                    <label htmlFor="password" className="block text-sm font-medium mb-2 text-gray-300 tracking-wide uppercase">
                        Password
                    </label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        placeholder="Create a password"
                        className="w-full px-4 py-3 bg-black/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-true-gold focus:ring-1 focus:ring-true-gold/50 transition-all duration-300" 
                    />
                </div>

                
                <button 
                    type="submit" 
                    className="w-full py-3 bg-gradient-to-r from-true-gold via-amber-600 to-true-gold text-black font-bold rounded-lg hover:from-amber-500 hover:via-true-gold hover:to-amber-500 transition-all duration-300 shadow-lg shadow-true-gold/20 hover:shadow-true-gold/40 uppercase tracking-wider"
                >
                    Sign In
                </button>
                
                <p className="text-center mt-6 text-gray-500 text-sm">
                    Don't have an account?{" "}
                    <a href="/register" className="text-true-gold hover:text-amber-400 transition-colors duration-300 underline underline-offset-4">
                        Register
                    </a>
                </p>
            </form>

            {/* Bottom decorative text */}
            <p className="mt-10 text-gray-600 text-sm z-10">
                ✦ Exclusive Games for Elite Players ✦
            </p>
        </div>
    );
}

export default Register;