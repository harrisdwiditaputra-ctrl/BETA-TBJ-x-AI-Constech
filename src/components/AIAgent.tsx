import { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { useAuth, useMasterData, useMediaAssets } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Image as ImageIcon, Loader2, User, Bot, Sparkles, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TBJ_LOGO } from "@/constants";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

export default function AIAgent() {
  const { user } = useAuth();
  const { masterData } = useMasterData();
  const assistantLogo = TBJ_LOGO;

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Halo! Saya TBJ AI Agent. Ada yang bisa saya bantu terkait proyek konstruksi, renovasi, atau desain interior Anda hari ini? Anda juga bisa mengirimkan foto area yang ingin dikonsultasikan." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, []);

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
    if (!input.trim() && !selectedImage) return;

    const userMessage: Message = { 
      role: "user", 
      content: input,
      image: selectedImage || ""
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setSelectedImage("");
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key is not configured for the frontend.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const imageData = selectedImage ? selectedImage.split(",")[1] : null;

      const markupFactor = 1.2; // 20% Markup
      const masterDataSample = masterData.slice(0, 100).map(item => {
        const markedUpPrice = item.price * markupFactor;
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

      const contents: any[] = [{ text: input }];
      if (imageData) {
        contents.push({
          inlineData: {
            data: imageData,
            mimeType: "image/jpeg"
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: contents },
        config: {
          systemInstruction
        }
      });

      const responseText = response.text || "Maaf, saya tidak bisa memberikan jawaban saat ini.";
      setMessages(prev => [...prev, { role: "assistant", content: responseText }]);
      
      // Update quota in Firestore
      if (user && user.uid && !user.uid.startsWith("guest-")) {
        try {
          const { updateDoc, doc } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");
          await updateDoc(doc(db, "users", user.uid), {
            aiUsageCount: (user.aiUsageCount || 0) + 1
          });
        } catch (e) {
          console.error("Failed to update AI quota:", e);
        }
      }
    } catch (error: any) {
      console.error("AI Agent Error:", error);
      toast.error(error.message || "Maaf, terjadi kesalahan saat menghubungi AI Agent.");
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
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
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
    </div>
  );
}
