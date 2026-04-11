/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary.tsx";
import Layout from "@/components/Layout.tsx";
import { useState, useEffect, useMemo } from "react";
import { useAuth, useProjects, useProjectDetails, useProperties, useMasterData } from "@/lib/hooks";
import { WORK_ITEMS_MASTER } from "@/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { WorkItemMaster, Property, AIEstimateResponse } from "@/types";
import { cn } from "@/lib/utils";
import { getAIEstimation } from "./services/aiEstimator";
import { Plus, Trash2, ChevronRight, Loader2, Calculator, Search, CheckCircle2, Phone, Mail, Lock, CreditCard, Image as ImageIcon, Calendar, FileCheck, Clock, ExternalLink, ChevronDown, ChevronUp, Home, Wrench, PenTool, Building2, MapPin, Ruler, Layers, FileText, Gavel, Key, Camera, Upload, UserCheck, Map as MapIcon, Share2, Instagram, Download, Star, Settings, User, MessageSquare, ShieldCheck } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import Gallery from "./components/Gallery";
import Profile from "./components/Profile";
import AdminPanel from "./components/AdminPanel";
import PMDashboard from "./components/PMDashboard";
import RabPage from "./pages/RabPage";

// Fix for default marker icon in React-Leaflet using CDN for reliability
const markerIcon = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const markerShadow = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapPicker = ({ position, setPosition }: { position: [number, number], setPosition: (p: [number, number]) => void }) => {
  const MapEvents = () => {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      },
    });
    return null;
  };

  return (
    <div className="h-64 w-full border-2 border-black relative overflow-hidden">
      <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} />
        <MapEvents />
      </MapContainer>
      <div className="absolute bottom-2 right-2 z-[1000] bg-white/80 backdrop-blur-sm p-2 text-[8px] font-mono uppercase border border-black">
        Click map to set point
      </div>
    </div>
  );
};

const Dashboard = ({ user }: { user: any }) => {
  const { projects, loading } = useProjects(user?.uid);
  const navigate = useNavigate();

  const totalBudget = projects.reduce((sum, p) => sum + p.totalBudget, 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-neutral-500">Selamat datang kembali, {user?.displayName}.</p>
        </div>
        <Button onClick={() => navigate("/projects")}>Lihat Semua Proyek</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-xs font-semibold tracking-wider">Total Proyek</CardDescription>
            <CardTitle className="text-4xl font-bold">{projects.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-xs font-semibold tracking-wider">Total Anggaran</CardDescription>
            <CardTitle className="text-4xl font-bold">Rp {totalBudget.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Proyek Terbaru</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {projects.slice(0, 4).map(project => (
            <Card key={project.id} className="cursor-pointer hover:border-neutral-400 transition-colors" onClick={() => navigate(`/projects/${project.id}`)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                  </div>
                  <ChevronRight className="text-neutral-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Badge variant="secondary">Rp {project.totalBudget.toLocaleString('id-ID')}</Badge>
                  <span className="text-xs text-neutral-400">{new Date(project.createdAt).toLocaleDateString('id-ID')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl border-neutral-200">
              <p className="text-neutral-500">Belum ada proyek terbaru.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProjectsPage = ({ user }: { user: any }) => {
  const { projects, loading, createProject } = useProjects(user?.uid);
  const { updateProfile } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!newName) return;
    await createProject(newName, newDesc);
    setIsCreateOpen(false);
    setNewName("");
    setNewDesc("");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  const aiLimitReached = (user?.aiUsageCount || 0) >= 1 && user?.tier === "prospect";

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="heading-sleek">Proyek Saya</h1>
          <p className="text-neutral-500 font-light">Kelola estimasi dan proyek konstruksi Anda.</p>
        </div>
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            className="btn-sleek gap-2"
            onClick={() => window.open(`https://wa.me/62821942016509?text=Halo%20TBJ%20Architect,%20saya%20ingin%20konsultasi%20desain.`, "_blank")}
          >
            <Phone className="w-4 h-4" /> Chat Architect
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={<Button className="btn-accent gap-2" />}>
              <Plus className="w-4 h-4" /> Proyek Baru
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">Buat Proyek Baru</DialogTitle>
                <DialogDescription>Mulai estimasi mandiri untuk proyek Anda.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs uppercase tracking-widest opacity-60">Nama Proyek</Label>
                  <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Contoh: Renovasi Rumah Minimalis" className="input-sleek" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc" className="text-xs uppercase tracking-widest opacity-60">Deskripsi Singkat</Label>
                  <Input id="desc" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Misal: Perbaikan atap dan cat dinding" className="input-sleek" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs uppercase tracking-widest">Batal</Button>
                <Button onClick={handleCreate} className="btn-accent">Simpan Proyek</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {aiLimitReached && (
        <div className="sleek-card p-8 border-accent/20 bg-accent/5 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2 text-center md:text-left">
              <Badge className="tag-sleek bg-accent text-white border-none">AI Limit Reached</Badge>
              <h3 className="text-2xl font-heading">Digital Assessment Selesai</h3>
              <p className="text-sm text-neutral-600 max-w-md">
                Anda telah menggunakan batas 1x analisa AI gratis. Untuk mendapatkan estimasi detail, validasi teknis, dan RAB Final, silakan booking survey lokasi.
              </p>
            </div>
            <Button 
              className="btn-accent h-14 px-10"
              onClick={() => navigate("/assistant")}
            >
              Booking Survey (Rp 399.000)
            </Button>
          </div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        </div>
      )}

      <div className="sleek-card overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50/50">
            <TableRow className="hover:bg-transparent border-b border-black/5">
              <TableHead className="text-[10px] uppercase tracking-[0.2em] font-medium py-6">Nama Proyek</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.2em] font-medium">Tanggal</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.2em] font-medium text-right">Estimasi Anggaran</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map(project => (
              <TableRow 
                key={project.id} 
                className="cursor-pointer group border-b border-black/5 last:border-0" 
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <TableCell className="py-6">
                  <div>
                    <p className="font-medium text-sm group-hover:text-accent transition-colors">{project.name}</p>
                    <p className="text-xs text-neutral-400 font-light">{project.description}</p>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-neutral-500 font-light">
                  {new Date(project.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  Rp {project.totalBudget.toLocaleString('id-ID')}
                </TableCell>
                <TableCell className="text-right">
                  <ChevronRight className="inline w-4 h-4 text-neutral-300 group-hover:text-accent transition-all group-hover:translate-x-1" />
                </TableCell>
              </TableRow>
            ))}
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20">
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto">
                      <Layers className="w-6 h-6 text-neutral-300" />
                    </div>
                    <p className="text-sm text-neutral-400 font-light">Belum ada proyek. Mulai dengan membuat proyek baru.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const ProjectDetail = () => {
  const { id } = useParams();
  const { project, categories, items, loading, addCategory, addItem, deleteCategory, deleteItem, updateProjectStatus, updateItemProgress } = useProjectDetails(id);
  const [newCatName, setNewCatName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState("m2");
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [selectedCatId, setSelectedCatId] = useState("");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WorkItemMaster[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = WORK_ITEMS_MASTER.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 10));
      setIsSearching(true);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const selectMasterItem = (item: WorkItemMaster) => {
    setNewItemName(item.name);
    setNewItemUnit(item.unit);
    setNewItemPrice(item.price);
    setSearchQuery("");
    setIsSearching(false);
  };

  const totalWeight = items.reduce((sum, i) => sum + (i.totalPrice / (project.totalBudget || 1)) * 100, 0);
  const currentProgress = items.reduce((sum, i) => sum + ((i.progress || 0) * (i.totalPrice / (project.totalBudget || 1))), 0);

  if (loading || !project) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <Badge className={cn(
              "rounded-md uppercase-soft",
              project.status === "active" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
            )}>
              {project.status === "active" ? "Tier 3: Deal / Aktif" : "Tier 2: Tahap Survey"}
            </Badge>
          </div>
          <p className="text-neutral-500">{project.description}</p>
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Label className="text-[10px] uppercase font-bold">Status:</Label>
              <select 
                className="text-[10px] p-1 border-2 border-black rounded-md font-bold uppercase"
                value={project.status}
                onChange={(e) => updateProjectStatus(e.target.value as any)}
              >
                <option value="survey">Tahap Survey</option>
                <option value="active">Deal / Aktif</option>
                <option value="completed">Selesai</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] uppercase font-bold">Progress:</Label>
              <Badge variant="outline" className="rounded-md border-black">{currentProgress.toFixed(1)}%</Badge>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Total Anggaran (RAB)</p>
          <p className="text-3xl font-black text-black tracking-tighter">Rp {project.totalBudget.toLocaleString('id-ID')}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2 text-[10px] uppercase font-bold gap-2 text-accent hover:text-accent hover:bg-accent/5"
            onClick={() => {
              const summary = `[TBJ PROJECT SUMMARY]\n\nProyek: ${project.name}\nStatus: ${project.status.toUpperCase()}\nTotal RAB: Rp ${project.totalBudget.toLocaleString('id-ID')}\nProgress: ${currentProgress.toFixed(1)}%\n\nDetail Kategori:\n${categories.map(c => `- ${c.name}: Rp ${items.filter(i => i.categoryId === c.id).reduce((s, it) => s + it.totalPrice, 0).toLocaleString('id-ID')}`).join('\n')}\n\nLaporan terstruktur oleh TBJ Constech Hub.`;
              window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, "_blank");
            }}
          >
            <Share2 className="w-3 h-3" /> Share Summary to WA
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-2 border-black rounded-2xl p-6 space-y-2">
          <p className="text-[10px] font-bold uppercase text-neutral-400">Assessment Account (QRIS)</p>
          <p className="text-sm font-black">BRI 479201031488535</p>
          <p className="text-[9px] uppercase-soft">a.n TBJ Architect & Constech</p>
        </Card>
        <Card className="border-2 border-black rounded-2xl p-6 space-y-2">
          <p className="text-[10px] font-bold uppercase text-neutral-400">Total Bobot</p>
          <p className="text-xl font-black">{totalWeight.toFixed(0)}%</p>
          <Progress value={totalWeight} className="h-1" />
        </Card>
        <Card className="md:col-span-2 border-2 border-black rounded-2xl p-6 flex items-center justify-between bg-neutral-50">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-neutral-400">Project Timeline</p>
            <p className="text-sm font-black">20 Mar - 15 Jun 2026</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-md border-black text-[10px] uppercase font-bold">View S-Curve</Button>
        </Card>
      </div>

      <div className="flex gap-4">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
            <Plus className="w-4 h-4" /> Tambah Kategori
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Kategori Baru</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Nama Kategori</Label>
                <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Contoh: Pekerjaan Tanah" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { addCategory(newCatName); setNewCatName(""); }}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="w-4 h-4" /> Tambah Item
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Tambah Item Anggaran</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={selectedCatId}
                  onChange={e => setSelectedCatId(e.target.value)}
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-2 relative">
                <Label>Cari Pekerjaan (Master Data)</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
                  <Input 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    placeholder="Ketik nama pekerjaan (misal: galian, cat, lampu)..." 
                    className="pl-8"
                  />
                </div>
                <p className="text-[10px] text-neutral-400 mt-1 italic">*Jika tidak ada di database, Anda bisa langsung mengisi form di bawah secara manual.</p>
                {isSearching && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {searchResults.map(item => (
                      <div 
                        key={item.id} 
                        className="p-2 hover:bg-neutral-100 cursor-pointer border-b last:border-0"
                        onClick={() => selectMasterItem(item)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{item.name}</span>
                          <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                        </div>
                        <div className="flex justify-between text-xs text-neutral-500 mt-1">
                          <span>Satuan: {item.unit}</span>
                          <span>Rp {item.price.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Nama Item (Manual Edit)</Label>
                <Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Nama pekerjaan..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jumlah (Volume)</Label>
                  <Input 
                    type="number" 
                    value={newItemQty || 0} 
                    onChange={e => setNewItemQty(Math.max(0, Number(e.target.value)))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Satuan</Label>
                  <Input value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)} placeholder="m3, m2, kg, dll" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Harga Satuan (Rp)</Label>
                <Input 
                  type="number" 
                  value={newItemPrice || 0} 
                  onChange={e => setNewItemPrice(Math.max(0, Number(e.target.value)))} 
                />
              </div>
              
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Estimasi Total:</span>
                  <span className="text-lg font-bold">Rp {(newItemQty * newItemPrice).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { 
                if(selectedCatId && newItemName) {
                  addItem(selectedCatId, newItemName, newItemQty, newItemUnit, newItemPrice);
                  setNewItemName("");
                  setNewItemQty(1);
                  setNewItemPrice(0);
                  setSearchQuery("");
                }
              }}>Simpan ke RAB</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-12">
        {categories.map(category => (
          <div key={category.id} className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold">{category.name}</h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => {
                    if(confirm(`Hapus kategori "${category.name}" dan semua item di dalamnya?`)) {
                      deleteCategory(category.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Badge variant="outline">
                Rp {items.filter(i => i.categoryId === category.id).reduce((sum, i) => sum + i.totalPrice, 0).toLocaleString('id-ID')}
              </Badge>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Uraian Pekerjaan</TableHead>
                    <TableHead className="text-center">Volume</TableHead>
                    <TableHead className="text-center">Satuan</TableHead>
                    <TableHead className="text-right">Harga Satuan</TableHead>
                    <TableHead className="text-right">Jumlah Harga</TableHead>
                    <TableHead className="w-[100px] text-center">Bobot (%)</TableHead>
                    <TableHead className="w-[100px] text-center">Progress (%)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.filter(i => i.categoryId === category.id).map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center">{item.unit}</TableCell>
                      <TableCell className="text-right font-mono text-[10px]">Rp {item.pricePerUnit.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-[10px]">Rp {item.totalPrice.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-center text-[10px] font-bold">
                        {((item.totalPrice / (project.totalBudget || 1)) * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Input 
                          type="number" 
                          className="w-16 h-8 text-center mx-auto rounded-md border-black/20" 
                          value={item.progress || 0}
                          onChange={(e) => {
                            updateItemProgress(item.id, Math.max(0, Math.min(100, Number(e.target.value))));
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-neutral-400 hover:text-red-600"
                          onClick={() => deleteItem(item.id, item.totalPrice)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.filter(i => i.categoryId === category.id).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-neutral-400 italic">Belum ada item di kategori ini.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed rounded-2xl border-neutral-200">
            <p className="text-neutral-500">Belum ada kategori anggaran. Silakan tambah kategori terlebih dahulu.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const VirtualAssistant = ({ user, updateProfile }: { user: any, updateProfile: (data: any) => Promise<void> }) => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userProblem, setUserProblem] = useState("");
  const [problemPhotos, setProblemPhotos] = useState<string[]>([]);
  const [furnitureSpecs, setFurnitureSpecs] = useState({
    name: "",
    length: 0,
    width: 0,
    height: 0,
    finishing: "HPL",
    class: "Medium",
    notes: ""
  });
  const [aiEstimation, setAiEstimation] = useState<AIEstimateResponse | null>(null);
  const [expandedRenovasi, setExpandedRenovasi] = useState(false);
  const [leadData, setLeadData] = useState({
    whatsapp: user.whatsapp || "",
    email: user.email || "",
  });
  const [projectData, setProjectData] = useState({
    area: 0,
    location: "",
    type: "Renovasi", // Default
    subType: "",
    floors: 1,
    finishing: "Standard",
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ item: WorkItemMaster; qty: number }[]>([]);
  const [interiorDetails, setInteriorDetails] = useState<{
    [room: string]: {
      [itemName: string]: { material: string; size: number; unit: string; price: number }
    }
  }>({});
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [expandedFurniture, setExpandedFurniture] = useState<string | null>(null);
  const { properties } = useProperties();

  const [mapPosition, setMapPosition] = useState<[number, number]>([-6.2088, 106.8456]); // Jakarta
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const searchLocation = async (query: string) => {
    if (!query) return;
    setIsSearchingLocation(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setMapPosition([parseFloat(lat), parseFloat(lon)]);
      }
    } catch (error) {
      console.error("Location search failed", error);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const MAIN_CATEGORIES = [
    { id: "Renovasi", label: "Renovasi", icon: Wrench, desc: "Perbaikan & upgrade bangunan" },
    { id: "Interior", label: "Desain & Interior", icon: PenTool, desc: "Layanan Desain Interior & Furniture" },
    { id: "Arsitektur", label: "Arsitektur & Perencanaan", icon: Building2, desc: "Layanan Perencanaan & Bangun Baru" },
    { id: "Maintenance", label: "Maintenance", icon: Clock, desc: "Perawatan rutin & perbaikan minor" },
    { id: "Property", label: "TBJ Property & Permit Hub", icon: Home, desc: "Jual, Sewa, & Perizinan (IMB/PBG)" },
  ];

  const INTERIOR_ROOMS = ["Kamar Tidur", "Ruang Tamu", "Kitchen Set", "Walk-in Closet", "Ruang Kerja"];
  const FURNITURE_ITEMS = [
    { name: "Kabinet Atas", unit: "m1", basePrice: 2250000 },
    { name: "Kabinet Bawah", unit: "m1", basePrice: 2450000 },
    { name: "Rak Lemari", unit: "m2", basePrice: 1950000 },
    { name: "Meja Kerja", unit: "unit", basePrice: 1850000 },
    { name: "Backdrop TV", unit: "m2", basePrice: 1850000 },
  ];

  const handleNext = async () => {
    const isAIRequired = 
      (step === 2 && (
        projectData.type === "Maintenance" || 
        (projectData.type === "Arsitektur" && projectData.subType === "bangun-baru") ||
        (projectData.type === "Interior" && projectData.subType === "jasa-desain") ||
        selectedCategories.includes("Lain-lain")
      ));

    if (isAIRequired) {
      if (!userProblem) {
        alert("Mohon isi deskripsi kebutuhan Anda untuk analisa AI.");
        return;
      }
      setIsAnalyzing(true);
      try {
        let prompt = userProblem;
        if (projectData.type === "Arsitektur") {
          prompt = `Proyek Bangun Baru: ${userProblem}, Luas: ${projectData.area}m2, Lantai: ${projectData.floors}, Finishing: ${projectData.finishing}`;
        }
        const result = await getAIEstimation(prompt, projectData.type);
        setAiEstimation(result);
        setStep(4); // Skip volume input, go to verification
      } catch (error) {
        console.error("AI Estimation failed", error);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      setStep(s => s + 1);
    }
  };
  const handleBack = () => setStep(s => s - 1);

  const interiorEstimate = Object.values(interiorDetails).reduce((roomSum, items) => {
    return roomSum + Object.values(items).reduce((itemSum, detail) => itemSum + (detail.price * detail.size), 0);
  }, 0);

  const designFee = useMemo(() => {
    if (projectData.subType === "jasa-desain") {
      return projectData.area * 175000; // Updated price
    }
    if (projectData.subType === "desain-arsitektur" && projectData.type === "Arsitektur") {
      return projectData.area * 125000; // Updated price
    }
    return 0;
  }, [projectData.subType, projectData.area, projectData.type]);

  const totalEstimate = aiEstimation 
    ? aiEstimation.totalEstimatedCost 
    : selectedItems.reduce((sum, si) => sum + (si.item.price * si.qty), 0) + interiorEstimate + designFee;

  const handleLeadSubmit = async () => {
    if (!leadData.whatsapp || !leadData.email) return;
    setIsOtpSent(true);
  };

  const verifyOtp = async () => {
    if (otp === "1234") {
      const isPro = user?.tier === "survey" || user?.tier === "deal" || user?.tier === "admin";
      const isExpired = user?.proTierExpiresAt && new Date(user.proTierExpiresAt) < new Date();
      
      if (!isPro && (user?.aiUsageCount || 0) >= 1) {
        alert("Batas analisa gratis (1x) telah tercapai. Silakan booking survey lokasi (Digital Assessment) untuk mendapatkan akses estimasi detail dan validasi teknis.");
        setStep(6); // Redirect to survey booking
        return;
      }

      if (isPro && isExpired) {
        alert("Masa berlaku Tier Pro Anda telah habis. Silakan lakukan booking survey ulang untuk memperpanjang akses.");
        setStep(6);
        return;
      }

      await updateProfile({ 
        whatsapp: leadData.whatsapp, 
        tier: user?.tier === "prospect" ? "prospect" : user?.tier,
        aiUsageCount: (user?.aiUsageCount || 0) + 1
      });
      setStep(5); // Show results
    } else {
      alert("OTP Salah. Gunakan 1234.");
    }
  };

  const sendToWA = () => {
    const message = `Halo TBJ Contractor, saya ingin order proyek:\n\n[TBJ CONTRACTOR - ESTIMASI PROYEK]\n\nRingkasan Proyek:\nLokasi: ${projectData.location}\nLuas: ${projectData.area} m2\nTipe: ${projectData.type}\n\nTOTAL ESTIMASI ANGGARAN: Rp ${totalEstimate.toLocaleString('id-ID')}\n\nMohon bantuannya untuk survey lokasi (Digital Assessment).`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/62821942016509?text=${encoded}`, "_blank");
    setStep(6); // Survey booking
  };

  const updateInteriorItem = (room: string, itemName: string, updates: any, basePrice?: number) => {
    setInteriorDetails(prev => {
      const roomData = prev[room] || {};
      const itemData = roomData[itemName] || { material: "HPL", size: 0, unit: "m1", price: basePrice || 0 };
      return {
        ...prev,
        [room]: {
          ...roomData,
          [itemName]: { ...itemData, ...updates }
        }
      };
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 py-12">
      <div className="text-center space-y-4">
        <div className="tag-tech">
          Tech Const & AI Design
        </div>
        <h1 className="text-7xl font-light tracking-tighter text-black uppercase leading-[0.8] heading-edge">
          Virtual<br/>Assistant
        </h1>
        <p className="text-neutral-400 uppercase-soft max-w-md mx-auto">
          TBJ Digital Ecosystem: AI-Powered Construction & Design
        </p>
      </div>

      {step > 0 && step < 5 && projectData.type !== "Property" && (
        <div className="flex justify-center items-center gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={cn(
              "h-1 transition-all duration-500",
              step === s ? "bg-black w-16" : "bg-neutral-200 w-8"
            )} />
          ))}
        </div>
      )}

      <Card className="border-2 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,0.05)] overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          {user?.role === "admin" && step === 1 && (
            <div className="bg-black text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <p className="uppercase-soft text-white/60">Admin Mode Active</p>
              </div>
              <Link to="/projects">
                <Button variant="outline" className="h-8 text-[10px] uppercase font-bold border-white text-white hover:bg-white hover:text-black rounded-md">
                  Go to Admin RAB Panel
                </Button>
              </Link>
            </div>
          )}
          {step === 1 && (
            <div className="p-12 space-y-12">
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-black uppercase tracking-tighter">Layanan Konstruksi</h2>
                <p className="text-neutral-400 uppercase-soft">Pilih kategori proyek untuk memulai estimasi AI</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {MAIN_CATEGORIES.map(cat => (
                  <div 
                    key={cat.id}
                    onClick={() => {
                      setProjectData({...projectData, type: cat.id});
                      if (cat.id === "Property") {
                        setStep(10); // Property Page
                      } else {
                        handleNext();
                      }
                    }}
                    className="p-8 border-2 border-black hover:bg-titanium hover:text-white cursor-pointer transition-all group relative overflow-hidden rounded-3xl"
                  >
                    <cat.icon className="w-12 h-12 mb-6 transition-transform group-hover:-translate-y-1" />
                    <h3 className="font-black text-xl uppercase tracking-tighter">{cat.label}</h3>
                    <p className="uppercase-soft mt-2 opacity-60">{cat.desc}</p>
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-12 space-y-12">
              <div className="flex justify-between items-end border-b-2 border-black pb-6">
                <h2 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-4">
                  <MapPin className="w-10 h-10" /> Detail Proyek
                </h2>
                <p className="uppercase-soft text-neutral-400">Step 02 / 05</p>
              </div>
              
              <div className="grid gap-12 md:grid-cols-2">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="uppercase-soft text-neutral-400">Lokasi Proyek</label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Ketik alamat atau area..." 
                        className="input-sleek text-lg"
                        value={projectData.location}
                        onChange={(e) => setProjectData(prev => ({ ...prev, location: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') searchLocation(projectData.location);
                        }}
                      />
                      <Button 
                        variant="outline" 
                        className="rounded-md border-black h-12 w-12 p-0 flex items-center justify-center" 
                        onClick={() => searchLocation(projectData.location)}
                        disabled={isSearchingLocation}
                      >
                        {isSearchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                    <MapPicker position={mapPosition} setPosition={setMapPosition} />
                  </div>

                  {projectData.type === "Renovasi" && (
                    <div className="space-y-6">
                      <div className="border-2 border-black overflow-hidden rounded-2xl">
                        <div 
                          onClick={() => setExpandedRenovasi(!expandedRenovasi)}
                          className={cn(
                            "p-6 flex justify-between items-center cursor-pointer transition-colors",
                            selectedCategories.filter(c => c !== "Lain-lain").length > 0 ? "bg-black text-white" : "hover:bg-neutral-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Wrench className="w-6 h-6" />
                            <span className="font-black uppercase tracking-tighter text-lg">Item Renovasi Utama</span>
                          </div>
                          {expandedRenovasi ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                        {expandedRenovasi && (
                          <div className="p-6 bg-neutral-50 grid grid-cols-2 gap-3">
                            {["Dinding", "Lantai", "Atap", "Plafon", "Cat", "Kamar Mandi"].map(item => (
                              <div 
                                key={item}
                                onClick={() => toggleCategory(item)}
                                className={cn(
                                  "p-4 border-2 font-bold uppercase tracking-widest text-[10px] cursor-pointer text-center transition-all bg-white rounded-xl",
                                  selectedCategories.includes(item) ? "border-black bg-black text-white" : "border-neutral-200 hover:border-black"
                                )}
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-6 pt-6 border-t-2 border-black/5">
                        <div className="space-y-4">
                          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                            <Calculator className="w-6 h-6 text-accent" /> AI Analysis & Photos
                          </h3>
                          <p className="uppercase-soft text-neutral-400">Ceritakan detail renovasi Anda dan upload foto untuk analisa AI yang lebih akurat.</p>
                        </div>
                        
                        <div className="space-y-6 p-8 border-2 border-black animate-in fade-in slide-in-from-top-4 rounded-2xl">
                          <div className="space-y-2">
                            <label className="uppercase-soft text-neutral-400">Luas Area Renovasi (m2)</label>
                            <Input 
                              type="number" 
                              value={projectData.area} 
                              onChange={e => setProjectData({...projectData, area: Number(e.target.value)})}
                              className="input-sleek"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="uppercase-soft text-neutral-400">Ceritakan Permasalahan Anda</label>
                            <Textarea 
                              placeholder="Contoh: Dinding saya retak rambut di area ruang tamu..." 
                              value={userProblem}
                              onChange={e => setUserProblem(e.target.value)}
                              className="min-h-[150px] border-black/10 focus:border-black rounded-md resize-none"
                            />
                          </div>
                            
                          <div className="space-y-4">
                            <label className="uppercase-soft text-neutral-400">Upload Foto Permasalahan</label>
                            <div className="flex flex-wrap gap-4">
                              {problemPhotos.map((p, i) => (
                                <div key={i} className="w-24 h-24 border-2 border-black overflow-hidden relative group rounded-xl">
                                  <img src={p} className="w-full h-full object-cover" />
                                  <button 
                                    onClick={() => setProblemPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute inset-0 bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                  >
                                    <Trash2 className="w-6 h-6" />
                                  </button>
                                </div>
                              ))}
                              <label className="w-24 h-24 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors rounded-xl">
                                <Camera className="w-8 h-8 text-neutral-400" />
                                <span className="uppercase-soft mt-2">Add Photo</span>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*" 
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (ev) => setProblemPhotos(prev => [...prev, ev.target?.result as string]);
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {projectData.type === "Maintenance" && (
                    <div className="space-y-6">
                      <div className="border-2 border-black overflow-hidden rounded-2xl">
                        <div 
                          onClick={() => setExpandedRenovasi(!expandedRenovasi)}
                          className={cn(
                            "p-6 flex justify-between items-center cursor-pointer transition-colors",
                            selectedCategories.length > 0 ? "bg-black text-white" : "hover:bg-neutral-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Wrench className="w-6 h-6" />
                            <span className="font-black uppercase tracking-tighter text-lg">Jenis Perbaikan</span>
                          </div>
                          {expandedRenovasi ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                        {expandedRenovasi && (
                          <div className="p-6 bg-neutral-50 grid grid-cols-2 gap-3">
                            {["Kebocoran Atap", "Kelistrikan", "Pipa Air", "AC Service", "Pengecatan Ulang", "Lain-lain"].map(item => (
                              <div 
                                key={item}
                                onClick={() => toggleCategory(item)}
                                className={cn(
                                  "p-4 border-2 font-bold uppercase tracking-widest text-[10px] cursor-pointer text-center transition-all bg-white rounded-xl",
                                  selectedCategories.includes(item) ? "border-black bg-black text-white" : "border-neutral-200 hover:border-black"
                                )}
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-6 pt-6 border-t-2 border-black/5">
                        <div className="space-y-4">
                          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                            <Calculator className="w-6 h-6 text-accent" /> AI Maintenance Analysis
                          </h3>
                          <p className="uppercase-soft text-neutral-400">Ceritakan kebutuhan perawatan atau perbaikan minor Anda.</p>
                        </div>
                        
                        <div className="space-y-6 p-8 border-2 border-black animate-in fade-in slide-in-from-top-4 rounded-2xl">
                          <div className="space-y-2">
                            <label className="uppercase-soft text-neutral-400">Detail Pekerjaan Maintenance</label>
                            <Textarea 
                              placeholder="Contoh: Service AC 3 unit, perbaikan kran bocor, pembersihan toren..." 
                              value={userProblem}
                              onChange={e => setUserProblem(e.target.value)}
                              className="min-h-[150px] border-black/10 focus:border-black rounded-md resize-none"
                            />
                          </div>
                            
                          <div className="space-y-4">
                            <label className="uppercase-soft text-neutral-400">Upload Foto (Opsional)</label>
                            <div className="flex flex-wrap gap-4">
                              {problemPhotos.map((p, i) => (
                                <div key={i} className="w-24 h-24 border-2 border-black overflow-hidden relative group rounded-xl">
                                  <img src={p} className="w-full h-full object-cover" />
                                  <button 
                                    onClick={() => setProblemPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute inset-0 bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                  >
                                    <Trash2 className="w-6 h-6" />
                                  </button>
                                </div>
                              ))}
                              <label className="w-24 h-24 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors rounded-xl">
                                <Camera className="w-8 h-8 text-neutral-400" />
                                <span className="uppercase-soft mt-2">Add Photo</span>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*" 
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (ev) => setProblemPhotos(prev => [...prev, ev.target?.result as string]);
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {projectData.type === "Arsitektur" && (
                    <div className="space-y-6">
                      <label className="uppercase-soft text-neutral-400">Pilih Layanan Arsitektur</label>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: "desain-arsitektur", label: "Jasa Desain Arsitektur", icon: PenTool, desc: "Gambar IMB, 3D, & RAB" },
                          { id: "bangun-baru", label: "Bangun Baru (AI Analysis)", icon: Building2, desc: "Estimasi biaya bangun dari nol" }
                        ].map(svc => (
                          <div 
                            key={svc.id}
                            onClick={() => setProjectData({...projectData, subType: svc.id})}
                            className={cn(
                              "p-6 border-2 cursor-pointer transition-all text-center space-y-4 rounded-2xl",
                              projectData.subType === svc.id ? "border-black bg-black text-white" : "border-neutral-100 hover:border-black"
                            )}
                          >
                            <svc.icon className="w-8 h-8 mx-auto" />
                            <p className="text-xs font-black uppercase tracking-widest">{svc.label}</p>
                            <p className="uppercase-soft opacity-60">{svc.desc}</p>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-6 pt-6 border-t-2 border-black/5">
                        <div className="space-y-4">
                          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                            <Calculator className="w-6 h-6 text-accent" /> AI Design Analysis
                          </h3>
                          <p className="uppercase-soft text-neutral-400">Input spesifikasi untuk analisa AI yang lebih akurat.</p>
                        </div>
                        
                        <div className="space-y-6 p-8 border-2 border-black animate-in fade-in slide-in-from-top-4 rounded-2xl">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="uppercase-soft text-neutral-400">Luas Bangunan (m2)</label>
                              <Input 
                                type="number" 
                                value={projectData.area} 
                                onChange={e => setProjectData({...projectData, area: Number(e.target.value)})}
                                className="input-sleek"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="uppercase-soft text-neutral-400">Jumlah Lantai</label>
                              <Input 
                                type="number" 
                                value={projectData.floors} 
                                onChange={e => setProjectData({...projectData, floors: Number(e.target.value)})}
                                className="input-sleek"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="uppercase-soft text-neutral-400">Tipe Finishing</label>
                              <select 
                                className="w-full h-12 border-2 border-black/10 rounded-md px-4 text-xs font-bold uppercase tracking-widest"
                                value={projectData.finishing}
                                onChange={e => setProjectData({...projectData, finishing: e.target.value})}
                              >
                                <option value="Standard">Standard</option>
                                <option value="Premium">Premium</option>
                                <option value="Luxury">Luxury</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="uppercase-soft text-neutral-400">Konsep & Kebutuhan Ruang</label>
                            <Textarea 
                              placeholder="Contoh: Rumah 2 lantai, 3 kamar tidur, konsep industrial..." 
                              value={userProblem}
                              onChange={e => setUserProblem(e.target.value)}
                              className="min-h-[120px] border-black/10 focus:border-black rounded-md resize-none"
                            />
                          </div>
                            
                          <div className="space-y-4">
                            <label className="uppercase-soft text-neutral-400">Upload Referensi / Sketsa</label>
                            <div className="flex flex-wrap gap-4">
                              {problemPhotos.map((p, i) => (
                                <div key={i} className="w-24 h-24 border-2 border-black overflow-hidden relative group rounded-xl">
                                  <img src={p} className="w-full h-full object-cover" />
                                  <button 
                                    onClick={() => setProblemPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute inset-0 bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                  >
                                    <Trash2 className="w-6 h-6" />
                                  </button>
                                </div>
                              ))}
                              <label className="w-24 h-24 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors rounded-xl">
                                <Camera className="w-8 h-8 text-neutral-400" />
                                <span className="uppercase-soft mt-2">Add Photo</span>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*" 
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (ev) => setProblemPhotos(prev => [...prev, ev.target?.result as string]);
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {projectData.type === "Interior" && (
                    <div className="space-y-6">
                      <label className="uppercase-soft text-neutral-400">Pilih Layanan Desain</label>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: "custom-furniture", label: "Layanan Custom Furniture", icon: PenTool, desc: "Mebel kustom sesuai ruangan" },
                          { id: "jasa-desain", label: "Jasa Desain Interior", icon: FileText, desc: "Gambar kerja, view, dokumen teknis" }
                        ].map(svc => (
                          <div 
                            key={svc.id}
                            onClick={() => setProjectData({...projectData, subType: svc.id})}
                            className={cn(
                              "p-6 border-2 cursor-pointer transition-all text-center space-y-4",
                              projectData.subType === svc.id ? "border-black bg-black text-white" : "border-neutral-100 hover:border-black"
                            )}
                          >
                            <svc.icon className="w-8 h-8 mx-auto" />
                            <p className="text-xs font-black uppercase tracking-widest">{svc.label}</p>
                            <p className="uppercase-soft opacity-60">{svc.desc}</p>
                          </div>
                        ))}
                      </div>
                      
                      {projectData.subType === "custom-furniture" && (
                        <div className="space-y-8 pt-6 border-t-2 border-black/5 animate-in fade-in slide-in-from-top-4">
                          <div className="space-y-4">
                            <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                              <Calculator className="w-6 h-6 text-accent" /> AI Furniture Analysis
                            </h3>
                            <p className="uppercase-soft text-neutral-400">Input spesifikasi mebel Anda untuk analisa AI instan.</p>
                          </div>
                          
                          <div className="grid gap-6">
                            <div className="space-y-2">
                              <label className="uppercase-soft text-neutral-400">Nama Mebel</label>
                              <Input 
                                placeholder="Contoh: Lemari Pakaian 3 Pintu" 
                                className="input-sleek"
                                value={furnitureSpecs.name}
                                onChange={e => setFurnitureSpecs({...furnitureSpecs, name: e.target.value})}
                              />
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <label className="uppercase-soft text-neutral-400">Panjang (cm)</label>
                                <Input type="number" className="input-sleek" value={furnitureSpecs.length} onChange={e => setFurnitureSpecs({...furnitureSpecs, length: Number(e.target.value)})} />
                              </div>
                              <div className="space-y-2">
                                <label className="uppercase-soft text-neutral-400">Lebar (cm)</label>
                                <Input type="number" className="input-sleek" value={furnitureSpecs.width} onChange={e => setFurnitureSpecs({...furnitureSpecs, width: Number(e.target.value)})} />
                              </div>
                              <div className="space-y-2">
                                <label className="uppercase-soft text-neutral-400">Tinggi (cm)</label>
                                <Input type="number" className="input-sleek" value={furnitureSpecs.height} onChange={e => setFurnitureSpecs({...furnitureSpecs, height: Number(e.target.value)})} />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="uppercase-soft text-neutral-400">Finishing</label>
                                <select 
                                  className="w-full h-12 border-2 border-black/10 rounded-md px-4 text-xs font-bold uppercase tracking-widest"
                                  value={furnitureSpecs.finishing}
                                  onChange={e => setFurnitureSpecs({...furnitureSpecs, finishing: e.target.value})}
                                >
                                  <option value="HPL">HPL Standard</option>
                                  <option value="Duco">Cat Duco</option>
                                  <option value="Veneer">Veneer (Natural Wood)</option>
                                  <option value="Melamic">Melamic / Wood Stain</option>
                                  <option value="Taco">Taco Sheet</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="uppercase-soft text-neutral-400">Kelas Material</label>
                                <select 
                                  className="w-full h-12 border-2 border-black/10 rounded-md px-4 text-xs font-bold uppercase tracking-widest"
                                  value={furnitureSpecs.class}
                                  onChange={e => setFurnitureSpecs({...furnitureSpecs, class: e.target.value})}
                                >
                                  <option value="Medium">Medium (Blockboard/Plywood)</option>
                                  <option value="Premium">Premium (Plywood 18mm)</option>
                                  <option value="Luxury">Luxury (Solid Wood / High Gloss)</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="uppercase-soft text-neutral-400">Catatan Tambahan</label>
                              <Textarea 
                                placeholder="Contoh: Ingin ada lampu LED di dalam, handle emas..." 
                                className="min-h-[100px] border-black/10 rounded-md"
                                value={furnitureSpecs.notes}
                                onChange={e => setFurnitureSpecs({...furnitureSpecs, notes: e.target.value})}
                              />
                            </div>

                            <div className="space-y-4">
                              <label className="uppercase-soft text-neutral-400">Foto Referensi / Ruangan</label>
                              <div className="flex flex-wrap gap-4">
                                {problemPhotos.map((p, i) => (
                                  <div key={i} className="w-20 h-20 border-2 border-black overflow-hidden relative group rounded-lg">
                                    <img src={p} className="w-full h-full object-cover" />
                                    <button 
                                      onClick={() => setProblemPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                      className="absolute inset-0 bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                                <label className="w-20 h-20 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors rounded-lg">
                                  <Camera className="w-6 h-6 text-neutral-400" />
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => setProblemPhotos(prev => [...prev, ev.target?.result as string]);
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>

                            <Button 
                              className="w-full btn-orange h-14"
                              onClick={async () => {
                                if (!furnitureSpecs.name) return;
                                setIsAnalyzing(true);
                                try {
                                  const prompt = `Analisa mebel: ${furnitureSpecs.name}, Ukuran: ${furnitureSpecs.length}x${furnitureSpecs.width}x${furnitureSpecs.height}cm, Finishing: ${furnitureSpecs.finishing}, Kelas: ${furnitureSpecs.class}, Catatan: ${furnitureSpecs.notes}`;
                                  const result = await getAIEstimation(prompt, "Interior");
                                  setAiEstimation(result);
                                  setStep(4);
                                } catch (error) {
                                  console.error(error);
                                } finally {
                                  setIsAnalyzing(false);
                                }
                              }}
                              disabled={isAnalyzing || !furnitureSpecs.name}
                            >
                              {isAnalyzing ? <Loader2 className="animate-spin w-5 h-5" /> : "Analisa Mebel dengan AI"}
                            </Button>
                          </div>
                        </div>
                      )}

                      {projectData.subType === "jasa-desain" && (
                        <div className="space-y-6 pt-6 border-t-2 border-black/5 animate-in fade-in slide-in-from-top-4">
                          <div className="space-y-4">
                            <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                              <Calculator className="w-6 h-6 text-accent" /> AI Interior Analysis
                            </h3>
                            <p className="uppercase-soft text-neutral-400">Ceritakan konsep interior impian Anda.</p>
                          </div>
                          
                          <div className="space-y-6 p-8 border-2 border-black rounded-2xl">
                            <div className="space-y-2">
                              <label className="uppercase-soft text-neutral-400">Luas Area (m2)</label>
                              <Input 
                                type="number" 
                                value={projectData.area} 
                                onChange={e => setProjectData({...projectData, area: Number(e.target.value)})}
                                className="input-sleek"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="uppercase-soft text-neutral-400">Konsep & Gaya Interior</label>
                              <Textarea 
                                placeholder="Contoh: Gaya Japandi, dominasi kayu terang, pencahayaan hangat..." 
                                value={userProblem}
                                onChange={e => setUserProblem(e.target.value)}
                                className="min-h-[150px] border-black/10 focus:border-black rounded-md resize-none"
                              />
                            </div>
                            <div className="space-y-4">
                              <label className="uppercase-soft text-neutral-400">Upload Foto Ruangan / Referensi</label>
                              <div className="flex flex-wrap gap-4">
                                {problemPhotos.map((p, i) => (
                                  <div key={i} className="w-24 h-24 border-2 border-black overflow-hidden relative group rounded-xl">
                                    <img src={p} className="w-full h-full object-cover" />
                                    <button 
                                      onClick={() => setProblemPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                      className="absolute inset-0 bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                      <Trash2 className="w-6 h-6" />
                                    </button>
                                  </div>
                                ))}
                                <label className="w-24 h-24 border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors rounded-xl">
                                  <Camera className="w-8 h-8 text-neutral-400" />
                                  <span className="uppercase-soft mt-2">Add Photo</span>
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => setProblemPhotos(prev => [...prev, ev.target?.result as string]);
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Removed duplicate Arsitektur section */}

                  {/* Removed duplicate Maintenance section and redundant area input */}
                </div>

                <div className="space-y-8 bg-neutral-50 p-12 border border-black/5">
                  <div className="space-y-6">
                    <h3 className="font-black uppercase tracking-tighter text-2xl">Project Summary</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between uppercase-soft border-b border-black/5 pb-2">
                        <span className="text-neutral-400">Category</span>
                        <span className="font-black">{projectData.type}</span>
                      </div>
                      <div className="flex justify-between uppercase-soft border-b border-black/5 pb-2">
                        <span className="text-neutral-400">Location</span>
                        <span className="font-black truncate max-w-[150px]">{projectData.location || "-"}</span>
                      </div>
                      <div className="flex justify-between uppercase-soft border-b border-black/5 pb-2">
                        <span className="text-neutral-400">Area</span>
                        <span className="font-black">{projectData.area} m2</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-8 flex flex-col gap-4">
                    <Button className="w-full btn-orange h-16 text-lg" onClick={handleNext} disabled={isAnalyzing}>
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>Analyze Project <ChevronRight className="ml-2 w-5 h-5" /></>
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black" 
                      onClick={handleBack} 
                      disabled={isAnalyzing}
                    >
                      &larr; Back to Categories
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-12 space-y-12">
              <div className="flex justify-between items-end border-b-2 border-black pb-6">
                <h2 className="text-4xl font-black uppercase tracking-tighter">Volume Pekerjaan</h2>
                <p className="uppercase-soft text-neutral-400">Step 03 / 05</p>
              </div>
              <div className="grid gap-12 md:grid-cols-3">
                <div className="md:col-span-2 space-y-8 max-h-[60vh] overflow-auto pr-6 custom-scrollbar">
                  {projectData.type === "Interior" ? (
                    <div className="space-y-8">
                      <div className="p-8 border-2 border-black bg-neutral-50 space-y-4">
                        <p className="uppercase-soft text-neutral-400">Interior Note</p>
                        <p className="text-sm font-bold leading-relaxed italic">"Detail interior telah diinput pada tahap sebelumnya. Silakan tinjau kembali ringkasan di samping atau lanjutkan ke verifikasi."</p>
                      </div>
                      {Object.entries(interiorDetails).map(([room, items]) => (
                        <div key={room} className="p-8 border-2 border-black space-y-6">
                          <h4 className="text-xl font-black uppercase tracking-tighter border-b border-black/10 pb-4">{room}</h4>
                          <div className="grid gap-4">
                            {Object.entries(items).map(([name, detail]) => (
                              <div key={name} className="flex justify-between items-center text-sm">
                                <span className="font-bold uppercase tracking-widest text-[10px]">{name}</span>
                                <span className="font-mono font-bold">{detail.size} {WORK_ITEMS_MASTER[room]?.[name]?.unit || "m2"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    selectedCategories.length > 0 ? selectedCategories.map(cat => (
                      <div key={cat} className="space-y-6">
                        <h3 className="font-black uppercase tracking-tighter text-xl flex items-center gap-3">
                          <Layers className="w-6 h-6" /> {cat}
                        </h3>
                        <div className="grid gap-4">
                          {WORK_ITEMS_MASTER.filter(i => i.category.toLowerCase().includes(cat.toLowerCase())).slice(0, 3).map(item => {
                            const selected = selectedItems.find(si => si.item.id === item.id);
                            return (
                              <div key={item.id} className="flex items-center gap-6 p-6 border-2 border-black bg-white">
                                <div className="flex-grow">
                                  <p className="font-black uppercase tracking-widest text-[10px]">{item.name}</p>
                                  <p className="uppercase-soft text-neutral-400 mt-1">{item.unit}</p>
                                </div>
                                <Input 
                                  type="number" 
                                  className="w-32 h-12 border-black/20 focus:border-black rounded-md font-bold text-center" 
                                  placeholder="Vol"
                                  value={selected?.qty || ""}
                                  onChange={e => {
                                    const qty = Number(e.target.value);
                                    setSelectedItems(prev => {
                                      const filtered = prev.filter(si => si.item.id !== item.id);
                                      if (qty > 0) return [...filtered, { item, qty }];
                                      return filtered;
                                    });
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-20 border-2 border-dashed border-neutral-200">
                        <p className="uppercase-soft text-neutral-400">
                          Gunakan input luas area untuk kalkulasi otomatis atau pilih kategori di tahap sebelumnya.
                        </p>
                      </div>
                    )
                  )}
                </div>

                <div className="space-y-8 bg-neutral-50 p-12 border border-black/5">
                  <div className="space-y-6">
                    <h3 className="font-black uppercase tracking-tighter text-2xl">Project Summary</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between uppercase-soft border-b border-black/5 pb-2">
                        <span className="text-neutral-400">Type</span>
                        <span className="font-black">{projectData.type}</span>
                      </div>
                      <div className="flex justify-between uppercase-soft border-b border-black/5 pb-2">
                        <span className="text-neutral-400">Area</span>
                        <span className="font-black">{projectData.area} m2</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-12 flex flex-col gap-4">
                    <Button className="w-full btn-orange py-10 text-xl" onClick={handleNext}>
                      Verify Data <ChevronRight className="ml-2 w-6 h-6" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black" 
                      onClick={handleBack}
                    >
                      &larr; Back to Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="p-8 space-y-8">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-black text-white flex items-center justify-center mx-auto mb-4 rounded-xl">
                  <UserCheck className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Tier 01: Verifikasi Data</h2>
                <p className="text-neutral-500 text-sm">Mohon lengkapi data kontak Anda untuk menerima hasil estimasi lengkap.</p>
              </div>
              <div className="max-w-md mx-auto space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="uppercase-soft text-neutral-400">WhatsApp Number</label>
                    <Input 
                      placeholder="0812..." 
                      className="input-sleek text-lg"
                      value={leadData.whatsapp}
                      onChange={e => setLeadData({...leadData, whatsapp: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="uppercase-soft text-neutral-400">Email Address</label>
                    <Input 
                      placeholder="email@example.com" 
                      className="input-sleek text-lg"
                      value={leadData.email}
                      onChange={e => setLeadData({...leadData, email: e.target.value})}
                    />
                  </div>
                </div>
                {!isOtpSent ? (
                  <Button 
                    className="w-full btn-orange"
                    onClick={handleLeadSubmit}
                    disabled={!leadData.whatsapp || !leadData.email}
                  >
                    Kirim Kode Verifikasi
                  </Button>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="space-y-1">
                      <label className="uppercase-soft text-neutral-400">OTP Code (Check WA)</label>
                      <Input 
                        placeholder="1234" 
                        className="input-sleek text-center text-2xl tracking-[1em]"
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                      />
                    </div>
                    <Button className="w-full btn-orange" onClick={verifyOtp}>Verifikasi & Lihat Hasil</Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="p-8 space-y-12">
              <div className="flex justify-between items-start border-b-2 border-black pb-8">
                <div className="space-y-1">
                  <h2 className="text-4xl font-black uppercase tracking-tighter">Estimasi Proyek</h2>
                  <p className="text-neutral-400 uppercase-soft">Generated by TBJ AI Estimator</p>
                </div>
                <div className="text-right">
                  <p className="uppercase-soft text-neutral-400">Total Anggaran</p>
                  <p className="text-4xl font-black tracking-tighter">Rp {totalEstimate.toLocaleString('id-ID')}</p>
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2 space-y-8">
                  {aiEstimation && (
                    <div className="p-6 md:p-8 border-2 border-black space-y-6 relative overflow-hidden rounded-2xl shadow-sm">
                      <div className="absolute top-0 right-0 bg-black text-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest">AI Result</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-black font-black uppercase tracking-tighter text-xl">
                          <Calculator className="w-6 h-6 text-accent" />
                          <h3>Analisa Teknis AI</h3>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-md border-black/10 hover:border-black">
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-md border-black/10 hover:border-black">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="bg-neutral-50 p-6 border-l-4 border-black rounded-r-xl">
                        <p className="text-sm text-neutral-600 leading-relaxed italic">"{aiEstimation.analysis}"</p>
                      </div>
                      <div className="space-y-4">
                        <p className="uppercase-soft text-neutral-400 font-bold">Rincian Pekerjaan & Estimasi:</p>
                        <div className="grid gap-4">
                          {aiEstimation.items.map((item, idx) => (
                            <div key={idx} className="border-b border-black/5 pb-4 flex justify-between items-start group">
                              <div className="space-y-1">
                                <p className="font-black text-xs uppercase tracking-widest group-hover:text-accent transition-colors">{item.name}</p>
                                <p className="text-[10px] text-neutral-400 leading-tight max-w-xs">{item.reasoning}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono text-xs font-bold">{item.quantity} {item.unit}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-6 border-t-2 border-black/5 flex justify-between items-center">
                        <p className="uppercase-soft text-neutral-400">Estimasi Total</p>
                        <p className="text-3xl font-black tracking-tighter">Rp {aiEstimation.totalEstimatedCost.toLocaleString('id-ID')}</p>
                      </div>
                      
                      {/* Detailed RAB for Tier 3 & Admin */}
                      {(user?.tier === "deal" || user?.role === "admin") ? (
                        <div className="space-y-4">
                          <Dialog>
                            <DialogTrigger render={<div className="w-full border-2 border-black rounded-xl uppercase-soft h-12 gap-2 flex items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors" />}>
                              <FileText className="w-4 h-4" /> Lihat Detail RAB (Tier 3 / Admin)
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl border-2 border-black rounded-3xl p-8">
                              <DialogHeader>
                                <DialogTitle className="text-3xl font-black uppercase tracking-tighter">Detail RAB Teknis</DialogTitle>
                                <DialogDescription className="uppercase-soft">Rincian volume dan harga satuan untuk validasi teknis.</DialogDescription>
                              </DialogHeader>
                              <div className="py-6 max-h-[60vh] overflow-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b-2 border-black uppercase-soft text-[10px] text-neutral-400">
                                      <th className="py-4">Item Pekerjaan</th>
                                      <th className="py-4 text-center">Volume</th>
                                      <th className="py-4 text-right">Harga Satuan</th>
                                      <th className="py-4 text-right">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {aiEstimation.items.map((item, idx) => (
                                      <tr key={idx} className="border-b border-black/5 hover:bg-neutral-50 transition-colors">
                                        <td className="py-4">
                                          <p className="text-xs font-black uppercase tracking-widest">{item.name}</p>
                                          <p className="text-[9px] text-neutral-400 italic">{item.reasoning}</p>
                                        </td>
                                        <td className="py-4 text-center text-xs font-bold">{item.quantity} {item.unit}</td>
                                        <td className="py-4 text-right text-xs font-mono">Rp {item.pricePerUnit.toLocaleString('id-ID')}</td>
                                        <td className="py-4 text-right text-xs font-black">Rp {item.totalPrice.toLocaleString('id-ID')}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-black text-white">
                                      <td colSpan={3} className="py-4 px-6 text-xs font-black uppercase">Total Estimasi</td>
                                      <td className="py-4 px-6 text-right text-lg font-black tracking-tighter">Rp {aiEstimation.totalEstimatedCost.toLocaleString('id-ID')}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </DialogContent>
                          </Dialog>
                          {user?.role === "admin" && (
                            <Link to="/rab">
                              <Button className="w-full bg-black text-white hover:bg-neutral-800 rounded-xl h-12 uppercase-soft gap-2">
                                <Settings className="w-4 h-4" /> Edit di RAB Master (Admin Only)
                              </Button>
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className="bg-neutral-100 p-4 rounded-xl border border-dashed border-neutral-300 text-center">
                          <p className="text-[10px] font-bold uppercase text-neutral-400">Upgrade ke Tier 3 untuk melihat detail harga satuan & RAB lengkap.</p>
                        </div>
                      )}
                      <div className="bg-accent/5 p-4 rounded-xl border border-accent/10">
                        <p className="text-[10px] text-accent font-bold uppercase tracking-widest leading-relaxed">
                          *Disclaimer: Estimasi ini adalah prakiraan awal berbasis AI berdasarkan data pasar. Nilai final akan divalidasi setelah survey teknis dan verifikasi material di lokasi.
                        </p>
                      </div>
                    </div>
                  )}

                  {(projectData.subType === "jasa-desain" || (projectData.subType === "desain-arsitektur" && projectData.type === "Arsitektur")) && (
                    <div className="p-8 border border-black space-y-6">
                      <div className="flex items-center gap-2 text-black font-bold uppercase tracking-widest text-sm">
                        <FileText className="w-5 h-5" />
                        <h3>Layanan Perencanaan</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1">
                          <p className="uppercase-soft text-neutral-400">Produk Gambar</p>
                          <ul className="space-y-2">
                            {["3D Render Realistic", "Gambar Kerja Lengkap", "BoQ & Spek Material"].map(i => (
                              <li key={i} className="flex items-center gap-2 text-xs font-bold uppercase">
                                <CheckCircle2 className="w-3 h-3 text-green-500" /> {i}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="text-right">
                          <p className="uppercase-soft text-neutral-400">Biaya Desain</p>
                          <p className="text-2xl font-black tracking-tighter">Rp {designFee.toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-black text-white space-y-6 rounded-2xl">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Tier 02: Survey Lokasi</h3>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">
                      Langkah selanjutnya adalah survey lokasi oleh tim ahli kami untuk validasi teknis dan pengukuran presisi.
                    </p>
                    <div className="pt-4 border-t border-white/20">
                      <p className="uppercase-soft text-neutral-500 mb-1">Biaya Survey</p>
                      <p className="text-2xl font-black tracking-tighter">Rp 500.000</p>
                      <p className="text-[9px] text-neutral-500 italic mt-1">*Akan menjadi potongan harga saat deal kontrak.</p>
                    </div>
                    <Button className="w-full bg-accent text-white hover:bg-white hover:text-accent border-2 border-accent rounded-lg font-bold uppercase tracking-[0.2em] text-[10px] py-6" onClick={() => setStep(6)}>
                      Bayar & Jadwalkan Survey
                    </Button>
                  </div>

                  <Card className="border-2 border-black rounded-2xl overflow-hidden">
                    <CardHeader className="bg-neutral-50 border-b-2 border-black">
                      <CardTitle className="text-sm font-black uppercase tracking-widest">Share & Support</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <Button variant="outline" className="w-full justify-start gap-3 rounded-md border-black/10 h-10 text-[10px] uppercase font-bold">
                        <Instagram className="w-4 h-4" /> Follow @tukang.bangunan.jakarta
                      </Button>
                      <Button variant="outline" className="w-full justify-start gap-3 rounded-md border-black/10 h-10 text-[10px] uppercase font-bold">
                        <Star className="w-4 h-4" /> Rate Our AI Analysis
                      </Button>
                      <Button variant="outline" className="w-full justify-start gap-3 rounded-md border-black/10 h-10 text-[10px] uppercase font-bold">
                        <Download className="w-4 h-4" /> Download S&K (PDF)
                      </Button>
                      <div className="pt-2 border-t border-black/5">
                        <p className="text-[9px] text-neutral-400 uppercase-soft">Masa Aktif Harga: 14 Hari</p>
                        <p className="text-[9px] text-neutral-400 uppercase-soft">Berlaku s/d: {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID')}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="p-6 border-2 border-black/10 space-y-4 rounded-2xl">
                    <h3 className="text-sm font-bold uppercase tracking-widest">Tier 03: Deal Kontrak</h3>
                    <p className="text-[10px] text-neutral-500">
                      Setelah survey, kami akan menerbitkan RAB Final dan Kontrak Kerja untuk memulai pelaksanaan.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-8">
                <Button variant="ghost" className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 hover:text-black" onClick={() => {
                  setStep(1);
                  setAiEstimation(null);
                }}>
                  Hitung Ulang Estimasi
                </Button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="p-12 space-y-12 text-center">
              <div className="w-24 h-24 bg-black text-white flex items-center justify-center mx-auto transition-transform hover:rotate-12">
                <CreditCard className="w-12 h-12" />
              </div>
              <div className="space-y-4">
                <h2 className="text-5xl font-black uppercase tracking-tighter">Tier 02:<br/>Booking Survey</h2>
                <p className="uppercase-soft text-neutral-500">Langkah terakhir untuk validasi teknis & RAB Final.</p>
              </div>
              <div className="max-w-md mx-auto border-2 border-black p-8 space-y-8 rounded-2xl">
                <div className="flex justify-between items-center border-b border-black/10 pb-4">
                  <div className="text-left">
                    <span className="uppercase-soft text-neutral-500">Biaya Komitmen Survey</span>
                    <p className="text-[9px] font-bold text-accent uppercase tracking-widest mt-1">Akses Estimasi AI Lifetime</p>
                  </div>
                  <span className="text-2xl font-black tracking-tighter">Rp 399.000</span>
                </div>
                <div className="space-y-6 text-left">
                  <div className="bg-neutral-50 p-6 rounded-xl border border-black/5 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Instruksi Pembayaran:</p>
                    <div className="space-y-2">
                      <p className="text-xs font-bold">Silakan transfer Rp 399.000 ke:</p>
                      <div className="p-4 bg-white border-2 border-black rounded-lg space-y-1">
                        <p className="text-lg font-black tracking-tighter">BCA 667067XXXX</p>
                        <p className="text-[10px] font-bold uppercase">a/n TBJ Contractor</p>
                      </div>
                      <p className="text-[9px] text-neutral-500 italic">
                        *Biaya ini sebagai pengurangan nilai kontrak jika proyek berlanjut dan tidak dapat dikembalikan.
                      </p>
                      <p className="text-[9px] text-neutral-500 italic">
                        *Akses estimasi AI detail & validasi teknis terbuka selamanya (Lifetime).
                      </p>
                      <p className="text-[9px] text-neutral-500 italic">
                        *Setelah transfer, sistem akan memverifikasi otomatis dalam 1-5 menit.
                      </p>
                    </div>
                  </div>
                  <Button className="w-full btn-orange py-8 text-lg" onClick={async () => {
                    await updateProfile({ tier: "survey", lifetimeAccess: true });
                    toast.success("Pembayaran Berhasil! Tim kami akan segera menghubungi Anda untuk jadwal survey.");
                    setTimeout(() => window.location.reload(), 1500);
                  }}>
                    Konfirmasi & Bayar
                  </Button>
                </div>
              </div>
              <Button variant="ghost" className="text-[10px] font-mono uppercase tracking-widest text-neutral-400" onClick={() => setStep(5)}>
                Kembali ke Estimasi
              </Button>
            </div>
          )}

          {step === 10 && (
            <div className="p-8 md:p-12 space-y-12">
              <div className="flex justify-between items-center border-b-2 border-black pb-8">
                <div className="space-y-2">
                  <h2 className="text-4xl font-black uppercase tracking-tighter italic">TBJ Property & Permit Hub</h2>
                  <p className="uppercase-soft text-neutral-500">Solusi Terintegrasi: Sewa, Jual, Beli, & Legalitas Properti (IMB/PBG/SLF)</p>
                </div>
                <Button variant="outline" className="border-black rounded-xl uppercase-soft px-6" onClick={() => setStep(1)}>
                  &larr; Kembali
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "Beli Properti", icon: Home, color: "bg-blue-50 text-blue-600", type: "beli" },
                  { label: "Sewa Properti", icon: Key, color: "bg-green-50 text-green-600", type: "sewa" },
                  { label: "Titip Jual/Sewa", icon: ExternalLink, color: "bg-orange-50 text-orange-600", type: "jual" },
                  { label: "Legal & IMB/PBG", icon: Gavel, color: "bg-purple-50 text-purple-600", type: "legal" },
                ].map((svc, idx) => (
                  <div key={idx} className="p-8 border-2 border-black rounded-3xl text-center space-y-4 hover:bg-neutral-50 cursor-pointer transition-all group">
                    <div className={cn("w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", svc.color)}>
                      <svc.icon className="w-8 h-8" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest">{svc.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-8">
                <div className="flex justify-between items-end">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Featured Listings</h3>
                  <div className="flex gap-2">
                    <Badge className="bg-black text-white rounded-md cursor-pointer">Semua</Badge>
                    <Badge variant="outline" className="border-black rounded-md cursor-pointer">Rumah</Badge>
                    <Badge variant="outline" className="border-black rounded-md cursor-pointer">Ruko</Badge>
                    <Badge variant="outline" className="border-black rounded-md cursor-pointer">Tanah</Badge>
                  </div>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    { title: "Modern Villa Jagakarsa", loc: "Jagakarsa, Jakarta Selatan", price: 3500000000, type: "jual", img: "https://picsum.photos/seed/prop1/800/600", area: "150/200" },
                    { title: "Ruko Premium Kemang", loc: "Kemang, Jakarta Selatan", price: 150000000, type: "sewa", img: "https://picsum.photos/seed/prop2/800/600", area: "60/180" },
                    { title: "Minimalist House BSD", loc: "BSD City, Tangerang", price: 1800000000, type: "jual", img: "https://picsum.photos/seed/prop3/800/600", area: "90/120" },
                  ].map((p, i) => (
                    <div key={i} className="group cursor-pointer border-2 border-black rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-500">
                      <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
                        <img src={p.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                        <Badge className="absolute top-4 left-4 bg-black text-white px-4 py-1.5 rounded-full uppercase text-[10px] font-black tracking-widest">
                          {p.type === "jual" ? "Dijual" : "Disewakan"}
                        </Badge>
                        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md border border-black/10 text-[10px] font-black uppercase">
                          {p.area} m2
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black uppercase tracking-tighter group-hover:text-accent transition-colors">{p.title}</h3>
                          <p className="text-[10px] text-neutral-500 flex items-center gap-1 font-bold uppercase tracking-widest"><MapPin className="w-3 h-3 text-accent" /> {p.loc}</p>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-black/5">
                          <p className="text-xl font-black tracking-tighter">Rp {p.price.toLocaleString('id-ID')}{p.type === 'sewa' ? '/thn' : ''}</p>
                          <Button size="sm" className="rounded-xl btn-orange h-9 px-4 text-[10px] uppercase font-black">Detail</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-900 rounded-[2rem] p-12 text-white grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <Badge className="bg-accent text-white rounded-md uppercase-soft">Legal Service</Badge>
                  <h3 className="text-4xl font-black uppercase tracking-tighter leading-none">Urus Perizinan<br/>Tanpa Ribet.</h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Kami melayani pengurusan IMB/PBG, SLF, hingga sertifikasi tanah. Tim legal kami memastikan aset Anda aman dan sesuai regulasi.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase">
                      <CheckCircle2 className="w-4 h-4 text-accent" /> PBG / IMB
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase">
                      <CheckCircle2 className="w-4 h-4 text-accent" /> SLF
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase">
                      <CheckCircle2 className="w-4 h-4 text-accent" /> Sertifikat
                    </div>
                  </div>
                  <Button className="btn-orange h-14 px-8 rounded-xl text-xs font-black uppercase">Konsultasi Legal Gratis</Button>
                </div>
                <div className="relative aspect-square rounded-3xl overflow-hidden border-2 border-white/10">
                  <img src="https://picsum.photos/seed/legal/800/800" className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Gavel className="w-32 h-32 text-white/20" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const ClientDashboard = ({ user }: { user: any }) => {
  const { projects, loading } = useProjects(user.uid);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const { project, categories, items } = useProjectDetails(selectedProject || undefined);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  if (!selectedProject && projects.length > 0) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Proyek Aktif Anda</h1>
          <p className="text-neutral-500">Pantau progress pembangunan Anda secara real-time.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {projects.map(p => (
            <Card key={p.id} className="cursor-pointer hover:border-black transition-all" onClick={() => setSelectedProject(p.id)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{p.name}</CardTitle>
                    <CardDescription>{p.description}</CardDescription>
                  </div>
                  <Badge className={cn(
                    p.status === "active" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {p.status === "active" ? "Sedang Dikerjakan" : "Tahap Survey"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500">Total Anggaran:</span>
                  <span className="font-bold">Rp {p.totalBudget.toLocaleString('id-ID')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (selectedProject && project) {
    return (
      <div className="space-y-8">
        <Button variant="ghost" onClick={() => setSelectedProject(null)} className="gap-2">
          <ChevronRight className="w-4 h-4 rotate-180" /> Kembali ke Daftar Proyek
        </Button>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-2 border-black">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl font-black uppercase">Progress Pekerjaan</CardTitle>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileCheck className="w-4 h-4" /> Kontrak Digital
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {categories.map(cat => (
                  <div key={cat.id} className="space-y-4">
                    <h3 className="font-bold text-lg border-b pb-2">{cat.name}</h3>
                    <div className="space-y-3">
                      {items.filter(i => i.categoryId === cat.id).map(item => (
                        <div key={item.id} className="border rounded-lg overflow-hidden">
                          <div 
                            className="p-4 flex justify-between items-center cursor-pointer hover:bg-neutral-50"
                            onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-neutral-100 rounded flex items-center justify-center">
                                {item.progress === 100 ? <CheckCircle2 className="text-green-600 w-6 h-6" /> : <Clock className="text-blue-600 w-6 h-6" />}
                              </div>
                              <div>
                                <p className="font-bold">{item.name}</p>
                                <p className="text-xs text-neutral-500">{item.quantity} {item.unit}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs font-bold">{item.progress || 0}%</p>
                                <div className="w-24 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-black transition-all" style={{ width: `${item.progress || 0}%` }} />
                                </div>
                              </div>
                              {expandedItem === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                          {expandedItem === item.id && (
                            <div className="p-4 bg-neutral-50 border-t space-y-4 animate-in slide-in-from-top-2">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold uppercase text-neutral-400">Before</p>
                                  <div className="aspect-square bg-neutral-200 rounded-lg flex items-center justify-center overflow-hidden border border-neutral-300">
                                    <img src={`https://picsum.photos/seed/${item.id}-before/400/400`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold uppercase text-neutral-400">Progress</p>
                                  <div className="aspect-square bg-neutral-200 rounded-lg flex items-center justify-center overflow-hidden border border-neutral-300">
                                    <img src={`https://picsum.photos/seed/${item.id}-progress/400/400`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold uppercase text-neutral-400">After</p>
                                  <div className="aspect-square bg-neutral-200 rounded-lg flex items-center justify-center overflow-hidden border border-neutral-300">
                                    {item.progress === 100 ? (
                                      <img src={`https://picsum.photos/seed/${item.id}-after/400/400`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <ImageIcon className="text-neutral-400" />
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase text-neutral-400">Laporan Harian Terakhir</p>
                                <div className="p-3 bg-white rounded-xl border border-neutral-200 text-xs space-y-1">
                                  <p className="font-bold">Rabu, 08 April 2026</p>
                                  <p className="text-neutral-600">Pekerjaan {item.name} sedang dalam tahap penyelesaian. Material sudah tiba di lokasi.</p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" className="w-full text-xs gap-2">
                                <FileCheck className="w-4 h-4" /> Lihat Laporan Lengkap
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="border-2 border-black rounded-2xl overflow-hidden">
              <CardHeader className="bg-neutral-50 border-b-2 border-black">
                <CardTitle className="text-xl font-black uppercase tracking-tighter">Project Team</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4 p-4 border-2 border-black rounded-xl">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-black">
                    {project.pmId ? "PM" : "TBJ"}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Project Manager</p>
                    <p className="font-black text-sm uppercase tracking-tighter">Assigned PM</p>
                  </div>
                  <Button variant="ghost" size="icon" className="ml-auto h-10 w-10 rounded-full border border-black/10">
                    <Phone className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Construction Workers</p>
                  <div className="flex -space-x-3 overflow-hidden">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="inline-block h-10 w-10 rounded-full ring-2 ring-white bg-neutral-200 flex items-center justify-center border border-black/10">
                        <User className="w-5 h-5 text-neutral-400" />
                      </div>
                    ))}
                    <div className="inline-block h-10 w-10 rounded-full ring-2 ring-white bg-black text-white flex items-center justify-center text-[10px] font-black">
                      +8
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {user?.tier === "survey" && (
              <Card className="border-2 border-black bg-accent text-white rounded-2xl overflow-hidden shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)]">
                <CardHeader>
                  <CardTitle className="text-white text-xl font-black uppercase tracking-tighter">Contract Deal</CardTitle>
                  <CardDescription className="text-white/60 uppercase-soft">Siap untuk memulai pembangunan? Pilih paket kontrak Anda.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full bg-white text-black hover:bg-neutral-100 h-12 rounded-xl font-black uppercase tracking-widest text-[10px]">
                    Lihat Penawaran Kontrak (Gold Tier)
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="border-2 border-black rounded-2xl overflow-hidden">
              <CardHeader className="bg-neutral-50 border-b-2 border-black">
                <CardTitle className="text-xl font-black uppercase tracking-tighter">Support & Architect</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Button variant="outline" className="w-full border-2 border-black h-12 rounded-xl font-black uppercase tracking-widest text-[10px] flex justify-between group">
                  <span>Direct Chat to Architect</span>
                  <MessageSquare className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button variant="outline" className="w-full border-2 border-black h-12 rounded-xl font-black uppercase tracking-widest text-[10px] flex justify-between group">
                  <span>Priority Support (24/7)</span>
                  <ShieldCheck className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Timeline Proyek</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {[
                  { title: "Survey & Pengukuran", date: "01 Apr 2026", status: "completed" },
                  { title: "Tanda Tangan Kontrak", date: "05 Apr 2026", status: "completed" },
                  { title: "Pekerjaan Struktur", date: "10 Apr 2026", status: "ongoing" },
                  { title: "Finishing & Interior", date: "25 Apr 2026", status: "pending" },
                  { title: "Handover", date: "10 Mei 2026", status: "pending" },
                ].map((ev, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2",
                        ev.status === "completed" ? "bg-black border-black" : 
                        ev.status === "ongoing" ? "bg-white border-black animate-pulse" : "bg-white border-neutral-200"
                      )} />
                      {idx < 4 && <div className="w-0.5 h-full bg-neutral-200" />}
                    </div>
                    <div className="pb-6">
                      <p className="font-bold text-sm">{ev.title}</p>
                      <p className="text-xs text-neutral-500">{ev.date}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-black text-white">
              <CardHeader>
                <CardTitle className="text-white">Pekerjaan Tambah (VO)</CardTitle>
                <CardDescription className="text-neutral-400">Ajukan perubahan atau penambahan pekerjaan di sini.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-white text-black hover:bg-neutral-200">Ajukan Additional Work</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return <div className="text-center py-20">Belum ada proyek aktif.</div>;
};

const LoginPage = ({ onLogin, onGuestLogin }: { onLogin: () => void; onGuestLogin: () => void }) => (
  <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-16 py-20">
    <div className="text-center space-y-6">
      <div className="inline-block border-2 border-black px-4 py-1 text-[10px] font-mono uppercase tracking-[0.4em] mb-4">
        Construction OS v1.0
      </div>
      <h1 className="text-[10vw] font-black tracking-tighter text-black uppercase leading-[0.8] heading-edge">
        Tukang<br/>Bangunan<br/>Jakarta
      </h1>
      <p className="text-neutral-400 font-mono text-sm uppercase tracking-[0.2em] max-w-xl mx-auto">
        Satu-satunya platform konstruksi di Indonesia dengan integrasi AI Estimator & Real-time Management.
      </p>
    </div>

    <div className="flex flex-col items-center gap-8">
      <Button className="btn-sleek text-xl h-20 px-16 flex items-center gap-4" onClick={onLogin}>
        <Lock className="w-6 h-6" /> Login with Google
      </Button>
      <Button variant="ghost" className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black" onClick={onGuestLogin}>
        Or Enter as Guest (Demo Mode)
      </Button>
      <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-neutral-400">
        <span>Secure Access</span>
        <div className="w-1 h-1 bg-neutral-300 rounded-full" />
        <span>AI Verified</span>
        <div className="w-1 h-1 bg-neutral-300 rounded-full" />
        <span>Cloud Sync</span>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-black w-full max-w-5xl">
      {[
        { label: "Identity", val: "BOLD" },
        { label: "Service", val: "RELIABLE" },
        { label: "Platform", val: "MODERN" }
      ].map((item, idx) => (
        <div key={idx} className={cn(
          "p-10 text-center space-y-2",
          idx !== 2 && "md:border-r border-black"
        )}>
          <p className="font-black text-4xl tracking-tighter italic">{item.val}</p>
          <p className="text-[10px] text-neutral-400 uppercase tracking-[0.3em] font-mono">{item.label}</p>
        </div>
      ))}
    </div>
  </div>
);

const AdminMasterPage = () => {
  const { user } = useAuth();
  const { masterData, loading, updateMasterItem, addMasterItem, deleteMasterItem } = useMasterData(user?.role);
  const { properties, addProperty, updateProperty } = useProperties();
  const [activeTab, setActiveTab] = useState<"rab" | "property">("rab");
  const [searchQuery, setSearchQuery] = useState("");

  if (user?.role !== 'admin' && user?.role !== 'pm') {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Lock className="w-12 h-12 text-neutral-200" />
        <h2 className="text-2xl font-heading">Akses Terbatas</h2>
        <p className="text-neutral-500 font-light">Halaman ini hanya untuk Admin dan Project Manager.</p>
        <Link to="/">
          <Button variant="outline" className="btn-sleek">
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    );
  }

  const filteredMasterData = masterData.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="heading-sleek">Master Database</h1>
          <p className="text-neutral-500 font-light">Kelola database harga satuan dan properti.</p>
        </div>
        <div className="flex gap-2 p-1 bg-neutral-100 rounded-full">
          <Button 
            variant={activeTab === "rab" ? "default" : "ghost"} 
            size="sm" 
            className={cn("rounded-full text-[10px] uppercase tracking-widest px-6", activeTab === "rab" ? "bg-black text-white" : "")}
            onClick={() => setActiveTab("rab")}
          >
            Master RAB
          </Button>
          <Button 
            variant={activeTab === "property" ? "default" : "ghost"} 
            size="sm" 
            className={cn("rounded-full text-[10px] uppercase tracking-widest px-6", activeTab === "property" ? "bg-black text-white" : "")}
            onClick={() => setActiveTab("property")}
          >
            Master Properti
          </Button>
        </div>
      </div>

      {activeTab === "rab" ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input 
                placeholder="Cari item pekerjaan..." 
                className="input-sleek pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              className="btn-accent"
              onClick={() => addMasterItem({
                category: "Pekerjaan Baru",
                name: "Item Baru",
                unit: "m2",
                price: 0,
                status: "visible"
              })}
            >
              <Plus className="w-4 h-4 mr-2" /> Tambah Item
            </Button>
          </div>

          <div className="sleek-card overflow-hidden">
            <Table>
              <TableHeader className="bg-neutral-50/50">
                <TableRow className="border-b border-black/5">
                  <TableHead className="text-[10px] uppercase tracking-widest py-6">Kode</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest">Kategori</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest">Pekerjaan</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest">Satuan</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest text-right">Harga (Rp)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMasterData.map(item => (
                  <TableRow key={item.id} className="border-b border-black/5 last:border-0">
                    <TableCell className="font-mono text-[10px] text-neutral-400">{item.code || "N/A"}</TableCell>
                    <TableCell><Badge variant="outline" className="tag-sleek mb-0">{item.category}</Badge></TableCell>
                    <TableCell className="font-medium text-sm">
                      <Input 
                        defaultValue={item.name} 
                        className="border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                        onBlur={(e) => updateMasterItem(item.id, { name: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-light">{item.unit}</TableCell>
                    <TableCell className="text-right">
                      <Input 
                        type="number" 
                        className="w-32 ml-auto text-right font-mono text-xs border-none bg-transparent focus-visible:ring-0" 
                        defaultValue={item.price}
                        onBlur={(e) => updateMasterItem(item.id, { price: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-neutral-300 hover:text-red-500"
                        onClick={() => deleteMasterItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex justify-end">
            <Button className="btn-accent" onClick={() => addProperty({
              title: "Properti Baru",
              description: "Deskripsi properti...",
              price: 0,
              type: "jual",
              location: "Lokasi...",
              area: 0,
              photos: [],
              features: [],
              status: "available"
            })}>
              <Plus className="w-4 h-4 mr-2" /> Tambah Listing
            </Button>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {properties.map(p => (
              <div key={p.id} className="sleek-card p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest opacity-50">Judul Properti</Label>
                  <Input defaultValue={p.title} onBlur={(e) => updateProperty(p.id, { title: e.target.value })} className="input-sleek text-xl font-heading" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest opacity-50">Harga</Label>
                    <Input type="number" defaultValue={p.price} onBlur={(e) => updateProperty(p.id, { price: Number(e.target.value) })} className="input-sleek font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest opacity-50">Tipe</Label>
                    <select className="w-full h-10 border-b border-black/10 bg-transparent text-sm font-light focus:outline-none focus:border-accent" defaultValue={p.type} onChange={(e) => updateProperty(p.id, { type: e.target.value as any })}>
                      <option value="jual">Jual</option>
                      <option value="sewa">Sewa</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest opacity-50">URL Foto Utama</Label>
                  <Input placeholder="https://..." onBlur={(e) => updateProperty(p.id, { photos: [e.target.value] })} className="input-sleek" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 space-y-12">
      <div className="space-y-4">
        <h1 className="text-6xl font-black uppercase tracking-tighter heading-edge">Terms &<br/>Conditions</h1>
        <p className="text-neutral-400 font-mono text-xs uppercase tracking-widest">Last Updated: April 2026</p>
      </div>

      <div className="grid gap-8">
        {[
          {
            title: "1. Layanan Estimasi AI",
            content: "Estimasi yang dihasilkan oleh AI TBJ adalah gambaran awal berdasarkan data pasar dan input pengguna. Angka final akan ditentukan setelah survey lokasi dan verifikasi teknis oleh tim ahli kami."
          },
          {
            title: "2. Biaya Survey & Konsultasi",
            content: "Biaya survey lokasi adalah komitmen awal klien untuk mendapatkan analisa mendalam. Biaya ini akan dikreditkan (potongan harga) ke nilai kontrak jika proyek berlanjut ke tahap pelaksanaan."
          },
          {
            title: "3. Privasi & Data",
            content: "Kami menjamin kerahasiaan data pribadi Anda (WhatsApp, Email, Alamat). Data ini hanya digunakan untuk kepentingan komunikasi proyek dan tidak akan dibagikan ke pihak ketiga tanpa izin."
          },
          {
            title: "4. Hak Cipta Desain",
            content: "Semua produk gambar, render, dan dokumen teknis yang dihasilkan dalam layanan perencanaan adalah milik intelektual TBJ Contractor hingga pelunasan biaya desain dilakukan."
          }
        ].map((item, idx) => (
          <div key={idx} className="p-8 border border-black/10 space-y-4">
            <h3 className="font-bold uppercase tracking-widest text-sm">{item.title}</h3>
            <p className="text-neutral-600 text-sm leading-relaxed">{item.content}</p>
          </div>
        ))}
      </div>

      <div className="pt-12 border-t border-black">
        <Link to="/assistant">
          <Button className="btn-sleek">Back to Assistant</Button>
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading, login, loginAsGuest, logout, updateProfile } = useAuth();

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center gap-4">
    <Loader2 className="animate-spin w-12 h-12 text-accent" />
    <p className="text-xs font-black uppercase tracking-[0.3em] animate-pulse">Loading TBJ Ecosystem...</p>
  </div>;

  const isAdmin = user?.role === "admin" || user?.role === "pm";
  const isClient = user?.role === "user";

  return (
    <ErrorBoundary>
      <Router>
        <Layout user={user} onLogout={logout} onLogin={login}>
          <Routes>
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/gallery" element={<Gallery />} />
            {!user ? (
              <Route path="*" element={<LoginPage onLogin={login} onGuestLogin={loginAsGuest} />} />
            ) : (
              <>
                {/* Admin Routes */}
                {isAdmin && (
                  <>
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/pm" element={<PMDashboard />} />
                    <Route path="/projects" element={<ProjectsPage user={user} />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="/master" element={<AdminMasterPage />} />
                  </>
                )}

                {/* Client Routes */}
                <Route path="/profile" element={<Profile />} />
                <Route path="/assistant" element={<VirtualAssistant user={user} updateProfile={updateProfile} />} />
                <Route path="/rab" element={<RabPage user={user} />} />
                
                {/* Default Redirect */}
                <Route path="/" element={user?.role === "admin" ? <AdminPanel /> : user?.role === "pm" ? <PMDashboard /> : <Profile />} />
                <Route path="*" element={<div className="text-center py-20">Halaman tidak ditemukan</div>} />
              </>
            )}
          </Routes>
        </Layout>
        <Toaster />
      </Router>
    </ErrorBoundary>
  );
}


