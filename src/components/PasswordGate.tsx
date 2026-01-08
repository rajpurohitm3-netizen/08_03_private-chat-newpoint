"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PasswordGateProps {
  correctPassword: string;
  onUnlock: () => void;
  title?: string;
  subtitle?: string;
  description?: string;
}

export function PasswordGate({ 
  correctPassword, 
  onUnlock, 
  title = "Authentication Required", 
  subtitle = "Security Protocol",
  description = "System access restricted. Please enter authorization code."
}: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      onUnlock();
    } else {
      setError(true);
      setPassword("");
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#010101] p-6 text-center relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] brightness-150 contrast-200 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-md space-y-12"
      >
        <div className="flex justify-center">
          <div className="p-8 bg-white/[0.02] border border-white/10 rounded-[2.5rem] backdrop-blur-3xl shadow-2xl relative group">
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Shield className="w-12 h-12 text-indigo-500 relative" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">
            {title}
          </h2>
          <div className="flex items-center justify-center gap-2">
            <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" />
            <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-[0.4em]">
              {subtitle}
            </p>
          </div>
          <p className="text-zinc-500 font-medium leading-relaxed tracking-wide text-[10px] uppercase max-w-[280px] mx-auto opacity-60">
            {description}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <motion.div
              animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ENTER ACCESS CODE"
                className={`h-16 bg-white/[0.02] border-white/10 rounded-2xl text-center text-xl font-black tracking-[1em] focus:border-indigo-500/50 transition-all uppercase placeholder:text-zinc-800 placeholder:tracking-widest placeholder:text-[10px] ${error ? 'border-red-500/50 text-red-500' : 'text-white'}`}
                autoFocus
              />
            </motion.div>
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-indigo-500 transition-colors" />
          </div>

          <Button 
            type="submit"
            className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.3em] group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Authorize Uplink <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
          </Button>
        </form>

        <div className="pt-4">
          <p className="text-[8px] font-medium uppercase tracking-[0.5em] text-white/20">
            AES-256 Quantum Resistant Matrix
          </p>
        </div>
      </motion.div>

      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
