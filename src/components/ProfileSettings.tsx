"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  User, Shield, Moon, Sun, Monitor, Trash2, LogOut, MapPin, 
  Ghost, Sparkles, Key, CheckCircle, XCircle, Loader2, X,
  Calendar, Activity, Flame, Edit3, Camera, ArrowLeft, Save, Users, Trophy, Zap, TrendingUp, ChevronRight
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AvatarDisplay } from "./AvatarDisplay";
import { AvatarBuilder } from "./AvatarBuilder";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

function formatJoinDate(date: string | null): string {
  if (!date) return "Unknown";
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

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

export function ProfileSettings({ profile, onUpdate, onClose }: { profile: any; onUpdate: () => void; onClose: () => void }) {
  const router = useRouter();
  const [username, setUsername] = useState(profile.username || "");
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [birthdate, setBirthdate] = useState(profile.birthdate || "");
  const [wallpaperUrl, setWallpaperUrl] = useState(profile.wallpaper_url || "");
  const { theme, setTheme } = useTheme();
  const [countdownEnd, setCountdownEnd] = useState(profile.countdown_end || "");
  const [locationEnabled, setLocationEnabled] = useState(profile.location_enabled || false);
  const [ghostMode, setGhostMode] = useState(profile.ghost_mode || false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordReason, setPasswordReason] = useState("");
  const [blockedProfiles, setBlockedProfiles] = useState<any[]>([]);
  const [showAvatarBuilder, setShowAvatarBuilder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordRequest, setPasswordRequest] = useState<any>(null);
  const [requestingPassword, setRequestingPassword] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [userStreaks, setUserStreaks] = useState<UserStreak[]>([]);
  const [totalStreak, setTotalStreak] = useState(0);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingStreaks, setLoadingStreaks] = useState(true);

  useEffect(() => {
    fetchBlockedProfiles();
    fetchPasswordRequest();
    fetchUserStreaks();
    fetchAllUsers();
  }, []);

  async function fetchBlockedProfiles() {
    const { data: blockedIds } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", profile.id);
    
    if (blockedIds && blockedIds.length > 0) {
      const ids = blockedIds.map(b => b.blocked_id);
      const { data } = await supabase.from("profiles").select("*").in("id", ids);
      setBlockedProfiles(data || []);
    }
  }

  async function fetchUserStreaks() {
    try {
      const response = await fetch(`/api/streak/user?userId=${profile.id}`);
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
      .select("id, username, full_name, avatar_data, streak_count, total_streak_count, created_at")
      .neq("id", profile.id)
      .order("total_streak_count", { ascending: false });
    if (data) setAllUsers(data);
  }

  async function unblockUser(id: string) {
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", profile.id)
      .eq("blocked_id", id);
    if (!error) {
      toast.success("User unblocked");
      fetchBlockedProfiles();
    }
  }

  async function fetchPasswordRequest() {
    const { data } = await supabase
      .from("password_change_requests")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (data) setPasswordRequest(data);
  }

  async function handlePasswordChangeRequest() {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setRequestingPassword(true);
    try {
      const { error: deleteError } = await supabase
        .from("password_change_requests")
        .delete()
        .eq("user_id", profile.id)
        .eq("status", "pending");

      const { error } = await supabase.from("password_change_requests").insert({
        user_id: profile.id,
        new_password_hash: newPassword,
        reason: passwordReason || "User requested password change",
        status: "pending"
      });

      if (error) throw error;
      
      toast.success("Password change request submitted! Waiting for admin approval.");
      setNewPassword("");
      setPasswordReason("");
      fetchPasswordRequest();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setRequestingPassword(false);
    }
  }

  async function cancelPasswordRequest() {
    const { error } = await supabase
      .from("password_change_requests")
      .delete()
      .eq("id", passwordRequest.id);
    
    if (!error) {
      toast.success("Password request cancelled");
      setPasswordRequest(null);
    }
  }

  async function handleUpdate() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          full_name: fullName,
          bio,
          birthdate,
          wallpaper_url: wallpaperUrl,
          theme,
          countdown_end: countdownEnd || null,
          location_enabled: locationEnabled,
          ghost_mode: ghostMode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;
      toast.success("Identity updated");
      setEditMode(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteData() {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("messages").delete().eq("sender_id", profile.id);
      if (error) throw error;
      toast.success("All data purged");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProfile() {
    if (!confirm("Permanently delete account?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="h-full overflow-y-auto custom-scrollbar">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-600/10 blur-[250px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[1000px] h-[1000px] bg-purple-600/5 blur-[250px] rounded-full" />
        </div>

        <header className="sticky top-0 z-50 bg-[#030303]/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="text-white/50 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="text-xs font-black uppercase tracking-widest">Back</span>
            </Button>
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setEditMode(false)}
                    className="text-white/50 hover:text-white text-xs font-black uppercase tracking-widest"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdate}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-xs font-black uppercase tracking-widest"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save</>}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setEditMode(true)}
                  className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white text-xs font-black uppercase tracking-widest"
                >
                  <Edit3 className="w-4 h-4 mr-2" /> Edit
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-2xl mx-auto px-6 py-8 space-y-8 pb-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="relative inline-block group">
              <AvatarDisplay profile={profile} className="h-32 w-32 mx-auto border-4 border-indigo-500/30 shadow-2xl" />
              <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full border-4 border-[#030303] bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              {editMode && (
                <button
                  onClick={() => setShowAvatarBuilder(true)}
                  className="absolute -bottom-2 -right-2 bg-indigo-600 p-3 rounded-full border-4 border-[#030303] shadow-xl text-white hover:scale-110 transition-all"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {editMode ? (
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Display Name"
                  className="text-center text-2xl font-black italic uppercase tracking-tight bg-transparent border-white/10 h-14"
                />
              ) : (
                <h1 className="text-3xl font-black italic uppercase tracking-tight">
                  {profile.full_name || profile.username}
                </h1>
              )}
              {editMode ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-white/40">@</span>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-auto text-center text-sm font-bold bg-transparent border-white/10"
                  />
                </div>
              ) : (
                <p className="text-white/40 text-sm font-bold">@{profile.username}</p>
              )}
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400">
              <Activity className="w-3 h-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">Online Now</span>
            </div>

            <div className="flex justify-center gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-orange-400">
                  <Flame className="w-5 h-5" />
                  <span className="text-2xl font-black">{profile.streak_count || 0}</span>
                </div>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mt-1">Day Streak</p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-purple-400">
                  <Trophy className="w-5 h-5" />
                  <span className="text-2xl font-black">{totalStreak}</span>
                </div>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mt-1">Total Streaks</p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-indigo-400">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm font-black">{formatJoinDate(profile.created_at)}</span>
                </div>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mt-1">Joined</p>
              </div>
            </div>

            {editMode ? (
              <Input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the world about yourself..."
                className="text-center text-white/60 text-sm bg-transparent border-white/10"
              />
            ) : profile.bio && (
              <p className="text-white/60 text-sm max-w-md mx-auto leading-relaxed">
                {profile.bio}
              </p>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 px-2">Profile Details</h2>
            
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
              <div className="p-5 flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-xl">
                  <User className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Username</p>
                  <p className="text-sm font-bold mt-1">@{profile.username}</p>
                </div>
              </div>

              {profile.full_name && (
                <div className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <User className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Full Name</p>
                    <p className="text-sm font-bold mt-1">{profile.full_name}</p>
                  </div>
                </div>
              )}

              <div className="p-5 flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Current Streak</p>
                  <p className="text-sm font-bold mt-1 text-orange-400">{profile.streak_count || 0} Days</p>
                </div>
              </div>

              <div className="p-5 flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Status</p>
                  <p className="text-sm font-bold mt-1 text-emerald-400">Online</p>
                </div>
              </div>

              <div className="p-5 flex items-center gap-4">
                <div className="p-3 bg-pink-500/10 rounded-xl">
                  <Calendar className="w-5 h-5 text-pink-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Joined</p>
                  <p className="text-sm font-bold mt-1">{formatJoinDate(profile.created_at)}</p>
                </div>
              </div>

              <div className="p-5 flex items-center gap-4">
                <div className="p-3 bg-cyan-500/10 rounded-xl">
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Encryption</p>
                  <p className="text-sm font-bold mt-1 text-cyan-400">End-to-End Encrypted</p>
                </div>
              </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-4"
            >
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 px-2">Your Streaks</h2>
              
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
                {loadingStreaks ? (
                  <div className="p-8 flex justify-center">
                    <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                  </div>
                ) : userStreaks.length === 0 ? (
                  <div className="p-8 text-center">
                    <Flame className="w-10 h-10 text-white/10 mx-auto mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">No active streaks yet</p>
                    <p className="text-[8px] text-white/20 mt-1">Start chatting daily to build streaks!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {userStreaks.map((streak) => (
                      <div 
                        key={streak.id} 
                        className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => router.push(`/profile/${streak.partnerId}`)}
                      >
                        <div className="relative">
                          <AvatarDisplay profile={streak.partnerProfile} className="h-12 w-12" />
                          <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-lg">
                            <Flame className="w-2.5 h-2.5" />
                            {streak.streak_count}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black uppercase truncate">{streak.partnerProfile?.full_name || streak.partnerProfile?.username}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-orange-400/60">
                            {streak.streak_count} day streak
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/30">All Users Streaks</h2>
                <div className="flex items-center gap-1 text-orange-400">
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Leaderboard</span>
                </div>
              </div>
              
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
                {allUsers.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">No other users yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {allUsers.map((user, index) => (
                      <div 
                        key={user.id} 
                        className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => router.push(`/profile/${user.id}`)}
                      >
                        <div className="w-6 flex justify-center">
                          {index === 0 ? (
                            <Trophy className="w-5 h-5 text-yellow-400" />
                          ) : index === 1 ? (
                            <Trophy className="w-4 h-4 text-zinc-400" />
                          ) : index === 2 ? (
                            <Trophy className="w-4 h-4 text-orange-600" />
                          ) : (
                            <span className="text-[10px] font-black text-white/30">#{index + 1}</span>
                          )}
                        </div>
                        <div className="relative">
                          <AvatarDisplay profile={user} className="h-10 w-10" />
                          {(user.total_streak_count || 0) > 0 && (
                            <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[6px] font-black px-1 py-0.5 rounded-full flex items-center gap-0.5">
                              <Flame className="w-2 h-2" />
                              {user.total_streak_count}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black uppercase truncate">{user.full_name || user.username}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">
                            @{user.username}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-orange-400">
                            <Zap className="w-3 h-3" />
                            <span className="text-sm font-black">{user.total_streak_count || 0}</span>
                          </div>
                          <p className="text-[6px] font-black uppercase tracking-widest text-white/20">Total</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 px-2">Appearance</h2>
            
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
              <div className="p-5 flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-xl">
                  {theme === 'dark' ? <Moon className="w-5 h-5 text-yellow-400" /> : theme === 'light' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Monitor className="w-5 h-5 text-yellow-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Theme Mode</p>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="bg-transparent border-0 h-8 p-0 text-sm font-bold focus:ring-0 w-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0a] border-white/10 rounded-2xl">
                      <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="w-4 h-4" /> Light</div></SelectItem>
                      <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="w-4 h-4" /> Dark</div></SelectItem>
                      <SelectItem value="system"><div className="flex items-center gap-2"><Monitor className="w-4 h-4" /> System</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editMode && (
                <div className="p-5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1 mb-2 block">Chat Wallpaper URL</Label>
                  <Input 
                    placeholder="https://example.com/image.jpg"
                    value={wallpaperUrl} 
                    onChange={(e) => setWallpaperUrl(e.target.value)}
                    className="bg-white/[0.03] border-white/5 h-12 rounded-2xl focus:ring-indigo-500/30 text-white placeholder:text-white/10"
                  />
                </div>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 px-2">Privacy & Security</h2>
            
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-xl">
                    <MapPin className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white uppercase">Broadcast Location</p>
                    <p className="text-[8px] text-white/30 font-black uppercase tracking-widest mt-0.5">Share live presence</p>
                  </div>
                </div>
                <Switch checked={locationEnabled} onCheckedChange={setLocationEnabled} />
              </div>

              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <Ghost className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white uppercase">Ghost Mode</p>
                    <p className="text-[8px] text-white/30 font-black uppercase tracking-widest mt-0.5">Stay invisible</p>
                  </div>
                </div>
                <Switch checked={ghostMode} onCheckedChange={setGhostMode} />
              </div>

              <div 
                className="p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setActiveSection(activeSection === 'password' ? null : 'password')}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-500/10 rounded-xl">
                    <Key className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-white uppercase">Change Password</p>
                    <p className="text-[8px] text-white/30 font-black uppercase tracking-widest mt-0.5">Requires admin approval</p>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {activeSection === 'password' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 bg-white/[0.01] space-y-3">
                      {passwordRequest?.status === 'pending' ? (
                        <div className="p-5 bg-orange-500/10 border border-orange-500/20 rounded-2xl space-y-3">
                          <div className="flex items-center gap-3">
                            <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                            <div>
                              <p className="text-xs font-black text-orange-400 uppercase">Request Pending</p>
                              <p className="text-[9px] text-orange-400/60 font-bold uppercase tracking-widest">Awaiting admin approval</p>
                            </div>
                          </div>
                          <Button onClick={cancelPasswordRequest} variant="ghost" className="w-full h-10 text-[9px] font-black uppercase tracking-widest text-orange-400 hover:bg-orange-500/10">
                            Cancel Request
                          </Button>
                        </div>
                      ) : passwordRequest?.status === 'approved' ? (
                        <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <div>
                              <p className="text-xs font-black text-emerald-400 uppercase">Password Changed</p>
                              <p className="text-[9px] text-emerald-400/60 font-bold uppercase tracking-widest">Use new password to login</p>
                            </div>
                          </div>
                        </div>
                      ) : passwordRequest?.status === 'rejected' ? (
                        <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-3">
                          <div className="flex items-center gap-3">
                            <XCircle className="w-4 h-4 text-red-400" />
                            <div>
                              <p className="text-xs font-black text-red-400 uppercase">Request Rejected</p>
                              <p className="text-[9px] text-red-400/60 font-bold uppercase tracking-widest">{passwordRequest.admin_note || "Contact admin for more info"}</p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      <Input 
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-white/[0.03] border-white/5 h-12 rounded-2xl text-white placeholder:text-white/10"
                      />
                      <Input 
                        placeholder="Reason for change (optional)"
                        value={passwordReason} 
                        onChange={(e) => setPasswordReason(e.target.value)}
                        className="bg-white/[0.03] border-white/5 h-10 rounded-xl text-sm text-white placeholder:text-white/10"
                      />
                      <Button 
                        onClick={handlePasswordChangeRequest}
                        disabled={requestingPassword || !newPassword}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest"
                      >
                        {requestingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request Password Change"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {blockedProfiles.length > 0 && (
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Blocked Users</p>
                  <div className="space-y-2">
                    {blockedProfiles.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <AvatarDisplay profile={p} className="h-8 w-8" />
                          <span className="text-[10px] font-black uppercase text-white">{p.username}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => unblockUser(p.id)} className="text-red-400 hover:text-red-300 font-black uppercase text-[8px] tracking-widest">Unblock</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-red-500/50 px-2">Danger Zone</h2>
            
            <div className="bg-red-500/5 border border-red-500/10 rounded-3xl overflow-hidden divide-y divide-red-500/10">
              <button
                onClick={handleDeleteData}
                className="w-full p-5 flex items-center gap-4 hover:bg-red-500/5 transition-colors text-left"
              >
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-red-400 uppercase">Clear All Data</p>
                  <p className="text-[8px] text-red-400/50 font-black uppercase tracking-widest mt-0.5">Delete all messages</p>
                </div>
              </button>

              <button
                onClick={handleDeleteProfile}
                className="w-full p-5 flex items-center gap-4 hover:bg-red-500/5 transition-colors text-left"
              >
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <User className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-red-400 uppercase">Delete Account</p>
                  <p className="text-[8px] text-red-400/50 font-black uppercase tracking-widest mt-0.5">Permanently remove profile</p>
                </div>
              </button>

              <button
                onClick={() => { supabase.auth.signOut(); window.location.reload(); }}
                className="w-full p-5 flex items-center gap-4 hover:bg-red-500/5 transition-colors text-left"
              >
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <LogOut className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-red-400 uppercase">Sign Out</p>
                  <p className="text-[8px] text-red-400/50 font-black uppercase tracking-widest mt-0.5">Exit current session</p>
                </div>
              </button>
            </div>
          </motion.div>
        </main>
      </div>

      {showAvatarBuilder && (
        <AvatarBuilder 
          profile={profile} 
          onUpdate={onUpdate} 
          onClose={() => setShowAvatarBuilder(false)} 
        />
      )}
    </>
  );
}
