"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  MessageCircle, 
  Phone, 
  Video, 
  Shield, 
  Clock, 
  MapPin, 
  Calendar,
  User,
  Activity,
  Globe,
  Mail,
  Flame,
  Trophy,
  Zap,
  TrendingUp,
  ChevronRight,
  Loader2,
  Users,
  Sparkles,
  Heart,
  Star,
  ShieldAlert
} from "lucide-react";

interface UserStreak {
  id: string;
  partnerId: string;
  partnerProfile: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_data: any;
  };
  streak_count: number;
}

function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return "Offline";
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  
  if (diffMins < 1) return "Last seen just now";
  if (diffMins < 60) return `Last seen ${diffMins}m ago`;
  if (diffHours < 24 && date.getDate() === now.getDate()) return `Last seen today at ${timeStr}`;
  if (diffDays === 1 || (diffHours < 48 && date.getDate() === now.getDate() - 1)) return `Last seen yesterday at ${timeStr}`;
  
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `Last seen ${dateStr} at ${timeStr}`;
}

function formatJoinDate(date: string | null): string {
  if (!date) return "Unknown";
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [userStreaks, setUserStreaks] = useState<UserStreak[]>([]);
  const [totalStreak, setTotalStreak] = useState(0);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingStreaks, setLoadingStreaks] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        setIsOwnProfile(session.user.id === params.id);
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", params.id)
        .single();

      if (data) {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchData();
    fetchUserStreaks();
    fetchAllUsers();

    const presenceChannel = supabase.channel("profile-presence").on("presence", { event: "sync" }, () => {
      const state = presenceChannel.presenceState();
      let online = false;
      Object.values(state).forEach((users: any) => {
        users.forEach((u: any) => {
          if (u.user_id === params.id) online = true;
        });
      });
      setIsOnline(online);
    }).subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [params.id]);

  async function fetchUserStreaks() {
    try {
      const response = await fetch(`/api/streak/user?userId=${params.id}`);
      const data = await response.json();
      if (data.streaks) {
        setUserStreaks(data.streaks);
        setTotalStreak(data.totalStreak || 0);
      }
    } catch (error) {
      console.error("Failed to fetch streaks:", error);
    } finally {
      setLoadingStreaks(false);
    }
  }

  async function fetchAllUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_data, avatar_config, streak_count, total_streak_count, created_at")
      .neq("id", params.id as string)
      .order("total_streak_count", { ascending: false });
    if (data) setAllUsers(data);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#010101] overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-[150px] opacity-30 animate-pulse rounded-full" />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 border-t-2 border-r-2 border-indigo-500 rounded-full relative z-10"
          />
          <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="w-8 h-8 text-indigo-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#010101] text-white p-8">
        <div className="text-center space-y-12 max-w-sm">
          <div className="p-10 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-[3rem] backdrop-blur-3xl shadow-2xl relative">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Node Not Found</h1>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">The requested neural node could not be localized in the matrix.</p>
          </div>
          <Button onClick={() => router.back()} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white/10 transition-all">
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to Base
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#010101] text-white font-sans selection:bg-indigo-500/30">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[100vw] h-[100vw] bg-indigo-600/10 blur-[300px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[100vw] h-[100vw] bg-purple-600/10 blur-[300px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150 brightness-125" />
      </div>

      <header className="sticky top-0 z-50 bg-[#010101]/60 backdrop-blur-3xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 h-20 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group"
          >
            <ArrowLeft className="w-5 h-5 text-white/50 group-hover:text-white group-hover:-translate-x-1 transition-all" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 leading-none">Node Profile</span>
            <span className="text-xs font-black uppercase tracking-tighter text-indigo-400 mt-1.5">{profile.username}</span>
          </div>
          <div className="w-11" /> {/* Spacer */}
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-12 space-y-12 pb-32">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8"
        >
          <div className="relative inline-block">
            <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-3xl opacity-30 scale-125" 
            />
            <AvatarDisplay profile={profile} className="h-44 w-44 mx-auto relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-white/5" />
            <div className={`absolute bottom-4 right-4 w-8 h-8 rounded-full border-4 border-[#010101] z-20 ${isOnline ? 'bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.8)]' : 'bg-zinc-700 shadow-xl'}`} />
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">
              {profile.full_name || profile.username}
            </h1>
            <div className="flex items-center justify-center gap-3">
                <span className="text-indigo-400 text-sm font-black uppercase tracking-widest">@{profile.username}</span>
                <div className="w-1 h-1 bg-white/20 rounded-full" />
                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                    {isOnline ? 'Active' : formatLastSeen(profile.last_seen)}
                </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
              {[
                  { icon: Flame, value: profile.streak_count || 0, label: "Day Streak", color: "from-orange-500 to-red-500" },
                  { icon: Trophy, value: totalStreak, label: "Total Streaks", color: "from-purple-500 to-pink-500" },
                  { icon: Calendar, value: formatJoinDate(profile.created_at).split(',')[0], label: "Joined", color: "from-indigo-500 to-blue-500" }
              ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-5 min-w-[140px] relative overflow-hidden group transition-all"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                    <stat.icon className={`w-5 h-5 mx-auto mb-3 text-white/30 group-hover:text-white transition-colors`} />
                    <p className="text-2xl font-black uppercase tracking-tighter text-white">{stat.value}</p>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20 mt-1 group-hover:text-white/40 transition-colors">{stat.label}</p>
                  </motion.div>
              ))}
          </div>

          {!isOwnProfile && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            >
              <Button 
                onClick={() => router.push(`/?chat=${profile.id}`)}
                className="bg-indigo-600 hover:bg-indigo-500 h-16 px-10 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl shadow-indigo-500/40 border border-white/10 transition-all active:scale-95 group"
              >
                <MessageCircle className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                Establish Chat
              </Button>
              <div className="flex gap-4">
                  <Button 
                    variant="outline"
                    className="flex-1 sm:flex-none border-white/10 bg-white/[0.05] h-16 px-8 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Audio
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 sm:flex-none border-white/10 bg-white/[0.05] h-16 px-8 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Visual
                  </Button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* User Stats/Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/[0.02] border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-3xl space-y-6"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-400" />
                        Node Specs
                    </h2>
                </div>
                <div className="space-y-6">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                            <Shield className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Security Protocol</p>
                            <p className="text-xs font-black uppercase text-white mt-1">E2E Matrix v7.4</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                            <Activity className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Node Status</p>
                            <p className={`text-xs font-black uppercase mt-1 ${isOnline ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                {isOnline ? 'Synchronized' : 'Archived'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                            <Globe className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Global Reach</p>
                            <p className="text-xs font-black uppercase text-white mt-1">Authorized Node</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/[0.02] border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-3xl space-y-6"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-400" />
                        Active Streaks
                    </h2>
                    <span className="text-[9px] font-black uppercase text-orange-400/50 bg-orange-400/5 px-3 py-1 rounded-full border border-orange-400/10">{userStreaks.length} Pairs</span>
                </div>
                
                <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                    {loadingStreaks ? (
                        <div className="h-40 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                        </div>
                    ) : userStreaks.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-center px-4">
                            <Flame className="w-10 h-10 text-white/10 mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Zero active signals</p>
                        </div>
                    ) : (
                        userStreaks.map((streak) => (
                            <div 
                                key={streak.id}
                                onClick={() => router.push(`/profile/${streak.partnerId}`)}
                                className="flex items-center gap-4 p-3 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group"
                            >
                                <div className="relative">
                                    <AvatarDisplay profile={streak.partnerProfile} className="h-10 w-10" />
                                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-lg">
                                        <Flame className="w-2 h-2" />
                                        {streak.streak_count}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase truncate text-white/80 group-hover:text-white">{streak.partnerProfile?.full_name || streak.partnerProfile?.username}</p>
                                    <p className="text-[7px] font-black uppercase tracking-widest text-white/20">{streak.streak_count} day signal</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 transition-all" />
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </div>

        {/* Global Leaderboard Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Global Leaderboard
            </h2>
            <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20">
                <TrendingUp className="w-3 h-3 text-indigo-400" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">Live Matrix</span>
            </div>
          </div>
          
          <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] overflow-hidden backdrop-blur-3xl shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] via-transparent to-purple-500/[0.02] pointer-events-none" />
            
            {allUsers.length === 0 ? (
                <div className="p-16 text-center">
                    <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Scanning for neural nodes...</p>
                </div>
            ) : (
                <div className="divide-y divide-white/5">
                    {allUsers.map((user, index) => (
                        <motion.div 
                            key={user.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 + index * 0.05 }}
                            onClick={() => router.push(`/profile/${user.id}`)}
                            className="p-6 flex items-center gap-6 hover:bg-white/[0.05] transition-all cursor-pointer group"
                        >
                            <div className="w-10 flex justify-center shrink-0">
                                {index === 0 ? (
                                    <div className="p-2 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                                        <Trophy className="w-6 h-6 text-yellow-400" />
                                    </div>
                                ) : index === 1 ? (
                                    <div className="p-2 bg-zinc-400/10 rounded-2xl border border-zinc-400/20">
                                        <Trophy className="w-5 h-5 text-zinc-400" />
                                    </div>
                                ) : index === 2 ? (
                                    <div className="p-2 bg-orange-600/10 rounded-2xl border border-orange-600/20">
                                        <Trophy className="w-5 h-5 text-orange-600" />
                                    </div>
                                ) : (
                                    <span className="text-xs font-black text-white/20 tracking-tighter">#{index + 1}</span>
                                )}
                            </div>
                            
                            <div className="relative shrink-0">
                                <AvatarDisplay profile={user} className="h-14 w-14 border-2 border-white/5" />
                                {(user.total_streak_count || 0) > 0 && (
                                    <div className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[7px] font-black px-2 py-1 rounded-full flex items-center gap-0.5 shadow-lg border border-white/10">
                                        <Flame className="w-2.5 h-2.5" />
                                        {user.total_streak_count}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black uppercase truncate text-white group-hover:text-indigo-400 transition-colors">{user.full_name || user.username}</p>
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mt-1">@{user.username}</p>
                            </div>

                            <div className="text-right shrink-0">
                                <div className="flex items-center gap-2 text-white">
                                    <Zap className="w-4 h-4 text-indigo-400" />
                                    <span className="text-2xl font-black tabular-nums">{user.total_streak_count || 0}</span>
                                </div>
                                <p className="text-[7px] font-black uppercase tracking-[0.4em] text-white/20 mt-0.5">Total Signal</p>
                            </div>
                            
                            <ChevronRight className="w-5 h-5 text-white/5 group-hover:text-white/40 transition-all group-hover:translate-x-1" />
                        </motion.div>
                    ))}
                </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
