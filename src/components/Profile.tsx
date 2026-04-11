import { useState } from "react";
import { useProjects, useAuth, useWorkforce } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Loader2, LayoutDashboard, FileText, Clock, CheckCircle2, TrendingUp, Calendar, MapPin, Plus, Camera, CreditCard, ShieldCheck, AlertCircle, ChevronRight, Check, MessageSquare, User, Zap, Lock, Users, Phone, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function Profile() {
  const { user } = useAuth();
  const { projects, loading } = useProjects(user?.uid);
  const { workforce } = useWorkforce(user?.role, user?.tier);
  const navigate = useNavigate();

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  if (user?.tier === 'prospect') {
    return (
      <div className="space-y-12 py-12 flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-12 h-12 text-accent" />
        </div>
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-5xl font-black uppercase tracking-tighter">Dashboard Locked</h1>
          <p className="uppercase-soft text-neutral-500 text-lg">
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

  return (
    <div className="space-y-12 py-8">
      <div className="flex justify-between items-end border-b-2 border-black pb-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-black uppercase tracking-tighter">Client Dashboard</h1>
          <p className="uppercase-soft text-neutral-500">Selamat datang, {user?.displayName}. Pantau progres proyek Anda secara real-time.</p>
        </div>
        <div className="text-right">
          <Badge className="bg-accent text-white rounded-md px-4 py-1 uppercase-soft">Tier {(user?.tier as string) === 'prospect' ? '1' : user?.tier === 'survey' ? '2' : '3'}</Badge>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <Card className="border-2 border-black rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase-soft">Total Proyek</CardDescription>
            <CardTitle className="text-4xl font-black">{projects.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-2 border-black rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase-soft">Proyek Aktif</CardDescription>
            <CardTitle className="text-4xl font-black">{projects.filter(p => p.status === 'active').length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-2 border-black rounded-2xl bg-black text-white">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase-soft text-white/60">Total Investasi</CardDescription>
            <CardTitle className="text-4xl font-black">Rp {projects.reduce((sum, p) => sum + p.totalBudget, 0).toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {user?.tier === 'deal' && (
        <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4">
          <Card className="border-2 border-accent bg-accent/5 rounded-3xl p-8 flex items-center gap-6">
            <div className="w-16 h-16 bg-accent text-white rounded-2xl flex items-center justify-center shrink-0">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase tracking-tighter">Direct Chat to Architect</h3>
              <p className="text-xs text-neutral-600">Konsultasi desain & teknis langsung dengan Lead Architect kami.</p>
              <Button className="btn-orange h-9 px-4 text-[10px]">Mulai Chat Sekarang</Button>
            </div>
          </Card>
          <Card className="border-2 border-black bg-black text-white rounded-3xl p-8 flex items-center gap-6">
            <div className="w-16 h-16 bg-white text-black rounded-2xl flex items-center justify-center shrink-0">
              <Zap className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase tracking-tighter">Priority Support</h3>
              <p className="text-xs text-white/60">Akses jalur cepat untuk setiap request & kendala di lapangan.</p>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white hover:text-black h-9 px-4 text-[10px]">Hubungi Support</Button>
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
            <div key={project.id} className="space-y-6">
              <Card className="border-2 border-black rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-500">
                <div className="grid md:grid-cols-4">
                  <div className="p-8 md:col-span-3 space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <h3 className="text-3xl font-black uppercase tracking-tighter">{project.name}</h3>
                        <Badge className={cn(
                          "rounded-md uppercase-soft px-3 py-1",
                          project.status === 'active' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {project.status === 'active' ? 'Pengerjaan' : 'Survey/Draft'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Update: 2 jam yang lalu</span>
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
                          <span className="text-xs font-bold">45.8%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-neutral-400">Estimasi Selesai</p>
                        <div className="flex items-center gap-2 text-black">
                          <Clock className="w-3 h-3 text-accent" />
                          <span className="text-xs font-bold">15 Jun 2026</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 bg-neutral-50 p-6 rounded-2xl border border-black/5">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="flex items-center gap-2"><ShieldCheck className="w-3 h-3 text-green-500" /> Real-time Progress</span>
                        <span className="text-accent">45.8%</span>
                      </div>
                      <Progress value={45.8} className="h-2.5 bg-neutral-200" />
                    </div>

                    {/* Daily Progress Thumbnails */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                          <Camera className="w-4 h-4 text-accent" /> Laporan Progress Harian
                        </h4>
                        <Button variant="link" className="text-[10px] uppercase font-black p-0 h-auto">Lihat Semua</Button>
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
                              <DialogTrigger>
                                <div className="aspect-square rounded-xl border-2 border-black/5 overflow-hidden relative group cursor-pointer shadow-sm">
                                  <img src={`https://picsum.photos/seed/${report.img}/200/200`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-[8px] text-white font-black uppercase">{report.date}</span>
                                  </div>
                                </div>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl border-2 border-black rounded-3xl p-0 overflow-hidden">
                                <img src={`https://picsum.photos/seed/${report.img}/800/800`} className="w-full aspect-video object-cover" />
                                <div className="p-6 bg-white">
                                  <p className="uppercase-soft text-neutral-400 mb-1">{report.date}</p>
                                  <h3 className="text-xl font-black uppercase tracking-tighter">{report.desc}</h3>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <p className="text-[9px] font-bold uppercase tracking-tight leading-tight text-neutral-600 px-1">{report.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-900 p-8 text-white flex flex-col justify-center items-center text-center space-y-4">
                    <div className="space-y-1">
                      <p className="uppercase-soft text-white/40">Total Nilai Kontrak</p>
                      <p className="text-2xl font-black tracking-tighter">Rp {project.totalBudget.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="w-full h-px bg-white/10" />
                    <div className="space-y-1">
                      <p className="uppercase-soft text-white/40">Dana Terbayar</p>
                      <p className="text-xl font-black text-green-400">Rp {(project.totalBudget * 0.3).toLocaleString('id-ID')}</p>
                    </div>
                    <Button variant="outline" className="w-full rounded-xl uppercase-soft border-white/20 text-white hover:bg-white hover:text-black">Detail Keuangan</Button>
                  </div>
                </div>
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
                    {[
                      { label: "DP (Down Payment) - 30%", amount: project.totalBudget * 0.3, status: "paid", date: "15 Mar 2026", progress: 0 },
                      { label: "Termin 1 - Progress 40%", amount: project.totalBudget * 0.3, status: "pending", date: "12 Apr 2026", progress: 40 },
                      { label: "Termin 2 - Progress 80%", amount: project.totalBudget * 0.3, status: "locked", date: "10 May 2026", progress: 80 },
                      { label: "Pelunasan & Serah Terima", amount: project.totalBudget * 0.1, status: "locked", date: "15 Jun 2026", progress: 100 },
                    ].map((t, i) => (
                      <div key={i} className="flex gap-6 relative">
                        <div className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10",
                          t.status === 'paid' ? "bg-green-500 border-green-500 text-white" : 
                          t.status === 'pending' ? "bg-white border-accent text-accent animate-pulse" : 
                          "bg-white border-neutral-200 text-neutral-300"
                        )}>
                          {t.status === 'paid' ? <Check className="w-4 h-4" /> : <span className="text-[10px] font-black">{i + 1}</span>}
                        </div>
                        <div className="flex-grow space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className={cn("text-xs font-black uppercase tracking-widest", t.status === 'locked' ? "text-neutral-400" : "text-black")}>{t.label}</p>
                              <p className="text-[10px] text-neutral-400 uppercase-soft">{t.date}</p>
                            </div>
                            <p className="text-xs font-black">Rp {t.amount.toLocaleString('id-ID')}</p>
                          </div>
                          
                          {t.status === 'pending' && (
                            <div className="pt-2">
                              <Dialog>
                                <DialogTrigger>
                                  <div className="w-full btn-orange h-10 text-[10px] gap-2 flex items-center justify-center cursor-pointer rounded-md">
                                    <ShieldCheck className="w-4 h-4" /> Setujui Pencairan Dana
                                  </div>
                                </DialogTrigger>
                                <DialogContent className="border-2 border-black rounded-3xl">
                                  <DialogHeader>
                                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Konfirmasi Pencairan Dana</DialogTitle>
                                    <DialogDescription className="uppercase-soft">
                                      Termin 1 senilai Rp {t.amount.toLocaleString('id-ID')} akan dicairkan dari Escrow ke Kontraktor.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="py-6 space-y-4">
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
                                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                                      <p className="text-[10px] font-bold uppercase text-green-700">Project Manager telah menyetujui progress (45.8%)</p>
                                    </div>
                                    <div className="p-4 border-2 border-black/5 rounded-xl space-y-2">
                                      <p className="text-[10px] font-black uppercase text-neutral-400">Log Persetujuan</p>
                                      <div className="flex justify-between text-[10px]">
                                        <span className="font-bold">PM: Bpk. Hendra</span>
                                        <span className="text-green-500 font-black">APPROVED</span>
                                      </div>
                                      <div className="flex justify-between text-[10px]">
                                        <span className="font-bold">Client: {user?.displayName}</span>
                                        <span className="text-neutral-400 font-black">WAITING</span>
                                      </div>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" className="rounded-xl uppercase-soft">Batal</Button>
                                    <Button className="btn-orange rounded-xl uppercase-soft">Setujui & Cairkan</Button>
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

                <Card className="border-2 border-black rounded-3xl p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-accent" /> Catatan & Request Tambahan
                    </h3>
                    <Dialog>
                      <DialogTrigger>
                        <div className="rounded-xl uppercase-soft h-8 text-[9px] gap-2 border-2 border-black px-3 flex items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors">
                          <Plus className="w-3 h-3" /> New Request
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-md border-2 border-black rounded-3xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Tambah Request Baru</DialogTitle>
                          <DialogDescription className="uppercase-soft">Tambahkan item pekerjaan tambahan atau perubahan spesifikasi.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-1">
                            <label className="uppercase-soft text-neutral-400">Item Pekerjaan</label>
                            <Input placeholder="Contoh: Tambah Stop Kontak" className="input-sleek" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="uppercase-soft text-neutral-400">Volume</label>
                              <Input type="number" placeholder="0" className="input-sleek" />
                            </div>
                            <div className="space-y-1">
                              <label className="uppercase-soft text-neutral-400">Satuan</label>
                              <Input placeholder="m2 / titik / lot" className="input-sleek" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="uppercase-soft text-neutral-400">Estimasi Harga Satuan</label>
                            <Input type="number" placeholder="Rp" className="input-sleek" />
                          </div>
                          <div className="space-y-1">
                            <label className="uppercase-soft text-neutral-400">Upload Foto Pendukung</label>
                            <div className="w-full h-24 border-2 border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors">
                              <Camera className="w-6 h-6 text-neutral-400" />
                              <span className="text-[8px] font-black uppercase mt-1">Upload Image</span>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button className="w-full btn-orange rounded-xl uppercase-soft">Kirim Request</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="space-y-4">
                    {[
                      { id: 12, date: "08 Apr", item: "Cat Fasad Abu-abu", vol: 45, unit: "m2", price: 35000, tag: "client", status: "Approved", photo: "paint" },
                      { id: 11, date: "05 Apr", item: "Titik Lampu Taman", vol: 4, unit: "titik", price: 150000, tag: "pm", status: "In Review", photo: "light" },
                      { id: 10, date: "02 Apr", item: "Penambahan Stop Kontak", vol: 2, unit: "titik", price: 75000, tag: "system", status: "Completed", photo: "socket" },
                    ].map((req) => (
                      <div key={req.id} className="p-4 bg-neutral-50 rounded-xl border border-black/5 space-y-3 relative group">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[9px] font-black uppercase text-neutral-400">Request #{req.id} - {req.date}</p>
                              <Badge className={cn(
                                "text-[8px] uppercase font-black rounded-md px-1.5 py-0",
                                req.tag === 'client' ? "bg-blue-100 text-blue-700" : req.tag === 'pm' ? "bg-orange-100 text-orange-700" : "bg-neutral-200 text-neutral-700"
                              )}>
                                {req.tag}
                              </Badge>
                            </div>
                            <p className="text-xs font-black uppercase tracking-tight">{req.item}</p>
                          </div>
                          <Badge className={cn(
                            "rounded-md text-[8px] uppercase font-black",
                            req.status === 'Approved' ? "bg-green-100 text-green-700" : req.status === 'In Review' ? "bg-blue-100 text-blue-700" : "bg-neutral-100 text-neutral-500"
                          )}>
                            {req.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 py-2 border-y border-black/5">
                          <div className="space-y-0.5">
                            <p className="text-[8px] uppercase-soft text-neutral-400">Volume</p>
                            <p className="text-[10px] font-bold">{req.vol} {req.unit}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[8px] uppercase-soft text-neutral-400">Harga Satuan</p>
                            <p className="text-[10px] font-bold">Rp {req.price.toLocaleString('id-ID')}</p>
                          </div>
                          <div className="space-y-0.5 text-right">
                            <p className="text-[8px] uppercase-soft text-neutral-400">Subtotal</p>
                            <p className="text-[10px] font-black text-accent">Rp {(req.vol * req.price).toLocaleString('id-ID')}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <Dialog>
                            <DialogTrigger>
                              <div className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity">
                                <div className="w-8 h-8 rounded-md border border-black/10 overflow-hidden">
                                  <img src={`https://picsum.photos/seed/${req.photo}/100/100`} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-[9px] font-bold uppercase text-neutral-400">Lihat Foto</span>
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl border-2 border-black rounded-3xl p-0 overflow-hidden">
                              <img src={`https://picsum.photos/seed/${req.photo}/800/800`} className="w-full aspect-square object-cover" />
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm" className="h-6 text-[8px] uppercase font-black text-neutral-400 hover:text-black">Detail & Log</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Project Team Section for Tier 3 */}
              {user?.tier === 'deal' && (
                <div className="space-y-6 pt-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Tim Proyek Anda</h2>
                    <Badge className="bg-black text-white px-3 py-1 rounded-md uppercase-soft">Tier 3 Exclusive</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {workforce.filter(w => w.projectId === project.id || project.workerIds?.includes(w.id)).map((worker) => (
                      <Card key={worker.id} className="border-2 border-black rounded-2xl overflow-hidden group hover:border-accent transition-all">
                        <div className="aspect-[3/4] bg-neutral-100 relative">
                          {worker.photoUrl ? (
                            <img src={worker.photoUrl} alt={worker.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-300">
                              <User className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                            <p className="text-[8px] font-black text-white uppercase tracking-widest">{worker.role}</p>
                            <p className="text-[10px] font-black text-white uppercase truncate">{worker.name}</p>
                          </div>
                        </div>
                        <div className="p-3 text-center">
                          <p className="text-[10px] font-black uppercase truncate">{worker.name}</p>
                          <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{worker.role}</p>
                        </div>
                      </Card>
                    ))}
                    {workforce.filter(w => w.projectId === project.id || project.workerIds?.includes(w.id)).length === 0 && (
                      <div className="col-span-full py-8 text-center border-2 border-dashed border-neutral-200 rounded-2xl">
                        <p className="uppercase-soft text-neutral-400">Tim lapangan sedang dijadwalkan.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {projects.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-neutral-200 rounded-2xl">
              <p className="uppercase-soft text-neutral-400">Anda belum memiliki proyek. Mulai dengan Estimasi Mandiri.</p>
              <Button onClick={() => navigate("/assistant")} className="mt-6 btn-orange">Mulai Sekarang</Button>
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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
