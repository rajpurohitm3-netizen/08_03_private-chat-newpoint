"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AvatarDisplay } from "./AvatarDisplay";
import { Button } from "@/components/ui/button";
import { MessageSquare, Info, ShieldCheck, Flame, Globe, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProfilePopupProps {
  profile: any;
  children: React.ReactNode;
  onMessage?: () => void;
  onViewProfile?: () => void;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export function ProfilePopup({
  profile,
  children,
  onMessage,
  onViewProfile,
  side = "right",
  align = "start",
}: ProfilePopupProps) {
  if (!profile) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-72 p-0 bg-background/80 backdrop-blur-2xl border-2 border-indigo-500/20 rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(79,70,229,0.2)] z-[100] animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="relative h-28 overflow-hidden">
          <div className="absolute inset-0 bg-indigo-600">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent)]" />
             <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          </div>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <AvatarDisplay
                profile={profile}
                className="h-20 w-20 border-4 border-background shadow-2xl rounded-3xl"
              />
            </motion.div>
          </div>
        </div>
        <div className="pt-12 pb-8 px-6 text-center space-y-5">
          <div>
            <div className="flex items-center justify-center gap-2">
              <p className="font-black text-xl italic tracking-tighter uppercase text-foreground">{profile.username}</p>
              {profile.is_admin && <ShieldCheck className="w-4 h-4 text-indigo-400" />}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-1">
              Member ID: {profile.id?.slice(0, 8)}
            </p>
          </div>

          <div className="flex justify-center gap-4 py-1">
             <div className="flex flex-col items-center">
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">{profile.streak_count || 0}</p>
                <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Streak</p>
             </div>
             <div className="h-4 w-px bg-border/50" />
             <div className="flex flex-col items-center">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active</p>
                <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Status</p>
             </div>
          </div>

          {profile.bio && (
            <div className="p-3 bg-secondary/30 rounded-2xl border border-border/50">
              <p className="text-[11px] italic text-muted-foreground leading-relaxed font-medium">
                "{profile.bio}"
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onMessage?.();
              }}
              className="bg-indigo-600 hover:bg-indigo-700 h-11 rounded-xl font-black uppercase tracking-widest text-[9px] text-white shadow-lg shadow-indigo-600/20"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-2" /> Signal
            </Button>
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile?.();
              }}
              className="h-11 rounded-xl bg-secondary hover:bg-secondary/80 font-black uppercase tracking-widest text-[9px]"
            >
              <User className="w-3.5 h-3.5 mr-2" /> Identity
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
