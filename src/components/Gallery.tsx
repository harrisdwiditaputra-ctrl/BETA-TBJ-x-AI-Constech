import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handleFirestoreError, OperationType } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Tag, DollarSign, Quote, ChevronLeft, ChevronRight, Play, Clock, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getDriveImageUrl } from "@/lib/utils";
import { useMediaAssets } from "@/lib/hooks";

interface GalleryItem {
  id: string;
  title: string;
  images: string[]; // Changed from beforeUrl/afterUrl to images array
  date: string;
  value: number;
  description: string;
  testimonial?: string;
  clientName?: string;
  videoUrl?: string;
}

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { assets: marketingAssets } = useMediaAssets('marketing');

  useEffect(() => {
    const q = query(collection(db, "gallery"), where("published", "==", true), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Fallback or empty state
        setItems([]);
      } else {
        setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GalleryItem[]);
      }
      setLoading(false);
    }, (error) => {
      // Fallback if index not ready
      const simpleQ = query(collection(db, "gallery"), orderBy("date", "desc"));
      onSnapshot(simpleQ, (snap) => {
        setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.published !== false) as GalleryItem[]);
        setLoading(false);
      });
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  // Maintenance mode is now handled by the items' published status
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-8 animate-in fade-in zoom-in">
        <div className="w-32 h-32 bg-accent/10 text-accent rounded-full flex items-center justify-center animate-pulse shadow-2xl shadow-accent/10 border-4 border-accent/20">
          <ImageIcon className="w-16 h-16" />
        </div>
        <div className="text-center space-y-4 max-w-xl">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-black">Project Gallery <br/> <span className="text-accent underline decoration-4 underline-offset-8">Coming Soon</span></h2>
          <p className="uppercase-soft text-neutral-500 leading-relaxed px-8">
            Kami sedang mengkurasi portofolio terbaik untuk Anda. 
            Ikuti perjalanan konstruksi kami yang transparan dan berkualitas tinggi segera di halaman ini.
          </p>
          <Button 
            variant="outline" 
            className="mt-6 border-2 border-black rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px]"
            onClick={() => window.open('https://instagram.com/tukang.bangunan.jakarta', '_blank')}
          >
            Lihat Update di Instagram
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black uppercase tracking-tighter">Project Gallery</h1>
        <p className="uppercase-soft text-neutral-500">Koleksi proyek yang telah kami selesaikan dengan standar kualitas tinggi.</p>
      </div>

      <div className="grid gap-16">
        {items.map((item) => (
          <ProjectCard key={item.id} item={item} />
        ))}
      </div>

      {/* Marketing / Highlights Section */}
      {marketingAssets.length > 0 && (
        <div className="space-y-8 pt-12 border-t border-neutral-100">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Marketing Gallery</h2>
            <p className="uppercase-soft text-neutral-400">Snapshot aktivitas dan konten marketing terbaru</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {marketingAssets.map(asset => (
              <div key={asset.id} className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-black bg-neutral-100">
                <img 
                  src={getDriveImageUrl(asset.url)} 
                  alt={asset.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                  <p className="text-[10px] font-black text-white uppercase">{asset.name}</p>
                  <p className="text-[8px] text-neutral-300 uppercase-soft mt-1">{asset.description || 'Marketing Content'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ item }: { item: GalleryItem }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-black rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500">
      <CardContent className="p-0">
        <div className="relative group">
          <div 
            ref={scrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-[500px]"
          >
            {item.images.map((img, idx) => (
              <div key={idx} className="min-w-full h-full snap-center relative">
                <img src={getDriveImageUrl(img)} alt={`Slide ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md backdrop-blur-sm">
                  {idx === 0 ? "Before" : idx === 1 ? "After" : `Detail ${idx - 1}`}
                </div>
              </div>
            ))}
          </div>
          
          <button 
            onClick={() => scroll('left')}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full border-2 border-black opacity-0 group-hover:opacity-100 transition-all hover:bg-titanium hover:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full border-2 border-black opacity-0 group-hover:opacity-100 transition-all hover:bg-titanium hover:text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {item.images.map((_, idx) => (
              <div key={idx} className={`w-2 h-2 rounded-full border border-white ${idx === activeIdx ? 'bg-white w-6' : 'bg-white/40'} transition-all`} />
            ))}
          </div>
        </div>

        <div className="p-8 md:p-12 grid md:grid-cols-3 gap-12">
          <div className="md:col-span-2 space-y-8">
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="text-4xl font-black uppercase tracking-tighter">{item.title}</h2>
              <Badge variant="outline" className="border-black rounded-md px-3 py-1 text-[10px] font-black uppercase">Completed</Badge>
              {item.videoUrl && (
                <Button size="sm" variant="outline" className="rounded-md border-accent text-accent hover:bg-accent hover:text-white gap-2 text-[10px] font-black uppercase">
                  <Play className="w-3 h-3 fill-current" /> Watch Video
                </Button>
              )}
            </div>
            <p className="text-neutral-600 leading-relaxed text-lg">{item.description}</p>
            
            {item.testimonial && (
              <div className="bg-neutral-50 p-8 border-l-4 border-accent italic relative rounded-r-2xl">
                <Quote className="absolute -top-4 -left-4 w-10 h-10 text-accent/10" />
                <p className="text-neutral-700 leading-relaxed">"{item.testimonial}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-[10px] font-black">
                    {item.clientName?.[0]}
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-400">— {item.clientName}</p>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-6 bg-neutral-50 p-8 rounded-2xl border border-black/5 flex flex-col justify-center">
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-neutral-500">
                <div className="w-10 h-10 bg-white rounded-xl border border-black/5 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-black text-neutral-400">Completion Date</p>
                  <p className="text-sm font-black uppercase tracking-tight">{new Date(item.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-neutral-500">
                <div className="w-10 h-10 bg-white rounded-xl border border-black/5 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-black text-neutral-400">Project Value</p>
                  <p className="text-sm font-black uppercase tracking-tight">Rp {item.value.toLocaleString('id-ID')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-neutral-500">
                <div className="w-10 h-10 bg-white rounded-xl border border-black/5 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-black text-neutral-400">Category</p>
                  <p className="text-sm font-black uppercase tracking-tight">{item.title.split(' ')[0]}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
