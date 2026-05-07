import { useState, useEffect } from "react";
import { useAuth, useWorkforce, useMaterialRequests, useLeads, useCmsConfig } from "@/lib/hooks";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Users, FolderKanban, TrendingUp, Shield, Loader2, CheckCircle2,
  Hammer, Package, Plus, Check, X, Clock, UserPlus, Phone,
  Megaphone, MessageCircle, Settings, Star, Edit2, Trash2,
} from "lucide-react";

interface UserRecord {
  uid: string; email: string; displayName: string;
  role: string; tier?: string; analysisCount?: number; whatsapp?: string;
}

type AdminTab = "overview" | "users" | "workforce" | "materials" | "leads" | "cms";

export default function AdminPanel() {
  const { user } = useAuth();
  const { workforce, loading: wfLoading, addWorker, updateWorker } = useWorkforce();
  const { requests, loading: mrLoading, updateRequestStatus } = useMaterialRequests();
  const { leads, loading: leadsLoading, addLead, updateLead, deleteLead } = useLeads();
  const { cmsConfig, updateCmsConfig } = useCmsConfig();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>("overview");

  // Workforce form
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [newWorker, setNewWorker] = useState({ name: "", ktp: "", role: "Tukang Bata", photoUrl: "" });

  // Lead form
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", whatsapp: "", source: "Instagram", status: "Lead" as const, notes: "", projectType: "" });

  // CMS form
  const [cmsForm, setCmsForm] = useState({ heroTitle: "", heroSubtitle: "", whatsappNumber: "", announcementText: "" });

  useEffect(() => {
    if (cmsConfig) {
      setCmsForm({
        heroTitle: cmsConfig.heroTitle || "",
        heroSubtitle: cmsConfig.heroSubtitle || "",
        whatsappNumber: cmsConfig.whatsappNumber || "",
        announcementText: cmsConfig.announcementText || "",
      });
    }
  }, [cmsConfig]);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersSnap, projectsSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(query(collection(db, "projects"), orderBy("createdAt", "desc"))),
        ]);
        setUsers(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserRecord)));
        setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const updateUserTier = async (uid: string, tier: string) => {
    await updateDoc(doc(db, "users", uid), { tier });
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, tier } : u));
    toast.success(`Tier → ${tier}`);
  };

  const updateUserRole = async (uid: string, role: string) => {
    await updateDoc(doc(db, "users", uid), { role });
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role } : u));
    toast.success(`Role → ${role}`);
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="text-center py-20">
        <Shield className="w-12 h-12 mx-auto text-neutral-200 mb-4" />
        <p className="text-neutral-500">Akses ditolak. Hanya Admin.</p>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  const totalBudget = projects.reduce((s, p) => s + (p.totalBudget || 0), 0);
  const pendingRequests = requests.filter(r => r.status === "pending").length;
  const activeLeads = leads.filter(l => l.status === "Lead" || l.status === "Qualified").length;

  const TABS: { key: AdminTab; label: string; icon: any; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: TrendingUp },
    { key: "users", label: "Users", icon: Users },
    { key: "workforce", label: "Workforce", icon: Hammer },
    { key: "materials", label: "Material Req", icon: Package, badge: pendingRequests },
    { key: "leads", label: "CRM Leads", icon: MessageCircle, badge: activeLeads },
    { key: "cms", label: "CMS", icon: Settings },
  ];

  const LEAD_STATUS_COLORS: Record<string, string> = {
    Lead: "bg-blue-100 text-blue-700",
    Qualified: "bg-orange-100 text-orange-700",
    Won: "bg-green-100 text-green-700",
    Lost: "bg-neutral-100 text-neutral-500",
  };

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-[0.3em]">Control Center</p>
          <h1 className="text-3xl font-black uppercase tracking-tighter mt-1">Admin Panel</h1>
        </div>
        <Badge className="bg-black text-white rounded-full px-4 py-1.5 text-[10px] font-bold uppercase flex items-center gap-2">
          <Shield className="w-3 h-3" /> Administrator
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
              tab === t.key ? "bg-black text-white" : "text-neutral-500 hover:text-black"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {!!t.badge && (
              <span className="bg-orange-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black min-w-[16px] text-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW ───────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Users", value: users.length, icon: Users, color: "bg-blue-50 text-blue-600" },
              { label: "Total Proyek", value: projects.length, icon: FolderKanban, color: "bg-green-50 text-green-600" },
              { label: "CRM Leads", value: leads.length, icon: MessageCircle, color: "bg-orange-50 text-orange-600" },
              { label: "Total RAB", value: `Rp ${(totalBudget / 1e9).toFixed(1)}M`, icon: TrendingUp, color: "bg-purple-50 text-purple-600" },
            ].map((s, i) => (
              <Card key={i} className="border-2 border-black rounded-2xl overflow-hidden">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", s.color)}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-black tracking-tighter">{s.value}</p>
                    <p className="text-[9px] text-neutral-400 uppercase tracking-widest">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="border-2 border-black rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="font-black uppercase tracking-tight">Proyek Terbaru</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] uppercase tracking-widest font-black">Proyek</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-black">Status</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-black text-right">Anggaran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.slice(0, 8).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-bold text-sm">{p.name}</p>
                        <p className="text-[10px] text-neutral-400">{p.description}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("rounded-md text-[9px] uppercase font-bold",
                          p.status === "active" ? "bg-green-100 text-green-700" :
                          p.status === "completed" ? "bg-blue-100 text-blue-700" :
                          "bg-neutral-100 text-neutral-600"
                        )}>{p.status || "survey"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold">
                        Rp {(p.totalBudget || 0).toLocaleString("id-ID")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {projects.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-neutral-400">Belum ada proyek.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── USERS ──────────────────────────────────────────────────────────── */}
      {tab === "users" && (
        <Card className="border-2 border-black rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="font-black uppercase tracking-tight">Manajemen Pengguna</CardTitle>
            <CardDescription>Update tier & role klien untuk akses fitur premium.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase font-black">Pengguna</TableHead>
                  <TableHead className="text-[10px] uppercase font-black">Role</TableHead>
                  <TableHead className="text-[10px] uppercase font-black">Tier</TableHead>
                  <TableHead className="text-[10px] uppercase font-black">AI Used</TableHead>
                  <TableHead className="text-[10px] uppercase font-black">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.uid}>
                    <TableCell>
                      <p className="font-bold text-sm">{u.displayName}</p>
                      <p className="text-[10px] text-neutral-400">{u.email}</p>
                      {u.whatsapp && <p className="text-[10px] text-green-600 font-mono">{u.whatsapp}</p>}
                    </TableCell>
                    <TableCell>
                      {u.role === "admin" ? (
                        <Badge className="bg-black text-white rounded-md text-[9px] uppercase">admin</Badge>
                      ) : (
                        <select
                          className="text-[9px] p-1 border border-neutral-200 rounded-lg bg-white font-bold uppercase"
                          value={u.role || "user"}
                          onChange={e => updateUserRole(u.uid, e.target.value)}
                        >
                          <option value="user">user</option>
                          <option value="pm">pm</option>
                        </select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("rounded-md text-[9px] uppercase font-bold",
                        u.tier === "deal" ? "bg-green-100 text-green-700" :
                        u.tier === "survey" ? "bg-blue-100 text-blue-700" :
                        "bg-neutral-100 text-neutral-600"
                      )}>{u.tier || "prospect"}</Badge>
                    </TableCell>
                    <TableCell><span className="text-sm font-mono">{u.analysisCount || 0}x</span></TableCell>
                    <TableCell>
                      {u.role !== "admin" && (
                        <div className="flex gap-1 flex-wrap">
                          {["prospect", "survey", "deal"].map(t => (
                            <button key={t} onClick={() => updateUserTier(u.uid, t)}
                              className={cn("text-[8px] px-2 py-1 rounded-md font-black uppercase border transition-all",
                                u.tier === t ? "bg-black text-white border-black" : "border-neutral-200 hover:border-black text-neutral-500"
                              )}>{t}</button>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ─── WORKFORCE ──────────────────────────────────────────────────────── */}
      {tab === "workforce" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">Database Tenaga Kerja</h2>
              <p className="text-neutral-400 text-sm">{workforce.filter(w => w.status === "active").length} aktif · {workforce.length} total</p>
            </div>
            <Dialog open={addWorkerOpen} onOpenChange={setAddWorkerOpen}>
              <DialogTrigger>
                <Button className="bg-black text-white rounded-xl gap-2">
                  <UserPlus className="w-4 h-4" /> Tambah Tukang
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-black uppercase">Tambah Tenaga Kerja</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-bold">Nama Lengkap</Label>
                    <Input value={newWorker.name} onChange={e => setNewWorker({ ...newWorker, name: e.target.value })} placeholder="Sesuai KTP" /></div>
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-bold">Nomor KTP (NIK)</Label>
                    <Input value={newWorker.ktp} onChange={e => setNewWorker({ ...newWorker, ktp: e.target.value })} placeholder="16 digit" maxLength={16} /></div>
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-bold">Keahlian</Label>
                    <select className="w-full p-2.5 border-2 border-neutral-200 rounded-xl text-sm bg-white"
                      value={newWorker.role} onChange={e => setNewWorker({ ...newWorker, role: e.target.value })}>
                      {["Tukang Bata", "Tukang Cat", "Tukang Keramik", "Tukang Kayu", "Tukang Las", "Tukang Listrik", "Tukang Plafon", "Mandor", "Kepala Tukang"].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddWorkerOpen(false)}>Batal</Button>
                  <Button className="bg-black text-white" onClick={async () => {
                    if (!newWorker.name || !newWorker.ktp) return;
                    await addWorker({ ...newWorker, status: "active" });
                    setNewWorker({ name: "", ktp: "", role: "Tukang Bata", photoUrl: "" });
                    setAddWorkerOpen(false);
                  }}>Simpan</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {wfLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div> : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workforce.map(worker => (
                <Card key={worker.id} className="border-2 border-black rounded-2xl">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center font-black text-lg overflow-hidden flex-shrink-0">
                        {worker.photoUrl ? <img src={worker.photoUrl} className="w-full h-full object-cover" /> : worker.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="font-black text-sm uppercase tracking-tight truncate">{worker.name}</p>
                        <p className="text-[10px] text-neutral-400 font-mono">{worker.ktp}</p>
                      </div>
                      <Badge className={cn("rounded-full text-[9px] uppercase font-bold flex-shrink-0",
                        worker.status === "active" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"
                      )}>{worker.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                      <Badge variant="outline" className="rounded-lg text-[9px] font-bold uppercase">{worker.role}</Badge>
                      <button onClick={() => updateWorker(worker.id, { status: worker.status === "active" ? "inactive" : "active" })}
                        className="text-[9px] font-black uppercase text-neutral-400 hover:text-black transition-colors">
                        {worker.status === "active" ? "Non-aktifkan" : "Aktifkan"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {workforce.length === 0 && (
                <div className="col-span-full text-center py-16 border-2 border-dashed border-neutral-200 rounded-2xl">
                  <Hammer className="w-10 h-10 mx-auto text-neutral-200 mb-3" />
                  <p className="text-neutral-400 text-sm">Belum ada tenaga kerja terdaftar.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── MATERIAL REQUESTS ──────────────────────────────────────────────── */}
      {tab === "materials" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Permintaan Material</h2>
            <p className="text-neutral-400 text-sm">{pendingRequests} pending · {requests.filter(r => r.status === "approved").length} approved</p>
          </div>
          {mrLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div> : (
            <Card className="border-2 border-black rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-black">Item</TableHead>
                    <TableHead className="text-[10px] uppercase font-black">Proyek</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-center">Volume</TableHead>
                    <TableHead className="text-[10px] uppercase font-black">Status</TableHead>
                    <TableHead className="text-[10px] uppercase font-black">Tanggal</TableHead>
                    <TableHead className="text-[10px] uppercase font-black">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <p className="font-bold text-sm">{req.itemName}</p>
                        {req.note && <p className="text-[10px] text-neutral-400">{req.note}</p>}
                      </TableCell>
                      <TableCell className="text-sm">{req.projectName || req.projectId?.slice(0, 8)}</TableCell>
                      <TableCell className="text-center font-mono text-sm font-bold">{req.quantity} {req.unit}</TableCell>
                      <TableCell>
                        <Badge className={cn("rounded-md text-[9px] uppercase font-bold",
                          req.status === "approved" ? "bg-green-100 text-green-700" :
                          req.status === "rejected" ? "bg-red-100 text-red-700" :
                          "bg-orange-100 text-orange-700"
                        )}>
                          {req.status === "pending" && <Clock className="w-2.5 h-2.5 inline mr-1" />}
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-neutral-400">{new Date(req.createdAt).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell>
                        {req.status === "pending" && (
                          <div className="flex gap-1.5">
                            <button onClick={() => updateRequestStatus(req.id, "approved")}
                              className="w-7 h-7 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => updateRequestStatus(req.id, "rejected")}
                              className="w-7 h-7 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg flex items-center justify-center">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {requests.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-neutral-400">Belum ada permintaan material.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* ─── LEADS / CRM ────────────────────────────────────────────────────── */}
      {tab === "leads" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">CRM — Pipeline Prospek</h2>
              <p className="text-neutral-400 text-sm">{leads.filter(l => l.status === "Won").length} Won · {activeLeads} aktif · {leads.length} total</p>
            </div>
            <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
              <DialogTrigger>
                <Button className="bg-black text-white rounded-xl gap-2"><Plus className="w-4 h-4" /> Tambah Lead</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle className="font-black uppercase">Tambah Lead Baru</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-[10px] uppercase font-bold">Nama</Label>
                      <Input value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} placeholder="Nama lengkap" /></div>
                    <div className="space-y-2"><Label className="text-[10px] uppercase font-bold">WhatsApp</Label>
                      <Input value={newLead.whatsapp} onChange={e => setNewLead({ ...newLead, whatsapp: e.target.value })} placeholder="08xxxxxxxxxx" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-[10px] uppercase font-bold">Source</Label>
                      <select className="w-full p-2.5 border-2 border-neutral-200 rounded-xl text-sm bg-white"
                        value={newLead.source} onChange={e => setNewLead({ ...newLead, source: e.target.value })}>
                        {["Instagram", "Google", "Referral", "WhatsApp", "Tokopedia", "Walk-in", "Other"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2"><Label className="text-[10px] uppercase font-bold">Tipe Proyek</Label>
                      <select className="w-full p-2.5 border-2 border-neutral-200 rounded-xl text-sm bg-white"
                        value={newLead.projectType} onChange={e => setNewLead({ ...newLead, projectType: e.target.value })}>
                        {["Renovasi", "Interior", "Arsitektur", "Maintenance", "Property", "Lainnya"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label className="text-[10px] uppercase font-bold">Catatan</Label>
                    <Textarea value={newLead.notes} onChange={e => setNewLead({ ...newLead, notes: e.target.value })} placeholder="Detail kebutuhan, budget, timeline..." className="min-h-[80px]" /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddLeadOpen(false)}>Batal</Button>
                  <Button className="bg-black text-white" onClick={async () => {
                    if (!newLead.name || !newLead.whatsapp) return;
                    await addLead({ ...newLead, status: "Lead" });
                    setNewLead({ name: "", whatsapp: "", source: "Instagram", status: "Lead", notes: "", projectType: "" });
                    setAddLeadOpen(false);
                  }}>Simpan Lead</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Pipeline columns */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(["Lead", "Qualified", "Won", "Lost"] as const).map(status => {
              const statusLeads = leads.filter(l => l.status === status);
              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase", LEAD_STATUS_COLORS[status])}>
                      {status}
                    </div>
                    <span className="text-[10px] font-black text-neutral-400">{statusLeads.length}</span>
                  </div>
                  <div className="space-y-3">
                    {statusLeads.map(lead => (
                      <div key={lead.id} className="bg-white border-2 border-neutral-100 hover:border-black rounded-2xl p-4 space-y-3 transition-all">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="font-black text-sm truncate">{lead.name}</p>
                            {lead.projectType && <p className="text-[9px] text-neutral-400 uppercase">{lead.projectType}</p>}
                          </div>
                          <button onClick={() => { if (confirm(`Hapus lead ${lead.name}?`)) deleteLead(lead.id); }}
                            className="text-neutral-300 hover:text-red-500 transition-colors flex-shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <a href={`https://wa.me/${lead.whatsapp?.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors">
                          <Phone className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-mono font-bold">{lead.whatsapp}</span>
                        </a>
                        {lead.notes && <p className="text-[9px] text-neutral-400 leading-relaxed line-clamp-2">{lead.notes}</p>}
                        <div className="flex gap-1">
                          {(["Lead", "Qualified", "Won", "Lost"] as const).filter(s => s !== status).map(s => (
                            <button key={s} onClick={() => updateLead(lead.id, { status: s })}
                              className="text-[8px] px-2 py-1 border border-neutral-200 rounded-lg hover:border-black hover:bg-black hover:text-white font-black uppercase transition-all">
                              → {s}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between items-center text-[8px] text-neutral-300">
                          <span>{lead.source || "Unknown"}</span>
                          <span>{new Date(lead.createdAt).toLocaleDateString("id-ID")}</span>
                        </div>
                      </div>
                    ))}
                    {statusLeads.length === 0 && (
                      <div className="border-2 border-dashed border-neutral-100 rounded-xl p-4 text-center text-[10px] text-neutral-300">
                        Kosong
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── CMS ────────────────────────────────────────────────────────────── */}
      {tab === "cms" && (
        <div className="space-y-6 max-w-2xl">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter">CMS — Konten Platform</h2>
            <p className="text-neutral-400 text-sm">Update hero banner dan teks utama yang muncul di halaman utama.</p>
          </div>
          <Card className="border-2 border-black rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tighter">Hero Banner & Promo Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="uppercase-soft text-[10px]">Hero Title</label>
                <Input value={cmsForm.heroTitle} onChange={e => setCmsForm({ ...cmsForm, heroTitle: e.target.value })}
                  placeholder="Membangun Masa Depan Konstruksi Indonesia" />
              </div>
              <div className="space-y-2">
                <label className="uppercase-soft text-[10px]">Hero Subtitle</label>
                <Textarea value={cmsForm.heroSubtitle} onChange={e => setCmsForm({ ...cmsForm, heroSubtitle: e.target.value })}
                  placeholder="Platform All-in-One untuk Renovasi..." className="min-h-[80px]" />
              </div>
              <div className="space-y-2">
                <label className="uppercase-soft text-[10px]">Nomor WhatsApp Bisnis</label>
                <Input value={cmsForm.whatsappNumber} onChange={e => setCmsForm({ ...cmsForm, whatsappNumber: e.target.value })}
                  placeholder="628xxxxxxxxxx" />
              </div>
              <div className="space-y-2">
                <label className="uppercase-soft text-[10px]">Teks Ticker / Announcement</label>
                <Input value={cmsForm.announcementText} onChange={e => setCmsForm({ ...cmsForm, announcementText: e.target.value })}
                  placeholder="Promo Ramadan: Diskon 10% untuk semua proyek baru!" />
              </div>
              <Button className="bg-black text-white rounded-xl w-full" onClick={() => updateCmsConfig(cmsForm)}>
                Simpan Perubahan CMS
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-2 border-neutral-100 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-neutral-100">
              <CardTitle className="text-sm font-black uppercase text-neutral-400">Preview Hero</CardTitle>
            </CardHeader>
            <CardContent className="p-8 bg-neutral-950 text-white text-center space-y-3">
              <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">TBJ Platform Preview</p>
              <h2 className="text-3xl font-black tracking-tighter leading-tight">
                {cmsForm.heroTitle || "Hero Title"}
              </h2>
              <p className="text-neutral-400 text-sm leading-relaxed max-w-sm mx-auto">
                {cmsForm.heroSubtitle || "Hero subtitle akan muncul di sini"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
