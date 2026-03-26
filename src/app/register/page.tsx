"use client";

import { useState } from "react";
import { DM_Serif_Text } from "next/font/google";
import { supabase } from "@/lib/supabaseClients";
import { useRouter } from "next/navigation";
import { routes } from "@/lib/routes";

const dmSerifText = DM_Serif_Text({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-dm-serif-text",
});

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageType("");

    if (!formData.username.trim()) {
      setMessage("Please enter a username");
      setMessageType("error");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match");
      setMessageType("error");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMessage("Password must have at least 6 characters");
      setMessageType("error");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      setMessage("Error: " + error.message);
      setMessageType("error");
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: data.user.id,
          username: formData.username,
          saldo: 100,
        },
      ]);

      if (profileError) {
        setMessage("Account created but profile setup failed: " + profileError.message);
        setMessageType("error");
      } else {
        setMessage("Account created successfully. Check your email.");
        setMessageType("success");
        setFormData({ username: "", email: "", password: "", confirmPassword: "" });
      }
    }

    setLoading(false);
  }

  return (
    <div className={`${dmSerifText.variable} relative flex min-h-[calc(100dvh-72px)] flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-gradient-to-b from-black via-zinc-950 to-black px-4 py-10 text-white sm:px-6 sm:py-12`}>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-true-gold/10 via-transparent to-transparent pointer-events-none" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-true-gold/5 blur-3xl sm:h-96 sm:w-96" />
      
      <div className="z-10 mb-8 text-center sm:mb-10">
        <h1 className={`${dmSerifText.className} mb-3 text-3xl font-bold tracking-wide text-true-gold sm:text-4xl lg:text-5xl`}>
          Join ROYELLE
        </h1>
        <p className="text-base text-gray-400 sm:text-lg">Begin your exclusive gaming journey</p>
      </div>

      <form onSubmit={handleSignup} className="relative z-10 w-full max-w-md rounded-2xl border border-true-gold/20 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 shadow-2xl backdrop-blur-sm transition-all duration-500 hover:border-true-gold/40 sm:p-8 lg:p-10">
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
            value={formData.username}
            onChange={handleInputChange}
            required
            className="w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-3 text-white placeholder-zinc-500 transition-all duration-300 focus:border-true-gold focus:outline-none focus:ring-1 focus:ring-true-gold/50" 
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
            value={formData.email}
            onChange={handleInputChange}
            required
            className="w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-3 text-white placeholder-zinc-500 transition-all duration-300 focus:border-true-gold focus:outline-none focus:ring-1 focus:ring-true-gold/50" 
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium mb-2 text-gray-300 tracking-wide uppercase">
            Password
          </label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            placeholder="Create a password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className="w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-3 text-white placeholder-zinc-500 transition-all duration-300 focus:border-true-gold focus:outline-none focus:ring-1 focus:ring-true-gold/50" 
          />
        </div>

        <div className="mb-8">
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-gray-300 tracking-wide uppercase">
            Confirm password
          </label>
          <input 
            type="password" 
            id="confirmPassword" 
            name="confirmPassword" 
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            className="w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-3 text-white placeholder-zinc-500 transition-all duration-300 focus:border-true-gold focus:outline-none focus:ring-1 focus:ring-true-gold/50" 
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-true-gold via-amber-600 to-true-gold text-black font-bold rounded-lg hover:from-amber-500 hover:via-true-gold hover:to-amber-500 transition-all duration-300 shadow-lg shadow-true-gold/20 hover:shadow-true-gold/40 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Account"}
        </button>

        {message && (
          <p className={`mt-6 text-center text-sm font-medium ${messageType === "success" ? "text-green-400" : "text-red-400"}`}>
            {message}
          </p>
        )}
        
        <p className="text-center mt-6 text-gray-500 text-sm">
          Already a member?{" "}
          <button type="button" onClick={() => router.push(routes.signIn)} className="text-true-gold hover:text-amber-400 transition-colors duration-300 underline underline-offset-4">
            Sign In
          </button>
        </p>
      </form>

      <p className="z-10 mt-8 text-center text-xs text-gray-600 sm:mt-10 sm:text-sm">
        ✦ Exclusive Games for Elite Players ✦
      </p>
    </div>
  );
}