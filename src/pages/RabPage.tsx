import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMasterData, useAuth, useMediaAssets, useSavedEstimates, useSystemConfig } from "@/lib/hooks";
import { WorkItemMaster, UserTier } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Minus, Trash2, Download, Share2, Instagram, Phone, Mail, Building2, Save, FileText, ChevronRight, Calculator, MoreHorizontal, Eraser, Edit3, Loader2, History as HistoryIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn, formatRupiah, calculateAdminPrice, calculateClientPrice } from "@/lib/utils";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { TBJ_LOGO } from "@/constants";

import { generateRABPDF } from "@/lib/pdfUtils";

interface RabItem extends WorkItemMaster {
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
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
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
  });

  // Access Control
  useEffect(() => {
    // Admin and PM can always access
    if (user?.role === 'admin' || user?.role === 'pm') return;
    
    // Tier 2 and Tier 3 clients can view
    if (user?.tier === 'survey' || user?.tier === 'deal') return;

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
    const price = canEdit ? calculateAdminPrice(master.price, markup) : calculateClientPrice(master.price, markup);
    
    const newItem: RabItem = {
      ...master,
      price,
      volume: 1,
      total: price,
      code: master.code || master.id,
      notes: "",
      technicalSpecs: master.technicalSpecs || ""
    };
    setRabItems([...rabItems, newItem]);
    setSearchQuery("");
    setIsAddingItem(false);
  };

  const toggleExpand = (index: number) => {
    const next = new Set(expandedItems);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedItems(next);
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

  const updateItem = (index: number, updates: Partial<RabItem>) => {
    const newItems = [...rabItems];
    const updatedItem = { ...newItems[index], ...updates };
    updatedItem.total = updatedItem.volume * updatedItem.price;
    newItems[index] = updatedItem;
    setRabItems(newItems);
  };

  const removeItem = (index: number) => {
    setRabItems(rabItems.filter((_, i) => i !== index));
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

  const grandTotal = rabItems.reduce((sum, item) => sum + item.total, 0);

  const exportToPDF = async () => {
    toast.promise(generateRABPDF(projectInfo.projectName, categories.map(c => ({ id: c, name: c })), rabItems.map(item => ({
      ...item,
      quantity: item.volume,
      pricePerUnit: item.price,
      totalPrice: item.total
    })), pdfLogo), {
      loading: 'Generating PDF...',
      success: 'RAB PDF Exported!',
      error: 'Failed to generate PDF'
    });
  };

  const handleLoadEstimate = (est: any) => {
    setProjectInfo({
      clientName: est.clientName || user?.displayName || "",
      projectName: est.projectName || "",
      address: est.address || "",
      date: est.date || new Date().toISOString(),
      contact: est.contact || user?.whatsapp || "",
    });
    setRabItems(est.items || []);
    setActiveTab("editor");
    toast.success("Estimasi berhasil dimuat.");
  };

  const handleDeleteEstimate = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus arsip ini?")) {
      await deleteEstimate(id);
      toast.success("Estimasi dihapus.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-12 px-6 bg-white min-h-screen">
      {/* Sleek Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-8 pb-12 border-b border-neutral-100">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl overflow-hidden border-2 border-black bg-white">
              <img src={headerLogo} alt="TBJ Logo" className="w-full h-full object-cover" />
            </div>
            <div className="h-8 w-[1px] bg-neutral-200" />
            <Badge variant="outline" className="border-neutral-200 text-neutral-400 uppercase-soft text-[9px] h-6">Master RAB Engine v2.0</Badge>
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter uppercase leading-none text-neutral-900">Rencana Anggaran Biaya</h1>
            <p className="text-neutral-400 uppercase-soft text-[10px] tracking-[0.2em] font-bold">Build with Intelligence • Design with Soul</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-full gap-2 h-12 px-8 uppercase-soft text-[10px] font-black" onClick={exportToPDF}>
            <Download className="w-4 h-4" /> Export PDF
          </Button>
          {canEdit && (
            <Button 
              className="bg-black text-white hover:bg-neutral-800 rounded-full gap-2 h-12 px-8 uppercase-soft text-[10px] font-black shadow-xl shadow-black/10"
              onClick={handleSaveDraft}
            >
              <Save className="w-4 h-4" /> Simpan Draft
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-neutral-100 rounded-2xl w-fit mb-8">
        <button
          onClick={() => setActiveTab("editor")}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === "editor" ? "bg-black text-white shadow-md" : "text-neutral-500 hover:bg-black/5"
          )}
        >
          <Calculator className="w-4 h-4" />
          Editor RAB
        </button>
        <button
          onClick={() => setActiveTab("archive")}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
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
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 bg-neutral-50 p-8 rounded-[32px] border border-black/5">
            <div className="space-y-1">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Arsip Estimasi</h2>
              <p className="uppercase-soft text-[10px] text-neutral-400">Kelola dan tinjau kembali draf project Anda</p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <select
                className="h-12 px-4 rounded-full border-black/10 text-[10px] font-black uppercase tracking-widest outline-none bg-white min-w-[140px]"
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
                  className="pl-10 h-12 rounded-full border-black/10 bg-white"
                  value={archiveSearch}
                  onChange={e => setArchiveSearch(e.target.value)}
                />
              </div>
              <Button 
                className="btn-orange h-14 px-10 rounded-full text-[11px] uppercase font-black tracking-[0.2em] shadow-xl shadow-accent/20 hover:scale-105 transition-transform w-full md:w-auto"
                onClick={() => {
                  setRabItems([]);
                  setProjectInfo({
                    clientName: user?.displayName || "",
                    projectName: "Proyek Konstruksi & Interior TBJ",
                    address: "Lokasi Proyek",
                    date: new Date().toLocaleDateString('id-ID'),
                    contact: user?.whatsapp || "",
                  });
                  setActiveTab("editor");
                  toast.success("Mulai membuat RAB baru.");
                }}
              >
                <Plus className="w-5 h-5 mr-3" /> Buat RAB Baru
              </Button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="grid lg:grid-cols-4 gap-12 animate-in fade-in slide-in-from-bottom-4">
        {/* Project Info - Thinner Design */}
        <div className="lg:col-span-1 space-y-8">
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 border-b border-neutral-100 pb-2">Project Dossier</h3>
            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase font-black text-neutral-300">Client Name</Label>
                <Input 
                  disabled={!canEdit}
                  value={projectInfo.clientName} 
                  onChange={e => setProjectInfo({...projectInfo, clientName: e.target.value})} 
                  className="rounded-none border-0 border-b border-neutral-100 focus-visible:ring-0 focus-visible:border-black px-0 h-8 text-sm font-bold uppercase" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase font-black text-neutral-300">Project Title</Label>
                <Input 
                  disabled={!canEdit}
                  value={projectInfo.projectName} 
                  onChange={e => setProjectInfo({...projectInfo, projectName: e.target.value})} 
                  className="rounded-none border-0 border-b border-neutral-100 focus-visible:ring-0 focus-visible:border-black px-0 h-8 text-sm font-bold uppercase" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase font-black text-neutral-300">Site Location</Label>
                <Input 
                  disabled={!canEdit}
                  value={projectInfo.address} 
                  onChange={e => setProjectInfo({...projectInfo, address: e.target.value})} 
                  className="rounded-none border-0 border-b border-neutral-100 focus-visible:ring-0 focus-visible:border-black px-0 h-8 text-sm font-bold uppercase" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase font-black text-neutral-300">WA Contact</Label>
                <Input 
                  disabled={!canEdit}
                  value={projectInfo.contact} 
                  onChange={e => setProjectInfo({...projectInfo, contact: e.target.value})} 
                  className="rounded-none border-0 border-b border-neutral-100 focus-visible:ring-0 focus-visible:border-black px-0 h-8 text-sm font-bold uppercase" 
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-neutral-50 rounded-2xl space-y-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Financial Summary</p>
            <div className="space-y-1">
              <p className="text-3xl font-black tracking-tighter">Rp {(grandTotal || 0).toLocaleString('id-ID')}</p>
              <p className="text-[10px] font-bold text-neutral-400 uppercase">Total Estimated Budget</p>
            </div>
          </div>
        </div>

        {/* Main RAB Table - Sleek & Light */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Work Items Breakdown</h3>
            <div className="flex gap-2">
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
                        />
                      </div>
                      <Button className="w-full btn-sleek h-12 rounded-2xl" onClick={() => {
                        if (newCategoryName) {
                          setCategories([...categories, newCategoryName]);
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

          <div className="border border-neutral-100 rounded-3xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-neutral-50/50">
                <TableRow className="border-b border-neutral-100 hover:bg-transparent">
                  <TableHead className="w-[80px] text-[9px] font-black uppercase text-neutral-400 px-6">Code</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-neutral-400">Description</TableHead>
                  <TableHead className="w-[100px] text-center text-[9px] font-black uppercase text-neutral-400">Volume</TableHead>
                  <TableHead className="w-[80px] text-center text-[9px] font-black uppercase text-neutral-400">Unit</TableHead>
                  <TableHead className="w-[150px] text-right text-[9px] font-black uppercase text-neutral-400">Estimasi Anggaran</TableHead>
                  <TableHead className="w-[150px] text-right text-[9px] font-black uppercase text-neutral-400 px-6">Total</TableHead>
                  {canEdit && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedItems).map(([catName, items]) => (
                  <React.Fragment key={catName}>
                    {items.length > 0 && (
                      <TableRow className="bg-neutral-50/50 border-b border-neutral-100">
                        <TableCell colSpan={canEdit ? 7 : 6} className="py-2 px-6">
                          <span className="text-[10px] font-black uppercase tracking-widest text-black">{catName}</span>
                        </TableCell>
                      </TableRow>
                    )}
                    {items.map((item, index) => {
                      const globalIndex = rabItems.findIndex(ri => ri.id === item.id && ri.name === item.name);
                      const isExpanded = expandedItems.has(globalIndex);
                      return (
                        <React.Fragment key={index}>
                          <TableRow className="border-b border-neutral-50 hover:bg-neutral-50/30 transition-colors">
                            <TableCell className="font-mono text-[9px] text-neutral-400 font-bold px-6">{item.code || "N/A"}</TableCell>
                            <TableCell className="max-w-[200px] md:max-w-[350px]">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-[11px] uppercase tracking-tight text-neutral-800 break-words whitespace-normal leading-tight">{item.name}</p>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-5 w-5 rounded-full hover:bg-accent hover:text-white"
                                  onClick={() => toggleExpand(globalIndex)}
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
                                onChange={e => updateItem(globalIndex, { volume: Math.max(0, Number(e.target.value)) })}
                                className="h-7 text-center border-neutral-100 rounded-lg font-bold text-xs bg-transparent focus-visible:ring-black"
                              />
                            </TableCell>
                            <TableCell className="text-center font-bold text-[10px] uppercase text-neutral-400">{item.unit}</TableCell>
                            <TableCell className="text-right font-bold text-[10px] text-neutral-600">
                              Rp {(item.price || 0).toLocaleString('id-ID')}
                            </TableCell>
                            <TableCell className="text-right font-black text-xs tracking-tighter px-6">
                              Rp {(item.total || 0).toLocaleString('id-ID')}
                            </TableCell>
                            {canEdit && (
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>} />
                                  <DropdownMenuContent align="end" className="rounded-xl">
                                    <DropdownMenuItem className="text-xs uppercase font-bold gap-2" onClick={() => toggleExpand(globalIndex)}>
                                      <Edit3 className="w-3 h-3" /> Edit Specs
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-xs uppercase font-bold gap-2 text-red-600" onClick={() => removeItem(globalIndex)}>
                                      <Eraser className="w-3 h-3" /> Remove Item
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            )}
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-neutral-50/20">
                              <TableCell colSpan={canEdit ? 7 : 6} className="px-6 py-4">
                                <div className="space-y-2">
                                  <Label className="text-[9px] font-black uppercase text-neutral-400">Keterangan Spesifikasi (Merk, Tipe, Material)</Label>
                                  <Textarea 
                                    value={item.technicalSpecs || ""}
                                    onChange={e => updateItem(globalIndex, { technicalSpecs: e.target.value })}
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
                    <TableCell colSpan={canEdit ? 7 : 6} className="h-64 text-center">
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
      <div className="flex flex-col md:flex-row justify-between items-center py-12 border-t-2 border-black/5 gap-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white font-black text-xl">TBJ</div>
          <div>
            <p className="font-black uppercase tracking-tighter">TBJ Contractor Hub</p>
            <p className="text-[10px] uppercase-soft text-neutral-400">Build with Intelligence • Design with Soul</p>
          </div>
        </div>
        <div className="flex gap-6">
          <a href="https://www.instagram.com/tukang.bangunan.jakarta/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold uppercase hover:text-neutral-500 transition-colors">
            <Instagram className="w-4 h-4" /> @tukang.bangunan.jakarta
          </a>
          <a href="#" className="flex items-center gap-2 text-xs font-bold uppercase hover:text-neutral-500 transition-colors">
            <Share2 className="w-4 h-4" /> Share Project
          </a>
          <a href="#" className="flex items-center gap-2 text-xs font-bold uppercase hover:text-neutral-500 transition-colors">
            <Phone className="w-4 h-4" /> WhatsApp Support
          </a>
        </div>
      </div>
    </div>
  );
};
