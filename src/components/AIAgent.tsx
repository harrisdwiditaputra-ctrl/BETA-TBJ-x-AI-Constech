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
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Bot className="w-8 h-8 text-accent" /> TBJ AI AGENT
          </h1>
          <p className="uppercase-soft text-neutral-500">Konsultasi Konstruksi & Desain Real-time via AI.</p>
        </div>
        <Badge className="bg-[#FF6B00] text-white border-none px-4 py-1 rounded-full animate-pulse shadow-[0_0_15px_rgba(255,107,0,0.5)]">
          <Sparkles className="w-3 h-3 mr-2" /> AI Powered
        </Badge>
      </div>

      <Card className="border-2 border-black rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[70vh] min-h-[500px] max-h-[800px] relative">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
          <Button 
            variant="outline" 
            size="icon" 
            className="w-8 h-8 rounded-full border-2 border-black bg-white/80 backdrop-blur-sm hover:bg-black hover:text-white transition-all shadow-md"
            onClick={scrollToTop}
          >
            <ChevronRight className="w-4 h-4 -rotate-90" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="w-8 h-8 rounded-full border-2 border-black bg-white/80 backdrop-blur-sm hover:bg-black hover:text-white transition-all shadow-md"
            onClick={scrollToBottom}
          >
            <ChevronRight className="w-4 h-4 rotate-90" />
          </Button>
        </div>
        <div 
          ref={scrollRef}
          className="flex-grow p-4 md:p-6 bg-white overflow-y-auto custom-scrollbar touch-pan-y overscroll-contain"
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
                  "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 border-black shadow-sm overflow-hidden",
                  msg.role === "user" ? "bg-black text-white" : "bg-white"
                )}>
                  {msg.role === "user" ? <User className="w-5 h-5" /> : <img src={assistantLogo} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />}
                </div>
                <div className="space-y-2">
                  <div className={cn(
                    "p-4 rounded-2xl border-2 border-black shadow-sm",
                    msg.role === "user" ? "bg-neutral-50" : "bg-[#FFF5ED] border-[#FF6B00]/30"
                  )}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.parts?.[0]?.text || ""}</p>
                    {msg.image && (
                      <div className="mt-3 rounded-xl overflow-hidden border-2 border-black">
                        <img src={msg.image} alt="User upload" className="w-full h-auto" />
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 px-1">
                    {msg.role === "user" ? "Anda" : "TBJ AI Agent"} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 mr-auto">
                <div className="w-10 h-10 rounded-2xl bg-accent text-white flex items-center justify-center border-2 border-black animate-pulse">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="p-4 rounded-2xl border-2 border-black bg-white flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span className="text-xs font-black uppercase tracking-widest">AI Agent sedang berpikir...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-neutral-50 border-t-2 border-black space-y-4">
          {selectedImage && (
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-black shadow-md group">
              <img src={selectedImage} className="w-full h-full object-cover" />
              <button 
                onClick={() => setSelectedImage("")}
                className="absolute top-1 right-1 bg-black text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <div className="relative flex-grow">
              <Input 
                placeholder="Tanyakan sesuatu tentang proyek Anda..." 
                className="h-14 pl-4 pr-12 rounded-2xl border-2 border-black shadow-sm focus:ring-accent"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGenerate()}
              />
              <label className="absolute right-3 top-3.5 cursor-pointer hover:text-accent transition-colors">
                <ImageIcon className="w-6 h-6" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
            <Button 
              className="h-14 w-14 rounded-2xl bg-[#FF6B00] hover:bg-[#E65F00] transition-all border-2 border-black shadow-lg text-white"
              onClick={handleGenerate}
              disabled={isLoading || (!input.trim() && !selectedImage)}
            >
              <Send className="w-6 h-6" />
            </Button>
          </div>
          <p className="text-[9px] text-center uppercase font-bold text-neutral-400">
            AI Agent dapat melakukan kesalahan. Selalu verifikasi estimasi dengan tim teknis kami.
          </p>
        </div>
      </Card>

      <Dialog open={showTokenInfo} onOpenChange={setShowTokenInfo}>
        <DialogContent className="max-w-md border-4 border-black rounded-[2.5rem] bg-white overflow-hidden p-0">
          <div className="bg-accent p-6 text-white text-center space-y-2">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-white/30 backdrop-blur-sm">
              <Zap className="w-8 h-8 text-white fill-white" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">AI Analysis Berhasil!</DialogTitle>
            <p className="text-xs font-bold uppercase tracking-widest text-[#FFE0CC]">Status Penggunaan TBJ AI Agent</p>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-50 border-2 border-black/5 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black uppercase text-neutral-400 mb-1">Digunakan</p>
                <p className="text-2xl font-black text-black">1 <span className="text-sm font-bold text-neutral-400">Token</span></p>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-50 border-2 border-black/5 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black uppercase text-neutral-400 mb-1">Sisa Token</p>
                <p className="text-2xl font-black text-[#FF6B00]">
                  {user?.waVerified ? (
                    Math.max(0, (sysConfig?.aiVerifiedLimit || 10) - (user?.aiUsageCount || 0))
                  ) : (
                    Math.max(0, (sysConfig?.aiFreeLimit || 5) - (user?.aiUsageCount || 0))
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 border-2 border-blue-100 rounded-xl">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] leading-tight font-bold text-blue-900 uppercase tracking-tight">
                  Tahukah Anda? User dengan WhatsApp terverifikasi mendapatkan kuota 10x Lipat lebih banyak.
                </p>
              </div>
              
              <div className="bg-neutral-900 rounded-2xl p-6 text-white space-y-4 shadow-xl border-2 border-black">
                <div className="space-y-1">
                  <h4 className="text-sm font-black uppercase flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FF6B00]" /> Unlimited Access?
                  </h4>
                  <p className="text-[10px] text-neutral-400 font-medium">Bantu kami meningkatkan kualitas layanan dengan mengisi survey singkat dan dapatkan akses AI tanpa batas!</p>
                </div>
                <Button 
                  className="w-full btn-orange h-10 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2"
                  onClick={() => window.open("https://forms.gle/placeholder", "_blank")}
                >
                  Isi Survey Sekarang <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter className="p-6 bg-neutral-50 border-t-2 border-black/5 flex sm:justify-center">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto border-2 border-black rounded-xl font-black uppercase text-xs h-12 px-8 hover:bg-black hover:text-white transition-all"
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
