import React, { useMemo } from "react";
import { 
  Brain, Zap, CheckCircle2, AlertCircle, AlertTriangle, 
  TrendingUp, Activity, BarChart3, X, Sparkles, Search,
  Box, ShieldCheck, Clock
} from "lucide-react";
import { Project, BudgetItem, WorkItemMaster } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProjectAIHealthProps {
  project: Project;
  items: BudgetItem[];
  masterData: WorkItemMaster[];
  onClose: () => void;
}

export const ProjectAIHealth: React.FC<ProjectAIHealthProps> = ({ 
  project, 
  items, 
  masterData,
  onClose
}) => {
  const analysis = useMemo(() => {
    if (!items.length) {
      return {
        financialScore: 0,
        progressScore: 0,
        specScore: 0,
        status: "INITIALIZING",
        suggestions: ["Belum ada item pekerjaan di RAB. AI tidak dapat melakukan analisa mendalam."]
      };
    }

    const suggestions: string[] = [];
    let priceVariance = 0;
    let filledSpecsCount = 0;
    let totalProgress = 0;
    
    items.forEach(item => {
      const itemProgress = item.progress || 0;
      totalProgress += itemProgress;
      
      const hasSpecs = item.technicalSpecs && item.technicalSpecs.trim().length > 5;
      if (hasSpecs) {
        filledSpecsCount++;
      }

      // Financial Risk check
      const master = masterData.find(m => m.name === item.name);
      if (master) {
        const variance = (item.pricePerUnit - master.price) / master.price;
        priceVariance += variance;
        
        // Critical: Material quality alert if price is too low
        if (variance < -0.15) {
          suggestions.push(`KRITIKAL: Harga [${item.name}] terpantau -${Math.round(Math.abs(variance) * 100)}% dari Master Data. Potensi material substandard.`);
        }
      }

      // Spec check details
      if (!hasSpecs && itemProgress > 0) {
        suggestions.push(`DOKUMENTASI: [${item.name}] sudah berjalan ${itemProgress}%, namun spesifikasi teknis (Merk/Tipe) belum diisi.`);
      }
    });

    const averageProgress = totalProgress / items.length;
    const specCompletion = (filledSpecsCount / items.length) * 100;
    const avgPriceVariance = priceVariance / items.length;

    // Suggestion logic
    if (avgPriceVariance > 0.15) {
      suggestions.push(`FINANSIAL: Biaya rata-rata ${Math.round(avgPriceVariance * 100)}% di atas standar. Indikasi markup global tinggi atau inefisiensi pengadaan.`);
    }

    if (specCompletion < 70) {
      suggestions.push(`INTEGRITAS DATA: Cakupan spesifikasi baru ${Math.round(specCompletion)}%. Resiko ketidaksesuaian ekspektasi klien di akhir proyek tinggi.`);
    }

    if (averageProgress < (project.progress || 0) - 10) {
      suggestions.push(`DESINKRONISASI: Progress lapangan (${project.progress}%) jauh mendahului update RAB (${Math.round(averageProgress)}%). Data finansial tidak akurat.`);
    }

    // Advanced analysis (Simulated)
    const criticalPathItems = items.filter(it => it.id.includes("STR") || it.name.toLowerCase().includes("struktur"));
    const structuralProgress = criticalPathItems.length > 0 
      ? criticalPathItems.reduce((acc, it) => acc + (it.progress || 0), 0) / criticalPathItems.length 
      : 100;

    if (structuralProgress < 90 && averageProgress > 50) {
      suggestions.push("STRUKTURAL ALERT: Detail finishing sudah dikerjakan sementara progress struktur belum tuntas 100%. Resiko rework tinggi.");
    }

    return {
      financialScore: Math.max(0, 100 - (Math.abs(avgPriceVariance) * 150)),
      progressScore: averageProgress,
      specScore: specCompletion,
      status: (averageProgress > 80 && specCompletion > 80) ? "EXCELLENT" : (averageProgress > 30 && avgPriceVariance < 0.2) ? "ON TRACK" : "CRITICAL",
      suggestions: [...new Set(suggestions)].slice(0, 6) // Unique top 6 suggestions
    };
  }, [items, masterData, project.progress]);

  return (
    <div className="flex flex-col h-full max-h-[95vh] sm:max-h-[90vh]">
      {/* Header */}
      <div className="bg-neutral-950 text-white p-6 relative flex justify-between items-center border-b border-white/10 shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-5 items-center gap-1.5 px-2 rounded-md bg-accent/10 border border-accent/20">
              <Zap className="w-3 h-3 text-accent fill-accent animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-accent">TUKANG BANGUNAN JAKARTA OS</span>
            </div>
            <div className="h-5 w-[1px] bg-white/20 mx-1" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Alpha Terminal</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-tight drop-shadow-sm">{project.name}</h2>
          <p className="text-white/40 text-[9px] uppercase font-bold tracking-[0.3em]">AI-Driven Health Analysis Report</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white/40 hover:text-white hover:bg-white/10 rounded-full shrink-0 h-10 w-10 sm:h-12 sm:w-12"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-grow bg-[#fafafa]">
        {/* Metric Grid - Responsive Bento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Financial Card */}
          <div className={cn(
            "p-5 rounded-[2rem] border-2 transition-all duration-500 hover:shadow-xl",
            analysis.financialScore > 80 ? "bg-white border-green-500/20 shadow-green-500/5 group" : "bg-white border-orange-500/20 shadow-orange-500/5 group"
          )}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-2xl bg-neutral-50 group-hover:bg-neutral-900 group-hover:text-white transition-colors duration-500">
                <BarChart3 className="w-5 h-5" />
              </div>
              <Badge variant="outline" className={cn(
                "text-[9px] font-black tracking-widest uppercase",
                analysis.financialScore > 80 ? "text-green-600 border-green-200" : "text-orange-600 border-orange-200"
              )}>
                {analysis.financialScore > 80 ? "Stable" : "Attention"}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Financial Index</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black tracking-tighter">{Math.round(analysis.financialScore)}%</p>
                <TrendingUp className={cn("w-4 h-4 mb-2", analysis.financialScore > 80 ? "text-green-500" : "text-orange-500")} />
              </div>
              <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-1000", analysis.financialScore > 80 ? "bg-green-500" : "bg-orange-500")} 
                  style={{ width: `${analysis.financialScore}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="p-5 rounded-[2rem] border-2 border-blue-500/20 bg-white shadow-xl shadow-blue-500/5 group hover:shadow-2xl transition-all duration-500">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-2xl bg-neutral-50 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                <Activity className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase text-blue-600 border-blue-200">
                Execution
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Workflow Progress</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black tracking-tighter text-blue-900">{Math.round(analysis.progressScore)}%</p>
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse mb-2" />
              </div>
              <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-1000" 
                  style={{ width: `${analysis.progressScore}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Spec Integrity Card */}
          <div className="p-5 rounded-[2rem] border-2 border-accent/20 bg-white shadow-xl shadow-accent/5 group hover:shadow-2xl transition-all duration-500">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-2xl bg-neutral-50 group-hover:bg-accent group-hover:text-white transition-colors duration-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase text-accent border-accent/20">
                Integrity
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Data Maturity</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black tracking-tighter text-accent">{Math.round(analysis.specScore)}%</p>
                <Sparkles className="w-4 h-4 text-accent mb-2" />
              </div>
              <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-1000" 
                  style={{ width: `${analysis.specScore}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Insights - AI Stream Feel */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b-2 border-neutral-100">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-neutral-500">
              <Brain className="w-4 h-4 text-accent" /> Strategy & Optimization Points
            </h4>
            <span className="text-[8px] font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">MODE: DEEP_SCAN</span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {analysis.suggestions.map((suggestion, idx) => (
              <div key={idx} className="relative group overflow-hidden">
                <div className="absolute inset-0 bg-white rounded-[2rem] border-2 border-neutral-100 group-hover:border-neutral-900 transition-all duration-500" />
                <div className="relative p-6 flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-neutral-900 group-hover:text-white transition-all duration-500">
                    <span className="text-xs font-black">0{idx + 1}</span>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black uppercase text-neutral-400 tracking-widest group-hover:text-accent transition-colors">Vulnerability Report</p>
                    <p className="text-sm font-semibold leading-relaxed text-neutral-900 pr-4">
                      {suggestion}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Logs / Diagnostics */}
        <div className="rounded-[2.5rem] bg-neutral-900 text-neutral-400 p-6 font-mono text-[10px] space-y-2 border border-white/5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
             <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
             <span className="text-white text-[10px] font-black uppercase tracking-widest">OS Kernel Status: Active</span>
          </div>
          <p className="flex gap-4"><span className="text-white/40">[SEC]</span> Authentication validated for Lead Estimator...</p>
          <p className="flex gap-4"><span className="text-accent/60">[AI]</span> Analyzing ${items.length} work items against master dataset...</p>
          <p className="flex gap-4"><span className="text-blue-500/60">[SYS]</span> Recalculating weighted progress vectors...</p>
          <p className="flex gap-4 animation-pulse"><span className="text-green-500/60">[RES]</span> Analysis complete. Score: {Math.round((analysis.financialScore + analysis.progressScore + analysis.specScore) / 3)}/100</p>
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-6 border-t bg-white flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
        <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest text-center sm:text-left">
          © 2024 TUKANG BANGUNAN JAKARTA • DATA SYNC: {new Date().toLocaleTimeString()}
        </div>
        <Button className="btn-sleek w-full sm:w-auto px-12 h-14 rounded-2xl font-black uppercase tracking-widest text-[11px]" onClick={onClose}>
          Exit Analysis Mode
        </Button>
      </div>
    </div>
  );
};
