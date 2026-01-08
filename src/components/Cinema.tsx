"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  Upload,
  Link,
  Film,
  X,
  Rewind,
  FastForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

interface CinemaProps {
  onClose?: () => void;
}

export function Cinema({ onClose }: CinemaProps) {
  const [videoSource, setVideoSource] = useState<string>("");
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [urlInput, setUrlInput] = useState("");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  const hideControlsAfterDelay = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (!showSetup && isPlaying) {
        setControlsVisible(false);
      }
    }, 3000);
  }, [showSetup, isPlaying]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    hideControlsAfterDelay();
  }, [hideControlsAfterDelay]);

  useEffect(() => {
    if (!showSetup) {
      hideControlsAfterDelay();
    }
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [showSetup, hideControlsAfterDelay]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalFile(file);
      const url = URL.createObjectURL(file);
      setVideoSource(url);
      setShowSetup(false);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      setVideoSource(urlInput.trim());
      setShowSetup(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.volume = value[0];
      setVolume(value[0]);
      setIsMuted(value[0] === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!isFullscreen) {
        containerRef.current.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const changePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = newRate;
    }
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60);
    const secs = Math.floor(time % 60);
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const resetPlayer = () => {
    if (localFile && videoSource) {
      URL.revokeObjectURL(videoSource);
    }
    setVideoSource("");
    setLocalFile(null);
    setShowSetup(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setUrlInput("");
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    return () => {
      if (localFile && videoSource) {
        URL.revokeObjectURL(videoSource);
      }
    };
  }, [localFile, videoSource]);

  return (
    <div className="h-full flex flex-col">
      <AnimatePresence mode="wait">
        {showSetup ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-md space-y-8">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center mb-6">
                  <Film className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-black uppercase italic">Cinema Mode</h2>
                <p className="text-sm text-white/40">Upload a file or paste a video link</p>
              </div>

              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="video/*"
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-16 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 hover:from-purple-600/30 hover:to-indigo-600/30 rounded-2xl text-white font-bold uppercase tracking-wider"
                >
                  <Upload className="w-5 h-5 mr-3" />
                  Upload Local File
                </Button>

                <div className="relative flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <div className="space-y-3">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste video URL here..."
                    className="h-14 bg-white/5 border-white/10 rounded-xl text-white placeholder:text-white/30"
                    onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                  />
                  <Button
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim()}
                    className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    Load Video
                  </Button>
                </div>

                <p className="text-[10px] text-white/20 text-center uppercase tracking-wider">
                  Supports MP4, WebM, MOV and direct video URLs
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            ref={containerRef}
            className="flex-1 relative bg-black flex flex-col"
            onMouseMove={showControls}
            onClick={() => !controlsVisible && showControls()}
          >
            <video
              ref={videoRef}
              src={videoSource}
              className="flex-1 w-full object-contain bg-black"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
            />

            <AnimatePresence>
              {controlsVisible && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col justify-between pointer-events-none"
                >
                  <div className="p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={resetPlayer}
                          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20"
                        >
                          <X className="w-5 h-5" />
                        </Button>
                        <div className="truncate max-w-[200px] sm:max-w-md">
                          <p className="text-sm font-bold truncate">
                            {localFile?.name || "Video Stream"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={changePlaybackRate}
                        className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold"
                      >
                        {playbackRate}x
                      </Button>
                    </div>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                    <div className="flex items-center gap-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => skip(-10)}
                        className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/20"
                      >
                        <Rewind className="w-6 h-6" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={togglePlay}
                        className="h-20 w-20 rounded-full bg-white/20 hover:bg-white/30"
                      >
                        {isPlaying ? (
                          <Pause className="w-10 h-10" />
                        ) : (
                          <Play className="w-10 h-10 ml-1" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => skip(10)}
                        className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/20"
                      >
                        <FastForward className="w-6 h-6" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-white/60 w-16 text-right">
                        {formatTime(currentTime)}
                      </span>
                      <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={handleSeek}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono text-white/60 w-16">
                        {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleMute}
                          className="h-10 w-10 rounded-full hover:bg-white/10"
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="w-5 h-5" />
                          ) : (
                            <Volume2 className="w-5 h-5" />
                          )}
                        </Button>
                        <div className="w-24 hidden sm:block">
                          <Slider
                            value={[isMuted ? 0 : volume]}
                            max={1}
                            step={0.01}
                            onValueChange={handleVolumeChange}
                          />
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleFullscreen}
                        className="h-10 w-10 rounded-full hover:bg-white/10"
                      >
                        {isFullscreen ? (
                          <Minimize2 className="w-5 h-5" />
                        ) : (
                          <Maximize2 className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
