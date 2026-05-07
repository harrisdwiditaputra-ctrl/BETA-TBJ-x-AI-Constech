/**
 * TBJ Contractor Superapp
 * AI-Powered Construction Platform
 */

import {
  BrowserRouter as Router, Routes, Route,
  useNavigate, useParams, Link,
} from "react-router-dom";
import { Toaster } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import {
  useAuth, useProjects, useProjectDetails,
  useProperties, useMasterData, useMaterialRequests,
  useCmsConfig,
} from "@/lib/hooks";
import { exportRABtoPDF } from "./services/pdfExport";
import { WORK_ITEMS_MASTER } from "@/constants";
import {
  Button, Input, Card, CardContent, CardHeader,
  CardTitle, CardDescription, Table, TableBody,
  TableCell, TableHead, TableHeader, TableRow,
  Badge, Textarea, Progress, Label,
} from "@/components/ui/index";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { WorkItemMaster, AIEstimateResponse, CmsConfig } from "@/types";
import { cn } from "@/lib/utils";
import { getAIEstimation } from "./services/aiEstimator";
import {
  Plus, Trash2, ChevronRight, Loader2, Calculator,
  Search, CheckCircle2, CreditCard, Clock, Home,
  Wrench, PenTool, Building2, MapPin, FileText,
  Gavel, Key, Camera, UserCheck, ExternalLink,
  Download, Star, Shield, TrendingUp, Users,
  ChevronDown, ChevronUp,
} from "lucide-react";
import Gallery from "./components/Gallery";
import Profile from "./components/Profile";
import AdminPanel from "./components/AdminPanel";

// ─────────────────────────────────────────────────────────
// DASHBOARD (Admin)
// ─────────────────────────────────────────────────────────
const Dashboard = ({ user }: { user: any }) => {
  const { projects, loading } = useProjects(user?.uid);
  const navigate = useNavigate();
  const totalBudget = projects.reduce((s, p) => s + p.totalBudget, 0);
  const activeCount = projects.filter(p => p.status === "active").length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8" /></div>;

  return (
    <div className="space-y-10 py-6">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-[0.3em]">Control Center</p>
          <h1 className="text-4xl font-black uppercase tracking-tighter mt-1">Dashboard</h1>
          <p className="text-neutral-500 text-sm mt-1">Selamat datang, {user?.displayName}.</p>
        </div>
        <Button onClick={() => navigate("/projects")} className="bg-black text-white rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Proyek Baru
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Proyek", value: projects.length, icon: FileText },
          { label: "Proyek Aktif", value: activeCount, icon: TrendingUp },
          { label: "Total RAB", value: `Rp ${(totalBudget/1e6).toFixed(0)}jt`, icon: Calculator },
        ].map((s, i) => (
          <Card key={i} className="border-2 border-black rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 uppercase text-[10px] font-bold tracking-widest">
                <s.icon className="w-3.5 h-3.5" /> {s.label}
              </CardDescription>
              <CardTitle className="text-4xl font-black tracking-tighter">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-black uppercase tracking-tighter">Proyek Terbaru</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {projects.slice(0, 4).map(project => (
            <Card
              key={project.id}
              className="cursor-pointer hover:border-black border-2 border-neutral-100 rounded-2xl transition-all hover:shadow-md"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-black">{project.name}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                  </div>
                  <ChevronRight className="text-neutral-300 flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Badge
                    className={cn(
                      "rounded-md text-[9px] uppercase font-bold",
                      project.status === "active" ? "bg-green-100 text-green-700" :
                      project.status === "completed" ? "bg-blue-100 text-blue-700" :
                      "bg-neutral-100 text-neutral-600"
                    )}
                  >
                    {project.status || "survey"}
                  </Badge>
                  <span className="text-xs text-neutral-400 font-mono">
                    Rp {project.totalBudget.toLocaleString("id-ID")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-neutral-200 rounded-2xl">
              <p className="text-neutral-400 mb-4">Belum ada proyek. Buat yang pertama!</p>
              <Button onClick={() => navigate("/projects")} className="bg-black text-white rounded-xl">Buat Proyek</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// PROJECTS PAGE
// ─────────────────────────────────────────────────────────
const ProjectsPage = ({ user }: { user: any }) => {
  const { projects, loading, createProject } = useProjects(user?.uid);
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProject(newName, newDesc);
    setIsOpen(false); setNewName(""); setNewDesc("");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 py-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Proyek RAB</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger>
            <Button className="bg-black text-white rounded-xl gap-2">
              <Plus className="w-4 h-4" /> Proyek Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-black uppercase">Buat Proyek Baru</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Nama Proyek</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Contoh: Renovasi Rumah Tinggal" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Deskripsi</Label>
                <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Deskripsi singkat proyek" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
              <Button onClick={handleCreate} className="bg-black text-white">Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-2xl border-2 border-black overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Nama Proyek</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest">Tanggal</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Total Anggaran</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map(project => (
              <TableRow
                key={project.id}
                className="cursor-pointer hover:bg-neutral-50"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <TableCell>
                  <div>
                    <p className="font-bold">{project.name}</p>
                    <p className="text-xs text-neutral-400">{project.description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn(
                    "rounded-md text-[9px] uppercase font-bold",
                    project.status === "active" ? "bg-green-100 text-green-700" :
                    project.status === "completed" ? "bg-blue-100 text-blue-700" :
                    "bg-neutral-100 text-neutral-600"
                  )}>
                    {project.status || "survey"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{new Date(project.createdAt).toLocaleDateString("id-ID")}</TableCell>
                <TableCell className="text-right font-mono font-bold text-sm">
                  Rp {project.totalBudget.toLocaleString("id-ID")}
                </TableCell>
                <TableCell><ChevronRight className="text-neutral-300 ml-auto" /></TableCell>
              </TableRow>
            ))}
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-neutral-400">
                  Belum ada proyek. Klik "Proyek Baru" untuk memulai.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// PROJECT DETAIL
// ─────────────────────────────────────────────────────────
const ProjectDetail = () => {
  const { id } = useParams();
  const {
    project, categories, items, loading,
    addCategory, addItem, deleteCategory, deleteItem,
    updateProjectStatus, updateItemProgress,
  } = useProjectDetails(id);

  const [newCatName, setNewCatName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState("m2");
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WorkItemMaster[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const q = searchQuery.toLowerCase();
      const filtered = WORK_ITEMS_MASTER.filter(
        item => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
      ).slice(0, 8);
      setSearchResults(filtered);
      setIsSearchOpen(true);
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  }, [searchQuery]);

  const selectMasterItem = (item: WorkItemMaster) => {
    setNewItemName(item.name);
    setNewItemUnit(item.unit);
    setNewItemPrice(item.price);
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  const totalProgress = items.length > 0
    ? items.reduce((s, i) => s + ((i.progress || 0) * (i.totalPrice / (project.totalBudget || 1))), 0)
    : 0;

  if (loading || !project.id) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-black uppercase tracking-tighter">{project.name}</h1>
            <Badge className={cn(
              "rounded-md text-[9px] font-bold uppercase",
              project.status === "active" ? "bg-green-100 text-green-700" :
              project.status === "completed" ? "bg-blue-100 text-blue-700" :
              "bg-neutral-100 text-neutral-600"
            )}>
              {project.status || "survey"}
            </Badge>
          </div>
          <p className="text-neutral-500">{project.description}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-[9px] uppercase font-black text-neutral-400">Status:</Label>
              <select
                className="text-[9px] p-1.5 border-2 border-black rounded-lg font-black uppercase bg-white"
                value={project.status || "survey"}
                onChange={e => updateProjectStatus(e.target.value as any)}
              >
                <option value="survey">Survey</option>
                <option value="active">Aktif</option>
                <option value="completed">Selesai</option>
              </select>
            </div>
            <Badge variant="outline" className="border-black rounded-lg text-[9px] font-black">
              Progress: {totalProgress.toFixed(1)}%
            </Badge>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-bold">Total Anggaran</p>
          <p className="text-3xl font-black tracking-tighter">Rp {project.totalBudget.toLocaleString("id-ID")}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Escrow", value: "BNI 821942016509", sub: "TBJ Contractor Hub" },
          { label: "Kategori", value: `${categories.length}`, sub: `${items.length} item total` },
          { label: "Bobot Terisi", value: `${Math.min(100, items.reduce((s,i) => s+(i.totalPrice/(project.totalBudget||1))*100, 0)).toFixed(0)}%`, sub: "dari RAB" },
          { label: "Progress", value: `${totalProgress.toFixed(1)}%`, sub: "weighted average" },
        ].map((s, i) => (
          <Card key={i} className="border-2 border-black rounded-2xl p-4 space-y-1">
            <p className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">{s.label}</p>
            <p className="text-lg font-black tracking-tight">{s.value}</p>
            <p className="text-[9px] text-neutral-400">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Progress Bar */}
      <Progress value={totalProgress} className="h-2" />

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button
          variant="outline"
          className="gap-2 border-2 border-black rounded-xl"
          onClick={() => {
            if (project.id && categories.length > 0) {
              exportRABtoPDF(project as any, categories, items);
            }
          }}
          disabled={!project.id || categories.length === 0}
        >
          <Download className="w-4 h-4" /> Export PDF
        </Button>
        <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
          <DialogTrigger>
            <Button variant="outline" className="gap-2 border-2 border-black rounded-xl">
              <Plus className="w-4 h-4" /> Tambah Kategori
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-black uppercase">Tambah Kategori</DialogTitle></DialogHeader>
            <div className="py-4 space-y-3">
              <Label className="text-[10px] uppercase font-bold">Nama Kategori</Label>
              <Input
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Contoh: Pekerjaan Tanah"
                onKeyDown={e => { if (e.key === "Enter") { addCategory(newCatName); setNewCatName(""); setAddCatOpen(false); }}}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddCatOpen(false)}>Batal</Button>
              <Button onClick={() => { addCategory(newCatName); setNewCatName(""); setAddCatOpen(false); }} className="bg-black text-white">Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
          <DialogTrigger>
            <Button className="gap-2 bg-black text-white rounded-xl">
              <Plus className="w-4 h-4" /> Tambah Item RAB
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-black uppercase">Tambah Item Anggaran</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
              {/* Category selector */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Kategori</Label>
                <select
                  className="w-full p-2.5 border-2 border-neutral-200 rounded-xl text-sm bg-white focus:border-black outline-none transition-colors"
                  value={selectedCatId}
                  onChange={e => setSelectedCatId(e.target.value)}
                >
                  <option value="">Pilih Kategori...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Search master */}
              <div className="space-y-2 relative">
                <Label className="text-[10px] uppercase font-bold">Cari dari Master Data</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Ketik nama pekerjaan..."
                    className="pl-9"
                  />
                </div>
                <p className="text-[9px] text-neutral-400 italic">*Tidak ada? Isi manual di bawah.</p>
                {isSearchOpen && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border-2 border-black rounded-xl shadow-2xl max-h-56 overflow-auto">
                    {searchResults.map(item => (
                      <div
                        key={item.id}
                        className="p-3 hover:bg-neutral-50 cursor-pointer border-b last:border-0 transition-colors"
                        onClick={() => selectMasterItem(item)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm">{item.name}</span>
                          <Badge variant="outline" className="text-[9px] rounded-md ml-2">{item.category}</Badge>
                        </div>
                        <div className="flex justify-between text-xs text-neutral-400 mt-0.5">
                          <span>{item.unit}</span>
                          <span>Rp {item.price.toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual input */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Nama Item</Label>
                <Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Nama pekerjaan..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold">Volume</Label>
                  <Input type="number" value={newItemQty} onChange={e => setNewItemQty(Number(e.target.value))} min="0.01" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold">Satuan</Label>
                  <Input value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)} placeholder="m2, m3, kg..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Harga Satuan (Rp)</Label>
                <Input type="number" value={newItemPrice} onChange={e => setNewItemPrice(Number(e.target.value))} min="0" />
              </div>
              {/* Total preview */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex justify-between items-center">
                <span className="text-sm font-bold">Estimasi Total:</span>
                <span className="text-lg font-black">Rp {(newItemQty * newItemPrice).toLocaleString("id-ID")}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddItemOpen(false)}>Batal</Button>
              <Button
                className="bg-black text-white"
                onClick={() => {
                  if (selectedCatId && newItemName) {
                    addItem(selectedCatId, newItemName, newItemQty, newItemUnit, newItemPrice);
                    setNewItemName(""); setNewItemQty(1); setNewItemPrice(0); setSearchQuery(""); setAddItemOpen(false);
                  }
                }}
              >
                Simpan ke RAB
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* RAB Table by Category */}
      <div className="space-y-10">
        {categories.map(cat => {
          const catItems = items.filter(i => i.categoryId === cat.id);
          const catTotal = catItems.reduce((s, i) => s + i.totalPrice, 0);
          return (
            <div key={cat.id} className="space-y-3">
              <div className="flex justify-between items-center border-b-2 border-black pb-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black uppercase tracking-tighter">{cat.name}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    onClick={() => { if (confirm(`Hapus kategori "${cat.name}"?`)) deleteCategory(cat.id); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <span className="font-mono font-black text-sm">Rp {catTotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Uraian Pekerjaan</TableHead>
                      <TableHead className="text-center w-20">Vol</TableHead>
                      <TableHead className="text-center w-16">Satuan</TableHead>
                      <TableHead className="text-right w-36">Harga Satuan</TableHead>
                      <TableHead className="text-right w-36">Jumlah</TableHead>
                      <TableHead className="text-center w-20">Bobot</TableHead>
                      <TableHead className="text-center w-24">Progress</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-center text-sm text-neutral-500">{item.unit}</TableCell>
                        <TableCell className="text-right font-mono text-xs">Rp {item.pricePerUnit.toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-right font-mono font-black text-xs">Rp {item.totalPrice.toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-center text-xs font-bold">
                          {((item.totalPrice / (project.totalBudget || 1)) * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            className="w-16 h-7 text-center mx-auto text-xs rounded-lg"
                            defaultValue={item.progress || 0}
                            min="0" max="100"
                            onBlur={e => updateItemProgress(item.id, Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-neutral-300 hover:text-red-500 rounded-lg"
                            onClick={() => deleteItem(item.id, item.totalPrice)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {catItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-neutral-300 italic text-sm">
                          Belum ada item. Klik "Tambah Item RAB" untuk menambahkan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })}
        {categories.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-neutral-200 rounded-2xl">
            <p className="text-neutral-400">Tambahkan kategori untuk memulai RAB proyek ini.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// VIRTUAL ASSISTANT (AI Estimator)
// ─────────────────────────────────────────────────────────
const VirtualAssistant = ({ user, updateProfile }: { user: any; updateProfile: (d: any) => Promise<void> }) => {
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userProblem, setUserProblem] = useState("");
  const [problemPhotos, setProblemPhotos] = useState<string[]>([]);
  const [aiResult, setAiResult] = useState<AIEstimateResponse | null>(null);
  const [leadData, setLeadData] = useState({ whatsapp: user?.whatsapp || "", email: user?.email || "" });
  const [projectData, setProjectData] = useState({
    area: 0, location: "", type: "Renovasi", subType: "", floors: 1, finishing: "Standard",
  });

  const CATEGORIES = [
    { id: "Renovasi", label: "Renovasi", icon: Wrench, desc: "Perbaikan & upgrade bangunan" },
    { id: "Interior", label: "Desain & Interior", icon: PenTool, desc: "Custom Furniture & Interior Design" },
    { id: "Arsitektur", label: "Arsitektur", icon: Building2, desc: "Perencanaan & Bangun Baru" },
    { id: "Maintenance", label: "Maintenance", icon: Clock, desc: "Perawatan rutin & perbaikan minor" },
    { id: "Property", label: "Property Hub", icon: Home, desc: "Jual, Sewa, & Perizinan PBG" },
  ];

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Tipe: ${projectData.type}. Area: ${projectData.area}m². Lantai: ${projectData.floors}. Lokasi: ${projectData.location}. Detail: ${userProblem || "Proyek umum"}`;
      const result = await getAIEstimation(prompt, projectData.type);
      setAiResult(result);
      setStep(4);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const verifyOtp = async () => {
    if (otp === "1234") {
      await updateProfile({ whatsapp: leadData.whatsapp, analysisCount: (user?.analysisCount || 0) + 1 });
      setStep(5);
    } else {
      alert("OTP salah. Demo: gunakan 1234.");
    }
  };

  const totalEstimate = aiResult?.totalEstimatedCost || 0;

  return (
    <div className="max-w-5xl mx-auto space-y-12 py-8">
      {/* Hero */}
      <div className="text-center space-y-4">
        <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-[0.4em] border border-neutral-200 inline-block px-4 py-1.5 rounded-full">
          TBJ AI · Construction Estimator
        </p>
        <h1 className="text-7xl md:text-8xl font-black tracking-tighter uppercase leading-none">
          Virtual<br />Assistant
        </h1>
        <p className="text-neutral-400 text-sm max-w-sm mx-auto leading-relaxed">
          Estimasi proyek konstruksi instan berbasis AI. Akurat, transparan, & profesional.
        </p>
      </div>

      {/* Steps indicator */}
      {step > 1 && step < 5 && (
        <div className="flex justify-center gap-2">
          {[1,2,3,4].map(s => (
            <div key={s} className={cn(
              "h-1 rounded-full transition-all duration-500",
              step > s ? "bg-black w-8" : step === s ? "bg-black w-14" : "bg-neutral-200 w-6"
            )} />
          ))}
        </div>
      )}

      <Card className="border-2 border-black rounded-3xl overflow-hidden shadow-2xl">
        <CardContent className="p-0">

          {/* STEP 1 – Category */}
          {step === 1 && (
            <div className="p-8 md:p-12 space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Pilih Layanan</h2>
                <p className="text-neutral-400 text-sm">Pilih kategori proyek untuk memulai estimasi AI</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {CATEGORIES.map(cat => (
                  <div
                    key={cat.id}
                    onClick={() => { setProjectData({ ...projectData, type: cat.id }); cat.id === "Property" ? setStep(10) : setStep(2); }}
                    className="group p-6 border-2 border-neutral-100 hover:border-black hover:bg-black hover:text-white cursor-pointer transition-all duration-300 rounded-2xl"
                  >
                    <cat.icon className="w-10 h-10 mb-4 transition-transform group-hover:-translate-y-1" />
                    <h3 className="font-black text-lg uppercase tracking-tight">{cat.label}</h3>
                    <p className="text-[11px] mt-1 opacity-60 leading-relaxed">{cat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 – Project Details */}
          {step === 2 && (
            <div className="p-8 md:p-12 space-y-8">
              <div className="flex justify-between items-end border-b-2 border-black pb-6">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Detail Proyek</h2>
                <Badge className="bg-black text-white rounded-lg text-[9px] uppercase font-bold px-3 py-1.5">{projectData.type}</Badge>
              </div>
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-neutral-400">Lokasi Proyek</Label>
                    <Input
                      value={projectData.location}
                      onChange={e => setProjectData({ ...projectData, location: e.target.value })}
                      placeholder="Contoh: Kemang, Jakarta Selatan"
                      className="h-12"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-neutral-400">Luas (m²)</Label>
                      <Input type="number" value={projectData.area} onChange={e => setProjectData({ ...projectData, area: Number(e.target.value) })} className="h-12" min="0" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-neutral-400">Lantai</Label>
                      <Input type="number" value={projectData.floors} onChange={e => setProjectData({ ...projectData, floors: Number(e.target.value) })} className="h-12" min="1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-neutral-400">Ceritakan Kebutuhan Anda</Label>
                    <Textarea
                      value={userProblem}
                      onChange={e => setUserProblem(e.target.value)}
                      placeholder="Ceritakan detail proyek, masalah yang ada, atau target hasil akhir..."
                      className="min-h-[140px] resize-none"
                    />
                  </div>
                  {/* Photo Upload */}
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-neutral-400">Upload Foto (Opsional)</Label>
                    <div className="flex flex-wrap gap-3">
                      {problemPhotos.map((p, i) => (
                        <div key={i} className="w-20 h-20 border-2 border-black overflow-hidden relative group rounded-xl">
                          <img src={p} className="w-full h-full object-cover" />
                          <button
                            onClick={() => setProblemPhotos(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute inset-0 bg-black/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <label className="w-20 h-20 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors rounded-xl">
                        <Camera className="w-6 h-6 text-neutral-400" />
                        <span className="text-[9px] text-neutral-400 mt-1">Tambah</span>
                        <input type="file" className="hidden" accept="image/*" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = ev => setProblemPhotos(prev => [...prev, ev.target?.result as string]);
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Summary + CTA */}
                <div className="bg-neutral-50 rounded-2xl p-8 border border-neutral-100 space-y-8 flex flex-col">
                  <div className="space-y-4 flex-grow">
                    <h3 className="font-black uppercase tracking-tighter">Ringkasan</h3>
                    {[
                      { label: "Tipe", value: projectData.type },
                      { label: "Lokasi", value: projectData.location || "-" },
                      { label: "Luas", value: `${projectData.area} m²` },
                      { label: "Lantai", value: projectData.floors },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between border-b border-neutral-200 pb-2">
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider">{item.label}</span>
                        <span className="font-bold text-sm">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-400 text-white rounded-xl h-14 text-base font-bold uppercase tracking-widest"
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing
                        ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing...</>
                        : <><Calculator className="mr-2 w-5 h-5" /> Analisa dengan AI</>
                      }
                    </Button>
                    <Button variant="ghost" className="w-full text-[10px] uppercase tracking-widest text-neutral-400" onClick={() => setStep(1)}>
                      ← Kembali
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 – Verification */}
          {step === 4 && (
            <div className="p-8 md:p-12 space-y-8 max-w-md mx-auto">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-black text-white flex items-center justify-center mx-auto rounded-2xl">
                  <UserCheck className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Verifikasi Data</h2>
                <p className="text-neutral-400 text-sm">Lengkapi kontak untuk melihat estimasi lengkap</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold">WhatsApp</Label>
                  <Input value={leadData.whatsapp} onChange={e => setLeadData({ ...leadData, whatsapp: e.target.value })} placeholder="0812xxxxxxxx" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold">Email</Label>
                  <Input value={leadData.email} onChange={e => setLeadData({ ...leadData, email: e.target.value })} placeholder="email@example.com" className="h-12" />
                </div>
                {!isOtpSent ? (
                  <Button
                    className="w-full h-12 bg-black text-white rounded-xl font-bold uppercase tracking-widest"
                    onClick={() => { if (leadData.whatsapp && leadData.email) setIsOtpSent(true); }}
                    disabled={!leadData.whatsapp || !leadData.email}
                  >
                    Kirim Kode Verifikasi
                  </Button>
                ) : (
                  <div className="space-y-3 animate-in fade-in-0">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold">Kode OTP <span className="text-neutral-400 font-normal">(Demo: 1234)</span></Label>
                      <Input
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        placeholder="1234"
                        className="h-12 text-center text-2xl tracking-[0.5em] font-black"
                        maxLength={4}
                      />
                    </div>
                    <Button
                      className="w-full h-12 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-bold uppercase"
                      onClick={verifyOtp}
                    >
                      Verifikasi & Lihat Hasil
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5 – Results */}
          {step === 5 && aiResult && (
            <div className="p-8 md:p-12 space-y-8">
              <div className="flex justify-between items-start border-b-2 border-black pb-6 flex-wrap gap-4">
                <div>
                  <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-mono">TBJ AI Estimator · Confidential</p>
                  <h2 className="text-3xl font-black uppercase tracking-tighter mt-1">Hasil Estimasi</h2>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-neutral-400">Total Anggaran</p>
                  <p className="text-4xl font-black tracking-tighter text-black">Rp {totalEstimate.toLocaleString("id-ID")}</p>
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                  <div className="p-6 border-2 border-black rounded-2xl space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black uppercase tracking-tight flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-orange-500" /> Analisa AI
                      </h3>
                      <Badge className="bg-black text-white rounded-lg text-[9px]">AI Generated</Badge>
                    </div>
                    <div className="bg-neutral-50 p-5 rounded-xl border-l-4 border-orange-500">
                      <p className="text-sm text-neutral-600 italic leading-relaxed">"{aiResult.analysis}"</p>
                    </div>

                    {/* Item breakdown */}
                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Rincian Pekerjaan:</p>
                      {aiResult.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start border-b border-neutral-100 pb-3 gap-4">
                          <div className="space-y-0.5 flex-grow">
                            <p className="text-xs font-black uppercase tracking-wider">{item.name}</p>
                            <p className="text-[9px] text-neutral-400 leading-relaxed">{item.reasoning}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-black font-mono">Rp {item.totalPrice.toLocaleString("id-ID")}</p>
                            <p className="text-[9px] text-neutral-400">{item.quantity} {item.unit}</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 border-t-2 border-black">
                        <span className="font-black uppercase tracking-wider">Total</span>
                        <span className="text-2xl font-black">Rp {totalEstimate.toLocaleString("id-ID")}</span>
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                      <p className="text-[9px] text-orange-700 leading-relaxed">
                        *{aiResult.disclaimer || "Estimasi ini adalah prakiraan awal berbasis AI. Nilai final akan divalidasi setelah survey teknis."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA sidebar */}
                <div className="space-y-4">
                  <div className="p-6 bg-black text-white rounded-2xl space-y-5">
                    <h3 className="font-black uppercase tracking-tight text-lg">Langkah Selanjutnya</h3>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      Booking survey lokasi untuk validasi teknis dan RAB Final yang presisi.
                    </p>
                    <div className="border-t border-white/20 pt-4 space-y-1">
                      <p className="text-[9px] text-white/40 uppercase tracking-widest">Biaya Komitmen Survey</p>
                      <p className="text-2xl font-black">Rp 500.000</p>
                      <p className="text-[9px] text-white/40 italic">*Dikreditkan ke nilai kontrak</p>
                    </div>
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] py-5"
                      onClick={() => setStep(6)}
                    >
                      Jadwalkan Survey
                    </Button>
                  </div>
                  <div className="p-4 border-2 border-neutral-100 rounded-2xl space-y-3">
                    <p className="text-[9px] uppercase font-bold text-neutral-400 tracking-widest">Share & Support</p>
                    <Button variant="outline" className="w-full justify-start gap-2 rounded-xl text-[10px] uppercase font-bold h-9">
                      <Download className="w-3.5 h-3.5" /> Download Estimasi (PDF)
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2 rounded-xl text-[10px] uppercase font-bold h-9">
                      <Star className="w-3.5 h-3.5" /> Rate Estimasi AI
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full text-[10px] text-neutral-400 uppercase tracking-widest"
                    onClick={() => { setStep(1); setAiResult(null); setUserProblem(""); setProblemPhotos([]); }}
                  >
                    Hitung Ulang
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6 – Survey Booking */}
          {step === 6 && (
            <div className="p-12 text-center space-y-8">
              <div className="w-20 h-20 bg-black text-white flex items-center justify-center mx-auto rounded-2xl">
                <CreditCard className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter">Booking Survey</h2>
                <p className="text-neutral-400 text-sm mt-2">Langkah terakhir menuju proyek impian Anda</p>
              </div>
              <div className="max-w-sm mx-auto border-2 border-black rounded-2xl p-8 space-y-6 text-left">
                <div className="flex justify-between border-b border-neutral-100 pb-4">
                  <span className="text-neutral-500 text-sm">Biaya Survey</span>
                  <span className="font-black text-xl">Rp 500.000</span>
                </div>
                <div className="space-y-2">
                  {["Pengukuran presisi di lokasi", "Validasi RAB oleh engineer", "Konsultasi material & metode", "Penerbitan RAB Final"].map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-neutral-400 italic leading-relaxed">
                  *Biaya dikreditkan sebagai potongan harga di nilai kontrak pelaksanaan.
                </p>
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-bold py-6 uppercase tracking-widest"
                  onClick={async () => {
                    await updateProfile({ tier: "survey" });
                    alert("Booking berhasil! Tim kami akan menghubungi Anda dalam 1x24 jam.");
                    window.location.href = "/profile";
                  }}
                >
                  Konfirmasi & Bayar
                </Button>
              </div>
              <Button variant="ghost" className="text-[10px] text-neutral-400 uppercase" onClick={() => setStep(5)}>
                ← Kembali ke Estimasi
              </Button>
            </div>
          )}

          {/* STEP 10 – Property Hub */}
          {step === 10 && (
            <div className="p-8 md:p-12 space-y-10">
              <div className="flex justify-between items-center border-b-2 border-black pb-6">
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">TBJ Property Hub</h2>
                  <p className="text-neutral-400 text-sm">Solusi terintegrasi: Sewa, Jual, & Perizinan PBG/IMB</p>
                </div>
                <Button variant="outline" className="border-black rounded-xl" onClick={() => setStep(1)}>← Kembali</Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Beli Properti", icon: Home },
                  { label: "Sewa Properti", icon: Key },
                  { label: "Titip Jual/Sewa", icon: ExternalLink },
                  { label: "Urus PBG/IMB", icon: Gavel },
                ].map((svc, i) => (
                  <div key={i} className="p-6 border-2 border-neutral-100 hover:border-black rounded-2xl text-center space-y-3 cursor-pointer transition-all group">
                    <div className="w-12 h-12 mx-auto bg-neutral-100 group-hover:bg-black group-hover:text-white rounded-xl flex items-center justify-center transition-all duration-300">
                      <svc.icon className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest">{svc.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {[
                  { title: "Modern Villa Jagakarsa", loc: "Jakarta Selatan", price: 3500000000, type: "jual", area: "150/200" },
                  { title: "Ruko Premium Kemang", loc: "Jakarta Selatan", price: 150000000, type: "sewa", area: "60/180" },
                  { title: "Rumah Minimalis BSD", loc: "Tangerang Selatan", price: 1800000000, type: "jual", area: "90/120" },
                ].map((p, i) => (
                  <div key={i} className="border-2 border-black rounded-2xl overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300">
                    <div className="aspect-video bg-neutral-100 relative overflow-hidden">
                      <img src={`https://picsum.photos/seed/prop${i+10}/800/450`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                      <Badge className="absolute top-3 left-3 bg-black text-white rounded-full text-[9px] uppercase font-black">
                        {p.type === "jual" ? "Dijual" : "Disewakan"}
                      </Badge>
                      <div className="absolute bottom-3 right-3 bg-white/90 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                        {p.area} m²
                      </div>
                    </div>
                    <div className="p-5 space-y-2">
                      <h3 className="font-black uppercase tracking-tight text-sm">{p.title}</h3>
                      <p className="text-[10px] text-neutral-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-orange-500" /> {p.loc}
                      </p>
                      <p className="font-black text-xl tracking-tighter">
                        Rp {(p.price / 1e9).toFixed(1)}M{p.type === "sewa" ? "/thn" : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// ADMIN MASTER DATA
// ─────────────────────────────────────────────────────────
const AdminMasterPage = () => {
  const { masterData, loading, updateMasterItem } = useMasterData();
  const { properties, addProperty, updateProperty } = useProperties();
  const [tab, setTab] = useState<"rab" | "property">("rab");

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  const displayData = masterData.length > 0 ? masterData : WORK_ITEMS_MASTER.slice(0, 30);

  return (
    <div className="space-y-8 py-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Master Data</h1>
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl">
          {(["rab", "property"] as const).map(t => (
            <Button
              key={t}
              size="sm"
              variant={tab === t ? "default" : "ghost"}
              onClick={() => setTab(t)}
              className={cn("rounded-lg text-[10px] uppercase font-bold", tab === t && "bg-black text-white")}
            >
              {t === "rab" ? "Harga SAB" : "Properti"}
            </Button>
          ))}
        </div>
      </div>

      {tab === "rab" && (
        <Card className="border-2 border-black rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="font-black uppercase tracking-tight">Database Harga Satuan</CardTitle>
            <CardDescription>Edit harga satuan yang digunakan untuk estimasi AI dan RAB. ({displayData.length} item)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Kategori</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Nama Pekerjaan</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Satuan</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest text-right">Harga (Rp)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map(item => (
                  <TableRow key={item.id}>
                    <TableCell><Badge variant="outline" className="rounded-md text-[9px] uppercase font-bold">{item.category}</Badge></TableCell>
                    <TableCell className="font-medium text-sm">{item.name}</TableCell>
                    <TableCell className="text-neutral-500 text-sm">{item.unit}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        className="w-36 ml-auto text-right text-sm font-mono"
                        defaultValue={item.price}
                        onBlur={e => {
                          if (masterData.length > 0) updateMasterItem(item.id, { price: Number(e.target.value) });
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "property" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button
              className="bg-black text-white rounded-xl gap-2"
              onClick={() => addProperty({
                title: "Properti Baru", description: "", price: 0,
                type: "jual", location: "", area: 0,
                photos: [], features: [], status: "available",
              })}
            >
              <Plus className="w-4 h-4" /> Tambah Listing
            </Button>
          </div>
          {properties.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-neutral-200 rounded-2xl">
              <p className="text-neutral-400">Belum ada listing. Klik "Tambah Listing".</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {properties.map(p => (
                <Card key={p.id} className="border-2 border-black rounded-2xl">
                  <CardHeader>
                    <Input defaultValue={p.title} className="font-bold text-lg border-none px-0 shadow-none focus:ring-0" onBlur={e => updateProperty(p.id, { title: e.target.value })} />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold">Harga (Rp)</Label>
                        <Input type="number" defaultValue={p.price} onBlur={e => updateProperty(p.id, { price: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold">Tipe</Label>
                        <select className="w-full p-2 border border-neutral-200 rounded-lg text-sm bg-white" defaultValue={p.type} onChange={e => updateProperty(p.id, { type: e.target.value as any })}>
                          <option value="jual">Jual</option>
                          <option value="sewa">Sewa</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase font-bold">Lokasi</Label>
                      <Input defaultValue={p.location} onBlur={e => updateProperty(p.id, { location: e.target.value })} placeholder="Lokasi properti..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold">Luas (m²)</Label>
                        <Input type="number" defaultValue={p.area} onBlur={e => updateProperty(p.id, { area: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold">Status</Label>
                        <select className="w-full p-2 border border-neutral-200 rounded-lg text-sm bg-white" defaultValue={p.status} onChange={e => updateProperty(p.id, { status: e.target.value as any })}>
                          <option value="available">Available</option>
                          <option value="sold">Sold</option>
                          <option value="rented">Rented</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────
const LoginPage = ({ onLogin, cmsConfig }: { onLogin: () => void; cmsConfig?: any }) => (
  <div className="min-h-[85vh] flex flex-col items-center justify-center space-y-16 py-20">
    <div className="text-center space-y-6 max-w-3xl">
      <p className="text-[10px] font-mono uppercase tracking-[0.4em] border border-neutral-200 inline-block px-5 py-1.5 rounded-full">
        Construction OS v1.0 · AI-Powered Platform
      </p>
      <h1 className="text-[min(14vw,8rem)] font-black tracking-tighter text-black uppercase leading-none">
        {cmsConfig?.heroTitle || "Tukang Bangunan Jakarta"}
      </h1>
      <p className="text-neutral-400 text-sm max-w-xl mx-auto leading-relaxed uppercase tracking-wider">
        {cmsConfig?.heroSubtitle || "Platform konstruksi pertama di Indonesia dengan integrasi AI Estimator & Real-time Management."}
      </p>
    </div>

    <div className="flex flex-col items-center gap-5">
      <button
        onClick={onLogin}
        className="btn-sleek text-lg px-14 py-5 text-base flex items-center gap-3 shadow-lg hover:shadow-xl transition-shadow"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Masuk dengan Google
      </button>
      <div className="flex items-center gap-6 text-[10px] font-mono uppercase tracking-widest text-neutral-400">
        <span>🔒 Secure</span>
        <span className="w-1 h-1 bg-neutral-300 rounded-full" />
        <span>🤖 AI Powered</span>
        <span className="w-1 h-1 bg-neutral-300 rounded-full" />
        <span>☁️ Cloud Sync</span>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 border-2 border-black w-full max-w-3xl rounded-2xl overflow-hidden">
      {[
        { label: "Identitas", val: "BOLD" },
        { label: "Layanan", val: "RELIABLE" },
        { label: "Platform", val: "MODERN" },
      ].map((item, idx) => (
        <div key={idx} className={cn("p-8 text-center space-y-2", idx > 0 && "md:border-l-2 border-black")}>
          <p className="font-black text-4xl tracking-tighter italic">{item.val}</p>
          <p className="text-[10px] text-neutral-400 uppercase tracking-[0.3em] font-mono">{item.label}</p>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────
// TERMS PAGE
// ─────────────────────────────────────────────────────────
const TermsPage = () => (
  <div className="max-w-3xl mx-auto py-12 space-y-10">
    <div className="space-y-2">
      <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Dokumen Legal</p>
      <h1 className="text-5xl font-black uppercase tracking-tighter">Syarat & Ketentuan</h1>
      <p className="text-neutral-400 text-[10px] font-mono">Terakhir diperbarui: April 2026</p>
    </div>
    <div className="space-y-4">
      {[
        { title: "1. Layanan Estimasi AI", content: "Estimasi yang dihasilkan AI TBJ adalah gambaran awal berdasarkan data pasar dan input pengguna. Nilai final ditentukan setelah survey lokasi dan verifikasi teknis oleh tim ahli." },
        { title: "2. Biaya Survey & Konsultasi", content: "Biaya survey lokasi sebesar Rp 500.000 adalah komitmen awal klien. Biaya ini akan dikreditkan sebagai potongan harga ke nilai kontrak jika proyek berlanjut ke tahap pelaksanaan." },
        { title: "3. Privasi & Data", content: "Kami menjamin kerahasiaan data pribadi Anda termasuk nomor WhatsApp, email, dan alamat. Data hanya digunakan untuk kepentingan komunikasi proyek dan tidak dibagikan ke pihak ketiga." },
        { title: "4. Hak Cipta Desain", content: "Semua produk gambar, render 3D, dan dokumen teknis yang dihasilkan dalam layanan perencanaan adalah milik intelektual TBJ Contractor hingga pelunasan biaya desain." },
        { title: "5. Escrow & Termin Pembayaran", content: "Semua pembayaran proyek dikelola melalui rekening escrow untuk menjamin transparansi. Dana hanya dicairkan setelah persetujuan bersama antara klien dan project manager." },
      ].map((item, idx) => (
        <div key={idx} className="p-6 border border-neutral-100 rounded-2xl space-y-3 hover:border-black transition-colors">
          <h3 className="font-black uppercase tracking-wider text-sm">{item.title}</h3>
          <p className="text-neutral-600 text-sm leading-relaxed">{item.content}</p>
        </div>
      ))}
    </div>
    <div className="pt-4">
      <Link to="/assistant">
        <Button className="bg-black text-white rounded-xl">← Kembali ke Assistant</Button>
      </Link>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────
export default function App() {
  const { user, loading, login, logout, updateProfile } = useAuth();
  const { cmsConfig } = useCmsConfig();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-400">Loading TBJ Platform...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";

  return (
    <ErrorBoundary>
      <Router>
        <Layout user={user} onLogout={logout}>
          <Routes>
            {/* Public routes */}
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/gallery" element={<Gallery />} />

            {!user ? (
              /* Not logged in */
              <Route path="*" element={<LoginPage onLogin={login} cmsConfig={cmsConfig} />} />
            ) : (
              <>
                {/* Admin-only */}
                {isAdmin && (
                  <>
                    <Route path="/" element={<Dashboard user={user} />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/projects" element={<ProjectsPage user={user} />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="/master" element={<AdminMasterPage />} />
                  </>
                )}

                {/* All logged-in users */}
                <Route path="/assistant" element={<VirtualAssistant user={user} updateProfile={updateProfile} />} />
                <Route path="/profile" element={<Profile />} />

                {/* Default for non-admin */}
                {!isAdmin && <Route path="/" element={<VirtualAssistant user={user} updateProfile={updateProfile} />} />}

                {/* 404 */}
                <Route path="*" element={
                  <div className="text-center py-20 space-y-4">
                    <p className="text-6xl font-black text-neutral-100">404</p>
                    <p className="text-neutral-400">Halaman tidak ditemukan.</p>
                    <Link to="/"><Button className="bg-black text-white rounded-xl">← Home</Button></Link>
                  </div>
                } />
              </>
            )}
          </Routes>
        </Layout>
        <Toaster position="bottom-right" richColors expand={false} />
      </Router>
    </ErrorBoundary>
  );
}
