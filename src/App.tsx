/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary.tsx";
import Layout from "@/components/Layout.tsx";
import { useState, useEffect, useMemo } from "react";
import { useAuth, useProjects, useProjectDetails, useProperties, useMasterData, useCMSConfig, useSystemConfig, useMediaAssets, useCampaigns, useSavedEstimates as useEstimations, incrementAIUsage, useLeads, useFinance, useProjectMaterialRequests } from "@/lib/hooks";
import { WORK_ITEMS_MASTER, QRIS_IMAGE, TBJ_LOGO } from "@/constants";
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
import { WorkItemMaster, Property, AIEstimateResponse, BudgetItem, TimelineEvent } from "@/types";
import { cn, getDriveImageUrl, calculateAdminPrice, calculateClientPrice, formatRupiah } from "@/lib/utils";
import { getAIEstimation } from "./services/aiEstimator";
import { generateAIPDF, generateRABPDF, generateInvoicePDF } from "@/lib/pdfUtils";
import { Plus, Trash2, ChevronRight, ChevronLeft, Loader2, Calculator, Search, CheckCircle2, Phone, Mail, Lock, CreditCard, Image as ImageIcon, Calendar, FileCheck, Clock, ExternalLink, ChevronDown, ChevronUp, Home, Wrench, PenTool, Building2, MapPin, Ruler, Layers, FileText, Gavel, Key, Camera, Upload, UserCheck, Map as MapIcon, Share2, Instagram, Download, Star, Settings, User, MessageSquare, ShieldCheck, Sparkles, Minus, Brain, Quote, Zap, LayoutDashboard, DollarSign, Edit2, ArrowRight, UserPlus, Fingerprint, History, Package } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import Gallery from "./components/Gallery";
import Profile from "./components/Profile";
import AdminPanel from "./components/AdminPanel";
import PMDashboard from "./components/PMDashboard";
import AIAgent from "./components/AIAgent";
import RabPage from "./pages/RabPage";
import ImportPage from "./pages/ImportPage";
import ProjectTimeline from "./components/ProjectTimeline";

function NotFoundRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    toast.error("Halaman tidak ditemukan. Mengalihkan ke Estimator AI...");
    navigate("/assistant");
  }, [navigate]);
  return null;
}

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
    <div className="h-64 w-full border border-neutral-200 relative overflow-hidden rounded-xl">
      <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} />
        <MapEvents />
      </MapContainer>
      <div className="absolute bottom-2 right-2 z-[1000] bg-white/80 backdrop-blur-sm p-2 text-[8px] font-mono uppercase border border-neutral-200">
        Click map to set point
      </div>
    </div>
  );
};

const Dashboard = ({ user }: { user: any }) => {
  const { projects, loading } = useProjects(user?.uid);
  const { config: sysConfig } = useSystemConfig();
  const navigate = useNavigate();

  const totalRawBudget = projects.reduce((sum, p) => sum + p.totalBudget, 0);
  const totalBudget = totalRawBudget;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  // Tier 1 Lock for Dashboard
  if (user?.tier === 'prospect' && !user?.assessmentBooked) {
    return (
      <div className="py-24 flex flex-col items-center text-center space-y-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8">
        <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center relative">
          <Lock className="w-10 h-10 text-accent" />
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-white border-2 border-accent rounded-full flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-accent animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          <Badge variant="outline" className="border-accent text-accent uppercase font-black px-4 py-1">Limited Access</Badge>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-black">Dashboard Terkunci</h2>
          <p className="text-neutral-500 uppercase-soft text-sm leading-relaxed">
            Selamat datang di TBJ Constech OS. Sebagai member Tier 1, dashboard operasional Anda akan aktif setelah Anda melakukan **Digital Assessment**. Tim kami akan melakukan survey teknis untuk memvalidasi budget dan teknis proyek Anda.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pt-4">
          <Card className="p-6 border-2 border-black/5 hover:border-accent transition-all bg-white group cursor-pointer" onClick={() => navigate("/assistant")}>
            <Calculator className="w-6 h-6 mb-4 text-accent group-hover:scale-110 transition-transform" />
            <h3 className="font-black text-xs uppercase mb-2">Pesan Assessment</h3>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-normal">Dapatkan validasi teknis dari tim ahli kami.</p>
          </Card>
          <Card className="p-6 border-2 border-black/5 hover:border-black transition-all bg-white group cursor-pointer" onClick={() => navigate("/gallery")}>
            <ImageIcon className="w-6 h-6 mb-4 text-black group-hover:scale-110 transition-transform" />
            <h3 className="font-black text-xs uppercase mb-2">Lihat Portfolio</h3>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-normal">Inspirasi proyek konstruksi yang telah kami kerjakan.</p>
          </Card>
        </div>
        <Button onClick={() => navigate("/assistant")} className="btn-accent h-16 w-full max-w-sm rounded-2xl uppercase font-black tracking-[0.2em] shadow-xl active:translate-y-1">
          Buka Kunci Dashboard Sekarang &rarr;
        </Button>
      </div>
    );
  }

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
            <CardTitle className="text-4xl font-bold">Rp {(totalBudget || 0).toLocaleString('id-ID')}</CardTitle>
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
                  <Badge variant="secondary">
                    Rp {(project.totalBudget || 0).toLocaleString('id-ID')}
                  </Badge>
                  <span className="text-xs text-neutral-400">{(project?.createdAt ? new Date(project.createdAt).toLocaleDateString('id-ID') : '-')}</span>
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
  const { projects, loading: projectsLoading, createProject, deleteProject } = useProjects(user?.uid, user?.role);
  const { estimates: aiEstimates, loading: estimatesLoading, deleteEstimate } = useEstimations(user?.uid);
  const { config } = useSystemConfig();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin' || user?.role === 'pm';
  const loading = projectsLoading || estimatesLoading;
  const isProspectNotBooked = user?.tier === 'prospect' && !user?.assessmentBooked;

  const handleCreate = async () => {
    if (!newName) return;
    if (!isAdmin) {
      toast.error("Hanya Admin/PM yang dapat membuat proyek resmi.");
      return;
    }
    const newId = await createProject(newName, newDesc);
    if (newId) {
      setIsCreateOpen(false);
      setNewName("");
      setNewDesc("");
      toast.success("Proyek berhasil dibuat!");
      navigate(`/projects/${newId}`);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  // Tier 1 Lock Check
  const showLockedView = user?.tier === 'prospect' && !user?.assessmentBooked;

  if (showLockedView) {
    return (
      <div className="py-20 flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto translate-y-10 animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-accent/5 rounded-full flex items-center justify-center relative border-2 border-accent/20">
          <Lock className="w-10 h-10 text-accent" />
          <div className="absolute -top-2 -right-2 bg-accent text-white p-1 rounded-full border-2 border-white">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black uppercase tracking-tighter">Status: Locked</h2>
          <p className="text-neutral-500 uppercase-soft text-sm max-w-md mx-auto leading-relaxed">
            Untuk memulai proyek resmi dan mengakses dashboard monitoring, Anda perlu melakukan **Digital Assessment** terlebih dahulu. 
            Silakan lihat riwayat estimasi AI Anda di bawah jika ada.
          </p>
        </div>
        <Button onClick={() => navigate("/assistant")} className="btn-accent h-16 px-12 rounded-2xl uppercase font-black text-xs tracking-widest shadow-xl">
          Book Digital Assessment Now &rarr;
        </Button>

        {aiEstimates.length > 0 && (
          <div className="w-full pt-20 space-y-8 text-left">
            <div className="flex items-center gap-3 border-b-2 border-black pb-4">
              <FileText className="w-6 h-6 text-accent" />
              <h3 className="text-xl font-black uppercase tracking-tighter">AI Drafts Archive</h3>
            </div>
            <div className="grid gap-6">
              {aiEstimates.map(est => (
                <Card key={est.id} className="p-6 border-2 border-black/5 hover:border-black transition-all group relative overflow-hidden" onClick={() => navigate(`/rab?load=${est.id}`)}>
                   <div className="flex justify-between items-start">
                     <div className="space-y-2">
                       <h4 className="font-black text-lg uppercase tracking-tight">{est.projectName || "Draft Estimasi AI"}</h4>
                       <div className="flex items-center gap-4 text-[10px] uppercase font-bold text-neutral-400">
                         <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(est.createdAt).toLocaleDateString()}</span>
                         <span className="flex items-center gap-1 font-mono text-accent">ID: {est.id.substring(0, 8)}</span>
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-full" onClick={(e) => {
                          e.stopPropagation();
                          deleteEstimate(est.id);
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" className="border-2 border-black h-10 px-6 rounded-xl uppercase font-black text-[10px]" onClick={() => navigate(`/rab?load=${est.id}`)}>
                          View Draft
                        </Button>
                     </div>
                   </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-16 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-neutral-200 pb-8">
        <div className="space-y-2">
          <Badge className="bg-black text-white uppercase text-[10px] px-4 py-1">Project Command Center</Badge>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-black leading-none">Official Projects</h1>
          <p className="text-neutral-500 uppercase-soft text-xs">Kelola seluruh proyek konstruksi aktif dan arsip estimasi.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button variant="outline" className="border border-neutral-200 h-12 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl uppercase font-black text-[10px] md:text-xs gap-2 hover:bg-neutral-50" onClick={() => window.open(`https://wa.me/6281213496672?text=Halo%20Admin%20TBJ,%20saya%20butuh%20bantuan%20terkait%20proyek%20saya.`, "_blank")}>
            <MessageSquare className="w-4 h-4" /> Priority Support
          </Button>
          {(isAdmin) && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger render={
                <Button className="bg-accent text-white hover:bg-accent/90 h-14 px-8 rounded-2xl uppercase font-black text-xs tracking-widest shadow-lg shadow-accent/20 gap-2">
                  <Plus className="w-5 h-5" /> Buat Proyek Resmi
                </Button>
              } />
              <DialogContent className="rounded-3xl border-none shadow-2xl p-8 max-w-lg">
                <DialogHeader className="space-y-4 mb-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-accent" />
                  </div>
                  <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-black leading-none">Register New Project</DialogTitle>
                  <DialogDescription className="uppercase-soft text-sm">Halaman ini hanya dapat diakses oleh Admin & Project Manager untuk inisiasi proyek klien.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Client Name / Project Title</Label>
                    <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Contoh: Proyek Interior - Bpk. Alex" className="h-14 border-2 border-black/5 focus:border-accent transition-colors text-lg font-black uppercase" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Brief Description</Label>
                    <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Tuliskan scope pekerjaan singkat..." className="border-2 border-black/5 focus:border-accent transition-colors text-sm font-medium uppercase-soft p-4 rounded-2xl min-h-[120px]" />
                  </div>
                </div>
                <DialogFooter className="mt-10 gap-3">
                  <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="uppercase font-black text-[10px] tracking-widest h-14 px-8">Batal</Button>
                  <Button onClick={handleCreate} className="bg-black text-white hover:bg-neutral-800 h-14 px-10 rounded-2xl uppercase font-black text-[10px] tracking-widest">Create Identity &rarr;</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-accent" />
            <h3 className="text-xl font-black uppercase tracking-tighter">Live Construction Projects</h3>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.map(project => (
              <Card 
                key={project.id} 
                className="group border-2 border-black/5 hover:border-black transition-all cursor-pointer overflow-hidden p-6 relative bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="flex flex-col h-full space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-neutral-50 flex items-center justify-center border-2 border-black/5 group-hover:border-accent transition-colors overflow-hidden">
                        {project.thumbnail ? (
                          <img src={getDriveImageUrl(project.thumbnail)} alt="Thumb" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-6 h-6 text-neutral-300" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-lg uppercase tracking-tight leading-none mb-2">{project.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn(
                            "text-[8px] uppercase-soft border-none font-black px-2 py-0.5",
                            project.status === 'active' ? "bg-green-100 text-green-600" :
                            project.status === 'completed' ? "bg-blue-100 text-blue-600" :
                            "bg-amber-100 text-amber-600"
                          )}>
                            {project.status}
                          </Badge>
                          <span className="text-[10px] font-mono text-neutral-400 font-bold">#{project.id.substring(0, 6)}</span>
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Hapus proyek ini secara permanen?")) {
                          deleteProject(project.id);
                        }
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-black/5">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      <span>Live Progress</span>
                      <span className="text-black">{(project.progress || 0).toFixed(0)}%</span>
                    </div>
                    <Progress value={project.progress || 0} className="h-2 bg-neutral-100" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-neutral-50 rounded-xl space-y-1">
                      <p className="text-[8px] font-black uppercase text-neutral-400">Budget Managed</p>
                      <p className="text-xs font-black text-black">Rp {(project.totalBudget || 0).toLocaleString('id-ID')}</p>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl space-y-1">
                      <p className="text-[8px] font-black uppercase text-neutral-400">Created Date</p>
                      <p className="text-[10px] font-bold text-black uppercase">{new Date(project.createdAt).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-accent" />
                      <span className="text-[9px] font-black uppercase text-neutral-500 truncate max-w-[120px]">{project.location || "Jakarta"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-neutral-300" />
                      <span className="text-[9px] font-bold text-neutral-400 uppercase">Last: {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString('id-ID') : new Date(project.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 flex items-center gap-2">
                    <History className="w-3 h-3 text-accent" />
                    <p className="text-[9px] font-bold uppercase-soft text-accent truncate">
                      Pekerjaan inisiasi dimulai pada {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
            {projects.length === 0 && (
              <div className="col-span-full py-12 md:py-20 border border-dashed border-neutral-200 rounded-3xl md:rounded-[40px] flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
                  <Layers className="w-8 h-8 text-neutral-300" />
                </div>
                <div className="px-6">
                  <h4 className="text-xl font-black uppercase tracking-tighter">No Active Projects</h4>
                  <p className="text-[10px] md:text-[11px] uppercase-soft text-neutral-400 max-w-xs mx-auto">Hubungi PM untuk mendaftarkan proyek konstruksi Anda secara resmi.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 pt-12 border-t-2 border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-accent" />
              <h3 className="text-xl font-black uppercase tracking-tighter text-neutral-400">AI Estimation Drafts</h3>
            </div>
            <Badge variant="outline" className="font-mono text-xs">{aiEstimates.length} Saved</Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {aiEstimates.map(est => (
              <Card key={est.id} className="p-6 border-2 border-black/5 hover:border-accent hover:shadow-2xl transition-all group/est bg-white/50 hover:bg-white overflow-hidden" onClick={() => navigate(`/rab?load=${est.id}`)}>
                <div className="flex flex-col justify-between h-full space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center">
                        <Calculator className="w-5 h-5 text-accent" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-200 hover:text-red-500 rounded-full opacity-0 group-hover/est:opacity-100 transition-opacity" onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Hapus draf estimasi ini?")) {
                          deleteEstimate(est.id);
                        }
                      }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <h4 className="font-black text-sm uppercase tracking-tight truncate">{est.projectName || "Draft RAB"}</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-lg font-black text-black">Rp {(est.totalEstimatedCost || 0).toLocaleString('id-ID')}</p>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-neutral-400 uppercase">
                       <Clock className="w-3 h-3" /> {new Date(est.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button variant="ghost" className="w-full text-[10px] font-black uppercase-soft border border-transparent group-hover/est:border-accent/10 group-hover/est:bg-accent/5">
                    Continue Refining &rarr; 
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { config: sysConfig } = useSystemConfig();
  const { masterData } = useMasterData(user?.role);
  const { project, categories, items, loading, addCategory, addItem, updateItem, deleteCategory, deleteItem, updateProjectStatus, updateItemProgress, updateTimelineEvent, addTimelineEvent, updateProjectMetadata } = useProjectDetails(id);
  const pdfLogo = TBJ_LOGO;

  if (user?.tier === 'prospect' && !user?.assessmentBooked) {
    return (
      <div className="py-24 flex flex-col items-center text-center space-y-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8">
        <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center relative">
          <Lock className="w-10 h-10 text-accent" />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black uppercase tracking-tighter">Access Denied</h2>
          <p className="text-neutral-500 uppercase font-bold text-xs tracking-widest leading-loose max-w-sm mx-auto">
            Halaman ini dikunci. Silakan lakukan pembayaran <span className="text-black underline font-black">Digital Assessment & Survey</span> seharga <span className="bg-accent text-white px-2 py-0.5 rounded">Rp399.000</span> untuk mengaktifkan dashboard proyek Anda.
          </p>
        </div>
        <Button onClick={() => navigate("/assistant")} className="btn-accent h-16 px-12 rounded-2xl gap-3 font-black uppercase text-xs tracking-widest shadow-2xl shadow-accent/30 animate-bounce">
          Book Digital Assessment Sekarang &rarr;
        </Button>
      </div>
    );
  }
  
  const { assets: projectMedia, addAsset: addMedia, deleteAsset: deleteMedia } = useMediaAssets(undefined, id);
  const { requests: materialRequests, addRequest: addMaterialRequest } = useProjectMaterialRequests(id);
  const { transactions } = useFinance(id);
  
  const projectTransactions = useMemo(() => {
    return transactions.filter(t => t.projectId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, id]);

  const totalSpent = useMemo(() => {
    return projectTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  }, [projectTransactions]);
  
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newMediaName, setNewMediaName] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemSpecs, setNewItemSpecs] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState("m2");
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemPriority, setNewItemPriority] = useState<BudgetItem["priority"]>("Medium");
  const [newItemDueDate, setNewItemDueDate] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  
  // Editing individual item specs
  const [editingItemSpecs, setEditingItemSpecs] = useState<{id: string, name: string, specs: string} | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WorkItemMaster[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const dataToUse = masterData && masterData.length > 0 ? masterData : WORK_ITEMS_MASTER;
      const filtered = dataToUse.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setSearchResults(filtered.slice(0, 50));
      setIsSearching(true);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, masterData]);

  const selectMasterItem = (item: WorkItemMaster) => {
    setNewItemName(item.name);
    setNewItemUnit(item.unit);
    setNewItemPrice(user?.role === 'admin' || user?.role === 'pm' 
      ? calculateAdminPrice(item.price, sysConfig?.globalMarkup) 
      : calculateClientPrice(item.price, sysConfig?.globalMarkup));
    setNewItemSpecs(item.technicalSpecs || "");
    setSearchQuery("");
    setIsSearching(false);
  };

  const totalWeight = items.reduce((sum, i) => sum + (i.totalPrice / (project.totalBudget || 1)) * 100, 0);
  const [activeTab, setActiveTab] = useState<"overview" | "rab" | "timeline" | "photos" | "finance" | "procurement">("overview");
  const [showRABActions, setShowRABActions] = useState(false);

  const currentProgress = items.reduce((sum, i) => sum + ((i.progress || 0) * (i.totalPrice / (project.totalBudget || 1))), 0);

  const canEdit = user?.role === "admin" || user?.role === "pm" || 
    (user?.uid === project?.pmId);

  const canEditRAB = user?.role === "admin" || user?.role === "pm";

  if (loading || !project) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  // Lock for Tier 1
  if (user?.tier === 'prospect' && !user?.assessmentBooked && project.ownerId === user?.uid) {
    return (
      <div className="py-20 flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">
        <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center">
          <Lock className="w-12 h-12 text-accent" />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black uppercase tracking-tighter">Dashboard Locked</h2>
          <p className="text-neutral-500 uppercase-soft text-sm max-w-xl mx-auto leading-relaxed">
            Estimasi Anda telah tersimpan di sistem. Untuk melihat detail RAB Teknik, 
            memantau progress harian, dan fitur monitoring proyek, silakan booking 
            Digital Assessment / Survey lokasi terlebih dahulu.
          </p>
          <div className="pt-6">
            <Button onClick={() => navigate("/assistant")} className="btn-accent h-14 px-12 uppercase font-black text-xs shadow-xl shadow-accent/20">
              Book Digital Assessment Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1 w-full overflow-hidden">
          <div className="flex items-center gap-3">
            <Link to="/projects">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-black/5 shrink-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-xl md:text-4xl font-black tracking-tighter uppercase leading-tight truncate">{project.name}</h1>
          </div>
          <p className="text-neutral-500 uppercase font-bold text-[8px] md:text-[10px] tracking-widest ml-11 line-clamp-1">{project.description}</p>
        </div>
        
        <div className="md:hidden w-full">
          <select 
            className="w-full h-12 bg-white border-2 border-black rounded-xl px-4 font-black uppercase text-xs tracking-widest outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
          >
            <option value="overview">Overview</option>
            <option value="rab">RAB Teknik</option>
            <option value="finance">Finance</option>
            <option value="procurement">Material</option>
            <option value="timeline">Timeline</option>
            <option value="photos">Media</option>
          </select>
        </div>
        
        <div className="hidden md:flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-4 md:pb-0 scrollbar-hide px-2 -mx-2">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "rab", label: "RAB Teknik", icon: FileText },
            { id: "finance", label: "Finance", icon: DollarSign },
            { id: "procurement", label: "Material", icon: Package },
            { id: "timeline", label: "Timeline", icon: Clock },
            { id: "photos", label: "Media", icon: Camera },
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              className={cn(
                "h-10 px-4 md:px-6 rounded-xl uppercase font-black text-[10px] gap-2 transition-all shrink-0",
                activeTab === tab.id ? "bg-black text-accent shadow-[4px_4px_0px_0px_#FF6B00]" : "border-2 border-black/5 hover:border-black"
              )}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="md:col-span-2 space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               <Card className="border-2 border-black rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 bg-accent text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="uppercase font-black text-[9px] opacity-80">RAB Total</p>
                  <p className="text-xl md:text-2xl font-black tracking-tighter">
                    {formatRupiah(user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(project.totalBudget, sysConfig?.globalMarkup) : calculateClientPrice(project.totalBudget, sysConfig?.globalMarkup))}
                  </p>
               </Card>
               <Card className="border-2 border-black rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 bg-black text-white shadow-[4px_4px_0px_0px_#FF6B00]">
                  <p className="uppercase font-black text-[9px] opacity-80">Progress Lapangan</p>
                  <div className="flex flex-col gap-2 pt-2">
                    <p className="text-xl md:text-2xl font-black tracking-tighter">{currentProgress.toFixed(1)}%</p>
                    <Progress value={currentProgress} className="h-1.5 bg-white/20" />
                  </div>
               </Card>
               <Card className="border-2 border-black rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 bg-white sm:col-span-2 lg:col-span-1 shadow-[4px_4px_0px_1px_rgba(0,0,0,1)]">
                  <p className="uppercase font-black text-[10px] text-neutral-400">Project Status</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="font-black uppercase text-sm tracking-tight">{project.status}</p>
                  </div>
               </Card>
            </div>

            <Card className="border-2 border-black rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="bg-neutral-50 border-b-2 border-black flex flex-col sm:flex-row items-center justify-between gap-4 p-4 md:p-6">
                <div className="text-center sm:text-left">
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tighter">Project Details & Specs</CardTitle>
                  <CardDescription className="uppercase-soft text-[9px] md:text-xs">Informasi mendalam dan data teknis pengerjaan</CardDescription>
                </div>
                {canEditRAB && (
                  <Dialog>
                    <DialogTrigger render={<Button size="sm" variant="outline" className="h-9 px-4 border-2 border-black rounded-xl uppercase font-black text-[8px] w-full sm:w-auto"><Edit2 className="w-3 h-3 mr-2" /> Edit Metadata</Button>} />
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-tighter">Edit Project Metadata</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label className="uppercase-soft text-[10px]">Project Name</Label>
                          <Input id="edit-name" defaultValue={project.name} />
                        </div>
                        <div className="space-y-2">
                          <Label className="uppercase-soft text-[10px]">Client Name</Label>
                          <Input id="edit-client" defaultValue={project.clientName} />
                        </div>
                        <div className="space-y-2">
                          <Label className="uppercase-soft text-[10px]">Location</Label>
                          <Input id="edit-location" defaultValue={project.location} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="uppercase-soft text-[10px]">Start Date</Label>
                            <Input id="edit-start" type="date" defaultValue={project.startDate} />
                          </div>
                          <div className="space-y-2">
                            <Label className="uppercase-soft text-[10px]">End Date</Label>
                            <Input id="edit-end" type="date" defaultValue={project.endDate} />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button className="btn-accent w-full" onClick={async () => {
                          const name = (document.getElementById('edit-name') as HTMLInputElement).value;
                          const clientName = (document.getElementById('edit-client') as HTMLInputElement).value;
                          const location = (document.getElementById('edit-location') as HTMLInputElement).value;
                          const startDate = (document.getElementById('edit-start') as HTMLInputElement).value;
                          const endDate = (document.getElementById('edit-end') as HTMLInputElement).value;
                          
                          await updateProjectMetadata({ name, clientName, location, startDate, endDate });
                          toast.success("Project metadata updated");
                        }}>Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent className="p-8 grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400">Lokasi Konstruksi</label>
                    <p className="font-bold flex items-center gap-2"><MapPin className="w-4 h-4 text-accent" /> {project.location || project.description}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400">Total Luas Area</label>
                    <p className="font-bold flex items-center gap-2"><Layers className="w-4 h-4 text-accent" /> {project.area || 0} m2</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-400">Start Date</label>
                      <p className="font-bold flex items-center gap-2"><Calendar className="w-4 h-4 text-accent" /> {project.startDate ? new Date(project.startDate).toLocaleDateString('id-ID') : '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-neutral-400">End Date</label>
                      <p className="font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /> {project.endDate ? new Date(project.endDate).toLocaleDateString('id-ID') : '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-400">Account Bank Assessment (QRIS)</label>
                    <div className="p-4 bg-orange-50 border-2 border-accent/20 rounded-2xl">
                      <p className="text-xs font-black uppercase tracking-tighter text-accent">BRI 479201031488535</p>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase mt-1">a.n TBJ Architect & Constech</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase text-neutral-400">Admin Controls</label>
                     <div className="flex flex-wrap gap-2">
                       <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-9 px-4 border-2 border-black uppercase font-black text-[8px] rounded-xl hover:bg-black hover:text-white transition-all"
                        onClick={() => {
                          const summary = `[TBJ PROJECT SUMMARY]\n\nProyek: ${project.name}\nStatus: ${project.status.toUpperCase()}\nTotal RAB: Rp ${(project.totalBudget || 0).toLocaleString('id-ID')}\nProgress: ${currentProgress.toFixed(1)}%\n\nLaporan terstruktur oleh TBJ Constech Hub.`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, "_blank");
                        }}
                       >
                         <Share2 className="w-3 h-3 mr-2" /> Share Summary
                       </Button>
                       {(user?.role === 'admin' || user?.role === 'pm') && (
                         <select 
                           className="h-9 px-4 border-2 border-black uppercase font-black text-[8px] rounded-xl bg-white"
                           value={project.status}
                           onChange={(e) => updateProjectStatus(e.target.value as any)}
                         >
                           <option value="survey">Set to Survey</option>
                           <option value="active">Set to Active</option>
                           <option value="completed">Set to Completed</option>
                         </select>
                       )}
                     </div>
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="border-2 border-black rounded-3xl p-6 bg-neutral-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Project Progress</h3>
              <div className="space-y-6">
                {categories.map(c => {
                  const catItems = items.filter(i => i.categoryId === c.id);
                  const catProg = catItems.reduce((s, it) => s + (it.progress || 0) * (it.totalPrice / (project.totalBudget || 1)), 0);
                  const catWeight = catItems.reduce((s, it) => s + (it.totalPrice / (project.totalBudget || 1)), 0) * 100;

                  return (
                    <div key={c.id} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                        <span>{c.name}</span>
                        <span>{catProg.toFixed(1)}% / {catWeight.toFixed(0)}%</span>
                      </div>
                      <Progress value={(catProg / catWeight) * 100} className="h-1 bg-neutral-200" />
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Quick Links</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-20 flex-col border-2 border-black rounded-2xl gap-2 hover:bg-neutral-50" onClick={() => setActiveTab("rab")}>
                  <FileText className="w-5 h-5 text-accent" />
                  <span className="text-[8px] uppercase font-black tracking-widest">RAB Teknik</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col border-2 border-black rounded-2xl gap-2 hover:bg-neutral-50" onClick={() => setActiveTab("timeline")}>
                  <Clock className="w-5 h-5 text-accent" />
                  <span className="text-[8px] uppercase font-black tracking-widest">Timeline</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col border-2 border-black rounded-2xl gap-2 hover:bg-neutral-50" onClick={() => setActiveTab("finance")}>
                  <DollarSign className="w-5 h-5 text-accent" />
                  <span className="text-[8px] uppercase font-black tracking-widest">Finance</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col border-2 border-black rounded-2xl gap-2 hover:bg-neutral-50" onClick={() => setActiveTab("photos")}>
                  <Camera className="w-5 h-5 text-accent" />
                  <span className="text-[8px] uppercase font-black tracking-widest">Photos</span>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <Card className="border-2 border-black rounded-2xl p-6 bg-neutral-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-8">
             <div>
               <h3 className="text-2xl font-black uppercase tracking-tighter">Project Timeline</h3>
               <p className="uppercase-soft text-neutral-400">Tracking Fasa Pembangunan & Milestone</p>
             </div>
             {(user?.role === 'admin' || user?.role === 'pm') && (
               <Dialog>
                 <DialogTrigger render={<Button className="btn-accent px-6 h-10 rounded-xl gap-2 font-black uppercase text-[10px]"><Plus className="w-4 h-4" /> Add Event</Button>} />
                 <DialogContent className="sm:max-w-md">
                   <DialogHeader>
                     <DialogTitle className="font-black uppercase tracking-tighter">Add Timeline Event</DialogTitle>
                   </DialogHeader>
                   <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="uppercase-soft text-[10px]">Event Title</Label>
                        <Input id="event-title" placeholder="e.g. Mobilisasi Alat" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="uppercase-soft text-[10px]">Start Date</Label>
                          <Input id="event-start" type="date" />
                        </div>
                        <div className="space-y-2">
                          <Label className="uppercase-soft text-[10px]">Due Date (Est.)</Label>
                          <Input id="event-due" type="date" />
                        </div>
                      </div>
                   </div>
                   <DialogFooter>
                     <Button className="btn-sleek w-full" onClick={async () => {
                       const title = (document.getElementById('event-title') as HTMLInputElement).value;
                       const start = (document.getElementById('event-start') as HTMLInputElement).value;
                       const due = (document.getElementById('event-due') as HTMLInputElement).value;
                       if (title && start) {
                         await addTimelineEvent({
                           title,
                           date: start,
                           dueDate: due,
                           status: 'pending'
                         });
                         toast.success("Timeline event added");
                       }
                     }}>Save Event</Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>
             )}
          </div>
          <div className="overflow-y-auto no-scrollbar">
            <ProjectTimeline 
              events={project.timeline || []} 
              onUpdateEvent={updateTimelineEvent} 
              isAdmin={user?.role === 'admin' || user?.role === 'pm'} 
            />
          </div>
        </Card>
      )}

      {activeTab === "procurement" && (
        <Card className="border-2 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white animate-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="bg-neutral-50 border-b-2 border-black flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tighter">Material & Supply Requests</CardTitle>
              <CardDescription className="uppercase-soft">Permintaan material lapangan untuk logistik</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger render={<Button className="btn-accent px-6 h-10 rounded-xl gap-2 font-black uppercase text-[10px]"><Plus className="w-4 h-4" /> Request Material</Button>} />
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-black uppercase tracking-tighter">New Material Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="uppercase-soft text-[10px]">Material Name</Label>
                    <Input id="mat-name" placeholder="e.g. Semen Tiga Roda" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="uppercase-soft text-[10px]">Quantity</Label>
                      <Input id="mat-qty" type="number" defaultValue="1" />
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase-soft text-[10px]">Unit</Label>
                      <Input id="mat-unit" placeholder="e.g. Sak" defaultValue="Sak" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase-soft text-[10px]">Notes / Specification</Label>
                    <Textarea id="mat-notes" placeholder="e.g. Minimal isi 40kg" />
                  </div>
                </div>
                <DialogFooter>
                  <Button className="btn-sleek w-full" onClick={async () => {
                    const name = (document.getElementById('mat-name') as HTMLInputElement).value;
                    const qty = Number((document.getElementById('mat-qty') as HTMLInputElement).value);
                    const unit = (document.getElementById('mat-unit') as HTMLInputElement).value;
                    const notes = (document.getElementById('mat-notes') as HTMLTextAreaElement).value;

                    if (name && qty > 0) {
                      await addMaterialRequest({
                        projectId: id,
                        projectName: project.name,
                        requesterId: user?.uid || "guest",
                        requesterName: user?.displayName || user?.email || 'Field Staff',
                        itemName: name,
                        quantity: qty,
                        unit,
                        note: notes,
                        status: 'pending'
                      } as any);
                      toast.success("Material request submitted!");
                    }
                  }}>Submit Request</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-neutral-50/50 hover:bg-neutral-50/50 border-b-2 border-black">
                    <TableHead className="uppercase font-black text-[10px] pl-8">Material</TableHead>
                    <TableHead className="uppercase font-black text-[10px] text-center">Qty</TableHead>
                    <TableHead className="uppercase font-black text-[10px]">Requested By</TableHead>
                    <TableHead className="uppercase font-black text-[10px]">Status</TableHead>
                    <TableHead className="uppercase font-black text-[10px] text-right pr-8">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-neutral-400 font-bold uppercase text-[10px]">No pending requests</TableCell>
                    </TableRow>
                  ) : (
                    materialRequests.map(req => (
                      <TableRow key={req.id} className="border-b border-black/5 last:border-0">
                        <TableCell className="pl-8 py-4">
                          <p className="font-black text-xs uppercase">{req.itemName}</p>
                          {req.note && <p className="text-[10px] text-neutral-400 font-medium italic">{req.note}</p>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="border-black font-black uppercase text-[10px]">{req.quantity} {req.unit}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-neutral-500 uppercase">{req.requesterName}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "uppercase font-black text-[8px]",
                            req.status === 'approved' ? "bg-green-500" : 
                            req.status === 'rejected' ? "bg-red-500" : "bg-orange-500"
                          )}>{req.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8 font-mono text-[10px] text-neutral-400">
                          {new Date(req.createdAt).toLocaleDateString('id-ID')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "finance" && (
        <div className="grid md:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
           <div className="md:col-span-2 space-y-6">
              <Card className="border-2 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <CardHeader className="bg-neutral-50 border-b-2 border-black flex justify-between items-center">
                   <CardTitle className="text-xl font-black uppercase tracking-tighter">Transaction LEDGER</CardTitle>
                   <Badge variant="outline" className="border-black font-black uppercase text-[8px] bg-neutral-100">Project Fin-001</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-neutral-50/50 hover:bg-neutral-50/50 border-b-2 border-black">
                        <TableHead className="uppercase font-black text-[10px] py-4 pl-8">Date</TableHead>
                        <TableHead className="uppercase font-black text-[10px]">Description</TableHead>
                        <TableHead className="uppercase font-black text-[10px]">Method</TableHead>
                        <TableHead className="uppercase font-black text-[10px] text-right pr-8">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectTransactions.length > 0 ? (
                        projectTransactions.map((t) => (
                          <TableRow key={t.id} className="border-b border-black/5">
                            <TableCell className="py-6 pl-8 font-mono text-[10px] text-neutral-400">
                              {new Date(t.date).toLocaleDateString('id-ID')}
                            </TableCell>
                            <TableCell>
                              <p className={cn(
                                "font-bold text-xs uppercase tracking-tight leading-tight",
                                t.type === 'income' ? "text-green-600" : "text-red-500"
                              )}>
                                {t.description}
                              </p>
                              <p className="text-[9px] font-bold text-neutral-400 lowercase">{t.category}</p>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-[8px] uppercase">{t.method || 'Transfer'}</Badge></TableCell>
                            <TableCell className={cn(
                              "text-right pr-8 font-black text-xs",
                              t.type === 'income' ? "text-green-600" : "text-red-500"
                            )}>
                              {t.type === 'income' ? "+" : "-"} {formatRupiah(t.amount)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-20">
                            <div className="space-y-3">
                              <DollarSign className="w-8 h-8 mx-auto text-neutral-200" />
                              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Belum ada riwayat transaksi finansial.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-2 border-black rounded-3xl p-8 bg-black text-white shadow-[8px_8px_0px_0px_#FF6B00] group relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-accent opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl transition-opacity group-hover:opacity-10" />
                 <div className="flex justify-between items-start mb-10 relative z-10">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black uppercase tracking-tighter italic">Total Escrow Wallet</h3>
                      <p className="text-white/40 uppercase-soft text-[10px] max-w-[300px]">Dana aman tertahan di TBJ Wallet (Akan direlease per Milestone pembangunan)</p>
                    </div>
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-sm">
                      <ShieldCheck className="w-8 h-8 text-accent" />
                    </div>
                 </div>
                 <div className="space-y-2 relative z-10">
                    <p className="text-6xl font-black tracking-tighter text-accent uppercase leading-[0.8]">Rp {(project.escrowBalance || 0).toLocaleString('id-ID')}</p>
                    <div className="flex items-center gap-2 pt-2">
                       <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                       <span className="text-[9px] font-black uppercase text-white/60 tracking-widest leading-none">Safe & Insured via TBJ Connect</span>
                    </div>
                 </div>
              </Card>
           </div>

           <div className="space-y-6">
              <Card className="border-2 border-black rounded-3xl p-8 bg-accent text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                 <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-black/5 rounded-full" />
                 <h4 className="font-black uppercase tracking-tighter text-xl mb-6 relative z-10">Structure Payment</h4>
                 <div className="space-y-4 relative z-10">
                    {[
                      { label: 'Booking Fee', pct: 0, status: 'released' },
                      { label: 'Termin I (DP)', pct: 30, status: 'released' },
                      { label: 'Termin II (Mid)', pct: 40, status: 'locked' },
                      { label: 'Termin III (Final)', pct: 30, status: 'locked' },
                    ].map((m, idx) => (
                      <div key={idx} className={cn(
                        "flex justify-between items-center p-4 rounded-2xl border-2 transition-all",
                        m.status === 'released' ? "bg-white/10 border-white/20" : "bg-black/10 border-black/5 opacity-50"
                      )}>
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-tighter">{m.label} ({m.pct}%)</p>
                            <p className="text-sm font-black italic">Rp {(project.totalBudget * (m.pct/100) || 0).toLocaleString('id-ID')}</p>
                         </div>
                         {m.status === 'released' ? (
                           <CheckCircle2 className="w-5 h-5 text-white" />
                         ) : (
                           <Lock className="w-5 h-5 text-black/40" />
                         )}
                      </div>
                    ))}
                 </div>
                 <div className="mt-8 pt-8 border-t border-white/20">
                    <Button className="w-full h-14 bg-black text-white hover:bg-neutral-900 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2">
                      <FileText className="w-4 h-4" /> Invoice & Receipt Portal
                    </Button>
                 </div>
              </Card>
              
              <Card className="border-2 border-black rounded-3xl p-6 bg-neutral-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                 <h5 className="font-black uppercase text-[10px] text-neutral-400 tracking-[0.2em] mb-4">Financial Support</h5>
                 <p className="text-[11px] font-bold text-neutral-600 leading-relaxed mb-6">Butuh pendanaan tambahan (Kredit Konstruksi) atau pertanyaan seputar termin?</p>
                 <Button variant="outline" className="w-full border-2 border-black h-12 rounded-xl font-black uppercase text-[9px] gap-2">
                    <MessageSquare className="w-3 h-3" /> Chat Finance Team
                 </Button>
              </Card>
           </div>
        </div>
      )}


      {activeTab === "photos" && (
        <Card className="border-2 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white animate-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="bg-neutral-50 border-b-2 border-black flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black uppercase tracking-tighter">Progress Photos</CardTitle>
            <CardDescription className="uppercase-soft">Dokumentasi progres pembangunan proyek</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger render={
              <Button size="sm" className="btn-sleek h-9 px-4 rounded-xl">
                <Upload className="w-3 h-3 mr-2" /> Upload Photo
              </Button>
            } />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-black uppercase tracking-tighter">Upload Progress Photo</DialogTitle>
                <DialogDescription>Tambahkan foto terbaru terkait progres proyek ini.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="uppercase-soft text-[10px]">Photo Name / Title</Label>
                  <Input 
                    placeholder="e.g. Pengecoran Plat Lantai 2" 
                    value={newMediaName}
                    onChange={e => setNewMediaName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="uppercase-soft text-[10px]">Direct Image URL</Label>
                  <Input 
                    placeholder="https://example.com/photo.jpg" 
                    value={newMediaUrl}
                    onChange={e => setNewMediaUrl(e.target.value)}
                  />
                  <p className="text-[9px] text-neutral-400 italic">Gunakan link langsung ke gambar (Direct URL).</p>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  className="btn-sleek w-full" 
                  onClick={async () => {
                    if (newMediaUrl && newMediaName) {
                      await addMedia({
                        name: newMediaName,
                        url: newMediaUrl,
                        category: 'projects',
                        projectId: id,
                        description: `Auto-uploaded for project: ${project?.name}`,
                        createdAt: new Date().toISOString(),
                        uploadedBy: user?.uid || 'system'
                      });
                      setNewMediaUrl("");
                      setNewMediaName("");
                      toast.success("Photo uploaded successfully");
                    }
                  }}
                >
                  Confirm Upload
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6">
          {projectMedia.length === 0 ? (
            <div className="py-12 text-center bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
              <Camera className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="text-[10px] font-black uppercase text-neutral-400">No progress photos yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {projectMedia.map(asset => (
                <div key={asset.id} className="group relative aspect-square border-2 border-black rounded-xl overflow-hidden bg-neutral-100">
                  <img 
                    src={getDriveImageUrl(asset.url)} 
                    alt={asset.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                    <p className="text-[9px] font-black text-white uppercase mb-2">{asset.name}</p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/20 text-white hover:bg-white hover:text-black rounded-full" onClick={() => window.open(asset.url, '_blank')}>
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-full" onClick={() => { if(confirm('Hapus foto ini?')) deleteMedia(asset.id); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {activeTab === "rab" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-neutral-50 p-4 md:p-6 rounded-[2rem] border-2 border-black/5 space-y-4">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="w-full md:w-auto">
                   <div className="md:hidden">
                      <Button 
                        variant="outline" 
                        className="w-full h-12 border-2 border-black rounded-2xl justify-between px-6 font-black uppercase text-[10px]"
                        onClick={() => setShowRABActions(!showRABActions)}
                      >
                        Actions Menu
                        {showRABActions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <AnimatePresence>
                        {showRABActions && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-3 space-y-3"
                          >
                             <Button variant="outline" className="w-full h-12 px-6 border border-neutral-200 rounded-2xl gap-2 font-black uppercase text-[10px] shadow-sm" onClick={() => {
                               const cats = categories.map(c => ({ id: c.id, name: c.name }));
                               const formattedItems = items.map(item => ({
                                 name: item.name,
                                 unit: item.unit,
                                 quantity: item.quantity,
                                 pricePerUnit: user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(item.pricePerUnit, sysConfig?.globalMarkup) : calculateClientPrice(item.pricePerUnit, sysConfig?.globalMarkup),
                                 totalPrice: user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(item.totalPrice, sysConfig?.globalMarkup) : calculateClientPrice(item.totalPrice, sysConfig?.globalMarkup),
                                 categoryId: item.categoryId,
                                 technicalSpecs: item.technicalSpecs
                               }));
                               generateRABPDF(`RAB ${project.name}`, cats, formattedItems, pdfLogo, { name: project.name, location: project.description || "Jakarta", client: user?.displayName || "Klien Terhomat" });
                               toast.success("RAB PDF Generated!");
                               setShowRABActions(false);
                             }}>
                               <Download className="w-4 h-4" /> Export RAB PDF
                             </Button>
                             {canEditRAB && (
                               <>
                                 <Dialog>
                                   <DialogTrigger render={<Button className="w-full h-12 px-6 border border-neutral-200 rounded-2xl gap-2 font-black uppercase text-[10px] shadow-sm"><Plus className="w-4 h-4" /> Kategori</Button>} />
                                   <DialogContent>
                                     <DialogHeader><DialogTitle className="font-black uppercase tracking-tighter">Tambah Kategori Baru</DialogTitle></DialogHeader>
                                     <div className="py-4 space-y-4">
                                       <div className="space-y-2">
                                          <Label className="uppercase-soft text-[10px]">Nama Kategori</Label>
                                          <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Contoh: Pekerjaan Tanah" className="h-12 border-2 border-black/10 rounded-xl" />
                                       </div>
                                     </div>
                                     <DialogFooter><Button className="btn-sleek w-full h-12" onClick={() => { addCategory(newCatName); setNewCatName(""); }}>Simpan</Button></DialogFooter>
                                   </DialogContent>
                                 </Dialog>
                                 <Dialog>
                                   <DialogTrigger render={<Button className="w-full h-12 px-6 border border-neutral-200 rounded-2xl gap-2 font-black uppercase text-[10px] shadow-sm"><Plus className="w-4 h-4" /> Item RAB</Button>} />
                                   <DialogContent className="max-w-xl">
                                      <DialogHeader><DialogTitle className="font-black uppercase tracking-tighter">Tambah Item RAB</DialogTitle></DialogHeader>
                                      <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                                         <div className="space-y-2">
                                            <Label className="uppercase-soft text-[10px]">Kategori</Label>
                                            <select className="w-full h-12 px-4 border-2 border-black/10 rounded-xl font-bold uppercase text-xs" value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)}>
                                              <option value="">Pilih Kategori</option>
                                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                         </div>
                                         <div className="space-y-2 relative">
                                            <Label className="uppercase-soft text-[10px]">Cari Pekerjaan (Master Data)</Label>
                                            <div className="relative">
                                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Ketik nama pekerjaan..." className="h-12 pl-11 border-2 border-black/10 rounded-xl" />
                                            </div>
                                            {isSearching && searchResults.length > 0 && (
                                              <div className="absolute z-50 w-full mt-2 bg-white border-2 border-black rounded-2xl shadow-xl max-h-60 overflow-auto scrollbar-hide">
                                                {searchResults.map(item => (
                                                  <div key={item.id} className="p-4 hover:bg-neutral-50 cursor-pointer border-b-2 border-black/5 last:border-0" onClick={() => selectMasterItem(item)}>
                                                    <div className="flex justify-between items-center mb-1"><span className="font-black text-[11px] uppercase tracking-tighter">{item.name}</span><Badge variant="outline" className="text-[9px] border-black/10 uppercase-soft">{item.category}</Badge></div>
                                                    <div className="flex justify-between text-[10px] font-bold text-neutral-400 italic"><span>Satuan: {item.unit}</span><span>Rp {item.price.toLocaleString('id-ID')}</span></div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                         </div>
                                         <div className="space-y-2"><Label className="uppercase-soft text-[10px]">Nama Item</Label><Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Nama pekerjaan..." className="h-12 border-2 border-black/10 rounded-xl" /></div>
                                         <div className="space-y-2"><Label className="uppercase-soft text-[10px]">Spesifikasi Teknis</Label><Textarea value={newItemSpecs} onChange={e => setNewItemSpecs(e.target.value)} placeholder="Merk, Tipe, Material..." className="min-h-[80px] border-2 border-black/10 rounded-xl" /></div>
                                         <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2"><Label className="uppercase-soft text-[10px]">Volume</Label><Input type="number" value={newItemQty || 0} onChange={e => setNewItemQty(Math.max(0, Number(e.target.value)))} className="h-12 border-2 border-black/10 rounded-xl" /></div>
                                            <div className="space-y-2"><Label className="uppercase-soft text-[10px]">Satuan</Label><Input value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)} className="h-12 border-2 border-black/10 rounded-xl" /></div>
                                         </div>
                                         <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                              <Label className="uppercase-soft text-[10px]">Prioritas</Label>
                                              <select className="w-full h-12 px-4 border-2 border-black/10 rounded-xl font-bold uppercase text-xs" value={newItemPriority} onChange={e => setNewItemPriority(e.target.value as any)}>
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                                <option value="Urgent">Urgent</option>
                                              </select>
                                            </div>
                                            <div className="space-y-2">
                                              <Label className="uppercase-soft text-[10px]">Deadline / Due Date</Label>
                                              <Input type="date" value={newItemDueDate} onChange={e => setNewItemDueDate(e.target.value)} className="h-12 border-2 border-black/10 rounded-xl" />
                                            </div>
                                         </div>
                                         <div className="space-y-2"><Label className="uppercase-soft text-[10px]">Harga Satuan (Rp)</Label><Input type="number" value={newItemPrice || 0} onChange={e => setNewItemPrice(Math.max(0, Number(e.target.value)))} className="h-12 border-2 border-black/10 rounded-xl" /></div>
                                      </div>
                                      <DialogFooter><Button className="btn-accent w-full h-12 shadow-md" onClick={() => { if(selectedCatId && newItemName) { addItem(selectedCatId, newItemName, newItemQty, newItemUnit, newItemPrice, newItemSpecs, newItemPriority, 0, newItemDueDate); setNewItemName(""); setNewItemSpecs(""); setNewItemQty(1); setNewItemPrice(0); setNewItemPriority("Medium"); setNewItemDueDate(""); setSearchQuery(""); setShowRABActions(false); } }}>Simpan Item</Button></DialogFooter>
                                   </DialogContent>
                                 </Dialog>
                               </>
                             )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>

                   <div className="hidden md:flex flex-wrap gap-4">
                      <Button variant="outline" className="h-12 px-6 border-2 border-black rounded-2xl gap-2 font-black uppercase text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-100" onClick={() => {
                        const cats = categories.map(c => ({ id: c.id, name: c.name }));
                        const formattedItems = items.map(item => ({
                          name: item.name,
                          unit: item.unit,
                          quantity: item.quantity,
                          pricePerUnit: user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(item.pricePerUnit, sysConfig?.globalMarkup) : calculateClientPrice(item.pricePerUnit, sysConfig?.globalMarkup),
                          totalPrice: user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(item.totalPrice, sysConfig?.globalMarkup) : calculateClientPrice(item.totalPrice, sysConfig?.globalMarkup),
                          categoryId: item.categoryId,
                          technicalSpecs: item.technicalSpecs
                        }));
                        generateRABPDF(`RAB ${project.name}`, cats, formattedItems, pdfLogo, { name: project.name, location: project.description || "Jakarta", client: user?.displayName || "Klien Terhomat" });
                        toast.success("RAB PDF Generated!");
                      }}>
                        <Download className="w-4 h-4" /> Export RAB PDF
                      </Button>
                      
                      {canEditRAB && (
                        <div className="flex gap-3">
                          <Dialog>
                            <DialogTrigger render={<Button className="btn-accent h-12 px-6 rounded-2xl gap-2 font-black uppercase text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><Plus className="w-4 h-4" /> Kategori</Button>} />
                            <DialogContent>
                              <DialogHeader><DialogTitle className="font-black uppercase tracking-tighter">Tambah Kategori Baru</DialogTitle></DialogHeader>
                              <div className="py-4 space-y-4">
                                <div className="space-y-2">
                                   <Label className="uppercase-soft text-[10px]">Nama Kategori</Label>
                                   <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Contoh: Pekerjaan Tanah" className="h-12 border-2 border-black/10 rounded-xl" />
                                </div>
                              </div>
                              <DialogFooter><Button className="btn-sleek w-full h-12" onClick={() => { addCategory(newCatName); setNewCatName(""); }}>Simpan</Button></DialogFooter>
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog>
                            <DialogTrigger render={<Button className="btn-sleek h-12 px-6 rounded-2xl gap-2 font-black uppercase text-[10px] shadow-[4px_4px_0px_0px_#FF6B00]"><Plus className="w-4 h-4" /> Item RAB</Button>} />
                            <DialogContent className="max-w-xl">
                              <DialogHeader><DialogTitle className="font-black uppercase tracking-tighter">Tambah Item RAB</DialogTitle></DialogHeader>
                              <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                                 <div className="space-y-2">
                                    <Label className="uppercase-soft text-[10px]">Kategori</Label>
                                    <select className="w-full h-12 px-4 border-2 border-black/10 rounded-xl font-bold uppercase text-xs" value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)}>
                                      <option value="">Pilih Kategori</option>
                                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                 </div>
                                 <div className="space-y-2 relative">
                                    <Label className="uppercase-soft text-[10px]">Cari Pekerjaan (Master Data)</Label>
                                    <div className="relative">
                                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                      <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Ketik nama pekerjaan..." className="h-12 pl-11 border-2 border-black/10 rounded-xl" />
                                    </div>
                                    {isSearching && searchResults.length > 0 && (
                                      <div className="absolute z-50 w-full mt-2 bg-white border-2 border-black rounded-2xl shadow-xl max-h-60 overflow-auto scrollbar-hide">
                                        {searchResults.map(item => (
                                          <div key={item.id} className="p-4 hover:bg-neutral-50 cursor-pointer border-b-2 border-black/5 last:border-0" onClick={() => selectMasterItem(item)}>
                                            <div className="flex justify-between items-center mb-1"><span className="font-black text-[11px] uppercase tracking-tighter">{item.name}</span><Badge variant="outline" className="text-[9px] border-black/10 uppercase-soft">{item.category}</Badge></div>
                                            <div className="flex justify-between text-[10px] font-bold text-neutral-400 italic"><span>Satuan: {item.unit}</span><span>Rp {item.price.toLocaleString('id-ID')}</span></div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                 </div>
                                 <div className="space-y-2"><Label className="uppercase-soft text-[10px]">Nama Item</Label><Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Nama pekerjaan..." className="h-12 border-2 border-black/10 rounded-xl" /></div>
                                 <div className="space-y-2"><Label className="uppercase-soft text-[10px]">Spesifikasi Teknis</Label><Textarea value={newItemSpecs} onChange={e => setNewItemSpecs(e.target.value)} placeholder="Merk, Tipe, Material..." className="min-h-[80px] border-2 border-black/10 rounded-xl" /></div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="uppercase-soft text-[10px]">Volume</Label><Input type="number" value={newItemQty || 0} onChange={e => setNewItemQty(Math.max(0, Number(e.target.value)))} className="h-12 border-2 border-black/10 rounded-xl" /></div>
                                    <div className="space-y-2"><Label className="uppercase-soft text-[10px]">Satuan</Label><Input value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)} className="h-12 border-2 border-black/10 rounded-xl" /></div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label className="uppercase-soft text-[10px]">Prioritas</Label>
                                      <select className="w-full h-12 px-4 border-2 border-black/10 rounded-xl font-bold uppercase text-xs" value={newItemPriority} onChange={e => setNewItemPriority(e.target.value as any)}>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                      </select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="uppercase-soft text-[10px]">Deadline / Due Date</Label>
                                      <Input type="date" value={newItemDueDate} onChange={e => setNewItemDueDate(e.target.value)} className="h-12 border-2 border-black/10 rounded-xl" />
                                    </div>
                                 </div>
                                 <div className="space-y-2"><Label className="uppercase-soft text-[10px]">Harga Satuan (Rp)</Label><Input type="number" value={newItemPrice || 0} onChange={e => setNewItemPrice(Math.max(0, Number(e.target.value)))} className="h-12 border-2 border-black/10 rounded-xl" /></div>
                              </div>
                              <DialogFooter><Button className="btn-accent w-full h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" onClick={() => { if(selectedCatId && newItemName) { addItem(selectedCatId, newItemName, newItemQty, newItemUnit, newItemPrice, newItemSpecs, newItemPriority, 0, newItemDueDate); setNewItemName(""); setNewItemSpecs(""); setNewItemQty(1); setNewItemPrice(0); setNewItemPriority("Medium"); setNewItemDueDate(""); setSearchQuery(""); } }}>Simpan Item</Button></DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                   </div>
                </div>
                <p className="font-black text-[10px] md:text-xs uppercase tracking-tighter text-neutral-400">Total RAB: <span className="text-black">{formatRupiah(user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(project.totalBudget, sysConfig?.globalMarkup) : calculateClientPrice(project.totalBudget, sysConfig?.globalMarkup))}</span></p>
             </div>
          </div>

          <div className="space-y-12">
            {categories.map(category => (
              <div key={category.id} className="space-y-6">
                <div className="flex justify-between items-center border-b-4 border-black pb-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-black uppercase tracking-tighter italic">{category.name}</h3>
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-red-500 hover:bg-neutral-100 rounded-full" onClick={() => { if(confirm(`Hapus kategori "${category.name}"?`)) deleteCategory(category.id); }}><Trash2 className="w-5 h-5" /></Button>
                    )}
                  </div>
                  <Badge className="bg-black text-white h-10 px-6 rounded-2xl font-black uppercase text-[12px] shadow-[4px_4px_0px_0px_#FF6B00]">
                    Subtotal: {formatRupiah(user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(items.filter(i => i.categoryId === category.id).reduce((sum, i) => sum + i.totalPrice, 0), sysConfig?.globalMarkup) : calculateClientPrice(items.filter(i => i.categoryId === category.id).reduce((sum, i) => sum + i.totalPrice, 0), sysConfig?.globalMarkup))}
                  </Badge>
                </div>
                
                <div className="overflow-x-auto rounded-[2rem] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow className="bg-neutral-50 hover:bg-neutral-50 border-b-2 border-black">
                        <TableHead className="w-[300px] uppercase font-black text-[10px] tracking-tight">Deskripsi Pekerjaan</TableHead>
                        <TableHead className="text-center uppercase font-black text-[10px] tracking-tight">Prioritas</TableHead>
                        <TableHead className="text-center uppercase font-black text-[10px] tracking-tight">Deadline</TableHead>
                        <TableHead className="text-center uppercase font-black text-[10px] tracking-tight">Vol / Sat</TableHead>
                        <TableHead className="text-right uppercase font-black text-[10px] tracking-tight">Harga Satuan</TableHead>
                        <TableHead className="text-right uppercase font-black text-[10px] tracking-tight">Total</TableHead>
                        <TableHead className="w-[140px] text-center uppercase font-black text-[10px] tracking-tight">Progress</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.filter(i => i.categoryId === category.id).map(item => (
                        <TableRow key={item.id} className="group/row hover:bg-neutral-50 border-b border-black/5 last:border-0 transition-colors">
                          <TableCell className="py-6">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-[13px] uppercase tracking-tighter leading-tight">{item.name}</span>
                                {canEdit && <button onClick={() => setEditingItemSpecs({ id: item.id, name: item.name, specs: item.technicalSpecs || "" })} className="opacity-0 group-hover/row:opacity-100 transition-opacity"><Edit2 className="w-3 h-3 text-neutral-300 hover:text-accent" /></button>}
                              </div>
                              {item.technicalSpecs && <p className="text-[10px] font-medium text-neutral-400 italic">{item.technicalSpecs}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn(
                              "text-[8px] uppercase font-bold",
                              item.priority === 'Urgent' ? "border-red-500 text-red-500" :
                              item.priority === 'High' ? "border-orange-500 text-orange-500" :
                              item.priority === 'Medium' ? "border-blue-500 text-blue-500" : "border-neutral-300 text-neutral-300"
                            )}>
                              {item.priority || 'Medium'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-[10px] font-bold text-neutral-400">
                             {item.endDate ? new Date(item.endDate).toLocaleDateString('id-ID') : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                             <p className="font-black text-xs">{item.quantity}</p>
                             <p className="text-[10px] font-bold uppercase text-neutral-400">{item.unit}</p>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatRupiah(user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(item.pricePerUnit, sysConfig?.globalMarkup) : calculateClientPrice(item.pricePerUnit, sysConfig?.globalMarkup))}
                          </TableCell>
                          <TableCell className="text-right font-mono font-black text-xs text-accent">
                            {formatRupiah(user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(item.totalPrice, sysConfig?.globalMarkup) : calculateClientPrice(item.totalPrice, sysConfig?.globalMarkup))}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-2">
                               <div className="flex justify-between w-full px-1"><span className="text-[9px] font-black uppercase text-neutral-400">Status</span><span className="text-[10px] font-black text-accent">{item.progress || 0}%</span></div>
                               <Progress value={item.progress || 0} className="h-1.5 bg-neutral-100" />
                               {canEdit && (
                                 <input type="range" min="0" max="100" step="10" value={item.progress || 0} onChange={(e) => updateItemProgress(item.id, Number(e.target.value))} className="w-full accent-accent h-1" />
                               )}
                            </div>
                          </TableCell>
                          <TableCell>
                             {canEdit && (
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-200 hover:text-red-500 rounded-full" onClick={() => { if(confirm(`Hapus item?`)) deleteItem(item.id, item.totalPrice); }}><Trash2 className="w-4 h-4" /></Button>
                             )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="py-20 text-center border-4 border-dashed rounded-[3rem] border-black/5 bg-neutral-50/50">
              <FileText className="w-12 h-12 mx-auto text-neutral-200 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Belum ada kategori anggaran. Silakan hubungi Admin atau tambahkan kategori.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!editingItemSpecs} onOpenChange={(open) => !open && setEditingItemSpecs(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter">Edit Spesifikasi Teknis</DialogTitle>
            <DialogDescription>Input Merk, Tipe, atau Material khusus untuk item: {editingItemSpecs?.name}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="uppercase-soft text-[10px]">Keterangan Spesifikasi</Label>
              <Textarea 
                value={editingItemSpecs?.specs || ""}
                onChange={e => setEditingItemSpecs(prev => prev ? { ...prev, specs: e.target.value } : null)}
                placeholder="e.g. Merk Holcim, Besi 12 Sni, dst."
                className="min-h-[100px] border-2 border-black/10 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="btn-sleek w-full"
              onClick={async () => {
                if (editingItemSpecs) {
                  await updateItem(editingItemSpecs.id, { technicalSpecs: editingItemSpecs.specs });
                  setEditingItemSpecs(null);
                  toast.success("Spesifikasi teknis berhasil diperbarui.");
                }
              }}
            >
              Update Spesifikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const VirtualAssistant = ({ user, updateProfile }: { user: any, updateProfile: (data: any) => Promise<void> }) => {
  const { config: systemConfig } = useSystemConfig();
  const { config: cmsConfig } = useCMSConfig();
  const { masterData } = useMasterData();
  const { assets: systemAssets } = useMediaAssets('system');
  const { assets: financeAssets } = useMediaAssets('finance');
  
  const assistantLogo = TBJ_LOGO;
  const pdfLogo = TBJ_LOGO;
  const qrisImage = financeAssets.find(a => a.name.toLowerCase().includes('qris'))?.url || QRIS_IMAGE;

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
  const [waNumber, setWaNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [expandedRenovasi, setExpandedRenovasi] = useState(false);
  const [leadData, setLeadData] = useState({
    whatsapp: user.whatsapp || "",
    email: user.email || "",
  });
  const [projectData, setProjectData] = useState({
    name: "",
    area: "" as any,
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
  const [propFilter, setPropFilter] = useState<Property["type"] | null>(null);
  const { properties } = useProperties();

  const [mapPosition, setMapPosition] = useState<[number, number]>([-6.2088, 106.8456]); // Jakarta
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showPropMap, setShowPropMap] = useState(false);

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
    { id: "Renovasi", label: "Renovasi & Maintenance", icon: Wrench, desc: "Perbaikan, Upgrade, & Perawatan Rutin Bangunan" },
    { id: "Interior", label: "Desain & Interior", icon: PenTool, desc: "Layanan Desain Interior, Furniture, & Custom Fit-out" },
    { id: "Arsitektur", label: "Arsitektur & Perencanaan", icon: Building2, desc: "Bangun Baru, Gambar Kerja, & Strategi Konstruksi" },
    { id: "Property", label: "Property Hub", icon: Home, desc: "Jual/Sewa Properti & Solusi Legalitas IMB/PBG" },
    { id: "Gallery", label: "Projects Gallery", icon: ImageIcon, desc: "Portfolio & Inspirasi Karya Terbaik TBJ Constech" },
    { id: "Lain-Lain", label: "Lain-Lain", icon: Sparkles, desc: "Landscape, Event, Exhibition Booth, & Lainnya" },
    { id: "AIAgent", label: "AI Agent", icon: MessageSquare, desc: "Konsultasi Cerdas 24/7 via Chat & Analisis Gambar", cosmic: true },
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
        projectData.type === "Renovasi" ||
        projectData.type === "Arsitektur" ||
        projectData.type === "Lain-lain" ||
        projectData.type === "Lain-Lain" ||
        (projectData.type === "Interior" && projectData.subType === "jasa-desain")
      ));

    if (isAIRequired) {
      // Tier 1 AI Analysis Limit Check
      const isStaff = user?.role === "admin" || user?.role === "pm";
      const isPro = user?.tier === "survey" || user?.tier === "deal";
      // Limit 5x if waVerified, else 1x (or following systemConfig if exists)
      const freeLimit = user?.waVerified ? (systemConfig?.aiVerifiedLimit || 5) : (systemConfig?.aiFreeLimit || 1);
      
      setIsAnalyzing(true);
      try {
        let prompt = userProblem || `Konsultasi & Estimasi untuk proyek ${projectData.type} ${projectData.subType ? `(${projectData.subType})` : ""} di ${projectData.location || "lokasi strategis"}.`;
        
        if (projectData.type === "Arsitektur") {
          const area = projectData.area || 0;
          prompt = `PROYEK ARSITEKTUR & BANGUN BARU:\nAnalisis: ${userProblem || "Perencanaan bangun baru"}\nLuas Area: ${area}m2\nJumlah Lantai: ${projectData.floors}\nTipe Finishing: ${projectData.finishing}`;
        } else if (projectData.type === "Renovasi") {
          const area = projectData.area || 0;
          const categoriesStr = selectedCategories.join(", ");
          prompt = `PROYEK RENOVASI & MAINTENANCE:\nAnalisis: ${userProblem || "Renovasi bangunan"}\nKategori: ${categoriesStr}\nLuas Area: ${area}m2`;
        } else if (projectData.type === "Interior") {
          const area = projectData.area || 0;
          prompt = `PROYEK DESAIN & INTERIOR:\nAnalisis: ${userProblem || "Pekerjaan desain/interior"}\nSub-Tipe: ${projectData.subType}\nLuas Area: ${area}m2`;
        } else if (projectData.type === "Lain-Lain" || projectData.type === "Lain-lain") {
          const area = projectData.area || 0;
          prompt = `PROYEK KHUSUS (LAIN-LAIN):\nDeskripsi: ${userProblem || "Pekerjaan konstruksi khusus"}\nLuas Area Estimasi: ${area}m2`;
        }

        const result = await getAIEstimation(prompt, projectData.type, masterData, user?.role, systemConfig?.globalMarkup);
        setAiEstimation(result);
        
        if (!isStaff && !isPro && (user?.aiUsageCount || 0) >= freeLimit) {
          toast.info("Limit Analisa AI Tercapai.", { description: "Silakan hubungi Admin atau booking survey untuk melanjutkan." });
          setStep(6); 
          return;
        }

        // Increment AI Usage Count for non-staff
        if (!isStaff) {
          await incrementAIUsage();
        }
        
        // If already verified, go straight to result (Step 5), else go to verification (Step 4)
        if (user?.waVerified) {
          setStep(5);
        } else {
          setStep(4);
        }
      } catch (error) {
        console.error("AI Estimation failed", error);
        toast.error(error instanceof Error ? error.message : "Gagal melakukan analisa AI. Silakan coba lagi.");
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
    : selectedItems.reduce((sum, si) => {
        const itemPrice = user?.role === "admin" || user?.role === "pm" 
          ? calculateAdminPrice(si.item.price) 
          : calculateClientPrice(si.item.price, systemConfig?.globalMarkup);
        return sum + (itemPrice * si.qty);
      }, 0) + (interiorEstimate > 0 ? (user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(interiorEstimate, systemConfig?.globalMarkup) : calculateClientPrice(interiorEstimate, systemConfig?.globalMarkup)) : 0) + designFee;

  const handleLeadSubmit = async () => {
    if (!leadData.whatsapp || !leadData.email) return;
    setIsOtpSent(true);
  };

  const handleVerifyOtp = async (code: string) => {
    if (code === "1234") { // Sesuaikan dengan kode Anda
      await updateProfile({ 
        whatsapp: leadData.whatsapp || waNumber, 
        waVerified: true,
        tier: user?.tier === "prospect" ? "prospect" : user?.tier
      });
      setStep(5); // <-- INI KRUSIAL: Memaksa tampilan pindah ke hasil
      setShowOtpDialog(false);
      console.log("Estimasi Berhasil Diambil");
    } else {
      alert("Kode salah");
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

      <Card className="border border-black/10 shadow-xl overflow-hidden rounded-2xl">
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
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {MAIN_CATEGORIES.map(cat => (
                  <div 
                    key={cat.id}
                    onClick={() => {
                      if (cat.id === "AIAgent") {
                        navigate("/ai-agent");
                        return;
                      }
                      if (cat.id === "Gallery") {
                        navigate("/gallery");
                        return;
                      }
                      setProjectData({...projectData, type: cat.id});
                      if (cat.id === "Property") {
                        setStep(10); // Property Page
                      } else {
                        handleNext();
                      }
                    }}
                    className={cn(
                      "p-8 border-2 border-black cursor-pointer transition-all group relative overflow-hidden rounded-3xl",
                      cat.cosmic 
                        ? "bg-[#FF6B00] text-white border-[#FF6B00] shadow-[0_0_20px_rgba(255,107,0,0.3)] hover:bg-[#E65F00]" 
                        : "hover:bg-titanium hover:text-white"
                    )}
                  >
                    <cat.icon className={cn(
                      "w-12 h-12 mb-6 transition-transform group-hover:-translate-y-1",
                      cat.cosmic ? "text-white" : ""
                    )} />
                    <h3 className="font-black text-xl uppercase tracking-tighter">{cat.label}</h3>
                    <p className={cn(
                      "uppercase-soft mt-2 opacity-60",
                      cat.cosmic ? "text-white/80" : ""
                    )}>{cat.desc}</p>
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-6 md:p-12 space-y-8 md:space-y-12">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-neutral-100 pb-6 gap-4">
                <h2 className="text-xl md:text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <MapPin className="w-8 md:w-10 h-8 md:h-10" /> Detail Proyek
                </h2>
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" className="h-8 md:h-10 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-neutral-400" onClick={() => setStep(1)}>
                    &larr; Categories
                  </Button>
                  <p className="uppercase-soft text-neutral-400 text-[10px] md:text-xs">Step 02 / 05</p>
                </div>
              </div>
              
              <div className="grid gap-8 md:gap-12 md:grid-cols-2">
                <div className="space-y-6 md:space-y-8">
                  <div className="space-y-4">
                    <label className="uppercase-soft text-neutral-400">Lokasi Proyek</label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Ketik alamat atau area..." 
                        className="input-sleek text-sm md:text-lg"
                        value={projectData.location}
                        onChange={(e) => setProjectData(prev => ({ ...prev, location: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') searchLocation(projectData.location);
                        }}
                      />
                      <Button 
                        variant="outline" 
                        className="rounded-md border-black h-10 md:h-12 w-10 md:w-12 p-0 flex items-center justify-center bg-white" 
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
                      <div className="border border-neutral-200 overflow-hidden rounded-2xl bg-white shadow-sm">
                        <div 
                          onClick={() => setExpandedRenovasi(!expandedRenovasi)}
                          className={cn(
                            "p-5 md:p-6 flex justify-between items-center cursor-pointer transition-colors",
                            selectedCategories.filter(c => c !== "Lain-lain").length > 0 ? "bg-black text-white" : "hover:bg-neutral-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Wrench className="w-5 md:w-6 h-5 md:h-6" />
                            <span className="font-black uppercase tracking-tighter text-base md:text-lg">Item Renovasi Utama</span>
                          </div>
                          {expandedRenovasi ? <ChevronUp className="w-4 md:w-5 h-4 md:h-5" /> : <ChevronDown className="w-4 md:w-5 h-4 md:h-5" />}
                        </div>
                        {expandedRenovasi && (
                          <div className="p-4 md:p-6 bg-neutral-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                            {["Dinding", "Lantai", "Atap", "Plafon", "Cat", "Kamar Mandi"].map(item => (
                              <div 
                                key={item}
                                onClick={() => toggleCategory(item)}
                                className={cn(
                                  "p-3 md:p-4 border-2 font-bold uppercase tracking-widest text-[9px] md:text-[10px] cursor-pointer text-center transition-all bg-white rounded-xl",
                                  selectedCategories.includes(item) ? "border-black bg-black text-white" : "border-neutral-200 hover:border-black"
                                )}
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-6 pt-6 border-t border-neutral-100">
                        <div className="space-y-3">
                          <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                            <Calculator className="w-5 md:w-6 h-5 md:h-6 text-accent" /> AI Analysis & Photos
                          </h3>
                          <p className="uppercase-soft text-neutral-400 text-[10px] md:text-xs">Ceritakan detail renovasi Anda dan upload foto untuk analisa AI yang lebih akurat.</p>
                        </div>
                        
                        <div className="space-y-6 p-6 md:p-8 border border-neutral-200 bg-white animate-in fade-in slide-in-from-top-4 rounded-2xl shadow-sm">
                          <div className="space-y-2">
                            <label className="uppercase-soft text-neutral-400">Luas Area Renovasi (m2)</label>
                              <Input 
                                type="number" 
                                value={projectData.area} 
                                onChange={e => setProjectData({...projectData, area: e.target.value === "" ? "" : Number(e.target.value)})}
                                placeholder="0"
                                className="input-sleek"
                              />
                          </div>
                          <div className="space-y-2">
                            <label className="uppercase-soft text-neutral-400">Ceritakan Permasalahan Anda</label>
                            <Textarea 
                              placeholder="Contoh: Dinding saya retak rambut di area ruang tamu..." 
                              value={userProblem}
                              onChange={e => setUserProblem(e.target.value)}
                              className="min-h-[120px] md:min-h-[150px] border-neutral-200 focus:border-black rounded-xl resize-none"
                            />
                          </div>
                            
                          <div className="space-y-4">
                            <label className="uppercase-soft text-neutral-400">Upload Foto Permasalahan</label>
                            <div className="flex flex-wrap gap-2 md:gap-4">
                              {problemPhotos.map((p, i) => (
                                <div key={i} className="w-20 md:w-24 h-20 md:h-24 border border-neutral-200 overflow-hidden relative group rounded-xl">
                                  <img src={p} className="w-full h-full object-cover" />
                                  <button 
                                    onClick={() => setProblemPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute inset-0 bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              ))}
                              <label className="w-20 md:w-24 h-20 md:h-24 border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors rounded-xl bg-neutral-50/50">
                                <Camera className="w-6 md:w-8 h-6 md:h-8 text-neutral-400" />
                                <span className="uppercase-soft mt-1 md:mt-2 text-[8px] md:text-[10px]">Add Photo</span>
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

                      <div className="space-y-6 pt-6 border-t border-neutral-100">
                        <div className="space-y-4">
                          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                            <Calculator className="w-6 h-6 text-accent" /> AI Maintenance Analysis
                          </h3>
                          <p className="uppercase-soft text-neutral-400 text-[10px] md:text-xs">Ceritakan kebutuhan perawatan atau perbaikan minor Anda.</p>
                        </div>
                        
                        <div className="space-y-6 p-4 md:p-8 border border-neutral-200 animate-in fade-in slide-in-from-top-4 rounded-2xl bg-white/50">
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

                      <div className="space-y-6 pt-6 border-t border-neutral-100">
                        <div className="space-y-4">
                          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                            <Calculator className="w-6 h-6 text-accent" /> AI Design Analysis
                          </h3>
                          <p className="uppercase-soft text-neutral-400 text-[10px] md:text-xs">Input spesifikasi untuk analisa AI yang lebih akurat.</p>
                        </div>
                        
                        <div className="space-y-6 p-4 md:p-8 border border-neutral-200 animate-in fade-in slide-in-from-top-4 rounded-2xl bg-white/50">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="uppercase-soft text-neutral-400">Luas Area (m2)</label>
                              <Input 
                                type="number" 
                                value={projectData.area} 
                                onChange={e => setProjectData({...projectData, area: e.target.value === "" ? "" : Number(e.target.value)})}
                                placeholder="_"
                                className="input-sleek"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="uppercase-soft text-neutral-400">Jumlah Lantai / Segmen</label>
                              <Input 
                                type="number" 
                                value={projectData.floors} 
                                onChange={e => setProjectData({...projectData, floors: Number(e.target.value)})}
                                className="input-sleek"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="uppercase-soft text-neutral-400">Tipe Kualitas</label>
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

                  {(projectData.type === "Lain-lain" || projectData.type === "Lain-Lain") && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                          <Calculator className="w-6 h-6 text-accent" /> AI Project Analysis
                        </h3>
                        <p className="uppercase-soft text-neutral-400">Jelaskan kebutuhan proyek spesifik Anda untuk estimasi AI instan.</p>
                      </div>
                      
                      <div className="space-y-6 p-8 border-2 border-black rounded-2xl animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-2">
                          <label className="uppercase-soft text-neutral-400">Deskripsi Proyek (Landscape/Event/Lainnya)</label>
                          <Textarea 
                            placeholder="Contoh: Pembuatan taman tropis 20m2, booth panggung event 3x4m, atau renovasi pagar..." 
                            value={userProblem}
                            onChange={e => setUserProblem(e.target.value)}
                            className="min-h-[150px] border-black/10 focus:border-black rounded-md resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="uppercase-soft text-neutral-400">Luas Area (m2)</label>
                          <Input 
                            type="number" 
                            value={projectData.area} 
                            onChange={e => setProjectData({...projectData, area: e.target.value === "" ? "" : Number(e.target.value)})}
                            placeholder="0"
                            className="input-sleek"
                          />
                        </div>
                        <div className="space-y-2">
                            <label className="uppercase-soft text-neutral-400">Jumlah Lantai / Segmen</label>
                            <Input 
                              type="number" 
                              value={projectData.floors} 
                              onChange={e => setProjectData({...projectData, floors: Number(e.target.value)})}
                              className="input-sleek"
                            />
                        </div>
                        <div className="space-y-4">
                          <label className="uppercase-soft text-neutral-400">Upload Foto Pendukung (Opsional)</label>
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
                                  const result = await getAIEstimation(prompt, "Interior", masterData, user?.role, systemConfig?.globalMarkup);
                                  setAiEstimation(result);
                                  setStep(4);
                                } catch (error) {
                                  console.error("AI Estimation Error:", error);
                                  toast.error("Gagal Melakukan Analisa AI", {
                                    description: "Sistem sedang padat atau terdapat kendala teknis. Silakan coba lagi atau hubungi tim teknis kami jika masalah berlanjut."
                                  });
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
                                onChange={e => setProjectData({...projectData, area: e.target.value === "" ? "" : Number(e.target.value)})}
                                placeholder="_"
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

                <div className="space-y-8 bg-neutral-50 p-6 md:p-12 border border-black/5 rounded-2xl">
                  <div className="space-y-6">
                    <h3 className="font-black uppercase tracking-tighter text-xl md:text-2xl">Project Summary</h3>
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex justify-between uppercase-soft border-b border-black/5 pb-2">
                        <span className="text-neutral-400">Category</span>
                        <span className="font-black text-xs md:text-sm">{projectData.type}</span>
                      </div>
                      <div className="flex justify-between uppercase-soft border-b border-black/5 pb-2">
                        <span className="text-neutral-400">Location</span>
                        <span className="font-black truncate max-w-[120px] md:max-w-[200px] text-xs md:text-sm">{projectData.location || "-"}</span>
                      </div>
                      <div className="flex justify-between uppercase-soft border-b border-black/5 pb-2">
                        <span className="text-neutral-400">Area</span>
                        <span className="font-black text-xs md:text-sm">{projectData.area} m2</span>
                      </div>
                    </div>
                  </div>
                      <div className="pt-6 md:pt-8 flex flex-col gap-4">
                        <Button 
                          className="w-full btn-orange h-16 md:h-20 text-sm md:text-base font-black uppercase tracking-widest shadow-xl shadow-accent/20 transition-all active:scale-[0.98]" 
                          onClick={() => {
                            if (projectData.type === "Renovasi" && !userProblem) {
                              toast.warning("Mohon jelaskan detail renovasi", { description: "Sedikit cerita membantu AI memberikan estimasi lebih akurat." });
                              return;
                            }
                            handleNext();
                          }} 
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? (
                            <div className="flex items-center gap-3 md:gap-4">
                              <Loader2 className="h-5 md:h-6 w-5 md:h-6 animate-spin" />
                              <span className="text-sm md:text-base">Analisa AI...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 md:gap-4">
                              <span className="text-sm md:text-base">ESTIMASI AI</span>
                              <Zap className="w-5 md:w-6 h-5 md:h-6 fill-current" />
                            </div>
                          )}
                        </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black" 
                      onClick={handleBack} 
                      disabled={isAnalyzing}
                    >
                      &larr; Previous Step
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-6 md:p-12 space-y-8 md:space-y-12">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-neutral-200 pb-6 gap-4">
                <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">Volume Pekerjaan</h2>
                <p className="uppercase-soft text-neutral-400 text-[10px] md:text-xs">Step 03 / 05</p>
              </div>
              <div className="grid gap-8 md:gap-12 md:grid-cols-3">
                <div className="md:col-span-2 space-y-8 max-h-[50vh] md:max-h-[60vh] overflow-auto pr-4 md:pr-6 custom-scrollbar">
                  {projectData.type === "Interior" ? (
                    <div className="space-y-6 md:space-y-8">
                      <div className="p-6 md:p-8 border border-neutral-200 bg-neutral-50/50 rounded-2xl space-y-4">
                        <p className="uppercase-soft text-neutral-400 text-[9px]">Interior Note</p>
                        <p className="text-xs md:text-sm font-bold leading-relaxed italic opacity-70">"Detail interior telah diinput pada tahap sebelumnya. Silakan tinjau kembali ringkasan di samping atau lanjutkan ke verifikasi."</p>
                      </div>
                      {Object.entries(interiorDetails).map(([room, items]) => (
                        <div key={room} className="p-6 md:p-8 border border-neutral-200 rounded-2xl space-y-6 bg-white">
                          <h4 className="text-lg md:text-xl font-black uppercase tracking-tighter border-b border-black/5 pb-4">{room}</h4>
                          <div className="grid gap-3 md:gap-4 text-[11px] md:text-sm">
                            {Object.entries(items).map(([name, detail]) => (
                              <div key={name} className="flex justify-between items-center">
                                <span className="font-bold uppercase tracking-widest opacity-60">{name}</span>
                                <span className="font-mono font-bold">{detail.size} {masterData.find(i => i.name === name)?.unit || "m2"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    selectedCategories.length > 0 ? selectedCategories.map(cat => (
                      <div key={cat} className="space-y-6">
                        <h3 className="font-black uppercase tracking-tighter text-lg md:text-xl flex items-center gap-3">
                          <Layers className="w-5 md:w-6 h-5 md:h-6" /> {cat}
                        </h3>
                        <div className="grid gap-3 md:gap-4">
                          {(masterData.length > 0 ? masterData : WORK_ITEMS_MASTER).filter(i => i.category.toLowerCase().includes(cat.toLowerCase())).slice(0, 3).map(item => {
                            const selected = selectedItems.find(si => si.item.id === item.id);
                            return (
                              <div key={item.id} className="flex items-center gap-4 md:gap-6 p-5 md:p-6 border border-neutral-200 bg-white rounded-2xl shadow-sm">
                                <div className="flex-grow">
                                  <p className="font-black uppercase tracking-widest text-[9px] md:text-[10px]">{item.name}</p>
                                  <p className="uppercase-soft text-neutral-400 mt-1">{item.unit}</p>
                                </div>
                                <Input 
                                  type="number" 
                                  className="w-24 md:w-32 h-10 md:h-12 border-neutral-200 focus:border-black rounded-lg font-bold text-center" 
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
                      <div className="text-center py-20 border-2 border-dashed border-neutral-200 rounded-[2rem]">
                        <p className="uppercase-soft text-neutral-400 px-8">
                          Gunakan input luas area untuk kalkulasi otomatis atau pilih kategori di tahap sebelumnya.
                        </p>
                      </div>
                    )
                  )}
                </div>

                <div className="space-y-8 bg-neutral-50 p-6 md:p-12 border border-black/5 rounded-2xl">
                  <div className="space-y-6">
                    <h3 className="font-black uppercase tracking-tighter text-xl md:text-2xl">Project Summary</h3>
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex justify-between uppercase-soft border-b border-black/5 pb-2">
                        <span className="text-neutral-400">Type</span>
                        <span className="font-black text-xs md:text-sm">{projectData.type}</span>
                      </div>
                      <div className="flex justify-between uppercase-soft border-b border-black/5 pb-2">
                        <span className="text-neutral-400">Area</span>
                        <span className="font-black text-xs md:text-sm">{projectData.area} m2</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 md:pt-12 flex flex-col gap-4">
                    <Button 
                      className="w-full btn-orange h-16 md:h-20 text-sm md:text-base font-black uppercase tracking-widest shadow-xl shadow-accent/20" 
                      onClick={handleNext}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-5 md:h-6 w-5 md:h-6 animate-spin" />
                          <span className="text-sm md:text-base">Analyzing...</span>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm md:text-base">Verify Data</span> 
                          <ChevronRight className="w-5 md:w-6 h-5 md:h-6" />
                        </div>
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black" 
                      onClick={handleBack}
                    >
                      &larr; Previous Step
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="text-center space-y-3">
                <div className="w-12 md:w-16 h-12 md:h-16 bg-black text-white flex items-center justify-center mx-auto mb-4 rounded-xl shadow-xl shadow-black/10">
                  <UserCheck className="w-6 md:w-8 h-6 md:h-8" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Tier 01: Verifikasi Data</h2>
                <p className="text-neutral-500 text-[10px] md:text-sm px-6">Mohon lengkapi data kontak Anda untuk menerima hasil estimasi lengkap.</p>
              </div>
              <div className="max-w-md mx-auto space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="uppercase-soft text-neutral-400">WhatsApp Number</label>
                    <Input 
                      placeholder="0812..." 
                      className="h-12 md:h-14 border border-neutral-200 rounded-xl font-bold bg-white px-6"
                      value={leadData.whatsapp}
                      onChange={e => setLeadData({...leadData, whatsapp: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="uppercase-soft text-neutral-400">Email Address</label>
                    <Input 
                      placeholder="email@example.com" 
                      className="h-12 md:h-14 border border-neutral-200 rounded-xl font-bold bg-white px-6"
                      value={leadData.email}
                      onChange={e => setLeadData({...leadData, email: e.target.value})}
                    />
                  </div>
                </div>
                {!isOtpSent ? (
                  <Button 
                    className="w-full btn-orange h-14 md:h-16 text-sm md:text-base"
                    onClick={handleLeadSubmit}
                    disabled={!leadData.whatsapp || !leadData.email}
                  >
                    Kirim Kode Verifikasi
                  </Button>
                ) : (
                  <div className="space-y-6 md:space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="space-y-1">
                      <label className="uppercase-soft text-neutral-400">Kode Verifikasi (Cek WA)</label>
                      <Input 
                        placeholder="---" 
                        className="h-14 md:h-16 border border-neutral-200 rounded-xl text-center text-xl md:text-2xl tracking-[0.5em] md:tracking-[1em] font-black bg-white"
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                      />
                    </div>
                    <Button 
                      className="w-full btn-orange h-14 md:h-16" 
                      onClick={() => handleVerifyOtp(otp)}
                    >
                      Verifikasi & Lihat Hasil
                    </Button>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  className="w-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-neutral-400" 
                  onClick={handleBack}
                >
                  &larr; Previous Step
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="p-4 md:p-8 space-y-12 animate-in fade-in zoom-in duration-700">
              {/* AI Results Content */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-8 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-5 h-5 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">AI Analysis Complete</span>
                  </div>
                  <h2 className="text-5xl font-black uppercase tracking-tighter leading-none text-black">Estimasi<br/>Proyek Anda</h2>
                  <p className="text-neutral-500 uppercase-soft text-xs">Generated by TBJ Constech AI System OS v2.0</p>
                </div>
                <div className="text-left md:text-right bg-black text-white p-6 rounded-2xl shadow-xl shadow-black/10 min-w-[300px]">
                  <p className="uppercase-soft text-white/60 text-[10px] mb-1 text-white">Total Biaya</p>
                  <p className="text-5xl font-black tracking-tighter text-primary">Rp {(totalEstimate || 0).toLocaleString('id-ID')}</p>
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-white">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Accuracy: 94% | QA/QC Verified</span>
                    <Badge className="bg-green-500 text-[8px] uppercase font-black border-none text-white">TBJ OS v2.4</Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-12 md:grid-cols-12">
                <div className="md:col-span-8 space-y-12">
                  {aiEstimation ? (
                    <div className="border-4 border-black p-8 md:p-12 space-y-10 relative overflow-hidden bg-white shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] rounded-3xl group" id="ai-result-card">
                      {/* Document Elements */}
                      <div className="absolute top-0 right-0 bg-black text-white px-8 py-3 text-[12px] font-black uppercase tracking-[0.4em] rotate-0">OFFICIAL REPORT</div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20">
                            <Brain className="w-8 h-8" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-black">AI Result Card</h3>
                            <p className="uppercase-soft text-neutral-400">Project Code: {Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-12 w-12 rounded-xl border-2 border-black hover:border-green-500 hover:text-green-500 transition-all shadow-md active:translate-y-1"
                            onClick={() => {
                              const message = `*ESTIMASI RAB - TUKANG BANGUNAN JAKARTA*%0AProyek: ${projectData.name || projectData.type}%0ATotal Biaya: Rp ${totalEstimate.toLocaleString('id-ID')}%0A%0AInformasi lebih lanjut hubungi: 081213496672%0A_Dibuat via TBJ Constech OS_`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
                            }}
                          >
                            <Phone className="w-5 h-5 text-green-500" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-12 w-12 rounded-xl border-2 border-black hover:border-accent hover:text-accent transition-all shadow-md active:translate-y-1"
                            onClick={() => {
                              navigator.share?.({
                                title: 'Estimasi Proyek TBJ Constech',
                            text: `Estimasi budget proyek saya: Rp ${(totalEstimate || 0).toLocaleString('id-ID')}`,
                                url: window.location.href
                              }).catch(() => {
                                navigator.clipboard.writeText(window.location.href);
                                toast.info("Link disalin!", { description: "Gunakan tombol share browser untuk membagikan." });
                              });
                            }}
                          >
                            <Share2 className="w-5 h-5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-12 w-12 rounded-xl border-2 border-black hover:bg-black hover:text-white transition-all shadow-md active:translate-y-1"
                            onClick={() => {
                              toast.info("Generating HQ Document...", { description: "Harap tunggu sebentar." });
                              setTimeout(() => window.print(), 1000);
                            }}
                          >
                            <Download className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>

                      <div className="bg-neutral-50 p-8 border-l-8 border-accent rounded-r-3xl relative">
                        <Quote className="absolute -top-4 -left-4 w-12 h-12 text-accent/5 rotate-12" />
                        <h4 className="text-xs font-black uppercase tracking-widest text-accent mb-4 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" /> Strategic AI Summary
                        </h4>
                        <p className="text-sm md:text-base text-neutral-700 leading-relaxed font-medium italic">"{aiEstimation.analysis}"</p>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <Calculator className="w-5 h-5 text-neutral-400" />
                          <h4 className="text-sm font-black uppercase tracking-widest text-black">Item breakdown & Cost Estimates:</h4>
                        </div>
                        <div className="grid gap-6">
                          {aiEstimation.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start border-b-2 border-neutral-100 pb-6 last:border-0 group/item">
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-accent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                  <div className="flex items-center gap-2">
                                    <p className="font-black text-sm uppercase tracking-widest leading-none group-hover/item:text-accent transition-colors text-black">{item.name}</p>
                                    {item.priority && (
                                      <Badge variant="outline" className={cn(
                                        "text-[7px] uppercase border-black/10 py-0 h-4",
                                        item.priority === "Urgent" ? "bg-red-50 text-red-600" :
                                        item.priority === "High" ? "bg-orange-50 text-orange-600" :
                                        item.priority === "Low" ? "bg-blue-50 text-blue-600" : "bg-neutral-50"
                                      )}>
                                        {item.priority}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-[11px] text-neutral-500 leading-relaxed max-w-lg font-medium">{item.reasoning}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono text-xs font-black bg-neutral-100 px-3 py-1 rounded-md mb-2">{item.quantity} {item.unit}</p>
                                {(user?.role === 'admin' || user?.role === 'pm' || (user?.tier === 'deal' && user?.waVerified)) && (
                                  <p className="text-[10px] font-black text-neutral-400">Validated Item Breakdown</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-black text-white p-8 md:p-10 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-8 border-[1.75px] border-black shadow-2xl relative overflow-hidden">
                        <div className="space-y-2 text-center md:text-left relative z-10">
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500">Gross Estimation Total</p>
                          <h3 className="text-4xl md:text-5xl font-black tracking-tighter tabular-nums">Rp {(totalEstimate || 0).toLocaleString('id-ID')}</h3>
                          <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest">Calculated by TBJ Neural Engine v4.0</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full md:w-auto">
                          <Button 
                            className="btn-orange h-14 px-8 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-accent/20 active:translate-y-1 transition-all flex-1 md:flex-none"
                            onClick={() => generateAIPDF(projectData.name || "Estimation", aiEstimation)}
                          >
                            <Download className="w-5 h-5 mr-3" /> Download RAB
                          </Button>
                          <Button 
                            variant="outline"
                            className="h-14 px-8 bg-white/10 hover:bg-white/20 border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] active:translate-y-1 transition-all flex-1 md:flex-none"
                            onClick={() => {
                              const invoiceData = {
                                number: `INV-${new Date().getFullYear()}${Math.floor(Math.random() * 10000)}`,
                                date: new Date().toLocaleDateString('id-ID'),
                                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'),
                                clientName: user?.displayName || "Guest",
                                clientPhone: (user as any)?.phone || "-",
                                projectName: projectData.name || "AI Estimation",
                                items: aiEstimation.items.map((it: any) => ({
                                  desc: it.name,
                                  qty: it.quantity,
                                  unit: it.unit,
                                  price: it.pricePerUnit,
                                  total: it.totalPrice
                                })),
                                total: aiEstimation.totalEstimatedCost,
                                bankInfo: {
                                  bank: "BRI",
                                  accNo: "4792-0103-1488-535",
                                  accName: "TBJ CONTRACTOR"
                                }
                              };
                              generateInvoicePDF(invoiceData);
                            }}
                          >
                            <FileText className="w-5 h-5 mr-3" /> View Invoice
                          </Button>
                        </div>
                      </div>

                      {/* Official Footer */}
                      <div className="pt-10 border-t-4 border-black flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-black flex items-center justify-center rounded-xl">
                            <ShieldCheck className="w-6 h-6 text-accent" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase leading-none text-black">AI Verified Security</p>
                            <p className="text-[8px] uppercase-soft mt-1">Encrypted & Immutable Report</p>
                          </div>
                        </div>
                        <div className="text-center md:text-right">
                          <p className="uppercase-soft text-neutral-400 text-[10px] mb-1">Final AI Assessment</p>
                          <p className="text-4xl font-black tracking-tighter text-black">Rp {(totalEstimate || 0).toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-4 border-black border-dashed p-12 text-center rounded-3xl space-y-4 bg-white">
                      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tighter">Mempersiapkan Analisa AI...</h3>
                      <p className="uppercase-soft text-neutral-400">Harap tunggu sebentar, Chief Estimator sedang menghitung volume dan harga teknis proyek Anda.</p>
                    </div>
                  )}

                  {/* RAB Detail for Privileged Tiers */}
                  {(user?.tier === "deal" || user?.role === "admin") && aiEstimation && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8">
                       <div className="flex items-center gap-3 border-b-2 border-black pb-4">
                         <FileText className="w-6 h-6 text-accent" />
                         <h3 className="text-xl font-black uppercase tracking-tighter text-black">Detailed RAB Preview (Tier 3)</h3>
                       </div>
                       <Card className="border-2 border-black rounded-3xl overflow-hidden shadow-lg">
                           <table className="w-full text-left border-collapse">
                            <thead className="bg-neutral-50">
                              <tr className="border-b-2 border-black text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                <th className="p-6">Work Item</th>
                                <th className="p-6 text-center">Volume</th>
                                <th className="p-6 text-right text-black font-black">Sub-Total Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                              {aiEstimation.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                                  <td className="p-6">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-black uppercase tracking-widest text-black">{item.name}</p>
                                      {item.priority && (
                                        <Badge variant="outline" className={cn(
                                          "text-[7px] uppercase border-black/10 py-0 h-4",
                                          item.priority === "Urgent" ? "bg-red-50 text-red-600" :
                                          item.priority === "High" ? "bg-orange-50 text-orange-600" :
                                          item.priority === "Low" ? "bg-blue-50 text-blue-600" : "bg-neutral-50"
                                        )}>
                                          {item.priority}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[9px] text-neutral-400 mt-1 uppercase-soft">{item.reasoning}</p>
                                  </td>
                                  <td className="p-6 text-center text-xs font-bold font-mono">{item.quantity} {item.unit}</td>
                                  <td className="p-6 text-right text-[10px] font-black uppercase">Calculated</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-black text-white">
                              <tr>
                                <td colSpan={2} className="p-6 text-xs font-black uppercase tracking-[0.2em]">Validated Construction Total</td>
                                <td className="p-6 text-right text-2xl font-black tracking-tighter text-white">Rp {(aiEstimation.totalEstimatedCost || 0).toLocaleString('id-ID')}</td>
                              </tr>
                            </tfoot>
                          </table>
                       </Card>
                    </div>
                  )}
                </div>

                <div className="md:col-span-4 space-y-8">
                  {/* Payment Instructions Card */}
                  <Card className="border-4 border-accent rounded-3xl bg-accent/5 p-8 space-y-6 shadow-xl shadow-accent/5 relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-accent opacity-5 rotate-45" />
                    <div className="space-y-2">
                      <Badge className="bg-accent text-white uppercase text-[10px] font-black px-3 py-1 rounded-md border-none">Next Step: Assessment</Badge>
                      <h3 className="text-2xl font-black uppercase tracking-tighter text-black leading-tight">Mulai Digital Assessment Spesifik</h3>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border-2 border-accent/20 space-y-4">
                      <div className="flex justify-between items-center text-sm font-black uppercase tracking-tight">
                        <span className="text-neutral-400">Total Biaya Survey</span>
                        <span className="text-accent text-2xl font-black">Rp {(systemConfig?.surveyFee || 399000).toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent" /> Key Benefits:
                      </h4>
                      <ul className="space-y-3">
                        {(cmsConfig?.surveyBenefits || [
                          "Validasi Teknis & Pengukuran Presisi",
                          "Pemeriksaan Struktur & Kelistrikan",
                          "Prioritas Jadwal Pelaksanaan"
                        ]).map((benefit, i) => (
                          <li key={i} className="flex items-center gap-3 text-[10px] font-bold uppercase text-neutral-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent" /> {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button 
                      className="w-full bg-black text-white hover:bg-neutral-800 rounded-2xl h-16 font-black uppercase tracking-[0.2em] text-[12px] shadow-lg active:translate-y-1 transition-all"
                      onClick={() => setStep(6)}
                    >
                      Konfirmasi & Jadwalkan Survey &rarr;
                    </Button>
                    
                    <p className="text-[9px] text-center text-neutral-400 italic uppercase font-bold tracking-widest leading-relaxed">
                      {cmsConfig?.surveyPaymentTerms || "*Biaya ini akan kami kembalikan (potong dana) saat proyek Anda dieksekusi."}
                    </p>
                  </Card>

                  {/* Testimonial / Social Proof */}
                  <Card className="border-2 border-black rounded-3xl p-8 space-y-6 bg-neutral-50 relative">
                     <Quote className="absolute top-4 right-4 w-8 h-8 text-black/5" />
                     <div className="flex gap-1 text-accent">
                       {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-accent text-accent" />)}
                     </div>
                     <p className="text-[11px] font-medium leading-relaxed italic text-neutral-600">
                       "AI Estimator TBJ sangat akurat dibandingkan vendor lain. Sangat menghemat waktu perencanaan saya."
                     </p>
                     <div className="flex items-center gap-3 border-t border-black/5 pt-4">
                       <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-[10px] font-black">AD</div>
                       <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-black">Andy Darmawan</p>
                         <p className="text-[9px] uppercase-soft text-neutral-400">Interior Project BSD</p>
                       </div>
                     </div>
                  </Card>
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
            <div className="p-8 md:p-12 space-y-12 text-center animate-in fade-in slide-in-from-bottom-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-black uppercase tracking-tighter">Konfirmasi Pembayaran Survey</h2>
                <p className="uppercase-soft text-neutral-500">Silakan pilih metode pembayaran untuk Digital Assessment</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <div className="p-8 border-[1.75px] border-black rounded-[40px] bg-white space-y-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-[280px] h-[280px] border-[0.75px] border-primary/20 rounded-3xl p-2 bg-white flex items-center justify-center shadow-inner overflow-hidden">
                      <img 
                        src={qrisImage} 
                        alt="QRIS TBJ" 
                        className="w-[280px] h-[280px] object-contain" 
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-black uppercase tracking-tighter">QRIS TUKANG BANGUNAN JAKARTA</p>
                      <p className="text-[10px] font-bold uppercase text-neutral-400">{cmsConfig?.paymentQrisInstructions || "Scan & Pay via All E-Wallet / Mobile Banking"}</p>
                    </div>
                  </div>
                </div>

                <div className="p-8 border-4 border-primary rounded-[40px] bg-primary/5 space-y-6 shadow-[12px_12px_0px_0px_rgba(255,107,0,0.2)]">
                  <div className="space-y-6 py-4">
                    <div className="bg-white p-6 rounded-3xl border-2 border-primary/20 flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black italic">{cmsConfig?.paymentBankName || "BRI"}</div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase text-neutral-400">Nomor Rekening {cmsConfig?.paymentBankName || "BRI"}</p>
                        <p className="text-xl font-black tracking-tighter">{cmsConfig?.paymentAccountNumber || "4792-0103-1488-535"}</p>
                        <p className="text-[9px] font-bold uppercase text-neutral-500">an {cmsConfig?.paymentAccountHolder || "TUKANG BANGUNAN JAKARTA"}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-primary text-white rounded-2xl">
                      <p className="text-[11px] font-black uppercase tracking-widest mb-1">Biaya Digital Assessment</p>
                      <p className="text-3xl font-black italic">Rp {(systemConfig?.surveyFee || 399000).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  <Button className="w-full bg-black text-white h-14 rounded-2xl uppercase-soft text-[11px] font-black" onClick={async () => {
                    await updateProfile({ tier: "survey", lifetimeAccess: true });
                    toast.success("Konfirmasi terkirim! Tim kami akan segera menghubungi Anda.");
                    setTimeout(() => window.location.reload(), 1500);
                  }}>
                    Saya Sudah Bayar &rarr;
                  </Button>
                </div>
              </div>

              <div className="pt-8 flex flex-col items-center gap-4">
                <Button variant="ghost" className="uppercase-soft text-[10px] font-black" onClick={() => setStep(5)}>
                  &larr; Kembali ke Ringkasan
                </Button>
                <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl border border-black/5">
                  <Phone className="w-4 h-4 text-green-600" />
                  <p className="text-[10px] font-bold uppercase">Butuh Bantuan? Langsung hubungi Admin via WhatsApp</p>
                </div>
              </div>
            </div>
          )}

          {step === 10 && (
            <div className="p-4 md:p-8 space-y-8 md:space-y-12 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-neutral-200 pb-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="h-8 md:h-10 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-neutral-400" onClick={() => setStep(1)}>
                      &larr; Categories
                    </Button>
                    <Badge variant="outline" className="border-accent/20 text-accent uppercase font-black tracking-[0.2em] px-3 py-0.5 text-[8px] md:text-[10px]">Phase: Market Insight</Badge>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-black leading-none">TBJ Property Hub</h2>
                  <p className="uppercase-soft text-neutral-500 max-w-xl text-[10px] md:text-sm">
                    Investasi Properti Strategis, Titip Bangun, dan Solusi Legalitas IMB/PBG dalam satu platform.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 p-1 bg-neutral-100/50 rounded-2xl w-full md:w-auto">
                  {(['all', 'jual', 'legal', 'kerjasama'] as const).map((cat) => (
                    <Button 
                      key={cat}
                      variant="ghost" 
                      size="sm" 
                      className={cn(
                        "rounded-xl text-[7px] md:text-[8px] uppercase font-black px-3 md:px-4 h-8 flex-grow md:flex-grow-0",
                        (propFilter === cat || (cat === 'all' && !propFilter)) ? "bg-black text-white" : "text-neutral-400"
                      )}
                      onClick={() => setPropFilter(cat === 'all' ? null : cat as any)}
                    >
                      {cat === 'jual' ? 'Jual & Sewa' : cat === 'legal' ? 'Perizinan' : cat === 'kerjasama' ? 'Synergy Lab' : cat}
                    </Button>
                  ))}
                </div>
              </div>

              {properties.filter(p => (p.published !== false) && (!propFilter || p.type === propFilter)).length > 0 ? (
                <div className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {properties
                    .filter(p => (p.published !== false) && (!propFilter || p.type === propFilter))
                    .map(p => (
                    <Card key={p.id} className="border border-neutral-200 rounded-2xl md:rounded-3xl overflow-hidden group hover:shadow-xl transition-all duration-500 bg-white">
                      <div className="h-40 md:h-48 relative overflow-hidden">
                        <img 
                          src={getDriveImageUrl(p.photos[0]) || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800"} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          referrerPolicy="no-referrer" 
                        />
                        <Badge className="absolute top-3 md:top-4 left-3 md:left-4 bg-black/80 backdrop-blur-sm text-white px-2 md:px-3 py-1 rounded-lg uppercase-soft text-[7px] md:text-[8px] border-none">
                          {p.type === 'kerjasama' ? 'Synergy Lab' : p.type === 'jual' ? 'Jual & Sewa' : p.type === 'legal' ? 'Legal & Perizinan' : p.type}
                        </Badge>
                      </div>
                      <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="text-base md:text-lg font-black uppercase tracking-tighter leading-tight group-hover:text-accent transition-colors cursor-pointer">{p.title}</h3>
                        </div>
                        <div className="flex items-center gap-3 md:gap-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-neutral-400">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {p.location || "Jakarta"}
                          </div>
                          <div className="flex items-center gap-1">
                            <Layers className="w-3 h-3" /> {p.area} m2
                          </div>
                        </div>
                        <div className="pt-3 md:pt-4 border-t border-neutral-100 flex justify-between items-center">
                          <p className="text-lg md:text-xl font-black text-accent">Rp {p.price.toLocaleString('id-ID')}</p>
                          <Button variant="outline" size="sm" className="rounded-xl border-neutral-200 text-[10px] md:text-[11px] font-black uppercase px-3 md:px-4 h-8 md:h-9" onClick={() => window.open(`https://wa.me/6281213496672?text=Halo Admin TBJ, saya tertarik dengan unit *${p.title}* yang ada di Property Hub. Mohon info lebih lanjut.`, '_blank')}>
                            Inquiry
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 md:py-20 space-y-6 bg-neutral-50 rounded-3xl md:rounded-[40px] border-2 md:border-4 border-neutral-200 border-dashed">
                  <div className="w-20 md:w-24 h-20 md:h-24 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Home className="w-10 md:w-12 h-10 md:h-12" />
                  </div>
                  <div className="space-y-4 px-6">
                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-black">Listing Sedang Diperbarui</h3>
                    <p className="uppercase-soft text-neutral-500 max-w-md mx-auto leading-relaxed text-[10px] md:text-xs">
                      Katalog properti strategis sedang dalam fase sinkronisasi. Kami sedang memverifikasi unit baru untuk menjamin keamanan investasi Anda.
                    </p>
                  </div>
                  <Button 
                    className="btn-accent h-12 md:h-14 px-8 md:px-10 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl shadow-accent/10"
                    onClick={() => window.open('https://wa.me/6281213496672', '_blank')}
                  >
                    Konsultasi Unit Offline
                  </Button>
                </div>
              )}

              <div className="pt-8 flex justify-center">
                <Button variant="ghost" className="h-12 md:h-14 px-8 md:px-10 uppercase font-black tracking-widest text-[10px] md:text-xs text-neutral-400 hover:text-black" onClick={() => setStep(1)}>
                  &larr; General Categories
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="sm:max-w-sm p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">Verifikasi WhatsApp</DialogTitle>
            <DialogDescription className="text-center uppercase-soft">
              {!otpSent ? "Masukkan nomor WhatsApp Anda untuk menerima kode verifikasi." : "Masukkan kode yang kami kirimkan ke WhatsApp Anda."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            {!otpSent ? (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Nomor WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <Input 
                    placeholder="08xxxxxxxxxx" 
                    className="pl-10 h-12 border-2 border-black/10 rounded-xl font-bold"
                    value={waNumber}
                    onChange={e => setWaNumber(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Kode OTP</Label>
                <Input 
                  placeholder="----" 
                  className="h-12 border-2 border-black/10 rounded-xl font-bold text-center tracking-[1em]"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            {!otpSent ? (
              <Button 
                className="w-full btn-orange h-12 rounded-xl" 
                disabled={isVerifying || !waNumber}
                onClick={async () => {
                  setIsVerifying(true);
                  // Mock OTP send
                  setTimeout(() => {
                    setOtpSent(true);
                    setIsVerifying(false);
                    toast.success("Kode OTP terkirim ke WhatsApp Anda!");
                  }, 1500);
                }}
              >
                {isVerifying ? <Loader2 className="animate-spin w-4 h-4" /> : "Kirim OTP"}
              </Button>
            ) : (
              <Button 
                className="w-full btn-sleek h-12 rounded-xl" 
                disabled={isVerifying || otpCode.length < 4}
                onClick={async () => {
                  setIsVerifying(true);
                  await handleVerifyOtp(otpCode);
                  setIsVerifying(false);
                }}
              >
                {isVerifying ? <Loader2 className="animate-spin w-4 h-4" /> : "Verifikasi"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ClientDashboard = ({ user }: { user: any }) => {
  const navigate = useNavigate();
  const { projects, loading } = useProjects(user.uid);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const { project, categories, items } = useProjectDetails(selectedProject || undefined);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  if (!selectedProject && projects.length > 0) {
    return (
      <div className="space-y-12 animate-in fade-in duration-500">
        <div className="text-center space-y-3">
          <Badge variant="outline" className="border-black font-black uppercase text-[10px] tracking-[0.2em] px-6 py-1">Project Command Center</Badge>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-black">Monitoring Real-Time</h1>
          <p className="text-neutral-500 uppercase-soft text-xs max-w-xl mx-auto leading-relaxed">
            Pantau progress harian, transparansi RAB, dan dokumentasi visual proyek Anda 
            langsung dari database TBJ OS.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 max-w-6xl mx-auto">
          {projects.map(p => (
            <Card 
              key={p.id} 
              className="cursor-pointer border-4 border-black group hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-300 rounded-[2.5rem] overflow-hidden" 
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <div className="h-48 relative overflow-hidden bg-neutral-100 border-b-4 border-black">
                 {p.thumbnail ? (
                   <img src={getDriveImageUrl(p.thumbnail)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center bg-black/5">
                      <Building2 className="w-12 h-12 text-black/10" />
                   </div>
                 )}
                 <div className="absolute top-4 right-4">
                    <Badge className={cn(
                      "uppercase font-black text-[9px] px-4 py-1.5 shadow-md border-none",
                      p.status === "active" ? "bg-green-500 text-white" : 
                      p.status === "survey" ? "bg-blue-500 text-white" : "bg-neutral-400 text-white"
                    )}>
                      {p.status === "active" ? "Operational" : 
                       p.status === "survey" ? "Survey Phase" : "Draft Report"}
                    </Badge>
                 </div>
              </div>
              <CardHeader className="p-8 pb-4">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tighter group-hover:text-accent transition-colors">{p.name}</h3>
                  <p className="text-[10px] font-bold uppercase-soft text-neutral-400 line-clamp-1">{p.description}</p>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                <div className="flex justify-between items-end border-t-2 border-black/5 pt-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Total Budgeting</p>
                    <p className="text-xl font-black italic">Rp {p.totalBudget.toLocaleString('id-ID')}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full border-2 border-black group-hover:bg-black group-hover:text-white transition-all">
                    <ArrowRight className="w-5 h-5" />
                  </Button>
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
                <div className="flex items-center gap-4 p-4 border border-black/10 rounded-xl">
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
              <Card className="border border-black/10 bg-accent text-white rounded-2xl overflow-hidden shadow-lg">
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

const LoginPage = ({ onLogin, onGuestLogin, cmsConfig }: { onLogin: () => void; onGuestLogin: () => void; cmsConfig: any }) => (
  <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-16 py-20">
    <div className="text-center space-y-6">
      <div className="inline-block border-2 border-black px-4 py-1 text-[10px] font-mono uppercase tracking-[0.4em] mb-4">
        Construction OS v1.0
      </div>
      <h1 className="text-[10vw] font-black tracking-tighter text-black uppercase leading-[0.8] heading-edge">
        {cmsConfig?.heroTitle || "Tukang Bangunan Jakarta"}
      </h1>
      <p className="text-neutral-400 font-mono text-sm uppercase tracking-[0.2em] max-w-xl mx-auto">
        {cmsConfig?.heroSubtitle || "Platform konstruksi modern dengan integrasi AI Estimator & Real-time Management."}
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

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl px-4 relative">
      <div className="absolute inset-0 bg-neutral-100/50 -skew-y-3 -z-10 translate-y-20 rounded-[8rem]" />
      {[
        { 
          label: "Smart Estimation", 
          val: "PRECISION", 
          icon: Brain, 
          desc: "Analisis RAB akurat berbasis AI & database material terkini untuk efisiensi biaya maksimal.",
          color: "text-orange-500",
          bg: "bg-orange-50"
        },
        { 
          label: "Project Control", 
          val: "REAL-TIME", 
          icon: LayoutDashboard, 
          desc: "Monitoring progress harian & manajemen keuangan secara transparan langsung dari genggaman.",
          color: "text-blue-500",
          bg: "bg-blue-50"
        },
        { 
          label: "Quality Shield", 
          val: "TRUSTED", 
          icon: ShieldCheck, 
          desc: "Garansi hasil pengerjaan dengan standarisasi teknik TBJ & pengawasan ketat Proyek Manajer.",
          color: "text-green-500",
          bg: "bg-green-50"
        }
      ].map((item, idx) => (
        <Card key={idx} className="group p-10 border-2 border-black rounded-[2.5rem] bg-white hover:bg-black hover:text-white transition-all duration-500 hover:-translate-y-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:shadow-none overflow-hidden relative">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-neutral-50 rounded-full opacity-0 group-hover:opacity-10 transition-opacity" />
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border-2 border-black/5 group-hover:border-white/20 transition-colors", item.bg, "group-hover:bg-white/10")}>
            <item.icon className={cn("w-8 h-8", item.color, "group-hover:text-white")} />
          </div>
          <p className="font-black text-5xl tracking-tighter italic mb-3 leading-none">{item.val}</p>
          <p className="text-[10px] text-neutral-400 uppercase tracking-[0.4em] font-black mb-6 group-hover:text-neutral-500">{item.label}</p>
          <p className="text-xs font-medium lowercase leading-relaxed opacity-60 group-hover:opacity-100">
            {item.desc}
          </p>
          <div className="mt-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
             <div className="h-0.5 w-8 bg-accent" />
             <span className="text-[10px] font-black uppercase tracking-widest text-accent">Learn More</span>
          </div>
        </Card>
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
            <div className="overflow-x-auto w-full max-w-full">
              <Table className="min-w-[800px] md:min-w-full">
                <TableHeader className="bg-neutral-50/50">
                  <TableRow className="border-b border-black/5">
                    <TableHead className="text-[10px] uppercase tracking-widest py-6">Kode ID</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest">Kategori</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest">Pekerjaan</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest">Satuan</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest text-right">Harga (Rp)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMasterData.map(item => (
                    <TableRow key={item.id} className="border-b border-black/5 last:border-0 hover:bg-neutral-50/30 transition-colors">
                      <TableCell className="font-mono text-[10px] text-neutral-400 font-bold">{item.code || "N/A"}</TableCell>
                      <TableCell><Badge variant="outline" className="tag-sleek mb-0 truncate max-w-[120px]">{item.category}</Badge></TableCell>
                      <TableCell className="font-medium text-sm py-4">
                        <div className="max-w-[200px] md:max-w-[300px]">
                          <Textarea 
                            defaultValue={item.name} 
                            className="border-none bg-transparent p-0 min-h-[40px] focus-visible:ring-0 font-bold uppercase tracking-tight text-[10px] md:text-[11px] resize-none break-words whitespace-normal leading-tight h-auto overflow-hidden"
                            onBlur={(e) => updateMasterItem(item.id, { name: e.target.value })}
                            onInput={(e: any) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                          />
                        </div>
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
  const { config: cmsConfig } = useCMSConfig();

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center gap-4">
    <Loader2 className="animate-spin w-12 h-12 text-accent" />
    <p className="text-xs font-black uppercase tracking-[0.3em] animate-pulse">Loading TBJ Ecosystem...</p>
  </div>;

  const isAdmin = user?.role === "admin";
  const isPM = user?.role === "pm";
  const isManagerial = isAdmin || isPM;
  const isClient = user?.role === "user";

  return (
    <ErrorBoundary>
      <Router>
        <Layout user={user} onLogout={logout} onLogin={login}>
          <Routes>
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/gallery" element={<Gallery />} />
            {!user ? (
              <Route path="*" element={<LoginPage onLogin={login} onGuestLogin={loginAsGuest} cmsConfig={cmsConfig} />} />
            ) : (
              <>
                {/* Managerial Routes */}
                {isManagerial && (
                  <>
                    {isAdmin && <Route path="/admin" element={<AdminPanel />} />}
                    <Route path="/pm" element={<PMDashboard />} />
                    <Route path="/ai-agent" element={<AIAgent />} />
                  </>
                )}
                
                <Route path="/projects" element={<ProjectsPage user={user} />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />

                {isAdmin && (
                   <>
                    <Route path="/master" element={<AdminMasterPage />} />
                    <Route path="/import" element={<ImportPage />} />
                   </>
                )}

                {/* Client Routes */}
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:id" element={<Profile />} />
        <Route path="/assistant" element={<VirtualAssistant user={user} updateProfile={updateProfile} />} />
        <Route path="/ai-estimator" element={<VirtualAssistant user={user} updateProfile={updateProfile} />} />
        <Route path="/rab" element={<RabPage user={user} />} />
                <Route path="/ai-agent" element={<AIAgent />} />
                
                {/* Default Redirect */}
                <Route path="/" element={user?.role === "admin" ? <AdminPanel /> : user?.role === "pm" ? <PMDashboard /> : <Profile />} />
                <Route path="*" element={<NotFoundRedirect />} />
              </>
            )}
          </Routes>
        </Layout>
        <Toaster />
      </Router>
    </ErrorBoundary>
  );
}


