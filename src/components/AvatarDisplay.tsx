"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AvatarDisplay({ profile, className = "h-12 w-12" }: { profile: any; className?: string }) {
  if (!profile?.avatar_config) {
    return (
      <Avatar className={className}>
        <AvatarImage src={profile?.avatar_url} />
        <AvatarFallback className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white font-black uppercase tracking-tighter">
          {profile?.username?.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  }

  const config = profile.avatar_config;
  
  const backgrounds: Record<string, string> = {
    none: "bg-gradient-to-br from-zinc-900 to-zinc-950",
    neon: "bg-gradient-to-br from-purple-900 via-indigo-900 to-black",
    sunset: "bg-gradient-to-br from-orange-500 via-red-600 to-purple-900",
    ocean: "bg-gradient-to-br from-blue-600 via-cyan-500 to-indigo-900",
    forest: "bg-gradient-to-br from-emerald-600 via-teal-800 to-black",
    candy: "bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-900",
  };

  const skinTones: Record<string, { base: string; shadow: string; highlight: string }> = {
    "#FFDAB9": { base: "#FFDAB9", shadow: "#E8C4A0", highlight: "#FFE8D0" },
    "#DEB887": { base: "#DEB887", shadow: "#C4A06E", highlight: "#F0D4A8" },
    "#D2691E": { base: "#D2691E", shadow: "#A85218", highlight: "#E88040" },
    "#8B4513": { base: "#8B4513", shadow: "#6B3510", highlight: "#A55820" },
    "#4A2C2A": { base: "#4A2C2A", shadow: "#351F1E", highlight: "#5D3836" },
    "#2C1810": { base: "#2C1810", shadow: "#1A0E0A", highlight: "#3D2318" },
  };

  const getSkinColors = (skinColor: string) => {
    return skinTones[skinColor] || { base: skinColor, shadow: skinColor, highlight: skinColor };
  };

  const skin = getSkinColors(config.skin);

  const wearColors: Record<string, { main: string; accent: string; shadow: string }> = {
    hoodie: { main: "#4f46e5", accent: "#6366f1", shadow: "#3730a3" },
    tshirt: { main: "#dc2626", accent: "#ef4444", shadow: "#991b1b" },
    suit: { main: "#18181b", accent: "#27272a", shadow: "#0a0a0a" },
    jacket: { main: "#ca8a04", accent: "#eab308", shadow: "#a16207" },
    kurta: { main: "#c2410c", accent: "#ea580c", shadow: "#9a3412" },
    sari: { main: "#be185d", accent: "#db2777", shadow: "#9d174d" },
    vest: { main: "#10b981", accent: "#34d399", shadow: "#059669" },
    dress: { main: "#8b5cf6", accent: "#a78bfa", shadow: "#7c3aed" },
  };

  const bottomColors: Record<string, { main: string; shadow: string }> = {
    jeans: { main: "#1e3a8a", shadow: "#172554" },
    shorts: { main: "#374151", shadow: "#1f2937" },
    sweats: { main: "#4b5563", shadow: "#374151" },
    cargo: { main: "#3f6212", shadow: "#365314" },
    formal: { main: "#18181b", shadow: "#0a0a0a" },
  };

  const hairStyles: Record<string, { gradient: string[] }> = {
    "#1a1a1a": { gradient: ["#1a1a1a", "#0d0d0d", "#2a2a2a"] },
    "#4a3728": { gradient: ["#4a3728", "#3a2a1e", "#5a4738"] },
    "#8B4513": { gradient: ["#8B4513", "#6B3510", "#A55820"] },
    "#FFD700": { gradient: ["#FFD700", "#DAA520", "#FFE55C"] },
    "#FF6B6B": { gradient: ["#FF6B6B", "#FF5252", "#FF8A8A"] },
    "#4169E1": { gradient: ["#4169E1", "#2851C8", "#5A82FF"] },
  };

  const getHairColors = (hairColor: string) => {
    return hairStyles[hairColor] || { gradient: [hairColor, hairColor, hairColor] };
  };

  const bgClass = backgrounds[config.background] || "bg-gradient-to-br from-zinc-900 to-zinc-950";
  const wear = wearColors[config.wear] || wearColors.hoodie;
  const bottom = bottomColors[config.bottoms] || bottomColors.jeans;
  const hair = getHairColors(config.hairColor);

  return (
    <div className={`${className} rounded-full overflow-hidden relative shadow-2xl ring-2 ring-white/10 ${bgClass}`}>
      <svg viewBox="0 0 200 240" className="w-full h-full">
        <defs>
          <linearGradient id={`skinGrad-${profile.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={skin.highlight} />
            <stop offset="50%" stopColor={skin.base} />
            <stop offset="100%" stopColor={skin.shadow} />
          </linearGradient>
          <linearGradient id={`hairGrad-${profile.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={hair.gradient[2]} />
            <stop offset="50%" stopColor={hair.gradient[0]} />
            <stop offset="100%" stopColor={hair.gradient[1]} />
          </linearGradient>
          <linearGradient id={`wearGrad-${profile.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={wear.accent} />
            <stop offset="50%" stopColor={wear.main} />
            <stop offset="100%" stopColor={wear.shadow} />
          </linearGradient>
          <filter id={`softShadow-${profile.id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.3" />
          </filter>
          <radialGradient id={`faceGrad-${profile.id}`} cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor={skin.highlight} stopOpacity="0.6" />
            <stop offset="100%" stopColor={skin.base} stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="100" cy="200" rx="60" ry="50" fill={`url(#wearGrad-${profile.id})`} filter={`url(#softShadow-${profile.id})`} />
        
        {config.wear === 'hoodie' && (
          <>
            <ellipse cx="100" cy="190" rx="55" ry="45" fill={`url(#wearGrad-${profile.id})`} />
            <path d="M65,160 Q100,150 135,160 L140,200 Q100,190 60,200 Z" fill={wear.accent} opacity="0.5" />
            <ellipse cx="100" cy="160" rx="18" ry="12" fill={skin.base} />
          </>
        )}

        {config.wear === 'tshirt' && (
          <>
            <path d="M55,165 Q100,150 145,165 L150,220 Q100,210 50,220 Z" fill={`url(#wearGrad-${profile.id})`} />
            <ellipse cx="100" cy="162" rx="22" ry="10" fill={skin.base} />
          </>
        )}

        {config.wear === 'suit' && (
          <>
            <path d="M50,165 Q100,145 150,165 L155,230 Q100,220 45,230 Z" fill={`url(#wearGrad-${profile.id})`} />
            <path d="M85,165 L100,200 L115,165 L100,175 Z" fill="#f5f5f5" />
            <circle cx="100" cy="185" r="3" fill="#18181b" />
            <path d="M75,165 L85,165 L100,200 L95,200 Z" fill={wear.shadow} />
            <path d="M125,165 L115,165 L100,200 L105,200 Z" fill={wear.shadow} />
          </>
        )}

        {config.wear === 'dress' && (
          <path d="M60,165 Q100,145 140,165 Q160,250 100,260 Q40,250 60,165 Z" fill={`url(#wearGrad-${profile.id})`} />
        )}

        <path d="M90,152 Q100,165 110,152" fill={`url(#skinGrad-${profile.id})`} />
        <path d="M85,145 Q100,160 115,145 L115,155 Q100,165 85,155 Z" fill={`url(#skinGrad-${profile.id})`} />

        <g filter={`url(#softShadow-${profile.id})`}>
          <ellipse cx="100" cy="95" rx="50" ry="58" fill={`url(#skinGrad-${profile.id})`} />
          <ellipse cx="100" cy="95" rx="48" ry="56" fill={`url(#faceGrad-${profile.id})`} />
          
          <ellipse cx="52" cy="90" rx="8" ry="10" fill={`url(#skinGrad-${profile.id})`} />
          <ellipse cx="148" cy="90" rx="8" ry="10" fill={`url(#skinGrad-${profile.id})`} />
        </g>

        <g>
          <ellipse cx="100" cy="45" rx="52" ry="35" fill={`url(#hairGrad-${profile.id})`} />
          <path d="M48,55 Q55,95 65,115 Q75,80 60,60 Q52,50 48,55" fill={`url(#hairGrad-${profile.id})`} />
          <path d="M152,55 Q145,95 135,115 Q125,80 140,60 Q148,50 152,55" fill={`url(#hairGrad-${profile.id})`} />
          <ellipse cx="100" cy="35" rx="35" ry="18" fill={hair.gradient[2]} opacity="0.4" />
        </g>

        <g>
          <ellipse cx="75" cy="90" rx="12" ry="8" fill="white" />
          <ellipse cx="125" cy="90" rx="12" ry="8" fill="white" />
          
          <circle cx="77" cy="90" r="5" fill="#2C1810" />
          <circle cx="127" cy="90" r="5" fill="#2C1810" />
          
          <circle cx="78" cy="89" r="2" fill="white" />
          <circle cx="128" cy="89" r="2" fill="white" />
          
          <path d="M63,82 Q75,78 87,82" fill="none" stroke={skin.shadow} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M113,82 Q125,78 137,82" fill="none" stroke={skin.shadow} strokeWidth="2.5" strokeLinecap="round" />
        </g>

        <path d="M95,100 Q100,108 105,100" fill="none" stroke={skin.shadow} strokeWidth="2" strokeLinecap="round" />

        <path d="M85,120 Q100,130 115,120" fill="none" stroke={skin.shadow} strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="100" cy="122" rx="8" ry="2" fill="#FF9999" opacity="0.4" />

        <ellipse cx="65" cy="105" rx="8" ry="4" fill="#FFB6C1" opacity="0.3" />
        <ellipse cx="135" cy="105" rx="8" ry="4" fill="#FFB6C1" opacity="0.3" />

        {config.goggles === 'shades' && (
          <g>
            <rect x="58" y="82" width="30" height="20" rx="4" fill="#111" />
            <rect x="112" y="82" width="30" height="20" rx="4" fill="#111" />
            <path d="M88,90 L112,90" stroke="#111" strokeWidth="3" />
            <path d="M58,86 Q50,85 48,88" stroke="#111" strokeWidth="2" fill="none" />
            <path d="M142,86 Q150,85 152,88" stroke="#111" strokeWidth="2" fill="none" />
            <rect x="60" y="84" width="26" height="4" rx="2" fill="#333" opacity="0.3" />
            <rect x="114" y="84" width="26" height="4" rx="2" fill="#333" opacity="0.3" />
          </g>
        )}

        {config.goggles === 'glasses' && (
          <g>
            <rect x="60" y="82" width="28" height="22" rx="2" fill="none" stroke="#8B7355" strokeWidth="2" />
            <rect x="112" y="82" width="28" height="22" rx="2" fill="none" stroke="#8B7355" strokeWidth="2" />
            <path d="M88,90 L112,90" stroke="#8B7355" strokeWidth="2" />
            <path d="M60,88 Q50,86 48,90" stroke="#8B7355" strokeWidth="2" fill="none" />
            <path d="M140,88 Q150,86 152,90" stroke="#8B7355" strokeWidth="2" fill="none" />
          </g>
        )}

        {config.hat === 'cap' && (
          <g>
            <ellipse cx="100" cy="42" rx="55" ry="25" fill="#18181b" />
            <path d="M45,42 Q40,35 60,30 Q100,20 140,30 Q160,35 155,42 Q140,38 100,35 Q60,38 45,42" fill="#27272a" />
            <path d="M40,42 Q60,55 100,55 Q140,55 160,42 L165,50 Q140,60 100,60 Q60,60 35,50 Z" fill="#18181b" />
          </g>
        )}

        {config.hat === 'beanie' && (
          <g>
            <ellipse cx="100" cy="50" rx="52" ry="38" fill="#374151" />
            <ellipse cx="100" cy="55" rx="48" ry="30" fill="#4B5563" />
            <path d="M52,60 Q100,75 148,60" fill="none" stroke="#6B7280" strokeWidth="3" />
            <path d="M52,68 Q100,83 148,68" fill="none" stroke="#6B7280" strokeWidth="3" />
            <circle cx="100" cy="22" r="6" fill="#4B5563" />
          </g>
        )}
      </svg>
    </div>
  );
}
