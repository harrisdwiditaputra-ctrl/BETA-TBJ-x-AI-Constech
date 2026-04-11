import { useState, useMemo } from "react";
import { useProjects, useAuth, useUsers, useAttendance, useMaterialRequests, useWorkforce } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Loader2, Calendar, CheckCircle2, Clock, MapPin, User, MessageSquare, 
  Phone, HardHat, Package, Camera, BarChart3, ChevronRight, Plus, 
  AlertCircle, LayoutDashboard, History, Send, CameraOff, Briefcase, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Project, MaterialRequest, Attendance, Workforce } from "@/types";

export default function PMDashboard() {
  const { user } = useAuth();
  const { projects, loading: projectsLoading, updateProject } = useProjects(undefined, user?.role);
  const { users } = useUsers(user?.role);
  const { attendance, checkIn, checkOut } = useAttendance(user?.role);
  const { requests, addRequest, updateRequestStatus } = useMaterialRequests(user?.role);
  const { workforce } = useWorkforce(user?.role);

  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "materials" | "attendance" | "cctv" | "timeline" | "safety">("overview");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isScheduling, setIsScheduling] = useState<string | null>(null);

  // Material Request Form
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    itemName: "",
    quantity: 0,
    unit: "pcs",
    note: ""
  });

  const myProjects = useMemo(() => {
    return projects.filter(p => p.pmId === user?.uid || user?.role === 'admin');
  }, [projects, user]);

  const handleAttendance = async () => {
    const isCheckedIn = attendance.find(a => a.userId === user?.uid && !a.checkOut);
    if (isCheckedIn) {
      await checkOut(isCheckedIn.id, { lat: -6.2, lng: 106.8 });
    } else {
      await checkIn({
        userId: user?.uid || "",
        userName: user?.displayName || "Unknown",
        checkIn: new Date().toISOString(),
        location: { lat: -6.2, lng: 106.8 },
        status: "present"
      });
    }
  };

  const handleMaterialRequest = async () => {
    if (!selectedProject || !newRequest.itemName) return;
    await addRequest({
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      requesterId: user?.uid || "",
      requesterName: user?.displayName || "Unknown",
      itemName: newRequest.itemName,
      quantity: newRequest.quantity,
      unit: newRequest.unit,
      status: "pending",
      note: newRequest.note
    });
    setShowRequestForm(false);
    setNewRequest({ itemName: "", quantity: 0, unit: "pcs", note: "" });
  };

  if (projectsLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 py-8">
      {/* PM Header */}
      <div className="flex justify-between items-end border-b-2 border-black pb-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-black uppercase tracking-tighter">PM Dashboard</h1>
          <p className="uppercase-soft text-neutral-500">Autonomous Project Management & Site Monitoring.</p>
        </div>
        <div className="flex gap-4">
          <Button 
            onClick={handleAttendance}
            className={cn(
              "h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
              attendance.find(a => a.userId === user?.uid && !a.checkOut) 
                ? "bg-red-500 hover:bg-red-600 text-white" 
                : "bg-green-500 hover:bg-green-600 text-white"
            )}
          >
            <Clock className="w-4 h-4 mr-2" />
            {attendance.find(a => a.userId === user?.uid && !a.checkOut) ? "Check Out (Site Exit)" : "Check In (Site Entry)"}
          </Button>
          <div className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl">
            <HardHat className="w-5 h-5 text-accent" />
            <span className="text-xs font-black uppercase tracking-widest">PM: {user?.displayName}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1 bg-neutral-100 rounded-2xl w-fit">
        {[
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "projects", label: "My Projects", icon: Briefcase },
          { id: "materials", label: "Materials", icon: Package },
          { id: "attendance", label: "Attendance", icon: Clock },
          { id: "cctv", label: "Live CCTV", icon: Camera },
          { id: "timeline", label: "Timeline", icon: BarChart3 },
          { id: "safety", label: "Safety & HSE", icon: ShieldCheck },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id ? "bg-black text-white shadow-md" : "text-neutral-500 hover:bg-black/5"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="border-2 border-black rounded-2xl">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase-soft">Active Sites</CardDescription>
                <CardTitle className="text-4xl font-black">{myProjects.filter(p => p.status === 'active').length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-2 border-black rounded-2xl">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase-soft">Pending Requests</CardDescription>
                <CardTitle className="text-4xl font-black text-accent">{requests.filter(r => r.status === 'pending').length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-2 border-black rounded-2xl">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase-soft">Workers on Site</CardDescription>
                <CardTitle className="text-4xl font-black">28</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-2 border-black rounded-2xl bg-black text-white">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase-soft text-white/60">KPI Performance</CardDescription>
                <CardTitle className="text-4xl font-black text-green-400">92%</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 border-black rounded-2xl overflow-hidden">
              <CardHeader className="bg-neutral-50 border-b-2 border-black">
                <CardTitle className="text-xl font-black uppercase tracking-tighter">Project Timeline (Gantt)</CardTitle>
              </CardHeader>
              <CardContent className="p-8 h-64 flex items-center justify-center text-neutral-300">
                <BarChart3 className="w-12 h-12" />
                <span className="uppercase-soft ml-2">Timeline Visualization</span>
              </CardContent>
            </Card>
            <Card className="border-2 border-black rounded-2xl overflow-hidden">
              <CardHeader className="bg-neutral-50 border-b-2 border-black">
                <CardTitle className="text-xl font-black uppercase tracking-tighter">Site Security (CCTV)</CardTitle>
              </CardHeader>
              <CardContent className="p-0 aspect-video bg-neutral-900 flex items-center justify-center text-white/20">
                <div className="text-center">
                  <CameraOff className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Select project to view feed</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "projects" && (
        <div className="space-y-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-4">
              <h3 className="text-lg font-black uppercase tracking-tighter">Project List</h3>
              {myProjects.map(p => (
                <Card 
                  key={p.id} 
                  className={cn(
                    "border-2 border-black rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md",
                    selectedProject?.id === p.id ? "bg-black text-white" : "bg-white"
                  )}
                  onClick={() => setSelectedProject(p)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-widest">{p.name}</h4>
                      <p className={cn("text-[9px] uppercase-soft mt-1", selectedProject?.id === p.id ? "text-white/60" : "text-neutral-400")}>
                        {p.location || "Jakarta"}
                      </p>
                    </div>
                    <Badge className={cn("text-[9px] uppercase-soft", p.status === 'active' ? "bg-green-500" : "bg-blue-500")}>
                      {p.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>

            <div className="md:col-span-2">
              {selectedProject ? (
                <Card className="border-2 border-black rounded-3xl overflow-hidden min-h-[600px]">
                  <CardHeader className="bg-neutral-50 border-b-2 border-black flex flex-row justify-between items-center">
                    <div>
                      <CardTitle className="text-2xl font-black uppercase tracking-tighter">{selectedProject.name}</CardTitle>
                      <CardDescription className="uppercase-soft">Project Details & Site Management</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="border-2 border-black rounded-xl h-10 text-[10px] font-black uppercase">
                        <MessageSquare className="w-4 h-4 mr-2" /> WA Client
                      </Button>
                      <Button className="btn-orange rounded-xl h-10 text-[10px] font-black uppercase" onClick={() => setShowRequestForm(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Request Material
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-3 gap-8">
                      <div className="space-y-1">
                        <p className="uppercase-soft text-[10px]">Progress</p>
                        <p className="text-2xl font-black">45.2%</p>
                        <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden border border-black/5">
                          <div className="h-full bg-accent w-[45.2%]" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="uppercase-soft text-[10px]">Budget Used</p>
                        <p className="text-2xl font-black text-red-500">Rp 1.2B</p>
                        <p className="text-[9px] text-neutral-400 uppercase font-bold">of Rp 2.8B Total</p>
                      </div>
                      <div className="space-y-1">
                        <p className="uppercase-soft text-[10px]">Deadline</p>
                        <p className="text-2xl font-black">120 Days</p>
                        <p className="text-[9px] text-accent uppercase font-bold">On Schedule</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <History className="w-4 h-4" /> Recent Site Logs
                      </h4>
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex gap-4 p-4 bg-neutral-50 rounded-2xl border border-black/5">
                            <div className="w-10 h-10 rounded-xl bg-white border border-black/10 flex items-center justify-center">
                              <Camera className="w-5 h-5 text-neutral-400" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest">Progress Update: Dinding Lantai 1</p>
                              <p className="text-[10px] text-neutral-500">Pemasangan bata hebel selesai 100%. Lanjut plester.</p>
                              <p className="text-[9px] text-neutral-400 mt-1">Today, 10:45 AM</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-neutral-50 rounded-3xl border-2 border-dashed border-black/10 p-20 text-center">
                  <Briefcase className="w-16 h-16 text-neutral-200 mb-4" />
                  <h3 className="text-xl font-black uppercase tracking-tighter text-neutral-400">Select a project to manage</h3>
                  <p className="uppercase-soft text-neutral-400 mt-2">Choose from the list on the left to see site details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "materials" && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Material Requests</h2>
            <Button className="btn-orange h-10 px-6 rounded-xl" onClick={() => setShowRequestForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Request
            </Button>
          </div>

          <Card className="border-2 border-black rounded-2xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="uppercase-soft">Project</TableHead>
                  <TableHead className="uppercase-soft">Item</TableHead>
                  <TableHead className="uppercase-soft">Qty</TableHead>
                  <TableHead className="uppercase-soft">Status</TableHead>
                  <TableHead className="uppercase-soft">Last Update</TableHead>
                  <TableHead className="uppercase-soft text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-[10px] font-black uppercase tracking-widest">{r.projectName}</TableCell>
                    <TableCell className="text-[10px] font-bold uppercase">{r.itemName}</TableCell>
                    <TableCell className="text-[10px] font-bold uppercase">{r.quantity} {r.unit}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "uppercase-soft text-[9px] rounded-md",
                        r.status === 'approved' ? "bg-green-500 text-white" : 
                        r.status === 'rejected' ? "bg-red-500 text-white" : "bg-neutral-200 text-neutral-600"
                      )}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-neutral-400">{new Date(r.updatedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase">View Log</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="space-y-8">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="md:col-span-2 border-2 border-black rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="bg-neutral-50 border-b-2 border-black">
                <CardTitle className="text-xl font-black uppercase tracking-tighter">Attendance Log</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="uppercase-soft">Name</TableHead>
                      <TableHead className="uppercase-soft">Check In</TableHead>
                      <TableHead className="uppercase-soft">Check Out</TableHead>
                      <TableHead className="uppercase-soft">Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="text-[10px] font-black uppercase tracking-widest">{a.userName}</TableCell>
                        <TableCell className="text-[10px] font-bold">{new Date(a.checkIn).toLocaleTimeString()}</TableCell>
                        <TableCell className="text-[10px] font-bold">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : "-"}</TableCell>
                        <TableCell className="text-[10px] text-neutral-400">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {a.location?.lat.toFixed(4)}, {a.location?.lng.toFixed(4)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-2 border-black rounded-2xl p-6 bg-black text-white">
              <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Site Security Info</h3>
              <div className="space-y-4">
                <div className="p-4 bg-white/10 rounded-xl border border-white/10">
                  <p className="text-[10px] uppercase-soft text-white/60">Current Status</p>
                  <p className="text-lg font-black text-green-400 uppercase">Site Secured</p>
                </div>
                <div className="p-4 bg-white/10 rounded-xl border border-white/10">
                  <p className="text-[10px] uppercase-soft text-white/60">Total Workforce</p>
                  <p className="text-lg font-black">28 Workers</p>
                </div>
                <div className="p-4 bg-white/10 rounded-xl border border-white/10">
                  <p className="text-[10px] uppercase-soft text-white/60">GPS Tracking</p>
                  <p className="text-lg font-black text-blue-400 uppercase">Active</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "cctv" && (
        <div className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="border-2 border-black rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-video bg-neutral-900 relative group">
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-white" /> LIVE: SITE {i}
                  </div>
                  <div className="absolute bottom-4 right-4 text-white/40 text-[9px] font-mono">
                    2026-04-10 13:28:11 UTC
                  </div>
                  <div className="w-full h-full flex items-center justify-center text-white/10">
                    <Camera className="w-16 h-16" />
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="outline" className="border-white text-white hover:bg-white hover:text-black rounded-xl">
                      Full Screen
                    </Button>
                  </div>
                </div>
                <CardHeader className="p-4 bg-neutral-50 border-t-2 border-black">
                  <CardTitle className="text-xs font-black uppercase tracking-widest">CCTV {i}: Area Konstruksi Utama</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="space-y-8">
          <Card className="border-2 border-black rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="bg-neutral-50 border-b-2 border-black">
              <CardTitle className="text-xl font-black uppercase tracking-tighter">Project Timeline & S-Curve</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
                  <p className="uppercase-soft text-blue-600 text-[10px]">Planned Progress</p>
                  <p className="text-3xl font-black text-blue-700">48.5%</p>
                </div>
                <div className="p-6 bg-green-50 rounded-2xl border-2 border-green-200">
                  <p className="uppercase-soft text-green-600 text-[10px]">Actual Progress</p>
                  <p className="text-3xl font-black text-green-700">45.2%</p>
                </div>
                <div className="p-6 bg-red-50 rounded-2xl border-2 border-red-200">
                  <p className="uppercase-soft text-red-600 text-[10px]">Deviation</p>
                  <p className="text-3xl font-black text-red-700">-3.3%</p>
                </div>
              </div>

              <div className="h-96 bg-neutral-50 rounded-2xl border-2 border-dashed border-black/10 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
                  <p className="uppercase-soft text-neutral-400">Interactive Gantt Chart & S-Curve Visualization</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "safety" && (
        <div className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 border-black rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="bg-neutral-50 border-b-2 border-black">
                <CardTitle className="text-xl font-black uppercase tracking-tighter">Safety Checklist (HSE)</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                {[
                  "Penggunaan APD Lengkap (Helm, Rompi, Sepatu)",
                  "Area Kerja Bersih & Teratur",
                  "Peralatan Listrik Aman & Terverifikasi",
                  "Scaffolding Terpasang Sesuai Standar",
                  "Papan Peringatan Terpasang di Area Berisiko",
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border-2 border-black rounded-xl">
                    <span className="text-xs font-bold uppercase tracking-widest">{item}</span>
                    <div className="w-6 h-6 border-2 border-black rounded-md flex items-center justify-center bg-green-500">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                ))}
                <Button className="w-full btn-sleek h-12 rounded-xl mt-4">Submit Safety Report</Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-black rounded-2xl overflow-hidden shadow-sm bg-red-50">
              <CardHeader className="bg-red-100 border-b-2 border-black">
                <CardTitle className="text-xl font-black uppercase tracking-tighter text-red-900">Incident Log</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center justify-center h-48 text-red-300">
                  <AlertCircle className="w-12 h-12" />
                  <span className="uppercase-soft ml-2">No Incidents Reported</span>
                </div>
                <Button variant="destructive" className="w-full h-12 rounded-xl uppercase font-black text-[10px]">Report New Incident</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Material Request Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-2 border-black rounded-3xl overflow-hidden animate-in zoom-in-95">
            <CardHeader className="bg-neutral-50 border-b-2 border-black">
              <CardTitle className="text-xl font-black uppercase tracking-tighter">Request Material to System</CardTitle>
              <CardDescription className="uppercase-soft">Log material request for {selectedProject?.name}.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest">Item Name</label>
                <Input 
                  placeholder="e.g. Bata Hebel, Semen Gresik" 
                  value={newRequest.itemName}
                  onChange={e => setNewRequest({...newRequest, itemName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Quantity</label>
                  <Input 
                    type="number"
                    value={newRequest.quantity}
                    onChange={e => setNewRequest({...newRequest, quantity: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Unit</label>
                  <Input 
                    placeholder="pcs, m3, sak" 
                    value={newRequest.unit}
                    onChange={e => setNewRequest({...newRequest, unit: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest">Note / Reason</label>
                <Input 
                  placeholder="e.g. Stok habis untuk pengerjaan dinding" 
                  value={newRequest.note}
                  onChange={e => setNewRequest({...newRequest, note: e.target.value})}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button variant="ghost" className="flex-grow" onClick={() => setShowRequestForm(false)}>Cancel</Button>
                <Button className="flex-grow btn-orange h-12" onClick={handleMaterialRequest}>
                  <Send className="w-4 h-4 mr-2" /> Submit Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
