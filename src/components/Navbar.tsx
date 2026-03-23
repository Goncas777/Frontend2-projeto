"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { DM_Serif_Text } from "next/font/google";
import { supabase } from "@/lib/supabaseClients";

const dmSerifText = DM_Serif_Text({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-dm-serif-text",
});

type Profile = {
    username: string | null;
    saldo: number | null;
};

const Navbar = () => {
    const [username, setUsername] = useState<string | null>(null);
    const [saldo, setSaldo] = useState<number>(0);

    useEffect(() => {
        let isMounted = true;

        const loadUserProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                if (isMounted) setUsername(null);
                if (isMounted) setSaldo(0);
                return;
            }

            const { data } = await supabase
                .from("profiles")
                .select("username, saldo")
                .eq("id", session.user.id)
                .maybeSingle<Profile>();

            if (!isMounted) return;

            setUsername(
                data?.username ||
                session.user.user_metadata?.username ||
                session.user.email ||
                "User"
            );

            setSaldo(data?.saldo || 0);
        };

        void loadUserProfile();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session?.user) {
                if (isMounted) setUsername(null);
                if (isMounted) setSaldo(0);
                return;
            }

            void (async () => {
                const { data } = await supabase
                    .from("profiles")
                    .select("username, saldo")
                    .eq("id", session.user.id)
                    .maybeSingle<Profile>();

                if (!isMounted) return;

                setUsername(
                    data?.username ||
                    session.user.user_metadata?.username ||
                    session.user.email ||
                    "User"
                );

                setSaldo(data?.saldo || 0);
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
                    <>
                        <li className="px-5 py-1 text-true-gold border border-true-gold rounded-lg">
                            {saldo.toFixed(2)} €
                        </li>

                        <li>
                            <Image
                                src="/icondefault.png"
                                alt="User avatar"
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full object-cover object-[center_30%]"
                            />
                        </li>
                    </>
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