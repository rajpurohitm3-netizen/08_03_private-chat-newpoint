"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Send, Plus, Camera, Image as ImageIcon, MapPin, 
    Video, Mic, X, Download, Shield, AlertTriangle,
    Eye, EyeOff, Save, Trash2, ShieldCheck, Lock,
    Sparkles, Zap, ChevronLeft, Phone, Check, CheckCheck, ArrowLeft,
    MoreVertical, Trash, Star, Heart, ThumbsUp, Smile, Frown, Meh,
    Volume2, VolumeX, Minimize2, Maximize2, CameraOff, SwitchCamera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AvatarDisplay } from "./AvatarDisplay";
import { sendPushNotification } from "@/hooks/usePushNotifications";
import { 
  generateAESKey, encryptWithAES, decryptWithAES, 
  encryptAESKeyForUser, decryptAESKeyWithUserPrivateKey, 
  importPublicKey, encryptBlob, decryptToBlob
} from "@/lib/crypto";

interface ChatProps {
  session: any;
  privateKey: CryptoKey;
  initialContact: any;
  isPartnerOnline?: boolean;
  onBack?: () => void;
  onInitiateCall: (contact: any, mode: "video" | "voice") => void;
  isFriend?: boolean;
  onSendFriendRequest?: (userId: string) => void;
}

export function Chat({ session, privateKey, initialContact, isPartnerOnline, onBack, onInitiateCall, isFriend = true, onSendFriendRequest }: ChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [myPublicKey, setMyPublicKey] = useState<CryptoKey | null>(null);
  const [partnerPresence, setPartnerPresence] = useState<{isOnline: boolean; isInChat: boolean; isTyping: boolean;}>({ isOnline: isPartnerOnline || false, isInChat: false, isTyping: false });
  const [showSnapshotView, setShowSnapshotView] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [autoDeleteMode, setAutoDeleteMode] = useState<string>("none");
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [blobUrls, setBlobUrls] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      blobUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [blobUrls]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("chat_settings")
        .select("disappearing_mode")
        .eq("user_id", session.user.id)
        .eq("contact_id", initialContact.id)
        .single();
      
      if (data) {
        setAutoDeleteMode(data.disappearing_mode || "none");
      } else {
        await supabase.from("chat_settings").insert({
          user_id: session.user.id,
          contact_id: initialContact.id,
          disappearing_mode: "none"
        });
      }
    };
    fetchSettings();

    const settingsChannel = supabase.channel(`settings-${session.user.id}-${initialContact.id}`)
      .on("postgres_changes", { 
        event: "UPDATE", 
        schema: "public", 
        table: "chat_settings",
        filter: `user_id=eq.${session.user.id},contact_id=eq.${initialContact.id}`
      }, (payload) => {
        setAutoDeleteMode(payload.new.disappearing_mode || "none");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, [session.user.id, initialContact.id]);

  const updateAutoDeleteMode = async (mode: string) => {
    setAutoDeleteMode(mode);
    setShowMenu(false);
    
    const updates = [
      { user_id: session.user.id, contact_id: initialContact.id, disappearing_mode: mode },
      { user_id: initialContact.id, contact_id: session.user.id, disappearing_mode: mode }
    ];

    await supabase.from("chat_settings").upsert(updates, { onConflict: "user_id,contact_id" });
    toast.success(`Auto-delete set to: ${mode}`);
  };

  useEffect(() => {
    async function initMyPublicKey() {
      const { data } = await supabase.from("profiles").select("public_key").eq("id", session.user.id).single();
      if (data?.public_key) {
        try {
          const key = await importPublicKey(data.public_key);
          setMyPublicKey(key);
        } catch (e) {
          console.error("Failed to import my public key", e);
        }
      }
    }
    initMyPublicKey();
  }, [session.user.id]);

  const decryptMessageContent = async (msg: any) => {
    try {
      if (!msg.encrypted_content) return "[Empty Signal]";
      
      let packet;
      try {
        packet = JSON.parse(msg.encrypted_content);
      } catch (e) {
        return msg.encrypted_content;
      }

      if (!packet.iv || !packet.content || !packet.keys) {
        return msg.encrypted_content;
      }

      const encryptedAESKey = packet.keys[session.user.id];
      if (!encryptedAESKey) {
        return "[Secure Signal: Key mismatch for current node]";
      }

      if (!privateKey) return "[Decrypting...]";

      const aesKey = await decryptAESKeyWithUserPrivateKey(encryptedAESKey, privateKey);
      if (!aesKey) return "[Secure Signal]";
      
      if (msg.media_type === "image" || msg.media_type === "snapshot") {
        if (!msg.media_url) return "[Media Missing]";
        
        const response = await fetch(msg.media_url);
        const encryptedArrayBuffer = await response.arrayBuffer();
        
        const mimeType = msg.media_type === "snapshot" ? "image/jpeg" : "image/*";
        const decryptedBlob = await decryptToBlob(encryptedArrayBuffer, packet.media_iv || packet.iv, aesKey, mimeType);
        if (!decryptedBlob) return "[Secure Signal]";
        const url = URL.createObjectURL(decryptedBlob);
        setBlobUrls(prev => new Set(prev).add(url));
        return url;
      }

      const decrypted = await decryptWithAES(packet.content, packet.iv, aesKey);
      return decrypted || "[Empty Signal]";
    } catch (e) {
      return "[Secure Signal]";
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${initialContact.id}),and(sender_id.eq.${initialContact.id},receiver_id.eq.${session.user.id})`)
        .order("created_at", { ascending: true });

      if (!error && data) {
        const decryptedMessages = await Promise.all(
          data.map(async msg => ({ 
            ...msg, 
            decrypted_content: await decryptMessageContent(msg) 
          }))
        );
        setMessages(decryptedMessages);
        
          const unviewed = data.filter(m => m.receiver_id === session.user.id && !m.is_viewed);
          if (unviewed.length > 0) {
            const now = new Date();
            const updates = unviewed.map(m => {
              const baseUpdate: any = { is_viewed: true, viewed_at: now.toISOString() };
              if (m.is_disappearing && m.disappearing_duration) {
                baseUpdate.expires_at = new Date(now.getTime() + m.disappearing_duration * 60 * 1000).toISOString();
              }
              return { id: m.id, ...baseUpdate };
            });

            for (const update of updates) {
              const { id, ...rest } = update;
              await supabase.from("messages").update(rest).eq("id", id);
            }
          }
      }
    } catch (err) {
      console.error("Fetch messages error:", err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const chatChannel = supabase.channel(`chat-${initialContact.id}`);
    
    chatChannel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        if ((payload.new.receiver_id === session.user.id && payload.new.sender_id === initialContact.id) ||
            (payload.new.sender_id === session.user.id && payload.new.receiver_id === initialContact.id)) {
          
          const decryptedContent = await decryptMessageContent(payload.new);
          const msg = { ...payload.new, decrypted_content: decryptedContent };
          
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

            if (payload.new.receiver_id === session.user.id) {
              const now = new Date();
              const update: any = { is_delivered: true, delivered_at: now.toISOString(), is_viewed: true, viewed_at: now.toISOString() };
              
              if (payload.new.is_disappearing && payload.new.disappearing_duration) {
                update.expires_at = new Date(now.getTime() + payload.new.disappearing_duration * 60 * 1000).toISOString();
              }
              
              await supabase.from("messages").update(update).eq("id", payload.new.id);
              
              if (payload.new.media_type === 'snapshot') {
                toast.info("Snapshot Received");
                setShowSnapshotView(msg);
              }
            }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, async (payload) => {
        if ((payload.new.sender_id === session.user.id && payload.new.receiver_id === initialContact.id) ||
            (payload.new.sender_id === initialContact.id && payload.new.receiver_id === session.user.id)) {
          const decryptedContent = await decryptMessageContent(payload.new);
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...payload.new, decrypted_content: decryptedContent } : m));
        }
      })
      .subscribe();

    const signalChannel = supabase.channel(`chat-signals-${initialContact.id}`);
    signalChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId === initialContact.id) {
          setPartnerPresence(prev => ({ ...prev, isTyping: payload.payload.isTyping }));
        }
      })
      .subscribe();

    return [chatChannel, signalChannel];
  };

  useEffect(() => {
    fetchMessages();
    const channels = subscribeToMessages();
    return () => { 
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [initialContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const broadcastTyping = (isTyping: boolean) => {
    const channel = supabase.channel(`chat-signals-${initialContact.id}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: session.user.id, isTyping }
    });
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      broadcastTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      broadcastTyping(false);
    }, 3000);
  };

  const sendMessage = async (mediaType: string = "text", mediaBlob: Blob | null = null) => {
    const textToSend = newMessage.trim();
    if (!textToSend && !mediaBlob) return;

    try {
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("public_key")
        .eq("id", initialContact.id)
        .single();
      
      if (!partnerProfile?.public_key) {
        toast.error("Partner node not synchronized. Encryption impossible.");
        return;
      }

      let currentMyPublicKey = myPublicKey;
      if (!currentMyPublicKey) {
        const { data: myProfile } = await supabase.from("profiles").select("public_key").eq("id", session.user.id).single();
        if (myProfile?.public_key) {
          currentMyPublicKey = await importPublicKey(myProfile.public_key);
          setMyPublicKey(currentMyPublicKey);
        }
      }

      if (!currentMyPublicKey) {
        toast.error("Your encryption keys are not ready.");
        return;
      }

      const aesKey = await generateAESKey();
      let mediaUrl = null;
      let mediaIv = null;

      if (mediaBlob) {
        const { encryptedBlob, iv } = await encryptBlob(mediaBlob, aesKey);
        mediaIv = iv;
        const fileName = `${mediaType}-${Date.now()}.enc`;
        const filePath = `chat/${session.user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("chat-media").upload(filePath, encryptedBlob);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("chat-media").getPublicUrl(filePath);
        mediaUrl = publicUrl;
      }

      const contentToEncrypt = textToSend || " ";
      const encrypted = await encryptWithAES(contentToEncrypt, aesKey);
      
      const partnerKey = await importPublicKey(partnerProfile.public_key);
      const encryptedKeyForPartner = await encryptAESKeyForUser(aesKey, partnerKey);
      const encryptedKeyForMe = await encryptAESKeyForUser(aesKey, currentMyPublicKey);

      const packet = JSON.stringify({ 
        iv: encrypted.iv, 
        content: encrypted.content, 
        media_iv: mediaIv,
        keys: { 
          [session.user.id]: encryptedKeyForMe, 
          [initialContact.id]: encryptedKeyForPartner 
        } 
      });

      const messageData: any = { 
        sender_id: session.user.id, 
        receiver_id: initialContact.id, 
        encrypted_content: packet, 
        media_type: mediaType, 
        media_url: mediaUrl, 
        is_viewed: false,
        is_view_once: autoDeleteMode === "view",
        is_disappearing: autoDeleteMode.endsWith("_view"),
        disappearing_duration: autoDeleteMode === "1m_view" ? 1 
          : autoDeleteMode === "1h_view" ? 60 
          : autoDeleteMode === "3h_view" ? 180 
          : null,
        expires_at: autoDeleteMode === "3h" 
          ? new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() 
          : autoDeleteMode === "1m"
          ? new Date(Date.now() + 60 * 1000).toISOString()
          : null
      };

      const { data, error } = await supabase.from("messages").insert(messageData).select();
      
      if (!error && data?.[0]) {
        let decryptedContent = contentToEncrypt;
        if (mediaBlob) {
           decryptedContent = URL.createObjectURL(mediaBlob);
           setBlobUrls(prev => new Set(prev).add(decryptedContent));
        }
        const sentMsg = { ...data[0], decrypted_content: decryptedContent };
        setMessages(prev => [...prev, sentMsg]);
        setNewMessage("");
        setShowOptions(false);
      }
    } catch (e) { 
      console.error("Send message error:", e);
      toast.error("Signal encryption failed"); 
    }
  };

  const startCamera = async () => {
    try {
      if (stream) stream.getTracks().forEach(track => track.stop());
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      setShowCamera(true);
    } catch (err) { toast.error("Camera access denied"); }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      await sendMessage("snapshot", blob);
      setShowCamera(false);
      if (stream) stream.getTracks().forEach(t => t.stop());
    }, 'image/jpeg');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;
    await sendMessage(type, file);
  };

  const openSnapshot = async (message: any) => {
    if (message.receiver_id === session.user.id && (message.view_count || 0) >= 2) { 
      toast.error("Signal purged"); 
      return; 
    }
    setShowSnapshotView(message);
    if (message.receiver_id === session.user.id) {
      const newViews = (message.view_count || 0) + 1;
      await supabase.from("messages").update({ view_count: newViews, is_viewed: newViews >= 2 }).eq("id", message.id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#030303] relative overflow-hidden">
      <header className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-3xl flex items-center justify-between px-6 z-20 shrink-0">
          <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack} className="text-white/20 hover:text-white mr-1 lg:hidden bg-white/5 rounded-xl border border-white/5"><ArrowLeft className="w-6 h-6" /></Button>
              <AvatarDisplay profile={initialContact} className="h-10 w-10 ring-2 ring-indigo-500/20" />
              <div>
                <h3 className="text-sm font-black italic tracking-tighter uppercase text-white">{initialContact.username}</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${partnerPresence.isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-white/10'}`} />
                  <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">{partnerPresence.isOnline ? 'Node Online' : 'Node Offline'}</p>
                </div>
              </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onInitiateCall(initialContact, "voice")} className="text-white/20 hover:text-white hover:bg-white/5 rounded-xl"><Phone className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onInitiateCall(initialContact, "video")} className="text-white/20 hover:text-white hover:bg-white/5 rounded-xl"><Video className="w-4 h-4" /></Button>
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)} className="text-white/20 hover:text-white hover:bg-white/5 rounded-xl"><MoreVertical className="w-4 h-4" /></Button>
                  <AnimatePresence>{showMenu && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 top-12 w-52 bg-zinc-900 border border-white/10 rounded-2xl p-2 shadow-2xl z-50">
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 px-3 py-2">Auto-Delete Protocol</p>
                      {[
                        { id: "none", label: "No Auto-Delete" }, 
                        { id: "view", label: "Immediate (After View)" }, 
                        { id: "1m_view", label: "1 Min After View" }, 
                        { id: "1h_view", label: "1 Hour After View" }, 
                        { id: "3h_view", label: "3 Hours After View" }
                      ].map(opt => (
                        <button key={opt.id} onClick={() => updateAutoDeleteMode(opt.id)} className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${autoDeleteMode === opt.id ? 'bg-indigo-600 text-white' : 'text-white/60 hover:bg-white/5'}`}>{opt.label}</button>
                      ))}
                    </motion.div>
                  )}</AnimatePresence>
            </div>
          </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin border-2 border-indigo-500 border-t-transparent rounded-full w-8 h-8" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-20 text-center">
            <ShieldCheck className="w-12 h-12 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">End-to-End Encrypted</p>
            <p className="text-[8px] font-bold uppercase tracking-[0.2em] mt-2">Matrix signals established</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === session.user.id;
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, x: isMe ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] flex flex-col ${isMe ? "items-end" : "items-start"} relative`}>
                  {msg.media_type === 'snapshot' ? (
                    <button onClick={() => openSnapshot(msg)} className="p-4 rounded-[2rem] border bg-purple-600/10 border-purple-500/30 flex items-center gap-3 hover:bg-purple-600/20 transition-all">
                      <Camera className="w-5 h-5 text-purple-400" />
                      <span className="text-[10px] font-black uppercase text-white">Secure Snapshot</span>
                    </button>
                  ) : msg.media_type === 'image' ? (
                    <img src={msg.decrypted_content} alt="" className="rounded-[2rem] border border-white/10 max-h-80 shadow-2xl" />
                  ) : (
                    <div className={`p-5 rounded-[2rem] text-sm font-medium leading-relaxed ${isMe ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/10" : "bg-white/[0.03] border border-white/5 text-white/90"}`}>
                      {msg.decrypted_content || "[Encrypted Signal]"}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2 px-2">
                    <span className="text-[7px] font-black uppercase tracking-widest text-white/10">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMe && (
                      <div className="flex items-center">
                        {msg.is_viewed ? (<CheckCheck className="w-2.5 h-2.5 text-blue-500" />) : (<CheckCheck className="w-2.5 h-2.5 text-white/20" />)}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        {partnerPresence.isTyping && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start items-end gap-3 mb-4">
            <AvatarDisplay profile={initialContact} className="h-8 w-8 ring-1 ring-white/10" />
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 flex gap-1.5 items-center shadow-inner">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-6 bg-black/40 backdrop-blur-3xl border-t border-white/5 shrink-0">
          <div className="flex items-center gap-3 relative">
            <Button variant="ghost" size="icon" onClick={() => setShowOptions(!showOptions)} className={`h-12 w-12 rounded-2xl transition-all ${showOptions ? 'bg-indigo-600 text-white rotate-45' : 'bg-white/5 text-white/20'}`}>
              <Plus className="w-6 h-6" />
            </Button>
            <input 
              value={newMessage} 
              onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }} 
              onKeyDown={(e) => e.key === "Enter" && sendMessage()} 
              placeholder="Type signal packet..." 
              className="flex-1 bg-white/[0.03] border border-white/10 rounded-[2rem] h-12 px-6 text-sm outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10" 
            />
            <Button 
              onClick={() => sendMessage()} 
              disabled={!newMessage.trim()} 
              className="h-12 w-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-20 transition-all active:scale-95"
            >
              <Send className="w-5 h-5" />
            </Button>
            <AnimatePresence>{showOptions && (
              <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }} className="absolute bottom-20 left-0 w-64 bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-4 shadow-2xl z-50 overflow-hidden">
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl cursor-pointer hover:bg-white/5 transition-all group">
                    <ImageIcon className="w-6 h-6 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-black uppercase text-white/40">Photo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "image")} />
                  </label>
                  <button onClick={() => startCamera()} className="flex flex-col items-center justify-center p-4 bg-purple-600/5 border border-purple-500/20 rounded-2xl hover:bg-purple-600/10 transition-all group">
                    <Camera className="w-6 h-6 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-black uppercase text-white/40">Snapshot</span>
                  </button>
                </div>
              </motion.div>
            )}</AnimatePresence>
          </div>
      </footer>

      <AnimatePresence>{showCamera && (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute bottom-10 flex gap-6 items-center">
            <Button onClick={() => { if(stream) stream.getTracks().forEach(t=>t.stop()); setShowCamera(false); }} variant="ghost" className="bg-white/10 hover:bg-white/20 rounded-full h-14 w-14">
              <X className="w-6 h-6 text-white" />
            </Button>
            <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform">
              <div className="w-14 h-14 rounded-full bg-white" />
            </button>
          </div>
        </div>
      )}</AnimatePresence>

      <AnimatePresence>{showSnapshotView && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl aspect-[3/4] bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
            <img src={showSnapshotView.decrypted_content} alt="" className="w-full h-full object-cover" />
            <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Secure Snapshot View</span>
              </div>
              <button onClick={() => setShowSnapshotView(null)} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}
