"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import { Shield, Smartphone, CheckCircle, X, QrCode, Copy } from "lucide-react";
import { motion } from "motion/react";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

interface OTPVerificationProps {
  userId: string;
  userEmail: string;
  onVerified: () => void;
  onSkip: () => void;
  isSetup?: boolean;
}

export function OTPVerification({ userId, userEmail, onVerified, onSkip, isSetup = false }: OTPVerificationProps) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [showSetup, setShowSetup] = useState(isSetup);

  useEffect(() => {
    if (showSetup) {
      generateSecret();
    }
  }, [showSetup]);

  async function generateSecret() {
    const totp = new OTPAuth.TOTP({
      issuer: "Chatify",
      label: userEmail,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromHex(crypto.getRandomValues(new Uint8Array(20)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), ''))
    });

    const secretBase32 = totp.secret.base32;
    setSecret(secretBase32);

    const otpAuthUrl = totp.toString();
    const qrUrl = await QRCode.toDataURL(otpAuthUrl, { width: 200, margin: 2 });
    setQrCodeUrl(qrUrl);
  }

  async function handleVerify() {
    if (otp.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("otp_secret")
        .eq("id", userId)
        .single();

      const storedSecret = showSetup ? secret : profile?.otp_secret;

      if (!storedSecret) {
        toast.error("OTP not configured");
        setLoading(false);
        return;
      }

      const totp = new OTPAuth.TOTP({
        issuer: "Chatify",
        label: userEmail,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(storedSecret)
      });

      const delta = totp.validate({ token: otp, window: 1 });

      if (delta !== null) {
        if (showSetup) {
          await supabase.from("profiles").update({
            otp_secret: secret,
            otp_enabled: true
          }).eq("id", userId);
          toast.success("2FA enabled successfully!");
        } else {
          toast.success("Verified!");
        }
        onVerified();
      } else {
        toast.error("Invalid code. Please try again.");
      }
    } catch (error) {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  }

    async function copySecret() {
      try {
        const success = await copyToClipboard(secret);
        if (success) {
          toast.success("Secret copied to clipboard!");
        } else {
          toast.info("Please copy manually", { 
            description: secret,
            duration: 10000 
          });
        }
      } catch (err) {
        toast.info("Please copy manually", { description: secret });
      }
    }


  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-6 bg-[#030303] relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6"
          >
            <Shield className="w-8 h-8 text-emerald-400" />
          </motion.div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">
            {showSetup ? "Setup 2FA" : "Two-Factor Authentication"}
          </h1>
          <p className="text-sm text-zinc-500">
            {showSetup ? "Scan the QR code with Google Authenticator" : "Enter the code from your authenticator app"}
          </p>
        </div>

        <div className="bg-white/[0.02] border border-white/10 backdrop-blur-2xl rounded-[2rem] p-8 space-y-6">
          {showSetup && qrCodeUrl && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-2xl">
                  <img src={qrCodeUrl} alt="QR Code" className="w-[180px] h-[180px]" />
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold text-center">Or enter manually</p>
                <div className="flex items-center gap-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  <code className="flex-1 text-xs text-emerald-400 font-mono break-all">{secret}</code>
                  <button onClick={copySecret} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <Copy className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400">Enter 6-digit code</label>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="bg-white/[0.03] border-white/10 h-14 rounded-xl px-4 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder:text-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleVerify}
              disabled={loading || otp.length !== 6}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{showSetup ? "Enable 2FA" : "Verify"}</span>
                </div>
              )}
            </Button>

            {!isSetup && (
              <button
                onClick={onSkip}
                className="w-full py-3 text-sm text-zinc-500 hover:text-white transition-colors"
              >
                Skip for now
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-zinc-600">
          <Smartphone className="w-3 h-3 inline mr-1" />
          Works with Google Authenticator, Authy, or any TOTP app
        </p>
      </motion.div>
    </div>
  );
}
