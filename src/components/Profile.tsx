import { useState } from "react";
import { useProjects, useAuth, useWorkforce, useUser, useSystemConfig, useProjectDetails } from "@/lib/hooks";
import { formatRupiah, calculateAdminPrice, calculateClientPrice, getDriveImageUrl } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Loader2, LayoutDashboard, FileText, Clock, CheckCircle2, TrendingUp, Calendar, MapPin, Plus, Camera, CreditCard, ShieldCheck, AlertCircle, ChevronRight, Check, MessageSquare, User, Zap, Lock, Users, Phone, Briefcase, ArrowLeft, Ruler, Layers } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Profile() {
  const { user: currentUser, updateProfile } = useAuth();
  const { config: sysConfig } = useSystemConfig();
  const { id } = useParams();
  const { user: profileUser, loading: userLoading } = useUser(id);
  const user = id ? profileUser : currentUser;
  const { projects, loading: projectsLoading } = useProjects(user?.uid);
  const { workforce } = useWorkforce(currentUser?.role, currentUser?.tier);
  const navigate = useNavigate();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    formalName: user?.formalName || "",
    nik: user?.nik || "",
    whatsapp: user?.whatsapp || "",
    address: user?.address || ""
  });

  const loading = userLoading || projectsLoading;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  if (user?.tier === 'prospect') {
    return (
      <div className="space-y-12 py-12 flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-12 h-12 text-accent" />
        </div>
        <div className="space-y-4 max-w-2xl px-4">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Dashboard Locked</h1>
          <p className="uppercase-soft text-neutral-500 text-base md:text-lg">
            Dashboard eksklusif hanya tersedia untuk member Tier 2 & 3. 
            Silahkan lakukan pembayaran Digital Assessment untuk membuka akses penuh.
          </p>
          <div className="pt-8">
            <Button onClick={() => navigate("/assistant")} className="btn-accent h-14 px-12 text-sm">
              Book Digital Assessment Now
            </Button>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 w-full max-w-5xl pt-20">
          {[
            { title: "Real-time Tracking", desc: "Pantau progress proyek harian via CCTV & Foto." },
            { title: "Financial Transparency", desc: "Detail RAB & termin pembayaran yang transparan." },
            { title: "Priority Support", desc: "Direct chat ke Architect & Project Manager." }
          ].map((feature, i) => (
            <div key={i} className="p-8 border-2 border-black rounded-3xl space-y-4">
              <h3 className="text-xl font-black uppercase tracking-tighter">{feature.title}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isIdentityComplete = user?.formalName && user?.nik && user?.whatsapp && user?.address;

  const handleSaveProfile = async () => {
    try {
      await (updateProfile as any)(profileFormData);
      setIsEditingProfile(false);
      toast.success("Identity updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile.");
    }
  };

  return (
    <div className="space-y-12 py-8">
      {id && (
        <Button variant="ghost" className="uppercase-soft text-[10px] font-black gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" /> Back to Admin Panel
        </Button>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-black pb-8 gap-4 px-4 md:px-0">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">{id ? "Client View" : "Client Dashboard"}</h1>
          <p className="uppercase-soft text-neutral-500 text-xs md:text-sm">
            {id ? `Viewing dashboard for ${user?.displayName}` : `Selamat datang, ${user?.displayName}. Pantau progres proyek Anda secara real-time.`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className="bg-accent text-white rounded-md px-4 py-1 uppercase-soft">Tier {(user?.tier as string) === 'prospect' ? '1' : user?.tier === 'survey' ? '2' : '3'}</Badge>
          {!id && (
            <Button variant="outline" size="sm" onClick={() => {
              setProfileFormData({
                formalName: user?.formalName || "",
                nik: user?.nik || "",
                whatsapp: user?.whatsapp || "",
                address: user?.address || ""
              });
              setIsEditingProfile(true);
            }} className="h-8 rounded-xl border-black text-[10px] font-black uppercase">
              Update Identity
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="border-4 border-black rounded-[2.5rem] max-w-lg p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic text-accent">Identity Verification Form</DialogTitle>
            <DialogDescription className="uppercase-soft">Data ini digunakan untuk otentikasi kontrak digital TBJ.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nama Lengkap (Sesuai KTP)</Label>
              <Input 
                value={profileFormData.formalName} 
                onChange={e => setProfileFormData({...profileFormData, formalName: e.target.value})}
                placeholder="CONTOH: BUDI SANTOSO"
                className="h-12 border-2 border-black rounded-xl font-black uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nomor KTP (NIK)</Label>
              <Input 
                value={profileFormData.nik} 
                onChange={e => setProfileFormData({...profileFormData, nik: e.target.value})}
                placeholder="16 DIGIT NIK"
                className="h-12 border-2 border-black rounded-xl font-mono font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">WhatsApp Aktif</Label>
              <Input 
                value={profileFormData.whatsapp} 
                onChange={e => setProfileFormData({...profileFormData, whatsapp: e.target.value})}
                placeholder="081234567890"
                className="h-12 border-2 border-black rounded-xl font-bold font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Alamat Domisili / Korespondensi</Label>
              <Textarea 
                value={profileFormData.address} 
                onChange={e => setProfileFormData({...profileFormData, address: e.target.value})}
                placeholder="Alamat Lengkap..."
                className="border-2 border-black rounded-xl min-h-[100px] font-medium"
              />
            </div>
            <Button onClick={handleSaveProfile} className="w-full h-14 bg-black text-white hover:bg-neutral-800 rounded-2xl font-black uppercase tracking-widest shadow-xl">
               Save Identity Details &rarr;
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 px-4 md:px-0">
        <Card className="border-2 border-black rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase-soft text-[8px] md:text-[10px]">Total Proyek</CardDescription>
            <CardTitle className="text-2xl md:text-4xl font-black">{projects.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-2 border-black rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase-soft text-[8px] md:text-[10px]">Proyek Aktif</CardDescription>
            <CardTitle className="text-2xl md:text-4xl font-black">{projects.filter(p => p.status === 'active').length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-2 border-black rounded-2xl bg-black text-white col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase-soft text-white/60 text-[8px] md:text-[10px]">Total Investasi</CardDescription>
            <CardTitle className="text-xl md:text-2xl lg:text-3xl font-black truncate">{formatRupiah(projects.reduce((sum, p) => sum + p.totalBudget, 0))}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {user?.tier === 'deal' && (
        <div className="grid md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4">
          <Card className="border border-neutral-100 bg-neutral-50/50 rounded-2xl p-4 flex items-center gap-4 hover:bg-white transition-colors cursor-pointer group">
            <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[10px] font-black uppercase tracking-tighter">Architect Chat</h3>
              <p className="text-[8px] text-neutral-400 uppercase font-bold">Direct Line</p>
            </div>
          </Card>
          <Card className="border border-neutral-100 bg-neutral-50/50 rounded-2xl p-4 flex items-center gap-4 hover:bg-white transition-colors cursor-pointer group">
            <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[10px] font-black uppercase tracking-tighter">Priority Support</h3>
              <p className="text-[8px] text-neutral-400 uppercase font-bold">Fast Response</p>
            </div>
          </Card>
          <Card className="border border-neutral-100 bg-neutral-50/50 rounded-2xl p-4 flex items-center gap-4 hover:bg-white transition-colors cursor-pointer group">
            <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[10px] font-black uppercase tracking-tighter">Live CCTV</h3>
              <p className="text-[8px] text-neutral-400 uppercase font-bold">Site Monitor</p>
            </div>
          </Card>
          <Card className="border border-neutral-100 bg-neutral-50/50 rounded-2xl p-4 flex items-center gap-4 hover:bg-white transition-colors cursor-pointer group">
            <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[10px] font-black uppercase tracking-tighter">Daily Logs</h3>
              <p className="text-[8px] text-neutral-400 uppercase font-bold">Project History</p>
            </div>
          </Card>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Proyek Saya</h2>
          <Button onClick={() => navigate("/assistant")} className="btn-orange h-10 px-6 text-[10px]">
            <Plus className="w-4 h-4 mr-2" /> Ajukan Proyek Baru
          </Button>
        </div>

        <div className="grid gap-8">
          {projects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              navigate={navigate} 
              sysConfig={sysConfig}
              currentUser={currentUser}
              setIsEditingProfile={setIsEditingProfile}
              setProfileFormData={setProfileFormData}
            />
          ))}          {projects.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-black/5 rounded-3xl">
              <h3 className="text-xl font-black uppercase tracking-tighter text-neutral-400">Belum Ada Proyek Aktif</h3>
              <p className="uppercase-soft text-neutral-400 mt-2 font-bold">Daftarkan proyek Anda untuk mulai membangun bersama TBJ.</p>
              <Button onClick={() => navigate("/assistant")} className="btn-accent mt-8 h-12 px-8 uppercase-soft text-xs">
                Daftar Proyek Sekarang
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* S-Curve Placeholder */}
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-2 border-black rounded-2xl p-8 space-y-6">
          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" /> Kurva-S Proyek
          </h3>
          <div className="h-64 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 flex items-center justify-center">
            <p className="uppercase-soft text-neutral-400">Visualisasi Kurva-S akan muncul di Tier 3</p>
          </div>
        </Card>
        <Card className="border-2 border-black rounded-2xl p-8 space-y-6">
          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" /> Timeline & Milestone
          </h3>
          <div className="space-y-4">
            {[
              { label: "Survey & Pengukuran", status: "completed", date: "10 Mar" },
              { label: "Finalisasi RAB & Kontrak", status: "completed", date: "15 Mar" },
              { label: "Pekerjaan Struktur", status: "active", date: "20 Mar - 10 Apr" },
              { label: "Finishing & Serah Terima", status: "pending", date: "15 Apr" },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  m.status === 'completed' ? "bg-green-500" : m.status === 'active' ? "bg-accent animate-pulse" : "bg-neutral-200"
                )} />
                <div className="flex-grow">
                  <p className="text-xs font-bold uppercase tracking-widest">{m.label}</p>
                  <p className="text-[10px] text-neutral-400 uppercase-soft">{m.date}</p>
                </div>
                {m.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ProjectCard({ project: initialProject, navigate, sysConfig, currentUser, setIsEditingProfile, setProfileFormData }: { project: any, navigate: any, sysConfig: any, currentUser: any, setIsEditingProfile: any, setProfileFormData: any }) {
  const { items, project: liveProject, releaseMilestone, updateProjectMetadata: updateProject } = useProjectDetails(initialProject.id);
  const project = liveProject || initialProject;
  const [showContract, setShowContract] = useState(false);
  const [acceptedContract, setAcceptedContract] = useState(false);

  // Client activities context - strictly on dashboard
  return (
    <div 
      className="space-y-6 group/project"
    >
      <Card className="border-2 border-black rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-500 group-hover/project:border-accent">
        <div className="grid md:grid-cols-4">
          <div className="p-8 md:col-span-3 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-3xl font-black uppercase tracking-tighter">{project.name}</h3>
                {!currentUser?.formalName && (
                  <button 
                    onClick={() => {
                      setProfileFormData({
                        formalName: currentUser?.formalName || "",
                        nik: currentUser?.nik || "",
                        whatsapp: currentUser?.whatsapp || "",
                        address: currentUser?.address || ""
                      });
                      setIsEditingProfile(true);
                    }}
                    className="flex items-center gap-2 bg-orange-500 text-white px-3 py-1 rounded-md animate-pulse hover:bg-orange-600 transition-colors"
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-[8px] font-black italic">LENGKAPI IDENTITAS</span>
                  </button>
                )}
                <Badge className={cn(
                  "rounded-md uppercase-soft px-3 py-1",
                  project.status === 'active' ? "bg-green-100 text-green-700" : 
                  project.status === 'awaiting' ? "bg-amber-100 text-amber-700" :
                  project.status === 'draft' ? "bg-blue-100 text-blue-700" :
                  "bg-neutral-100 text-neutral-700"
                )}>
                  {project.status === 'active' ? 'Pengerjaan' : 
                   project.status === 'awaiting' ? 'Menunggu Penugasan PM' :
                   project.status === 'draft' ? 'Penyusunan RAB' :
                   project.status.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-neutral-400">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Update: {new Date(project.updatedAt || project.createdAt).toLocaleDateString('id-ID')}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-neutral-400">Lokasi</p>
                <div className="flex items-center gap-2 text-black">
                  <MapPin className="w-3 h-3 text-accent" />
                  <span className="text-xs font-bold truncate">{project.location || 'Lokasi belum diatur'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-neutral-400">Mulai Proyek</p>
                <div className="flex items-center gap-2 text-black">
                  <Calendar className="w-3 h-3 text-accent" />
                  <span className="text-xs font-bold">{new Date(project.createdAt).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-neutral-400">Progress Bobot</p>
                <div className="flex items-center gap-2 text-black">
                  <TrendingUp className="w-3 h-3 text-accent" />
                  <span className="text-xs font-bold">{project.progress || 0}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-neutral-400">Estimasi Selesai</p>
                <div className="flex items-center gap-2 text-black">
                  <Clock className="w-3 h-3 text-accent" />
                  <span className="text-xs font-bold">{project.estimatedCompletion ? new Date(project.estimatedCompletion).toLocaleDateString('id-ID') : 'TBA'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-neutral-50 p-6 rounded-2xl border border-black/5">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-2"><ShieldCheck className="w-3 h-3 text-green-500" /> Real-time Progress</span>
                <div className="flex gap-2">
                  <Badge className="bg-blue-100 text-blue-700 border-none text-[8px] h-4 px-1">PM VERIFIED</Badge>
                  <Badge className="bg-neutral-200 text-neutral-700 border-none text-[8px] h-4 px-1">SYSTEM LOGGED</Badge>
                  <Badge className="bg-orange-100 text-orange-700 border-none text-[8px] h-4 px-1">CLIENT APPROVED</Badge>
                </div>
                <span className="text-accent">{project.progress || 0}%</span>
              </div>
              <Progress value={project.progress || 0} className="h-2.5 bg-neutral-200" />
            </div>

            {/* RAB Preview (Real-time) */}
            {(project.status === 'draft' || project.status === 'active') && (
              <div className="space-y-4 border-t border-black/5 pt-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-accent" /> Rincian RAB Real-time
                  </h4>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 italic">Disusun oleh: {project.pmName || 'PM Team'}</span>
                </div>
                <div className="grid gap-2">
                  {items.length > 0 ? (
                    items.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] border-b border-neutral-100 pb-2">
                        <span className="font-bold uppercase tracking-tight leading-none">{item.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-neutral-400">{item.quantity} {item.unit}</span>
                          <span className="font-black">Rp {calculateClientPrice(item.pricePerUnit * item.quantity, sysConfig?.globalMarkup).toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 text-center">
                      <p className="text-[10px] font-bold uppercase text-neutral-400">PM sedang menyusun rincian pekerjaan...</p>
                    </div>
                  )}
                  {items.length > 5 && (
                    <p className="text-[9px] text-neutral-400 text-center font-bold uppercase tracking-widest mt-2">
                      + {items.length - 5} Item lainnya
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Daily Progress Thumbnails */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Camera className="w-4 h-4 text-accent" /> Laporan Progress Harian
                </h4>
                <Dialog>
                   <DialogTrigger render={
                      <Button variant="link" className="text-[10px] uppercase font-black p-0 h-auto">Lihat Semua</Button>
                   } />
                   <DialogContent className="max-w-5xl border-2 border-black rounded-[2rem] overflow-hidden p-6">
                      <DialogHeader>
                         <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Timeline Foto Proyek</DialogTitle>
                         <DialogDescription className="uppercase-soft">Arsip lengkap dokumentasi harian dari lokasi proyek.</DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                         {[...Array(12)].map((_, i) => (
                            <div key={i} className="space-y-2 group">
                               <div className="aspect-square rounded-xl border border-black/5 overflow-hidden bg-neutral-100">
                                  <img src={`https://picsum.photos/seed/prog${i}/400/400`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                               </div>
                               <p className="text-[8px] font-black uppercase text-neutral-400">Progress Log #{12-i}</p>
                            </div>
                         ))}
                      </div>
                   </DialogContent>
                </Dialog>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {[
                  { id: 1, date: "10 Apr", desc: "Pemasangan Keramik Lantai", img: "progress1" },
                  { id: 2, date: "09 Apr", desc: "Plester Dinding Area Belakang", img: "progress2" },
                  { id: 3, date: "08 Apr", desc: "Instalasi Pipa Air Bersih", img: "progress3" },
                  { id: 4, date: "07 Apr", desc: "Pekerjaan Rangka Plafon", img: "progress4" },
                  { id: 5, date: "06 Apr", desc: "Pembongkaran Dinding Lama", img: "progress5" },
                ].map(report => (
                  <div key={report.id} className="min-w-[140px] space-y-2">
                    <Dialog>
                      <DialogTrigger nativeButton={false} render={
                        <div className="aspect-square rounded-xl border-2 border-black/5 overflow-hidden relative group cursor-pointer shadow-sm">
                          <img src={`https://picsum.photos/seed/${report.img}/200/200`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[8px] text-white font-black uppercase">{report.date}</span>
                          </div>
                        </div>
                      } />
                      <DialogContent className="max-w-3xl border-2 border-black rounded-3xl p-0 overflow-hidden">
                        <img src={`https://picsum.photos/seed/${report.img}/800/800`} className="w-full aspect-video object-cover" />
                        <div className="p-6 bg-white">
                          <p className="uppercase-soft text-neutral-400 mb-1">{report.date}</p>
                          <h3 className="text-xl font-black uppercase tracking-tighter">{report.desc}</h3>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <p className="text-[9px] font-bold uppercase tracking-tight leading-tight text-neutral-600 px-1">{report.desc} ({report.date})</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Request Tambahan */}
            <div className="space-y-4 border-t border-black/5 pt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-accent" /> Request Tambahan & Perubahan
                </h4>
                <Dialog>
                  <DialogTrigger render={
                    <Button variant="outline" size="sm" className="h-8 rounded-xl border-black text-[9px] font-black uppercase">
                      <Plus className="w-3 h-3 mr-1" /> New Request
                    </Button>
                  } />
                  <DialogContent className="border-2 border-black rounded-[2rem]">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black uppercase tracking-tighter">Ajukan Request Baru</DialogTitle>
                      <DialogDescription className="uppercase-soft text-[10px]">Perubahan spesifikasi atau tambahan item pekerjaan baru.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                       <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase">Nama Item / Pekerjaan</Label>
                          <Input className="input-sleek" placeholder="Contoh: Tambah Titik Lampu" />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <Label className="text-[10px] font-black uppercase">Volume</Label>
                             <Input className="input-sleek" type="number" placeholder="1" />
                          </div>
                          <div className="space-y-1">
                             <Label className="text-[10px] font-black uppercase">Satuan</Label>
                             <Input className="input-sleek" placeholder="Titik" />
                          </div>
                       </div>
                       <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase">Alasan Request</Label>
                          <Textarea className="input-sleek" placeholder="Jelaskan kebutuhan Anda..." />
                       </div>
                    </div>
                    <DialogFooter>
                       <Button className="w-full btn-orange font-black uppercase text-xs rounded-xl" onClick={() => toast.success("Request Anda telah dikirim dan akan segera direview Admin.")}>
                          Kirim Request &rarr;
                       </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="grid gap-2">
                {project.requests && project.requests.length > 0 ? (
                  project.requests.map((req: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-neutral-50 rounded-xl border border-black/5">
                       <div className="space-y-0.5">
                          <p className="text-[10px] font-black uppercase">{req.name}</p>
                          <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{req.status}</p>
                       </div>
                       <Badge className="text-[8px] font-black uppercase bg-neutral-200 text-neutral-600">Reviewing</Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 text-center">
                    <p className="text-[10px] font-bold uppercase text-neutral-300">Belum ada request tambahan aktif.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
            <div className="space-y-4 bg-neutral-900 p-8 text-white flex flex-col justify-center items-center text-center">
              <div className="space-y-1">
                <p className="uppercase-soft text-white/40">Total Nilai Kontrak</p>
                <p className="text-2xl font-black tracking-tighter">
                  {formatRupiah(project.totalBudget || 0)}
                </p>
              </div>
              <div className="w-full h-px bg-white/10 my-4" />
              <div className="space-y-1">
                <p className="uppercase-soft text-white/40">Dana Terbayar</p>
                <p className="text-xl font-black text-green-400">
                  {formatRupiah(project.releasedAmount || 0)}
                </p>
              </div>
              
              <div className="pt-6 w-full space-y-2">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 text-left px-2">Project Documents</h4>
                 <Button 
                   onClick={() => setShowContract(!showContract)}
                   variant="outline" 
                   className={cn(
                     "w-full rounded-xl uppercase-soft h-12 text-[10px] border-white/20 text-white font-black hover:bg-white hover:text-black",
                     project.contractSignedAt ? "bg-green-500/20 border-green-500/50" : "bg-orange-500/20 border-orange-500/50"
                   )}
                 >
                   <FileText className="w-4 h-4 mr-2" /> 
                   {project.contractSignedAt ? "Review Signed Contract" : "Contract Ready for Sign"}
                 </Button>
              </div>
            </div>
          </div>

          {showContract && (
            <div className="border-t-2 border-black p-8 bg-neutral-50 animate-in slide-in-from-top-4 duration-500">
               <div className="max-w-4xl mx-auto space-y-8">
                  <div className="flex items-center justify-between">
                     <h3 className="text-2xl font-black uppercase tracking-tighter italic text-black">Digital Contract Platform</h3>
                     <Badge className="rounded-full px-4 border-black font-black text-black bg-white">
                        {project.contractSignedAt ? "LAWFUL & VERIFIED" : "PENDING SIGNATURE"}
                     </Badge>
                  </div>
                  
                  <div className="p-8 bg-white border-2 border-black/10 rounded-[2rem] font-serif text-sm leading-relaxed whitespace-pre-wrap min-h-[400px] shadow-inner text-black">
                    {project.contractDraft || "Contract is being prepared by the legal team..."}
                  </div>

                  {!project.clientSignedAt && project.contractDraft && (
                    <div className="pt-8 border-t-2 border-black/5 flex flex-col items-center gap-6">
                        <div className="flex items-start gap-4 max-w-md">
                           <input type="checkbox" id="accept" checked={acceptedContract} onChange={e => setAcceptedContract(e.target.checked)} className="mt-1 w-5 h-5 border-2 border-black rounded" />
                           <label htmlFor="accept" className="text-[10px] font-black uppercase text-neutral-400 leading-tight">
                              SAYA SETUJU DENGAN SELURUH KLAUSUL KONTRAK DI ATAS DAN MENJADIKAN TANDA TANGAN DIGITAL INI SAH SECARA HUKUM.
                           </label>
                        </div>
                        <Button 
                          className="w-full sm:w-auto bg-black text-white h-14 px-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl"
                          disabled={!acceptedContract}
                          onClick={async () => {
                             const now = new Date().toISOString();
                             await updateProject({ 
                                clientSignedAt: now,
                                contractSignedAt: now,
                                contractHistory: [
                                   ...(project.contractHistory || []),
                                   { time: now, action: "Client Signed Contract", user: currentUser?.displayName || "Client", role: "user" }
                                ]
                             });
                             toast.success("Kontrak Digital Berhasil Ditandatangani!");
                          }}
                        >
                          Sign Contract Now &rarr;
                        </Button>
                    </div>
                  )}

                  {project.contractHistory && project.contractHistory.length > 0 && (
                     <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-neutral-400">Security & Sign Logs</h4>
                        <div className="grid sm:grid-cols-2 gap-4">
                           {project.contractHistory.map((log: any, i: number) => (
                              <div key={i} className="bg-white p-3 rounded-xl border border-black/5 flex items-center gap-3">
                                 <ShieldCheck className="w-4 h-4 text-green-500" />
                                 <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase text-black">{log.action}</p>
                                    <p className="text-[8px] font-bold text-neutral-400">{new Date(log.time).toLocaleString()} &bull; {log.user}</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>
            </div>
          )}
      </Card>

      {/* Payment & Milestone Tracking */}
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-2 border-black rounded-3xl p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-accent" /> Status Pembayaran & Termin
            </h3>
            <Badge className="bg-accent/10 text-accent border-accent/20 rounded-md uppercase-soft">Escrow Active</Badge>
          </div>
          
          <div className="space-y-6 relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-neutral-100" />
            {(project.paymentMilestones || [
              { id: "dp", label: "DP (Down Payment) - 30%", amount: (project.totalBudget || 0) * 0.3, status: "pending", date: "TBA", requiredProgress: 0 },
              { id: "progress1", label: "Termin 1 - Progress 40%", amount: (project.totalBudget || 0) * 0.3, status: "locked", date: "TBA", requiredProgress: 40 },
              { id: "progress2", label: "Termin 2 - Progress 80%", amount: (project.totalBudget || 0) * 0.3, status: "locked", date: "TBA", requiredProgress: 80 },
              { id: "final", label: "Pelunasan & Serah Terima", amount: (project.totalBudget || 0) * 0.1, status: "locked", date: "TBA", requiredProgress: 100 },
            ]).map((t: any, i: number) => (
              <div key={i} className="flex gap-6 relative">
                <div className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10",
                  t.status === 'released' || t.status === 'paid' ? "bg-green-500 border-green-500 text-white" : 
                  t.status === 'pending' || t.status === 'active' ? "bg-white border-accent text-accent animate-pulse" : 
                  "bg-white border-neutral-200 text-neutral-300"
                )}>
                  {t.status === 'released' || t.status === 'paid' ? <Check className="w-4 h-4" /> : <span className="text-[10px] font-black">{i + 1}</span>}
                </div>
                <div className="flex-grow space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={cn("text-xs font-black uppercase tracking-widest", t.status === 'locked' ? "text-neutral-400" : "text-black")}>{t.label}</p>
                      <p className="text-[10px] text-neutral-400 uppercase-soft">{t.releaseDate ? new Date(t.releaseDate).toLocaleDateString('id-ID') : t.date || 'Belum Dijadwalkan'}</p>
                    </div>
                    <p className="text-xs font-black">Rp {(t.amount || 0).toLocaleString('id-ID')}</p>
                  </div>
                  
                  {(t.status === 'pending' || t.status === 'active') && project.progress >= t.requiredProgress && (
                    <div className="pt-2">
                      <Dialog>
                        <DialogTrigger nativeButton={false} render={
                          <div className="w-full btn-orange h-10 text-[10px] gap-2 flex items-center justify-center cursor-pointer rounded-md">
                            <ShieldCheck className="w-4 h-4" /> Setujui Pencairan Dana
                          </div>
                        } />
                        <DialogContent className="border-2 border-black rounded-3xl">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Konfirmasi Pencairan Dana (Fund Reduction)</DialogTitle>
                            <DialogDescription className="uppercase-soft">
                              {t.label} senilai Rp {(t.amount || 0).toLocaleString('id-ID')} akan dicairkan dari Escrow ke Kontraktor.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-6 space-y-4">
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                              <p className="text-[10px] font-bold uppercase text-green-700">Project Manager telah menyetujui progress ({project.progress || 0}%)</p>
                            </div>
                            <div className="p-4 border-2 border-black/5 rounded-xl space-y-2">
                              <p className="text-[10px] font-black uppercase text-neutral-400">Log Persetujuan</p>
                              <div className="flex justify-between text-[10px]">
                                <span className="font-bold">PM: {project.pmName || 'PM Team'}</span>
                                <span className="text-green-500 font-black">APPROVED</span>
                              </div>
                              <div className="flex justify-between text-[10px]">
                                <span className="font-bold">Client: {currentUser?.displayName}</span>
                                <span className="text-neutral-400 font-black">WAITING</span>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" className="rounded-xl uppercase-soft" onClick={() => {}}>Batal</Button>
                            <Button className="btn-orange rounded-xl uppercase-soft" onClick={() => releaseMilestone(t.id)}>Setujui & Cairkan</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-2 border-black rounded-3xl p-8 space-y-6 bg-black text-white overflow-hidden relative">
          <div className="absolute top-4 right-4 animate-pulse flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-red-500" />
             <span className="text-[8px] font-black uppercase tracking-widest text-white/60">LIVE STREAMING</span>
          </div>
          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Camera className="w-5 h-5 text-accent" /> Site Monitoring (CCTV)
          </h3>
          <div className="aspect-video bg-neutral-800 rounded-xl flex flex-col items-center justify-center border border-white/10 group cursor-pointer overflow-hidden">
             <div className="text-center group-hover:scale-110 transition-transform duration-500">
                <Zap className="w-12 h-12 text-accent mx-auto mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-white/80">Connect to Site Camera</p>
                <p className="text-[8px] text-white/40 mt-1 uppercase">Ready for Proyect: {project.name}</p>
             </div>
             <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge className="bg-green-500 text-white text-[8px] border-none uppercase">Signal Strong</Badge>
                <span className="text-[8px] text-white/60">CAM-01: FRONT ENTRANCE</span>
             </div>
          </div>
        </Card>

        <Card className="border-2 border-black rounded-3xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-accent" /> Komplain & Resolusi
            </h3>
            <Badge className="rounded-md uppercase-soft bg-neutral-100 text-neutral-500 h-6 px-2 text-[8px]">Resolusi: 24 Jam</Badge>
          </div>
          <div className="space-y-4">
             <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-2">
                <p className="text-[10px] font-black uppercase text-orange-700 items-center flex gap-2">
                  <ShieldCheck className="w-4 h-4" /> Quality Guarantee
                </p>
                <p className="text-[9px] font-bold text-orange-900 italic">"Seluruh pekerjaan di TBJ Constech dijamin sesuai spesifikasi. Jika ada ketidaksesuaian, silakan ajukan komplain melalui panel ini."</p>
             </div>
             
             <Dialog>
                <DialogTrigger render={
                   <Button variant="outline" className="w-full h-12 rounded-xl border-2 border-black border-dashed font-black uppercase text-[10px] hover:bg-neutral-50">
                     <Plus className="w-4 h-4 mr-2" /> Ajukan Komplain Baru
                   </Button>
                } />
                <DialogContent className="border-2 border-black rounded-[2rem]">
                   <DialogHeader>
                      <DialogTitle className="text-xl font-black uppercase tracking-tighter">Form Komplain & Keluhan</DialogTitle>
                      <DialogDescription className="uppercase-soft text-[10px]">Laporkan kendala atau ketidaksesuaian pekerjaan di lokasi.</DialogDescription>
                   </DialogHeader>
                   <div className="space-y-4 py-4">
                      <div className="space-y-1">
                         <Label className="text-[10px] font-black uppercase">Judul Kendala</Label>
                         <Input className="input-sleek" placeholder="Contoh: Retak Rambut Dinding Depan" />
                      </div>
                      <div className="space-y-1">
                         <Label className="text-[10px] font-black uppercase">Deskripsi Detail</Label>
                         <Textarea className="input-sleek" placeholder="Ceritakan detail kendala yang dialami..." />
                      </div>
                      <div className="space-y-1">
                         <Label className="text-[10px] font-black uppercase">Foto Bukti (G-Drive / Link)</Label>
                         <Input className="input-sleek" placeholder="Masukkan link foto penemuan" />
                      </div>
                   </div>
                   <DialogFooter>
                      <Button className="w-full bg-red-600 text-white font-black uppercase text-xs rounded-xl hover:bg-red-700" onClick={() => toast.success("Laporan komplain Anda telah diterima. PM akan segera menghubungi Anda.")}>
                         Kirim Laporan Komplain &rarr;
                      </Button>
                   </DialogFooter>
                </DialogContent>
             </Dialog>
          </div>
        </Card>

        <Card className="border-2 border-black rounded-3xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <Ruler className="w-5 h-5 text-accent" /> Technical Drawings & 3D
            </h3>
            <Badge className="rounded-md uppercase-soft bg-blue-100 text-blue-700 h-6 px-2 text-[8px]">Design Hub</Badge>
          </div>
          <div className="space-y-4">
             <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                <p className="text-[10px] font-black uppercase text-blue-700 items-center flex gap-2">
                  <Layers className="w-4 h-4" /> Architectural Plans
                </p>
                <p className="text-[9px] font-bold text-blue-900 italic">"Akses Blueprint resmi, gambar kerja, dan visualisasi 3D proyek Anda secara digital di sini."</p>
             </div>
             <Button 
               onClick={() => navigate(`/projects/${project.id}?tab=drawings&view=drawings_only`)}
               className="w-full h-12 rounded-xl bg-accent text-white font-black uppercase text-[10px] shadow-sm hover:bg-black transition-colors"
             >
               Explore Design Workspace &rarr;
             </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
