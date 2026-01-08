"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Auth } from "@/components/Auth";
import { UserDashboardView } from "@/components/UserDashboardView";
import { OTPVerification } from "@/components/OTPVerification";
import { Lock, Shield, Zap, Globe, MessageSquare, Phone, MapPin, Video as VideoIcon, Terminal, Cpu, Radio, Activity, Sparkles, Fingerprint, Flame, Users, Star, Heart, ArrowRight, ShieldAlert, Network, Box } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateKeyPair, exportPublicKey, exportPrivateKey, importPrivateKey } from "@/lib/crypto";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

import { PasswordGate } from "@/components/PasswordGate";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ScreenProtection } from "@/components/ScreenProtection";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  
  const { isSupported: pushSupported, permission: pushPermission, requestPermission: requestPushPermission, subscription: pushSubscription } = usePushNotifications(session?.user?.id || null);

  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase.channel("online-users");
    
    const updateLastSeen = () => {
      if (!session?.user?.id) return;
      
      const data = JSON.stringify({ userId: session.user.id });
      const blob = new Blob([data], { type: 'application/json' });
      
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/last-seen', blob);
      } else {
        fetch('/api/last-seen', {
          method: 'POST',
          body: data,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true
        }).catch(() => {});
      }
    };

    const trackPresence = async () => {
      if (document.visibilityState !== "visible") return;
      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: session.user.id,
            online_at: new Date().toISOString(),
          });
        }
      });
    };

    if (document.visibilityState === "visible") {
      trackPresence();
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        channel.track({
          user_id: session.user.id,
          online_at: new Date().toISOString(),
        });
      } else {
        updateLastSeen();
        channel.untrack();
      }
    };

    const handleBeforeUnload = () => {
      updateLastSeen();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      updateLastSeen();
      channel.unsubscribe();
    };
  }, [session]);

  useEffect(() => {
    const unlocked = sessionStorage.getItem("app_unlocked") === "true";
    setIsAppUnlocked(unlocked);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkApprovalAndOTP(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkApprovalAndOTP(session.user.id);
      } else {
        setIsApproved(null);
        setOtpRequired(false);
        setOtpVerified(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkApprovalAndOTP(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_approved, otp_enabled")
      .eq("id", userId)
      .single();
    
    if (data) {
      setIsApproved(data.is_approved === null ? false : data.is_approved);
      if (data.otp_enabled && data.is_approved !== false) {
        setOtpRequired(true);
        const sessionOtpVerified = sessionStorage.getItem(`otp_verified_${userId}`);
        if (sessionOtpVerified === 'true') {
          setOtpVerified(true);
        }
      }
    } else {
      setIsApproved(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (session?.user && isApproved && (!otpRequired || otpVerified)) {
      handleKeySetup();
      if (pushSupported && pushPermission === "default" && !pushSubscription) {
        setTimeout(() => {
          requestPushPermission().then((granted) => {
            if (granted) {
              toast.success("Notifications enabled");
            }
          });
        }, 2000);
      }
    }
  }, [session, isApproved, otpRequired, otpVerified, pushSupported, pushPermission, pushSubscription]);

  const [keyError, setKeyError] = useState(false);

  async function handleKeySetup() {
    try {
      const storedPrivKey = localStorage.getItem(`priv_key_${session.user.id}`);
      if (storedPrivKey && storedPrivKey !== "undefined" && storedPrivKey !== "null") {
        try {
          const key = await importPrivateKey(storedPrivKey);
          setPrivateKey(key);
          setKeyError(false);
        } catch (e) {
          console.error("Failed to import stored key, generating new one", e);
          await generateAndStoreNewKey();
        }
      } else {
        await generateAndStoreNewKey();
      }
    } catch (error) {
      console.error("Key setup failed:", error);
      setKeyError(true);
      toast.error("Encryption key not found. Please refresh or regenerate.");
    }
  }

  async function generateAndStoreNewKey() {
    const keyPair = await generateKeyPair();
    const pubKeyBase64 = await exportPublicKey(keyPair.publicKey);
    const privKeyBase64 = await exportPrivateKey(keyPair.privateKey);
    
    localStorage.setItem(`priv_key_${session.user.id}`, privKeyBase64);
    setPrivateKey(keyPair.privateKey);

    await supabase.from("profiles").upsert({
      id: session.user.id,
      public_key: pubKeyBase64,
      username: session.user.email?.split("@")[0],
      updated_at: new Date().toISOString(),
    });
  }

  function handleOtpVerified() {
    sessionStorage.setItem(`otp_verified_${session.user.id}`, 'true');
    setOtpVerified(true);
  }

  function handleOtpSkip() {
    sessionStorage.setItem(`otp_verified_${session.user.id}`, 'true');
    setOtpVerified(true);
  }

  const handleAppUnlock = () => {
    sessionStorage.setItem("app_unlocked", "true");
    setIsAppUnlocked(true);
  };

  if (!isAppUnlocked) {
    return (
      <PasswordGate 
        correctPassword="162008" 
        onUnlock={handleAppUnlock}
        title="Chatify"
        subtitle="System Lock"
        description="Authorization required to initialize kernel sequence."
      />
    );
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#010101] overflow-hidden">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-[150px] opacity-30 animate-pulse rounded-full" />
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-32 h-32 border-t-2 border-r-2 border-indigo-500 rounded-full relative z-10"
        />
        <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-10 h-10 text-indigo-500 animate-pulse" />
        </div>
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-48 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30">Initializing Uplink</p>
        </div>
      </div>
    </div>
  );

  if (session && isApproved === false) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#010101] p-8 text-center relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-red-900/15 blur-[200px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] right-[-20%] w-[60%] h-[60%] bg-orange-900/10 blur-[200px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] brightness-150 contrast-200 pointer-events-none" />

        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="z-10 space-y-12 max-w-lg"
          >
          <div className="flex justify-center">
            <div className="p-10 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-[3rem] backdrop-blur-3xl shadow-2xl relative group">
              <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <Lock className="w-16 h-16 text-red-500 relative" />
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-5xl font-black italic tracking-tighter text-white uppercase">Access <span className="text-red-500">Denied</span></h2>
            <p className="text-zinc-500 font-medium leading-relaxed tracking-widest text-xs uppercase">
              System protocols require administrative clearance. Your identity is currently under manual verification.
            </p>
          </div>

          <div className="pt-8">
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-12 py-4 rounded-2xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 text-red-400 font-black text-[10px] uppercase tracking-[0.4em] hover:text-white hover:from-red-500/20 hover:to-orange-500/20 transition-all active:scale-95"
            >
              Terminate Uplink
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (session && otpRequired && !otpVerified) {
    return (
      <OTPVerification
        userId={session.user.id}
        userEmail={session.user.email || ""}
        onVerified={handleOtpVerified}
        onSkip={handleOtpSkip}
      />
    );
  }

  return (
    <ScreenProtection>
      <main className="min-h-[100dvh] bg-[#010101] text-foreground overflow-hidden relative selection:bg-indigo-500/30">
        <InstallPrompt />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-20%] w-[100vw] h-[100vw] bg-indigo-600/10 blur-[300px] rounded-full" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[100vw] h-[100vw] bg-purple-600/10 blur-[300px] rounded-full" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150 brightness-125" />
        </div>

      <AnimatePresence mode="wait">
        {!session ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -40 }}
            className="relative z-10 min-h-screen flex flex-col lg:flex-row"
          >
            {/* Left Section: Visual & Branding */}
            <div className="hidden lg:flex w-1/2 flex-col justify-between p-16 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-transparent to-purple-950/20" />
                
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-5 z-10"
                >
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl">
                        <Shield className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-none">Chatify <span className="text-indigo-500">v2</span></h1>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Secure Uplink Established</span>
                        </div>
                    </div>
                </motion.div>

                <div className="z-10 space-y-10">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2 className="text-8xl font-black italic tracking-[ -0.05em] uppercase text-white leading-[0.8]">
                            SECURE <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">SIGNALS</span>
                        </h2>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-start gap-6 max-w-xl"
                    >
                        <div className="w-1.5 h-20 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full shrink-0" />
                        <p className="text-lg text-zinc-400 font-medium leading-relaxed uppercase tracking-wider">
                            Distributed neural communications with quantum-safe encryption matrix. Protocol 7 active. Secure nodes engaged.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-3 gap-6">
                        {[
                            { icon: MessageSquare, label: "E2E Signals", desc: "Military Grade", color: "from-indigo-500 to-blue-500" },
                            { icon: Flame, label: "Daily Streaks", desc: "Engagement", color: "from-orange-500 to-red-500" },
                            { icon: Fingerprint, label: "Vault 2.0", desc: "Biometric ID", color: "from-purple-500 to-pink-500" }
                        ].map((feature, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 + i * 0.1 }}
                                className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl hover:bg-white/[0.06] hover:border-white/10 transition-all duration-500 group"
                            >
                                <div className={`p-3.5 bg-gradient-to-br ${feature.color} rounded-2xl w-fit mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                                    <feature.icon className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white mb-1">{feature.label}</h3>
                                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-8 z-10">
                    <div className="flex -space-x-3">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="w-12 h-12 rounded-full border-4 border-[#010101] bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-black text-white shadow-2xl">
                                {String.fromCharCode(64 + i)}
                            </div>
                        ))}
                        <div className="w-12 h-12 rounded-full border-4 border-[#010101] bg-white/5 backdrop-blur-xl flex items-center justify-center text-[10px] font-black text-white shadow-2xl">
                            +12k
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div>
                        <p className="text-white font-black text-lg leading-none uppercase tracking-tighter">Nodes Online</p>
                        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-emerald-500 mt-1">Status: Stable</p>
                    </div>
                </div>
            </div>

            {/* Right Section: Auth Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative">
                {/* Mobile Header */}
                <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-black italic tracking-tighter uppercase text-white">Chatify</h1>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-[480px] relative"
                >
                    <div className="absolute -inset-10 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 blur-[100px] rounded-full pointer-events-none" />
                    
                    <div className="bg-white/[0.02] border border-white/10 p-10 md:p-14 rounded-[3.5rem] backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.6)] relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        
                        <div className="mb-10 flex justify-center lg:hidden">
                            <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white leading-none text-center">
                                NEXUS <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">PROTOCOL</span>
                            </h2>
                        </div>

                        <Auth />

                        <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">E2E Matrix 7</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Network className="w-4 h-4 text-indigo-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Node Verified</span>
                            </div>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <motion.div 
                        animate={{ y: [0, -20, 0] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-12 -right-12 p-6 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[2.5rem] shadow-2xl border border-white/10 z-20 hidden md:block"
                    >
                        <Zap className="w-8 h-8 text-white" />
                    </motion.div>
                    
                    <motion.div 
                        animate={{ y: [0, 20, 0] }}
                        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute -bottom-12 -left-12 p-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-[2.5rem] shadow-2xl border border-white/10 z-20 hidden md:block"
                    >
                        <Box className="w-8 h-8 text-white" />
                    </motion.div>
                </motion.div>

                {/* Footer Comms */}
                <div className="mt-16 flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-20 hover:opacity-100 transition-all duration-1000">
                    <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-white" />
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white">Global Matrix</span>
                    </div>
                    <div className="w-1 h-1 bg-white/20 rounded-full" />
                    <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white">Uplink Stable</span>
                    </div>
                    <div className="w-1 h-1 bg-white/20 rounded-full" />
                    <div className="flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-orange-400" />
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white">Kernel v2.0.4</span>
                    </div>
                </div>
            </div>
          </motion.div>
        ) : (
          privateKey && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                className="h-full"
              >
                <UserDashboardView session={session} privateKey={privateKey} />
              </motion.div>
            )
        )}
      </AnimatePresence>
      </main>
    </ScreenProtection>
  );
}
