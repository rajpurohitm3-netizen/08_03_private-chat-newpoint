"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Share, MoreVertical } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches 
      || (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) return;

    const dismissed = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    if (isIOSDevice && !isInStandaloneMode) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:max-w-sm"
      >
        <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-600/20 rounded-xl border border-indigo-500/30">
              <Smartphone className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="flex-1 pr-6">
              <h3 className="text-white font-semibold text-sm mb-1">
                Install Chatify
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                {isIOS 
                  ? "Tap Share and then 'Add to Home Screen' for the best experience"
                  : "Install app for faster access and offline support"
                }
              </p>
            </div>
          </div>

          {isIOS ? (
            <div className="mt-4 flex items-center justify-center gap-2 py-2 px-3 bg-white/5 rounded-xl">
              <span className="text-zinc-400 text-xs">Tap</span>
              <Share className="w-4 h-4 text-indigo-400" />
              <span className="text-zinc-400 text-xs">then</span>
              <span className="text-white text-xs font-medium">"Add to Home Screen"</span>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 px-4 rounded-xl text-zinc-400 text-xs font-medium hover:bg-white/5 transition-colors"
              >
                Not now
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Install
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
