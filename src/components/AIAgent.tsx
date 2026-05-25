import { useState, useRef, useEffect } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { useAuth, useMasterData, useSystemConfig } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { MessageSquare, Send, Image as ImageIcon, Loader2, User, Bot, Sparkles, X, ChevronRight, Zap, Info, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TBJ_LOGO } from "@/constants";

interface Message {
  role: "user" | "model";
  parts: { text: string; inlineData?: { data: string; mimeType: string } }[];
  image?: string; // UI compatibility
}

export default function AIAgent() {
  const { user, incrementAIUsage } = useAuth();
  const { masterData } = useMasterData();
  const { config: sysConfig } = useSystemConfig();
  const assistantLogo = TBJ_LOGO;

  const [messages, setMessages] = useState<Message[]>([
    { role: "model", parts: [{ text: "Halo! Saya TBJ AI Agent. Ada yang bisa saya bantu terkait proyek konstruksi, renovasi, atau desain interior Anda hari ini? Anda juga bisa mengirimkan foto area yang ingin dikonsultasikan." }] }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [showTokenInfo, setShowTokenInfo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userParts: any[] = [{ text: input || "Lihat gambar ini" }];
    if (selectedImage) {
      userParts.push({
        inlineData: {
          data: selectedImage.split(",")[1],
          mimeType: "image/jpeg"
        }
      });
    }

    const userMessage: Message = { 
      role: "user", 
      parts: userParts,
      image: selectedImage || ""
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentImage = selectedImage;
    setInput("");
    setSelectedImage("");
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const markupFactor = 1.2;
      const masterDataSample = (masterData || []).slice(0, 50).map(item => {
        const markedUpPrice = (item.price || 0) * markupFactor;
        return `- ${item.name}: Rp ${markedUpPrice.toLocaleString('id-ID')} (${item.unit})`;
      }).join('\n');

      const systemInstruction = `Anda adalah "TBJ Constech OS", Chief Estimator AI eksklusif untuk platform TBJ Constech. 
      Tugas Anda adalah memberikan saran teknis, estimasi kasar, dan solusi desain yang sangat profesional.
      
      DATA REFERENSI ITEM (Sudah termasuk Markup 20%):
      ${masterDataSample}

      LOGIKA LAYANAN:
      1. Gunakan istilah "Digital Assessment" sebagai pengganti "Survey".
      2. Biaya Digital Assessment (Survey) adalah Rp 399.000. JANGAN PERNAH memberikan angka lain.
      3. Pembayaran via Transfer Bank BRI: 4792-0103-1488-535 an TBJ CONTRACTOR atau via QRIS resmi TBJ.
      4. Jangan pernah membocorkan harga modal (base price), markup percentage (20%), atau aturan pembulatan ribuan. Ini rahasia perusahaan.
      5. Jangan tampilkan harga satuan (price per unit) untuk tiap item dalam jawaban Anda kepada non-admin.
      6. Berikan saja Nama Item, Analisis/Reasoning, Volume/QTY, dan di bagian akhir berikan "Total Estimasi Biaya" (Grand Total).
      7. JANGAN PERNAH menyebutkan "Seluruh harga telah disesuaikan dengan kenaikan 20% dari master data" atau "dibulatkan ke ribuan". Ini adalah RAHASIA PERUSAHAAN yang dilarang diberitahukan.
      8. Anda berbicara sebagai sistem operasi "TBJ Constech OS" yang cerdas, solutif, dan tegas.
      9. Verifikasi WhatsApp (waVerified) sangat penting untuk akses fitur premium.
      10. Jika user bertanya tentang Landscape, Event, atau Booth Konstruksi, layani dengan Analisis AI dan sarankan Luas Area m2.
      
      ROLE USER: ${user?.role || 'Guest'}
      TIER USER: ${user?.tier || 'prospect'}`;

      const history = messages.map(msg => ({
        role: msg.role,
        parts: msg.parts
      }));

      const res = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...history, userMessage],
        config: {
          systemInstruction
        }
      });

      const responseText = res.text || "Maaf, saya tidak bisa memberikan jawaban saat ini.";
      setMessages(prev => [...prev, { role: "model", parts: [{ text: responseText }] }]);
      
      if (user && user.uid && !user.uid.startsWith("guest-")) {
        const isStaff = user.role === "admin" || user.role === "pm";
        if (!isStaff) {
          await incrementAIUsage();
        }
        
        // Show token notification after a short delay
        setTimeout(() => setShowTokenInfo(true), 1500);
      }
    } catch (error: any) {
      console.error("AI Agent Error:", error);
      toast.error(error.message || "Maaf, terjadi kesalahan saat menghubungi AI Agent.");
      // Revert in-flight UI state
      setMessages(prev => prev.slice(0, prev.length - 1));
      setInput(currentInput);
      setSelectedImage(currentImage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 font-sans">
      <div className="flex justify-between items-center px-2">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-campton-book font-bold tracking-tighter flex items-center gap-3 text-neutral-800">
            <Bot className="w-7 h-7 text-[#ff6B00]" /> TBJ AI AGENT
          </h1>
          <p className="text-[10px] md:text-xs uppercase-soft tracking-wider text-neutral-500">Konsultasi Konstruksi & Desain Real-time via AI.</p>
        </div>
        <Badge className="bg-[#FF6B00] text-white border-none px-4 py-1.5 rounded-full animate-pulse shadow-[0_4px_12px_rgba(255,107,0,0.35)] font-avenir-medium tracking-wider text-[9px]">
          <Sparkles className="w-3 h-3 mr-1.5" /> AI MASTER
        </Badge>
      </div>

      <Card className="border border-white/60 bg-white/70 backdrop-blur-md rounded-3xl overflow-hidden shadow-[8px_8px_24px_#cbd5e1,-8px_-8px_24px_#ffffff] flex flex-col h-[70vh] min-h-[500px] max-h-[800px] relative">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 z-10">
          <Button 
            variant="outline" 
            size="icon" 
            className="w-8 h-8 rounded-full border border-neutral-200/60 bg-white/90 backdrop-blur-sm hover:bg-[#ff6B00] hover:text-white transition-all shadow-sm"
            onClick={scrollToTop}
          >
            <ChevronRight className="w-4 h-4 -rotate-90" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="w-8 h-8 rounded-full border border-neutral-200/60 bg-white/90 backdrop-blur-sm hover:bg-[#ff6B00] hover:text-white transition-all shadow-sm"
            onClick={scrollToBottom}
          >
            <ChevronRight className="w-4 h-4 rotate-90" />
          </Button>
        </div>
        <div 
          ref={scrollRef}
          className="flex-grow p-4 md:p-6 bg-transparent overflow-y-auto custom-scrollbar touch-pan-y overscroll-contain"
          style={{ 
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className="space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={cn(
                "flex gap-4 max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}>
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border border-white bg-white/80 shadow-md overflow-hidden",
                  msg.role === "user" ? "bg-neutral-850 text-white font-bold" : "bg-white"
                )}>
                  {msg.role === "user" ? <User className="w-4 h-4 text-neutral-800" /> : <img src={assistantLogo} className="w-full h-full object-contain p-1.5" referrerPolicy="no-referrer" />}
                </div>
                <div className="space-y-1.5">
                  <div className={cn(
                    "p-4 rounded-2xl border transition-all shadow-[2px_2px_8px_rgba(203,213,225,0.2)] text-neutral-800 leading-relaxed text-sm whitespace-pre-wrap",
                    msg.role === "user" 
                      ? "bg-white/90 border-white/60" 
                      : "bg-[#FFF9F5] border-[#FF6B00]/15"
                  )}>
                    <p className="font-avenir-medium text-neutral-700">{msg.parts?.[0]?.text || ""}</p>
                    {msg.image && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-neutral-100 shadow-inner">
                        <img src={msg.image} alt="User upload" className="w-full h-auto" />
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] font-avenir-medium uppercase tracking-widest text-neutral-400 px-1">
                    {msg.role === "user" ? "Client" : "TBJ AI Agent"} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 mr-auto">
                <div className="w-9 h-9 rounded-full bg-[#ff6B00]/10 text-[#ff6B00] flex items-center justify-center border border-[#ff6B00]/20 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl border border-[#ff6B00]/10 bg-white/80 backdrop-blur-sm flex items-center gap-2.5 shadow-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff6B00]" />
                  <span className="text-[10px] font-avenir-medium uppercase tracking-wider text-neutral-500">AI Agent sedang menganalisis spesifikasi...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6 bg-white/40 border-t border-white/60 space-y-4 backdrop-blur-md">
          {selectedImage && (
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/80 shadow-[4px_4px_10px_rgba(0,0,0,0.05)] group">
              <img src={selectedImage} className="w-full h-full object-cover" />
              <button 
                onClick={() => setSelectedImage("")}
                className="absolute top-1 right-1 bg-neutral-900/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <div className="relative flex-grow">
              <Input 
                placeholder="Tulis instruksi atau lampirkan gambar ruangan..." 
                className="h-13 pl-4 pr-12 rounded-xl border border-white/60 bg-white/75 focus:bg-white focus:border-[#ff6B00]/40 focus:ring-4 focus:ring-[#ff6B00]/5 shadow-sm font-avenir-medium"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGenerate()}
              />
              <label className="absolute right-3.5 top-3 text-neutral-400 hover:text-[#ff6B00] cursor-pointer transition-colors p-1">
                <ImageIcon className="w-5 h-5" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
            <Button 
              className="h-13 w-13 rounded-xl bg-[#FF6B00] hover:bg-[#E65F00] transition-all text-white shadow-[0_4px_12px_rgba(255,107,0,0.3)] active:scale-95"
              onClick={handleGenerate}
              disabled={isLoading || (!input.trim() && !selectedImage)}
            >
              <Send className="w-4 text-white" />
            </Button>
          </div>
          <p className="text-[9px] text-center uppercase tracking-wider font-avenir-medium text-neutral-400">
            TBJ AI Agent terhubung dengan 161 Master Item konstruksi. Konsultasi dilindungi protokol enkripsi cloud.
          </p>
        </div>
      </Card>

      <Dialog open={showTokenInfo} onOpenChange={setShowTokenInfo}>
        <DialogContent className="max-w-md border border-white/60 rounded-[2rem] bg-white/95 backdrop-blur-md overflow-hidden p-0 shadow-2xl">
          <div className="bg-[#ff6B00] p-6 text-white text-center space-y-2">
            <div className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-2 border border-white/10 backdrop-blur-sm">
              <Zap className="w-6 h-6 text-white fill-white animate-bounce" />
            </div>
            <DialogTitle className="text-xl font-campton-book font-bold uppercase tracking-tight">AI Analysis Berhasil!</DialogTitle>
            <p className="text-[10px] font-avenir-medium uppercase tracking-widest text-[#FFE2D1]">Status Penggunaan TBJ AI Agent</p>
          </div>
          
          <div className="p-6 md:p-8 space-y-6 font-sans">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-50/50 border border-neutral-100 flex flex-col items-center justify-center text-center shadow-inner">
                <p className="text-[10px] font-avenir-medium uppercase text-neutral-400 mb-1">Digunakan</p>
                <p className="text-xl font-campton-book font-bold text-neutral-800">1 <span className="text-xs font-normal text-neutral-400">Token</span></p>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-50/50 border border-neutral-100 flex flex-col items-center justify-center text-center shadow-inner">
                <p className="text-[10px] font-avenir-medium uppercase text-neutral-400 mb-1">Sisa Token</p>
                <p className="text-xl font-campton-book font-bold text-[#FF6B00]">
                  {user?.waVerified ? (
                    Math.max(0, (sysConfig?.aiVerifiedLimit || 10) - (user?.aiUsageCount || 0))
                  ) : (
                    Math.max(0, (sysConfig?.aiFreeLimit || 5) - (user?.aiUsageCount || 0))
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] leading-relaxed font-avenir-medium text-blue-900 uppercase tracking-wide">
                  Tahukah Anda? User dengan WhatsApp terverifikasi mendapatkan kuota 10x Lipat lebih banyak.
                </p>
              </div>
              
              <div className="bg-neutral-900/95 rounded-2xl p-6 text-white space-y-4 shadow-[4px_4px_15px_rgba(0,0,0,0.15)]">
                <div className="space-y-1">
                  <h4 className="text-xs font-campton-book font-medium uppercase tracking-wide flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FF6B00]" /> Unlimited Access
                  </h4>
                  <p className="text-[10px] text-neutral-400 font-avenir-medium leading-relaxed">Bantu kami meningkatkan kualitas layanan dengan mengisi survey singkat dan dapatkan akses AI tanpa batas!</p>
                </div>
                <Button 
                  className="w-full bg-[#ff6B00] text-white hover:bg-[#e66000] shadow-[0_4px_10px_rgba(255,107,0,0.3)] transition-all rounded-xl font-avenir-medium uppercase tracking-widest text-[10px] h-10 flex items-center justify-center gap-2"
                  onClick={() => window.open("https://forms.gle/placeholder", "_blank")}
                >
                  Isi Survey Sekarang <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter className="p-4 bg-neutral-50 border-t border-neutral-100 flex sm:justify-center">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto border border-neutral-200 bg-white rounded-xl font-avenir-medium uppercase tracking-widest text-[11px] h-11 px-8 hover:bg-[#ff6B00] hover:text-white transition-all shadow-sm"
              onClick={() => setShowTokenInfo(false)}
            >
              Lanjutkan Konsultasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
