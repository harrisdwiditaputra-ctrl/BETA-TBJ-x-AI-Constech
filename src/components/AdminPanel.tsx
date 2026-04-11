import { useState, useEffect, useMemo } from "react";
import { useMasterData, useAuth, useUsers, useProjects, useWorkforce, useMaterialRequests, useProperties } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, Search, Save, UserPlus, Database, Settings, ShieldCheck, 
  RefreshCw, TrendingUp, DollarSign, Users, Briefcase, Plus, ChevronDown, 
  ChevronRight, Download, Eye, EyeOff, Trash2, Image as ImageIcon, 
  LayoutDashboard, FileText, HardHat, Camera, BarChart3, Clock, Phone, User
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import PMDashboard from "./PMDashboard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WorkItemMaster, UserProfile, Project, Workforce, MaterialRequest, Property } from "@/types";

export default function AdminPanel() {
  const { user } = useAuth();
  const { masterData, loading: masterLoading, addMasterItem, updateMasterItem, deleteMasterItem, resetDatabase } = useMasterData(user?.role);
  const { users, loading: usersLoading, updateUser } = useUsers(user?.role);
  const { projects, loading: projectsLoading, updateProject, deleteProject } = useProjects(undefined, user?.role);
  const { workforce, loading: workforceLoading, addWorkforce, updateWorkforce } = useWorkforce(user?.role);
  const { requests, loading: requestsLoading, updateRequestStatus } = useMaterialRequests(user?.role);
  const { properties, loading: propertiesLoading, addProperty, updateProperty } = useProperties();

  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "clients" | "projects" | "workforce" | "cms" | "finance" | "marketing" | "management">("dashboard");
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  // Master Data Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WorkItemMaster>>({});

  const handleEdit = (item: WorkItemMaster) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleSaveEdit = async () => {
    if (editingId && editForm) {
      await updateMasterItem(editingId, editForm);
      setEditingId(null);
      setEditForm({});
      toast.success("Product updated successfully");
    }
  };
  const [newProduct, setNewProduct] = useState<Partial<WorkItemMaster>>({
    category: "",
    name: "",
    description: "",
    unit: "m2",
    price: 0,
    status: "visible"
  });
  const [showAddProduct, setShowAddProduct] = useState(false);

  const [newProperty, setNewProperty] = useState<Partial<Property>>({
    title: "",
    type: "jual",
    price: 0,
    area: 0,
    description: "",
    status: "available",
    photos: [],
    features: []
  });

  const handleAddProperty = async () => {
    if (!newProperty.title) return;
    await addProperty(newProperty as any);
    setNewProperty({ title: "", type: "jual", price: 0, area: 0, description: "", status: "available", photos: [], features: [] });
    toast.success("Listing published successfully");
  };

  // Grouping Master Data
  const groupedMaster = useMemo(() => {
    const groups: Record<string, WorkItemMaster[]> = {};
    masterData.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [masterData]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const generateCode = (category: string) => {
    const prefix = category.substring(0, 2).toUpperCase();
    const count = masterData.filter(i => i.category === category).length + 1;
    return `${prefix}${count.toString().padStart(3, '0')}`;
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.category) return;
    const code = generateCode(newProduct.category);
    await addMasterItem({
      ...newProduct as any,
      code,
      soldCount: 0,
      revenue: 0,
      status: "visible"
    });
    setShowAddProduct(false);
    setNewProduct({ category: "", name: "", description: "", unit: "m2", price: 0 });
  };

  const exportClients = () => {
    const headers = "Name,Email,Tier,Role,Location,Created At\n";
    const rows = users.map(u => `${u.displayName},${u.email},${u.tier},${u.role},${u.location || "-"},${u.createdAt}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tbj_clients_list.csv";
    a.click();
    toast.success("Client list exported to CSV");
  };

  if (user?.role !== "admin" && user?.role !== "pm") return <div className="py-20 text-center uppercase-soft">Access Denied. Admin/PM Only.</div>;
  if (masterLoading || usersLoading || projectsLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Sidebar-like Navigation */}
      <div className="flex flex-col md:flex-row gap-8 py-8">
        <div className="w-full md:w-64 space-y-2">
          <div className="p-6 bg-black text-white rounded-2xl mb-8">
            <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent" /> TBJ ENGINE
            </h2>
            <p className="text-[10px] uppercase-soft text-white/50 mt-1">Autonomous ERP v2.0</p>
          </div>
          
          {[
            { id: "dashboard", label: "Insights", icon: LayoutDashboard },
            { id: "products", label: "Products (AHSP)", icon: Database },
            { id: "projects", label: "Projects", icon: Briefcase },
            { id: "clients", label: "Clients", icon: Users },
            { id: "workforce", label: "Workforce", icon: HardHat },
            { id: "cms", label: "CMS Content", icon: ImageIcon },
            { id: "finance", label: "Finance", icon: DollarSign },
            { id: "marketing", label: "Marketing", icon: TrendingUp },
            { id: "management", label: "Management", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === tab.id ? "bg-black text-white shadow-lg" : "text-neutral-500 hover:bg-titanium/10"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
          
          <div className="pt-8 mt-8 border-t border-black/5">
            <Button 
              variant="destructive" 
              className="w-full gap-2 rounded-xl h-12 uppercase font-black text-[10px]"
              onClick={resetDatabase}
            >
              <RefreshCw className="w-4 h-4" /> Reset System
            </Button>
          </div>
        </div>

        <div className="flex-grow space-y-8">
          {/* Header Info */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter">
                {activeTab === "dashboard" && "Business Insights"}
                {activeTab === "products" && "Master Database (Products)"}
                {activeTab === "projects" && "Project Management"}
                {activeTab === "clients" && "Client Database"}
                {activeTab === "workforce" && "Workforce & Security"}
                {activeTab === "cms" && "Content Management"}
                {activeTab === "finance" && "Financial Reports"}
                {activeTab === "marketing" && "Marketing & Engagement"}
                {activeTab === "management" && "System Management"}
              </h1>
              <p className="uppercase-soft text-neutral-500">Welcome back, {user?.displayName}. System is running optimally.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-[10px] font-black uppercase tracking-widest">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-[10px] uppercase-soft text-accent">Server Status: Online</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-black">
                {user?.displayName?.[0]}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              <div className="grid md:grid-cols-4 gap-6">
                <Card className="border-2 border-black rounded-2xl shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="uppercase-soft">Total Revenue</CardDescription>
                    <CardTitle className="text-3xl font-black">Rp 4.82B</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-green-500 text-[10px] font-bold">
                      <TrendingUp className="w-3 h-3" /> +12.5% vs last month
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-black rounded-2xl shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="uppercase-soft">Active Projects</CardDescription>
                    <CardTitle className="text-3xl font-black">{projects.length}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-blue-500 text-[10px] font-bold">
                      <Briefcase className="w-3 h-3" /> 4 projects near deadline
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-black rounded-2xl shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="uppercase-soft">Total Clients</CardDescription>
                    <CardTitle className="text-3xl font-black">{users.length}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-accent text-[10px] font-bold">
                      <Users className="w-3 h-3" /> 8 new leads today
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-black rounded-2xl shadow-sm bg-black text-white">
                  <CardHeader className="pb-2">
                    <CardDescription className="uppercase-soft text-white/50">Workforce Online</CardDescription>
                    <CardTitle className="text-3xl font-black">42/45</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-green-400 text-[10px] font-bold">
                      <Clock className="w-3 h-3" /> All sites reported
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-2 border-black rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">Recent Activities</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex items-start gap-4 pb-4 border-b border-black/5 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-neutral-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest">Payment Verified</p>
                          <p className="text-[10px] text-neutral-500">Klien Budi Santoso (Tier 2) lunas biaya survey.</p>
                          <p className="text-[9px] text-accent mt-1">2 hours ago</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border-2 border-black rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">Project Progress (S-Curve)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64 flex items-center justify-center bg-neutral-50 rounded-xl border border-dashed border-black/10">
                    <BarChart3 className="w-12 h-12 text-neutral-300" />
                    <span className="uppercase-soft text-neutral-400 ml-2">Visualization Placeholder</span>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div className="relative w-96">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <Input 
                    placeholder="Search products/categories..." 
                    className="pl-10 h-10 border-2 border-black rounded-xl"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <Button className="btn-orange h-10 px-6 rounded-xl" onClick={() => setShowAddProduct(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add New Product
                </Button>
              </div>

              {showAddProduct && (
                <Card className="border-2 border-black rounded-2xl p-6 bg-neutral-50 animate-in fade-in slide-in-from-top-4">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Category</label>
                      <Input 
                        placeholder="e.g. Pekerjaan Tanah" 
                        value={newProduct.category}
                        onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Product Name</label>
                      <Input 
                        placeholder="e.g. Galian Tanah" 
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Unit</label>
                      <Input 
                        placeholder="m3, m2, ls" 
                        value={newProduct.unit}
                        onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Price (Rp)</label>
                      <Input 
                        type="number"
                        value={newProduct.price}
                        onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="uppercase-soft text-[10px]">Description</label>
                      <Input 
                        placeholder="Detailed description of the work item..." 
                        value={newProduct.description}
                        onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-4 mt-6">
                    <Button variant="ghost" onClick={() => setShowAddProduct(false)}>Cancel</Button>
                    <Button className="btn-sleek px-8" onClick={handleAddProduct}>Save Product</Button>
                  </div>
                </Card>
              )}

              <div className="space-y-4">
                {Object.entries(groupedMaster).map(([category, items]) => (
                  <Card key={category} className="border-2 border-black rounded-2xl overflow-hidden shadow-sm">
                    <button 
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-4 bg-neutral-50 hover:bg-neutral-100 transition-colors border-b-2 border-black"
                    >
                      <div className="flex items-center gap-3">
                        {expandedCategories.includes(category) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        <h3 className="text-sm font-black uppercase tracking-widest">{category}</h3>
                        <Badge className="bg-black text-white text-[9px]">{items.length} Items</Badge>
                      </div>
                      <div className="text-[10px] uppercase-soft text-neutral-400">Expand to manage items</div>
                    </button>
                    
                    {expandedCategories.includes(category) && (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-white">
                            <TableHead className="uppercase-soft w-24">ID Code</TableHead>
                            <TableHead className="uppercase-soft">Product Name</TableHead>
                            <TableHead className="uppercase-soft">Unit</TableHead>
                            <TableHead className="uppercase-soft text-right">Price (Rp)</TableHead>
                            <TableHead className="uppercase-soft text-center">Stats</TableHead>
                            <TableHead className="uppercase-soft text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.id} className={cn(item.status === 'hidden' && "opacity-50 bg-neutral-50")}>
                              <TableCell className="font-mono text-[10px] font-bold">{item.code || "N/A"}</TableCell>
                              <TableCell>
                                {editingId === item.id ? (
                                  <Input 
                                    className="h-8 text-xs font-bold uppercase" 
                                    value={editForm.name} 
                                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                                  />
                                ) : (
                                  <div className="space-y-1">
                                    <p className="font-black text-xs uppercase tracking-widest">{item.name}</p>
                                    <p className="text-[9px] text-neutral-400 line-clamp-1">{item.description}</p>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-[10px] font-bold uppercase">
                                {editingId === item.id ? (
                                  <Input 
                                    className="h-8 w-16 text-xs font-bold uppercase" 
                                    value={editForm.unit} 
                                    onChange={e => setEditForm({...editForm, unit: e.target.value})}
                                  />
                                ) : (
                                  item.unit
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold">
                                {editingId === item.id ? (
                                  <Input 
                                    type="number"
                                    className="h-8 w-24 text-right text-xs font-bold" 
                                    value={editForm.price} 
                                    onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}
                                  />
                                ) : (
                                  `Rp ${item.price.toLocaleString('id-ID')}`
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="text-[9px] uppercase-soft">
                                  Sold: <span className="font-bold text-black">{item.soldCount || 0}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {editingId === item.id ? (
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={handleSaveEdit}>
                                      <Save className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(item)}>
                                      <FileText className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateMasterItem(item.id, { status: item.status === 'visible' ? 'hidden' : 'visible' })}>
                                    {item.status === 'visible' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => deleteMasterItem(item.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "clients" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div className="relative w-96">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <Input 
                    placeholder="Search clients by name or email..." 
                    className="pl-10 h-10 border-2 border-black rounded-xl"
                  />
                </div>
                <Button variant="outline" className="border-2 border-black h-10 px-6 rounded-xl" onClick={exportClients}>
                  <Download className="w-4 h-4 mr-2" /> Export to Excel
                </Button>
              </div>

              <Card className="border-2 border-black rounded-2xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead className="uppercase-soft">Client Info</TableHead>
                      <TableHead className="uppercase-soft">Tier Status</TableHead>
                      <TableHead className="uppercase-soft">Payment</TableHead>
                      <TableHead className="uppercase-soft">Location</TableHead>
                      <TableHead className="uppercase-soft">Joined Date</TableHead>
                      <TableHead className="uppercase-soft text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.uid}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-black">
                              {u.displayName?.[0]}
                            </div>
                            <div className="space-y-1">
                              <p className="font-black text-xs uppercase tracking-widest">{u.displayName}</p>
                              <p className="text-[10px] text-neutral-400">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "uppercase-soft text-[9px] rounded-md",
                            u.tier === 'deal' ? "bg-accent text-white" : 
                            u.tier === 'survey' ? "bg-blue-500 text-white" : "bg-neutral-200 text-neutral-600"
                          )}>
                            {u.tier === 'deal' ? "Tier 3 (Gold)" : u.tier === 'survey' ? "Tier 2 (Silver)" : "Tier 1 (Lead)"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "uppercase-soft text-[9px] rounded-md",
                            u.lastPaymentStatus === 'paid' ? "border-green-500 text-green-500" : "border-red-500 text-red-500"
                          )}>
                            {u.lastPaymentStatus || "Unpaid"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] font-bold uppercase">{u.location || "N/A"}</TableCell>
                        <TableCell className="text-[10px] text-neutral-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase">Manage</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === "projects" && (
            <div className="space-y-8">
              <div className="grid md:grid-cols-3 gap-8">
                {["active", "survey", "completed"].map(status => (
                  <div key={status} className="space-y-4">
                    <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", 
                        status === 'active' ? "bg-green-500" : 
                        status === 'survey' ? "bg-blue-500" : "bg-neutral-400"
                      )} />
                      {status} Projects
                    </h3>
                    <div className="space-y-4">
                      {projects.filter(p => p.status === status).map(p => (
                        <Card key={p.id} className="border-2 border-black rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-black text-xs uppercase tracking-widest">{p.name}</h4>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                              <Users className="w-3 h-3" /> PM: {users.find(u => u.uid === p.pmId)?.displayName || "Unassigned"}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                              <Clock className="w-3 h-3" /> Created: {new Date(p.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "workforce" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Workforce Database</h2>
                <Button className="btn-sleek h-10 px-6 rounded-xl">
                  <UserPlus className="w-4 h-4 mr-2" /> Register Worker
                </Button>
              </div>
              
              <div className="space-y-6">
                {["pm", "designer", "drafter", "tukang", "mandor", "kenek"].map(role => {
                  const workers = workforce.filter(w => w.role === role);
                  return (
                    <Card key={role} className="border-2 border-black rounded-2xl overflow-hidden shadow-sm">
                      <button 
                        onClick={() => toggleCategory(role)}
                        className="w-full flex items-center justify-between p-4 bg-neutral-50 hover:bg-neutral-100 transition-colors border-b-2 border-black"
                      >
                        <div className="flex items-center gap-3">
                          {expandedCategories.includes(role) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                          <h3 className="text-sm font-black uppercase tracking-widest">{role}</h3>
                          <Badge className="bg-black text-white text-[9px]">{workers.length} Personnel</Badge>
                        </div>
                      </button>
                      
                      {expandedCategories.includes(role) && (
                        <div className="p-6 grid md:grid-cols-3 gap-6">
                          {workers.map(worker => (
                            <Card key={worker.id} className="border-2 border-black/10 rounded-xl overflow-hidden hover:border-accent transition-colors">
                              <div className="h-40 bg-neutral-100 relative">
                                {worker.photoUrl ? (
                                  <img src={worker.photoUrl} alt={worker.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                    <User className="w-12 h-12" />
                                  </div>
                                )}
                                <Badge className="absolute top-3 right-3 bg-black text-white text-[8px] uppercase font-black">{worker.status}</Badge>
                              </div>
                              <CardContent className="p-4 space-y-3">
                                <div className="space-y-1">
                                  <p className="font-black text-xs uppercase tracking-widest">{worker.name}</p>
                                  <p className="text-[9px] text-neutral-400 font-mono">KTP: {worker.ktp}</p>
                                </div>
                                <div className="space-y-2 pt-2 border-t border-black/5">
                                  <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-neutral-500">
                                    <Phone className="w-3 h-3 text-accent" /> {worker.whatsapp || "No WA"}
                                  </div>
                                  <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-neutral-500">
                                    <Briefcase className="w-3 h-3 text-accent" /> 
                                    <select 
                                      className="bg-transparent border-none focus:outline-none text-[9px] font-bold uppercase"
                                      value={worker.projectId || ""}
                                      onChange={async (e) => {
                                        await updateWorkforce(worker.id, { projectId: e.target.value || undefined });
                                        toast.success(`Worker assigned to ${e.target.value ? "project" : "standby"}`);
                                      }}
                                    >
                                      <option value="">Standby</option>
                                      {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {workers.length === 0 && (
                            <div className="col-span-full py-12 text-center border-2 border-dashed border-neutral-200 rounded-xl">
                              <p className="uppercase-soft text-neutral-400">No personnel registered for this category.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "cms" && (
            <div className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-2 border-black rounded-2xl overflow-hidden">
                  <CardHeader className="bg-neutral-50 border-b-2 border-black">
                    <CardTitle className="text-lg font-black uppercase tracking-tighter">Gallery Management</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="aspect-square bg-neutral-100 rounded-xl border-2 border-dashed border-black/10 flex items-center justify-center relative group">
                          <ImageIcon className="w-6 h-6 text-neutral-300" />
                          <button className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button className="aspect-square bg-neutral-50 rounded-xl border-2 border-dashed border-black/20 flex flex-col items-center justify-center hover:bg-neutral-100 transition-colors">
                        <Plus className="w-6 h-6 text-neutral-400" />
                        <span className="text-[9px] font-black uppercase mt-1">Add Photo</span>
                      </button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-black rounded-2xl overflow-hidden">
                  <CardHeader className="bg-neutral-50 border-b-2 border-black">
                    <CardTitle className="text-lg font-black uppercase tracking-tighter">TBJ Jual Beli Sewa</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      {properties.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 border-2 border-black rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-neutral-100 rounded-lg overflow-hidden">
                              {p.photos?.[0] && <img src={p.photos[0]} className="w-full h-full object-cover" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-black uppercase tracking-widest">{p.title}</p>
                                <Badge className="text-[8px] uppercase font-black h-4 px-1">{p.type}</Badge>
                              </div>
                              <p className="text-[9px] text-neutral-400">Rp {p.price.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8"><Settings className="w-3 h-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500"><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 border-2 border-black rounded-2xl bg-neutral-50 space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest">Add New Listing</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="uppercase-soft text-[9px]">Title</label>
                          <Input placeholder="Listing Title" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="uppercase-soft text-[9px]">Type</label>
                          <select 
                            className="w-full h-8 text-xs border-b border-black/10 bg-transparent focus:outline-none"
                            value={newProperty.type}
                            onChange={e => setNewProperty({...newProperty, type: e.target.value as any})}
                          >
                            <option value="jual">JUAL</option>
                            <option value="beli">BELI</option>
                            <option value="sewa">SEWA</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="uppercase-soft text-[9px]">Price (Rp)</label>
                          <Input 
                            type="number" 
                            placeholder="Price" 
                            className="h-8 text-xs" 
                            value={newProperty.price}
                            onChange={e => setNewProperty({...newProperty, price: Number(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="uppercase-soft text-[9px]">Area (m2)</label>
                          <Input 
                            type="number" 
                            placeholder="Area" 
                            className="h-8 text-xs" 
                            value={newProperty.area}
                            onChange={e => setNewProperty({...newProperty, area: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="uppercase-soft text-[9px]">Description</label>
                        <Textarea 
                          placeholder="Detailed description..." 
                          className="text-xs min-h-[80px]" 
                          value={newProperty.description}
                          onChange={e => setNewProperty({...newProperty, description: e.target.value})}
                        />
                      </div>
                      <Button onClick={handleAddProperty} className="w-full btn-sleek h-10 rounded-xl">Publish Listing</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "finance" && (
            <div className="space-y-8">
              <Card className="border-2 border-black rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="bg-neutral-50 border-b-2 border-black">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter">Profit & Loss Statement</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="p-6 bg-green-50 rounded-2xl border-2 border-green-200">
                      <p className="uppercase-soft text-green-600 text-[10px]">Total Income</p>
                      <p className="text-3xl font-black text-green-700">Rp 4.82B</p>
                    </div>
                    <div className="p-6 bg-red-50 rounded-2xl border-2 border-red-200">
                      <p className="uppercase-soft text-red-600 text-[10px]">Total Expense</p>
                      <p className="text-3xl font-black text-red-700">Rp 3.15B</p>
                    </div>
                    <div className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
                      <p className="uppercase-soft text-blue-600 text-[10px]">Net Profit</p>
                      <p className="text-3xl font-black text-blue-700">Rp 1.67B</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest">Recent Transactions</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="uppercase-soft">Date</TableHead>
                          <TableHead className="uppercase-soft">Description</TableHead>
                          <TableHead className="uppercase-soft">Category</TableHead>
                          <TableHead className="uppercase-soft text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[1, 2, 3].map(i => (
                          <TableRow key={i}>
                            <TableCell className="text-[10px] font-bold">10 Apr 2026</TableCell>
                            <TableCell className="text-[10px] font-black uppercase">Material Purchase: Hebel PT. Jaya</TableCell>
                            <TableCell><Badge variant="outline" className="text-[9px] uppercase-soft">Expense</Badge></TableCell>
                            <TableCell className="text-right font-mono font-bold text-red-500">- Rp 45.000.000</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "marketing" && (
            <div className="space-y-8">
              <div className="grid md:grid-cols-3 gap-8">
                <Card className="border-2 border-black rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-accent" />
                    <h3 className="text-lg font-black uppercase tracking-tighter">Engagement Rate</h3>
                  </div>
                  <p className="text-4xl font-black">68.4%</p>
                  <p className="uppercase-soft text-neutral-400">Average client response time: 12 mins</p>
                </Card>
                <Card className="border-2 border-black rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-blue-500" />
                    <h3 className="text-lg font-black uppercase tracking-tighter">Lead Conversion</h3>
                  </div>
                  <p className="text-4xl font-black">24.2%</p>
                  <p className="uppercase-soft text-neutral-400">Tier 1 to Tier 2 conversion rate</p>
                </Card>
                <Card className="border-2 border-black rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-green-500" />
                    <h3 className="text-lg font-black uppercase tracking-tighter">Campaign ROI</h3>
                  </div>
                  <p className="text-4xl font-black">4.2x</p>
                  <p className="uppercase-soft text-neutral-400">Return on marketing spend</p>
                </Card>
              </div>

              <Card className="border-2 border-black rounded-2xl overflow-hidden">
                <CardHeader className="bg-neutral-50 border-b-2 border-black">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter">Active Campaigns</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  {[
                    { name: "Ramadan Construction Promo", status: "Active", reach: "1.2k", conversion: "12%" },
                    { name: "Interior Design Bundle", status: "Draft", reach: "0", conversion: "0%" },
                    { name: "Survey Cashback Program", status: "Active", reach: "850", conversion: "18%" },
                  ].map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border-2 border-black rounded-xl">
                      <div className="space-y-1">
                        <p className="font-black text-sm uppercase tracking-widest">{c.name}</p>
                        <p className="text-[10px] text-neutral-400">Reach: {c.reach} | Conversion: {c.conversion}</p>
                      </div>
                      <Badge className={cn("uppercase-soft", c.status === "Active" ? "bg-green-500" : "bg-neutral-200")}>{c.status}</Badge>
                    </div>
                  ))}
                  <Button className="w-full btn-sleek h-12 rounded-xl">Create New Campaign</Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "management" && (
            <div className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-2 border-black rounded-2xl overflow-hidden">
                  <CardHeader className="bg-neutral-50 border-b-2 border-black">
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">Access Control</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-4">
                      {[
                        { role: "Admin Owner", access: "Full System Access", users: 1 },
                        { role: "Admin", access: "Management & Finance", users: 2 },
                        { role: "Project Manager", access: "Project & Workforce", users: 5 },
                      ].map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border-2 border-black rounded-xl">
                          <div>
                            <p className="font-black text-sm uppercase tracking-widest">{r.role}</p>
                            <p className="text-[10px] text-neutral-400">{r.access}</p>
                          </div>
                          <Badge variant="outline" className="border-black rounded-md">{r.users} Users</Badge>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full btn-sleek h-12 rounded-xl">Manage Permissions</Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-black rounded-2xl overflow-hidden">
                  <CardHeader className="bg-neutral-50 border-b-2 border-black">
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">System Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border-2 border-black rounded-xl">
                        <div>
                          <p className="font-black text-sm uppercase tracking-widest">Auto-Notification (WA)</p>
                          <p className="text-[10px] text-neutral-400">Send automatic updates to clients</p>
                        </div>
                        <div className="w-12 h-6 bg-green-500 rounded-full relative">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 border-2 border-black rounded-xl">
                        <div>
                          <p className="font-black text-sm uppercase tracking-widest">AI Analysis Mode</p>
                          <p className="text-[10px] text-neutral-400">Enhanced accuracy for RAB estimation</p>
                        </div>
                        <div className="w-12 h-6 bg-green-500 rounded-full relative">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full border-2 border-black h-12 rounded-xl uppercase font-black text-[10px]">Advanced Configuration</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

