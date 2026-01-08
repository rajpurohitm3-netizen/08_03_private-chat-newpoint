"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Fingerprint, ChevronRight, CheckCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    symbol: false
  });

  useEffect(() => {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    const hasLength = password.length >= 8;

    setPasswordValidation({
      length: hasLength,
      upper: hasUpper,
      lower: hasLower,
      number: hasNumber,
      symbol: hasSymbol
    });
  }, [password]);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!Object.values(passwordValidation).every(Boolean)) {
      toast.error("Password does not meet requirements");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setResetSuccess(true);
      toast.success("Password updated successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (resetSuccess) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-6 bg-[#030303] relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150 pointer-events-none" />
        
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[320px] z-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 mb-8">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-4">Password Updated!</h1>
          <p className="text-zinc-400 mb-8">Your password has been successfully reset. You can now sign in with your new password.</p>
          <Button 
            onClick={() => router.push("/")}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all text-xs uppercase tracking-[0.2em]"
          >
            Go to Sign In
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-6 bg-[#030303] relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150 pointer-events-none" />
      
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[320px] z-10">
        <div className="text-center mb-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 mb-4 backdrop-blur-sm">
            <Lock className="w-6 h-6 text-indigo-400" />
          </motion.div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">New Password</h1>
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Create your new secure password</p>
        </div>

        <Card className="bg-white/[0.02] border-white/10 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] overflow-hidden border-t-white/20">
          <form onSubmit={handleResetPassword}>
            <CardContent className="p-6 md:p-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[10px] font-semibold text-zinc-400 ml-1 uppercase tracking-widest">New Password *</Label>
                <div className="relative group">
                  <Input id="password" type="password" value={password} placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} required className="bg-white/[0.03] border-white/10 h-11 rounded-xl px-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all text-white placeholder:text-zinc-600 text-xs" />
                  <Fingerprint className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 px-1">
                  {[{ key: 'length', label: '8+ Chars' }, { key: 'upper', label: 'Upper' }, { key: 'lower', label: 'Lower' }, { key: 'number', label: 'Num' }, { key: 'symbol', label: 'Sym' }].map((rule) => (
                    <div key={rule.key} className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full transition-colors ${(passwordValidation as any)[rule.key] ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      <span className={`text-[9px] font-bold tracking-widest transition-colors ${(passwordValidation as any)[rule.key] ? 'text-emerald-500' : 'text-zinc-600'}`}>{rule.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[10px] font-semibold text-zinc-400 ml-1 uppercase tracking-widest">Confirm Password *</Label>
                <div className="relative group">
                  <Input id="confirmPassword" type="password" value={confirmPassword} placeholder="••••••••" onChange={(e) => setConfirmPassword(e.target.value)} required className="bg-white/[0.03] border-white/10 h-11 rounded-xl px-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all text-white placeholder:text-zinc-600 text-xs" />
                  <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[9px] text-red-400 font-medium ml-1 uppercase tracking-widest">Passwords do not match</p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-[9px] text-emerald-400 font-medium ml-1 uppercase tracking-widest">Passwords match</p>
                )}
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-[0_0_25px_rgba(79,70,229,0.3)] disabled:opacity-30 text-xs uppercase tracking-[0.2em]" 
                  disabled={loading || !Object.values(passwordValidation).every(Boolean) || password !== confirmPassword}
                >
                  {loading ? (
                    <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /><span>Updating...</span></div>
                  ) : (
                    <div className="flex items-center justify-center gap-2"><span>Reset Password</span><ChevronRight className="w-4 h-4" /></div>
                  )}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
