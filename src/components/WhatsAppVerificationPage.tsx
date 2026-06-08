import React, { useState, useEffect } from "react";
import { UserProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Phone, Key, Loader2, LogOut, ShieldCheck, Sparkles, MessageSquare, Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppVerificationPageProps {
  user: UserProfile;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  onLogout: () => void;
}

export default function WhatsAppVerificationPage({
  user,
  updateProfile,
  onLogout,
}: WhatsAppVerificationPageProps) {
  const handleRegisterWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waNumber) {
      toast.error("Silakan masukkan nomor WhatsApp Anda.");
      return;
    }
    
    setIsVerifying(true);
    try {
      await updateProfile({
        whatsapp: waNumber,
        waVerified: true,
        tier: 2,
        aiUsageCount: 0,
      });
      setIsSuccess(true);
      toast.success("WhatsApp berhasil disimpan!", {
        description: "Selamat datang di Ecosystem Tier 2.",
      });
      
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      console.error("Error updating profile with waVerified:", error);
      toast.error("Gagal memperbarui data.");
      setIsVerifying(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center p-4 font-sans">
        <Card className="w-full max-w-md border border-white/60 rounded-[2rem] bg-white/70 backdrop-blur-md shadow-[10px_10px_30px_#cbd5e1,-10px_-10px_30px_#ffffff] overflow-hidden transition-all duration-500 transform scale-[1.01]">
          <div className="bg-[#FF6B00] text-white p-8 text-center space-y-4 shadow-sm">
            <div className="w-18 h-18 bg-white/15 rounded-full flex items-center justify-center mx-auto border border-white/10 backdrop-blur-sm animate-bounce shadow-md">
              <ShieldCheck className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-campton-book font-bold tracking-tight">Onboarding Success!</h2>
            <p className="text-[10px] font-avenir-medium uppercase tracking-widest text-[#FFF2EA]">Selamat datang di TBJ Constech Ecosystem</p>
          </div>
          <div className="p-8 space-y-6">
            <div className="p-6 bg-white/95 border border-[#FF6B00]/10 rounded-2xl flex flex-col items-center justify-center text-center shadow-[4px_4px_15px_rgba(255,107,0,0.05)]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#FF6B00]" />
                <span className="text-[10px] font-avenir-medium text-neutral-400 uppercase tracking-widest">Free Trial Token</span>
              </div>
              <p className="text-5xl font-campton-book font-black text-neutral-800">10</p>
              <p className="text-[10px] font-avenir-medium uppercase tracking-widest text-[#FF6B00] mt-1.5 font-bold">Free AI Analysis Token</p>
            </div>
            <div className="pt-2">
              <div className="flex items-center justify-center gap-2 text-[9px] font-avenir-medium uppercase tracking-[0.14em] text-neutral-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF6B00]" />
                <span>Redirecting...</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md border border-white/60 rounded-[2rem] bg-white/70 backdrop-blur-md shadow-[10px_10px_30px_#cbd5e1,-10px_-10px_30px_#ffffff] overflow-hidden">
        <div className="bg-neutral-900/95 text-white p-5 flex justify-between items-center border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FF6B00] flex items-center justify-center border border-white/10">
              <span className="font-campton-book font-bold text-xs text-white">TBJ</span>
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xs font-campton-book font-bold uppercase tracking-wide">TBJ Constech OS</h2>
              <p className="text-[7.5px] font-mono text-neutral-400 tracking-wider">ONBOARDING v4.0</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout}
            className="text-[9px] font-avenir-medium uppercase tracking-wider text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg h-8 border border-neutral-800"
          >
            <LogOut className="w-3 h-3 mr-1" /> Keluar
          </Button>
        </div>

        <CardHeader className="space-y-2.5 p-8 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 border border-[#FF6B00]/10 rounded-full self-start">
            <Sparkles className="w-3 h-3 text-[#FF6B00]" />
            <span className="text-[9px] font-avenir-medium uppercase text-[#FF6B00] tracking-widest font-bold">Onboarding</span>
          </div>
          <CardTitle className="text-2xl md:text-3xl font-campton-book font-bold tracking-tight text-neutral-800">
            Lengkapi Profil WhatsApp
          </CardTitle>
          <CardDescription className="text-xs font-avenir-medium text-neutral-500 leading-relaxed uppercase-soft pt-1">
            Silakan masukkan nomor WhatsApp aktif Anda untuk mengaktifkan akses Tier 2.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 pt-0 space-y-6">
          <form onSubmit={handleRegisterWhatsApp} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[9.5px] font-avenir-medium uppercase tracking-widest text-[#FF6B00] font-bold">Nomor WhatsApp</Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 border-r border-neutral-100 pr-3 pointer-events-none text-neutral-400 text-xs font-bold">
                  <Phone className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span className="text-neutral-500 font-mono text-[11px]">+62</span>
                </div>
                <Input 
                  type="tel"
                  placeholder="Masukkan nomor WhatsApp Anda" 
                  className="pl-18 h-12 border border-neutral-200 rounded-xl font-mono text-sm tracking-wide font-medium shadow-inner bg-white/70"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit"
              disabled={isVerifying}
              className="w-full bg-[#FF6B00] hover:bg-[#E05E00] text-white h-12 rounded-xl border border-none shadow-[0_4px_12px_rgba(255,107,0,0.3)] transition-all font-avenir-medium uppercase tracking-widest text-[10px]"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Menyimpan...
                </>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  Lanjutkan ke Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

interface ArrowRightProps extends React.SVGProps<SVGSVGElement> {}
function ArrowRight(props: ArrowRightProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
