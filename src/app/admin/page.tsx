"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Lock, Mail, Eye, EyeOff, ArrowRight, Sparkles, Zap, Shield, Cpu, Terminal, Fingerprint, Activity, Network, ShieldAlert, X, Menu, Radio, Users, Settings2, MessageSquare, CheckCircle, ShieldCheck, Database, Globe, Search, Ban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Switch } from "@/components/ui/switch";
import { AdminPanel } from "@/components/AdminControl";

const DigitalRain = () => {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-[0.03] pointer-events-none">
      <div className="flex justify-around w-full">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -100 }}
            animate={{ y: '100vh' }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5
            }}
            className="text-[10px] font-mono leading-none flex flex-col gap-2"
          >
            {Array.from({ length: 50 }).map((_, j) => (
              <span key={j}>{Math.random() > 0.5 ? '1' : '0'}</span>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [systemConfig, setSystemConfig] = useState<any>({});
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    symbol: false
  });
  const router = useRouter();

  useEffect(() => {
    fetchSystemConfig();
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Auth session error:", error);
        supabase.auth.signOut().then(() => {
          setLoading(false);
        });
        return;
      }
      setSession(session);
      if (session) checkAdminStatus(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkAdminStatus(session.user.id);
      else {
        setIsAdmin(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchSystemConfig() {
    const { data } = await supabase.from("system_config").select("*");
    if (data) {
      const config = data.reduce((acc: any, item: any) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
      setSystemConfig(config);
    }
  }

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

  async function checkAdminStatus(userId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (error || !data?.is_admin) {
      setIsAdmin(false);
    } else {
      setIsAdmin(true);
    }
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email === 'admin' ? 'admin@orchids.dev' : email,
        password,
      });

      if (error) {
        setAuthError(error.message === "Invalid login credentials" ? "Access Denied: Invalid Authorization ID or Encryption Key." : error.message);
      } else {
        toast.success("Security bypass successful. Access granted.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication system failure.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: email.split('@')[0],
            is_admin: false
          }
        }
      });

      if (error) {
        setAuthError(error.message);
      } else if (data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          username: email.split('@')[0],
          is_admin: false,
          is_approved: false,
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        toast.success("Identity established. Access request submitted to Command Core.");
        setIsSignUp(false);
      }
    } catch (err: any) {
      setAuthError(err.message || "Protocol failure during node initialization.");
    } finally {
      setIsLoggingIn(false);
    }
  }


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505] flex-col gap-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500/5 blur-[150px] rounded-full animate-pulse" />
        <div className="relative">
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-32 h-32 border-t-2 border-r-2 border-indigo-500 rounded-full shadow-[0_0_80px_rgba(79,70,229,0.3)]"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-10 h-10 text-indigo-400 animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-6">
          <h2 className="text-3xl font-black italic tracking-tighter text-white group-hover:text-indigo-400 transition-colors">Verifying Identity</h2>
          <div className="flex items-center justify-center gap-4">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
            <p className="text-[11px] font-black tracking-[0.6em] text-white/20">Handshaking with Secure Core</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505] overflow-hidden relative selection:bg-indigo-500/30">
        <div className="absolute inset-0 z-[100] pointer-events-none overflow-hidden opacity-[0.03]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[100] bg-[length:100%_2px,3px_100%]" />
        </div>

        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        </div>

        <DigitalRain />

        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, 0],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute -top-[10%] -left-[5%] w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, -5, 0],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 25, repeat: Infinity, delay: 2 }}
            className="absolute -bottom-[10%] -right-[5%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full" 
          />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] brightness-125 mix-blend-overlay" />
        </div>

        <div className="absolute inset-0 pointer-events-none opacity-20">
            <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-[15%] left-[10%]">
              <Terminal className="w-6 h-6 text-indigo-500/40" />
            </motion.div>
            <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute bottom-[20%] left-[15%]">
              <Shield className="w-8 h-8 text-blue-500/40" />
            </motion.div>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-[25%] right-[12%]">
              <Cpu className="w-10 h-10 text-indigo-400/30" />
            </motion.div>
            <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-[15%] right-[20%]">
              <Zap className="w-6 h-6 text-yellow-500/20" />
            </motion.div>
            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-[40%] right-[5%]">
              <Network className="w-5 h-5 text-indigo-500/30" />
            </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 20 }}
          className="w-full max-w-[min(90vw,32rem)] relative z-10 p-2 sm:p-4 md:p-10"
        >
          <div className="bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] md:rounded-[4rem] p-6 sm:p-8 md:p-16 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-16 h-16 md:w-20 md:h-20 border-t-2 border-l-2 border-indigo-500/30 rounded-tl-[2.5rem] md:rounded-tl-[4rem] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-16 h-16 md:w-20 md:h-20 border-b-2 border-r-2 border-indigo-500/30 rounded-br-[2.5rem] md:rounded-br-[4rem] pointer-events-none" />
            <div className="absolute inset-0 bg-indigo-500/[0.02] pointer-events-none" />
            
            <div className="text-center space-y-4 md:space-y-6 relative z-10">
              {systemConfig.firewall_status === 'true' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-2xl py-2 md:py-3 px-4 md:px-6 mb-4 md:mb-6 flex items-center justify-center gap-3"
                >
                  <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
                  <p className="text-[9px] md:text-[10px] font-black text-red-500 tracking-[0.2em]">
                    Global Firewall Active
                  </p>
                </motion.div>
              )}
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="mx-auto w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl md:rounded-[2rem] flex items-center justify-center mb-6 md:mb-8 border border-white/20 shadow-[0_0_50px_rgba(79,70,229,0.4)] relative"
              >
                <Fingerprint className="w-8 h-8 md:w-12 md:h-12 text-white" />
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-2 border-white/10 border-t-white/40 rounded-2xl md:rounded-[2rem]"
                />
              </motion.div>
              <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white">
                {isSignUp ? 'Register' : 'Admin'} <span className="text-indigo-500">Node</span>
              </h1>
              <div className="flex items-center justify-center gap-4">
                 <div className="h-px w-6 md:w-8 bg-white/10" />
                 <p className="text-[9px] md:text-[11px] font-bold tracking-widest text-white/30">
                   {isSignUp ? 'Establish New Identity' : 'Protocol Authentication Required'}
                 </p>
                 <div className="h-px w-6 md:w-8 bg-white/10" />
              </div>
            </div>

            <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-6 md:space-y-8 mt-8 md:mt-12 relative z-10">
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                  }
                }}
                className="space-y-4 md:space-y-5"
              >
                <motion.div variants={{ hidden: { x: -20, opacity: 0 }, visible: { x: 0, opacity: 1 } }} className="relative group">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
                  <div className="relative bg-white/[0.03] border border-white/10 focus-within:border-indigo-500/50 rounded-2xl md:rounded-[2rem] transition-all overflow-hidden">
                    <Mail className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type="email"
                      placeholder="Authorization ID"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent py-5 md:py-7 pl-12 md:pl-16 pr-5 md:pr-6 outline-none text-xs md:text-sm font-medium text-white placeholder:text-white/20 transition-all"
                      style={{ textTransform: 'none' }}
                      required
                    />
                  </div>
                </motion.div>

                <motion.div variants={{ hidden: { x: -20, opacity: 0 }, visible: { x: 0, opacity: 1 } }} className="relative group">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
                  <div className="relative bg-white/[0.03] border border-white/10 focus-within:border-indigo-500/50 rounded-2xl md:rounded-[2rem] transition-all overflow-hidden">
                    <Lock className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Encryption Key"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent py-5 md:py-7 pl-12 md:pl-16 pr-12 md:pr-16 outline-none text-xs md:text-sm font-medium text-white placeholder:text-white/20 transition-all"
                      style={{ textTransform: 'none' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 md:right-6 top-1/2 -translate-y-1/2 text-white/10 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5 md:w-6 md:h-6" /> : <Eye className="w-5 h-5 md:w-6 md:h-6" />}
                    </button>
                  </div>
                </motion.div>
              </motion.div>

              <div className="grid grid-cols-2 gap-2 md:gap-3 px-2 md:px-4">
                {[
                  { key: 'length', label: '8+ Chars' },
                  { key: 'upper', label: 'Upper' },
                  { key: 'lower', label: 'Lower' },
                  { key: 'number', label: 'Num' },
                  { key: 'symbol', label: 'Sym' }
                ].map((rule) => (
                  <div key={rule.key} className="flex items-center gap-1.5 md:gap-2">
                    <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full transition-colors ${(passwordValidation as any)[rule.key] ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                    <span className={`text-[7px] md:text-[8px] font-black tracking-widest transition-colors ${(passwordValidation as any)[rule.key] ? 'text-emerald-500' : 'text-white/20'}`}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-3 md:gap-4 px-2 md:px-4">
                <button 
                  type="button"
                  onClick={() => setAcceptedTerms(!acceptedTerms)}
                  className={`mt-0.5 w-4 h-4 md:w-5 md:h-5 rounded-md border transition-all flex items-center justify-center ${acceptedTerms ? 'bg-indigo-600 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-white/5 border-white/10'}`}
                >
                  {acceptedTerms && <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 text-white fill-white" />}
                </button>
                <p className="text-[8px] md:text-[9px] text-white/30 font-bold tracking-widest leading-relaxed">
                  I acknowledge the <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer">Security Protocols</span> and agree to the <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer">Access Terms</span>.
                </p>
              </div>

              <AnimatePresence>
                {authError && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 md:p-6 text-red-500 text-[9px] md:text-[10px] font-black text-center tracking-[0.2em] md:tracking-[0.3em] shadow-lg shadow-red-500/5"
                  >
                    Auth Failure: {authError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3 md:space-y-4">
                <button
                  type="submit"
                  disabled={isLoggingIn || !acceptedTerms || (isSignUp && !Object.values(passwordValidation).every(Boolean))}
                  className="w-full relative group overflow-hidden bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed text-white rounded-2xl md:rounded-[2rem] py-5 md:py-7 font-bold tracking-widest text-[10px] md:text-[11px] transition-all shadow-[0_0_50px_rgba(79,70,229,0.4)] active:scale-[0.98]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3 md:gap-4">
                    {isLoggingIn ? (
                      <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                    ) : (
                      <>
                        {isSignUp ? 'Create Node' : 'Bypass Security'}
                        <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-2 transition-transform" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform" />
                </button>


                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="w-full text-[9px] md:text-[10px] font-bold tracking-widest text-white/20 hover:text-white transition-colors py-2"
                >
                  {isSignUp ? 'Back to Login' : 'Register New Node'}
                </button>
              </div>
            </form>

            <div className="mt-8 md:mt-16 flex items-center justify-center gap-4 md:gap-6 opacity-30">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-white" />
              <p className="text-[8px] md:text-[10px] text-white tracking-[0.4em] md:tracking-[0.8em] font-black">
                End-To-End Secure
              </p>
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </div>
          </div>
        </motion.div>

      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#050505] p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-red-500/5 blur-[150px] rounded-full animate-pulse" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 space-y-12 max-w-md"
        >
          <div className="p-16 bg-red-500/10 rounded-[4rem] border border-red-500/20 shadow-[0_0_80px_rgba(239,68,68,0.1)] inline-block">
            <AlertTriangle className="w-24 h-24 text-red-500" />
          </div>
          <div className="space-y-6">
            <h2 className="text-6xl font-black italic text-white tracking-tighter">Access Denied</h2>
            <p className="text-white/40 font-bold tracking-widest leading-relaxed text-[11px]">System clearance levels insufficient. Your node has been flagged for unauthorized access attempt.</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-black tracking-[0.4em] text-[10px] py-7 rounded-[2rem] border border-white/10 transition-all shadow-xl"
          >
            Switch Terminal (Sign Out)
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <AdminPanel onClose={() => router.push("/")} />
    </div>
  );
}
