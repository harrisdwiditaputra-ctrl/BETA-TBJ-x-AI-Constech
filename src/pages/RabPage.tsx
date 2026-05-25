import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMasterData, useAuth, useMediaAssets, useSavedEstimates, useSystemConfig } from "@/lib/hooks";
import { WorkItemMaster, UserTier } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Minus, Trash2, Download, Share2, Instagram, Phone, Mail, Building2, Save, FileText, ChevronRight, Calculator, MoreHorizontal, Eraser, Edit3, Loader2, History as HistoryIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn, formatRupiah, calculateAdminPrice, calculateClientPrice, roundToRibuan } from "@/lib/utils";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { TBJ_LOGO } from "@/constants";

import { generateRABPDF } from "@/lib/pdfUtils";

interface RabItem extends WorkItemMaster {
  instanceId: string;
  volume: number;
  total: number;
  code?: string;
  notes?: string;
}

export default function RabPage({ user }: { user: any }) {
  const navigate = useNavigate();
  const { masterData } = useMasterData(user?.role);
  const { config: systemConfig } = useSystemConfig();
  const { assets: systemAssets } = useMediaAssets('system');
  const { estimates, saveEstimate, deleteEstimate, loading: estimatesLoading } = useSavedEstimates(user?.uid);
  const headerLogo = systemAssets.find(a => a.name.toLowerCase().includes('header'))?.url || systemAssets[0]?.url || TBJ_LOGO;
  const pdfLogo = systemAssets.find(a => a.name.toLowerCase().includes('pdf'))?.url || systemAssets[0]?.url || TBJ_LOGO;

  const [activeTab, setActiveTab] = useState<"editor" | "archive">("editor");
  const [rabItems, setRabItems] = useState<RabItem[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const [deleteEstimateId, setDeleteEstimateId] = useState<string | null>(null);

  const handleBulkRemove = () => {
    if (selectedIndexes.size === 0) return;
    const newItems = rabItems.filter((item) => !selectedIndexes.has(item.instanceId));
    const removedCount = selectedIndexes.size;
    setRabItems(newItems);
    setSelectedIndexes(new Set());
    toast.success(`${removedCount} item berhasil dihapus.`);
  };

  const handleDeleteEstimate = async (id: string) => {
    setDeleteEstimateId(id);
  };

  const executeDeleteEstimate = async () => {
    if (deleteEstimateId) {
      await deleteEstimate(deleteEstimateId);
      setDeleteEstimateId(null);
      toast.success("Estimasi dihapus.");
    }
  };

  const toggleSelectIndex = (instanceId: string) => {
    const next = new Set(selectedIndexes);
    if (next.has(instanceId)) next.delete(instanceId);
    else next.add(instanceId);
    setSelectedIndexes(next);
  };

  const toggleSelectAllEditor = (category?: string) => {
    const next = new Set(selectedIndexes);
    const itemsToToggle = category 
      ? rabItems.filter(i => i.category === category)
      : rabItems;
    
    const allSelected = itemsToToggle.length > 0 && itemsToToggle.every(i => next.has(i.instanceId));

    if (allSelected) {
      itemsToToggle.forEach(i => next.delete(i.instanceId));
    } else {
      itemsToToggle.forEach(i => next.add(i.instanceId));
    }
    setSelectedIndexes(next);
  };

  const toggleExpand = (instanceId: string) => {
    const next = new Set(expandedItems);
    if (next.has(instanceId)) next.delete(instanceId);
    else next.add(instanceId);
    setExpandedItems(next);
  };

  const [categories, setCategories] = useState<string[]>([
    "ARSITEKTUR", 
    "Struktur", 
    "Lapangan / Sitework", 
    "Mekanikal Elektrikal", 
    "Plumbing", 
    "Site Development"
  ]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveType, setArchiveType] = useState<string>("all");
  const [isAddingItem, setIsAddingItem] = useState(false);
  
  // Project Info State
  const [projectInfo, setProjectInfo] = useState({
    clientName: user?.displayName || "",
    projectName: "Proyek Konstruksi & Interior TBJ",
    address: "Lokasi Proyek",
    date: new Date().toLocaleDateString('id-ID'),
    contact: user?.whatsapp || "",
    discount: 0,
    taxPercentage: 0,
    assessmentDeposit: 0,
  });

  // Access Control
  useEffect(() => {
    // Admin and PM can always access
    if (user?.role === 'admin' || user?.role === 'pm') return;
    
    // Tier 1 (Prospect), Tier 2 (Survey), and Tier 3 (Deal) clients can view
    if (user?.tier === 'prospect' || user?.tier === 'survey' || user?.tier === 'deal') return;

    // Otherwise redirect
    if (!user) navigate("/");
  }, [user, navigate]);

  const canEdit = user?.role === 'admin' || user?.role === 'pm';

  const shareToWhatsApp = () => {
    const message = `Halo, berikut adalah draf RAB Proyek ${projectInfo.projectName} dari TBJ Constech. Total Estimasi: Rp ${(grandTotal || 0).toLocaleString('id-ID')}. Silakan cek detailnya di platform kami.`;
    window.open(`https://wa.me/${projectInfo.contact}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredMaster = useMemo(() => {
    if (!searchQuery) return [];
    const dataToUse = masterData && masterData.length > 0 ? masterData : [];
    return dataToUse.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 15);
  }, [searchQuery, masterData]);

  const addItemToRab = (master: WorkItemMaster) => {
    const markup = systemConfig?.globalMarkup || 20;
    // We calculate display price dynamically based on client price to represent the official contract value
    const displayPrice = calculateClientPrice(master.price, markup, master.isAHSP);
    
    const newItem: RabItem = {
      ...master,
      instanceId: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      // We keep 'price' as the base price from masterData
      volume: 1,
      total: displayPrice, // Initial total (Client price)
      code: master.code || master.id,
      notes: "",
      technicalSpecs: master.technicalSpecs || ""
    };
    setRabItems([...rabItems, newItem]);
    setSearchQuery("");
    setIsAddingItem(false);
  };

  const handleSaveDraft = async () => {
    if (rabItems.length === 0) {
      toast.error("Tidak ada item untuk disimpan.");
      return;
    }
    const draftData = {
      projectName: projectInfo.projectName,
      clientName: projectInfo.clientName,
      address: projectInfo.address,
      items: rabItems,
      totalBudget: grandTotal,
      date: projectInfo.date
    };
    await saveEstimate(draftData);
  };

  // Real-time Price Recalculation Effect
  useEffect(() => {
    if (!systemConfig?.globalMarkup) return;
    
    setRabItems(prev => prev.map(item => {
      const markup = systemConfig.globalMarkup;
      const displayPrice = calculateClientPrice(item.price, markup, item.isAHSP);
        
      return {
        ...item,
        total: (item.volume || 0) * displayPrice
      };
    }));
  }, [systemConfig?.globalMarkup]);

  const updateItemById = (instanceId: string, updates: Partial<RabItem>) => {
    setRabItems(prev => prev.map(item => {
      if (item.instanceId === instanceId) {
        const updatedItem = { ...item, ...updates };
        const markup = systemConfig?.globalMarkup || 20;
        const displayPrice = calculateClientPrice(updatedItem.price, markup, updatedItem.isAHSP);
        
        updatedItem.total = (updatedItem.volume || 0) * displayPrice;
        return updatedItem;
      }
      return item;
    }));
  };

  const removeItem = (instanceId: string) => {
    setRabItems(rabItems.filter((item) => item.instanceId !== instanceId));
    setSelectedIndexes(prev => {
      const next = new Set(prev);
      next.delete(instanceId);
      return next;
    });
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, RabItem[]> = {};
    categories.forEach(cat => groups[cat] = []);
    
    rabItems.forEach(item => {
      const cat = item.category || "Lain-lain";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    
    return groups;
  }, [rabItems, categories]);

  const grandTotalRaw = rabItems.reduce((sum, item) => sum + item.total, 0);
  const amountBeforeTax = grandTotalRaw - (projectInfo.discount || 0);
  const taxAmount = amountBeforeTax > 0 ? (amountBeforeTax * (projectInfo.taxPercentage / 100)) : 0;
  const grandTotal = Math.ceil((amountBeforeTax + taxAmount - (projectInfo.assessmentDeposit || 0)) / 1000) * 1000;

  const exportToPDF = async () => {
    toast.promise(generateRABPDF(
      projectInfo.projectName, 
      categories.map(c => ({ id: c, name: c })), 
      rabItems.map(item => {
        const pricePerUnit = calculateClientPrice(item.price, systemConfig?.globalMarkup, item.isAHSP || false);
        const totalPrice = roundToRibuan(pricePerUnit * item.volume);

        return {
          ...item,
          quantity: item.volume,
          pricePerUnit,
          totalPrice,
          technicalSpecs: item.technicalSpecs
        };
      }), 
      pdfLogo,
      {
        name: projectInfo.projectName,
        location: projectInfo.address,
        client: projectInfo.clientName,
        phone: projectInfo.contact
      },
      {
        discount: projectInfo.discount,
        taxPercentage: projectInfo.taxPercentage,
        assessmentDeposit: projectInfo.assessmentDeposit
      }
    ), {
      loading: 'Generating PDF...',
      success: 'RAB PDF Exported!',
      error: 'Failed to generate PDF'
    });
  };

  const shareExportToPDF = async () => {
    const summaryText = `Halo Bpk/Ibu ${projectInfo.clientName || 'Klien'},\n\nBerikut adalah RINGKASAN RAB untuk Proyek ${projectInfo.projectName}:\nTotal Estimasi: ${formatRupiah(grandTotal)}\n\nTerlampir dokumen PDF detailnya. Semoga berkenan dan menjadi awal kerjasama yang baik.\n\nTerima kasih.\nTBJ Constech OS`;

    toast.promise(generateRABPDF(
      projectInfo.projectName, 
      categories.map(c => ({ id: c, name: c })), 
      rabItems.map(item => {
        const pricePerUnit = calculateClientPrice(item.price, systemConfig?.globalMarkup, item.isAHSP || false);
        const totalPrice = roundToRibuan(pricePerUnit * item.volume);

        return {
          ...item,
          quantity: item.volume,
          pricePerUnit,
          totalPrice,
          technicalSpecs: item.technicalSpecs
        };
      }), 
      pdfLogo,
      {
        name: projectInfo.projectName,
        location: projectInfo.address,
        client: projectInfo.clientName,
        phone: projectInfo.contact
      },
      {
        discount: projectInfo.discount,
        taxPercentage: projectInfo.taxPercentage,
        assessmentDeposit: projectInfo.assessmentDeposit
      },
      true,
      summaryText
    ), {
      loading: 'Preparing share...',
      success: 'RAB PDF shared!',
      error: 'Failed to share PDF'
    });
  };

  const handleLoadEstimate = (est: any) => {
    setProjectInfo({
      clientName: est.clientName || user?.displayName || "",
      projectName: est.projectName || "",
      address: est.address || "",
      date: est.date || new Date().toISOString(),
      contact: est.contact || user?.whatsapp || "",
      discount: est.discount || 0,
      taxPercentage: est.taxPercentage || 0,
      assessmentDeposit: est.assessmentDeposit || 0,
    });
    // Ensure all items have instanceId for removal functionality
    setRabItems((est.items || []).map((item: any) => ({
      ...item,
      instanceId: item.instanceId || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    })));
    setActiveTab("editor");
    toast.success("Estimasi berhasil dimuat.");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 py-6 md:py-12 px-4 md:px-6 bg-white min-h-screen">
      {/* Sleek Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-8 pb-8 md:pb-12 border-b border-neutral-100">
        <div className="space-y-4 w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl overflow-hidden border-2 border-black bg-white shrink-0">
              <img src={headerLogo} alt="TBJ Logo" className="w-full h-full object-cover" />
            </div>
            <div className="h-6 md:h-8 w-[1px] bg-neutral-200" />
            <Badge variant="outline" className="border-neutral-200 text-neutral-400 uppercase-soft text-[8px] md:text-[9px] h-6">Master RAB Engine v2.0</Badge>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-tight md:leading-none text-neutral-900">Rencana Anggaran Biaya</h1>
            <p className="text-neutral-400 uppercase-soft text-[9px] md:text-[10px] tracking-[0.1em] md:tracking-[0.2em] font-bold">Build with Intelligence • Design with Soul</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-full gap-2 h-10 md:h-12 px-4 md:px-8 uppercase-soft text-[9px] md:text-[10px] font-black" onClick={exportToPDF}>
            <Download className="w-4 h-4" /> Export PDF
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none border-neutral-200 text-green-600 hover:bg-green-50 rounded-full gap-2 h-10 md:h-12 px-4 md:px-8 uppercase-soft text-[9px] md:text-[10px] font-black" onClick={() => shareExportToPDF()}>
            <Share2 className="w-4 h-4" /> Bagikan WA
          </Button>
          {canEdit && (
            <Button 
              className="flex-1 md:flex-none bg-black text-white hover:bg-neutral-800 rounded-full gap-2 h-10 md:h-12 px-4 md:px-8 uppercase-soft text-[9px] md:text-[10px] font-black shadow-xl shadow-black/10"
              onClick={handleSaveDraft}
            >
              <Save className="w-4 h-4" /> Simpan Draft
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-neutral-100 rounded-2xl w-full sm:w-fit mb-6 md:mb-8 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("editor")}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
            activeTab === "editor" ? "bg-black text-white shadow-md" : "text-neutral-500 hover:bg-black/5"
          )}
        >
          <Calculator className="w-4 h-4" />
          Editor RAB
        </button>
        <button
          onClick={() => setActiveTab("archive")}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
            activeTab === "archive" ? "bg-black text-white shadow-md" : "text-neutral-500 hover:bg-black/5"
          )}
        >
          <HistoryIcon className="w-4 h-4" />
          Arsip Estimasi
          {estimates.length > 0 && (
            <Badge className="bg-accent text-white border-none ml-2 rounded-md h-5 px-1.5">{estimates.length}</Badge>
          )}
        </button>
      </div>

      {activeTab === "archive" ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 bg-neutral-50 p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-black/5">
            <div className="space-y-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Arsip Estimasi</h2>
              <p className="uppercase-soft text-[9px] md:text-[10px] text-neutral-400">Kelola dan tinjau kembali draf project Anda</p>
            </div>
            
            <div className="grid grid-cols-1 md:flex items-center gap-4 w-full md:w-auto">
              <select
                className="h-10 md:h-12 px-4 rounded-full border-black/10 text-[9px] md:text-[10px] font-black uppercase tracking-widest outline-none bg-white min-w-[140px]"
                value={archiveType}
                onChange={e => setArchiveType(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="Renovasi">Renovasi</option>
                <option value="Interior">Interior</option>
                <option value="Arsitektur">Arsitektur</option>
                <option value="Landskap">Landskap</option>
                <option value="Maintenance">Maintenance</option>
              </select>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input 
                  placeholder="Search estimates..." 
                  className="pl-10 h-10 md:h-12 rounded-full border-black/10 bg-white text-[11px]"
                  value={archiveSearch}
                  onChange={e => setArchiveSearch(e.target.value)}
                />
              </div>
              <Button 
                className="btn-orange h-10 md:h-14 px-6 md:px-10 rounded-full text-[10px] md:text-[11px] uppercase font-black tracking-[0.2em] shadow-xl shadow-accent/20 hover:scale-105 transition-transform w-full md:w-auto"
                onClick={() => {
                  setRabItems([]);
                  setProjectInfo({
                    clientName: user?.displayName || "",
                    projectName: "Proyek Konstruksi & Interior TBJ",
                    address: "Lokasi Proyek",
                    date: new Date().toLocaleDateString('id-ID'),
                    contact: user?.whatsapp || "",
                    discount: 0,
                    taxPercentage: 0,
                    assessmentDeposit: 0,
                  });
                  setActiveTab("editor");
                  toast.success("Mulai membuat RAB baru.");
                }}
              >
                <Plus className="w-5 h-5 mr-2 md:mr-3" /> Buat RAB Baru
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {estimates.filter(est => {
              const matchesSearch = (est.projectName || "").toLowerCase().includes(archiveSearch.toLowerCase()) ||
                                    (est.clientName || "").toLowerCase().includes(archiveSearch.toLowerCase());
              const matchesType = archiveType === "all" || est.type === archiveType;
              return matchesSearch && matchesType;
            }).map((est) => (
              <Card key={est.id} className="border border-neutral-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                <CardHeader className="bg-neutral-50 border-b border-neutral-100 py-6">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-[8px] uppercase font-black border-neutral-200">
                      {(est.createdAt ? new Date(est.createdAt).toLocaleDateString('id-ID') : '-')}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                      onClick={() => handleDeleteEstimate(est.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-xl font-black uppercase tracking-tighter mt-4 leading-tight truncate">{est.projectName || "Estimasi Tanpa Nama"}</CardTitle>
                  <CardDescription className="uppercase-soft text-[10px]">{est.clientName}</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">Total Estimasi</p>
                      <p className="text-xl font-black tracking-tighter">
                        Rp {(est.totalBudget || 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">Item Pekerjaan</p>
                      <p className="text-sm font-bold">{est.items?.length || 0} Item</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      className="flex-grow btn-sleek rounded-2xl h-12 uppercase font-black text-[10px] gap-2"
                      onClick={() => handleLoadEstimate(est)}
                    >
                      <Plus className="w-4 h-4" /> Buka & Edit
                    </Button>
                    <Button 
                      variant="ghost"
                      className="w-12 h-12 rounded-2xl border border-red-50 text-red-400 hover:bg-red-50 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        if(confirm("Hapus arsip estimasi ini?")) {
                          deleteEstimate(est.id);
                          toast.success("Estimasi dihapus.");
                        }
                      }}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {estimates.length === 0 && !estimatesLoading && (
              <div className="col-span-full py-32 text-center border-2 border-dashed border-neutral-100 rounded-[40px] flex flex-col items-center gap-4">
                <HistoryIcon className="w-16 h-16 text-neutral-100" />
                <p className="uppercase-soft text-neutral-400 font-bold">Belum ada estimasi yang disimpan.</p>
              </div>
            )}
            {estimatesLoading && (
              <div className="col-span-full py-32 text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-neutral-200" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 md:gap-12 animate-in fade-in slide-in-from-bottom-4">
        {/* Project Info - Thinner Design */}
        <div className="lg:col-span-1 space-y-6 md:space-y-8">
          <div className="space-y-4 md:space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 border-b border-neutral-100 pb-2">Project Dossier</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-6">
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase font-black text-neutral-300">Client Name</Label>
                <Input 
                  disabled={!canEdit}
                  value={projectInfo.clientName} 
                  onChange={e => setProjectInfo({...projectInfo, clientName: e.target.value})} 
                  className="rounded-none border-0 border-b border-neutral-100 focus-visible:ring-0 focus-visible:border-black px-0 h-8 text-sm font-bold uppercase w-full" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase font-black text-neutral-300">Project Title</Label>
                <Input 
                  disabled={!canEdit}
                  value={projectInfo.projectName} 
                  onChange={e => setProjectInfo({...projectInfo, projectName: e.target.value})} 
                  className="rounded-none border-0 border-b border-neutral-100 focus-visible:ring-0 focus-visible:border-black px-0 h-8 text-sm font-bold uppercase w-full" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase font-black text-neutral-300">Site Location</Label>
                <Input 
                  disabled={!canEdit}
                  value={projectInfo.address} 
                  onChange={e => setProjectInfo({...projectInfo, address: e.target.value})} 
                  className="rounded-none border-0 border-b border-neutral-100 focus-visible:ring-0 focus-visible:border-black px-0 h-8 text-sm font-bold uppercase w-full" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase font-black text-neutral-300">WA Contact</Label>
                <Input 
                  disabled={!canEdit}
                  value={projectInfo.contact} 
                  onChange={e => setProjectInfo({...projectInfo, contact: e.target.value})} 
                  className="rounded-none border-0 border-b border-neutral-100 focus-visible:ring-0 focus-visible:border-black px-0 h-8 text-sm font-bold uppercase w-full" 
                />
              </div>
              <div className="pt-4 space-y-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-2">Financial Adj.</p>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase font-black text-neutral-300">Discount Amount</Label>
                  <Input 
                    disabled={!canEdit}
                    type="number"
                    value={projectInfo.discount} 
                    onChange={e => setProjectInfo({...projectInfo, discount: Number(e.target.value)})} 
                    className="rounded-none border-0 border-b border-neutral-100 focus-visible:ring-0 focus-visible:border-black px-0 h-8 text-sm font-bold uppercase w-full" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase font-black text-neutral-300">Tax (%)</Label>
                  <Input 
                    disabled={!canEdit}
                    type="number"
                    value={projectInfo.taxPercentage} 
                    onChange={e => setProjectInfo({...projectInfo, taxPercentage: Number(e.target.value)})} 
                    className="rounded-none border-0 border-b border-neutral-100 focus-visible:ring-0 focus-visible:border-black px-0 h-8 text-sm font-bold uppercase w-full" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase font-black text-neutral-300">Survey Deposit</Label>
                  <Input 
                    disabled={!canEdit}
                    type="number"
                    value={projectInfo.assessmentDeposit} 
                    onChange={e => setProjectInfo({...projectInfo, assessmentDeposit: Number(e.target.value)})} 
                    className="rounded-none border-0 border-b border-neutral-100 focus-visible:ring-0 focus-visible:border-black px-0 h-8 text-sm font-bold uppercase w-full" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 md:p-6 bg-neutral-50 rounded-2xl space-y-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Financial Summary</p>
            <div className="space-y-1">
              <p className="text-2xl md:text-3xl font-black tracking-tighter">Rp {(grandTotal || 0).toLocaleString('id-ID')}</p>
              <p className="text-[10px] font-bold text-neutral-400 uppercase">Total Estimated Budget</p>
            </div>

            {canEdit && (
              <div className="pt-4 mt-4 border-t border-neutral-200 space-y-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-accent">TBJ Internal Analysis</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                    <span className="text-neutral-400">Internal Modal Total</span>
                    <span className="text-neutral-900">{formatRupiah(rabItems.reduce((sum, item) => sum + (item.price * item.volume), 0))}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                    <span className="text-neutral-400">Internal Admin Total</span>
                    <span className="text-neutral-900">{formatRupiah(rabItems.reduce((sum, item) => sum + (calculateAdminPrice(item.price, systemConfig?.globalMarkup, item.isAHSP) * item.volume), 0))}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                    <span className="text-neutral-400">Client Sale Total</span>
                    <span className="text-neutral-900">{formatRupiah(rabItems.reduce((sum, item) => sum + (calculateClientPrice(item.price, systemConfig?.globalMarkup, item.isAHSP) * item.volume), 0))}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-green-600">
                    <span>Estimasi Profit</span>
                    <span>+ {formatRupiah(rabItems.reduce((sum, item) => {
                      const admin = calculateAdminPrice(item.price, systemConfig?.globalMarkup, item.isAHSP) * item.volume;
                      const client = calculateClientPrice(item.price, systemConfig?.globalMarkup, item.isAHSP) * item.volume;
                      return sum + (client - admin);
                    }, 0))}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main RAB Table - Sleek & Light */}
        <div className="lg:col-span-3 space-y-4 md:space-y-6 min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Work Items Breakdown</h3>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {selectedIndexes.size > 0 && canEdit && (
                <Button 
                  variant="destructive" 
                  className="text-[10px] font-black uppercase gap-2 hover:bg-red-700 h-9 px-4 rounded-xl shadow-lg shadow-red-500/20"
                  onClick={handleBulkRemove}
                >
                  <Trash2 className="w-3 h-3" /> Hapus Terpilih ({selectedIndexes.size})
                </Button>
              )}
              {canEdit && (
                <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
                  <DialogTrigger render={
                    <Button variant="ghost" className="text-[10px] font-black uppercase gap-2 hover:bg-neutral-50">
                      <Plus className="w-3 h-3" /> Add Category
                    </Button>
                  } />
                  <DialogContent className="max-w-sm rounded-3xl border border-neutral-100 shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Add Category</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase">Category Name</Label>
                        <Input 
                          placeholder="e.g. Pekerjaan Atap" 
                          className="h-12 rounded-2xl border-neutral-100 focus:border-black transition-all"
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newCategoryName) {
                              const trimmed = newCategoryName.trim();
                              if (categories.includes(trimmed)) {
                                toast.error("Category already exists");
                                return;
                              }
                              setCategories([...categories, trimmed]);
                              setNewCategoryName("");
                              setShowAddCategory(false);
                              toast.success("Category added");
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      <Button className="w-full btn-sleek h-12 rounded-2xl" onClick={() => {
                        if (newCategoryName) {
                          const trimmed = newCategoryName.trim();
                          if (categories.includes(trimmed)) {
                            toast.error("Category already exists");
                            return;
                          }
                          setCategories([...categories, trimmed]);
                          setNewCategoryName("");
                          setShowAddCategory(false);
                          toast.success("Category added");
                        }
                      }}>Add Category</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {canEdit && (
                <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
                  <DialogTrigger render={
                    <Button variant="ghost" className="text-[10px] font-black uppercase gap-2 hover:bg-neutral-50">
                      <Plus className="w-3 h-3" /> Add Item
                    </Button>
                  } />
                  <DialogContent className="max-w-2xl rounded-3xl border border-neutral-100 shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Search Master AHSP</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                      <div className="relative">
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400" />
                        <Input 
                          placeholder="Search work items..." 
                          className="pl-12 h-12 rounded-2xl border-neutral-100 focus:border-black transition-all"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredMaster.map(item => (
                          <div 
                            key={item.id} 
                            className="p-4 border border-neutral-100 hover:border-black rounded-2xl cursor-pointer transition-all group flex justify-between items-center"
                            onClick={() => addItemToRab(item)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm uppercase tracking-tight group-hover:text-black break-words whitespace-normal leading-tight">{item.name}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-[8px] uppercase font-bold rounded-md border-neutral-100">{item.category}</Badge>
                                <span className="text-[9px] text-neutral-400 font-bold uppercase">{item.unit}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-sm">
                                {formatRupiah(canEdit ? calculateAdminPrice(item.price, systemConfig?.globalMarkup) : calculateClientPrice(item.price, systemConfig?.globalMarkup))}
                              </p>
                              <p className="text-[8px] text-neutral-400 uppercase font-black">Estimasi Harga Final</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <div className="border border-neutral-100 rounded-3xl overflow-hidden shadow-sm overflow-x-auto">
            <Table className="min-w-[800px] md:min-w-full">
              <TableHeader className="bg-neutral-50/50">
                <TableRow className="border-b border-neutral-100 hover:bg-transparent">
                  <TableHead className="w-[40px] px-6">
                    <Checkbox 
                      checked={rabItems.length > 0 && Array.from(selectedIndexes).length === rabItems.length}
                      onCheckedChange={() => toggleSelectAllEditor()}
                    />
                  </TableHead>
                  <TableHead className="w-[80px] text-[9px] font-black uppercase text-neutral-400 px-6">Code</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-neutral-400">Description</TableHead>
                  <TableHead className="w-[100px] text-center text-[9px] font-black uppercase text-neutral-400">Volume</TableHead>
                  <TableHead className="w-[80px] text-center text-[9px] font-black uppercase text-neutral-400">Unit</TableHead>
                  {canEdit && (
                    <>
                      <TableHead className="w-[120px] text-right text-[9px] font-black uppercase text-neutral-400">Modal (U/T)</TableHead>
                      <TableHead className="w-[120px] text-right text-[9px] font-black uppercase text-accent">Admin (U/T)</TableHead>
                    </>
                  )}
                  <TableHead className="w-[150px] text-right text-[9px] font-black uppercase text-neutral-600 px-6">Klien (U/T)</TableHead>
                  {canEdit && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedItems).map(([catName, items]) => (
                  <React.Fragment key={catName}>
                    <TableRow className="bg-neutral-50/50 border-b border-neutral-100">
                      <TableCell colSpan={canEdit ? 8 : 7} className="py-2 px-6">
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={items.length > 0 && items.every(i => selectedIndexes.has(i.instanceId))}
                            onCheckedChange={() => toggleSelectAllEditor(catName)}
                          />
                          <span className="text-[10px] font-black uppercase tracking-widest text-black">{catName}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {items.map((item, index) => {
                      const isExpanded = expandedItems.has(item.instanceId);
                      return (
                        <React.Fragment key={item.instanceId}>
                          <TableRow className="border-b border-neutral-50 hover:bg-neutral-50/30 transition-colors">
                            <TableCell className="px-6">
                              <Checkbox 
                                checked={selectedIndexes.has(item.instanceId)}
                                onCheckedChange={() => toggleSelectIndex(item.instanceId)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-[9px] text-neutral-400 font-bold px-6">{item.code || "N/A"}</TableCell>
                            <TableCell className="max-w-[200px] md:max-w-[350px]">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-[11px] uppercase tracking-tight text-neutral-800 break-words whitespace-normal leading-tight">{item.name}</p>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-5 w-5 rounded-full hover:bg-accent hover:text-white"
                                  onClick={() => toggleExpand(item.instanceId)}
                                >
                                  {isExpanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                </Button>
                              </div>
                              <p className="text-[8px] text-neutral-400 uppercase font-bold">{item.category}</p>
                              {item.technicalSpecs && !isExpanded && (
                                <p className="text-[8px] text-neutral-500 italic mt-1 truncate max-w-[200px]">{item.technicalSpecs}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input 
                                disabled={!canEdit}
                                type="number" 
                                value={item.volume || 0} 
                                onChange={e => updateItemById(item.instanceId, { volume: Math.max(0, Number(e.target.value)) })}
                                className="h-7 text-center border-neutral-100 rounded-lg font-bold text-xs bg-transparent focus-visible:ring-black"
                              />
                            </TableCell>
                            <TableCell className="text-center font-bold text-[10px] uppercase text-neutral-400">{item.unit}</TableCell>
                            {canEdit && (
                              <>
                                <TableCell className="text-right">
                                  <div className="flex flex-col gap-1">
                                    <Input 
                                      type="number"
                                      className="h-7 text-right border-neutral-100 rounded-lg font-bold text-[10px] bg-transparent focus-visible:ring-black"
                                      value={item.price || 0}
                                      onChange={e => updateItemById(item.instanceId, { price: Number(e.target.value) })}
                                    />
                                    <span className="text-[10px] font-mono font-bold text-neutral-400 px-2">{formatRupiah(item.price * (item.volume || 0))}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-mono text-accent">{formatRupiah(calculateAdminPrice(item.price, systemConfig?.globalMarkup, item.isAHSP))}</span>
                                    <span className="text-[10px] font-mono font-bold text-accent">{formatRupiah(calculateAdminPrice(item.price, systemConfig?.globalMarkup, item.isAHSP) * (item.volume || 0))}</span>
                                  </div>
                                </TableCell>
                              </>
                            )}
                            <TableCell className="text-right px-6">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-mono text-neutral-600">{formatRupiah(calculateClientPrice(item.price, systemConfig?.globalMarkup, item.isAHSP))}</span>
                                <span className="text-xs font-black tracking-tighter text-black">{formatRupiah(calculateClientPrice(item.price, systemConfig?.globalMarkup, item.isAHSP) * (item.volume || 0))}</span>
                              </div>
                            </TableCell>
                            {canEdit && (
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>} />
                                  <DropdownMenuContent align="end" className="rounded-xl">
                                    <DropdownMenuItem className="text-xs uppercase font-bold gap-2" onClick={() => toggleExpand(item.instanceId)}>
                                      <Edit3 className="w-3 h-3" /> Edit Specs
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-xs uppercase font-bold gap-2 text-red-600" onClick={() => removeItem(item.instanceId)}>
                                      <Eraser className="w-3 h-3" /> Remove Item
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            )}
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-neutral-50/20">
                              <TableCell colSpan={canEdit ? 8 : 7} className="px-6 py-4">
                                <div className="space-y-2">
                                  <Label className="text-[9px] font-black uppercase text-neutral-400">Keterangan Spesifikasi (Merk, Tipe, Material)</Label>
                                  <Textarea 
                                    value={item.technicalSpecs || ""}
                                    onChange={e => updateItemById(item.instanceId, { technicalSpecs: e.target.value })}
                                    placeholder="Masukkan spesifikasi teknis untuk item ini..."
                                    className="min-h-[60px] text-xs font-bold rounded-xl border-neutral-100 focus:border-black"
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                ))}
                {rabItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 8 : 7} className="h-64 text-center">
                      <div className="flex flex-col items-center gap-2 text-neutral-200">
                        <FileText className="w-10 h-10" />
                        <p className="uppercase-soft text-[9px] font-black">No items added to this RAB</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      )}

      {/* Footer Branding */}
      <div className="flex flex-col md:flex-row justify-between items-center py-8 md:py-12 border-t-2 border-black/5 gap-6 md:gap-8">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-black rounded-2xl flex items-center justify-center text-white font-black text-lg md:text-xl shrink-0">TBJ</div>
          <div>
            <p className="font-black uppercase tracking-tighter text-sm md:text-base">TBJ Contractor Hub</p>
            <p className="text-[9px] md:text-[10px] uppercase-soft text-neutral-400">Build with Intelligence • Design with Soul</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center md:justify-end gap-4 md:gap-6">
          <a href="https://www.instagram.com/tukang.bangunan.jakarta/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase hover:text-neutral-500 transition-colors">
            <Instagram className="w-3 h-3 md:w-4 md:h-4" /> @tukang.bangunan.jakarta
          </a>
          <a href="#" className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase hover:text-neutral-500 transition-colors">
            <Share2 className="w-3 h-3 md:w-4 md:h-4" /> Share Project
          </a>
          <a href="#" className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase hover:text-neutral-500 transition-colors">
            <Phone className="w-3 h-3 md:w-4 md:h-4" /> WhatsApp Support
          </a>
        </div>
      </div>

      {/* Delete Estimate Confirmation Dialog */}
      <Dialog open={!!deleteEstimateId} onOpenChange={(open) => !open && setDeleteEstimateId(null)}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <div className="bg-red-500 p-8 text-white flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <Trash2 className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Hapus Arsip?</h2>
              <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">Estimasi draf ini akan hilang</p>
            </div>
          </div>
          <div className="p-8 space-y-6 text-center">
            <p className="text-sm font-medium text-neutral-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus arsip estimasi ini secara permanen?
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" className="rounded-2xl h-12 px-8 uppercase font-black text-[10px] tracking-widest border-neutral-200" onClick={() => setDeleteEstimateId(null)}>Batal</Button>
              <Button className="rounded-2xl h-12 px-8 uppercase font-black text-[10px] tracking-widest bg-red-500 hover:bg-black text-white" onClick={executeDeleteEstimate}>Hapus</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
