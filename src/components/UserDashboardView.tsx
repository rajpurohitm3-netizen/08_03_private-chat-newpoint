"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    MessageCircle, Phone, Settings, LogOut, Users,
    Search, ChevronRight, Shield, Plus,
    Home, Camera, X, Menu, User, Heart,
    ExternalLink, Flame, Film, CalendarHeart, Lock, Layers, Image, UserPlus, Bell, Clock, Check, Trash2, Send
  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Chat } from "@/components/Chat";
import { Stories } from "@/components/Stories";
import { ProfileSettings } from "@/components/ProfileSettings";
import { VideoCall } from "@/components/VideoCall";
import { WatchParty } from "@/components/WatchParty";
import { SpecialDays } from "@/components/SpecialDays";
import { PrivateSafe } from "@/components/PrivateSafe";
import { PasswordGate } from "@/components/PasswordGate";
import { FriendRequests } from "@/components/FriendRequests";
import { Cinema } from "@/components/Cinema";

type ActiveView = "dashboard" | "chat" | "calls" | "connections" | "settings" | "advanced";

interface Notification {
  id: string;
  type: "message" | "call" | "friend_request" | "story" | "broadcast";
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface UserDashboardViewProps {
  session: any;
  privateKey: CryptoKey;
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

function formatNotificationTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function UserDashboardView({ session, privateKey }: UserDashboardViewProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [isChatUnlocked, setIsChatUnlocked] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [activeWatchParty, setActiveWatchParty] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [friends, setFriends] = useState<string[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<any[]>([]);
  const [advancedSubView, setAdvancedSubView] = useState<"menu" | "vault" | "cinema" | "cinema-solo" | "memories">("menu");
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [selectedFriendForMemories, setSelectedFriendForMemories] = useState<any>(null);
  const [outgoingRequests, setOutgoingRequests] = useState<string[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<string[]>([]);
  const notificationSound = useRef<HTMLAudioElement | null>(null);
  const presenceChannelRef = useRef<any>(null);

  useEffect(() => {
    const unlocked = sessionStorage.getItem("chat_unlocked") === "true";
    setIsChatUnlocked(unlocked);
  }, []);

  useEffect(() => {
    notificationSound.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
  }, []);

  useEffect(() => {
    const savedNotifications = localStorage.getItem(`notifications_${session.user.id}`);
    if (savedNotifications) {
      const parsed = JSON.parse(savedNotifications);
      setNotifications(parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) })));
    }
  }, [session.user.id]);

  useEffect(() => {
    localStorage.setItem(`notifications_${session.user.id}`, JSON.stringify(notifications));
  }, [notifications, session.user.id]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    fetchProfile();
    fetchProfiles();
    fetchRecentChats();
    fetchBroadcasts();
    fetchUnreadCount();
    fetchPendingFriendRequests();
    fetchFriends();
    fetchFriendRequests();
    updateStreak();
    const cleanup = setupRealtimeSubscriptions();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateOnlineStatus(true);
      } else {
        setTimeout(() => {
          if (document.visibilityState !== 'visible') {
            updateOnlineStatus(false);
          }
        }, 1000);
      }
    };

    const handleFocus = () => updateOnlineStatus(true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    if (document.visibilityState === 'visible') {
      updateOnlineStatus(true);
    }

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateOnlineStatus(true);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      updateOnlineStatus(false);
      cleanup();
    };
  }, [session.user.id]);

  async function updateOnlineStatus(online: boolean = true) {
    if (!session?.user?.id) return;
    try {
      const now = new Date().toISOString();
      if (online) {
        await supabase.from("profiles").update({ updated_at: now }).eq("id", session.user.id);
        if (presenceChannelRef.current) {
          await presenceChannelRef.current.track({ user_id: session.user.id, online_at: now });
        }
      } else {
        await supabase.from("profiles").update({ last_seen: now, updated_at: now }).eq("id", session.user.id);
        if (presenceChannelRef.current) {
          await presenceChannelRef.current.untrack();
        }
      }
    } catch (error) {
      console.error("Failed to update online status:", error);
    }
  }

  async function fetchProfile() {
    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (data) setMyProfile(data);
  }

  async function fetchProfiles() {
    const { data } = await supabase.from("profiles").select("*").neq("id", session.user.id);
    if (data) setProfiles(data);
  }

  async function fetchFriends() {
    const { data: accepted } = await supabase
      .from("friend_requests")
      .select("*, sender:profiles!friend_requests_sender_id_fkey(*), receiver:profiles!friend_requests_receiver_id_fkey(*)")
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .eq("status", "accepted");

    if (accepted) {
      const friendsList = accepted.map((req) => {
        if (req.sender_id === session.user.id) {
          return req.receiver;
        }
        return req.sender;
      }).filter(Boolean);
      setFriendProfiles(friendsList);
      setFriends(friendsList.map(f => f.id));
    }
  }

  async function fetchFriendRequests() {
    const { data: outgoing } = await supabase
      .from("friend_requests")
      .select("receiver_id")
      .eq("sender_id", session.user.id)
      .eq("status", "pending");
    
    const { data: incoming } = await supabase
      .from("friend_requests")
      .select("sender_id")
      .eq("receiver_id", session.user.id)
      .eq("status", "pending");

    if (outgoing) setOutgoingRequests(outgoing.map(r => r.receiver_id));
    if (incoming) setIncomingRequests(incoming.map(r => r.sender_id));
  }

  async function fetchRecentChats() {
    const { data: messages } = await supabase
      .from("messages")
      .select("sender_id, receiver_id, created_at")
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order("created_at", { ascending: false });

    if (messages) {
      const contactIds = Array.from(new Set(messages.flatMap(m => [m.sender_id, m.receiver_id])))
        .filter(id => id !== session.user.id);
      if (contactIds.length > 0) {
        const { data: profilesData } = await supabase.from("profiles").select("*").in("id", contactIds);
        if (profilesData) {
          const sorted = contactIds.map(id => profilesData.find(p => p.id === id)).filter(Boolean);
          setRecentChats(sorted);
        }
      }
    }
  }

  async function fetchBroadcasts() {
    const { data } = await supabase.from("broadcasts").select("*").order("created_at", { ascending: false }).limit(1);
    if (data) setBroadcasts(data);
  }

  async function fetchUnreadCount() {
    const { count } = await supabase
      .from("messages")
      .select("*", { count: 'exact', head: true })
      .eq("receiver_id", session.user.id)
      .eq("is_viewed", false);
    setUnreadCount(count || 0);
  }

  async function fetchPendingFriendRequests() {
    const { count } = await supabase
      .from("friend_requests")
      .select("*", { count: 'exact', head: true })
      .eq("receiver_id", session.user.id)
      .eq("status", "pending");
    setPendingFriendRequests(count || 0);
  }

  async function updateStreak() {
    try {
      const response = await fetch('/api/streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id })
      });
      const data = await response.json();
      if (data.success && data.streak > 1) {
        fetchProfile();
      }
    } catch (error) {
      console.error("Failed to update streak:", error);
    }
  }

  async function sendFriendRequest(receiverId: string) {
    const { error } = await supabase.from("friend_requests").insert({
      sender_id: session.user.id,
      receiver_id: receiverId,
      status: "pending"
    });

    if (error) {
      toast.error("Failed to send request");
    } else {
      toast.success("Friend request sent!");
      fetchFriendRequests();
    }
  }

  async function acceptFriendRequest(senderId: string) {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("sender_id", senderId)
      .eq("receiver_id", session.user.id);

    if (error) {
      toast.error("Failed to accept");
    } else {
      toast.success("Friend request accepted!");
      fetchFriends();
      fetchFriendRequests();
      fetchPendingFriendRequests();
    }
  }

  function addNotification(type: Notification["type"], title: string, body: string, data?: any) {
    const newNotification: Notification = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      title,
      body,
      timestamp: new Date(),
      read: false,
      data
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
  }

  async function showNotification(title: string, options?: NotificationOptions) {
    if (notificationSound.current) {
      notificationSound.current.play().catch(console.error);
    }
    if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === "granted") {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(title, { icon: "/icon.png", badge: "/icon.png", vibrate: [100, 50, 100], ...options } as any);
    }
  }

  function setupRealtimeSubscriptions() {
    const broadcastsChannel = supabase.channel("global-broadcasts").on("postgres_changes", { event: "INSERT", schema: "public", table: "broadcasts" }, (payload) => {
      setBroadcasts([payload.new]);
      toast.info("Global Broadcast Received", { description: payload.new.content });
      showNotification("Global Broadcast", { body: payload.new.content });
      addNotification("broadcast", "Global Broadcast", payload.new.content);
    }).subscribe();

    const messagesChannel = supabase.channel("dashboard-messages").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${session.user.id}` }, async (payload) => {
      fetchRecentChats();
      fetchUnreadCount();
      const { data: sender } = await supabase.from("profiles").select("username").eq("id", payload.new.sender_id).single();
      toast.info("New message received");
      showNotification("New Message", { body: `Message from ${sender?.username || 'Someone'}` });
      addNotification("message", "New Message", `You received a message from ${sender?.username || 'someone'}`, { senderId: payload.new.sender_id });
    }).subscribe();

    const callsChannel = supabase.channel("incoming-calls").on("postgres_changes", { event: "INSERT", schema: "public", table: "calls", filter: `receiver_id=eq.${session.user.id}` }, async (payload) => {
      const data = payload.new;
      if (data.type === "offer" && !activeCall && !incomingCall) {
        const { data: caller } = await supabase.from("profiles").select("*").eq("id", data.caller_id).single();
        if (caller) {
          setIncomingCall({ ...data, caller });
          toast.info(`Incoming ${data.call_mode} call from ${caller.username}`, { duration: 10000 });
          showNotification(`Incoming ${data.call_mode} call`, { body: `Call from ${caller.username}` });
          addNotification("call", `Incoming ${data.call_mode} Call`, `${caller.username} is calling you`, { callerId: data.caller_id });
        }
      }
    }).subscribe();

    const storiesChannel = supabase.channel("new-stories").on("postgres_changes", { event: "INSERT", schema: "public", table: "stories" }, async (payload) => {
      if (payload.new.user_id !== session.user.id) {
        const { data: creator } = await supabase.from("profiles").select("username").eq("id", payload.new.user_id).single();
        if (creator) {
          toast.info(`New story from ${creator.username}`);
          showNotification("New Story", { body: `${creator.username} shared a new snapshot.` });
          addNotification("story", "New Story", `${creator.username} shared a new story`, { userId: payload.new.user_id });
        }
      }
    }).subscribe();

    const friendRequestsChannel = supabase.channel("friend-requests-notifications").on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, async (payload) => {
      fetchPendingFriendRequests();
      fetchFriends();
      fetchFriendRequests();
      if (payload.eventType === "INSERT" && payload.new.receiver_id === session.user.id) {
        const { data: sender } = await supabase.from("profiles").select("username").eq("id", payload.new.sender_id).single();
        if (sender) {
          toast.info(`${sender.username} sent you a friend request`);
          showNotification("Friend Request", { body: `${sender.username} wants to connect with you` });
          addNotification("friend_request", "Friend Request", `${sender.username} wants to be your friend`, { senderId: payload.new.sender_id });
        }
      }
    }).subscribe();

    const presenceChannel = supabase.channel("online-users").on("presence", { event: "sync" }, () => {
      const state = presenceChannel.presenceState();
      const online = new Set<string>();
      Object.values(state).forEach((users: any) => { users.forEach((u: any) => online.add(u.user_id)); });
      setOnlineUsers(online);
    }).subscribe();

    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(broadcastsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(callsChannel);
      supabase.removeChannel(storiesChannel);
      supabase.removeChannel(friendRequestsChannel);
      supabase.removeChannel(presenceChannel);
    };
  }

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    if (view !== "chat") setSelectedContact(null);
    if (view === "advanced") {
      setAdvancedSubView("menu");
      setSelectedFriendForMemories(null);
    }
    setSidebarOpen(false);
    setShowFriendSearch(false);
    setShowNotificationPanel(false);
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const isFriend = (userId: string) => friends.includes(userId);
  const hasSentRequest = (userId: string) => outgoingRequests.includes(userId);
  const hasIncomingRequest = (userId: string) => incomingRequests.includes(userId);

  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { id: "dashboard", icon: Home, label: "Chatify" },
    { id: "chat", icon: MessageCircle, label: "Signals" },
    { id: "calls", icon: Phone, label: "Uplink" },
    { id: "connections", icon: UserPlus, label: "Connections" },
    { id: "advanced", icon: Layers, label: "Advanced" },
    { id: "settings", icon: Settings, label: "Entity" },
  ];

const advancedFeatures = [
      { id: "vault", icon: Shield, label: "Vault", desc: "Private secure storage", color: "from-violet-600 to-purple-600" },
      { id: "cinema", icon: Film, label: "Cinema", desc: "Watch movies together", color: "from-purple-600 to-indigo-600" },
      { id: "memories", icon: CalendarHeart, label: "Memories", desc: "Special days calendar", color: "from-pink-600 to-rose-600" },
    ];

  const filteredFriendResults = profiles.filter(p =>
    p.username?.toLowerCase().includes(friendSearchQuery.toLowerCase())
  ).slice(0, 5);

  const nonFriendProfiles = profiles.filter(p => !friends.includes(p.id));

  if (!myProfile) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#030303]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Syncing Node</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-[#030303] text-white overflow-hidden font-sans selection:bg-indigo-500/30">
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            key="mobile-overlay"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setMobileMenuOpen(false)} 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden" 
          />
        )}
        {mobileMenuOpen && (
          <motion.div 
            key="mobile-sidebar"
            initial={{ x: "-100%" }} 
            animate={{ x: 0 }} 
            exit={{ x: "-100%" }} 
            transition={{ type: "spring", damping: 25, stiffness: 200 }} 
            className="fixed top-0 left-0 bottom-0 w-[80%] max-w-xs bg-[#050505] border-r border-white/5 z-[101] lg:hidden p-6 flex flex-col"
          >
              <div className="flex items-center justify-between mb-12">
                <h2 className="text-xl font-black italic tracking-tighter uppercase">Chatify <span className="text-indigo-500">Core</span></h2>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="text-white/20 hover:text-white bg-white/5 rounded-xl"><X className="w-5 h-5" /></Button>
              </div>
              <div className="flex items-center gap-4 mb-12 p-4 bg-white/[0.02] border border-white/5 rounded-2xl cursor-pointer group" onClick={() => { router.push(`/profile/${session.user.id}`); setMobileMenuOpen(false); }}>
                <AvatarDisplay profile={myProfile} className="h-12 w-12" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm uppercase tracking-tight truncate">{myProfile.username}</p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-500">Online</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20" />
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = activeView === item.id;
                  return (
                    <motion.button key={item.id} whileTap={{ scale: 0.98 }} onClick={() => { handleNavClick(item.id as ActiveView); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all relative ${isActive ? 'text-white bg-white/5 border border-white/10' : 'text-white/30 hover:text-white hover:bg-white/[0.03]'}`}>
                      {isActive && <motion.div layoutId="mobileIndicator" className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />}
                      <item.icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-white/20'}`} />
                      <span className="text-[10px] font-bold tracking-widest uppercase">{item.label}</span>
                    </motion.button>
                  );
                })}
              </nav>
              <Button variant="ghost" onClick={() => supabase.auth.signOut()} className="mt-auto w-full justify-start gap-4 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-xl h-14 px-6"><LogOut className="w-5 h-5" /><span className="text-[11px] font-black uppercase tracking-widest">Sign Out</span></Button>
            </motion.div>
          )}
        </AnimatePresence>

      <motion.aside initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className={`${sidebarOpen ? 'w-80' : 'w-24'} border-r border-white/5 bg-[#050505]/80 backdrop-blur-3xl flex flex-col transition-all duration-500 hidden lg:flex relative z-40 h-full overflow-hidden`}>
        <div className={`p-6 border-b border-white/5 shrink-0 flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-5 cursor-pointer group" onClick={() => router.push(`/profile/${session.user.id}`)}>
            <AvatarDisplay profile={myProfile} className="h-12 w-12 group-hover:ring-2 ring-indigo-500/50 transition-all" />
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm uppercase tracking-tight truncate group-hover:text-indigo-400 transition-colors">{myProfile.username}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-white/30">View Profile</p>
              </div>
            )}
          </div>
          {sidebarOpen && <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}><Menu className="w-5 h-5" /></Button>}
        </div>
        {!sidebarOpen && <div className="p-4 flex justify-center border-b border-white/5"><Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></Button></div>}
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <motion.button key={item.id} onClick={() => handleNavClick(item.id as ActiveView)}
                className={`w-full flex items-center ${sidebarOpen ? 'gap-5 px-5' : 'justify-center'} py-4 rounded-xl transition-all relative ${isActive ? 'text-white bg-white/5 border border-white/10' : 'text-white/30 hover:text-white hover:bg-white/[0.02]'}`}>
                {isActive && <motion.div layoutId="desktopIndicator" className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />}
                <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-white/20'}`} />
                {sidebarOpen && <span className="text-[10px] font-bold tracking-widest uppercase">{item.label}</span>}
              </motion.button>
            );
          })}
        </nav>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#030303] relative overflow-hidden h-full">
        <header className="h-20 border-b border-white/5 bg-[#050505]/80 backdrop-blur-3xl flex items-center justify-between px-6 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="text-white/20 lg:hidden"><Menu className="w-6 h-6" /></Button>
            <h1 className="text-lg font-black italic tracking-tighter uppercase lg:hidden">Chatify <span className="text-indigo-500">Core</span></h1>
            <h1 className="text-lg font-black italic tracking-tighter uppercase hidden lg:block">Chatify <span className="text-indigo-500">Core</span></h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  placeholder="Search friends..."
                  value={friendSearchQuery}
                  onChange={(e) => { setFriendSearchQuery(e.target.value); setShowFriendSearch(true); }}
                  onFocus={() => setShowFriendSearch(true)}
                  className="w-48 lg:w-64 bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/20"
                />
              </div>
              <AnimatePresence>
                {showFriendSearch && friendSearchQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full mt-2 left-0 right-0 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    {filteredFriendResults.length === 0 ? (
                      <div className="p-4 text-center text-white/30 text-sm">No users found</div>
                    ) : (
                      filteredFriendResults.map(user => (
                        <div
                          key={user.id}
                          onClick={() => { router.push(`/profile/${user.id}`); setShowFriendSearch(false); setFriendSearchQuery(""); }}
                          className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-all"
                        >
                          <AvatarDisplay profile={user} className="h-10 w-10" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{user.username}</p>
                            <p className={`text-[10px] uppercase tracking-wider ${isFriend(user.id) ? 'text-emerald-500' : 'text-white/30'}`}>
                              {isFriend(user.id) ? 'Friend' : onlineUsers.has(user.id) ? 'Online' : 'Offline'}
                            </p>
                          </div>
                          {isFriend(user.id) ? (
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setSelectedContact(user); setActiveView("chat"); setShowFriendSearch(false); setFriendSearchQuery(""); }}
                              className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-[10px] uppercase"
                            >
                              Chat
                            </Button>
                          ) : hasSentRequest(user.id) ? (
                            <span className="text-[10px] text-amber-400 uppercase">Pending</span>
                          ) : hasIncomingRequest(user.id) ? (
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); acceptFriendRequest(user.id); }}
                              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-[10px] uppercase"
                            >
                              Accept
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); sendFriendRequest(user.id); }}
                              className="h-8 px-3 bg-violet-600 hover:bg-violet-700 text-[10px] uppercase"
                            >
                              <UserPlus className="w-3 h-3 mr-1" /> Add
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setShowNotificationPanel(!showNotificationPanel); setShowFriendSearch(false); }}
                className="relative text-white/40 hover:text-white"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </Button>

              <AnimatePresence>
                {showNotificationPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full mt-2 right-0 w-80 sm:w-96 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                      <h3 className="font-black uppercase text-sm">Notifications</h3>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={markAllNotificationsRead} className="h-8 px-2 text-[10px] text-white/40 hover:text-white">
                          <Check className="w-3 h-3 mr-1" /> Read All
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearAllNotifications} className="h-8 px-2 text-[10px] text-white/40 hover:text-red-400">
                          <Trash2 className="w-3 h-3 mr-1" /> Clear
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-white/10 mx-auto mb-3" />
                          <p className="text-white/30 text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-white/5 hover:bg-white/[0.02] transition-all cursor-pointer ${!notification.read ? 'bg-indigo-500/5' : ''}`}
                            onClick={() => {
                              setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
                              if (notification.type === "message") {
                                setActiveView("chat");
                              } else if (notification.type === "friend_request") {
                                setActiveView("connections");
                              }
                              setShowNotificationPanel(false);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-xl ${
                                notification.type === "message" ? "bg-indigo-500/20 text-indigo-400" :
                                notification.type === "call" ? "bg-emerald-500/20 text-emerald-400" :
                                notification.type === "friend_request" ? "bg-amber-500/20 text-amber-400" :
                                notification.type === "story" ? "bg-pink-500/20 text-pink-400" :
                                "bg-purple-500/20 text-purple-400"
                              }`}>
                                {notification.type === "message" && <MessageCircle className="w-4 h-4" />}
                                {notification.type === "call" && <Phone className="w-4 h-4" />}
                                {notification.type === "friend_request" && <UserPlus className="w-4 h-4" />}
                                {notification.type === "story" && <Camera className="w-4 h-4" />}
                                {notification.type === "broadcast" && <Shield className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm">{notification.title}</p>
                                <p className="text-xs text-white/40 truncate">{notification.body}</p>
                                <p className="text-[10px] text-white/20 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatNotificationTime(notification.timestamp)}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AvatarDisplay profile={myProfile} className="h-10 w-10" />
          </div>
        </header>

        {showFriendSearch && <div className="fixed inset-0 z-20" onClick={() => setShowFriendSearch(false)} />}
        {showNotificationPanel && <div className="fixed inset-0 z-20" onClick={() => setShowNotificationPanel(false)} />}

        <main className="flex-1 min-h-0 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeView === "dashboard" && (
<motion.div key="dashboard" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="h-full overflow-y-auto custom-scrollbar p-5 sm:p-8 md:p-12 space-y-8 pb-32 lg:pb-12">
                  <div className="sm:hidden">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input
                        placeholder="Search users..."
                        value={friendSearchQuery}
                        onChange={(e) => { setFriendSearchQuery(e.target.value); setShowFriendSearch(true); }}
                        onFocus={() => setShowFriendSearch(true)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/20"
                      />
                    </div>
                    <AnimatePresence>
                      {showFriendSearch && friendSearchQuery && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="mt-2 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto"
                        >
                          {filteredFriendResults.length === 0 ? (
                            <div className="p-4 text-center text-white/30 text-sm">No users found</div>
                          ) : (
                            filteredFriendResults.map(user => (
                              <div
                                key={user.id}
                                onClick={() => { router.push(`/profile/${user.id}`); setShowFriendSearch(false); setFriendSearchQuery(""); }}
                                className="flex items-center gap-3 p-4 hover:bg-white/5 cursor-pointer transition-all border-b border-white/5 last:border-b-0"
                              >
                                <AvatarDisplay profile={user} className="h-12 w-12" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold truncate">{user.username}</p>
                                  <p className={`text-[10px] uppercase tracking-wider ${isFriend(user.id) ? 'text-emerald-500' : onlineUsers.has(user.id) ? 'text-amber-400' : 'text-white/30'}`}>
                                    {isFriend(user.id) ? 'Friend' : onlineUsers.has(user.id) ? 'Online' : 'Offline'}
                                  </p>
                                </div>
                                {isFriend(user.id) ? (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); setSelectedContact(user); setActiveView("chat"); setShowFriendSearch(false); setFriendSearchQuery(""); }}
                                    className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-xs uppercase rounded-xl"
                                  >
                                    Chat
                                  </Button>
                                ) : hasSentRequest(user.id) ? (
                                  <span className="text-xs text-amber-400 uppercase font-bold">Pending</span>
                                ) : hasIncomingRequest(user.id) ? (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); acceptFriendRequest(user.id); }}
                                    className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-xs uppercase rounded-xl"
                                  >
                                    Accept
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); sendFriendRequest(user.id); }}
                                    className="h-10 px-4 bg-violet-600 hover:bg-violet-700 text-xs uppercase rounded-xl"
                                  >
                                    <UserPlus className="w-3 h-3 mr-1" /> Add
                                  </Button>
                                )}
                              </div>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {broadcasts.length > 0 && (
                  <div className="bg-indigo-600 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-3 mb-4"><Shield className="w-4 h-4 animate-pulse" /><span className="text-[10px] font-black uppercase tracking-widest">Broadcast</span></div>
                    <p className="text-xl font-black italic">"{broadcasts[0].content}"</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Streak", value: `${myProfile?.streak_count || 0}`, icon: Flame, color: "from-orange-500 to-red-600" },
                    { label: "Friends", value: friends.length, icon: Heart, color: "from-pink-600 to-pink-700" },
                    { label: "Online", value: onlineUsers.size, icon: Users, color: "from-emerald-600 to-emerald-700" }
                  ].map((stat, i) => (
                    <div key={i} className={`bg-gradient-to-br ${stat.color} p-6 rounded-2xl shadow-xl`}>
                      <stat.icon className="w-6 h-6 text-white mb-4" />
                      <p className="text-3xl font-black italic text-white">{stat.value}</p>
                      <p className="text-[10px] font-black text-white/80 uppercase tracking-widest mt-2">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-6"><Camera className="w-5 h-5 text-indigo-400" /><h3 className="text-sm font-black uppercase tracking-widest">Temporal Stories</h3></div>
                  <Stories userId={session.user.id} />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-6">Your Friends</h3>
                    {friendProfiles.length === 0 ? (
                      <div className="text-center py-8">
                        <Heart className="w-12 h-12 text-white/10 mx-auto mb-3" />
                        <p className="text-white/30 text-sm">No friends yet</p>
                        <Button onClick={() => setActiveView("connections")} className="mt-4 bg-indigo-600 text-xs uppercase">
                          <UserPlus className="w-4 h-4 mr-2" /> Find Friends
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {friendProfiles.slice(0, 4).map(friend => (
                          <div key={friend.id} className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all cursor-pointer" onClick={() => { setSelectedContact(friend); setActiveView("chat"); }}>
                            <AvatarDisplay profile={friend} className="h-10 w-10" />
                            <div className="flex-1 text-left">
                              <p className="font-black text-sm uppercase italic">{friend.username}</p>
                              <p className={`text-[8px] font-bold uppercase tracking-widest ${onlineUsers.has(friend.id) ? 'text-emerald-500' : 'text-white/20'}`}>
                                {onlineUsers.has(friend.id) ? 'Online' : formatLastSeen(friend.last_seen)}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/10" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-6">Suggestions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {nonFriendProfiles.slice(0, 4).map(p => (
                        <div key={p.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center gap-3 hover:border-indigo-500/30 transition-all">
                          <div className="cursor-pointer hover:scale-105 transition-transform relative" onClick={() => router.push(`/profile/${p.id}`)}>
                            <AvatarDisplay profile={p} className="h-10 w-10" />
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black uppercase cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => router.push(`/profile/${p.id}`)}>{p.username}</p>
                            <p className={`text-[6px] font-bold uppercase tracking-widest ${onlineUsers.has(p.id) ? 'text-emerald-500' : 'text-white/20'}`}>
                              {onlineUsers.has(p.id) ? 'Online' : 'Offline'}
                            </p>
                          </div>
                          {hasSentRequest(p.id) ? (
                            <span className="text-[8px] text-amber-400 uppercase px-3 py-1 bg-amber-500/10 rounded-full">Pending</span>
                          ) : hasIncomingRequest(p.id) ? (
                            <Button size="sm" onClick={() => acceptFriendRequest(p.id)} className="w-full text-[8px] font-black uppercase bg-emerald-600 hover:bg-emerald-700 h-8 rounded-xl">
                              <Check className="w-3 h-3 mr-1" /> Accept
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => sendFriendRequest(p.id)} className="w-full text-[8px] font-black uppercase bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white h-8 rounded-xl">
                              <UserPlus className="w-3 h-3 mr-1" /> Add
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === "chat" && (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                {!isChatUnlocked ? (
                  <PasswordGate correctPassword="040408" onUnlock={() => { sessionStorage.setItem("chat_unlocked", "true"); setIsChatUnlocked(true); }} title="Signal Uplink" subtitle="Encrypted Channel" description="Authorization code required to decrypt message matrix." />
                ) : !selectedContact ? (
                  <div className="h-full flex flex-col p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                      <h2 className="text-2xl font-black uppercase italic">Signal Channels</h2>
                      <div className="relative group w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input placeholder="Search friends..." value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3_pl-12_pr-6 text-sm outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10" />
                      </div>
                    </div>
                    
                    {friendProfiles.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <Heart className="w-20 h-20 text-white/10 mb-6" />
                        <h3 className="text-xl font-black uppercase mb-2">No Friends Yet</h3>
                        <p className="text-white/40 text-sm mb-6">Add friends to start chatting</p>
                        <Button onClick={() => setActiveView("connections")} className="bg-indigo-600 uppercase text-xs">
                          <UserPlus className="w-4 h-4 mr-2" /> Find Friends
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-4">Friends ({friendProfiles.length})</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pr-2 pb-24 mb-8">
                          {friendProfiles.filter(p => p.username.toLowerCase().includes(chatSearchQuery.toLowerCase())).map(p => (
                            <div key={p.id} className="flex items-center gap-4 p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all group cursor-pointer" onClick={() => setSelectedContact(p)}>
                              <AvatarDisplay profile={p} className="h-14 w-14 group-hover:scale-110 transition-transform" />
                              <div className="flex-1 text-left">
                                <p className="font-black text-lg uppercase italic hover:text-indigo-400 transition-colors">{p.username}</p>
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${onlineUsers.has(p.id) ? 'text-emerald-500' : 'text-white/20'}`}>
                                  {onlineUsers.has(p.id) ? 'Online' : formatLastSeen(p.last_seen)}
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-indigo-400 transition-all" />
                            </div>
                          ))}
                        </div>

                        {nonFriendProfiles.length > 0 && (
                          <>
                            <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-4">Suggestions - Send Request to Chat</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pr-2 pb-24">
                              {nonFriendProfiles.filter(p => p.username.toLowerCase().includes(chatSearchQuery.toLowerCase())).slice(0, 6).map(p => (
                                <div key={p.id} className="flex items-center gap-4 p-6 bg-white/[0.02] border border-white/5 rounded-2xl opacity-60 hover:opacity-100 transition-all">
                                  <AvatarDisplay profile={p} className="h-14 w-14" />
                                  <div className="flex-1 text-left">
                                    <p className="font-black text-lg uppercase italic">{p.username}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Not a friend</p>
                                  </div>
                                  {hasSentRequest(p.id) ? (
                                    <span className="text-[10px] text-amber-400 uppercase px-3 py-2 bg-amber-500/10 rounded-xl">Pending</span>
                                  ) : hasIncomingRequest(p.id) ? (
                                    <Button size="sm" onClick={() => acceptFriendRequest(p.id)} className="bg-emerald-600 text-[10px] uppercase">
                                      <Check className="w-3 h-3 mr-1" /> Accept
                                    </Button>
                                  ) : (
                                    <Button size="sm" onClick={() => sendFriendRequest(p.id)} className="bg-violet-600 text-[10px] uppercase">
                                      <Send className="w-3 h-3 mr-1" /> Request
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <Chat session={session} privateKey={privateKey} initialContact={selectedContact} isPartnerOnline={onlineUsers.has(selectedContact.id)} onBack={() => setSelectedContact(null)} onInitiateCall={(c, m) => setActiveCall({ contact: c, mode: m, isInitiator: true })} />
                )}
              </motion.div>
            )}

            {activeView === "calls" && (
              <motion.div key="calls" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-0 overflow-y-auto custom-scrollbar p-6 sm:p-8 pb-32 lg:pb-12">
                <div className="mb-8">
                  <h2 className="text-2xl font-black uppercase italic mb-2">Uplink</h2>
                  <p className="text-sm text-white/40">Call your friends</p>
                </div>
                {friendProfiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Phone className="w-20 h-20 text-white/10 mb-6" />
                    <h3 className="text-xl font-black uppercase mb-2">No Friends Yet</h3>
                    <p className="text-white/40 text-sm mb-6">Add friends to start calling</p>
                    <Button onClick={() => setActiveView("connections")} className="bg-indigo-600 uppercase text-xs">
                      <UserPlus className="w-4 h-4 mr-2" /> Find Friends
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {friendProfiles.map(p => (
                      <div key={p.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col items-center gap-4">
                        <div className="cursor-pointer hover:scale-105 transition-transform" onClick={() => router.push(`/profile/${p.id}`)}>
                          <AvatarDisplay profile={p} className="h-16 w-16" />
                        </div>
                        <div className="text-center">
                          <p className="font-black text-lg uppercase cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => router.push(`/profile/${p.id}`)}>{p.username}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${onlineUsers.has(p.id) ? 'text-emerald-500' : 'text-white/20'}`}>
                            {onlineUsers.has(p.id) ? 'Online' : formatLastSeen(p.last_seen)}
                          </p>
                        </div>
                        <div className="flex gap-2 w-full">
                          <Button onClick={() => setActiveCall({ contact: p, mode: "voice", isInitiator: true })} className="flex-1 bg-emerald-600 uppercase text-[10px]">Voice</Button>
                          <Button onClick={() => setActiveCall({ contact: p, mode: "video", isInitiator: true })} className="flex-1 bg-indigo-600 uppercase text-[10px]">Video</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeView === "connections" && (
              <motion.div key="connections" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                <FriendRequests userId={session.user.id} onFriendsUpdate={(ids) => { setFriends(ids); fetchFriends(); }} />
              </motion.div>
            )}

            {activeView === "settings" && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                <ProfileSettings profile={myProfile} onUpdate={fetchProfile} onClose={() => setActiveView("dashboard")} />
              </motion.div>
            )}

            {activeView === "advanced" && (
              <motion.div key="advanced" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="h-full overflow-y-auto custom-scrollbar">
                {advancedSubView === "menu" && (
                  <div className="p-6 sm:p-8 pb-32 lg:pb-12">
                    <div className="mb-8">
                      <h2 className="text-2xl font-black uppercase italic mb-2">Advanced Features</h2>
                      <p className="text-sm text-white/40">Access premium features with your friends</p>
                    </div>
                    {friendProfiles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <Layers className="w-20 h-20 text-white/10 mb-6" />
                        <h3 className="text-xl font-black uppercase mb-2">No Friends Yet</h3>
                        <p className="text-white/40 text-sm mb-6">Add friends to use advanced features</p>
                        <Button onClick={() => setActiveView("connections")} className="bg-indigo-600 uppercase text-xs">
                          <UserPlus className="w-4 h-4 mr-2" /> Find Friends
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {advancedFeatures.map((feature) => (
                          <motion.div key={feature.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setAdvancedSubView(feature.id as any)}
                            className={`p-8 bg-gradient-to-br ${feature.color} rounded-3xl cursor-pointer group relative overflow-hidden`}>
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all" />
                            <div className="relative z-10">
                              <feature.icon className="w-12 h-12 text-white mb-6" />
                              <h3 className="text-2xl font-black uppercase italic text-white mb-2">{feature.label}</h3>
                              <p className="text-sm text-white/70">{feature.desc}</p>
                            </div>
                            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 text-white/30 group-hover:text-white/60 group-hover:translate-x-2 transition-all" />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {advancedSubView === "cinema" && (
                  <div className="p-6 sm:p-8 pb-32 lg:pb-12">
                    <Button variant="ghost" onClick={() => setAdvancedSubView("menu")} className="mb-6 text-white/40 hover:text-white">
                      <ChevronRight className="w-4 h-4 rotate-180 mr-2" /> Back to Advanced
                    </Button>
                    <div className="mb-8">
                      <h2 className="text-2xl font-black uppercase italic mb-2">Cinema Mode</h2>
                      <p className="text-sm text-white/40">Watch movies alone or with friends</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setAdvancedSubView("cinema-solo")}
                        className="p-8 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/20 rounded-3xl cursor-pointer hover:border-purple-500/40 transition-all group"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Film className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-black uppercase mb-2">Solo Watch</h3>
                        <p className="text-sm text-white/40">Upload file or paste link to watch alone</p>
                      </motion.div>
                      
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-8 bg-gradient-to-br from-indigo-900/30 to-blue-900/30 border border-indigo-500/20 rounded-3xl cursor-default"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
                          <Users className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-black uppercase mb-2">Watch Party</h3>
                        <p className="text-sm text-white/40 mb-4">Watch together with a friend (select below)</p>
                      </motion.div>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-4">Start Watch Party With</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {friendProfiles.map(p => (
                        <div key={p.id} className="p-6 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-white/5 rounded-3xl flex flex-col items-center gap-4 hover:border-purple-500/30 transition-all group">
                          <div className="cursor-pointer hover:scale-105 transition-transform relative" onClick={() => router.push(`/profile/${p.id}`)}>
                            <AvatarDisplay profile={p} className="h-16 w-16" />
                            <div className="absolute -bottom-1 -right-1 p-1.5 bg-purple-600 rounded-full">
                              <Film className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="font-black text-lg uppercase cursor-pointer hover:text-purple-400 transition-colors" onClick={() => router.push(`/profile/${p.id}`)}>{p.username}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${onlineUsers.has(p.id) ? 'text-emerald-500' : 'text-white/20'}`}>
                              {onlineUsers.has(p.id) ? 'Online' : formatLastSeen(p.last_seen)}
                            </p>
                          </div>
                          <Button onClick={() => setActiveWatchParty({ contact: p })} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 uppercase text-[10px] tracking-widest">
                            <Film className="w-4 h-4 mr-2" /> Start Watch Party
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {advancedSubView === "cinema-solo" && (
                  <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-white/5">
                      <Button variant="ghost" onClick={() => setAdvancedSubView("cinema")} className="text-white/40 hover:text-white">
                        <ChevronRight className="w-4 h-4 rotate-180 mr-2" /> Back to Cinema
                      </Button>
                    </div>
                    <div className="flex-1 h-[calc(100%-80px)]">
                      <Cinema />
                    </div>
                  </div>
                )}

                {advancedSubView === "vault" && (
                  <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-white/5">
                      <Button variant="ghost" onClick={() => setAdvancedSubView("menu")} className="text-white/40 hover:text-white">
                        <ChevronRight className="w-4 h-4 rotate-180 mr-2" /> Back to Advanced
                      </Button>
                    </div>
                    <div className="flex-1 h-[calc(100%-80px)]">
                      <PrivateSafe session={session} onClose={() => setAdvancedSubView("menu")} />
                    </div>
                  </div>
                )}

                {advancedSubView === "memories" && !selectedFriendForMemories && (
                  <div className="p-6 sm:p-8 pb-32 lg:pb-12">
                    <Button variant="ghost" onClick={() => setAdvancedSubView("menu")} className="mb-6 text-white/40 hover:text-white">
                      <ChevronRight className="w-4 h-4 rotate-180 mr-2" /> Back to Advanced
                    </Button>
                    <div className="mb-8">
                      <h2 className="text-2xl font-black uppercase italic mb-2">Memories</h2>
                      <p className="text-sm text-white/40">Select a friend to view shared memories</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {friendProfiles.map(p => (
                        <motion.div key={p.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedFriendForMemories(p)}
                          className="p-6 bg-gradient-to-br from-pink-900/20 to-rose-900/20 border border-white/5 rounded-3xl flex flex-col items-center gap-4 hover:border-pink-500/30 transition-all cursor-pointer group">
                          <div className="relative">
                            <AvatarDisplay profile={p} className="h-16 w-16 group-hover:scale-105 transition-transform" />
                            <div className="absolute -bottom-1 -right-1 p-1.5 bg-pink-600 rounded-full">
                              <CalendarHeart className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="font-black text-lg uppercase">{p.username}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400">View Memories</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {advancedSubView === "memories" && selectedFriendForMemories && (
                  <div className="h-full">
                    <div className="p-6 border-b border-white/5 flex items-center gap-4">
                      <Button variant="ghost" onClick={() => setSelectedFriendForMemories(null)} className="text-white/40 hover:text-white">
                        <ChevronRight className="w-4 h-4 rotate-180 mr-2" /> Back
                      </Button>
                      <div className="flex items-center gap-3">
                        <AvatarDisplay profile={selectedFriendForMemories} className="h-10 w-10" />
                        <div>
                          <p className="font-bold text-sm">{selectedFriendForMemories.username}</p>
                          <p className="text-[10px] text-pink-400 uppercase">Shared Memories</p>
                        </div>
                      </div>
                    </div>
                    <div className="h-[calc(100%-88px)]">
                      <SpecialDays
                        userId={session.user.id}
                        friendId={selectedFriendForMemories.id}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {activeCall && <VideoCall key="video-call" userId={session.user.id} privateKey={privateKey} contact={activeCall.contact} callType={activeCall.mode} isInitiator={activeCall.isInitiator} incomingSignal={activeCall.incomingSignal} onClose={() => setActiveCall(null)} />}
          {activeWatchParty && (
            <WatchParty 
              key="watch-party"
              userId={session.user.id} 
              privateKey={privateKey}
              contact={activeWatchParty.contact} 
              isInitiator={activeWatchParty.isInitiator ?? true} 
              incomingSignal={activeWatchParty.incomingSignal} 
              onClose={() => setActiveWatchParty(null)} 
            />
          )}
          {incomingCall && !activeCall && (
            <motion.div key="incoming-call" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
              <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-10 max-w-sm w-full text-center space-y-8">
                <AvatarDisplay profile={incomingCall.caller} className="h-32 w-32 mx-auto" />
                <h3 className="text-4xl font-black italic uppercase">{incomingCall.caller.username}</h3>
                <p className="text-sm text-white/40 uppercase tracking-wider">
                  {incomingCall.call_mode === "watchparty" ? "Watch Party" : `${incomingCall.call_mode} Call`}
                </p>
                <div className="flex gap-4">
                  <Button onClick={() => setIncomingCall(null)} className="flex-1 bg-red-600 text-xs font-bold uppercase py-4 rounded-2xl">Decline</Button>
                  <Button onClick={() => { 
                    const signalData = JSON.parse(incomingCall.signal_data);
                    if (incomingCall.call_mode === "watchparty") {
                      setActiveWatchParty({ 
                        contact: incomingCall.caller, 
                        isInitiator: false, 
                        incomingSignal: signalData 
                      });
                    } else {
                      setActiveCall({ 
                        contact: incomingCall.caller, 
                        mode: incomingCall.call_mode, 
                        isInitiator: false, 
                        incomingSignal: signalData 
                      });
                    }
                    setIncomingCall(null); 
                  }} className="flex-1 bg-emerald-600 text-xs font-bold uppercase py-4 rounded-2xl">Accept</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <nav className={`lg:hidden fixed bottom-0 left-0 right-0 border-t border-white/5 bg-[#050505]/95 backdrop-blur-3xl px-2 py-3 flex justify-around items-center z-50 rounded-t-2xl pb-safe transition-all ${(activeView === 'chat' && selectedContact) ? 'translate-y-full' : ''}`}>
          {navItems.map(item => {
            const isActive = activeView === item.id;
            return (
              <button key={item.id} onClick={() => handleNavClick(item.id as ActiveView)} className={`flex flex-col items-center gap-1 px-2 py-1.5 relative transition-all ${isActive ? 'text-white' : 'text-white/30'}`}>
                <div className="relative">
                  <item.icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'text-indigo-400 scale-110' : ''}`} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-bold flex items-center justify-center">{item.badge > 9 ? '9+' : item.badge}</span>
                  )}
                </div>
                <span className={`text-[7px] font-black uppercase tracking-wider leading-none ${isActive ? 'text-white' : 'text-white/40'}`}>{item.label}</span>
                {isActive && <motion.div layoutId="bottomIndicator" className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-1 bg-indigo-500 rounded-full" />}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
