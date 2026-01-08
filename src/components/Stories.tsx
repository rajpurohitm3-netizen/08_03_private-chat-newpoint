"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Camera, X, ChevronLeft, ChevronRight, Eye, Clock, 
  Radio, Loader2, ImageIcon, Play, Shield, ArrowLeft, Star, Save, CameraOff, SwitchCamera, Trash2
} from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface StoriesProps {
  userId: string;
}

export function Stories({ userId }: StoriesProps) {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStory, setActiveStory] = useState<any>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");
  
  // Camera stream handling to prevent black screen
  useEffect(() => {
    let active = true;
    if (showCamera && stream && videoRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      
      const playVideo = async () => {
        try {
          if (video.paused) {
            await video.play();
          }
        } catch (e) {
          console.error("Story camera play failed:", e);
        }
      };

      video.onloadedmetadata = () => {
        if (active) playVideo();
      };

      // Fallback if loadedmetadata already fired
      if (video.readyState >= 2 && active) {
        playVideo();
      }
    }
    return () => { active = false; };
  }, [showCamera, stream]);
  
  useEffect(() => {
    fetchStories();
    const interval = setInterval(fetchStories, 30000);
    
    const runCleanup = async () => {
      try {
        await fetch('/api/stories/cleanup', { method: 'POST' });
      } catch (e) {}
    };
    runCleanup();
    const cleanupInterval = setInterval(runCleanup, 5 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(cleanupInterval);
    };
  }, []);

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from("stories")
        .select("*, profiles(id, username, avatar_url)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      
      if (data) {
        // Fetch save counts
        const { data: saveData } = await supabase
          .from("story_saves")
          .select("story_id");

        const savesMap: Record<string, number> = {};
        saveData?.forEach(s => {
          savesMap[s.story_id] = (savesMap[s.story_id] || 0) + 1;
        });

        const grouped = data.reduce((acc: any[], story: any) => {
          const profile = story.profiles;
          if (!profile) return acc;

          const saveCount = savesMap[story.id] || 0;
          const existing = acc.find(g => g.user_id === story.user_id);
          if (existing) {
            existing.stories.push(story);
            existing.totalSaves += saveCount;
          } else {
            acc.push({
              user_id: story.user_id,
              profiles: profile,
              stories: [story],
              latestStory: story,
              totalSaves: saveCount
            });
          }
          return acc;
        }, []);
        setStories(grouped);
      }
    } catch (e) {
      console.error("Error fetching stories:", e);
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async (facingMode: "user" | "environment" = "user") => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setCameraFacingMode(facingMode);
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      setStream(s);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Camera access denied or failed");
    }
  };

  const flipCamera = async () => {
    const newFacingMode = cameraFacingMode === "user" ? "environment" : "user";
    await startCamera(newFacingMode);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const captureAndUpload = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setIsUploading(true);
      const fileName = `story-${Date.now()}.jpg`;
      const filePath = `stories/${userId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from("chat-media").upload(filePath, blob);
      if (uploadError) {
        toast.error("Upload failed");
        setIsUploading(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("chat-media").getPublicUrl(filePath);
      
      await supabase.from("stories").insert({
        user_id: userId,
        media_url: publicUrl,
        media_type: 'image',
        expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
      });
      
      toast.success("Story posted!");
      setIsUploading(false);
      stopCamera();
      fetchStories();
    }, 'image/jpeg');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `stories/${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from("chat-media").upload(filePath, file);
    if (uploadError) {
      toast.error("Upload failed");
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("chat-media").getPublicUrl(filePath);
    await supabase.from("stories").insert({
      user_id: userId,
      media_url: publicUrl,
      media_type: file.type.startsWith('video') ? 'video' : 'image',
      expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    });

    toast.success("Story posted!");
    setIsUploading(false);
    fetchStories();
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar no-scrollbar">
      <div className="flex-shrink-0 flex gap-2">
        <button 
          onClick={() => startCamera()}
          className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-indigo-600 to-purple-700 flex flex-col items-center justify-center gap-1.5 border border-white/20 shadow-xl hover:scale-105 transition-all"
        >
          <Camera className="w-6 h-6 text-white" />
          <span className="text-[7px] font-black uppercase tracking-widest text-white/70">Camera</span>
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-20 h-20 rounded-[2rem] bg-white/5 flex flex-col items-center justify-center gap-1.5 border border-white/10 hover:bg-white/10 transition-all"
        >
          <Plus className="w-6 h-6 text-white/40" />
          <span className="text-[7px] font-black uppercase tracking-widest text-white/30">Upload</span>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
        </button>
      </div>

      {loading ? (
        <div className="w-20 h-20 flex items-center justify-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
      ) : (
        stories.map((group) => (
          <div key={group.user_id} className="flex-shrink-0 flex flex-col items-center gap-2">
            <button 
              onClick={() => { setActiveStory(group); setActiveStoryIndex(0); }}
              className="relative w-20 h-20 p-1 rounded-[2rem] bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500"
            >
              <div className="w-full h-full rounded-[1.85rem] bg-[#030303] overflow-hidden">
                <img src={group.latestStory.media_url} className="w-full h-full object-cover opacity-80" alt="" />
              </div>
              {group.user_id === userId && group.totalSaves > 0 && (
                <div className="absolute -top-2 -right-2 bg-amber-500 text-black rounded-full px-2 py-1 text-[8px] font-black shadow-lg flex items-center gap-1">
                  <Star className="w-3 h-3 fill-black" /> {group.totalSaves}
                </div>
              )}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                <AvatarDisplay profile={group.profiles} className="w-8 h-8 ring-2 ring-[#030303]" />
              </div>
            </button>
            <span className="text-[9px] font-black uppercase tracking-tighter text-white/40 mt-3">{group.user_id === userId ? 'You' : group.profiles.username}</span>
          </div>
        ))
      )}

      <AnimatePresence>
        {showCamera && (
          <div className="fixed inset-0 z-[250] bg-black flex flex-col items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: cameraFacingMode === "user" ? 'scaleX(-1)' : 'none' }} />
            <div className="absolute bottom-10 flex gap-6 items-center">
              <Button onClick={stopCamera} variant="ghost" className="bg-white/10 rounded-full h-14 w-14"><X className="w-6 h-6 text-white" /></Button>
              <button onClick={captureAndUpload} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"><div className="w-14 h-14 rounded-full bg-white" /></button>
              <Button onClick={flipCamera} variant="ghost" className="bg-white/10 rounded-full h-14 w-14"><SwitchCamera className="w-6 h-6 text-white" /></Button>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeStory && (
          <StoryViewer 
            group={activeStory} 
            index={activeStoryIndex} 
            userId={userId}
            onClose={() => setActiveStory(null)} 
            onNext={() => {
              if (activeStoryIndex < activeStory.stories.length - 1) setActiveStoryIndex(activeStoryIndex + 1);
              else setActiveStory(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StoryViewer({ group, index, userId, onClose, onNext, onDelete }: any) {
  const story = group.stories[index];
  const [progress, setProgress] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isOwnStory = group.user_id === userId;

  useEffect(() => {
    setProgress(0);
    checkIfSaved();
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(timer); onNext(); return 100; }
        return p + 1;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [index]);

  const checkIfSaved = async () => {
    const { data } = await supabase.from("story_saves").select("*").eq("story_id", story.id).eq("user_id", userId).single();
    setIsSaved(!!data);
  };

  const toggleSave = async () => {
    if (isSaved) {
      await supabase.from("story_saves").delete().eq("story_id", story.id).eq("user_id", userId);
      setIsSaved(false);
      toast.success("Removed from saved snapshots");
    } else {
      await supabase.from("story_saves").insert({ story_id: story.id, user_id: userId });
      setIsSaved(true);
      toast.success("Snapshot saved!", { icon: "⭐" });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await supabase.from("story_views").delete().eq("story_id", story.id);
      await supabase.from("story_saves").delete().eq("story_id", story.id);
      const { error } = await supabase.from("stories").delete().eq("id", story.id);
      if (error) throw error;
      toast.success("Story deleted!");
      onDelete?.(story.id);
      onClose();
    } catch (err: any) {
      toast.error("Failed to delete story");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
      <div className="w-full h-full max-w-lg relative bg-black flex flex-col">
        <div className="absolute top-0 left-0 right-0 p-6 z-20 space-y-4">
          <div className="flex gap-1">
            {group.stories.map((_: any, i: number) => (
              <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white" style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AvatarDisplay profile={group.profiles} className="w-10 h-10 ring-2 ring-white/20" />
              <div>
                <p className="font-black italic text-white uppercase text-sm">{group.profiles.username}</p>
                <p className="text-[9px] text-white/50 font-bold uppercase">{new Date(story.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 rounded-full"><X className="w-6 h-6 text-white" /></button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center relative">
          {story.media_type === 'video' ? <video src={story.media_url} autoPlay playsInline className="w-full h-full object-contain" /> : <img src={story.media_url} className="w-full h-full object-contain" alt="" />}
        </div>
        <div className="p-10 bg-gradient-to-t from-black to-transparent flex flex-col items-center gap-4">
          {isOwnStory && (
            <Button 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Trash2 className="w-5 h-5 mr-3" />}
              {isDeleting ? 'Deleting...' : 'Delete Story'}
            </Button>
          )}
          <Button onClick={toggleSave} className={`w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${isSaved ? 'bg-amber-500 text-black' : 'bg-white/10 text-white border border-white/10'}`}>
            <Star className={`w-5 h-5 mr-3 ${isSaved ? 'fill-black' : ''}`} />
            {isSaved ? 'Snapshot Saved' : 'Save Snapshot'}
          </Button>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 italic">Chatify Network</p>
        </div>
      </div>
    </motion.div>
  );
}
