import { useMemo, useState, useEffect } from "react";
import { useFinance, useProjects, useCMSConfig } from "@/lib/hooks";
import { Zap, TrendingUp, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Ticker() {
  const { transactions } = useFinance();
  const { projects } = useProjects();
  const { config: cmsConfig } = useCMSConfig();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const activities = useMemo(() => {
    const list: { text: string; icon: any; color: string }[] = [];
    
    // Add promos from CMS structured promos array if exists
    if (cmsConfig?.promos && cmsConfig.promos.length > 0) {
      const now = new Date();
      cmsConfig.promos
        .filter(p => {
          if (!p.isActive) return false;
          const now = new Date();
          if (p.expiresAt) {
            const expiry = new Date(p.expiresAt);
            if (expiry <= now) return false;
          }
          if (p.scheduledAt) {
            const scheduled = new Date(p.scheduledAt);
            if (scheduled > now) return false;
          }
          return true;
        })
        .forEach(p => {
          list.push({ text: p.text, icon: Zap, color: "text-accent" });
        });
    } else if (cmsConfig?.promoActive && cmsConfig?.promoText) {
      // Fallback to old promoText
      const promoRows = cmsConfig.promoText.split('|').map(r => r.trim()).filter(Boolean);
      promoRows.forEach(row => {
        list.push({ text: row, icon: Zap, color: "text-accent" });
      });
    }

    // Add recent transactions (deals)
    if (transactions.length > 0) {
      transactions.slice(0, 5).forEach(t => {
        if (t.type === 'income') {
          list.push({ 
            text: `🤝 Deal Proyek: ${t.description} ${t.projectName ? `di ${t.projectName}` : ''}`,
            icon: Zap,
            color: "text-green-500"
          });
        }
      });
    }

    // Add recent projects/assessments
    if (projects.length > 0) {
      projects.slice(0, 5).forEach(p => {
        if (p.status === 'survey') {
          list.push({ 
            text: `🔍 Digital Assessment ongoing: area ${p.location || 'Sudirman'}`,
            icon: Search,
            color: "text-blue-500"
          });
        } else if (p.status === 'active') {
          list.push({ 
            text: `🏗️ Proyek Aktif: ${p.name} sedang dikerjakan.`,
            icon: TrendingUp,
            color: "text-orange-500"
          });
        }
      });
    }

    // Fallback if empty - only show very minimal or nothing
    if (list.length === 0) {
      // Return empty list so it doesn't show at all if no promos are active
      return [];
    }

    return list;
  }, [transactions, projects, cmsConfig]);

  useEffect(() => {
    if (currentIndex >= activities.length && activities.length > 0) {
      setCurrentIndex(0);
    }
  }, [activities.length, currentIndex]);

  useEffect(() => {
    if (activities.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [activities.length]);

  if (!isVisible || activities.length === 0) return null;

  const current = activities[currentIndex];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[90vw] md:max-w-xl pointer-events-none">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-1 flex items-center group overflow-hidden"
      >
        <div className="flex-grow overflow-hidden relative flex items-center h-10 md:h-12">
          <div className="flex whitespace-nowrap animate-ticker hover:pause py-1">
            {/* Quadruple for smooth continuous transition */}
            {[...activities, ...activities, ...activities, ...activities].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 px-6 md:px-10 border-r border-white/5">
                <div className={`shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-xl bg-white/5 flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-white/90">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={() => setIsVisible(false)}
          className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all shrink-0 ml-2"
        >
          <X className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </motion.div>
    </div>
  );
}
