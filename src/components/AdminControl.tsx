"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { 
  Shield, Users, MessageSquare, Trash2, CheckCircle, X, AlertTriangle, 
    Zap, Settings2, Globe, Video as VideoIcon, UserPlus, Lock, Flame, 
    Clock, Eye, Ban, ShieldCheck, Activity, Phone, MapPin, Search, 
    ChevronRight, ArrowUpRight, Database, Server, Cpu, Layers, HardDrive, Terminal,
    Radio, Menu, Key, Loader2
  } from "lucide-react";
import { AvatarDisplay } from "./AvatarDisplay";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";

const TABS = [
  { id: "overview", label: "Intelligence Hub", icon: Activity },
  { id: "stories", label: "Network Stories", icon: Radio },
  { id: "requests", label: "Access Requests", icon: UserPlus },
  { id: "password", label: "Password Requests", icon: Lock },
  { id: "users", label: "Node Directory", icon: Users },
  { id: "security", label: "Firewall & Keys", icon: Lock },
  { id: "content", label: "Data Integrity", icon: MessageSquare },
  { id: "system", label: "Kernel Config", icon: Settings2 },
];

function StoriesManagement() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [viewers, setViewers] = useState<any[]>([]);
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchStories();
  }, []);

    async function fetchStories() {
      setLoading(true);
      const { data } = await supabase
        .from("stories")
        .select("*, profiles(username, full_name, avatar_url)")
        .order("created_at", { ascending: false });
      
      if (data) {
        // Handle potential array from join
        const formattedData = data.map(story => ({
          ...story,
          profiles: Array.isArray(story.profiles) ? story.profiles[0] : story.profiles
        }));
        setStories(formattedData);

        // Fetch viewer counts for all stories in one query
        const storyIds = formattedData.map(s => s.id);
        const { data: viewData } = await supabase
          .from("story_views")
          .select("story_id")
          .in("story_id", storyIds);

        const counts: Record<string, number> = {};
        viewData?.forEach(v => {
          counts[v.story_id] = (counts[v.story_id] || 0) + 1;
        });
        setViewerCounts(counts);
      }
      setLoading(false);
    }

  async function fetchViewers(storyId: string) {
    const { data } = await supabase
      .from("story_views")
      .select("*, profiles:viewer_id(username, full_name, avatar_url)")
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false });
    
    if (data) setViewers(data);
  }

  async function deleteStory(storyId: string) {
    try {
      // First delete story views and saves
      await supabase.from("story_views").delete().eq("story_id", storyId);
      await supabase.from("story_saves").delete().eq("story_id", storyId);
      
      // Then delete the story itself
      const { error } = await supabase.from("stories").delete().eq("id", storyId);
      if (error) throw error;
      
      toast.success("Story purged from network");
      fetchStories();
      if (selectedStory?.id === storyId) setSelectedStory(null);
    } catch (error: any) {
      console.error("Delete story error:", error);
      toast.error("Failed to delete story: " + (error.message || "Unknown error"));
    }
  }

  return (
    <div className="space-y-8 pr-2 custom-scrollbar overflow-y-auto max-h-[calc(100vh-280px)] pb-32">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-white/5 border-dashed rounded-[3rem]">
          <Radio className="w-12 h-12 text-white/10 mb-4" />
          <p className="text-sm font-black italic text-white/40 uppercase tracking-widest">No stories uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <motion.div 
              key={story.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden group hover:border-indigo-500/30 transition-all"
            >
              <div className="aspect-[9/16] relative bg-black/40">
                {story.media_type === 'image' ? (
                  <img src={story.media_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                ) : story.media_type === 'video' ? (
                  <video src={story.media_url} className="w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Radio className="w-12 h-12 text-indigo-500/40" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AvatarDisplay profile={story.profiles} className="w-8 h-8 ring-2 ring-indigo-500/20" />
                    <div>
                      <p className="text-[10px] font-black italic text-white tracking-tighter truncate w-24">
                        {story.profiles.full_name || story.profiles.username}
                      </p>
                      <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest">
                        @{story.profiles.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-black/50 backdrop-blur px-2 py-1 rounded-lg">
                    <Eye className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] font-black text-white">{viewerCounts[story.id] || 0}</span>
                  </div>
                </div>

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <button 
                      onClick={() => {
                        setSelectedStory(story);
                        fetchViewers(story.id);
                      }}
                      className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all"
                    >
                      <Eye className="w-3 h-3" />
                      View Intel
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this story?')) {
                          deleteStory(story.id);
                        }
                      }}
                      className="flex items-center gap-2 p-2 px-4 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Delete</span>
                    </button>
                  </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedStory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8"
          >
              <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
                <button 
                  onClick={() => setSelectedStory(null)}
                  className="absolute top-6 right-6 p-3 bg-black/60 rounded-2xl border border-white/10 hover:bg-white/10 transition-all z-50 md:hidden"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="w-full md:w-1/2 h-2/5 md:h-full bg-black relative shrink-0">
                  {selectedStory.media_type === 'image' ? (
                    <img src={selectedStory.media_url} alt="" className="w-full h-full object-contain" />
                  ) : selectedStory.media_type === 'video' ? (
                    <video src={selectedStory.media_url} controls className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <audio src={selectedStory.media_url} controls />
                    </div>
                  )}
                  <button 
                    onClick={() => setSelectedStory(null)}
                    className="absolute top-6 left-6 p-3 bg-black/60 rounded-2xl border border-white/10 hover:bg-white/10 transition-all z-20 hidden md:block"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="flex-1 p-6 md:p-10 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5 shrink-0">
                      <div className="flex items-center gap-4">
                        <AvatarDisplay profile={selectedStory.profiles} className="w-14 h-14" />
                        <div>
                          <h4 className="text-xl font-black italic text-white tracking-tighter">
                            {selectedStory.profiles.full_name || selectedStory.profiles.username}
                          </h4>
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">@{selectedStory.profiles.username}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteStory(selectedStory.id)}
                        className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl border border-red-500/20 transition-all flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Delete Story</span>
                      </button>
                    </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <div className="flex items-center gap-2 mb-6">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Viewer Node Logs ({viewers.length})</span>
                    </div>
                    
                    <div className="space-y-4">
                      {viewers.map((v) => (
                        <div key={v.id} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                          <div className="flex items-center gap-4">
                            <AvatarDisplay profile={v.profiles} className="w-10 h-10" />
                            <div>
                              <p className="text-sm font-bold">{v.profiles.full_name || v.profiles.username}</p>
                              <p className="text-[9px] text-white/30 font-bold">@{v.profiles.username} • {new Date(v.viewed_at).toLocaleTimeString()}</p>
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                        </div>
                      ))}
                      {viewers.length === 0 && (
                        <div className="text-center py-12 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
                          <Eye className="w-8 h-8 text-white/10 mx-auto mb-3" />
                          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">No viewer data captured yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState({ users: 0, messages: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [systemConfig, setSystemConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "stories" | "requests" | "password" | "users" | "content" | "system" | "security">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [kernelStatus, setKernelStatus] = useState("STABLE");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [passwordRequests, setPasswordRequests] = useState<any[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    fetchSystemConfig();
    fetchPasswordRequests();
  }, []);

  useEffect(() => {
    if (systemConfig.kernel_optimization) {
      const val = parseFloat(systemConfig.kernel_optimization);
      if (val > 0.8) setKernelStatus("OVERCLOCKED");
      else if (val < 0.4) setKernelStatus("POWER_SAVE");
      else setKernelStatus("STABLE");
    }
  }, [systemConfig.kernel_optimization]);

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

  async function updateConfig(key: string, value: any) {
    const { error } = await supabase.from("system_config").upsert({ key, value });
    if (error) toast.error("Failed to update system config");
    else {
      setSystemConfig({ ...systemConfig, [key]: value });
      toast.success("System protocol updated");
    }
  }

  async function fetchPasswordRequests() {
    const { data } = await supabase
      .from("password_change_requests")
      .select("*, profiles(username, full_name, avatar_url)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    
    if (data) {
      const formattedData = data.map(req => ({
        ...req,
        profiles: Array.isArray(req.profiles) ? req.profiles[0] : req.profiles
      }));
      setPasswordRequests(formattedData);
    }
  }

  async function handlePasswordRequest(requestId: string, userId: string, newPassword: string, action: 'approve' | 'reject', adminNote?: string) {
    setProcessingRequest(requestId);
    try {
      if (action === 'approve') {
        const response = await fetch('/api/admin/password-change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, newPassword, requestId })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to change password');
        
        toast.success("Password updated successfully!");
      } else {
        const { error } = await supabase
          .from("password_change_requests")
          .update({ status: 'rejected', admin_note: adminNote || 'Request rejected by admin', updated_at: new Date().toISOString() })
          .eq("id", requestId);
        
        if (error) throw error;
        toast.success("Request rejected");
      }
      
      fetchPasswordRequests();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingRequest(null);
    }
  }

  async function fetchData() {
    setLoading(true);
    const { count: userCount } = await supabase.from("profiles").select("*", { count: 'exact', head: true });
    const { count: msgCount } = await supabase.from("messages").select("*", { count: 'exact', head: true });
    
    const { data: userData } = await supabase.from("profiles").select("*").order("is_approved", { ascending: true }).order("updated_at", { ascending: false });
    
    setStats({ users: userCount || 0, messages: msgCount || 0 });
    setUsers(userData || []);
    setLoading(false);
  }

  async function toggleApproval(userId: string, currentStatus: boolean) {
    const { error } = await supabase.from("profiles").update({ is_approved: !currentStatus }).eq("id", userId);
    if (error) toast.error(error.message);
    else {
      toast.success(`User ${!currentStatus ? "approved" : "access revoked"}`);
      fetchData();
    }
  }

  async function sendBroadcast() {
    if (!broadcastMsg.trim()) return;
    setSending(true);
    try {
      // Use the dedicated broadcasts table for global transmission
      const { error } = await supabase.from("broadcasts").insert({
        sender_id: "90bc36b6-3662-46ad-bf62-dbb3737628d4", // Special Admin UUID
        content: broadcastMsg,
        is_active: true
      });

      if (error) throw error;
      
      toast.success("Global Broadcast deployed to all active nodes!");
      setBroadcastMsg("");
    } catch (e) {
      console.error("Broadcast failure:", e);
      toast.error("Failed to transmit global broadcast");
    } finally {
      setSending(false);
    }
  }

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingRequests = users.filter(u => u.is_approved === false || u.is_approved === null);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#050505] flex items-center justify-center flex-col gap-6">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 border-b-2 border-indigo-500 rounded-full"
        />
        <p className="text-[10px] font-black tracking-[0.5em] text-white/20 animate-pulse">Synchronizing Core</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#050505] z-[100] flex flex-col md:flex-row items-stretch text-white font-sans overflow-hidden">
      <div className="absolute inset-0 z-[1000] pointer-events-none overflow-hidden opacity-[0.03]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[100] bg-[length:100%_2px,3px_100%]" />
      </div>

        <AnimatePresence>
          {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
            <motion.div 
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`fixed md:relative z-[110] md:z-20 w-80 h-full flex flex-col border-r border-white/[0.05] bg-[#080808]/95 md:bg-[#080808]/80 backdrop-blur-3xl shrink-0 overflow-hidden shadow-2xl md:shadow-none`}
            >
              <div className="p-8 md:p-10 pb-8 md:pb-12 flex flex-col items-center text-center relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsSidebarOpen(false)}
                  className="absolute top-4 right-4 md:hidden text-white/20 hover:text-white bg-white/5 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </Button>
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.3)] mb-4 md:mb-6 border border-white/20"
                >
                  <Shield className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </motion.div>
                <h2 className="text-xl md:text-2xl font-black italic tracking-tighter text-white uppercase">Administrator</h2>
              </div>

              <div className="flex-1 px-4 md:px-6 space-y-1 overflow-y-auto custom-scrollbar pb-10">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all relative group overflow-hidden ${
                        isActive 
                          ? "text-white bg-white/5 shadow-inner" 
                          : "text-white/30 hover:bg-white/[0.02] hover:text-white"
                      }`}
                    >
                      {/* Gradient background for low visibility on right */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/40 opacity-50 pointer-events-none" />
                      
                      <tab.icon className={`w-4 h-4 transition-transform relative z-10 ${isActive ? "text-indigo-400 scale-110" : "text-white/20 group-hover:text-white/40"}`} />
                      <span className="text-[10px] font-bold tracking-widest uppercase leading-none relative z-10">{tab.label}</span>
{tab.id === "requests" && pendingRequests.length > 0 && (
                          <span className="ml-auto bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full relative z-10">{pendingRequests.length}</span>
                        )}
                        {tab.id === "password" && passwordRequests.length > 0 && (
                          <span className="ml-auto bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full relative z-10">{passwordRequests.length}</span>
                        )}
                      
                        {isActive && (
                          <motion.div 
                            layoutId="adminTabIndicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-20"
                            style={{ 
                              background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.4) 0%, rgba(37, 99, 235, 0.1) 50%, rgba(37, 99, 235, 0) 100%)',
                              width: '100%',
                              height: '100%',
                              borderLeft: '4px solid #2563eb',
                              boxShadow: 'inset 15px 0 25px -10px rgba(37, 99, 235, 0.6)'
                            }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                    </button>
                  );
                })}
              </div>

            <div className="p-6 md:p-8 mt-auto border-t border-white/5 bg-[#050505]/50">
              <Button variant="ghost" onClick={onClose} className="w-full h-12 md:h-14 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 hover:text-red-500 transition-all">
                Exit Terminal
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isSidebarOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[105] md:hidden"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 bg-[#050505] relative z-10 overflow-hidden">
        <div className="h-20 md:h-24 border-b border-white/[0.05] flex items-center justify-between px-6 md:px-12 bg-[#080808]/40 backdrop-blur-3xl shrink-0">
          <div className="flex items-center gap-4">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden text-white/40 hover:text-white bg-white/5 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </Button>
            <h3 className="text-xl md:text-3xl font-black italic tracking-tighter text-white uppercase truncate max-w-[200px] md:max-w-none">
              {TABS.find(t => t.id === activeTab)?.label}
            </h3>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[7px] md:text-[9px] font-black text-white/40 tracking-widest uppercase">Kernel</span>
              <span className={`text-[9px] md:text-[10px] font-black tracking-tighter ${kernelStatus === 'OVERCLOCKED' ? 'text-red-500' : 'text-emerald-500'}`}>{kernelStatus}</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 px-4 md:px-12 py-6 md:py-10 flex flex-col">

              <AnimatePresence mode="wait">
{activeTab === "overview" && (
                    <motion.div 
                      key="overview"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-8"
                    >
                      <div className="space-y-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        { label: "Active Nodes", value: stats.users, icon: Globe, color: "text-blue-400" },
                        { label: "Data Packets", value: stats.messages, icon: Database, color: "text-emerald-400" },
                        { label: "Elite IDs", value: users.filter(u => u.is_admin).length, icon: ShieldCheck, color: "text-indigo-400" },
                        { label: "Pending Access", value: pendingRequests.length, icon: Radio, color: "text-orange-400" },
                      ].map((stat, i) => (
                        <div key={i} className="bg-white/[0.02] border border-white/[0.05] p-8 rounded-[2rem] hover:bg-white/[0.04] transition-all">
                          <stat.icon className={`w-6 h-6 ${stat.color} mb-4`} />
                          <p className="text-4xl font-black italic tracking-tighter text-white">{stat.value}</p>
                          <p className="text-[9px] text-white/30 font-black tracking-[0.2em] mt-1">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-indigo-600 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/10 transition-all" />
                      <h3 className="text-3xl font-black italic tracking-tighter text-white mb-8 relative z-10">Global Broadcast</h3>
                      <textarea 
                        value={broadcastMsg}
                        onChange={(e) => setBroadcastMsg(e.target.value)}
                        placeholder="Input message for all nodes..."
                        className="w-full h-32 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white outline-none mb-6 resize-none relative z-10 placeholder:text-white/40"
                      />
                      <Button onClick={sendBroadcast} disabled={sending} className="w-full bg-white text-indigo-600 hover:bg-white/90 h-16 rounded-2xl font-black tracking-widest text-[10px] relative z-10">
                          {sending ? "TRANSMITTING..." : "DEPLOY BROADCAST"}
                        </Button>
                      </div>
                      </div>
                    </motion.div>
                  )}

              {activeTab === "stories" && (
                <motion.div key="stories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                  <StoriesManagement />
                </motion.div>
              )}

{activeTab === "requests" && (
                  <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
                    {pendingRequests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-white/5 border-dashed rounded-[3rem]">
                        <CheckCircle className="w-12 h-12 text-emerald-500/40 mb-4" />
                        <p className="text-sm font-black italic text-white/40 uppercase tracking-widest">No pending requests</p>
                      </div>
                    ) : (
                      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 space-y-6 pb-8">
                          {pendingRequests.map((user) => (
                            <div key={user.id} className="flex flex-col sm:flex-row items-center justify-between p-8 bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] gap-6">
                                <div className="flex items-center gap-6">
                                  <AvatarDisplay profile={user} className="h-16 w-16" />
                                  <div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <div>
                                        <p className="text-xl font-black italic text-white tracking-tighter leading-tight">{user.full_name || "No Name"}</p>
                                        <p className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">@{user.username}</p>
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] mt-2 truncate max-w-[200px]">Node ID: {user.id.substring(0, 12)}...</p>
                                  </div>
                                </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                              <Button onClick={() => toggleApproval(user.id, false)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-12 text-[9px] font-black uppercase tracking-widest px-8">Approve</Button>
                              <Button onClick={async () => {
                                const { error } = await supabase.from("profiles").delete().eq("id", user.id);
                                if (!error) { toast.success("Request rejected"); fetchData(); }
                              }} variant="ghost" className="flex-1 bg-white/5 text-red-400 rounded-xl h-12 text-[9px] font-black uppercase tracking-widest px-8">Reject</Button>
                            </div>
                          </div>
                        ))}
                      </div>
)}
                    </motion.div>
                  )}

{activeTab === "password" && (
                  <motion.div key="password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
                    {passwordRequests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-white/5 border-dashed rounded-[3rem]">
                        <Key className="w-12 h-12 text-indigo-500/40 mb-4" />
                        <p className="text-sm font-black italic text-white/40 uppercase tracking-widest">No password change requests</p>
                      </div>
                    ) : (
                      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 space-y-6 pb-8">
                        {passwordRequests.map((req) => (
                          <div key={req.id} className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                              <div className="flex items-center gap-6">
                                <AvatarDisplay profile={req.profiles} className="h-16 w-16" />
                                <div>
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <div>
                                      <p className="text-xl font-black italic text-white tracking-tighter leading-tight">{req.profiles?.full_name || "No Name"}</p>
                                      <p className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">@{req.profiles?.username}</p>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] mt-2">
                                    {new Date(req.created_at).toLocaleDateString()} • {new Date(req.created_at).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                <Clock className="w-3 h-3 text-orange-400" />
                                <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Pending</span>
                              </div>
                            </div>

                            {req.reason && (
                              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">Reason</p>
                                <p className="text-sm text-white/80">{req.reason}</p>
                              </div>
                            )}

                            <div className="flex gap-3 w-full">
                              <Button 
                                onClick={() => handlePasswordRequest(req.id, req.user_id, req.new_password_hash, 'approve')} 
                                disabled={processingRequest === req.id}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-12 text-[9px] font-black uppercase tracking-widest"
                              >
                                {processingRequest === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve & Change
                                  </>
                                )}
                              </Button>
                              <Button 
                                onClick={() => handlePasswordRequest(req.id, req.user_id, '', 'reject', 'Request rejected by administrator')} 
                                disabled={processingRequest === req.id}
                                variant="ghost" 
                                className="flex-1 bg-white/5 text-red-400 hover:bg-red-500/20 rounded-xl h-12 text-[9px] font-black uppercase tracking-widest"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

{activeTab === "users" && (
                  <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 h-full flex flex-col">
                    <div className="relative group max-w-md shrink-0">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                      <input 
                        placeholder="Search Node Directory..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none focus:border-indigo-500/50 transition-all"
                      />
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
                      <div className="grid gap-4 pb-8">
                          {filteredUsers.filter(u => u.is_approved).map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/[0.05] rounded-[2rem] hover:bg-white/[0.04] transition-all">
                                <div className="flex items-center gap-6 min-w-0 flex-1">
                                  <AvatarDisplay profile={user} className="h-14 w-14 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <div>
                                        <p className="text-lg font-black italic text-white tracking-tighter leading-tight">{user.full_name || "No Name"}</p>
                                        <div className="flex items-center gap-2">
                                          <p className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">@{user.username}</p>
                                          {user.is_admin && <span className="text-[7px] font-black bg-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0 text-white">Admin</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1 truncate">Node ID: {user.id}</p>
                                  </div>
                                </div>
                            <Button variant="ghost" className="h-12 w-12 rounded-xl bg-white/5 text-red-400 hover:bg-red-500 hover:text-white shrink-0 ml-4" onClick={() => toggleApproval(user.id, user.is_approved)}>
                              <Ban className="w-5 h-5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

              {activeTab === "security" && (
                <motion.div key="security" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-6">
                  <div className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-black italic text-white tracking-tight">Active Firewall</h4>
                        <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-1">Filter incoming node connections</p>
                      </div>
                      <Switch checked={systemConfig.firewall_status === 'true'} onCheckedChange={(v) => updateConfig('firewall_status', String(v))} />
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-black italic text-white tracking-tight">Key Rotation</h4>
                        <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-1">Automatic RSA-4096 cycling</p>
                      </div>
                      <Switch checked={systemConfig.key_rotation === 'true'} onCheckedChange={(v) => updateConfig('key_rotation', String(v))} />
                    </div>
                  </div>
                </motion.div>
              )}

                {activeTab === "content" && (
                  <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 bg-white/[0.02] border border-white/[0.05] rounded-[3rem]">
                     <div className="flex items-center gap-4 mb-8">
                       <Database className="w-8 h-8 text-indigo-400" />
                       <div>
                         <h4 className="text-2xl font-black italic text-white">Data Integrity Protocol</h4>
                         <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Enforce strict data packet transmission rules</p>
                       </div>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { id: 'standard', label: 'Standard', desc: 'Basic validation' },
                          { id: 'strict', label: 'Strict', desc: 'Size limits & noise filtering' },
                          { id: 'quantum', label: 'Quantum', desc: 'End-to-end structure enforcement' }
                        ].map(m => (
                          <button 
                            key={m.id} 
                            onClick={() => updateConfig('data_integrity_mode', m.id)} 
                            className={`flex flex-col items-center justify-center p-6 rounded-[2rem] transition-all gap-2 border ${systemConfig.data_integrity_mode === m.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)]' : 'bg-white/5 border-white/10 text-white/30 hover:text-white hover:bg-white/10'}`}
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                            <span className="text-[8px] font-bold opacity-40">{m.desc}</span>
                          </button>
                        ))}
                     </div>
                  </motion.div>
                )}

              {activeTab === "system" && (
                <motion.div key="system" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 bg-white/[0.02] border border-white/[0.05] rounded-[3rem] space-y-10">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                       <h4 className="text-xl font-black italic text-white tracking-tight">Kernel Optimization</h4>
                       <span className="text-xl font-black text-indigo-400">{(systemConfig.kernel_optimization || 0.8) * 100}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.1" 
                      value={systemConfig.kernel_optimization || 0.8} 
                      onChange={(e) => updateConfig('kernel_optimization', parseFloat(e.target.value))}
                      className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    );
}
