"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DM_Serif_Text } from "next/font/google";
import { supabase } from "@/lib/supabaseClients";

const dmSerifText = DM_Serif_Text({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-dm-serif-text",
});

type Profile = {
    username: string | null;
};

const Navbar = () => {
    const [username, setUsername] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadUserProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                if (isMounted) setUsername(null);
                return;
            }

            const { data } = await supabase
                .from("profiles")
                .select("username")
                .eq("id", "64e8af21-12d0-430b-9f83-d7a4025fd8aa")
                .maybeSingle<Profile>();

            if (!isMounted) return;

            console.log(data?.username);

            setUsername(data?.username || session.user.email || "User");
        };

        void loadUserProfile();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session?.user) {
                if (isMounted) setUsername(null);
                return;
            }

            void (async () => {
                const { data } = await supabase
                    .from("profiles")
                    .select("username")
                    .eq("id", session.user.id)
                    .maybeSingle<Profile>();

                if (!isMounted) return;

                setUsername(data?.username || session.user.email || "User");
            })();
        });

        return () => {
            isMounted = false;
            authListener.subscription.unsubscribe();
        };
    }, []);

    return (
        <nav className={`flex justify-between p-4 px-12 text-white border-b border-gray-600 ${dmSerifText.className}`}>
            <ul className={`${dmSerifText.className} `}>
                <li>
                    <Link href="/" className="text-true-gold text-xl">ROYELLE</Link>
                </li>
            </ul>
            <ul className="flex gap-4">
                {username ? (
                    <li className="px-5 py-1 rounded-lg text-true-gold border border-true-gold/40">
                        {username}
                    </li>
                ) : (
                    <>
                        <li>
                            <Link href="/register" className="px-5 py-1 bg-true-gold opacity-100 hover:opacity-80 hover:cursor-pointer rounded-lg text-black block">
                                Register
                            </Link>
                        </li>
                        <li>
                            <Link href="/signin" className="px-5 py-1 hover:text-true-gold hover:cursor-pointer rounded-lg text-gray-400 block">
                                Sign In
                            </Link>
                        </li>
                    </>
                )}
            </ul>
        </nav>
    );
}

export default Navbar;