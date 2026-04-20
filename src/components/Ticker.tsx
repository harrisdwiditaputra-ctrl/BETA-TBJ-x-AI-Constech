import { useMemo } from "react";
import { useFinance, useProjects, useCMSConfig } from "@/lib/hooks";
import { Zap, TrendingUp, Sparkles, MapPin, Search } from "lucide-react";

export default function Ticker() {
  const { transactions } = useFinance();
  const { projects } = useProjects();
  const { config: cmsConfig } = useCMSConfig();

  const activities = useMemo(() => {
    const list: string[] = [];
    
    // Add promos from CMS
    if (cmsConfig?.promoActive && cmsConfig?.promoText) {
      list.push(`🔥 Promo: ${cmsConfig.promoText}`);
    }

    // Add recent transactions (deals)
    if (transactions.length > 0) {
      transactions.slice(0, 5).forEach(t => {
        if (t.type === 'income') {
          list.push(`🤝 Deal Proyek: ${t.description} ${t.projectName ? `di ${t.projectName}` : ''}`);
        }
      });
    }

    // Add recent projects/assessments
    if (projects.length > 0) {
      projects.slice(0, 5).forEach(p => {
        if (p.status === 'survey') {
          list.push(`🔍 Digital Assessment ongoing: area ${p.location || 'Sudirman'}`);
        } else if (p.status === 'active') {
          list.push(`🏗️ Proyek Aktif: ${p.name} sedang dikerjakan.`);
        }
      });
    }

    // Fallback if empty
    if (list.length === 0) {
      list.push("✨ TBJ Constech: Membangun dengan Integritas & Teknologi AI.");
      list.push("🚀 TBJ Constech OS: Integrasi Estimasi, Monitoring, & Finance.");
      list.push("📍 Area Layanan: Jabodetabek & Sekitarnya.");
    }

    return list;
  }, [transactions, projects, cmsConfig]);

  return (
    <div className="bg-black text-white py-2 overflow-hidden border-b border-white/10 relative flex items-center">
      <div className="flex whitespace-nowrap animate-ticker">
        {/* Repeating for continuous loop */}
        {[...activities, ...activities, ...activities].map((text, idx) => (
          <div key={idx} className="flex items-center mx-12 text-[10px] font-black uppercase tracking-[0.2em] opacity-80 hover:opacity-100 transition-opacity">
            <span className="text-accent mr-3">
              {text.includes('Deal') ? <Zap className="w-3 h-3" /> : 
               text.includes('Assessment') ? <Search className="w-3 h-3" /> :
               text.includes('Promo') ? <Sparkles className="w-3 h-3" /> :
               <TrendingUp className="w-3 h-3" />}
            </span>
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}
