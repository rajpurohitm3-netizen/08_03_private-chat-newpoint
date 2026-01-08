"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Shirt, User as UserIcon, Palette, Image as ImageIcon, Footprints, GraduationCap, Glasses, Ghost } from "lucide-react";

const AVATAR_OPTIONS = {
  skin: ["#FFDBAC", "#F1C27D", "#E0AC69", "#8D5524", "#C68642"],
  backgrounds: [
    { id: "none", name: "Classic Dark", color: "bg-zinc-950" },
    { id: "neon", name: "Neon Pulse", color: "bg-gradient-to-br from-purple-900 via-indigo-900 to-black" },
    { id: "sunset", name: "Sunset Gold", color: "bg-gradient-to-br from-orange-500 via-red-600 to-purple-900" },
    { id: "ocean", name: "Deep Ocean", color: "bg-gradient-to-br from-blue-600 via-cyan-500 to-indigo-900" },
    { id: "forest", name: "Emerald Grove", color: "bg-gradient-to-br from-emerald-600 via-teal-800 to-black" },
    { id: "candy", name: "Cotton Candy", color: "bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-900" },
  ],
  poses: [
    { id: "standing", name: "Confident Standing" },
    { id: "wave", name: "Friendly Wave" },
    { id: "peace", name: "Peace Out" },
    { id: "cool", name: "Too Cool" },
    { id: "flex", name: "Flex Power" },
    { id: "dab", name: "Dab Style" },
    { id: "thinking", name: "Deep Thinker" },
  ],
  wear: [
    { id: "hoodie", name: "Street Hoodie", color: "#4f46e5" },
    { id: "tshirt", name: "Casual T-Shirt", color: "#dc2626" },
    { id: "suit", name: "Executive Suit", color: "#18181b" },
    { id: "jacket", name: "Leather Jacket", color: "#ca8a04" },
    { id: "kurta", name: "Royal Kurta", color: "#c2410c" },
    { id: "sari", name: "Silk Sari", color: "#be185d" },
    { id: "vest", name: "Sporty Vest", color: "#10b981" },
    { id: "dress", name: "Elegant Dress", color: "#8b5cf6" },
  ],
  bottoms: [
    { id: "jeans", name: "Classic Jeans", color: "#1e3a8a" },
    { id: "shorts", name: "Summer Shorts", color: "#374151" },
    { id: "sweats", name: "Comfy Sweats", color: "#4b5563" },
    { id: "cargo", name: "Cargo Pants", color: "#3f6212" },
    { id: "formal", name: "Formal Trousers", color: "#18181b" },
  ],
  hats: [
    { id: "none", name: "No Headwear" },
    { id: "cap", name: "Baseball Cap" },
    { id: "beanie", name: "Slouchy Beanie" },
    { id: "turban", name: "Royal Turban" },
    { id: "bucket", name: "Bucket Hat" },
    { id: "crown", name: "King Crown" },
  ],
  goggles: [
    { id: "none", name: "No Eyewear" },
    { id: "shades", name: "Classic Shades" },
    { id: "glasses", name: "Smart Glasses" },
    { id: "aviators", name: "Gold Aviators" },
    { id: "monocle", name: "Fancy Monocle" },
    { id: "virtual", name: "VR Headset" },
  ],
  shoes: [
    { id: "sneakers", name: "Tech Sneakers", color: "#ffffff" },
    { id: "boots", name: "Rugged Boots", color: "#422006" },
    { id: "loafers", name: "Classic Loafers", color: "#000000" },
    { id: "sandals", name: "Summer Sandals", color: "#78350f" },
  ],
  hairColor: ["#000000", "#4B2C20", "#B87333", "#D4AF37", "#FFFFFF"],
};

export function AvatarBuilder({ profile, onUpdate, onClose }: { profile: any; onUpdate: () => void; onClose: () => void }) {
  const [config, setConfig] = useState(() => {
    const defaults = {
      skin: "#FFDBAC",
      background: "neon",
      pose: "standing",
      wear: "hoodie",
      bottoms: "jeans",
      hat: "none",
      goggles: "none",
      shoes: "sneakers",
      hairColor: "#000000"
    };
    return profile.avatar_config ? { ...defaults, ...profile.avatar_config } : defaults;
  });
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_config: config, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
      
      if (error) throw error;
      toast.success("Avatar saved successfully");
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const bgClass = AVATAR_OPTIONS.backgrounds.find(b => b.id === config.background)?.color || "bg-zinc-950";
  const wearColor = AVATAR_OPTIONS.wear.find(w => w.id === config.wear)?.color || "#4f46e5";
  const bottomColor = AVATAR_OPTIONS.bottoms.find(b => b.id === config.bottoms)?.color || "#1e3a8a";

  const Hand = ({ x, y, rotation = 0, scale = 1 }: { x: number, y: number, rotation?: number, scale?: number }) => (
    <g transform={`translate(${x}, ${y}) rotate(${rotation}) scale(${scale})`}>
      <path d="M-8,-4 Q-12,0 -8,4 L4,4 Q8,4 8,0 L8,-4 Q8,-8 4,-8 L-4,-8 Q-8,-8 -8,-4" fill={config.skin} />
      <path d="M-6,-8 Q-7,-15 -4,-15 L-2,-15 Q0,-15 0,-8" fill={config.skin} />
      <path d="M0,-8 Q1,-18 4,-18 L6,-18 Q8,-18 8,-8" fill={config.skin} />
      <path d="M8,-8 Q9,-18 12,-18 L14,-18 Q16,-18 16,-8" fill={config.skin} />
      <path d="M16,-8 Q17,-16 20,-16 L22,-16 Q24,-16 24,-8" fill={config.skin} />
      <path d="M24,-8 Q25,-14 28,-14 L30,-14 Q32,-14 32,-8" fill={config.skin} />
    </g>
  );

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/90 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-5xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[85vh]">
        <div className={`flex-1 ${bgClass} flex flex-col items-center justify-center p-8 relative overflow-hidden transition-colors duration-500`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
          
          <div className="relative w-80 h-96 mb-8 group">
            <div className="absolute inset-0 bg-white/5 blur-[80px] rounded-full animate-pulse group-hover:bg-white/10 transition-all" />
            <div className="w-full h-full flex items-center justify-center relative drop-shadow-2xl">
              <svg viewBox="0 0 200 300" className="w-full h-full">
                <defs>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                    <feOffset dx="2" dy="2" result="offsetblur" />
                    <feComponentTransfer><feFuncA type="linear" slope="0.4" /></feComponentTransfer>
                    <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                <g filter="url(#shadow)">
                  <path d="M75,200 Q70,225 65,260 Q75,265 85,260 Q80,230 85,200 Z" fill={config.skin} />
                  <path d="M125,200 Q130,225 135,260 Q125,265 115,260 Q120,230 115,200 Z" fill={config.skin} />
                  
                  {config.wear !== 'dress' && (
                    <g>
                      <path d="M70,180 Q65,210 60,255 L85,255 Q90,210 90,180 Z" fill={bottomColor} />
                      <path d="M110,180 Q115,210 120,255 L145,255 Q135,210 130,180 Z" fill={bottomColor} />
                      <path d="M72,225 L82,225" stroke="rgba(0,0,0,0.1)" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M118,225 L128,225" stroke="rgba(0,0,0,0.1)" strokeWidth="2.5" strokeLinecap="round" />
                    </g>
                  )}
                </g>
                
                <g transform="translate(0, 5)">
                  {config.shoes === 'sneakers' && (
                    <>
                      <path d="M55,255 Q55,270 85,270 L85,255 Z" fill="#fff" />
                      <path d="M115,255 L115,270 Q145,270 145,255 Z" fill="#fff" />
                    </>
                  )}
                  {config.shoes === 'boots' && (
                    <>
                      <path d="M55,250 L85,250 L85,275 L55,275 Z" fill="#422006" />
                      <path d="M115,250 L145,250 L145,275 L115,275 Z" fill="#422006" />
                    </>
                  )}
                  {config.shoes === 'loafers' && (
                    <>
                      <path d="M58,255 Q58,268 82,268 L82,255 Z" fill="#000" />
                      <path d="M118,255 L118,268 Q142,268 142,255 Z" fill="#000" />
                    </>
                  )}
                  {config.shoes === 'sandals' && (
                    <>
                      <path d="M55,265 L85,265 L85,270 L55,270 Z" fill="#78350f" />
                      <path d="M115,265 L145,265 L145,270 L115,270 Z" fill="#78350f" />
                    </>
                  )}
                </g>

                <path d="M60,130 Q100,115 140,130 L155,200 Q100,215 45,200 Z" fill={config.skin} filter="url(#shadow)" />

                {config.wear === 'dress' ? (
                  <path d="M60,130 Q100,110 140,130 L175,260 L25,260 Z" fill={wearColor} filter="url(#shadow)" />
                ) : (
                  <path d="M60,130 Q100,118 140,130 L155,200 Q100,215 45,200 Z" fill={wearColor} filter="url(#shadow)" />
                )}
                
                <g strokeWidth="14" strokeLinecap="round" fill="none" filter="url(#shadow)">
                  {config.pose === 'standing' && (
                    <>
                      <path d="M60,135 Q40,165 45,195" stroke={config.skin} />
                      <Hand x={45} y={205} rotation={180} scale={0.4} />
                      <path d="M140,135 Q160,165 155,195" stroke={config.skin} />
                      <Hand x={155} y={205} rotation={0} scale={0.4} />
                    </>
                  )}
                  {config.pose === 'wave' && (
                    <>
                      <path d="M60,135 Q40,165 45,195" stroke={config.skin} />
                      <Hand x={45} y={205} rotation={180} scale={0.4} />
                      <path d="M140,135 Q175,110 185,75" stroke={config.skin} />
                      <Hand x={185} y={65} rotation={-45} scale={0.5} />
                    </>
                  )}
                  {config.pose === 'peace' && (
                    <>
                      <path d="M60,135 Q40,165 45,195" stroke={config.skin} />
                      <Hand x={45} y={205} rotation={180} scale={0.4} />
                      <path d="M140,135 Q185,155 175,105" stroke={config.skin} />
                    </>
                  )}
                  {config.pose === 'cool' && (
                    <>
                      <path d="M60,135 Q25,155 50,175" stroke={config.skin} />
                      <Hand x={50} y={180} rotation={90} scale={0.4} />
                      <path d="M140,135 Q175,155 150,175" stroke={config.skin} />
                      <Hand x={150} y={180} rotation={-90} scale={0.4} />
                    </>
                  )}
                </g>

                <path d="M92,110 Q100,125 108,110 L108,125 Q100,130 92,125 Z" fill={config.skin} filter="url(#shadow)" />
                
                <g filter="url(#shadow)">
                  <circle cx="55" cy="75" r="8" fill={config.skin} />
                  <circle cx="145" cy="75" r="8" fill={config.skin} />
                  <path d="M60,75 Q60,125 100,125 Q140,125 140,75 Q140,25 100,25 Q60,25 60,75" fill={config.skin} />
                  
                  <path d="M55,70 Q100,-5 145,70 Q155,105 130,110 Q120,80 100,80 Q80,80 70,110 Q45,105 55,70" fill={config.hairColor} />

                  <g transform="translate(82, 75)">
                    <circle cx="0" cy="0" r="6" fill="#fff" />
                    <circle cx="1" cy="0" r="3" fill="#000" />
                  </g>
                  <g transform="translate(118, 75)">
                    <circle cx="0" cy="0" r="6" fill="#fff" />
                    <circle cx="-1" cy="0" r="3" fill="#000" />
                  </g>
                  
                  <path d="M97,90 Q100,98 103,90" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="2.5" strokeLinecap="round" />

                  {config.goggles === 'shades' && (
                    <g transform="translate(0, -2)">
                      <path d="M65,70 Q80,65 95,70 L95,85 Q80,95 65,85 Z" fill="#111" />
                      <path d="M105,70 Q120,65 135,70 L135,85 Q120,95 105,85 Z" fill="#111" />
                    </g>
                  )}
                  {config.goggles === 'glasses' && (
                    <g transform="translate(0, -2)">
                      <path d="M70,70 L95,70 L95,85 L70,85 Z" fill="none" stroke="#333" strokeWidth="2" />
                      <path d="M105,70 L130,70 L130,85 L105,85 Z" fill="none" stroke="#333" strokeWidth="2" />
                    </g>
                  )}

                  <path d="M85,108 Q100,120 115,108" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
                </g>

                <g filter="url(#shadow)">
                  {config.hat === 'cap' && <path d="M60,65 Q100,15 140,65" fill="#18181b" />}
                  {config.hat === 'beanie' && <path d="M55,70 Q100,-10 145,70 Q145,95 100,95 Q55,95 55,70" fill="#374151" />}
                </g>
              </svg>
            </div>
          </div>
          
          <div className="text-center z-10">
            <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white drop-shadow-lg">My Identity</h3>
          </div>
        </div>

        <div className="w-full md:w-[450px] bg-card border-l border-border flex flex-col">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h2 className="text-xl font-black uppercase italic flex items-center gap-2">
              <Ghost className="w-5 h-5 text-indigo-500" />
              Persona Lab
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <ImageIcon className="w-3 h-3" /> Background Aura
              </p>
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_OPTIONS.backgrounds.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setConfig({...config, background: b.id})}
                    className={`h-12 rounded-xl border-2 transition-all ${config.background === b.id ? "border-indigo-500 scale-105" : "border-transparent opacity-60 hover:opacity-100"} ${b.color}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <UserIcon className="w-3 h-3" /> Body Language
              </p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.poses.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setConfig({...config, pose: p.id})}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${config.pose === p.id ? "bg-indigo-600 border-indigo-500 text-white" : "bg-secondary border-border text-muted-foreground hover:border-indigo-500"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <Palette className="w-3 h-3" /> Skin Tone
                </p>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_OPTIONS.skin.map(s => (
                    <button
                      key={s}
                      onClick={() => setConfig({...config, skin: s})}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${config.skin === s ? "border-indigo-500 scale-110 shadow-lg shadow-indigo-500/20" : "border-transparent"}`}
                      style={{ backgroundColor: s }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <Palette className="w-3 h-3" /> Hair Style
                </p>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_OPTIONS.hairColor.map(h => (
                    <button
                      key={h}
                      onClick={() => setConfig({...config, hairColor: h})}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${config.hairColor === h ? "border-indigo-500 scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: h }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Shirt className="w-3 h-3" /> Upper Wear
              </p>
              <div className="grid grid-cols-2 gap-2">
                {AVATAR_OPTIONS.wear.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setConfig({...config, wear: w.id})}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${config.wear === w.id ? "bg-indigo-600/10 border-indigo-500 text-indigo-400" : "bg-secondary border-border text-muted-foreground hover:border-indigo-500"}`}
                  >
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: w.color }} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{w.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Shirt className="w-3 h-3" /> Lower Wear
              </p>
              <div className="grid grid-cols-2 gap-2">
                {AVATAR_OPTIONS.bottoms.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setConfig({...config, bottoms: b.id})}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${config.bottoms === b.id ? "bg-indigo-600/10 border-indigo-500 text-indigo-400" : "bg-secondary border-border text-muted-foreground hover:border-indigo-500"}`}
                  >
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Footprints className="w-3 h-3" /> Kicks
              </p>
              <div className="grid grid-cols-2 gap-2">
                {AVATAR_OPTIONS.shoes.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setConfig({...config, shoes: s.id})}
                    className={`p-3 rounded-xl border transition-all text-center ${config.shoes === s.id ? "bg-indigo-600/10 border-indigo-500 text-indigo-400" : "bg-secondary border-border text-muted-foreground hover:border-indigo-500"}`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-card border-t border-border flex gap-3">
            <Button variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] border border-border">Discard</Button>
            <Button onClick={handleSave} disabled={loading} className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 text-white">
              {loading ? "Syncing..." : "Save Identity"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
