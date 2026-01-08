"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
  import { 
    Lock, 
    Unlock, 
    Plus, 
    Image as ImageIcon, 
    Video as VideoIcon, 
    Music, 
    Trash2, 
    X, 
    ShieldCheck, 
    Eye, 
    EyeOff,
    Download,
    Loader2,
    FileIcon,
    Upload,
    AlertTriangle,
    Settings
  } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

interface SafeItem {
  id: string;
  type: 'photo' | 'video' | 'audio';
  file_url: string;
  file_name: string;
  created_at: string;
  metadata: any;
}

  export function PrivateSafe({ session, onClose }: { session: any; onClose: () => void }) {
    const [isLocked, setIsLocked] = useState(true);
    const [password, setPassword] = useState("");
    const [isSettingPassword, setIsSettingPassword] = useState(false);
    const [safeItems, setSafeItems] = useState<SafeItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showUploadConfirm, setShowUploadConfirm] = useState(false);
    const [uploadConfirmPassword, setUploadConfirmPassword] = useState("");
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [showRecreatePassword, setShowRecreatePassword] = useState(false);
    const [loginPassword, setLoginPassword] = useState("");
    const [newVaultPassword, setNewVaultPassword] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      checkSafeStatus();
    }, []);

    async function verifyLoginPassword(pass: string) {
      const { error } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: pass
      });
      return !error;
    }

    async function handleForgotPassword() {
      if (!loginPassword) {
        toast.error("Identity Verification Required: Enter Login Password");
        return;
      }

      setIsLoading(true);
      const isValid = await verifyLoginPassword(loginPassword);
      if (!isValid) {
        toast.error("Security Breach: Invalid Login Password");
        setIsLoading(false);
        return;
      }

      if (newVaultPassword.length < 6) {
        toast.error("Constraint Violation: Password too short (min 6 chars)");
        setIsLoading(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ vault_password: newVaultPassword })
        .eq("id", session.user.id);

      if (error) {
        toast.error("System Error: Failed to re-initialize vault");
      } else {
        toast.success("Identity Verified: Vault re-initialized");
        setShowForgotPassword(false);
        setLoginPassword("");
        setNewVaultPassword("");
        setPassword(newVaultPassword);
        setIsLocked(false);
        fetchSafeItems();
      }
      setIsLoading(false);
    }

    async function handleRecreatePassword() {
      if (!loginPassword) {
        toast.error("Identity Verification Required: Enter Login Password");
        return;
      }

      setIsLoading(true);
      const isValid = await verifyLoginPassword(loginPassword);
      if (!isValid) {
        toast.error("Security Breach: Invalid Login Password");
        setIsLoading(false);
        return;
      }

      if (newVaultPassword.length < 6) {
        toast.error("Constraint Violation: Password too short (min 6 chars)");
        setIsLoading(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ vault_password: newVaultPassword })
        .eq("id", session.user.id);

      if (error) {
        toast.error("System Error: Failed to update security layer");
      } else {
        toast.success("Security Layer Updated: New key established");
        setShowRecreatePassword(false);
        setLoginPassword("");
        setNewVaultPassword("");
        setPassword(newVaultPassword);
      }
      setIsLoading(false);
    }


  async function checkSafeStatus() {
    const { data, error } = await supabase
      .from("profiles")
      .select("vault_password")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error("Error checking status:", error);
      return;
    }

    if (!data.vault_password) {
      setIsSettingPassword(true);
      setIsLocked(false);
    }
  }

  async function handleSetPassword() {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ vault_password: password })
      .eq("id", session.user.id);

    if (error) {
      toast.error("Failed to set password");
    } else {
      toast.success("Password set successfully");
      setIsSettingPassword(false);
      fetchSafeItems();
    }
  }

  async function handleUnlock() {
    const { data, error } = await supabase
      .from("profiles")
      .select("vault_password")
      .eq("id", session.user.id)
      .single();

    if (data?.vault_password === password) {
      setIsLocked(false);
      fetchSafeItems();
      toast.success("Unlocked");
    } else {
      toast.error("Incorrect password");
    }
  }

  async function fetchSafeItems() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("vault_items")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch items");
    } else {
      setSafeItems(data as any[]);
    }
    setIsLoading(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setPendingFile(file);
    setShowUploadConfirm(true);
    setUploadConfirmPassword("");
  }

  async function confirmUpload() {
    if (!pendingFile) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("vault_password")
      .eq("id", session.user.id)
      .single();

    if (uploadConfirmPassword !== profile?.vault_password) {
      toast.error("Security Breach: Invalid Password. Upload aborted.");
      return;
    }

    setShowUploadConfirm(false);
    setIsUploading(true);
    
    try {
      const fileExt = pendingFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `vault/${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vault-media')
        .upload(filePath, pendingFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vault-media')
        .getPublicUrl(filePath);

      let type: 'photo' | 'video' | 'audio' = 'photo';
      if (pendingFile.type.startsWith('video/')) type = 'video';
      else if (pendingFile.type.startsWith('audio/')) type = 'audio';

      const { error: insertError } = await supabase
        .from("vault_items")
        .insert({
          user_id: session.user.id,
          type,
          file_url: publicUrl,
          file_name: pendingFile.name,
          metadata: { size: pendingFile.size, mimeType: pendingFile.type }
        });

      if (insertError) throw insertError;

      toast.success("Added successfully");
      fetchSafeItems();
    } catch (error: any) {
      toast.error("Failed to upload: " + error.message);
    } finally {
      setIsUploading(false);
      setPendingFile(null);
      setUploadConfirmPassword("");
    }
  }

  async function deleteItem(id: string, fileUrl: string) {
    const fileName = fileUrl.split('/').pop();
    const filePath = `vault/${session.user.id}/${fileName}`;

    const { error: storageError } = await supabase.storage
      .from('vault-media')
      .remove([filePath]);

    const { error: dbError } = await supabase
      .from("vault_items")
      .delete()
      .eq("id", id);

    if (dbError) {
      toast.error("Failed to delete");
    } else {
      setSafeItems(prev => prev.filter(item => item.id !== id));
      toast.success("Removed");
    }
  }

    if (isSettingPassword) {
      return (
        <div className="fixed inset-0 z-[110] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-8 bg-zinc-900/50 p-10 rounded-[3rem] border border-zinc-800 backdrop-blur-3xl relative overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />
            <div className="flex justify-center">
              <motion.div 
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="p-6 bg-indigo-500/10 rounded-full border border-indigo-500/20"
              >
                <ShieldCheck className="w-16 h-16 text-indigo-500" />
              </motion.div>
            </div>
            <div className="space-y-2 relative z-10">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Initialize Vault</h2>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Establish your encrypted media container</p>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="space-y-2">
                <p className="text-[9px] text-indigo-400 uppercase font-black tracking-[0.2em] text-left px-2">New Vault Key</p>
                <div className="relative group">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 bg-zinc-800/50 border-zinc-700 rounded-2xl px-6 focus:border-indigo-500/50 transition-all"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-indigo-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[9px] text-amber-500/50 uppercase font-black tracking-[0.2em] text-left px-2">Verify Identity</p>
                <Input 
                  type="password"
                  placeholder="Your Login Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="h-14 bg-zinc-800/50 border-zinc-700 rounded-2xl px-6 focus:border-amber-500/30 transition-all"
                />
              </div>
              <Button 
                onClick={async () => {
                  if (password.length < 6) {
                    toast.error("Constraint Violation: Password too short");
                    return;
                  }
                  setIsLoading(true);
                  const isValid = await verifyLoginPassword(loginPassword);
                  if (!isValid) {
                    toast.error("Access Denied: Invalid Login Password");
                    setIsLoading(false);
                    return;
                  }
                  handleSetPassword();
                  setIsLoading(false);
                }} 
                disabled={isLoading}
                className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-black uppercase tracking-[0.3em] text-[10px] shadow-xl shadow-indigo-900/20 active:scale-[0.98] transition-all"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Establish Node"}
              </Button>
              <Button variant="ghost" onClick={onClose} className="w-full text-zinc-600 font-black uppercase tracking-widest text-[9px] hover:text-white">Abort Setup</Button>
            </div>
          </div>
        </div>
      );
    }

    if (isLocked) {
      return (
        <div className="fixed inset-0 z-[110] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-8 bg-zinc-900/50 p-10 rounded-[3rem] border border-zinc-800 backdrop-blur-3xl">
            <div className="flex justify-center">
              <div className="p-6 bg-zinc-800 rounded-full">
                <Lock className="w-16 h-16 text-zinc-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold uppercase tracking-tight">Personal Safe</h2>
              <p className="text-zinc-500 text-sm font-semibold uppercase tracking-widest text-[10px]">Protected Layer</p>
            </div>
            <div className="space-y-4">
              <Input 
                type="password"
                placeholder="Enter Vault Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                className="h-14 bg-zinc-800 border-zinc-700 rounded-2xl px-6 text-center tracking-[0.5em]"
              />
              <Button onClick={handleUnlock} className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-900/20">Unlock Safe</Button>
              
              <div className="flex flex-col gap-2 pt-4">
                <button 
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
                >
                  Forgot Vault Password?
                </button>
                <Button variant="ghost" onClick={onClose} className="w-full text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Back to Dashboard</Button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showForgotPassword && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] space-y-8 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-amber-500/[0.02] pointer-events-none" />
                  <div className="text-center space-y-4 relative z-10">
                    <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 w-fit mx-auto">
                      <AlertTriangle className="w-10 h-10 text-amber-500" />
                    </div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Emergency Reset</h3>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Re-initialize vault access via identity verification</p>
                  </div>
                  <div className="space-y-6 relative z-10">
                    <div className="space-y-2">
                      <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em] text-left px-2">Identity Confirmation</p>
                      <Input 
                        type="password"
                        placeholder="Login Password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="h-14 bg-zinc-800/50 border-zinc-700 rounded-2xl px-6 focus:border-amber-500/30 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[9px] text-indigo-400 uppercase font-black tracking-[0.2em] text-left px-2">New Security Key</p>
                      <Input 
                        type="password"
                        placeholder="Min 6 characters"
                        value={newVaultPassword}
                        onChange={(e) => setNewVaultPassword(e.target.value)}
                        className="h-14 bg-zinc-800/50 border-zinc-700 rounded-2xl px-6 focus:border-indigo-500/30 transition-all"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="ghost" onClick={() => setShowForgotPassword(false)} className="flex-1 h-14 rounded-2xl uppercase font-black tracking-widest text-[9px] hover:text-white">Abort</Button>
                      <Button 
                        onClick={handleForgotPassword} 
                        disabled={isLoading}
                        className="flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 uppercase font-black tracking-widest text-[9px] shadow-lg shadow-indigo-900/20"
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Reset"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
            {showRecreatePassword && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6">
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] space-y-8 relative overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.1)]"
                >
                  <div className="absolute inset-0 bg-indigo-500/[0.03] pointer-events-none" />
                  <div className="text-center space-y-4 relative z-10">
                    <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 w-fit mx-auto">
                      <Settings className="w-10 h-10 text-indigo-500 animate-spin-slow" />
                    </div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Security Upgrade</h3>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Update your vault encryption key</p>
                  </div>
                  <div className="space-y-6 relative z-10">
                    <div className="space-y-2">
                      <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em] text-left px-2">Verify Identity</p>
                      <Input 
                        type="password"
                        placeholder="Login Password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="h-14 bg-zinc-800/50 border-zinc-700 rounded-2xl px-6 focus:border-indigo-500/30 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[9px] text-indigo-400 uppercase font-black tracking-[0.2em] text-left px-2">New Vault Key</p>
                      <Input 
                        type="password"
                        placeholder="Min 6 characters"
                        value={newVaultPassword}
                        onChange={(e) => setNewVaultPassword(e.target.value)}
                        className="h-14 bg-zinc-800/50 border-zinc-700 rounded-2xl px-6 focus:border-indigo-500/30 transition-all"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="ghost" onClick={() => setShowRecreatePassword(false)} className="flex-1 h-14 rounded-2xl uppercase font-black tracking-widest text-[9px] hover:text-white">Cancel</Button>
                      <Button 
                        onClick={handleRecreatePassword} 
                        disabled={isLoading}
                        className="flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 uppercase font-black tracking-widest text-[9px] shadow-lg shadow-indigo-900/20"
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Encryption"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

  return (
    <div className="fixed inset-0 z-[110] bg-zinc-950 flex flex-col font-sans">
      <div className="p-6 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-3xl flex items-center justify-between pt-12">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Private Safe</h2>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Secured Storage</p>
          </div>
        </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowRecreatePassword(true)}
              variant="ghost" 
              size="icon" 
              className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-indigo-400"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button 
              onClick={() => setIsLocked(true)} 
              variant="ghost" 
              size="icon" 
              className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            >
              <Lock className="w-5 h-5" />
            </Button>

          <Button 
            onClick={onClose} 
            variant="ghost" 
            size="icon" 
            className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-6xl mx-auto py-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="aspect-square rounded-3xl border-2 border-dashed border-zinc-800 hover:border-indigo-500 transition-all flex flex-col items-center justify-center gap-3 group bg-zinc-900/20"
              >
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                ) : (
                  <>
                    <div className="p-4 bg-zinc-900 rounded-2xl group-hover:scale-110 transition-transform">
                      <Plus className="w-8 h-8 text-zinc-500 group-hover:text-indigo-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-indigo-500">Add</span>
                  </>
                )}
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*,audio/*"
                onChange={handleFileUpload}
              />

              {safeItems.map((item) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={item.id} 
                  className="aspect-square rounded-3xl bg-zinc-900 border border-zinc-800 overflow-hidden relative group"
                >
                  {item.type === 'photo' && (
                    <img src={item.file_url} alt={item.file_name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  )}
                    {item.type === 'video' && (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <VideoIcon className="w-10 h-10 text-zinc-600" />
                        <div className="absolute inset-0 bg-black/20" />
                      </div>
                    )}

                  {item.type === 'audio' && (
                    <div className="w-full h-full bg-indigo-900/20 flex flex-col items-center justify-center p-4">
                      <Music className="w-10 h-10 text-indigo-500 mb-2" />
                      <p className="text-[8px] font-black text-center truncate w-full text-indigo-300 uppercase px-2">{item.file_name}</p>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button 
                      onClick={() => window.open(item.file_url, '_blank')}
                      size="icon" 
                      variant="ghost" 
                      className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      onClick={() => deleteItem(item.id, item.file_url)}
                      size="icon" 
                      variant="ghost" 
                      className="h-10 w-10 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-500 border border-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="absolute bottom-3 left-3">
                    {item.type === 'photo' && <ImageIcon className="w-4 h-4 text-white drop-shadow-lg" />}
                    {item.type === 'video' && <VideoIcon className="w-4 h-4 text-white drop-shadow-lg" />}
                    {item.type === 'audio' && <Music className="w-4 h-4 text-white drop-shadow-lg" />}
                  </div>
                </motion.div>
              ))}
            </div>

              {safeItems.length === 0 && !isLoading && (
                <div className="py-20 text-center opacity-30 flex flex-col items-center space-y-4">
                  <div className="p-10 rounded-full border-4 border-dashed border-zinc-800">
                    <ShieldCheck className="w-16 h-16" />
                  </div>
                  <div>
                    <p className="text-xl font-black uppercase italic">Empty</p>
                    <p className="text-xs font-bold uppercase tracking-widest mt-1">Add items using the plus button</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <AnimatePresence>
          {showUploadConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 space-y-6"
              >
                <div className="flex justify-center">
                  <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                    <AlertTriangle className="w-10 h-10 text-amber-500" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-black uppercase italic">Security Protocol</h3>
                  <p className="text-zinc-500 text-sm">Enter your Vault Password to authorize this media upload.</p>
                  {pendingFile && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mt-2">
                      File: {pendingFile.name}
                    </p>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter Password"
                      value={uploadConfirmPassword}
                      onChange={(e) => setUploadConfirmPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && confirmUpload()}
                      className="h-14 bg-zinc-800 border-zinc-700 rounded-2xl px-6 text-center tracking-widest"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setShowUploadConfirm(false);
                        setPendingFile(null);
                        setUploadConfirmPassword("");
                      }}
                      variant="ghost"
                      className="flex-1 h-14 rounded-2xl bg-zinc-800 hover:bg-zinc-700 font-black uppercase tracking-widest text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmUpload}
                      className="flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-900/20"
                    >
                      <Upload className="w-4 h-4 mr-2" /> Upload
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
