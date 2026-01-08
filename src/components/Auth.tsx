"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { confirmUserEmail } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Lock, Fingerprint, ChevronRight, User, Phone, CheckCircle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [systemConfig, setSystemConfig] = useState<any>({});
  const [showPendingMessage, setShowPendingMessage] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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

  useEffect(() => {
    fetchSystemConfig();
  }, []);

  async function fetchSystemConfig() {
    const { data } = await supabase.from("system_config").select("*");
    if (data) {
      const config = data.reduce((acc: any, item: any) => {
        acc[item.key] = item.value === 'true' || item.value === true;
        return acc;
      }, {});
      setSystemConfig(config);
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (systemConfig.firewall_status) {
      toast.error("Global Firewall Active: Security Lockdown in progress.");
      return;
    }
    if (systemConfig.maintenance_mode) {
      toast.error("System is under maintenance. Access restricted.");
      return;
    }
    if (isSignUp && !systemConfig.registration_open) {
      toast.error("Registration is currently closed by administration.");
      return;
    }
    setLoading(true);
    
    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          toast.error("Please enter your full name");
          setLoading(false);
          return;
        }
        
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").upsert({
            id: data.user.id,
            username: `${email.split("@")[0]}_${Math.floor(Math.random() * 1000)}`,
            full_name: fullName.trim(),
            phone: phoneNumber.trim() || null,
            is_approved: false,
            updated_at: new Date().toISOString(),
          });

          if (profileError) {
            console.error("Profile creation error:", profileError);
            toast.error("Account created but profile synchronization failed. Please contact admin.");
            throw profileError;
          }

          await confirmUserEmail(data.user.id);
          setShowPendingMessage(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetEmailSent(true);
      toast.success("Password reset link sent! Check your email.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (showPendingMessage) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
        <div className="mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }} className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
            <CheckCircle className="w-8 h-8 text-amber-400" />
          </motion.div>
          <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-2">Registration <span className="text-amber-400">Logged</span></h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Node activation pending admin clearance</p>
        </div>
        
        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] text-left space-y-4 mb-8">
          <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] text-amber-200 font-black uppercase tracking-widest">Awaiting Identity Verification</span>
          </div>
          <p className="text-[9px] text-zinc-500 font-bold leading-relaxed uppercase tracking-[0.1em]">Your account is in the queue. You will receive access once the security protocols are satisfied.</p>
        </div>

        <button onClick={() => { setShowPendingMessage(false); setIsSignUp(false); }} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft className="w-3 h-3" /> Return to Login
        </button>
      </motion.div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-1">{resetEmailSent ? "Link Sent" : "Recover Key"}</h1>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">{resetEmailSent ? "System broadcast complete" : "Initiate key recovery protocol"}</p>
        </div>

        <div className="space-y-6">
          {resetEmailSent ? (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-[11px] text-zinc-400 font-medium leading-relaxed uppercase tracking-wider px-4">Encryption reset link dispatched to <span className="text-white font-bold">{email}</span></p>
              <div className="space-y-4">
                <Button 
                  onClick={() => { setResetEmailSent(false); }}
                  className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all"
                >
                  Resend Link
                </Button>
                <button 
                  onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); setEmail(""); }} 
                  className="w-full text-[10px] font-black text-zinc-500 hover:text-white transition-colors uppercase tracking-[0.3em]"
                >
                  Return to Gateway
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="resetEmail" className="text-[10px] font-black text-zinc-500 ml-1 uppercase tracking-[0.2em]">Uplink Address *</Label>
                <div className="relative group">
                  <Input id="resetEmail" type="email" placeholder="SECURE@NODE.SYS" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white/[0.02] border-white/10 h-12 rounded-xl px-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all text-white placeholder:text-zinc-700 text-[11px] font-bold" />
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                </div>
              </div>
              <div className="pt-2">
                <Button type="submit" className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-lg shadow-indigo-500/20" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /><span>Transmitting...</span></div>
                  ) : (
                    <div className="flex items-center justify-center gap-2"><span>Recover Uplink</span><ChevronRight className="w-3 h-3" /></div>
                  )}
                </Button>
              </div>
              <button type="button" onClick={() => { setShowForgotPassword(false); setEmail(""); }} className="w-full text-[10px] font-black text-zinc-500 hover:text-white transition-colors flex items-center justify-center gap-2 uppercase tracking-[0.3em]">
                <ArrowLeft className="w-3 h-3" /> Return to Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-1">{isSignUp ? "Join Nexus" : "Establish Uplink"}</h1>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">{isSignUp ? "Register new neural node" : "Identify authorized signature"}</p>
      </div>

      <form onSubmit={handleAuth} className="space-y-6">
        <div className="space-y-5">
          <AnimatePresence mode="popLayout">
            {isSignUp && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-[10px] font-black text-zinc-500 ml-1 uppercase tracking-[0.2em]">Neural Identity *</Label>
                  <div className="relative group">
                    <Input id="fullName" type="text" placeholder="FULL LEGAL NAME" value={fullName} onChange={(e) => setFullName(e.target.value)} required={isSignUp} className="bg-white/[0.02] border-white/10 h-12 rounded-xl px-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all text-white placeholder:text-zinc-700 text-[11px] font-bold" />
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[10px] font-black text-zinc-500 ml-1 uppercase tracking-[0.2em]">Comms Channel</Label>
                  <div className="relative group">
                    <Input id="phone" type="tel" placeholder="+91 XXX XXX XXXX" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="bg-white/[0.02] border-white/10 h-12 rounded-xl px-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all text-white placeholder:text-zinc-700 text-[11px] font-bold" />
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[10px] font-black text-zinc-500 ml-1 uppercase tracking-[0.2em]">Uplink Address *</Label>
            <div className="relative group">
              <Input id="email" type="email" placeholder="SECURE@NODE.SYS" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white/[0.02] border-white/10 h-12 rounded-xl px-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all text-white placeholder:text-zinc-700 text-[11px] font-bold" />
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[10px] font-black text-zinc-500 ml-1 uppercase tracking-[0.2em]">Access Key *</Label>
            <div className="relative group">
              <Input id="password" type="password" value={password} placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} required className="bg-white/[0.02] border-white/10 h-12 rounded-xl px-4 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all text-white placeholder:text-zinc-700 text-[11px] font-bold" />
              <Fingerprint className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
            </div>
            {!isSignUp && (
              <div className="text-right">
                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-[0.2em]">
                  Recover Key?
                </button>
              </div>
            )}
            {isSignUp && (
              <div className="grid grid-cols-5 gap-1.5 mt-3 px-1">
                {[{ key: 'length', label: '8+' }, { key: 'upper', label: 'AZ' }, { key: 'lower', label: 'az' }, { key: 'number', label: '12' }, { key: 'symbol', label: '#$' }].map((rule) => (
                  <div key={rule.key} className="flex flex-col items-center gap-1">
                    <div className={`w-full h-1 rounded-full transition-colors ${(passwordValidation as any)[rule.key] ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/5'}`} />
                    <span className={`text-[8px] font-black tracking-tighter transition-colors ${(passwordValidation as any)[rule.key] ? 'text-emerald-500' : 'text-zinc-700'}`}>{rule.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isSignUp && (
            <div className="flex items-start gap-3 px-1 pt-1">
              <button type="button" onClick={() => setAcceptedTerms(!acceptedTerms)} className={`mt-0.5 w-4 h-4 rounded-lg border transition-all flex items-center justify-center shrink-0 ${acceptedTerms ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/10'}`}>
                {acceptedTerms && <ShieldCheck className="w-2.5 h-2.5 text-white" />}
              </button>
              <p className="text-[9px] text-zinc-600 font-bold leading-tight uppercase tracking-[0.1em]">By initiating registration, you agree to comply with all <span className="text-indigo-400">Security Protocols</span> and <span className="text-indigo-400">Network Terms</span>.</p>
            </div>
          )}
        </div>

        <div className="pt-4">
          <Button type="submit" className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-30 disabled:grayscale" disabled={loading || (isSignUp && (!acceptedTerms || !Object.values(passwordValidation).every(Boolean)))}>
            {loading ? (
              <div className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /><span>Syncing...</span></div>
            ) : (
              <div className="flex items-center justify-center gap-2"><span>{isSignUp ? "Request Node" : "Access Nexus"}</span><ChevronRight className="w-3 h-3" /></div>
            )}
          </Button>
        </div>

        <div className="flex flex-col items-center gap-4 pt-4">
          <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-[10px] font-black text-zinc-500 hover:text-white transition-colors uppercase tracking-[0.3em]">
            {isSignUp ? "Establish Existing Uplink" : "Request New Node Access"}
          </button>
        </div>
      </form>
    </div>
  );
}
