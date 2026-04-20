import { useState, useMemo } from "react";
import { useProjects, useAuth, useUsers, useAttendance, useMaterialRequests, useWorkforce, useFinance, useWorkerWages, useProjectDetails, useSiteLogs } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { 
  Loader2, Calendar, CheckCircle2, Clock, MapPin, User, MessageSquare, 
  Phone, HardHat, Package, Camera, BarChart3, ChevronRight, Plus, 
  AlertCircle, LayoutDashboard, History, Send, CameraOff, Briefcase, ShieldCheck,
  Zap, Settings, Image as ImageIcon, Trash2, DollarSign, TrendingUp, Brain, Sparkles
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from "sonner";
import { cn, getDriveImageUrl, formatRupiah, calculateAdminPrice } from "@/lib/utils";
import { Project, MaterialRequest, Attendance, Workforce } from "@/types";

import { ImageUpload } from "@/components/ImageUpload";

export default function PMDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { projects, loading: projectsLoading, updateProject } = useProjects(undefined, user?.role);
  const { users } = useUsers(user?.role);
  const { attendance, checkIn, checkOut } = useAttendance(user?.role);
  const { requests, addRequest, updateRequestStatus } = useMaterialRequests(user?.role);
  const { workforce } = useWorkforce(user?.role);

  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "materials" | "attendance" | "cctv" | "timeline" | "safety" | "rab" | "pm-ai">("overview");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { project: projectDetails, categories, items, releaseMilestone, addSiteLog, updateItemProgress, addTimelineEvent } = useProjectDetails(selectedProject?.id);
  const { logs: siteLogs } = useSiteLogs(selectedProject?.id);
  const { transactions, addTransaction } = useFinance(selectedProject?.id);
  const { wages, addWage, updateWageStatus } = useWorkerWages(selectedProject?.id);
  const [isScheduling, setIsScheduling] = useState<string | null>(null);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: "",
    date: new Date().toISOString().split('T')[0],
    dueDate: "",
    status: "pending" as "pending" | "ongoing" | "completed",
    description: ""
  });

  // Bulk Material Request Form
  const [showBulkRequest, setShowBulkRequest] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [bulkItems, setBulkItems] = useState<{name: string, quantity: number, unit: string}[]>([
    { name: "", quantity: 0, unit: "pcs" }
  ]);

  const handleAddBulkItem = () => {
    setBulkItems([...bulkItems, { name: "", quantity: 0, unit: "pcs" }]);
  };

  const handleRemoveBulkItem = (index: number) => {
    setBulkItems(bulkItems.filter((_, i) => i !== index));
  };

  const handleUpdateBulkItem = (index: number, updates: any) => {
    const next = [...bulkItems];
    next[index] = { ...next[index], ...updates };
    setBulkItems(next);
  };

  const handleBulkRequestSubmit = async () => {
    if (!selectedProject || bulkItems.some(i => !i.name || i.quantity <= 0)) {
      toast.error("Mohon lengkapi semua data item.");
      return;
    }

    await addRequest({
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      requesterId: user?.uid || "",
      requesterName: user?.displayName || "Unknown",
      itemName: `${bulkItems.length} Material (Bulk Order)`,
      quantity: bulkItems.length,
      unit: "items",
      status: "pending",
      note: `Bulk order for ${selectedProject.name}`,
      items: bulkItems
    });

    setShowBulkRequest(false);
    setBulkItems([{ name: "", quantity: 0, unit: "pcs" }]);
    toast.success("Bulk Material Request submitted!");
  };
  const [newLog, setNewLog] = useState({
    title: "",
    description: "",
    photoUrl: "",
    progressUpdate: 0
  });

  const handleAddLog = async () => {
    if (!selectedProject || !newLog.title) return;
    await addSiteLog({
      ...newLog,
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      pmName: user?.displayName
    });
    
    // Update project progress if specified
    if (newLog.progressUpdate > 0) {
      const newProgress = Math.min(100, (selectedProject.progress || 0) + newLog.progressUpdate);
      await updateProject(selectedProject.id, { progress: newProgress });
    }

    setShowLogForm(false);
    setNewLog({ title: "", description: "", photoUrl: "", progressUpdate: 0 });
  };

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
      toast.success("Check-out berhasil. Data kehadiran telah direport ke sistem.");
    } else {
      await checkIn({
        userId: user?.uid || "",
        userName: user?.displayName || "Unknown",
        checkIn: new Date().toISOString(),
        location: { lat: -6.2, lng: 106.8 },
        status: "present"
      });
      toast.success("Check-in berhasil. Lokasi Anda telah tercatat.");
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

  const handleAddMilestone = async () => {
    if (!selectedProject || !newMilestone.title) return;
    const updatedTimeline = [
      ...(selectedProject.timeline || []),
      { ...newMilestone, id: Math.random().toString(36).substr(2, 9) }
    ];
    await updateProject(selectedProject.id, { timeline: updatedTimeline });
    setShowMilestoneForm(false);
    setNewMilestone({ title: "", date: new Date().toISOString().split('T')[0], dueDate: "", status: "pending", description: "" });
    toast.success("Milestone added to project timeline");
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
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate("/assistant")}
            className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] border-2 border-black"
          >
            <Zap className="w-4 h-4 mr-2 text-accent" />
            AI Estimator
          </Button>
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
          { id: "timeline", label: "S-Curve", icon: BarChart3 },
          { id: "rab", label: "Project RAB", icon: Briefcase },
          { id: "safety", label: "Safety & HSE", icon: ShieldCheck },
          { id: "pm-ai", label: "PM AI Assistant", icon: Brain },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id ? "bg-black text-white shadow-md" : "text-neutral-500 hover:bg-titanium/10"
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
            <Card className="border border-black/10 rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase-soft">Active Sites</CardDescription>
                <CardTitle className="text-4xl font-black">{myProjects.filter(p => p.status === 'active').length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border border-black/10 rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase-soft">Pending Requests</CardDescription>
                <CardTitle className="text-4xl font-black text-accent">{requests.filter(r => r.status === 'pending').length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border border-black/10 rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase-soft">Workers on Site</CardDescription>
                <CardTitle className="text-4xl font-black">28</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border border-black/10 rounded-2xl bg-black text-white shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="uppercase-soft text-white/60">KPI Performance</CardDescription>
                <CardTitle className="text-4xl font-black text-green-400">92%</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border border-black/10 rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="bg-neutral-50 border-b border-black/10">
                <CardTitle className="text-xl font-black uppercase tracking-tighter">Project Timeline (Gantt)</CardTitle>
              </CardHeader>
              <CardContent className="p-8 h-64 flex items-center justify-center text-neutral-300">
                <BarChart3 className="w-12 h-12" />
                <span className="uppercase-soft ml-2">Timeline Visualization</span>
              </CardContent>
            </Card>
            <Card className="border border-black/10 rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="bg-neutral-50 border-b border-black/10">
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
                    "border border-black/10 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md",
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
                <Card className="border border-black/10 rounded-3xl overflow-hidden min-h-[600px] shadow-sm">
                  <CardHeader className="bg-neutral-50 border-b border-black/10 flex flex-row justify-between items-center">
                    <div>
                      <CardTitle className="text-2xl font-black uppercase tracking-tighter">{selectedProject.name}</CardTitle>
                      <CardDescription className="uppercase-soft">Project Details & Site Management</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="border border-black/10 rounded-xl h-10 text-[10px] font-black uppercase">
                        <MessageSquare className="w-4 h-4 mr-2" /> WA Client
                      </Button>
                      <Button className="btn-orange rounded-xl h-10 text-[10px] font-black uppercase" onClick={() => setShowBulkRequest(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Bulk Order Material
                      </Button>
                      <Button variant="outline" className="border-2 border-black rounded-xl h-10 text-[10px] font-black uppercase" onClick={() => setShowRequestForm(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Single Req
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-3 gap-8">
                      <div className="space-y-1">
                        <p className="uppercase-soft text-[10px]">Progress</p>
                        <p className="text-2xl font-black">{(selectedProject.progress || 0).toFixed(1)}%</p>
                        <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden border border-black/5">
                          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${selectedProject.progress || 0}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="uppercase-soft text-[10px]">Budget Used</p>
                        <p className="text-2xl font-black text-red-500">{formatRupiah(calculateAdminPrice(selectedProject.releasedAmount || 0))}</p>
                        <p className="text-[9px] text-neutral-400 uppercase font-bold">of {formatRupiah(calculateAdminPrice(selectedProject.totalBudget || 0))} Total (Adm)</p>
                      </div>
                      <div className="space-y-1">
                        <p className="uppercase-soft text-[10px]">Deadline</p>
                        <p className="text-2xl font-black">120 Days</p>
                        <p className="text-[9px] text-accent uppercase font-bold">On Schedule</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                          <History className="w-4 h-4" /> Recent Site Logs
                        </h4>
                        <Button size="sm" className="btn-orange h-8 text-[9px] font-black uppercase" onClick={() => setShowLogForm(true)}>
                          <Plus className="w-3 h-3 mr-1" /> Add Log
                        </Button>
                      </div>

                      {showLogForm && (
                        <Card className="border border-black/10 p-4 bg-neutral-50 space-y-4 animate-in fade-in slide-in-from-top-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase">Log Title</label>
                              <Input 
                                placeholder="e.g. Pengecoran Kolom" 
                                className="h-8 text-xs"
                                value={newLog.title}
                                onChange={e => setNewLog({...newLog, title: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase">Progress Boost (%)</label>
                              <Input 
                                type="number" 
                                className="h-8 text-xs"
                                value={newLog.progressUpdate}
                                onChange={e => setNewLog({...newLog, progressUpdate: Number(e.target.value)})}
                              />
                            </div>
                            <div className="col-span-2 space-y-1">
                              <label className="text-[9px] font-black uppercase">Progress Photo</label>
                              <ImageUpload 
                                path="site_logs"
                                label="Ambil Foto Progress"
                                onUploadComplete={(url) => setNewLog({...newLog, photoUrl: url})}
                              />
                            </div>
                            <div className="col-span-2 space-y-1">
                              <label className="text-[9px] font-black uppercase">Description</label>
                              <Textarea 
                                className="text-xs min-h-[60px]"
                                value={newLog.description}
                                onChange={e => setNewLog({...newLog, description: e.target.value})}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase" onClick={() => setShowLogForm(false)}>Cancel</Button>
                            <Button size="sm" className="btn-sleek h-8 text-[9px] font-black uppercase" onClick={handleAddLog}>Save Log</Button>
                          </div>
                        </Card>
                      )}

                      <div className="space-y-3">
                        {siteLogs.map(log => (
                          <div key={log.id} className="flex gap-4 p-4 bg-neutral-50 rounded-2xl border border-black/5 group">
                            <div className="w-16 h-16 rounded-xl bg-white border border-black/10 overflow-hidden flex items-center justify-center shrink-0">
                              {log.photoUrl ? (
                                <img src={getDriveImageUrl(log.photoUrl)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Camera className="w-5 h-5 text-neutral-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <p className="text-[10px] font-black uppercase tracking-widest">{log.title}</p>
                                {log.progressUpdate > 0 && (
                                  <Badge className="bg-green-500 text-white text-[8px] font-black">+{log.progressUpdate}% Progress</Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-neutral-500 mt-1">{log.description}</p>
                              <p className="text-[9px] text-neutral-400 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                        {siteLogs.length === 0 && (
                          <div className="text-center py-8 text-neutral-400 italic text-[10px]">No site logs recorded yet.</div>
                        )}
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
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Live Site Monitoring</h2>
            <div className="flex gap-2">
              <Button variant="outline" className="border-2 border-black rounded-xl h-10 text-[10px] font-black uppercase">
                <Settings className="w-4 h-4 mr-2" /> Config CCTV
              </Button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {(selectedProject?.cctvUrls || [
              { id: 1, name: "Main Construction Area", url: "https://www.youtube.com/embed/1EiC9bvVGnk" },
              { id: 2, name: "Material Storage", url: "https://www.youtube.com/embed/5_XSYlAfJZM" },
            ]).map((site: any) => (
              <Card key={site.id} className="border-2 border-black rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-video bg-neutral-900 relative group">
                  <iframe 
                    src={`${site.url}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0`}
                    className="w-full h-full border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest animate-pulse pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-white" /> LIVE: {site.name}
                  </div>
                  <div className="absolute bottom-4 right-4 text-white/40 text-[9px] font-mono pointer-events-none">
                    {new Date().toISOString().replace('T', ' ').split('.')[0]} UTC
                  </div>
                </div>
                <CardHeader className="p-4 bg-neutral-50 border-t-2 border-black">
                  <CardTitle className="text-xs font-black uppercase tracking-widest">CCTV {site.id}: {site.name}</CardTitle>
                </CardHeader>
              </Card>
            ))}
            {!selectedProject && (
              <div className="col-span-2 py-20 text-center border-2 border-dashed border-black/10 rounded-3xl">
                <CameraOff className="w-12 h-12 mx-auto mb-4 text-neutral-200" />
                <p className="uppercase-soft text-neutral-400">Pilih proyek untuk melihat feed CCTV khusus proyek tersebut.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="space-y-8">
          <Card className="border-2 border-black rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="bg-neutral-50 border-b-2 border-black">
              <CardTitle className="text-xl font-black uppercase tracking-tighter">Project S-Curve Analysis</CardTitle>
              <CardDescription className="uppercase-soft">Real-time progress vs planned schedule.</CardDescription>
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

              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      { week: 'W1', planned: 5, actual: 4 },
                      { week: 'W2', planned: 12, actual: 10 },
                      { week: 'W3', planned: 22, actual: 18 },
                      { week: 'W4', planned: 35, actual: 30 },
                      { week: 'W5', planned: 48, actual: 45 },
                      { week: 'W6', planned: 60, actual: null },
                      { week: 'W7', planned: 75, actual: null },
                      { week: 'W8', planned: 90, actual: null },
                      { week: 'W9', planned: 100, actual: null },
                    ]}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="week" stroke="#000" fontSize={10} fontWeight="bold" />
                    <YAxis stroke="#000" fontSize={10} fontWeight="bold" unit="%" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Line type="monotone" dataKey="planned" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 8 }} name="PLANNED" />
                    <Line type="monotone" dataKey="actual" stroke="#ef4444" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 8 }} name="ACTUAL" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "rab" && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Project RAB & Timeline</h2>
            <div className="flex gap-2">
              <Button variant="outline" className="border border-black/10 rounded-xl h-10 text-[10px] font-black uppercase">
                <History className="w-4 h-4 mr-2" /> View Revision History
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="md:col-span-2 border border-black/10 rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="bg-neutral-50 border-b border-black/10 flex flex-row justify-between items-center">
                <CardTitle className="text-xl font-black uppercase tracking-tighter">Budget Items & Progress</CardTitle>
                <Button size="sm" className="btn-sleek h-8 rounded-lg text-[10px]">
                  <Plus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="uppercase-soft">Work Item</TableHead>
                      <TableHead className="uppercase-soft">Progress</TableHead>
                      <TableHead className="uppercase-soft">Photos</TableHead>
                      <TableHead className="uppercase-soft text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-[10px] font-black uppercase tracking-widest">{item.name}</TableCell>
                        <TableCell className="w-48">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-black">
                              <span>{item.progress || 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden border border-black/5">
                              <div className="h-full bg-green-500 transition-all" style={{ width: `${item.progress || 0}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex -space-x-2">
                            {item.photos?.progress?.slice(0, 3).map((img, j) => (
                              <div key={j} className="w-6 h-6 rounded-full border-2 border-white bg-neutral-200 overflow-hidden">
                                <img src={getDriveImageUrl(img)} className="w-full h-full object-cover" />
                              </div>
                            ))}
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-neutral-100 border-2 border-white">
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Input 
                              type="number" 
                              className="w-16 h-8 text-center text-[10px] font-black border-black/10" 
                              value={item.progress || 0}
                              onChange={(e) => updateItemProgress(item.id, Number(e.target.value))}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Camera className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-neutral-400 italic text-[10px]">No budget items found for this project.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border border-black/10 rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="bg-neutral-50 border-b border-black/10">
                <CardTitle className="text-xl font-black uppercase tracking-tighter">Project Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {(projectDetails?.timeline || []).map((event, i) => (
                  <div key={event.id} className="flex gap-4 relative">
                    {i < (projectDetails?.timeline?.length || 0) - 1 && <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-neutral-200" />}
                    <div className={cn(
                      "w-4 h-4 rounded-full border border-black/20 z-10",
                      event.status === 'completed' ? "bg-green-500" : 
                      event.status === 'ongoing' ? "bg-accent animate-pulse" : "bg-white"
                    )} />
                    <div className="space-y-1 flex-grow">
                      <div className="flex justify-between items-start">
                        <p className="text-[10px] font-black uppercase tracking-widest">{event.title}</p>
                        <Badge variant="outline" className="text-[8px] uppercase border-black/10">{event.status}</Badge>
                      </div>
                      <div className="flex gap-4">
                        <p className="text-[9px] text-neutral-400 font-bold">Start: {event.date}</p>
                        {event.dueDate && <p className="text-[9px] text-red-400 font-bold">Due: {event.dueDate}</p>}
                      </div>
                    </div>
                  </div>
                ))}
                
                {showMilestoneForm && (
                  <div className="p-4 border border-black/10 rounded-xl bg-neutral-50 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase">Milestone Title</label>
                      <Input 
                        className="h-8 text-xs border-black/10" 
                        value={newMilestone.title}
                        onChange={e => setNewMilestone({...newMilestone, title: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase">Start Date</label>
                        <Input 
                          type="date" 
                          className="h-8 text-xs border-black/10" 
                          value={newMilestone.date}
                          onChange={e => setNewMilestone({...newMilestone, date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase">Due Date</label>
                        <Input 
                          type="date" 
                          className="h-8 text-xs border-black/10" 
                          value={newMilestone.dueDate}
                          onChange={e => setNewMilestone({...newMilestone, dueDate: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" className="flex-1 h-8 text-[8px] uppercase font-black" onClick={() => setShowMilestoneForm(false)}>Cancel</Button>
                      <Button className="flex-1 h-8 text-[8px] uppercase font-black btn-sleek" onClick={async () => {
                        if (!newMilestone.title) return;
                        await addTimelineEvent(newMilestone);
                        setShowMilestoneForm(false);
                        setNewMilestone({ title: "", date: new Date().toISOString().split('T')[0], dueDate: "", status: "pending", description: "" });
                      }}>Add</Button>
                    </div>
                  </div>
                )}

                {!showMilestoneForm && (
                  <Button className="w-full btn-sleek h-10 rounded-xl mt-4" onClick={() => setShowMilestoneForm(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Milestone
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "pm-ai" && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter">PM AI Strategic Assistant</h2>
            <div className="flex gap-4">
              <select 
                className="h-10 rounded-xl border-2 border-black/10 px-3 text-sm"
                value={selectedProject?.id || ""}
                onChange={e => setSelectedProject(myProjects.find(p => p.id === e.target.value) || null)}
              >
                <option value="">Select Project for Analysis...</option>
                {myProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center py-20 bg-neutral-50 rounded-3xl border-2 border-dashed border-black/10">
              <Brain className="w-12 h-12 text-neutral-300 mb-4" />
              <p className="text-sm font-black uppercase tracking-widest text-neutral-400">Pilih proyek untuk mendapatkan saran AI</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="md:col-span-2 border border-black/10 rounded-3xl overflow-hidden bg-black text-white relative shadow-sm">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Brain className="w-48 h-48" />
                </div>
                <CardHeader className="border-b border-white/10 relative z-10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black uppercase tracking-tighter">PM AI Strategic Assistant</CardTitle>
                        <CardDescription className="text-white/60 uppercase-soft">Real-time Site Optimization & Goal Setting</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={() => {
                          toast.info("AI Strategic History coming soon...");
                        }}
                      >
                        <Clock className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={async () => {
                          toast.promise(new Promise(r => setTimeout(r, 2000)), {
                            loading: 'Analyzing site data...',
                            success: 'Strategic suggestions updated!',
                            error: 'Failed to analyze'
                          });
                        }}
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8 relative z-10">
                  <div className="space-y-6">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Analisis Bobot Hari Ini
                      </h4>
                      <p className="text-sm leading-relaxed text-white/80">
                        Berdasarkan data absensi {workforce.length} tukang dan laporan material, bobot pekerjaan hari ini diprediksi mencapai <span className="text-white font-black">1.2%</span>. 
                        Fokus utama pada pengerjaan dinding lantai 2 menunjukkan efisiensi tinggi.
                      </p>
                    </div>

                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Target & Tujuan Besok
                      </h4>
                      <ul className="space-y-3">
                        {[
                          "Selesaikan pengecoran kolom praktis zona B",
                          "Persiapan bekisting plat lantai 3",
                          "Verifikasi kedatangan material besi D13"
                        ].map((goal, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                            <div className="w-5 h-5 rounded-full bg-blue-400/20 flex items-center justify-center mt-0.5">
                              <span className="text-[10px] font-black text-blue-400">{i+1}</span>
                            </div>
                            {goal}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-6 bg-accent/10 rounded-2xl border border-accent/20 space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> AI Warning & Reminder
                      </h4>
                      <p className="text-sm leading-relaxed text-white/80 italic">
                        "Prediksi hujan besok sore mencapai 80%. AI menyarankan percepatan pengecoran sebelum jam 12 siang atau penundaan hingga lusa untuk menjaga kualitas beton."
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-8">
                <Card className="border border-black/10 rounded-3xl p-6 bg-accent text-white shadow-sm">
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Site Performance</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                      <p className="text-[10px] uppercase-soft text-white/60">Worker Efficiency</p>
                      <p className="text-3xl font-black">94%</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                      <p className="text-[10px] uppercase-soft text-white/60">Material Waste Ratio</p>
                      <p className="text-3xl font-black">2.4%</p>
                    </div>
                  </div>
                </Card>

                <Card className="border border-black/10 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Daily Report Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase">Progress Weight</span>
                      <span className="text-xs font-bold text-green-600">+1.2%</span>
                    </div>
                    <Progress value={75} className="h-2" />
                    <p className="text-[10px] text-neutral-400 italic mt-2">Generated by TBJ Constech OS AI</p>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "safety" && (
        <div className="space-y-8">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="md:col-span-2 border border-black/10 rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="bg-neutral-50 border-b border-black/10">
                <CardTitle className="text-xl font-black uppercase tracking-tighter">Safety Checklist (HSE)</CardTitle>
                <CardDescription className="uppercase-soft">Daily site safety verification protocol.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                {[
                  { item: "Penggunaan APD Lengkap (Helm, Rompi, Sepatu)", status: "ok", category: "Personal Protection" },
                  { item: "Area Kerja Bersih & Teratur", status: "ok", category: "Housekeeping" },
                  { item: "Peralatan Listrik Aman & Terverifikasi", status: "ok", category: "Electrical" },
                  { item: "Scaffolding Terpasang Sesuai Standar", status: "ok", category: "Working at Height" },
                  { item: "Papan Peringatan Terpasang di Area Berisiko", status: "ok", category: "Signage" },
                  { item: "Penyediaan Kotak P3K & APAR di Lokasi", status: "warning", category: "Emergency" },
                  { item: "Verifikasi Izin Kerja (Work Permit) Berisiko Tinggi", status: "ok", category: "Administrative" },
                ].map((check, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-black/10 rounded-xl bg-white hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        check.status === "ok" ? "bg-green-500" : "bg-yellow-500 animate-pulse"
                      )} />
                      <div className="space-y-0.5">
                        <span className="text-xs font-black uppercase tracking-widest block">{check.item}</span>
                        <span className="text-[9px] uppercase-soft text-neutral-400">{check.category}</span>
                      </div>
                    </div>
                    <div className={cn(
                      "w-6 h-6 border border-black/10 rounded-md flex items-center justify-center cursor-pointer",
                      check.status === "ok" ? "bg-green-500" : "bg-white"
                    )}>
                      {check.status === "ok" ? <CheckCircle2 className="w-4 h-4 text-white" /> : <AlertCircle className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </div>
                ))}
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Incident Type</label>
                    <select className="w-full h-12 border border-black/10 rounded-xl px-4 text-xs font-bold uppercase">
                      <option>None / Safe</option>
                      <option>Near Miss</option>
                      <option>Minor Injury</option>
                      <option>Major Injury</option>
                      <option>Property Damage</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Weather Condition</label>
                    <select className="w-full h-12 border border-black/10 rounded-xl px-4 text-xs font-bold uppercase">
                      <option>Sunny / Clear</option>
                      <option>Cloudy</option>
                      <option>Rainy</option>
                      <option>Heavy Rain / Storm</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Catatan HSE Tambahan</label>
                  <Textarea placeholder="Input catatan kondisi lapangan, temuan bahaya, atau tindakan korektif..." className="mb-4 border border-black/10 rounded-xl min-h-[100px]" />
                  <Button className="w-full btn-orange h-14 rounded-xl font-black uppercase tracking-widest">Submit Daily HSE Report</Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="border border-black/10 rounded-2xl p-6 bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                <div className="flex justify-between items-start mb-6">
                  <ShieldCheck className="w-10 h-10" />
                  <Badge className="bg-white text-red-600 border-none font-black">LIVE STATS</Badge>
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Safety Performance</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                    <p className="text-[10px] uppercase-soft text-white/60">Days Without Incident</p>
                    <p className="text-3xl font-black">142 DAYS</p>
                  </div>
                  <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                    <p className="text-[10px] uppercase-soft text-white/60">Safety Score</p>
                    <p className="text-3xl font-black">98.5 / 100</p>
                  </div>
                </div>
              </Card>

              <Card className="border border-black/10 rounded-2xl p-6 bg-white shadow-sm">
                <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Safety Equipment</h3>
                <div className="space-y-3">
                  {[
                    { name: "Helmets", stock: 45, min: 40 },
                    { name: "Vests", stock: 38, min: 40 },
                    { name: "Safety Shoes", stock: 12, min: 10 },
                    { name: "First Aid Kits", stock: 4, min: 5 },
                  ].map((eq, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest">{eq.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs font-bold",
                          eq.stock < eq.min ? "text-red-500" : "text-green-600"
                        )}>{eq.stock}</span>
                        <Progress value={(eq.stock / 50) * 100} className="w-16 h-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-6 border border-black/10 h-10 text-[10px] font-black uppercase">Request PPE Restock</Button>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Modal */}
      {showMilestoneForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border border-black/10 rounded-3xl overflow-hidden animate-in zoom-in-95 shadow-2xl">
            <CardHeader className="bg-neutral-50 border-b border-black/10">
              <CardTitle className="text-xl font-black uppercase tracking-tighter">Add Project Milestone</CardTitle>
              <CardDescription className="uppercase-soft">Schedule a new task for {selectedProject?.name}.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest">Milestone Title</label>
                <Input 
                  placeholder="e.g. Pemasangan Atap" 
                  value={newMilestone.title}
                  onChange={e => setNewMilestone({...newMilestone, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Start Date</label>
                  <Input 
                    type="date"
                    value={newMilestone.date}
                    onChange={e => setNewMilestone({...newMilestone, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Due Date</label>
                  <Input 
                    type="date"
                    value={newMilestone.dueDate}
                    onChange={e => setNewMilestone({...newMilestone, dueDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest">Initial Status</label>
                <select 
                  className="w-full h-10 rounded-md border border-black/10 px-3 text-sm"
                  value={newMilestone.status}
                  onChange={e => setNewMilestone({...newMilestone, status: e.target.value as any})}
                >
                  <option value="pending">Pending</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <Button variant="ghost" className="flex-grow" onClick={() => setShowMilestoneForm(false)}>Cancel</Button>
                <Button className="flex-grow btn-orange h-12" onClick={handleAddMilestone}>
                  Save Milestone
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Material Request Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border border-black/10 rounded-3xl overflow-hidden animate-in zoom-in-95 shadow-2xl">
            <CardHeader className="bg-neutral-50 border-b border-black/10">
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
                    value={newRequest.quantity || 0}
                    onChange={e => setNewRequest({...newRequest, quantity: Math.max(0, Number(e.target.value))})}
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
      {/* Bulk Material Request Modal */}
      {showBulkRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border border-black/10 rounded-3xl overflow-hidden animate-in zoom-in-95 shadow-2xl">
            <CardHeader className="bg-neutral-50 border-b border-black/10">
              <CardTitle className="text-xl font-black uppercase tracking-tighter">Bulk Material Procurement</CardTitle>
              <CardDescription className="uppercase-soft">Request multi-item materials for {selectedProject?.name}.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {bulkItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 bg-neutral-50 rounded-2xl border border-black/5 group">
                    <div className="col-span-6 space-y-1">
                      <label className="text-[10px] font-black uppercase text-neutral-400">Material Name</label>
                      <Input 
                        placeholder="e.g. Semen, Besi, Pasir"
                        value={item.name}
                        onChange={e => handleUpdateBulkItem(index, { name: e.target.value })}
                        className="h-10 text-xs font-bold"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase text-neutral-400">Qty</label>
                      <Input 
                        type="number"
                        value={item.quantity}
                        onChange={e => handleUpdateBulkItem(index, { quantity: Number(e.target.value) })}
                        className="h-10 text-xs font-black text-center"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase text-neutral-400">Unit</label>
                      <Input 
                        placeholder="pcs"
                        value={item.unit}
                        onChange={e => handleUpdateBulkItem(index, { unit: e.target.value })}
                        className="h-10 text-xs font-bold"
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                        onClick={() => handleRemoveBulkItem(index)}
                        disabled={bulkItems.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-black/5">
                <Button 
                  variant="outline" 
                  onClick={handleAddBulkItem}
                  className="h-12 px-6 rounded-xl border-2 border-black font-black uppercase text-[10px]"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Material Row
                </Button>
                <div className="flex gap-4">
                  <Button variant="ghost" className="px-8 rounded-xl uppercase font-black text-[10px]" onClick={() => setShowBulkRequest(false)}>Cancel</Button>
                  <Button className="btn-orange h-12 px-8 rounded-xl uppercase font-black text-[10px]" onClick={handleBulkRequestSubmit}>
                    Submit Bulk Order
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
