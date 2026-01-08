"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import {
  Video as VideoIcon,
  Phone,
  Maximize2,
  Minimize2,
  MicOff,
  Mic,
  PhoneOff,
  CameraOff,
  Camera,
  Volume2,
  VolumeX,
  SwitchCamera,
  Play,
  Pause,
  Film,
  Link,
  Upload,
  X,
  SkipBack,
  SkipForward,
  Settings,
  MonitorPlay,
  Users,
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Rewind,
  FastForward,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { encryptMessage, decryptMessage, importPublicKey } from "@/lib/crypto";

interface WatchPartyProps {
  contact: any;
  onClose: () => void;
  userId: string;
  privateKey: CryptoKey;
  isInitiator?: boolean;
  incomingSignal?: any;
}

export function WatchParty({ contact, onClose, userId, privateKey, isInitiator = true, incomingSignal }: WatchPartyProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("Initializing...");
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showVideoSetup, setShowVideoSetup] = useState(true);
  const [movieUrl, setMovieUrl] = useState("");
  const [localMovieFile, setLocalMovieFile] = useState<File | null>(null);
  const [localMovieUrl, setLocalMovieUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{id: string; text: string; sender: string; time: Date}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [receivingVideo, setReceivingVideo] = useState(false);
  const [videoReceiveProgress, setVideoReceiveProgress] = useState(0);
  const [totalVideoSize, setTotalVideoSize] = useState(0);
  const [sendingVideo, setSendingVideo] = useState(false);
  const [videoSendProgress, setVideoSendProgress] = useState(0);
  const [videosExpanded, setVideosExpanded] = useState(true);

  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const movieVideo = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const hasAnswered = useRef(false);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionSet = useRef(false);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const videoChunksRef = useRef<ArrayBuffer[]>([]);
  const expectedChunksRef = useRef<number>(0);
  const receivedChunksCountRef = useRef<number>(0);
  const partnerPublicKeyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    if (myVideo.current && stream) {
      myVideo.current.srcObject = stream;
      myVideo.current.play().catch((e) => console.error("My video play failed:", e));
    }
  }, [stream, showVideoSetup, videosExpanded]);

  useEffect(() => {
    if (remoteStream) {
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
        userVideo.current.onloadedmetadata = () => {
          userVideo.current?.play().catch((e) => console.error("Remote video play failed:", e));
        };
      }
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = remoteStream;
        remoteAudio.current.onloadedmetadata = () => {
          remoteAudio.current?.play().catch((e) => console.error("Remote audio play failed:", e));
        };
      }
      
      const updateVideoState = () => {
        const videoTracks = remoteStream.getVideoTracks();
        const hasVideo = videoTracks.length > 0 && videoTracks.some(track => track.enabled && !track.muted && track.readyState === 'live');
        setHasRemoteVideo(hasVideo);
      };

      updateVideoState();
      remoteStream.getVideoTracks().forEach(track => {
        track.onended = updateVideoState;
        track.onmute = updateVideoState;
        track.onunmute = updateVideoState;
      });
      remoteStream.onaddtrack = updateVideoState;
      remoteStream.onremovetrack = updateVideoState;
      
      return () => {
        remoteStream.getVideoTracks().forEach(track => {
          track.onended = null;
          track.onmute = null;
          track.onunmute = null;
        });
        remoteStream.onaddtrack = null;
        remoteStream.onremovetrack = null;
      };
    }
  }, [remoteStream, showVideoSetup, videosExpanded]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isConnecting) {
        setCallDuration((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isConnecting]);

  const hideControlsAfterDelay = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (!showVideoSetup && isPlaying) {
        setControlsVisible(false);
      }
    }, 4000);
  }, [showVideoSetup, isPlaying]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    hideControlsAfterDelay();
  }, [hideControlsAfterDelay]);

  useEffect(() => {
    if (!showVideoSetup) {
      hideControlsAfterDelay();
    }
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [showVideoSetup, hideControlsAfterDelay]);

  const encryptSignal = async (data: any) => {
    if (!partnerPublicKeyRef.current) {
      if (contact.public_key) {
        partnerPublicKeyRef.current = await importPublicKey(contact.public_key);
      } else {
        return JSON.stringify(data);
      }
    }
    try {
      const encrypted = await encryptMessage(JSON.stringify(data), partnerPublicKeyRef.current);
      return JSON.stringify({ encrypted });
    } catch (e) {
      console.error("Encryption failed", e);
      return JSON.stringify(data);
    }
  };

  const decryptSignal = async (signalStr: string) => {
    try {
      const parsed = JSON.parse(signalStr);
      if (parsed.encrypted) {
        const decrypted = await decryptMessage(parsed.encrypted, privateKey);
        return JSON.parse(decrypted);
      }
      return parsed;
    } catch (e) {
      console.error("Decryption failed", e);
      return JSON.parse(signalStr);
    }
  };

  const processQueuedCandidates = async (pc: RTCPeerConnection) => {
    while (iceCandidateQueue.current.length > 0) {
      const candidate = iceCandidateQueue.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Failed to add queued ICE candidate:", err);
        }
      }
    }
  };

  const sendSyncMessage = useCallback((action: string, data: any) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify({ action, ...data }));
    }
  }, []);

  const sendVideoFile = useCallback(async (file: File) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
      toast.error("Connection not ready. Please wait.");
      return;
    }
    
    setSendingVideo(true);
    setVideoSendProgress(0);
    
    const CHUNK_SIZE = 16384;
    const arrayBuffer = await file.arrayBuffer();
    const totalChunks = Math.ceil(arrayBuffer.byteLength / CHUNK_SIZE);
    
    sendSyncMessage("videoStart", { 
      totalSize: arrayBuffer.byteLength, 
      totalChunks, 
      fileName: file.name,
      fileType: file.type 
    });
    
    try {
      for (let i = 0; i < totalChunks; i++) {
        if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
          throw new Error("Connection closed");
        }
        
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, arrayBuffer.byteLength);
        const chunk = arrayBuffer.slice(start, end);
        
        while (dataChannelRef.current.bufferedAmount > 1024 * 1024) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        dataChannelRef.current.send(chunk);
        setVideoSendProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      
      sendSyncMessage("videoEnd", {});
      toast.success("Video shared with partner!");
    } catch (err) {
      console.error("Video transfer failed:", err);
      toast.error("Video sharing interrupted");
    } finally {
      setSendingVideo(false);
    }
  }, [sendSyncMessage]);

  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    if (event.data instanceof ArrayBuffer) {
      videoChunksRef.current.push(event.data);
      receivedChunksCountRef.current++;
      const progress = Math.round((receivedChunksCountRef.current / expectedChunksRef.current) * 100);
      setVideoReceiveProgress(progress);
      return;
    }
    
    try {
      const data = JSON.parse(event.data);
      if (data.action === "videoStart") {
        setReceivingVideo(true);
        setTotalVideoSize(data.totalSize);
        expectedChunksRef.current = data.totalChunks;
        videoChunksRef.current = [];
        receivedChunksCountRef.current = 0;
        setVideoReceiveProgress(0);
        toast.info(`Receiving video: ${data.fileName}`);
      } else if (data.action === "videoEnd") {
        const blob = new Blob(videoChunksRef.current, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        setLocalMovieUrl(url);
        setShowVideoSetup(false);
        setReceivingVideo(false);
        videoChunksRef.current = [];
        toast.success("Video received! Ready to play.");
      } else if (data.action === "play" && movieVideo.current) {
        movieVideo.current.currentTime = data.time;
        movieVideo.current.play().catch(e => console.error("Auto-play failed:", e));
        setIsPlaying(true);
      } else if (data.action === "pause" && movieVideo.current) {
        movieVideo.current.currentTime = data.time;
        movieVideo.current.pause();
        setIsPlaying(false);
      } else if (data.action === "seek" && movieVideo.current) {
        movieVideo.current.currentTime = data.time;
      } else if (data.action === "url" && data.url) {
        setMovieUrl(data.url);
        setShowVideoSetup(false);
      } else if (data.action === "chat" && data.message) {
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: data.message,
          sender: contact.username,
          time: new Date()
        }]);
      }
    } catch (e) {
      console.error("Failed to parse data channel message:", e);
    }
  }, [contact.username]);

  const createPeerConnection = useCallback(
    (localStream: MediaStream) => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
          { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
        ],
        iceCandidatePoolSize: 10,
      });

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      if (isInitiator) {
        const dataChannel = pc.createDataChannel("watchPartySync");
        dataChannel.onmessage = handleDataChannelMessage;
        dataChannelRef.current = dataChannel;
      }

      pc.ondatachannel = (event) => {
        const channel = event.channel;
        channel.onmessage = handleDataChannelMessage;
        dataChannelRef.current = channel;
      };

      pc.ontrack = (event) => {
        const [remoteStreamFromEvent] = event.streams;
        if (remoteStreamFromEvent) {
          setRemoteStream(remoteStreamFromEvent);
          if (event.track.kind === "video") setHasRemoteVideo(event.track.enabled);
          setIsConnecting(false);
          setConnectionStatus("Connected");
        }
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          const encryptedData = await encryptSignal({ candidate: event.candidate.toJSON() });
          await supabase.from("calls").insert({
            caller_id: userId,
            receiver_id: contact.id,
            signal_data: encryptedData,
            type: "candidate",
            call_mode: "watchparty",
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected") {
          setIsConnecting(false);
          setConnectionStatus("Connected");
        } else if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
          endCall();
        }
      };

      return pc;
    },
    [userId, contact.id, handleDataChannelMessage, isInitiator]
  );

  useEffect(() => {
    let isMounted = true;

    const startCall = async () => {
      try {
        if (contact.public_key) {
          partnerPublicKeyRef.current = await importPublicKey(contact.public_key);
        }

        const localStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });
        if (!isMounted) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }

        setStream(localStream);
        if (myVideo.current) myVideo.current.srcObject = localStream;

        const pc = createPeerConnection(localStream);
        peerConnection.current = pc;

        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          const encryptedData = await encryptSignal({ sdp: pc.localDescription });
          await supabase.from("calls").insert({
            caller_id: userId,
            receiver_id: contact.id,
            signal_data: encryptedData,
            type: "offer",
            call_mode: "watchparty",
          });
        } else if (incomingSignal) {
          const signal = await decryptSignal(JSON.stringify(incomingSignal));
          if (signal.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            remoteDescriptionSet.current = true;
            await processQueuedCandidates(pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            const encryptedData = await encryptSignal({ sdp: pc.localDescription });
            await supabase.from("calls").insert({
              caller_id: userId,
              receiver_id: contact.id,
              signal_data: encryptedData,
              type: "answer",
              call_mode: "watchparty",
            });
          }
        }

        const channelId = [userId, contact.id].sort().join("-");
        const channel = supabase
          .channel(`watchparty-${channelId}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls", filter: `receiver_id=eq.${userId}` }, async (payload) => {
            const data = payload.new;
            if (!peerConnection.current) return;
            const signalData = await decryptSignal(data.signal_data);

            if (data.type === "answer" && isInitiator && signalData.sdp && !hasAnswered.current) {
              hasAnswered.current = true;
              await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
              remoteDescriptionSet.current = true;
              await processQueuedCandidates(peerConnection.current);
            } else if (data.type === "candidate" && signalData.candidate) {
              if (remoteDescriptionSet.current) {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(signalData.candidate));
              } else {
                iceCandidateQueue.current.push(signalData.candidate);
              }
            } else if (data.type === "end") {
              endCall();
            }
          })
          .subscribe();
        channelRef.current = channel;
      } catch (err) {
        console.error("WatchParty setup failed:", err);
        toast.error("Call setup failed. Check permissions.");
        onClose();
      }
    };

    startCall();
    return () => {
      isMounted = false;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (peerConnection.current) peerConnection.current.close();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const endCall = async () => {
    try {
      await supabase.from("calls").insert({ caller_id: userId, receiver_id: contact.id, type: "end", signal_data: "{}" });
    } catch (e) {}
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (peerConnection.current) peerConnection.current.close();
    if (localMovieUrl) URL.revokeObjectURL(localMovieUrl);
    onClose();
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
      setIsMuted(!stream.getAudioTracks()[0].enabled);
    }
  };

  const toggleVideo = () => {
    if (stream && stream.getVideoTracks()[0]) {
      stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
      setIsVideoOff(!stream.getVideoTracks()[0].enabled);
    }
  };

  const flipCamera = async () => {
    if (!stream) return;
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacingMode);
    try {
      stream.getVideoTracks().forEach((track) => track.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (peerConnection.current) {
        const sender = peerConnection.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(newVideoTrack);
      }
      const audioTrack = stream.getAudioTracks()[0];
      const updatedStream = new MediaStream([newVideoTrack, audioTrack]);
      setStream(updatedStream);
      if (myVideo.current) myVideo.current.srcObject = updatedStream;
    } catch (err) {
      toast.error("Could not switch camera");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalMovieFile(file);
      const url = URL.createObjectURL(file);
      setLocalMovieUrl(url);
      setShowVideoSetup(false);
      sendVideoFile(file);
    }
  };

  const handleUrlSubmit = () => {
    if (movieUrl.trim()) {
      sendSyncMessage("url", { url: movieUrl });
      setShowVideoSetup(false);
    }
  };

  const handlePlayPause = () => {
    if (movieVideo.current) {
      if (isPlaying) {
        movieVideo.current.pause();
        sendSyncMessage("pause", { time: movieVideo.current.currentTime });
        setIsPlaying(false);
      } else {
        movieVideo.current.play().catch(e => console.error("Play failed:", e));
        sendSyncMessage("play", { time: movieVideo.current.currentTime });
        setIsPlaying(true);
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (movieVideo.current) {
      movieVideo.current.currentTime = value[0];
      sendSyncMessage("seek", { time: value[0] });
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (movieVideo.current) {
      movieVideo.current.volume = value[0];
      setVolume(value[0]);
    }
  };

  const handleTimeUpdate = () => {
    if (movieVideo.current) setCurrentTime(movieVideo.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (movieVideo.current) setDuration(movieVideo.current.duration);
  };

  const skip = (seconds: number) => {
    if (movieVideo.current) {
      const newTime = movieVideo.current.currentTime + seconds;
      movieVideo.current.currentTime = Math.max(0, Math.min(newTime, duration));
      sendSyncMessage("seek", { time: movieVideo.current.currentTime });
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const sendChatMessage = () => {
    if (chatInput.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        text: chatInput.trim(),
        sender: "me",
        time: new Date()
      };
      setChatMessages(prev => [...prev, newMessage]);
      sendSyncMessage("chat", { message: chatInput.trim() });
      setChatInput("");
    }
  };

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black"
      onClick={showControls}
      onMouseMove={showControls}
      onTouchStart={showControls}
    >
      <audio ref={remoteAudio} autoPlay playsInline />

        {showVideoSetup ? (
          <div className="absolute inset-0 flex flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 overflow-auto">
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-zinc-900/80 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex p-3 sm:p-4 bg-indigo-600/20 rounded-2xl mb-2 sm:mb-4">
                    <MonitorPlay className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter">Watch Party</h2>
                  <div className="flex items-center justify-center gap-2 mb-2 sm:mb-4">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <p className="text-emerald-400 font-bold uppercase tracking-widest text-[8px]">E2E Encrypted</p>
                  </div>
                  <p className="text-xs sm:text-sm text-white/40 font-medium">
                    {isInitiator 
                      ? `Select a movie to watch together with ${contact.username}`
                      : `Waiting for ${contact.username} to select a movie...`
                    }
                  </p>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 rounded-2xl border border-white/5">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-emerald-500/50">
                    <AvatarImage src={contact.avatar_url} />
                    <AvatarFallback className="bg-indigo-900/50 font-black text-sm">
                      {contact.username?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-black uppercase text-xs sm:text-sm truncate">{contact.username}</p>
                    <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isConnecting ? "text-amber-400" : "text-emerald-400"}`}>
                      {connectionStatus}
                    </p>
                  </div>
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white/20 shrink-0" />
                </div>

                {receivingVideo ? (
                  <div className="space-y-4">
                    <div className="text-center space-y-2">
                      <div className="inline-flex p-3 bg-indigo-600/20 rounded-xl animate-pulse">
                        <Film className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400" />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-white/60">Receiving video from {contact.username}...</p>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 sm:h-3 overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${videoReceiveProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-center text-[10px] sm:text-xs font-bold text-white/40">{videoReceiveProgress}% received</p>
                  </div>
                ) : sendingVideo ? (
                  <div className="space-y-4">
                    <div className="text-center space-y-2">
                      <div className="inline-flex p-3 bg-emerald-600/20 rounded-xl animate-pulse">
                        <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-white/60">Sending video to {contact.username}...</p>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 sm:h-3 overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${videoSendProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-center text-[10px] sm:text-xs font-bold text-white/40">{videoSendProgress}% sent</p>
                  </div>
                ) : isInitiator ? (
                  <div className="space-y-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isConnecting}
                      className="w-full h-12 sm:h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-widest gap-2 sm:gap-3 disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                      Upload Local File
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-zinc-900 px-4 text-white/30 font-bold tracking-widest text-[10px]">OR</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Link className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <Input
                          placeholder="Paste video URL..."
                          value={movieUrl}
                          onChange={(e) => setMovieUrl(e.target.value)}
                          className="pl-10 sm:pl-12 h-12 sm:h-14 bg-white/5 border-white/10 rounded-2xl text-sm"
                        />
                      </div>
                      <Button
                        onClick={handleUrlSubmit}
                        disabled={!movieUrl.trim() || isConnecting}
                        className="h-12 sm:h-14 px-6 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-black uppercase text-xs"
                      >
                        Play
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-center py-6 sm:py-8">
                    <div className="inline-flex p-3 sm:p-4 bg-white/5 rounded-2xl animate-pulse">
                      <Film className="w-10 h-10 sm:w-12 sm:h-12 text-white/30" />
                    </div>
                    <p className="text-xs sm:text-sm text-white/40 font-medium">
                      {isConnecting 
                        ? "Connecting to watch party..."
                        : `${contact.username} will select a video to watch together`
                      }
                    </p>
                  </div>
                )}

                <Button
                  onClick={endCall}
                  variant="ghost"
                  className="w-full h-10 sm:h-12 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-2xl font-bold uppercase text-[10px] sm:text-xs tracking-widest"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  Leave Party
                </Button>
              </motion.div>
            </div>

            <div className="flex justify-center gap-4 p-4 safe-area-bottom">
              {stream && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-24 sm:w-32 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black relative"
                >
                  <video
                    ref={myVideo}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
                  />
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 px-2 py-0.5 rounded-full">
                    <p className="text-[8px] font-bold text-white/60 uppercase">You</p>
                  </div>
                </motion.div>
              )}
              
              {remoteStream && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-24 sm:w-32 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl bg-black relative"
                >
                  {hasRemoteVideo ? (
                    <video ref={userVideo} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback className="bg-indigo-900/50 font-black text-xs sm:text-sm">
                          {contact.username?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 px-2 py-0.5 rounded-full">
                    <p className="text-[8px] font-bold text-white/60 uppercase truncate max-w-[60px]">{contact.username}</p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
      ) : (
        <>
          <video
            ref={movieVideo}
            src={localMovieUrl || movieUrl}
            className="w-full h-full object-contain bg-black"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            playsInline
          />

          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-20">
            <motion.div className="flex items-start gap-2" initial={false}>
              <AnimatePresence>
                {videosExpanded && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="w-20 sm:w-28 md:w-36 aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl bg-black relative"
                    >
                      {remoteStream && hasRemoteVideo ? (
                        <video ref={userVideo} autoPlay playsInline className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
                          <Avatar className="h-8 w-8 sm:h-12 sm:h-14 sm:w-14">
                            <AvatarImage src={contact.avatar_url} />
                            <AvatarFallback className="bg-indigo-900/50 font-black text-sm sm:text-lg">
                              {contact.username?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 px-1.5 sm:px-2 py-0.5 rounded-full">
                        <p className="text-[7px] sm:text-[8px] font-bold text-white/60 uppercase truncate max-w-[50px] sm:max-w-[80px]">{contact.username}</p>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="w-20 sm:w-28 md:w-36 aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black relative"
                    >
                      {stream && (
                        <video
                          ref={myVideo}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
                        />
                      )}
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 px-1.5 sm:px-2 py-0.5 rounded-full">
                        <p className="text-[7px] sm:text-[8px] font-bold text-white/60 uppercase">You</p>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <Button
                onClick={() => setVideosExpanded(!videosExpanded)}
                size="icon"
                variant="ghost"
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-black/60 hover:bg-black/80 text-white/60 hover:text-white shrink-0"
              >
                {videosExpanded ? <ChevronUp className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              </Button>
            </motion.div>
          </div>

          <AnimatePresence>
            {controlsVisible && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none"
              >
                <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 pointer-events-auto z-10">
                  <div className="bg-black/60 backdrop-blur-xl px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 flex items-center gap-2 sm:gap-3">
                    <Film className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-400" />
                    <span className="text-[10px] sm:text-xs font-bold text-white/60">Watch Party</span>
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                  <div className="flex items-center gap-3 sm:gap-6">
                    <Button onClick={() => skip(-10)} size="icon" variant="ghost" className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-white/10 hover:bg-white/20"><Rewind className="w-5 h-5 sm:w-6 sm:h-6" /></Button>
                    <Button onClick={handlePlayPause} size="icon" className="h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10">{isPlaying ? <Pause className="w-7 h-7 sm:w-10 sm:h-10" /> : <Play className="w-7 h-7 sm:w-10 sm:h-10 ml-1" />}</Button>
                    <Button onClick={() => skip(10)} size="icon" variant="ghost" className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-white/10 hover:bg-white/20"><FastForward className="w-5 h-5 sm:w-6 sm:h-6" /></Button>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 space-y-3 sm:space-y-4 pointer-events-auto safe-area-bottom">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <span className="text-[10px] sm:text-xs font-mono text-white/60 w-10 sm:w-16 text-right">{formatTime(currentTime)}</span>
                    <Slider value={[currentTime]} max={duration || 100} step={1} onValueChange={handleSeek} className="flex-1" />
                    <span className="text-[10px] sm:text-xs font-mono text-white/60 w-10 sm:w-16">{formatTime(duration)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button onClick={toggleMute} size="icon" variant="ghost" className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full ${isMuted ? "bg-red-500/20 text-red-400" : "text-white/60 hover:text-white hover:bg-white/10"}`}><MicOff className="w-4 h-4" /></Button>
                      <Button onClick={toggleVideo} size="icon" variant="ghost" className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full ${isVideoOff ? "bg-red-500/20 text-red-400" : "text-white/60 hover:text-white hover:bg-white/10"}`}><CameraOff className="w-4 h-4" /></Button>
                      <Button onClick={flipCamera} size="icon" variant="ghost" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full text-white/60 hover:text-white hover:bg-white/10"><SwitchCamera className="w-4 h-4" /></Button>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                      {isInitiator && <Button onClick={() => setShowVideoSetup(true)} size="icon" variant="ghost" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full text-white/60 hover:text-white hover:bg-white/10"><Film className="w-4 h-4" /></Button>}
                      <Button onClick={() => setShowChat(!showChat)} size="icon" variant="ghost" className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full ${showChat ? "bg-indigo-500/20 text-indigo-400" : "text-white/60 hover:text-white hover:bg-white/10"}`}><MessageCircle className="w-4 h-4" /></Button>
                      <Button onClick={toggleFullscreen} size="icon" variant="ghost" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full text-white/60 hover:text-white hover:bg-white/10 hidden sm:flex">{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</Button>
                      <Button onClick={endCall} size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-red-500 hover:bg-red-600 ml-1 sm:ml-2"><PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                className="absolute top-0 right-0 bottom-0 w-full sm:w-96 bg-black/95 backdrop-blur-xl border-l border-white/10 z-30 flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 safe-area-top">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                    <h3 className="font-black uppercase text-xs sm:text-sm tracking-wider">Chat</h3>
                  </div>
                  <Button onClick={() => setShowChat(false)} size="icon" variant="ghost" className="h-8 w-8 rounded-full text-white/60 hover:text-white"><X className="w-4 h-4" /></Button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 custom-scrollbar">
                  {chatMessages.map((msg) => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] px-3 sm:px-4 py-2 rounded-2xl ${msg.sender === "me" ? "bg-indigo-600 text-white rounded-br-md" : "bg-white/10 text-white rounded-bl-md"}`}>
                        {msg.sender !== "me" && <p className="text-[9px] sm:text-[10px] font-bold text-indigo-400 uppercase mb-1">{msg.sender}</p>}
                        <p className="text-xs sm:text-sm">{msg.text}</p>
                        <p className="text-[8px] sm:text-[9px] opacity-50 mt-1 text-right">{msg.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-3 sm:p-4 border-t border-white/10 safe-area-bottom">
                  <div className="flex gap-2">
                    <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChatMessage()} placeholder="Type a message..." className="flex-1 h-10 sm:h-12 bg-white/5 border-white/10 rounded-xl sm:rounded-2xl text-xs sm:text-sm" />
                    <Button onClick={sendChatMessage} disabled={!chatInput.trim()} size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700"><Send className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
