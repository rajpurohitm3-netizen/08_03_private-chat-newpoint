"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { 
  Video as VideoIcon, Phone, Maximize2, Minimize2, MicOff, Mic, PhoneOff, CameraOff, AlertTriangle, Shield, Globe, Zap, Camera, ShieldCheck, Volume2, VolumeX, SwitchCamera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { encryptMessage, decryptMessage, importPublicKey } from "@/lib/crypto";

interface VideoCallProps {
  contact: any;
  onClose: () => void;
  userId: string;
  privateKey: CryptoKey;
  callType: "video" | "voice";
  isInitiator?: boolean;
  incomingSignal?: any;
}

export function VideoCall({ 
  contact, 
  onClose, 
  userId, 
  privateKey,
  callType: initialCallType,
  isInitiator = true,
  incomingSignal
}: VideoCallProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(initialCallType === "voice");
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("Initializing...");
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const containerRef = useRef<HTMLDivElement>(null);
  
  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const hasAnswered = useRef(false);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionSet = useRef(false);
  const partnerPublicKeyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    if (myVideo.current && stream) {
      myVideo.current.srcObject = stream;
      myVideo.current.play().catch(e => console.error("My video play failed:", e));
    }
  }, [stream]);

  useEffect(() => {
    if (userVideo.current && remoteStream && initialCallType === "video") {
      userVideo.current.srcObject = remoteStream;
      userVideo.current.onloadedmetadata = () => {
        userVideo.current?.play().catch(e => console.error("Remote video play failed:", e));
      };
    }
    if (remoteAudio.current && remoteStream) {
      remoteAudio.current.srcObject = remoteStream;
      remoteAudio.current.onloadedmetadata = () => {
        remoteAudio.current?.play().catch(e => console.error("Remote audio play failed:", e));
      };
    }
  }, [remoteStream, initialCallType]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isConnecting) {
        setCallDuration((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isConnecting]);

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

  const createPeerConnection = useCallback((localStream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      ],
      iceCandidatePoolSize: 10,
    });

    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
      const [remoteStreamFromEvent] = event.streams;
      if (remoteStreamFromEvent) {
        setRemoteStream(remoteStreamFromEvent);
        if (event.track.kind === 'video') setHasRemoteVideo(true);
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
          call_mode: initialCallType
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        setIsConnecting(false);
        setConnectionStatus("Connected");
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        endCall();
      }
    };

    return pc;
  }, [userId, contact.id, initialCallType]);

  useEffect(() => {
    let isMounted = true;

    const startCall = async () => {
      try {
        if (contact.public_key) {
          partnerPublicKeyRef.current = await importPublicKey(contact.public_key);
        }

        const constraints = {
          video: initialCallType === "video" ? { facingMode: "user" } : false,
          audio: true
        };

        const localStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          localStream.getTracks().forEach(t => t.stop());
          return;
        }

        setStream(localStream);
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
            call_mode: initialCallType
          });
        } else if (incomingSignal) {
          // Decrypt incoming signal if it's already available
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
              call_mode: initialCallType
            });
          }
        }

        const channelId = [userId, contact.id].sort().join('-');
        const channel = supabase.channel(`call-${channelId}`)
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
        console.error(err);
        toast.error("Call setup failed. Check permissions.");
        onClose();
      }
    };

    startCall();
    return () => {
      isMounted = false;
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (peerConnection.current) peerConnection.current.close();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const endCall = async () => {
    try {
      await supabase.from("calls").insert({ caller_id: userId, receiver_id: contact.id, type: "end", signal_data: "{}" });
    } catch (e) {}
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (peerConnection.current) peerConnection.current.close();
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

  const toggleSpeaker = () => {
    if (userVideo.current) userVideo.current.muted = !userVideo.current.muted;
    if (remoteAudio.current) remoteAudio.current.muted = !remoteAudio.current.muted;
    setIsSpeakerOn(!isSpeakerOn);
  };

  const flipCamera = async () => {
    if (!stream) return;
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacingMode);
    try {
      stream.getVideoTracks().forEach(track => track.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (peerConnection.current) {
        const sender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
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

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed inset-0 z-[100] ${isMinimized ? 'pointer-events-none' : 'bg-black'}`}>
      <audio ref={remoteAudio} autoPlay playsInline />
      <motion.div 
        ref={containerRef}
        layout
        drag={isMinimized}
        dragElastic={0.1}
        dragMomentum={false}
        initial={false}
        animate={isMinimized ? {
          width: "140px", height: "200px", borderRadius: "1.5rem"
        } : {
          width: "100%", height: "100%", borderRadius: "0", x: 0, y: 0
        }}
        style={isMinimized ? {
          position: 'fixed', bottom: '100px', right: '16px', zIndex: 1000
        } : {}}
        className={`bg-zinc-950 overflow-hidden relative shadow-2xl pointer-events-auto ${isMinimized ? 'cursor-move border border-white/20' : ''}`}
      >
        {initialCallType === "video" && (
          <video ref={userVideo} autoPlay playsInline className={`w-full h-full object-cover ${(!remoteStream || !hasRemoteVideo) ? 'hidden' : 'block'}`} />
        )}
        {(!remoteStream || !hasRemoteVideo || initialCallType === "voice") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950">
            <div className="relative">
              <div className={`absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse ${isMinimized ? 'hidden' : 'block'}`} />
              <Avatar className={`${isMinimized ? 'h-16 w-16' : 'h-40 w-40'} border-4 border-indigo-500/30 relative z-10`}>
                <AvatarImage src={contact.avatar_url} />
                <AvatarFallback className={`${isMinimized ? 'text-xl' : 'text-4xl'} font-black bg-indigo-900/50`}>{contact.username?.substring(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            {!isMinimized && (
              <>
                <h2 className="text-3xl font-black italic mt-8 text-white uppercase tracking-tighter">{contact.username}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <p className="text-emerald-400 font-bold uppercase tracking-widest text-[8px]">E2E Encrypted</p>
                </div>
                <p className={`font-bold mt-2 uppercase tracking-widest text-[10px] ${isConnecting ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>{connectionStatus}</p>
                {!isConnecting && <p className="text-2xl font-black mt-4 font-mono text-white/40">{formatDuration(callDuration)}</p>}
              </>
            )}
          </div>
        )}
        {initialCallType === "video" && stream && !isMinimized && (
          <motion.div drag dragMomentum={false} dragElastic={0.1} dragConstraints={containerRef} className="absolute top-6 right-6 w-28 sm:w-36 md:w-44 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20 bg-black cursor-grab active:cursor-grabbing">
            <video ref={myVideo} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: facingMode === "user" ? 'scaleX(-1)' : 'none' }} />
            {isVideoOff && <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center"><CameraOff className="w-8 h-8 text-white/30" /></div>}
            <Button onClick={flipCamera} size="icon" className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-black/60 backdrop-blur-md hover:bg-black/80 border border-white/10"><SwitchCamera className="w-4 h-4 text-white" /></Button>
          </motion.div>
        )}
        <div className="absolute top-6 left-6 flex gap-2 z-40">
           <Button size="icon" variant="ghost" onClick={() => setIsMinimized(!isMinimized)} className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-md text-white/70 hover:bg-black/60 border border-white/5">{isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}</Button>
        </div>
        {!isMinimized && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-4 bg-black/60 backdrop-blur-xl p-4 md:p-5 rounded-[2rem] border border-white/10 z-30">
            <Button onClick={toggleMute} className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl transition-all ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>{isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</Button>
            <Button onClick={toggleSpeaker} className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl transition-all ${!isSpeakerOn ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>{isSpeakerOn ?<Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}</Button>
            {initialCallType === "video" && (
              <>
                <Button onClick={toggleVideo} className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl transition-all ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>{isVideoOff ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}</Button>
                <Button onClick={flipCamera} className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/10 text-white/60 hover:bg-white/20 transition-all"><SwitchCamera className="w-5 h-5" /></Button>
              </>
            )}
            <Button onClick={endCall} className="h-14 w-14 sm:h-16 sm:w-16 rounded-[1.5rem] bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/30"><PhoneOff className="w-6 h-6" /></Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
