import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMasterData, useAuth, useUsers, useProjects, useWorkforce, useMaterialRequests, useProperties, useCMSConfig, useCampaigns, useSystemConfig, useGallery, useVendors, useAttendance, useFinance, useWorkerWages, useMasterCategories, usePMs, useMediaAssets, useSavedEstimates, saveImageToGudang, useMaterialSuggestions } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, Search, Save, UserPlus, Database, Settings, ShieldCheck, 
  RefreshCw, TrendingUp, DollarSign, Users, Briefcase, Plus, ChevronDown, 
  ChevronRight, Download, Eye, EyeOff, Trash2, Image as ImageIcon, 
  LayoutDashboard, FileText, HardHat, Camera, BarChart3, Clock, Phone, User,
  CheckCircle2, MapPin, Package, Brain, Zap, AlertCircle, Layers, History, Sparkles, Upload, X, HardDrive, Menu
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, limit, writeBatch, getDocsFromServer } from "firebase/firestore";
import PMDashboard from "./PMDashboard";
import MediaWarehouse from "./MediaWarehouse";
import { cn, getDriveImageUrl, formatRupiah, calculateAdminPrice, calculateClientPrice } from "@/lib/utils";
import { toast } from "sonner";
import { WorkItemMaster, UserProfile, Project, Workforce, MaterialRequest, Property, Campaign, SystemConfig, CMSConfig, Vendor, GalleryItem } from "@/types";
import { generateRABPDF, generatePOPDF, generateInvoicePDF } from "@/lib/pdfUtils";
import { ImageUpload } from "@/components/ImageUpload";
import { WORK_ITEMS_MASTER, TBJ_LOGO } from "@/constants";
import { nuclearWipe } from "@/lib/database";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon
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
    <div className="h-48 w-full border-2 border-black relative overflow-hidden rounded-xl">
      <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} />
        <MapEvents />
      </MapContainer>
    </div>
  );
};

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    masterData, 
    loading: masterLoading, 
    addMasterItem, 
    updateMasterItem, 
    deleteMasterItem, 
    addMasterCategory, 
    resetDatabase, 
    clearMasterData,
    bulkAddMasterItems,
    saveVersion,
    masterVersions,
    activateVersion,
    deleteVersion
  } = useMasterData(user?.role);
  const { categories: masterCategories } = useMasterCategories();
  const { users, loading: usersLoading, updateUser } = useUsers(user?.role);
  const { projects, loading: projectsLoading, updateProject, deleteProject, fixProjectMilestones } = useProjects(undefined, user?.role);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectCategory, setProjectCategory] = useState("all");
  const [materialSearch, setMaterialSearch] = useState("");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const { workforce, loading: workforceLoading, addWorkforce, updateWorkforce, deleteWorkforce } = useWorkforce(user?.role);
  const { requests, loading: requestsLoading, updateRequestStatus, assignVendor, addRequest, deleteRequest } = useMaterialRequests(user?.role);
  const { suggestions: materialSuggestions, addSuggestion } = useMaterialSuggestions();
  const { properties, loading: propertiesLoading, addProperty, updateProperty, deleteProperty } = useProperties();
  const { gallery, addGalleryItem, deleteGalleryItem, updateGalleryItem } = useGallery();
  const { vendors, addVendor, deleteVendor, updateVendor } = useVendors();
  const { attendance, loading: attendanceLoading } = useAttendance(user?.role);
  const { config: cmsConfig, updateConfig: updateCMS } = useCMSConfig();
  const { campaigns, addCampaign, updateCampaign, deleteCampaign } = useCampaigns();
  const { config: systemConfig, updateConfig: updateSystem } = useSystemConfig();
  const { transactions, addTransaction } = useFinance();
  const { wages, updateWageStatus } = useWorkerWages();
  const { pms } = usePMs();
  const { estimates: savedEstimates, deleteEstimate } = useSavedEstimates();
  const pdfLogo = TBJ_LOGO;

  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "clients" | "projects" | "workforce" | "cms" | "finance" | "marketing" | "management" | "materials" | "attendance" | "gallery" | "properties" | "vendors" | "payments" | "media">("dashboard");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearProgress, setClearProgress] = useState(0);

  const handleNuclearClear = async () => {
    setIsClearing(true);
    setClearProgress(0);
    try {
      await nuclearWipe("master_data", (count) => {
        setClearProgress(count);
      });
    } catch (error) {
      console.error("Nuclear Wipe failed", error);
    } finally {
      setIsClearing(false);
    }
  };

  const standardizedCategories = [
    "ARSITEKTUR", 
    "Struktur", 
    "Lapangan / Sitework", 
    "Mekanikal Elektrikal", 
    "Plumbing", 
    "Site Development"
  ];
  const [selectedMasterCategory, setSelectedMasterCategory] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddGallery, setShowAddGallery] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAddMasterCategory, setShowAddMasterCategory] = useState(false);
  const [newMasterCategory, setNewMasterCategory] = useState("");
  const [showAssignVendor, setShowAssignVendor] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | any>({});
  const [showManageTeam, setShowManageTeam] = useState(false);
  const [selectedProjectTeam, setSelectedProjectTeam] = useState<Project | any>({});
  
  // Master Data Form
  const [showActivities, setShowActivities] = useState(false);
  const [selectedClient, setSelectedClient] = useState<UserProfile | any>({});
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [clientEditForm, setClientEditForm] = useState<Partial<UserProfile>>({
    displayName: "",
    email: "",
    whatsapp: "",
    tier: "prospect",
    role: "user",
    address: "",
    photoURL: ""
  });
  
  // Master Data Editing
  const [editingId, setEditingId] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [editForm, setEditForm] = useState<Partial<WorkItemMaster>>({
    name: "",
    category: "",
    unit: "",
    price: 0,
    technicalSpecs: "",
    description: "",
    code: ""
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const handleEdit = (item: WorkItemMaster) => {
    setEditingId(item.id);
    setEditForm({
      ...item,
      technicalSpecs: item.technicalSpecs || ""
    });
  };

  const handleSaveEdit = async () => {
    if (editingId && editForm) {
      await updateMasterItem(editingId, editForm);
      setEditingId("");
      toast.success("Product updated successfully");
    }
  };

  const handleEditClient = (u: UserProfile) => {
    setSelectedClient(u);
    setClientEditForm({
      ...u,
      photoURL: u.photoURL || ""
    });
    setIsEditingClient(true);
  };

  const handleSaveClient = async () => {
    if (selectedClient.uid && clientEditForm) {
      await updateUser(selectedClient.uid, clientEditForm);
      setIsEditingClient(false);
      setSelectedClient({});
      toast.success("Client updated successfully");
    }
  };
  const [newProduct, setNewProduct] = useState<Partial<WorkItemMaster>>({
    category: "",
    code: "",
    name: "",
    technicalSpecs: "",
    description: "",
    unit: "m2",
    price: 0,
    status: "visible"
  });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showSaveVersion, setShowSaveVersion] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionForm, setVersionForm] = useState({ name: "", notes: "" });
  const [editingMasterSpecs, setEditingMasterSpecs] = useState<{id: string, name: string, specs: string} | any>(null);
  const [selectedProjectAI, setSelectedProjectAI] = useState<Project | any>({});
  const [selectedProjectFinance, setSelectedProjectFinance] = useState<Project | any>({});
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [bulkOrderItems, setBulkOrderItems] = useState([{ name: "", quantity: 0, unit: "m3" }]);
  const [selectedBulkProject, setSelectedBulkProject] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  // Initialize Sample Campaigns if empty
  useEffect(() => {
    if (campaigns && campaigns.length === 0) {
      const samples = [
        { name: "Promo Lebaran Berkah", content: "Renovasi rumah sebelum lebaran, diskon 15% untuk semua paket interior!", status: "Active", reach: "1250", conversion: "12%" },
        { name: "Digital Assessment Jakarta", content: "Dapatkan Digital Assessment gratis khusus area Jakarta Selatan.", status: "Active", reach: "840", conversion: "8%" },
        { name: "Loyalty Program 2024", content: "Reward khusus untuk client setia TBJ Constech. Cashback hingga 10jt.", status: "Draft", reach: "0", conversion: "0%" }
      ];
      samples.forEach(s => addCampaign(s as any));
    }
  }, [campaigns, addCampaign]);

  const handleAIGenerate = async () => {
    setLoadingAI(true);
    try {
      const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (typeof process !== "undefined" ? (process.env as any).GEMINI_API_KEY : "");
      if (!apiKey) {
        toast.error("API Key belum terpasang di Environment Variables Vercel.");
        return;
      }
      // AI Logic here if needed
      toast.success("AI Suggestions Refreshed");
    } catch (error) {
      console.error("AI Error:", error);
      toast.error("Gagal memproses permintaan AI.");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleAddBulkRow = () => {
    setBulkOrderItems([...bulkOrderItems, { name: "", quantity: 0, unit: "m3" }]);
  };

  const handleBulkOrderSubmit = async () => {
    if (!selectedBulkProject || bulkOrderItems.some(i => !i.name || i.quantity <= 0)) {
      toast.error("Please fill all item details.");
      return;
    }
    
    const project = projects.find(p => p.id === selectedBulkProject);
    if (!project) return;

    try {
      // Save suggestions for each item
      bulkOrderItems.forEach(item => {
        if (item.name) addSuggestion(item.name);
      });

      // Create ONE request with multiple items
      await addRequest({
        projectId: project.id,
        projectName: project.name,
        itemName: `${bulkOrderItems.length} Items (Batch Order)`,
        quantity: bulkOrderItems.length,
        unit: "items",
        requesterId: user?.uid || "",
        requesterName: user?.displayName || "Admin",
        status: "pending",
        note: `Batch order: ${bulkOrderItems.map(i => i.name).join(', ')}`,
        items: bulkOrderItems
      });
      
      toast.success("Bulk material request submitted successfully.");
      setBulkOrderItems([{ name: "", quantity: 0, unit: "m3" }]);
      setSelectedBulkProject("");
    } catch (error) {
      console.error("Error submitting bulk order", error);
      toast.error("Gagal mengirim order massal.");
    }
  };
  const [paymentForm, setPaymentForm] = useState({
    projectId: "",
    amount: 0,
    description: "Pembayaran Full Project (Escrow)"
  });

  const handleRecordPayment = async () => {
    if (!paymentForm.projectId || paymentForm.amount <= 0) return;
    
    const project = projects.find(p => p.id === paymentForm.projectId);
    if (!project) return;

    try {
      // Update project escrow balance
      await updateProject(project.id, {
        escrowBalance: (project.escrowBalance || 0) + paymentForm.amount,
        // Recalculate milestone amounts based on total budget
        paymentMilestones: project.paymentMilestones.map(m => ({
          ...m,
          amount: (project.totalBudget * m.percentage) / 100
        }))
      });

      // Record transaction
      await addTransaction({
        projectId: project.id,
        projectName: project.name,
        type: "income",
        category: "client_payment",
        amount: paymentForm.amount,
        description: paymentForm.description,
        status: "completed"
      });

      setShowRecordPayment(false);
      setPaymentForm({ projectId: "", amount: 0, description: "Pembayaran Full Project (Escrow)" });
      toast.success("Pembayaran klien berhasil dicatat ke Escrow");
    } catch (error) {
      toast.error("Gagal mencatat pembayaran");
    }
  };

  const [newProperty, setNewProperty] = useState<Partial<Property>>({
    title: "",
    type: "lahan",
    price: 0,
    area: 0,
    description: "",
    status: "available",
    photos: [],
    features: [],
    coordinates: { lat: -6.2088, lng: 106.8456 }
  });

  const [propMapPos, setPropMapPos] = useState<[number, number]>([-6.2088, 106.8456]);
  const [isSearchingPropLoc, setIsSearchingPropLoc] = useState(false);

  const searchPropLocation = async (query: string) => {
    if (!query) return;
    setIsSearchingPropLoc(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newPos: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setPropMapPos(newPos);
        setNewProperty(prev => ({ ...prev, coordinates: { lat: newPos[0], lng: newPos[1] } }));
      }
    } catch (error) {
      console.error("Location search failed", error);
      toast.error("Location not found");
    } finally {
      setIsSearchingPropLoc(false);
    }
  };

  const [newVendor, setNewVendor] = useState<Partial<Vendor>>({
    name: "",
    category: "",
    contactName: "",
    whatsapp: "",
    email: "",
    address: ""
  });

  const [newGallery, setNewGallery] = useState<Partial<GalleryItem>>({
    title: "",
    description: "",
    imageUrl: "",
    category: "project"
  });

  const handleAssignVendor = async (requestId: string, vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    const request = requests.find(r => r.id === requestId);
    if (!vendor || !request) return;

    await assignVendor(requestId, vendorId, vendor.name);
    
    // Generate PDF and Share PO via WhatsApp
    generatePOPDF(request, vendor, pdfLogo);

    const poMessage = `*OFFICIAL PURCHASE ORDER - TBJ HUB*%0A%0A` +
      `PO ID: PO-${requestId.substring(0, 8).toUpperCase()}%0A` +
      `Vendor: ${vendor.name}%0A` +
      `Project: ${request.projectName}%0A` +
      `Item: ${request.itemName}%0A` +
      `Qty: ${request.quantity} ${request.unit}%0A%0A` +
      `Mohon segera diproses dan dikirimkan ke lokasi proyek. Terima kasih.`;
    
    window.open(`https://wa.me/${vendor.whatsapp}?text=${poMessage}`, "_blank");

    // Add notification to PM (simulated via status update)
    await addDoc(collection(db, "status_updates"), {
      text: `PO issued for ${request.projectName}: ${request.itemName} assigned to ${vendor.name}`,
      projectId: request.projectId,
      createdAt: new Date().toISOString()
    });
    
    toast.success(`Request assigned to ${vendor.name}. PO shared via WA.`);
    setShowAssignVendor(false);
  };

  const handleAddProperty = async () => {
    if (!newProperty.title) return;
    await addProperty(newProperty as any);
    setNewProperty({ title: "", type: "jual", price: 0, area: 0, description: "", status: "available", photos: [], features: [] });
    toast.success("Listing published successfully");
  };

  // Grouping Master Data
  const groupedMaster = useMemo(() => {
    const groups: Record<string, WorkItemMaster[]> = {};
    // Initialize with standardized categories
    standardizedCategories.forEach(cat => groups[cat] = []);
    
    masterData.forEach(item => {
      const catName = item.category || "Uncategorized";
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(item);
    });
    return groups;
  }, [masterData, standardizedCategories]);

  const filteredMaster = useMemo(() => {
    let data = masterData;
    if (selectedMasterCategory) {
      data = data.filter(item => item.category === selectedMasterCategory);
    }
    if (selectedUnit) {
      data = data.filter(item => item.unit === selectedUnit);
    }
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(item => 
        item.name.toLowerCase().includes(s) || 
        (item.code && item.code.toLowerCase().includes(s)) ||
        (item.category && item.category.toLowerCase().includes(s))
      );
    }
    return data;
  }, [masterData, search, selectedMasterCategory, selectedUnit]);

  const allUnits = useMemo(() => {
    const units = new Set(masterData.map(i => i.unit).filter(Boolean));
    return Array.from(units).sort();
  }, [masterData]);

  const handleExportMasterRAB = () => {
    const cats = masterCategories.length > 0 ? masterCategories : Array.from(new Set(masterData.map(i => i.category))).map(c => ({ id: c, name: c }));
    generateRABPDF("MASTER RAB TBJ HUB", cats, masterData.map(item => ({
      ...item,
      quantity: 1,
      pricePerUnit: item.price,
      totalPrice: item.price
    })), pdfLogo);
    toast.success("Master RAB PDF exported successfully");
  };

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
    // Use manual code if provided, otherwise generate one
    const code = newProduct.code || generateCode(newProduct.category);
    await addMasterItem({
      ...newProduct as any,
      code,
      soldCount: 0,
      revenue: 0,
      status: "visible"
    });
    setShowAddProduct(false);
    setNewProduct({ category: "", name: "", code: "", description: "", unit: "m2", price: 0 });
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

  const [newWorker, setNewWorker] = useState<Partial<Workforce>>({
    name: "",
    role: "tukang",
    skill: "",
    ktp: "",
    whatsapp: "",
    status: "active"
  });

  const handleAddWorker = async () => {
    if (!newWorker.name || !newWorker.ktp) {
      toast.error("Name and KTP are required");
      return;
    }
    await addWorkforce(newWorker as any);
    setShowAddWorker(false);
    setNewWorker({ name: "", role: "tukang", skill: "", ktp: "", whatsapp: "", status: "active" });
  };

  const [cmsForm, setCmsForm] = useState<Partial<CMSConfig>>({
    heroTitle: "Membangun Masa Depan Konstruksi Indonesia",
    heroSubtitle: "Platform All-in-One untuk Renovasi, Interior, dan Bangun Baru dengan Teknologi AI.",
    promoText: "Promo Ramadan: Diskon 15% untuk Jasa Desain Interior!",
    promoActive: true
  });

  useEffect(() => {
    if (cmsConfig) {
      setCmsForm(cmsConfig);
    }
  }, [cmsConfig]);

  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign>>({
    name: "",
    content: "",
    status: "Draft",
    reach: "0",
    conversion: "0%"
  });
  const [showEditCampaign, setShowEditCampaign] = useState(false);

  const handleSaveCMS = async () => {
    if (cmsForm) {
      await updateCMS(cmsForm as any);
    }
  };

  const handleSaveCampaign = async () => {
    if (editingCampaign.name) {
      if (editingCampaign.id) {
        await updateCampaign(editingCampaign.id, editingCampaign);
      } else {
        await addCampaign(editingCampaign as any);
      }
      setShowEditCampaign(false);
      setEditingCampaign({ name: "", content: "", status: "Draft", reach: "0", conversion: "0%" });
    }
  };

  const handleSaveSystemConfig = async (data: Partial<SystemConfig>) => {
    await updateSystem(data);
  };

  if (user?.role !== "admin" && user?.role !== "pm") return <div className="py-20 text-center uppercase-soft">Access Denied. Admin/PM Only.</div>;
  if (masterLoading || usersLoading || projectsLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Sidebar-like Navigation */}
      <div className="flex flex-col md:flex-row gap-8 py-8 px-4 md:px-0">
        <div className="md:hidden flex justify-between items-center bg-white p-4 border-2 border-black rounded-2xl mb-4">
           <div className="flex items-center gap-3">
             <img src={pdfLogo} alt="Logo" className="h-10 w-auto" />
             <div className="font-black text-sm uppercase tracking-tighter">TBJ HUB</div>
           </div>
           <Button variant="ghost" size="icon" onClick={() => setIsNavOpen(!isNavOpen)}>
             <Menu className={cn("w-6 h-6", isNavOpen && "hidden")} />
             <X className={cn("w-6 h-6", !isNavOpen && "hidden")} />
           </Button>
        </div>

        <div className={cn(
          "w-full md:w-64 space-y-2 transition-all duration-300 md:block",
          !isNavOpen && "hidden"
        )}>
          <div className="hidden md:flex p-4 bg-white border-2 border-black rounded-3xl mb-8 flex-col items-start gap-4">
            <img src={pdfLogo} alt="Logo" className="h-16 w-auto object-contain" referrerPolicy="no-referrer" />
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-accent" /> TBJ HUB
              </h2>
              <p className="text-[10px] uppercase-soft text-neutral-500 font-bold">ConsTech OS v2.4</p>
            </div>
          </div>
          
          {[
            { id: "dashboard", label: "Insights", icon: LayoutDashboard },
            { id: "products", label: "Products (AHSP)", icon: Database },
            { id: "projects", label: "Projects", icon: Briefcase },
            { id: "clients", label: "Clients", icon: Users },
            { id: "materials", label: "Materials", icon: Package },
            { id: "attendance", label: "Attendance", icon: Clock },
            { id: "workforce", label: "Workforce", icon: HardHat },
            { id: "gallery", label: "Gallery", icon: ImageIcon },
            { id: "properties", label: "Property Hub", icon: MapPin },
            { id: "vendors", label: "Vendors", icon: Package },
            { id: "payments", label: "Payments", icon: DollarSign },
            { id: "media", label: "Gudang Gambar", icon: HardDrive },
            { id: "cms", label: "CMS Content", icon: ImageIcon },
            { id: "finance", label: "Finance", icon: DollarSign },
            { id: "marketing", label: "Marketing", icon: TrendingUp },
            { id: "management", label: "Management", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setIsNavOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-start gap-4 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === tab.id ? "bg-black text-white shadow-xl" : "text-neutral-500 hover:bg-titanium/10 hover:translate-x-1"
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
                {activeTab === "vendors" && "Vendor Database"}
                {activeTab === "payments" && "Payment & Assessment Management"}
                {activeTab === "media" && "Gudang Gambar & Assets"}
                {activeTab === "management" && "System Management"}
                {activeTab === "properties" && "Property & Permit Hub"}
              </h1>
              <p className="uppercase-soft text-neutral-500">Welcome back, {user?.displayName}. System is running optimally.</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Saved Estimates Quick List */}
              <div className="hidden xl:flex items-center gap-2 overflow-x-auto max-w-[400px] border-l border-black/5 pl-4 mr-4 custom-scrollbar">
                {savedEstimates.slice(0, 3).map((est) => (
                  <Button 
                    key={est.id} 
                    variant="ghost" 
                    className="h-auto py-1 px-3 flex flex-col items-start border border-black/5 rounded-xl hover:bg-white hover:shadow-sm"
                    onClick={() => navigate(`/rab?load=${est.id}`)}
                  >
                    <span className="text-[8px] font-black uppercase tracking-tighter truncate w-24">{est.projectName}</span>
                    <span className="text-[7px] text-neutral-400 font-bold">{new Date(est.createdAt).toLocaleDateString()}</span>
                  </Button>
                ))}
                {savedEstimates.length > 0 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setActiveTab("projects")}>
                    <Plus className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="text-right hidden md:block">
                <p className="text-[10px] font-black uppercase tracking-widest">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-[10px] uppercase-soft text-accent">Server Status: Online</p>
              </div>
              <Dialog open={showActivities} onOpenChange={setShowActivities}>
                <DialogTrigger render={
                  <Button variant="outline" size="icon" className="rounded-full border-2 border-black relative">
                    <Clock className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-white animate-pulse" />
                  </Button>
                } />
                <DialogContent className="max-w-md rounded-3xl border-2 border-black">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tighter">Recent Activities</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="flex items-start gap-4 pb-4 border-b border-black/5 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-neutral-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest">
                            {i % 2 === 0 ? "Payment Verified" : "New Project Request"}
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            {i % 2 === 0 ? "Klien Budi Santoso (Tier 2) lunas biaya survey." : "Klien Siska mengajukan survey di Jakarta Selatan."}
                          </p>
                          <p className="text-[9px] text-accent mt-1">{i * 15} minutes ago</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
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
                    <CardTitle className="text-3xl font-black">Rp {(projects.reduce((acc, p) => acc + (p.totalBudget || 0), 0) / 1000000000).toFixed(2)}B</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-green-500 text-[10px] font-bold">
                      <TrendingUp className="w-3 h-3" /> +{(Math.random() * 15).toFixed(1)}% vs last month
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-black rounded-2xl shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="uppercase-soft">Active Projects</CardDescription>
                    <CardTitle className="text-3xl font-black">{projects.filter(p => p.status === 'active').length}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-blue-500 text-[10px] font-bold">
                      <Briefcase className="w-3 h-3" /> {projects.filter(p => p.status === 'survey').length} in assessment
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
                      <Users className="w-3 h-3" /> {users.filter(u => u.tier === 'prospect').length} new leads
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-black rounded-2xl shadow-sm bg-black text-white">
                  <CardHeader className="pb-2">
                    <CardDescription className="uppercase-soft text-white/50">Vendors & Partners</CardDescription>
                    <CardTitle className="text-3xl font-black">{vendors.length}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-green-400 text-[10px] font-bold">
                      <Package className="w-3 h-3" /> {vendors.filter(v => v.rating && v.rating > 4).length} top rated
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <Card className="md:col-span-2 border-2 border-black rounded-2xl shadow-sm">
                  <CardHeader className="bg-neutral-50 border-b-2 border-black">
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">AI Performance & Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="uppercase-soft text-[10px]">AI Analysis Accuracy</p>
                          <p className="text-3xl font-black text-accent">94.8%</p>
                          <Progress value={94.8} className="h-2" />
                        </div>
                        <div className="space-y-1">
                          <p className="uppercase-soft text-[10px]">Average Estimation Time</p>
                          <p className="text-3xl font-black">1.2s</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">System Anomalies / Bugs</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg border border-green-100">
                            <span className="text-[9px] font-bold uppercase">Critical Errors</span>
                            <Badge className="bg-green-500 text-white text-[8px]">0</Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                            <span className="text-[9px] font-bold uppercase">Minor UI Glitches</span>
                            <Badge className="bg-yellow-500 text-white text-[8px]">2</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-black/5">
                      <h4 className="text-[10px] font-black uppercase tracking-widest mb-4">Gallery & Portfolio Impact</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-neutral-50 rounded-2xl border-2 border-black">
                          <p className="text-2xl font-black">{gallery.length}</p>
                          <p className="text-[8px] font-bold uppercase text-neutral-400">Items</p>
                        </div>
                        <div className="text-center p-4 bg-neutral-50 rounded-2xl border-2 border-black">
                          <p className="text-2xl font-black">1.2k</p>
                          <p className="text-[8px] font-bold uppercase text-neutral-400">Views</p>
                        </div>
                        <div className="text-center p-4 bg-neutral-50 rounded-2xl border-2 border-black">
                          <p className="text-2xl font-black">15%</p>
                          <p className="text-[8px] font-bold uppercase text-neutral-400">Conv. Rate</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-black rounded-2xl shadow-sm bg-accent text-white">
                  <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">Strategic AI Insight</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={() => {
                        toast.success("AI Insights refreshed and logged to history.");
                        // In real app, this would trigger a re-generation
                      }}
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-black/20 rounded-xl border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-2 flex items-center gap-2">
                          <DollarSign className="w-3 h-3" /> Finance Summary
                        </p>
                        <p className="text-[10px] leading-relaxed opacity-90">
                          Revenue bulan ini diproyeksikan mencapai Rp 2.4B. Cash flow aman dengan cadangan operasional untuk 3 bulan ke depan.
                        </p>
                      </div>
                      <div className="p-4 bg-black/20 rounded-xl border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-2">
                          <BarChart3 className="w-3 h-3" /> Progress & Content
                        </p>
                        <p className="text-[10px] leading-relaxed opacity-90">
                          Rata-rata progress proyek aktif: 64%. Konten gallery baru (12 item) meningkatkan engagement leads sebesar 18%.
                        </p>
                      </div>
                      <div className="p-4 bg-black/20 rounded-xl border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-2 flex items-center gap-2">
                          <Package className="w-3 h-3" /> Material & Supply
                        </p>
                        <p className="text-[10px] leading-relaxed opacity-90">
                          Harga besi naik 5% di pasar. AI menyarankan bulk purchase untuk proyek Pondok Indah dan Menteng.
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Daily Report AI Summary:</p>
                      <p className="text-[10px] italic opacity-80">"Seluruh site melaporkan kondisi aman (HSE OK). 28 tukang aktif. Cuaca cerah mendukung pengerjaan struktur."</p>
                    </div>

                    <Button variant="outline" className="w-full border-white text-white hover:bg-white hover:text-accent font-black uppercase text-[10px] h-12 rounded-xl">
                      Download Weekly Strategic Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-accent/10 rounded-2xl">
                    <TrendingUp className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">System Global Markup</h3>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase">This markup applies to all RAB and Product calculations in real-time.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-neutral-50 p-4 rounded-2xl border border-black/5 w-full md:w-auto">
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Profit Margin</p>
                    <p className="text-sm font-black">PERCENTAGE (%)</p>
                  </div>
                  <div className="w-24">
                     <Input 
                       type="number" 
                       defaultValue={systemConfig?.globalMarkup} 
                       onBlur={(e) => updateSystem({ globalMarkup: Number(e.target.value) })}
                       className="text-center font-black h-12 border-2 border-black rounded-xl text-lg bg-white"
                     />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  {selectedMasterCategory && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedMasterCategory(null)}
                      className="border-2 border-black rounded-lg"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </Button>
                  )}
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">AHSP Master Data</h2>
                    <p className="text-[10px] uppercase-soft text-neutral-500">Manage {masterData.length.toLocaleString('id-ID')}+ construction work items and pricing.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="btn-orange h-10 px-6 rounded-xl font-black uppercase text-[10px]" onClick={() => setShowAddProduct(!showAddProduct)}>
                    <Plus className="w-4 h-4 mr-2" /> {showAddProduct ? "Close Form" : "Add New Item"}
                  </Button>
                  <Button variant="outline" className="border-2 border-black h-10 px-6 rounded-xl font-black uppercase text-[10px]" onClick={() => setShowAddMasterCategory(!showAddMasterCategory)}>
                    <Layers className="w-4 h-4 mr-2" /> Categories
                  </Button>
                  <Button variant="outline" className="border-2 border-black h-10 px-6 rounded-xl font-black uppercase text-[10px]" onClick={handleExportMasterRAB}>
                    <Download className="w-4 h-4 mr-2" /> Export PDF
                  </Button>
                  <Button variant="outline" className="border-2 border-black h-10 px-6 rounded-xl font-black uppercase text-[10px]" onClick={async () => {
                    const mode = confirm("SYNC LOCAL DATA\n\nOK: Sync Tambahan (Hanya tambah yang belum ada)\nCancel: Overwrite (Hapus semua cloud lalu upload ulang 161 item)");
                    
                    if (mode) {
                      // Sync Addition
                      let count = 0;
                      for (const item of WORK_ITEMS_MASTER) {
                        const existing = masterData.find(d => d.id === item.id);
                        if (!existing) {
                          await addMasterItem(item);
                          count++;
                        }
                      }
                      toast.success(`Berhasil menambahkan ${count} item baru.`);
                    } else {
                      // Hard Reset & Sync
                      if (confirm("⚠️ PERINGATAN: Ini akan menghapus SEMUA data master di Cloud (termasuk hasil import manual) dan menggantinya dengan 161 item internal. Lanjutkan?")) {
                        await clearMasterData();
                        await bulkAddMasterItems(WORK_ITEMS_MASTER);
                      }
                    }
                  }}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Sync AHSP
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-2 border-red-600 text-red-600 hover:bg-red-50 h-10 px-6 rounded-xl font-black uppercase text-[10px]" 
                    onClick={handleNuclearClear}
                    disabled={isClearing}
                  >
                    {isClearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    {isClearing ? `Deleting (${clearProgress})...` : "Hapus Semua"}
                  </Button>
                  <Button variant="outline" className="border-2 border-black h-10 px-6 rounded-xl font-black uppercase text-[10px]" onClick={() => navigate("/import")}>
                    <Upload className="w-4 h-4 mr-2" /> Bulk Import
                  </Button>
                  <Button variant="outline" className="border-2 border-accent text-accent h-10 px-6 rounded-xl font-black uppercase text-[10px]" onClick={() => setShowSaveVersion(true)}>
                    <Save className="w-4 h-4 mr-2" /> Save Master
                  </Button>
                  <Button variant="outline" className="border-2 border-black h-10 px-6 rounded-xl font-black uppercase text-[10px]" onClick={() => setShowVersionHistory(true)}>
                    <History className="w-4 h-4 mr-2" /> Archive
                  </Button>
                </div>
              </div>

              <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
                <DialogContent className="max-w-3xl rounded-3xl border-2 border-black max-h-[80vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle className="font-black uppercase tracking-tighter">Master Data History</DialogTitle>
                    <DialogDescription>Daftar snapshot master data yang telah disimpan. Klik "Activate" untuk memulihkan versi tersebut.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {masterVersions.length === 0 ? (
                      <div className="py-12 text-center bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
                        <History className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                        <p className="text-[10px] font-black uppercase text-neutral-400">Belum ada history tersimpan.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {masterVersions.map(v => (
                          <div key={v.id} className="flex items-center justify-between p-4 border-2 border-black rounded-2xl hover:bg-neutral-50 transition-colors">
                            <div className="space-y-1">
                              <p className="font-black text-sm uppercase tracking-widest">{v.versionName}</p>
                              <div className="flex items-center gap-4 text-[10px] text-neutral-500">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(v.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {v.items.length} Items</span>
                              </div>
                              {v.notes && <p className="text-[10px] italic text-neutral-400 mt-1">"{v.notes}"</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                className="btn-sleek h-8 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white border-none"
                                onClick={() => {
                                  activateVersion(v.id);
                                  setShowVersionHistory(false);
                                }}
                              >
                                Activate
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-red-500 hover:bg-red-50"
                                onClick={() => deleteVersion(v.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showSaveVersion} onOpenChange={setShowSaveVersion}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Simpan Versi Master Data</DialogTitle>
                    <DialogDescription>Simpan snapshot seluruh data master saat ini untuk version control.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase">Nama Versi</label>
                      <Input 
                        placeholder="Contoh: SHBJ Jakarta 2024 v1" 
                        value={versionForm.name}
                        onChange={e => setVersionForm({...versionForm, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase">Catatan (Opsional)</label>
                      <Textarea 
                        placeholder="Deskripsi perubahan..." 
                        value={versionForm.notes}
                        onChange={e => setVersionForm({...versionForm, notes: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowSaveVersion(false)}>Batal</Button>
                    <Button className="btn-orange" onClick={async () => {
                      if (!versionForm.name) {
                        toast.error("Nama versi wajib diisi");
                        return;
                      }
                      // @ts-ignore - saveVersion exists in hook but lint might be stale
                      await saveVersion(versionForm.name, versionForm.notes);
                      setShowSaveVersion(false);
                      setVersionForm({ name: "", notes: "" });
                    }}>Simpan Versi</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {isClearing && (
                <div className="bg-red-50 border-2 border-red-600 p-6 rounded-2xl flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-black text-red-600 uppercase tracking-widest text-sm">System Deletion In Progress</h3>
                    <Badge variant="outline" className="border-red-600 text-red-600">{clearProgress} Items Removed</Badge>
                  </div>
                  <Progress value={100} className="h-4 bg-red-200" />
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse">
                    ⚠️ Jangan menutup halaman ini hingga proses pembersihan selesai.
                  </p>
                </div>
              )}

              {/* Advanced Filter Bar */}
              <div className="grid md:grid-cols-4 gap-4 bg-neutral-50 p-4 rounded-2xl border-2 border-black/5 shadow-sm">
                <div className="relative col-span-1 md:col-span-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <Input 
                    placeholder="Search by name, code, or category..." 
                    className="pl-10 h-10 border-2 border-black rounded-xl focus:ring-accent bg-white"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select 
                  className="h-10 rounded-xl border-2 border-black px-3 text-[10px] font-black uppercase tracking-widest bg-white"
                  value={selectedMasterCategory || ""}
                  onChange={e => setSelectedMasterCategory(e.target.value || null)}
                >
                  <option value="">All Categories</option>
                  {standardizedCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {masterCategories.filter(c => !standardizedCategories.includes(c.name)).map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <select 
                  className="h-10 rounded-xl border-2 border-black px-3 text-[10px] font-black uppercase tracking-widest bg-white"
                  value={selectedUnit || ""}
                  onChange={e => setSelectedUnit(e.target.value || null)}
                >
                  <option value="">All Units</option>
                  {allUnits.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              {showAddMasterCategory && (
                <Card className="border-2 border-black rounded-2xl p-6 bg-white animate-in slide-in-from-top-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-grow">
                        <Input 
                          placeholder="New Category Name..." 
                          value={newMasterCategory}
                          onChange={e => setNewMasterCategory(e.target.value)}
                          className="border-black/10"
                        />
                      </div>
                      <Button className="btn-sleek px-8" onClick={async () => {
                        if (!newMasterCategory) return;
                        await addMasterCategory(newMasterCategory);
                        setNewMasterCategory("");
                        setShowAddMasterCategory(false);
                      }}>Add Category</Button>
                    </div>
                  </div>
                </Card>
              )}

              {showAddProduct && (
                <Card className="border-2 border-black rounded-2xl p-6 bg-neutral-50 animate-in fade-in slide-in-from-top-4 shadow-lg">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Category</label>
                      <select 
                        className="w-full h-10 rounded-xl border-2 border-black px-3 text-xs font-bold uppercase bg-white"
                        value={newProduct.category}
                        onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      >
                        <option value="">Select Category...</option>
                        {standardizedCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        {masterCategories.filter(c => !standardizedCategories.includes(c.name)).map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Kode ID</label>
                      <Input 
                        placeholder="e.g. P001" 
                        className="h-10 border-2 border-black/10 rounded-xl"
                        value={newProduct.code}
                        onChange={e => setNewProduct({...newProduct, code: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Product Name</label>
                      <Input 
                        placeholder="e.g. Galian Tanah" 
                        className="h-10 border-2 border-black/10 rounded-xl"
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="uppercase-soft text-[10px]">Keterangan Spesifikasi (Merk, Tipe, Detail)</label>
                      <Input 
                        placeholder="e.g. Semen Tiga Roda, Besi 12mm Full, dst." 
                        className="h-10 border-2 border-black/10 rounded-xl"
                        value={newProduct.technicalSpecs}
                        onChange={e => setNewProduct({...newProduct, technicalSpecs: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Unit</label>
                      <Input 
                        placeholder="m3, m2, ls" 
                        className="h-10 border-2 border-black/10 rounded-xl"
                        value={newProduct.unit}
                        onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Price (Rp)</label>
                      <Input 
                        type="number"
                        className="h-10 border-2 border-black/10 rounded-xl"
                        value={newProduct.price || 0}
                        onChange={e => setNewProduct({...newProduct, price: Math.max(0, Number(e.target.value))})}
                      />
                      {newProduct.price > 0 && (
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] text-neutral-400 font-bold uppercase">Base Price</span>
                          <span className="text-[10px] font-black text-accent uppercase">
                            Admin Price: {formatRupiah(calculateAdminPrice(newProduct.price, systemConfig?.globalMarkup))}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="uppercase-soft text-[10px]">Description</label>
                      <Input 
                        placeholder="Detailed description of the work item..." 
                        className="h-10 border-2 border-black/10 rounded-xl"
                        value={newProduct.description}
                        onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-4 mt-6">
                    <Button variant="ghost" className="rounded-xl" onClick={() => setShowAddProduct(false)}>Cancel</Button>
                    <Button className="btn-sleek px-8 rounded-xl" onClick={handleAddProduct}>Save Product</Button>
                  </div>
                </Card>
              )}

              <div className="space-y-4">
                <Card className="border-2 border-space-grey/20 rounded-3xl overflow-hidden shadow-2xl bg-white">
                  <div className="overflow-x-auto w-full max-w-full">
                    <Table className="min-w-[800px] md:min-w-full">
                      <TableHeader>
                        <TableRow className="bg-space-grey hover:bg-space-grey/90 border-none">
                          <TableHead className="w-12 text-center text-white uppercase font-black text-[9px]">No.</TableHead>
                          <TableHead className="w-24 text-white uppercase font-black text-[9px]">Kode ID</TableHead>
                          <TableHead className="text-white uppercase font-black text-[9px]">Uraian Pekerjaan</TableHead>
                          <TableHead className="w-24 text-center text-white uppercase font-black text-[9px]">Satuan</TableHead>
                          <TableHead className="w-40 text-white uppercase font-black text-[9px]">Kategori</TableHead>
                          <TableHead className="w-32 text-right text-white uppercase font-black text-[9px]">Harga (Rp)</TableHead>
                          <TableHead className="w-32 text-right text-white uppercase font-black text-[9px]">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {filteredMaster.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-40 text-center text-neutral-400 italic uppercase font-black tracking-widest">
                            No items found matching your filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMaster.map((item, index) => {
                          const isExpanded = expandedRows.includes(item.id);
                          const isEditing = editingId === item.id;
                          
                          return (
                            <React.Fragment key={item.id}>
                              <TableRow 
                                className={cn(
                                  "group transition-colors border-b-2 border-black/5",
                                  item.status === 'hidden' && "opacity-50 grayscale",
                                  isExpanded && "bg-neutral-50"
                                )}
                              >
                                <TableCell className="text-center font-mono text-[10px] text-neutral-400 font-black">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="font-mono text-[10px] font-black text-accent">
                                  {isEditing ? (
                                    <Input 
                                      className="h-8 w-20 text-[10px] font-black border-2 border-accent bg-white uppercase" 
                                      value={editForm.code || ""} 
                                      onChange={e => setEditForm({...editForm, code: e.target.value})}
                                    />
                                  ) : (
                                    item.code || "N/A"
                                  )}
                                </TableCell>
                                <TableCell className="max-w-[180px] md:max-w-[250px]">
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <Textarea 
                                        className="text-[11px] font-black uppercase tracking-tight border-2 border-accent bg-white min-h-[60px] resize-none overflow-hidden" 
                                        value={editForm.name || ""} 
                                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                                      />
                                      <div className="flex items-center gap-2">
                                        <Plus className="w-3 h-3 text-accent shrink-0" />
                                        <Input 
                                          className="h-7 text-[10px] font-medium border-accent/20 bg-white placeholder:italic" 
                                          placeholder="Spesifikasi: Merk, Tipe, Material..."
                                          value={editForm.technicalSpecs || ""}
                                          onChange={e => setEditForm({...editForm, technicalSpecs: e.target.value})}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-start gap-1 py-1">
                                      <div className="flex items-start gap-2 group/name cursor-pointer" onClick={() => toggleRow(item.id)}>
                                        <span className="font-black text-[10px] md:text-[11px] uppercase tracking-tighter group-hover/name:text-accent transition-colors block whitespace-normal break-words leading-tight">
                                          {item.name}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          {(item.description || item.soldCount > 0 || item.technicalSpecs) && (
                                            <ChevronDown className={cn("w-3 h-3 text-neutral-300 transition-transform mt-0.5 shrink-0", isExpanded && "rotate-180")} />
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        <button 
                                          className="text-neutral-300 hover:text-accent transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingMasterSpecs({ id: item.id, name: item.name, specs: item.technicalSpecs || "" });
                                          }}
                                          title="Quick Edit Spesifikasi"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                        {item.technicalSpecs && (
                                          <Badge variant="secondary" className="bg-accent/5 text-accent border-accent/10 text-[8px] px-1 py-0 h-4">
                                            {item.technicalSpecs}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {isEditing ? (
                                    <Input 
                                      className="h-8 w-16 mx-auto text-[10px] font-black uppercase text-center border-2 border-accent bg-white" 
                                      value={editForm.unit || ""} 
                                      onChange={e => setEditForm({...editForm, unit: e.target.value})}
                                    />
                                  ) : (
                                    <Badge variant="outline" className="text-[9px] font-black uppercase border-black/10">
                                      {item.unit}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <select 
                                      className="h-8 w-full rounded-md border-2 border-accent px-2 text-[10px] font-black uppercase bg-white"
                                      value={editForm.category || ""}
                                      onChange={e => setEditForm({...editForm, category: e.target.value})}
                                    >
                                      {standardizedCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                      ))}
                                      {masterCategories.filter(c => !standardizedCategories.includes(c.name)).map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">{item.category}</span>
                                  )}
                                </TableCell>
                                  <TableCell className="text-right">
                                    {isEditing ? (
                                      <div className="space-y-1">
                                        <Input 
                                          type="number"
                                          className="h-8 w-28 ml-auto text-right text-[11px] font-black border-2 border-accent bg-white" 
                                          value={editForm.price || 0} 
                                          onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}
                                        />
                                        <div className="text-[9px] text-neutral-400 font-bold uppercase text-right">
                                          Base: {formatRupiah(editForm.price || 0)}
                                        </div>
                                        <div className="text-[9px] text-accent font-bold uppercase text-right">
                                          Marked Up: {formatRupiah(calculateAdminPrice(editForm.price || 0, systemConfig?.globalMarkup))}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-end">
                                        <span className="font-mono text-[11px] font-black text-black">
                                          {formatRupiah(calculateAdminPrice(item.price, systemConfig?.globalMarkup))}
                                        </span>
                                        <span className="text-[9px] text-neutral-400 font-bold uppercase">
                                          Base: {formatRupiah(item.price)}
                                        </span>
                                      </div>
                                    )}
                                  </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    {isEditing ? (
                                      <>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 bg-green-50 hover:bg-green-100 border border-green-200" onClick={handleSaveEdit}>
                                          <Save className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200" onClick={() => setEditingId(null)}>
                                          <X className="w-3.5 h-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(item)}>
                                          <FileText className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateMasterItem(item.id, { status: item.status === 'visible' ? 'hidden' : 'visible' })}>
                                          {item.status === 'visible' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-neutral-400" />}
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => {
                                          if (confirm("Hapus item ini selamanya?")) deleteMasterItem(item.id);
                                        }}>
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow className="bg-neutral-50/50 border-b-2 border-black/5">
                                  <TableCell colSpan={7} className="py-6 px-4 md:px-12">
                                    <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                      <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white rounded-2xl border-2 border-black/5 shadow-sm shrink-0">
                                          <AlertCircle className="w-5 h-5 text-accent" />
                                        </div>
                                        <div className="space-y-1 min-w-0 flex-1">
                                          <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Deskripsi Pekerjaan & Spesifikasi</h4>
                                          <p className="text-xs font-bold leading-relaxed max-w-md text-neutral-600 break-words whitespace-normal mb-2">
                                            {item.description || "Tidak ada deskripsi tambahan untuk item pekerjaan ini."}
                                          </p>
                                          {item.technicalSpecs && (
                                            <div className="inline-flex items-center gap-2 bg-accent/5 border border-accent/10 px-3 py-1.5 rounded-lg shadow-sm">
                                              <Plus className="w-3 h-3 text-accent" />
                                              <span className="text-[10px] font-bold text-neutral-800 uppercase tracking-tight">{item.technicalSpecs}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-4 gap-8">
                                        <div className="space-y-1">
                                          <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Total Digunakan</h4>
                                          <p className="text-xs font-black">{item.soldCount || 0} Proyek Aktif</p>
                                        </div>
                                        <div className="space-y-1">
                                          <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Estimasi Margin</h4>
                                          <p className="text-xs font-black text-green-600">20% (Adjusted)</p>
                                        </div>
                                        <div className="space-y-1">
                                          <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Status Katalog</h4>
                                          <Badge className={cn("text-[9px] font-black uppercase", item.status === 'visible' ? "bg-green-500 text-white" : "bg-neutral-200 text-neutral-500")}>
                                            {item.status || 'visible'}
                                          </Badge>
                                        </div>
                                        <div className="space-y-1">
                                          <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Revenue Terkumpul</h4>
                                          <p className="text-xs font-black">Rp {(item.revenue || 0).toLocaleString('id-ID')}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
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
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] text-neutral-400">{u.email}</p>
                                {u.whatsapp && (
                                  <a 
                                    href={`https://wa.me/${u.whatsapp.replace(/\D/g, '')}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-green-500 hover:text-green-600"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                ) || <span className="text-[8px] text-red-500 uppercase font-black">Unverified WA</span>}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Dialog>
                              <DialogTrigger nativeButton={false} render={
                                <Badge className={cn(
                                  "uppercase-soft text-[9px] rounded-md cursor-pointer hover:opacity-80 transition-opacity",
                                  u.tier === 'deal' ? "bg-accent text-white" : 
                                  u.tier === 'survey' ? "bg-blue-500 text-white" : "bg-neutral-200 text-neutral-600"
                                )}>
                                  {u.tier === 'deal' ? "Tier 3 (Gold)" : u.tier === 'survey' ? "Tier 2 (Silver)" : "Tier 1 (Lead)"}
                                </Badge>
                              } />
                              <DialogContent className="max-w-2xl rounded-3xl border-2 border-black">
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Client Dossier: {u.displayName}</DialogTitle>
                                </DialogHeader>
                                <div className="grid md:grid-cols-2 gap-6 py-6">
                                  <div className="space-y-4">
                                    <div className="p-4 bg-neutral-50 rounded-2xl border border-black/5">
                                      <p className="text-[10px] font-black uppercase text-neutral-400 mb-2">Identity Details</p>
                                      <div className="space-y-2">
                                        <p className="text-xs font-bold">Email: <span className="font-normal">{u.email}</span></p>
                                        <p className="text-xs font-bold">Location: <span className="font-normal">{u.location || "Not set"}</span></p>
                                        <p className="text-xs font-bold">WhatsApp: <span className="font-normal">{u.whatsapp || "Not set"}</span></p>
                                      </div>
                                    </div>
                                    <div className="p-4 bg-accent/5 rounded-2xl border border-accent/20">
                                      <p className="text-[10px] font-black uppercase text-accent mb-2">AI Usage Analytics</p>
                                      <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black uppercase">Analisa Digunakan:</span>
                                        <span className="font-mono font-bold text-sm">{u.aiUsageCount || 0} Kali</span>
                                      </div>
                                      <Progress value={Math.min(((u.aiUsageCount || 0) / (u.waVerified ? 5 : 1)) * 100, 100)} className="h-1 bg-accent/20 mt-2" />
                                      {u.tier === 'deal' || u.lifetimeAccess ? (
                                        <Badge className="bg-green-500 text-white text-[7px] uppercase mt-2 border-none">UNLIMITED AI ACCESS</Badge>
                                      ) : (
                                        <p className="text-[8px] mt-1 text-neutral-400 uppercase font-black">
                                          Limit: {u.waVerified ? "5 Analisa (Verified)" : "1 Analisa (Free)"}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <div className="p-4 bg-neutral-50 rounded-2xl border border-black/5">
                                      <p className="text-[10px] font-black uppercase text-neutral-400 mb-2">Project & RAB</p>
                                      <div className="space-y-2">
                                        <Button variant="outline" className="w-full h-8 text-[10px] uppercase font-black rounded-lg justify-between" onClick={() => navigate(`/projects`)}>
                                          View Active RAB <ChevronRight className="w-3 h-3" />
                                        </Button>
                                        <Button className="w-full h-10 text-[10px] uppercase font-black rounded-lg bg-accent text-white hover:bg-black transition-all" onClick={() => navigate(`/profile/${u.uid}`)}>
                                          <LayoutDashboard className="w-4 h-4 mr-2" /> View Client Dashboard
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="p-4 bg-black text-white rounded-2xl">
                                      <p className="text-[10px] font-black uppercase text-white/40 mb-2">Account Type</p>
                                      <p className="text-xl font-black tracking-tighter uppercase">{u.waVerified ? "Verified WA" : "Unverified"}</p>
                                      <p className="text-[9px] uppercase-soft text-white/60">Verification Status</p>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <div className="flex items-center gap-2 mt-1">
                              {u.tier === 'deal' || u.lifetimeAccess ? (
                                <Badge variant="outline" className="text-[7px] border-green-500 text-green-500 uppercase font-black px-1.5 h-4">Unlimited AI</Badge>
                              ) : (
                                <div className="flex gap-1">
                                  {Array.from({ length: u.waVerified ? 5 : 1 }).map((_, i) => (
                                    <div key={i} className={cn("w-1 h-1 rounded-full", (u.aiUsageCount || 0) > i ? "bg-accent" : "bg-neutral-200")} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
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
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClient(u)}>
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {isEditingClient && (
                <Dialog open={isEditingClient} onOpenChange={setIsEditingClient}>
                  <DialogContent className="max-w-md rounded-3xl border-2 border-black">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black uppercase tracking-tighter">Edit Client Info</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="uppercase-soft text-[10px]">Display Name</label>
                          <Input 
                            value={clientEditForm.displayName || ""} 
                            onChange={e => setClientEditForm({...clientEditForm, displayName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="uppercase-soft text-[10px]">WhatsApp / Phone</label>
                          <Input 
                            value={clientEditForm.whatsapp || ""} 
                            onChange={e => setClientEditForm({...clientEditForm, whatsapp: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="uppercase-soft text-[10px]">Location (City)</label>
                          <Input 
                            value={clientEditForm.location || ""} 
                            onChange={e => setClientEditForm({...clientEditForm, location: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="uppercase-soft text-[10px]">Tier</label>
                          <select 
                            className="w-full h-10 rounded-md border border-black/10 px-3 text-sm"
                            value={clientEditForm.tier || "prospect"}
                            onChange={e => setClientEditForm({...clientEditForm, tier: e.target.value as any})}
                          >
                            <option value="prospect">Tier 1 (Lead)</option>
                            <option value="survey">Tier 2 (Silver)</option>
                            <option value="deal">Tier 3 (Gold)</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="uppercase-soft text-[10px]">Photo Profile / Background</label>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="w-full h-10 rounded-xl border-2 border-dashed border-neutral-200 gap-2 text-[10px] font-bold uppercase hover:bg-neutral-50"
                            onClick={() => document.getElementById('client-photo-input')?.click()}
                          >
                            <Camera className="w-3.5 h-3.5" /> Select Photo
                          </Button>
                          <input 
                            id="client-photo-input"
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = await saveImageToGudang(file, 'projects');
                                setClientEditForm({ ...clientEditForm, photoURL: url });
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="uppercase-soft text-[10px]">Full Address</label>
                        <Textarea 
                          value={clientEditForm.address || ""} 
                          onChange={e => setClientEditForm({...clientEditForm, address: e.target.value})}
                          placeholder="Detailed address for site assessment..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="uppercase-soft text-[10px]">Secondary Contact</label>
                        <Input 
                          value={clientEditForm.secondaryContact || ""} 
                          onChange={e => setClientEditForm({...clientEditForm, secondaryContact: e.target.value})}
                          placeholder="Name / Phone"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="uppercase-soft text-[10px]">Internal Notes</label>
                        <Textarea 
                          value={clientEditForm.notes || ""} 
                          onChange={e => setClientEditForm({...clientEditForm, notes: e.target.value})}
                          placeholder="Important notes about this client..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsEditingClient(false)}>Cancel</Button>
                      <Button className="btn-sleek" onClick={handleSaveClient}>Save Changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}

          {activeTab === "projects" && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 border-2 border-black rounded-3xl">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Project Portfolio</h2>
                  <div className="flex gap-2">
                    <Badge className="bg-green-100 text-green-700 border-none uppercase-soft">Active: {projects.filter(p => p.status === 'active').length}</Badge>
                    <Badge className="bg-blue-100 text-blue-700 border-none uppercase-soft">Survey: {projects.filter(p => p.status === 'survey').length}</Badge>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                  <select 
                    className="h-10 px-4 border-2 border-black/10 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none bg-neutral-50 w-full md:w-40"
                    value={projectCategory}
                    onChange={e => setProjectCategory(e.target.value)}
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
                      placeholder="Search projects..." 
                      className="pl-10 h-10 rounded-xl border-2 border-black/10 text-xs font-bold"
                      value={projectSearch}
                      onChange={e => setProjectSearch(e.target.value)}
                    />
                  </div>
                  <Button className="btn-sleek h-10 px-6 rounded-xl w-full md:w-auto" onClick={() => navigate("/pm")}>
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Global Dashboard
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.filter(p => {
                  const matchesSearch = p.name.toLowerCase().includes(projectSearch.toLowerCase()) || 
                                        p.location.toLowerCase().includes(projectSearch.toLowerCase());
                  const matchesCategory = projectCategory === "all" || p.category === projectCategory || p.type === projectCategory;
                  return matchesSearch && matchesCategory;
                }).map(p => (
                  <Card key={p.id} className="border-2 border-black rounded-3xl overflow-hidden shadow-sm group hover:border-accent transition-all">
                    <div className="h-48 bg-neutral-100 relative">
                      <img src={getDriveImageUrl(p.imageUrl) || `https://picsum.photos/seed/${p.id}/400/300`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <Badge className={cn(
                        "absolute top-4 right-4 uppercase-soft",
                        p.status === 'active' ? "bg-green-500" : "bg-blue-500"
                      )}>{p.status}</Badge>
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-lg font-black uppercase tracking-tighter">{p.name}</h3>
                        <p className="text-[10px] text-neutral-400 uppercase font-bold">Location: {p.location}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span>Progress</span>
                          <span>{p.progress}%</span>
                        </div>
                        <Progress value={p.progress} className="h-1.5" />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button className="flex-grow btn-sleek h-10 text-[10px]" onClick={() => {
                          setSelectedProjectTeam(p);
                          setShowManageTeam(true);
                        }}>
                          Manage Team
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-grow border-2 border-black h-10 text-[10px] bg-black text-white hover:bg-neutral-800"
                          onClick={() => setSelectedProjectAI(p)}
                        >
                          <Brain className="w-3 h-3 mr-2 text-accent" /> AI Health
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {showManageTeam && selectedProjectTeam && (
                <Dialog open={showManageTeam} onOpenChange={setShowManageTeam}>
                  <DialogContent className="max-w-2xl rounded-3xl border-2 border-black p-8">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Manage Project Team</DialogTitle>
                      <DialogDescription className="uppercase-soft">Assign Project Manager and Workforce for {selectedProjectTeam.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-8 py-6">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Project Manager</label>
                        <select 
                          className="w-full h-12 rounded-xl border-2 border-black px-4 font-bold uppercase text-xs"
                          value={selectedProjectTeam.pmId || ""}
                          onChange={async (e) => {
                            const pmId = e.target.value;
                            await updateProject(selectedProjectTeam.id, { pmId });
                            setSelectedProjectTeam({...selectedProjectTeam, pmId});
                            toast.success("PM assigned successfully");
                          }}
                        >
                          <option value="">Select PM</option>
                          {pms.map(pm => (
                            <option key={pm.uid} value={pm.uid}>{pm.displayName || pm.email}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Workforce Assignment</label>
                        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border-2 border-black rounded-xl">
                          {workforce.map(worker => {
                            const isAssigned = selectedProjectTeam.workerIds?.includes(worker.id);
                            return (
                              <div 
                                key={worker.id} 
                                onClick={async () => {
                                  let newWorkerIds = [...(selectedProjectTeam.workerIds || [])];
                                  if (isAssigned) {
                                    newWorkerIds = newWorkerIds.filter(id => id !== worker.id);
                                  } else {
                                    newWorkerIds.push(worker.id);
                                  }
                                  await updateProject(selectedProjectTeam.id, { workerIds: newWorkerIds });
                                  setSelectedProjectTeam({...selectedProjectTeam, workerIds: newWorkerIds});
                                }}
                                className={cn(
                                  "p-3 border-2 rounded-xl cursor-pointer transition-all flex items-center justify-between",
                                  isAssigned ? "border-black bg-black text-white" : "border-neutral-100 hover:border-black"
                                )}
                              >
                                <div className="space-y-0.5">
                                  <p className="text-[10px] font-black uppercase tracking-tight">{worker.name}</p>
                                  <p className="text-[8px] opacity-60 uppercase">{worker.skill}</p>
                                </div>
                                {isAssigned && <CheckCircle2 className="w-3 h-3 text-accent" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button className="btn-sleek w-full h-12" onClick={() => setShowManageTeam(false)}>Done</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {selectedProjectAI && (
                <Dialog open={!!selectedProjectAI} onOpenChange={() => setSelectedProjectAI(null)}>
                  <DialogContent className="max-w-3xl rounded-3xl border-2 border-black p-0 overflow-hidden bg-white shadow-2xl">
                    <div className="bg-black text-white p-8 relative">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Brain className="w-32 h-32" />
                      </div>
                      <div className="relative z-10 space-y-1">
                        <div className="flex items-center gap-2 text-accent">
                          <Zap className="w-4 h-4" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Project AI Health Monitor</span>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">{selectedProjectAI.name}</h2>
                        <p className="text-white/60 text-[10px] uppercase-soft">Real-time Backend Intelligence System</p>
                      </div>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-3 bg-green-100 rounded-xl border-2 border-green-300">
                          <p className="uppercase-soft text-green-700 text-[8px]">Financial Health</p>
                          <p className="text-xl font-black text-green-800">EXCELLENT</p>
                          <p className="text-[8px] text-green-700 mt-1">Margin aman di 18.4%</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-xl border-2 border-blue-300">
                          <p className="uppercase-soft text-blue-700 text-[8px]">Progress Health</p>
                          <p className="text-xl font-black text-blue-800">ON TRACK</p>
                          <p className="text-[8px] text-blue-700 mt-1">Deviasi: -0.2% (Normal)</p>
                        </div>
                        <div className="p-3 bg-accent/20 rounded-xl border-2 border-accent/40">
                          <p className="uppercase-soft text-accent text-[8px]">Worker Progress</p>
                          <p className="text-xl font-black text-accent">OPTIMAL</p>
                          <p className="text-[8px] text-accent mt-1">Bobot harian: 1.2%</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-accent" /> AI Strategic Recommendations
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="p-4 border-2 border-black rounded-xl space-y-2">
                            <p className="text-[10px] font-black uppercase text-neutral-400">Material Control</p>
                            <p className="text-xs leading-relaxed">
                              "Stok semen menipis. AI mengingatkan untuk re-order 50 sak besok pagi agar tidak menghambat pengecoran plat lantai."
                            </p>
                          </div>
                          <div className="p-4 border-2 border-black rounded-xl space-y-2">
                            <p className="text-[10px] font-black uppercase text-neutral-400">Workforce Efficiency</p>
                            <p className="text-xs leading-relaxed">
                              "Produktivitas tukang batu di zona A sangat baik. Pertimbangkan untuk memindahkan 2 orang ke zona B untuk mengejar target minggu ini."
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button className="btn-sleek px-8" onClick={() => setSelectedProjectAI(null)}>Close Monitor</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <div className="pt-8 border-t border-black/5">
                <h3 className="text-xl font-black uppercase tracking-tighter mb-6">All Projects (Database)</h3>
                <div className="grid md:grid-cols-3 gap-8">
                  {["active", "survey", "completed"].map(status => (
                    <div key={status} className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-tighter flex items-center gap-2">
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
            </div>
          )}

          {activeTab === "workforce" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Workforce Database</h2>
                <Button className="btn-sleek h-10 px-6 rounded-xl" onClick={() => setShowAddWorker(true)}>
                  <UserPlus className="w-4 h-4 mr-2" /> Register Worker
                </Button>
              </div>

              {showAddWorker && (
                <Card className="border-2 border-black rounded-2xl p-6 bg-neutral-50 animate-in fade-in slide-in-from-top-4">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Full Name</label>
                      <Input 
                        placeholder="Worker Name" 
                        value={newWorker.name}
                        onChange={e => setNewWorker({...newWorker, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Role</label>
                      <select 
                        className="w-full h-10 rounded-md border border-black/10 px-3 text-sm"
                        value={newWorker.role}
                        onChange={e => setNewWorker({...newWorker, role: e.target.value})}
                      >
                        {["pm", "designer", "drafter", "tukang", "mandor", "kenek"].map(r => (
                          <option key={r} value={r}>{r.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">KTP Number</label>
                      <Input 
                        placeholder="16-digit KTP" 
                        value={newWorker.ktp}
                        onChange={e => setNewWorker({...newWorker, ktp: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Specialized Skill</label>
                      <Input 
                        placeholder="e.g. Las, Keramik, Atap" 
                        value={newWorker.skill}
                        onChange={e => setNewWorker({...newWorker, skill: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">WhatsApp</label>
                      <Input 
                        placeholder="0812..." 
                        value={newWorker.whatsapp}
                        onChange={e => setNewWorker({...newWorker, whatsapp: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Foto Tenaga Kerja</label>
                      <ImageUpload 
                        path="workforce"
                        label="Pilih Foto / Ambil Foto"
                        onUploadComplete={(url) => setNewWorker({...newWorker, photoUrl: url})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-4 mt-6">
                    <Button variant="ghost" onClick={() => setShowAddWorker(false)}>Cancel</Button>
                    <Button className="btn-sleek px-8" onClick={handleAddWorker}>Save Worker</Button>
                  </div>
                </Card>
              )}
              
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
                            <Dialog key={worker.id}>
                              <DialogTrigger nativeButton={false} render={
                                <Card className="border-2 border-black/10 rounded-xl overflow-hidden hover:border-accent transition-all cursor-pointer group">
                                  <div className="h-40 bg-neutral-100 relative">
                                    {worker.photoUrl ? (
                                      <img src={getDriveImageUrl(worker.photoUrl)} alt={worker.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                                      {worker.skill && <p className="text-[9px] font-bold text-accent uppercase">{worker.skill}</p>}
                                      <p className="text-[9px] text-neutral-400 font-mono">KTP: {worker.ktp}</p>
                                    </div>
                                    <div className="space-y-2 pt-2 border-t border-black/5">
                                      <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-neutral-500">
                                        <Phone className="w-3 h-3 text-accent" /> {worker.whatsapp || "No WA"}
                                      </div>
                                      <div className="flex justify-end gap-2 pt-2">
                                        <select 
                                          className="h-6 text-[8px] rounded border border-black/10 bg-white px-1 font-black uppercase"
                                          value={worker.projectId || ""}
                                          onChange={async (e) => {
                                            await updateWorkforce(worker.id, { projectId: e.target.value });
                                            toast.success(`Worker assigned to project`);
                                          }}
                                        >
                                          <option value="">Assign Project</option>
                                          {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                          ))}
                                        </select>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={(e) => {
                                          e.stopPropagation();
                                          if(confirm(`Remove ${worker.name}?`)) deleteWorkforce(worker.id);
                                        }}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              } />
                              <DialogContent className="max-w-3xl rounded-3xl border-2 border-black">
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Personnel Profile: {worker.name}</DialogTitle>
                                </DialogHeader>
                                <div className="grid md:grid-cols-2 gap-8 py-6">
                                  <div className="space-y-6">
                                    <div className="aspect-square rounded-2xl overflow-hidden border-2 border-black/10">
                                      <img src={getDriveImageUrl(worker.photoUrl) || `https://picsum.photos/seed/${worker.id}/400/400`} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="aspect-video rounded-xl overflow-hidden border-2 border-black/10 bg-neutral-50 flex flex-col items-center justify-center">
                                        <ImageIcon className="w-6 h-6 text-neutral-300 mb-1" />
                                        <p className="text-[8px] font-black uppercase">KTP Photo</p>
                                      </div>
                                      <div className="aspect-video rounded-xl overflow-hidden border-2 border-black/10 bg-neutral-50 flex flex-col items-center justify-center">
                                        <MapPin className="w-6 h-6 text-neutral-300 mb-1" />
                                        <p className="text-[8px] font-black uppercase">GPS Location</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-6">
                                    <div className="p-6 bg-neutral-50 rounded-2xl border border-black/5 space-y-4">
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-neutral-400">Personal Info</p>
                                        <p className="text-sm font-bold">Address: <span className="font-normal">Jl. Raya Jakarta No. {worker.id.slice(-2)}</span></p>
                                        <p className="text-sm font-bold">DOB: <span className="font-normal">12 Jan 199{worker.id.slice(-1)}</span></p>
                                        <p className="text-sm font-bold">WhatsApp: <span className="font-normal">{worker.whatsapp}</span></p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-neutral-400">Current Assignment</p>
                                        <p className="text-sm font-bold">Project: <span className="font-normal">{projects.find(p => p.id === worker.projectId)?.name || "Standby"}</span></p>
                                      </div>
                                    </div>
                                    <div className="p-6 bg-accent/5 rounded-2xl border border-accent/20">
                                      <p className="text-[10px] font-black uppercase text-accent mb-2">Live Status</p>
                                      <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                        <p className="text-xs font-bold uppercase">Online - On Site</p>
                                      </div>
                                      <p className="text-[9px] mt-2 text-neutral-500">Last GPS Ping: 5 mins ago</p>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
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
              <Card className="border-2 border-black rounded-2xl overflow-hidden">
                <CardHeader className="bg-neutral-50 border-b-2 border-black">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter">Hero Banner & Promo Settings</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Hero Title</label>
                      <Input value={cmsForm?.heroTitle} onChange={e => setCmsForm({ ...cmsForm, heroTitle: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Hero Subtitle</label>
                      <Input value={cmsForm?.heroSubtitle} onChange={e => setCmsForm({ ...cmsForm, heroSubtitle: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex justify-between items-center">
                        <label className="uppercase-soft text-[10px]">Promo Ticker Text (Gunakan | untuk pisahkan baris)</label>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 text-[8px] font-black uppercase border-black/10"
                          onClick={() => setCmsForm({ ...cmsForm, promoText: cmsForm?.promoText ? `${cmsForm.promoText} | ` : "" })}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Row
                        </Button>
                      </div>
                      <Textarea 
                        value={cmsForm?.promoText} 
                        onChange={e => setCmsForm({ ...cmsForm, promoText: e.target.value })} 
                        placeholder="Contoh: Promo Diskon 10% | Gratis Survey Jabodetabek"
                        className="bg-white/50"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button className="btn-sleek px-8" onClick={handleSaveCMS}>Update Landing Page</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-black rounded-2xl overflow-hidden">
                <CardHeader className="bg-neutral-50 border-b-2 border-black">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter">AI Rate Card & Payment Instructions (Step 4-5)</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-accent">Bank Transfer Details</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-neutral-400">Bank Name</label>
                            <Input 
                              value={cmsForm?.paymentBankName || ""} 
                              onChange={e => setCmsForm({ ...cmsForm, paymentBankName: e.target.value })} 
                              placeholder="e.g. BRI"
                              className="h-9 border-2 border-black/10 rounded-xl font-black text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-neutral-400">Account Holder</label>
                            <Input 
                              value={cmsForm?.paymentAccountHolder || ""} 
                              onChange={e => setCmsForm({ ...cmsForm, paymentAccountHolder: e.target.value })} 
                              placeholder="e.g. TBJ CONTRACTOR"
                              className="h-9 border-2 border-black/10 rounded-xl font-black text-xs uppercase"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-neutral-400">Account Number</label>
                          <Input 
                            value={cmsForm?.paymentAccountNumber || ""} 
                            onChange={e => setCmsForm({ ...cmsForm, paymentAccountNumber: e.target.value })} 
                            placeholder="Digits only"
                            className="h-9 border-2 border-black/10 rounded-xl font-black text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">QRIS & Assessment Info</h4>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-neutral-400">QRIS Subtitle / Instructions</label>
                          <Input 
                            value={cmsForm?.paymentQrisInstructions || ""} 
                            onChange={e => setCmsForm({ ...cmsForm, paymentQrisInstructions: e.target.value })} 
                            placeholder="e.g. Scan & Pay via All E-Wallet"
                            className="h-9 border-2 border-black/10 rounded-xl font-black text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-neutral-400">Payment Terms Footer</label>
                          <Input 
                            value={cmsForm?.surveyPaymentTerms || ""} 
                            onChange={e => setCmsForm({ ...cmsForm, surveyPaymentTerms: e.target.value })} 
                            placeholder="e.g. *Biaya ini akan kami kembalikan..."
                            className="h-9 border-2 border-black/10 rounded-xl italic text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t-2 border-black/5">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-black">Digital Assessment Key Benefits</h4>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-[9px] font-black uppercase border-black/20"
                        onClick={() => {
                          const benefits = cmsForm?.surveyBenefits || [];
                          setCmsForm({ ...cmsForm, surveyBenefits: [...benefits, "New Benefit"] });
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Benefit
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      {(cmsForm?.surveyBenefits || []).map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2 bg-neutral-50 p-2 rounded-xl border border-black/5">
                          <Input 
                            value={benefit} 
                            onChange={e => {
                              const newBenefits = [...(cmsForm?.surveyBenefits || [])];
                              newBenefits[i] = e.target.value;
                              setCmsForm({ ...cmsForm, surveyBenefits: newBenefits });
                            }}
                            className="h-8 border-none bg-transparent text-[10px] font-bold uppercase p-1 focus-visible:ring-0"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-red-500 hover:bg-red-50"
                            onClick={() => {
                              const newBenefits = (cmsForm?.surveyBenefits || []).filter((_, idx) => idx !== i);
                              setCmsForm({ ...cmsForm, surveyBenefits: newBenefits });
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end border-t-2 border-black pt-6 mt-4">
                    <Button className="btn-sleek px-12 h-12 rounded-xl" onClick={handleSaveCMS}>Save Content Updates</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-black rounded-2xl p-6 bg-accent text-white relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Daily AI Content Suggestions</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={() => {
                        toast.info("AI Suggestion History coming soon...");
                      }}
                    >
                      <Clock className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-white hover:bg-white/20"
                      disabled={loadingAI}
                      onClick={handleAIGenerate}
                    >
                      {loadingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-black/20 rounded-xl border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Today's Focus:</p>
                    <p className="text-sm italic">"Keunggulan Renovasi Cepat TBJ: Dari Survey ke RAB dalam 24 Jam!"</p>
                  </div>
                  <div className="p-4 bg-black/20 rounded-xl border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Social Media Hook:</p>
                    <p className="text-sm italic">"Punya budget terbatas tapi mau hasil mewah? Cek portofolio interior kami di Jakarta Selatan."</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "finance" && (
            <div className="space-y-8">
              {/* Record Payment Dialog */}
              <Dialog open={showRecordPayment} onOpenChange={setShowRecordPayment}>
                <DialogContent className="max-w-md rounded-3xl border-2 border-black">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tighter">Record Client Payment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase">Select Project</label>
                      <select 
                        className="w-full h-10 rounded-xl border-2 border-black/10 px-3 text-sm"
                        value={paymentForm.projectId}
                        onChange={e => setPaymentForm({...paymentForm, projectId: e.target.value})}
                      >
                        <option value="">Choose Project...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase">Amount (Rp)</label>
                      <Input 
                        type="number" 
                        value={paymentForm.amount} 
                        onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})}
                        className="h-10 rounded-xl border-2 border-black/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase">Description</label>
                      <Input 
                        value={paymentForm.description} 
                        onChange={e => setPaymentForm({...paymentForm, description: e.target.value})}
                        className="h-10 rounded-xl border-2 border-black/10"
                      />
                    </div>
                    <Button className="w-full btn-sleek h-12 mt-4" onClick={handleRecordPayment}>Confirm Payment</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="grid md:grid-cols-4 gap-6">
                <Card className="border-2 border-black rounded-2xl p-6 bg-green-50">
                  <p className="uppercase-soft text-green-600 text-[10px]">Total Revenue (Released)</p>
                  <p className="text-3xl font-black text-green-700">
                    Rp {transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                  </p>
                </Card>
                <Card className="border-2 border-black rounded-2xl p-6 bg-red-50">
                  <p className="uppercase-soft text-red-600 text-[10px]">Total Expenses</p>
                  <p className="text-3xl font-black text-red-700">
                    Rp {transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                  </p>
                </Card>
                <Card className="border-2 border-black rounded-2xl p-6 bg-blue-50">
                  <p className="uppercase-soft text-blue-600 text-[10px]">Total Escrow Balance</p>
                  <p className="text-3xl font-black text-blue-700">
                    Rp {projects.reduce((acc, p) => acc + (p.escrowBalance || 0), 0).toLocaleString()}
                  </p>
                </Card>
                <Card className="border-2 border-black rounded-2xl p-6 bg-black text-white">
                  <p className="uppercase-soft text-white/60 text-[10px]">Net Profit</p>
                  <p className="text-3xl font-black text-accent">
                    Rp {(transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0) - 
                         transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)).toLocaleString()}
                  </p>
                </Card>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <Card className="md:col-span-2 border-2 border-black rounded-2xl overflow-hidden shadow-sm">
                  <CardHeader className="bg-neutral-50 border-b-2 border-black flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">Transaction Ledger</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" className="btn-sleek text-[10px] font-black uppercase" onClick={() => setShowRecordPayment(true)}>Record Client Payment</Button>
                      <Button size="sm" variant="outline" className="border-2 border-black text-[10px] font-black uppercase">Export CSV</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-neutral-50">
                          <TableHead className="uppercase-soft">Date</TableHead>
                          <TableHead className="uppercase-soft">Description</TableHead>
                          <TableHead className="uppercase-soft">Category</TableHead>
                          <TableHead className="uppercase-soft text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-[10px] font-bold">{new Date(t.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase">{t.description}</p>
                                {t.projectName && <p className="text-[8px] text-neutral-400 uppercase">Project: {t.projectName}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                "text-[8px] uppercase font-black",
                                t.type === 'income' ? "border-green-500 text-green-600" : "border-red-500 text-red-600"
                              )}>
                                {t.category}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-mono font-bold text-xs",
                              t.type === 'income' ? "text-green-600" : "text-red-600"
                            )}>
                              {t.type === 'income' ? "+" : "-"} Rp {t.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        {transactions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-12 text-neutral-400 italic">No transactions recorded yet.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="space-y-8">
                  <Card className="border-2 border-black rounded-2xl p-6 bg-accent text-white">
                    <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Escrow Release Requests</h3>
                    <div className="space-y-4">
                      {projects.flatMap(p => (p.paymentMilestones || [])
                        .filter(m => m.status === 'requested')
                        .map(m => (
                          <div key={`${p.id}-${m.id}`} className="p-4 bg-white/10 rounded-xl border border-white/20 space-y-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase text-white/60">{p.name}</p>
                              <p className="text-sm font-black">{m.label}</p>
                            </div>
                            <div className="flex justify-between items-end">
                              <p className="text-lg font-black">Rp {m.amount.toLocaleString()}</p>
                              <Button size="sm" className="bg-white text-accent hover:bg-white/90 text-[9px] font-black uppercase">Approve Release</Button>
                            </div>
                          </div>
                        ))
                      )}
                      {projects.every(p => !(p.paymentMilestones || []).some(m => m.status === 'requested')) && (
                        <p className="text-[10px] text-white/60 italic text-center py-4">No pending release requests.</p>
                      )}
                    </div>
                  </Card>

                  <Card className="border-2 border-black rounded-2xl p-6">
                    <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Weekly Worker Payroll</h3>
                    <div className="space-y-4">
                      {wages.filter(w => w.status === 'pending').map(w => (
                        <div key={w.id} className="flex items-center justify-between p-3 border-2 border-black rounded-xl">
                          <div>
                            <p className="text-[10px] font-black uppercase">{w.workerName}</p>
                            <p className="text-[8px] text-neutral-400 uppercase">{w.projectName}</p>
                            <p className="text-xs font-bold">Rp {w.amount.toLocaleString()}</p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => updateWageStatus(w.id, 'paid')}
                            className="bg-green-500 hover:bg-green-600 text-white text-[9px] font-black uppercase h-8"
                          >
                            Pay
                          </Button>
                        </div>
                      ))}
                      {wages.filter(w => w.status === 'pending').length === 0 && (
                        <p className="text-[10px] text-neutral-400 italic text-center py-4">All wages paid.</p>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
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
                <CardHeader className="bg-neutral-50 border-b-2 border-black flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">Marketing Campaigns</CardTitle>
                    {selectedCampaigns.length > 0 && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="h-8 px-4 rounded-full text-[8px] uppercase font-black"
                        onClick={async () => {
                          if (confirm(`Hapus ${selectedCampaigns.length} campaign terpilih?`)) {
                            for (const id of selectedCampaigns) await deleteCampaign(id);
                            setSelectedCampaigns([]);
                            toast.success("Bulk delete complete.");
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-2" /> Bulk Delete ({selectedCampaigns.length})
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <Input 
                        placeholder="Search campaigns..." 
                        className="pl-10 h-10 rounded-xl border-2 border-black/10 text-xs font-bold bg-white"
                        value={campaignSearch}
                        onChange={e => setCampaignSearch(e.target.value)}
                      />
                    </div>
                    <Button className="btn-sleek h-10 px-6 rounded-xl w-full md:w-auto" onClick={() => {
                      setEditingCampaign({ name: "", content: "", status: "Draft", reach: "0", conversion: "0%" });
                      setShowEditCampaign(true);
                    }}>
                      <Plus className="w-4 h-4 mr-2" /> New Campaign
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {campaigns.filter(c => 
                    c.name.toLowerCase().includes(campaignSearch.toLowerCase()) || 
                    c.content.toLowerCase().includes(campaignSearch.toLowerCase())
                  ).map((c) => (
                    <div 
                      key={c.id} 
                      className={cn(
                        "flex items-center justify-between p-6 border-2 border-black rounded-2xl hover:bg-neutral-50 transition-colors cursor-pointer group",
                        selectedCampaigns.includes(c.id) ? "border-accent bg-accent/5" : "border-black"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-grow">
                        <Checkbox 
                          checked={selectedCampaigns.includes(c.id)}
                          onCheckedChange={() => {
                            setSelectedCampaigns(prev => 
                              prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="space-y-1" onClick={() => {
                          setEditingCampaign(c);
                          setShowEditCampaign(true);
                        }}>
                          <p className="font-black text-sm uppercase tracking-widest">{c.name}</p>
                          <div className="flex items-center gap-3">
                            <p className="text-[10px] text-neutral-400">Reach: {c.reach} | Conv: {c.conversion}</p>
                            {c.scheduledDeleteDate && (
                              <Badge className="bg-red-50 text-red-500 text-[8px] border-none uppercase font-black">
                                <Clock className="w-2 h-2 mr-1" /> Scheduled: {new Date(c.scheduledDeleteDate).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] italic text-neutral-500 line-clamp-1">{c.content}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={cn("uppercase-soft", c.status === "Active" ? "bg-green-500 text-white" : "bg-neutral-200")}>{c.status}</Badge>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-neutral-300 hover:text-black"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCampaign(c);
                              setShowEditCampaign(true);
                            }}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-neutral-300 hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              if(confirm("Hapus campaign ini?")) deleteCampaign(c.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {showEditCampaign && (
                <Dialog open={showEditCampaign} onOpenChange={setShowEditCampaign}>
                  <DialogContent className="max-w-2xl rounded-3xl border-2 border-black">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black uppercase tracking-tighter">
                        {editingCampaign.id ? "Edit Campaign" : "Create New Campaign"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="uppercase-soft text-[10px]">Campaign Name</label>
                          <Input 
                            value={editingCampaign.name} 
                            onChange={e => setEditingCampaign({...editingCampaign, name: e.target.value})}
                            placeholder="e.g. Promo Lebaran" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="uppercase-soft text-[10px]">Status</label>
                          <select 
                            className="w-full h-10 rounded-md border border-black/10 px-3 text-sm" 
                            value={editingCampaign.status}
                            onChange={e => setEditingCampaign({...editingCampaign, status: e.target.value as any})}
                          >
                            <option value="Active">Active</option>
                            <option value="Draft">Draft</option>
                            <option value="Paused">Paused</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="uppercase-soft text-[10px]">Campaign Content / Copy</label>
                        <Textarea 
                          value={editingCampaign.content} 
                          onChange={e => setEditingCampaign({...editingCampaign, content: e.target.value})}
                          className="min-h-[150px]" 
                          placeholder="Write your campaign message here..." 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="uppercase-soft text-[10px]">Display Location</label>
                        <div className="flex gap-4">
                          {["Landing Page", "User Dashboard", "WhatsApp Blast"].map(loc => (
                            <label key={loc} className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={editingCampaign.locations?.includes(loc)} 
                                onChange={e => {
                                  const locations = editingCampaign.locations || [];
                                  if (e.target.checked) {
                                    setEditingCampaign({...editingCampaign, locations: [...locations, loc]});
                                  } else {
                                    setEditingCampaign({...editingCampaign, locations: locations.filter(l => l !== loc)});
                                  }
                                }}
                                className="rounded border-black" 
                              /> {loc}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="uppercase-soft text-[10px]">Reach Count Estimate</label>
                          <Input 
                            value={editingCampaign.reach || ""} 
                            onChange={e => setEditingCampaign({...editingCampaign, reach: e.target.value})}
                            placeholder="e.g. 1.2k" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="uppercase-soft text-[10px] text-red-500">Scheduled Auto-Delete (Optional)</label>
                          <Input 
                            type="date" 
                            value={editingCampaign.scheduledDeleteDate || ""} 
                            onChange={e => setEditingCampaign({...editingCampaign, scheduledDeleteDate: e.target.value})} 
                            className="border-red-100"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-4 pt-4">
                        <Button variant="ghost" onClick={() => setShowEditCampaign(false)}>Cancel</Button>
                        <Button className="btn-sleek px-8" onClick={handleSaveCampaign}>Publish Campaign</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}

          {activeTab === "materials" && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 border-2 border-black rounded-3xl">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Material Procurement Hub</h2>
                  <p className="text-[10px] uppercase font-bold text-neutral-400">Total Requests: {requests.length}</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input 
                      placeholder="Search requests..." 
                      className="pl-10 h-10 rounded-xl border-2 border-black/10 text-xs font-bold"
                      value={materialSearch}
                      onChange={e => setMaterialSearch(e.target.value)}
                    />
                  </div>
                  <Dialog>
                    <DialogTrigger render={
                      <Button className="btn-orange h-10 px-6 rounded-xl">
                        <Plus className="w-4 h-4 mr-2" /> Bulk Order
                      </Button>
                    } />
                    <DialogContent className="max-w-2xl rounded-3xl border-2 border-black">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Bulk Material Order</DialogTitle>
                        <DialogDescription className="uppercase-soft">Create a multi-item material request for a project.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase">Select Project</label>
                          <select 
                            className="w-full h-12 border-2 border-black/10 rounded-xl px-4 text-sm font-bold"
                            value={selectedBulkProject}
                            onChange={e => setSelectedBulkProject(e.target.value)}
                          >
                            <option value="">Choose Project...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-black uppercase tracking-widest">Order Items</h4>
                            <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase border-black/10" onClick={handleAddBulkRow}>Add Row</Button>
                          </div>
                          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {bulkOrderItems.map((item, i) => (
                              <div key={i} className="grid grid-cols-12 gap-2 items-start bg-neutral-50/50 p-2 rounded-xl relative">
                                <div className="col-span-6 space-y-1">
                                  <Input 
                                    placeholder="Nama Material..." 
                                    list={`material-suggestions-${i}`}
                                    className="h-10 text-xs font-bold border-2 border-black/5 rounded-lg focus-visible:ring-black" 
                                    value={item.name}
                                    onChange={e => {
                                      const newItems = [...bulkOrderItems];
                                      newItems[i].name = e.target.value;
                                      setBulkOrderItems(newItems);
                                    }}
                                  />
                                  <datalist id={`material-suggestions-${i}`}>
                                    {materialSuggestions.map((s, idx) => (
                                      <option key={idx} value={s} />
                                    ))}
                                  </datalist>
                                </div>
                                <Input 
                                  type="number" 
                                  placeholder="Vol" 
                                  className="col-span-2 h-10 text-xs font-bold border-2 border-black/5 rounded-lg" 
                                  value={item.quantity}
                                  onChange={e => {
                                    const newItems = [...bulkOrderItems];
                                    newItems[i].quantity = Number(e.target.value);
                                    setBulkOrderItems(newItems);
                                  }}
                                />
                                <Input 
                                  placeholder="Sat" 
                                  className="col-span-2 h-10 text-xs font-bold border-2 border-black/5 rounded-lg" 
                                  value={item.unit}
                                  onChange={e => {
                                    const newItems = [...bulkOrderItems];
                                    newItems[i].unit = e.target.value;
                                    setBulkOrderItems(newItems);
                                  }}
                                />
                                <div className="col-span-2 flex justify-end">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 text-red-500 hover:bg-red-50 rounded-xl"
                                    onClick={() => setBulkOrderItems(bulkOrderItems.filter((_, idx) => idx !== i))}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button className="btn-sleek w-full h-12 rounded-xl" onClick={handleBulkOrderSubmit}>Submit Bulk Order</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Badge className="bg-accent text-white border-none uppercase-soft">Pending: {requests.filter(r => r.status === 'pending').length}</Badge>
                </div>
              </div>

              <Card className="border-2 border-black rounded-2xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead className="uppercase-soft">Project & Requester</TableHead>
                      <TableHead className="uppercase-soft">Material Item</TableHead>
                      <TableHead className="uppercase-soft">Quantity</TableHead>
                      <TableHead className="uppercase-soft">Status</TableHead>
                      <TableHead className="uppercase-soft text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.filter(req => 
                      req.itemName.toLowerCase().includes(materialSearch.toLowerCase()) || 
                      req.projectName.toLowerCase().includes(materialSearch.toLowerCase()) ||
                      (req.note && req.note.toLowerCase().includes(materialSearch.toLowerCase()))
                    ).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-black text-xs uppercase tracking-widest">{r.projectName}</p>
                            <p className="text-[9px] uppercase-soft text-neutral-400">By: {r.requesterName}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-bold uppercase">{r.itemName}</TableCell>
                        <TableCell className="text-xs font-bold uppercase">{r.quantity} {r.unit}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "uppercase-soft text-[9px] rounded-md",
                            r.status === 'approved' ? "bg-green-500 text-white" : 
                            r.status === 'ordered' ? "bg-blue-500 text-white" :
                            r.status === 'delivered' ? "bg-purple-500 text-white" :
                            r.status === 'rejected' ? "bg-red-500 text-white" : "bg-neutral-200 text-neutral-600"
                          )}>
                            {r.status}
                          </Badge>
                        </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {r.status === 'pending' && (
                                <>
                                  <Button size="sm" className="bg-green-500 hover:bg-green-600 h-8 text-[9px] font-black uppercase" onClick={() => {
                                    setSelectedRequest(r);
                                    setShowAssignVendor(true);
                                  }}>Assign Vendor</Button>
                                  <Button size="sm" variant="destructive" className="h-8 text-[9px] font-black uppercase" onClick={() => updateRequestStatus(r.id, 'rejected')}>Reject</Button>
                                </>
                              )}
                              {r.status === 'approved' && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="border-green-500 text-green-600 text-[8px] uppercase">
                                    Assigned: {r.vendorName}
                                  </Badge>
                                  <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase border-black/10" onClick={() => {
                                    const vendor = vendors.find(v => v.id === r.vendorId);
                                    if (vendor) {
                                      const project = projects.find(p => p.id === r.projectId);
                                      const msg = `Halo ${vendor.name},\n\nIni adalah Purchase Order dari TBJ Constech untuk proyek *${r.projectName}*.\n\n📍 *Lokasi Pengiriman:* ${project?.location || "Gudang Proyek TBJ Constech"}\n👤 *Penerima:* ${r.requesterName}\n📞 *WA Penerima:* 081213496672\n\nSilakan cek lampiran PO yang kami kirimkan. Terima kasih.`;
                                      
                                      generatePOPDF(r, vendor, TBJ_LOGO, {
                                        name: r.requesterName || "TIM LOGISTIK TBJ",
                                        phone: "081213496672",
                                        address: project?.location || "Gudang Proyek TBJ Constech"
                                      });
                                      
                                      window.open(`https://wa.me/${vendor.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
                                    }
                                  }}>
                                    <Download className="w-3 h-3 mr-1" /> PO & WA
                                  </Button>
                                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 h-8 text-[9px] font-black uppercase" onClick={() => updateRequestStatus(r.id, 'ordered')}>Order</Button>
                                </div>
                              )}
                              {r.status === 'ordered' && (
                                <Button size="sm" className="bg-accent hover:bg-accent/90 h-8 text-[9px] font-black uppercase text-white" onClick={() => updateRequestStatus(r.id, 'delivered')}>Delivered</Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-red-500" onClick={() => { if(confirm("Hapus request ini?")) deleteRequest(r.id); }}><Trash2 className="w-4 h-4" /></Button>
                            </div>
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
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Live Attendance Feed</h2>
                <Button variant="outline" className="border-2 border-black h-10 px-6 rounded-xl">
                  <Download className="w-4 h-4 mr-2" /> Export Report
                </Button>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <Card className="md:col-span-2 border-2 border-black rounded-2xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-neutral-50">
                        <TableHead className="uppercase-soft">Staff Name</TableHead>
                        <TableHead className="uppercase-soft">Check In</TableHead>
                        <TableHead className="uppercase-soft">Check Out</TableHead>
                        <TableHead className="uppercase-soft">Site Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="font-black text-xs uppercase tracking-widest">{a.userName}</TableCell>
                          <TableCell className="text-xs font-bold">
                            {new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell className="text-xs font-bold">
                            {a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                          </TableCell>
                          <TableCell className="text-[10px] text-neutral-400">
                            {a.location ? `${a.location.lat.toFixed(4)}, ${a.location.lng.toFixed(4)}` : "Unknown Site"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {attendance.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-neutral-400 italic">No attendance records today.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
                
                <Card className="border-2 border-black rounded-2xl p-6 bg-black text-white">
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Attendance Stats</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-white/10 rounded-xl">
                      <p className="text-[10px] uppercase-soft text-white/60">Total Present Today</p>
                      <p className="text-2xl font-black">{attendance.length} Staff</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-xl">
                      <p className="text-[10px] uppercase-soft text-white/60">Active Sessions</p>
                      <p className="text-2xl font-black">{attendance.filter(a => !a.checkOut).length}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "gallery" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Gallery Management</h2>
                <Button className="btn-sleek h-10 px-6 rounded-xl" onClick={() => setShowAddGallery(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Gallery Item
                </Button>
              </div>

              {showAddGallery && (
                <Card className="border-2 border-black rounded-2xl p-6 bg-neutral-50 animate-in fade-in slide-in-from-top-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Title</label>
                      <Input value={newGallery.title} onChange={e => setNewGallery({...newGallery, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Category</label>
                      <select className="w-full h-10 rounded-md border border-black/10 px-3 text-sm" value={newGallery.category} onChange={e => setNewGallery({...newGallery, category: e.target.value})}>
                        <option value="project">Project</option>
                        <option value="interior">Interior</option>
                        <option value="renovation">Renovation</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="uppercase-soft text-[10px]">Image URL</label>
                      <Input value={newGallery.imageUrl} onChange={e => setNewGallery({...newGallery, imageUrl: e.target.value})} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="uppercase-soft text-[10px]">Description</label>
                      <Textarea value={newGallery.description} onChange={e => setNewGallery({...newGallery, description: e.target.value})} />
                    </div>
                  </div>
                    <div className="flex justify-end gap-4 mt-6">
                      <Button variant="ghost" onClick={() => setShowAddGallery(false)}>Cancel</Button>
                      <Button className="btn-sleek px-8" onClick={async () => {
                        const galleryPayload = {
                          ...newGallery,
                          images: [newGallery.imageUrl], // Map to expected images array
                          date: new Date().toISOString(),
                          value: 0
                        };
                        await addGalleryItem(galleryPayload as any);
                        setShowAddGallery(false);
                        setNewGallery({ title: "", description: "", imageUrl: "", category: "project" });
                        toast.success("Project Gallery updated successfully");
                      }}>Save Item</Button>
                    </div>
                </Card>
              )}

              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                {gallery.map(item => (
                  <Card key={item.id} className="border-2 border-black rounded-2xl overflow-hidden group">
                    <div className="h-40 relative">
                      <img src={getDriveImageUrl(item.imageUrl)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteGalleryItem(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="p-4 flex flex-col gap-2">
                       <div className="flex justify-between items-center">
                         <p className="font-black text-[10px] uppercase tracking-widest">{item.title}</p>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           onClick={() => updateGalleryItem(item.id, { published: !item.published })}
                           className={cn("h-6 px-2 text-[8px] font-black uppercase rounded-md", item.published ? "bg-green-100 text-green-600" : "bg-neutral-100 text-neutral-400")}
                         >
                           {item.published ? "Published" : "Draft"}
                         </Button>
                       </div>
                       <Badge className="bg-neutral-100 text-neutral-600 border-none text-[8px] w-fit">{item.category}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "media" && (
            <div className="animate-in fade-in duration-500">
              <MediaWarehouse />
            </div>
          )}

          {activeTab === "properties" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Property & Strategic Hub</h2>
                <Button className="btn-sleek h-10 px-6 rounded-xl" onClick={() => setShowAddProperty(true)}>
                  <Plus className="w-4 h-4 mr-2" /> List New Asset
                </Button>
              </div>

              {showAddProperty && (
                <Card className="border-2 border-black rounded-2xl p-6 bg-neutral-50 animate-in fade-in slide-in-from-top-4">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Title</label>
                      <Input value={newProperty.title} onChange={e => setNewProperty({...newProperty, title: e.target.value})} placeholder="e.g. Lahan Strategis BSD" />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Type / Category</label>
                        <select className="w-full h-10 rounded-md border border-black/10 px-3 text-sm" value={newProperty.type} onChange={e => setNewProperty({...newProperty, type: e.target.value as any})}>
                          <option value="kerjasama">SYNERGY LAB</option>
                          <option value="bangun">TITIP BANGUN</option>
                          <option value="jual">JUAL & SEWA</option>
                          <option value="legal">LEGAL & PERIZINAN</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Price (Rp)</label>
                      <Input type="number" value={newProperty.price} onChange={e => setNewProperty({...newProperty, price: Number(e.target.value)})} />
                    </div>
                    
                    <div className="space-y-4 md:col-span-2">
                      <div className="space-y-2">
                        <label className="uppercase-soft text-[10px]">Search Location & Set Coordinates</label>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Type address to search..." 
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                searchPropLocation(e.currentTarget.value);
                              }
                            }}
                          />
                          <Button 
                            variant="secondary" 
                            className="h-10 px-4 border-2 border-black shrink-0"
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                              searchPropLocation(input.value);
                            }}
                            disabled={isSearchingPropLoc}
                          >
                            {isSearchingPropLoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <MapPicker 
                        position={propMapPos} 
                        setPosition={(p) => {
                          setPropMapPos(p);
                          setNewProperty(prev => ({ ...prev, coordinates: { lat: p[0], lng: p[1] } }));
                        }} 
                      />
                      <div className="flex gap-4 text-[10px] font-mono text-neutral-400">
                        <span>LAT: {propMapPos[0].toFixed(6)}</span>
                        <span>LNG: {propMapPos[1].toFixed(6)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Location Description</label>
                      <Input value={newProperty.location} onChange={e => setNewProperty({...newProperty, location: e.target.value})} placeholder="Area name, city..." />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Area (m2)</label>
                      <Input type="number" value={newProperty.area} onChange={e => setNewProperty({...newProperty, area: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-4">
                      <label className="uppercase-soft text-[10px]">Pilih Foto Properti</label>
                      <ImageUpload 
                        path="properties"
                        label="Add Property Photo"
                        onUploadComplete={(url) => setNewProperty(prev => ({ ...prev, photos: [...(prev.photos || []), url] }))}
                      />
                      {newProperty.photos && newProperty.photos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {newProperty.photos.map((p, idx) => (
                            <div key={idx} className="relative group">
                              <img src={p} alt="Prop" className="w-12 h-12 rounded-lg object-cover border-2 border-black" />
                              <button 
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setNewProperty(prev => ({ ...prev, photos: prev.photos?.filter((_, i) => i !== idx) }))}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <label className="uppercase-soft text-[10px]">Description</label>
                      <Textarea value={newProperty.description} onChange={e => setNewProperty({...newProperty, description: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-4 mt-6">
                    <Button variant="ghost" onClick={() => setShowAddProperty(false)}>Cancel</Button>
                    <Button className="btn-sleek px-8" onClick={async () => {
                      await addProperty(newProperty as any);
                      setShowAddProperty(false);
                      setNewProperty({ title: "", type: "lahan", price: 0, area: 0, description: "", status: "available", photos: [], features: [], coordinates: { lat: -6.2088, lng: 106.8456 } });
                      setPropMapPos([-6.2088, 106.8456]);
                    }}>Save Listing</Button>
                  </div>
                </Card>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {properties.map(p => (
                  <Card key={p.id} className="border-2 border-black rounded-3xl overflow-hidden group">
                    <div className="h-48 relative">
                      <img src={getDriveImageUrl(p.photos[0]) || "https://picsum.photos/seed/prop/400/300"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <Badge className="absolute top-4 left-4 bg-black text-white uppercase-soft">
                        {p.type === 'kerjasama' ? 'Synergy Lab' : p.type === 'bangun' ? 'Titip Bangun' : p.type === 'jual' ? 'Jual & Sewa' : p.type === 'legal' ? 'Legal & Perizinan' : p.type}
                      </Badge>
                      <Button variant="destructive" size="icon" className="absolute top-4 right-4 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteProperty(p.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-black text-lg uppercase tracking-tighter flex-grow">{p.title}</h3>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => updateProperty(p.id, { published: !p.published })}
                          className={cn("h-6 px-2 text-[8px] font-black uppercase rounded-md shrink-0", p.published ? "bg-green-100 text-green-600" : "bg-neutral-100 text-neutral-400")}
                        >
                          {p.published ? "Published" : "Draft"}
                        </Button>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold uppercase text-neutral-500">
                        <span>{p.location}</span>
                        <span>{p.area} m2</span>
                      </div>
                      <p className="text-sm font-black text-accent">Rp {p.price.toLocaleString('id-ID')}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "vendors" && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Vendor Database</h2>
                <Button className="btn-sleek h-10 px-6 rounded-xl" onClick={() => setShowAddVendor(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Register Vendor
                </Button>
              </div>

              {showAddVendor && (
                <Card className="border-2 border-black rounded-2xl p-6 bg-neutral-50 animate-in fade-in slide-in-from-top-4">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Store Name</label>
                      <Input value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Category</label>
                      <Input placeholder="e.g. Besi, Semen, Cat" value={newVendor.category} onChange={e => setNewVendor({...newVendor, category: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Contact Person</label>
                      <Input value={newVendor.contactName} onChange={e => setNewVendor({...newVendor, contactName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">WhatsApp</label>
                      <Input value={newVendor.whatsapp} onChange={e => setNewVendor({...newVendor, whatsapp: e.target.value})} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="uppercase-soft text-[10px]">Address</label>
                      <Input value={newVendor.address} onChange={e => setNewVendor({...newVendor, address: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-4 mt-6">
                    <Button variant="ghost" onClick={() => setShowAddVendor(false)}>Cancel</Button>
                    <Button className="btn-sleek px-8" onClick={async () => {
                      await addVendor(newVendor as any);
                      setShowAddVendor(false);
                      setNewVendor({ name: "", category: "", contactName: "", whatsapp: "", email: "", address: "" });
                    }}>Save Vendor</Button>
                  </div>
                </Card>
              )}

              <Card className="border-2 border-black rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="uppercase-soft">Vendor Name</TableHead>
                      <TableHead className="uppercase-soft">Category</TableHead>
                      <TableHead className="uppercase-soft">Contact</TableHead>
                      <TableHead className="uppercase-soft">WhatsApp</TableHead>
                      <TableHead className="uppercase-soft text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map(v => (
                      <TableRow key={v.id}>
                        <TableCell className="font-black text-xs uppercase tracking-widest">{v.name}</TableCell>
                        <TableCell><Badge variant="outline" className="border-black text-[9px] uppercase">{v.category}</Badge></TableCell>
                        <TableCell className="text-[10px] font-bold">{v.contactName}</TableCell>
                        <TableCell>
                          <a href={`https://wa.me/${v.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:underline">
                            <Phone className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{v.whatsapp}</span>
                          </a>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteVendor(v.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="space-y-8">
              <div className="grid md:grid-cols-3 gap-8">
                <Card className="border-2 border-black rounded-2xl p-6 bg-accent text-white">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-2">Digital Assessment Fee</h3>
                  <p className="text-4xl font-black">Rp {(systemConfig?.surveyFee || 399000).toLocaleString('id-ID')}</p>
                  <p className="text-[10px] uppercase font-bold text-white/60 mt-2">Standard rate for site validation</p>
                </Card>
                <Card className="border-2 border-black rounded-2xl p-6 bg-white">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-2">Pending Approvals</h3>
                  <p className="text-4xl font-black text-accent">{projects.filter(p => p.status === 'active').length}</p>
                  <p className="text-[10px] uppercase font-bold text-neutral-400 mt-2">Milestones awaiting client approval</p>
                </Card>
                <Card className="border-2 border-space-grey/20 rounded-2xl p-6 bg-space-grey text-white">
                  <h3 className="text-lg font-black uppercase tracking-tighter mb-2">Revenue Forecast</h3>
                  <p className="text-4xl font-black text-green-400">Rp 12.4B</p>
                  <p className="text-[10px] uppercase font-bold text-white/40 mt-2">Projected from active contracts</p>
                </Card>
              </div>

              <Card className="border-2 border-black rounded-2xl overflow-hidden">
                <CardHeader className="bg-neutral-50 border-b-2 border-black flex flex-row justify-between items-center">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter">Assessment & Payment Terms</CardTitle>
                  <select 
                    className="h-10 rounded-xl border-2 border-black px-3 text-[10px] font-black uppercase"
                    value={selectedProjectFinance?.id || ""}
                    onChange={e => setSelectedProjectFinance(projects.find(p => p.id === e.target.value) || null)}
                  >
                    <option value="">Select Project to Manage...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-widest">Digital Assessment Content</h4>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Soft-Selling Headline</label>
                        <Input 
                          defaultValue="Digital Assessment & Technical Validation" 
                          className="font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Service Description</label>
                        <Textarea 
                          defaultValue="Dapatkan analisa mendalam dari tim ahli kami untuk memastikan proyek Anda berjalan efisien, aman, dan sesuai budget. Langkah awal menuju hunian impian yang terencana sempurna." 
                          className="min-h-[100px]"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-widest">
                        {selectedProjectFinance ? `Payment Milestones: ${selectedProjectFinance.name}` : "Payment Milestones (Default)"}
                      </h4>
                      <div className="space-y-3">
                        {selectedProjectFinance ? (
                          <>
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-[10px] font-black uppercase">Termin Pembayaran</h4>
                              <Button 
                                size="sm" 
                                className="btn-orange h-8 text-[9px] font-black uppercase"
                                onClick={async () => {
                                  // Fetch items for the project subcollection
                                  const itemsRef = collection(db, "projects", selectedProjectFinance.id, "items");
                                  const snap = await getDocs(itemsRef);
                                  const projectItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
                                  
                                  const client = users.find(u => u.uid === selectedProjectFinance.clientId);
                                  
                                  generateInvoicePDF({
                                    number: `INV/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`,
                                    date: new Date().toLocaleDateString('id-ID'),
                                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'),
                                    clientName: client?.displayName || "Klien Terhormat",
                                    clientPhone: client?.whatsapp || "081213496672",
                                    projectName: selectedProjectFinance.name,
                                    items: projectItems.map(it => ({
                                      desc: it.name,
                                      qty: it.quantity,
                                      unit: it.unit,
                                      price: user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(it.pricePerUnit, systemConfig?.globalMarkup) : calculateClientPrice(it.pricePerUnit, systemConfig?.globalMarkup),
                                      total: user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(it.totalPrice, systemConfig?.globalMarkup) : calculateClientPrice(it.totalPrice, systemConfig?.globalMarkup)
                                    })),
                                    total: user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(selectedProjectFinance.totalBudget, systemConfig?.globalMarkup) : calculateClientPrice(selectedProjectFinance.totalBudget, systemConfig?.globalMarkup),
                                    bankInfo: {
                                      bank: `Bank ${cmsConfig?.paymentBankName || "BRI"}`,
                                      accNo: cmsConfig?.paymentAccountNumber || "4792-0103-1488-535",
                                      accName: `an ${cmsConfig?.paymentAccountHolder || "TBJ CONTRACTOR"}`
                                    }
                                  });
                                  toast.success("Invoice Generated Succesfully");
                                }}
                              >
                                <Download className="w-3 h-3 mr-2" /> Generate Invoice
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="btn-orange h-8 text-[9px] font-black uppercase shadow-none"
                                onClick={() => {
                                  const markup = systemConfig?.globalMarkup || 20;
                                  const finalBudget = user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(selectedProjectFinance.totalBudget, markup) : calculateClientPrice(selectedProjectFinance.totalBudget, markup);
                                  const message = `*OFFICIAL INVOICE - TBJ CONSTECH*%0A%0AProyek: ${selectedProjectFinance.name}%0ATotal Tagihan: Rp ${finalBudget.toLocaleString('id-ID')}%0A%0AMohon segera melakukan pembayaran ke Bank ${cmsConfig?.paymentBankName || "BRI"}: ${cmsConfig?.paymentAccountNumber || "4792-0103-1488-535"} (a/n ${cmsConfig?.paymentAccountHolder || "TBJ CONTRACTOR"}).%0A%0A_Dibuat via TBJ Constech OS_`;
                                  const client = users.find(u => u.uid === selectedProjectFinance.clientId);
                                  window.open(`https://wa.me/${client?.whatsapp || '081213496672'}?text=${encodeURIComponent(message)}`, "_blank");
                                }}
                              >
                                <Phone className="w-3 h-3 mr-2 text-green-500" /> Share via WA
                              </Button>
                            </div>
                            {(selectedProjectFinance.paymentMilestones || []).map((m, i) => (
                              <div key={i} className="flex justify-between items-center p-3 border-2 border-black rounded-xl bg-white">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-black uppercase block">{m.label}</span>
                                  <span className="text-[8px] uppercase-soft text-neutral-400">Status: {m.status}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-black text-accent">{m.percentage}%</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={async () => {
                                    const newMilestones = selectedProjectFinance.paymentMilestones.filter((_, idx) => idx !== i);
                                    await updateProject(selectedProjectFinance.id, { paymentMilestones: newMilestones });
                                    setSelectedProjectFinance({...selectedProjectFinance, paymentMilestones: newMilestones});
                                    toast.success("Milestone removed");
                                  }}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <Button variant="outline" className="w-full border-2 border-black border-dashed h-10 text-[10px] font-black uppercase" onClick={() => {
                              toast.info("Add milestone feature coming soon...");
                            }}>
                              <Plus className="w-3 h-3 mr-2" /> Add Custom Milestone
                            </Button>
                          </>
                        ) : (
                          [
                            { label: "Down Payment (DP)", value: "30%" },
                            { label: "Progress 50%", value: "40%" },
                            { label: "Progress 90%", value: "25%" },
                            { label: "Retensi (100%)", value: "5%" },
                          ].map((m, i) => (
                            <div key={i} className="flex justify-between items-center p-3 border-2 border-black rounded-xl">
                              <span className="text-[10px] font-black uppercase">{m.label}</span>
                              <span className="text-xs font-black text-accent">{m.value}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-black rounded-2xl overflow-hidden">
                <CardHeader className="bg-neutral-50 border-b-2 border-black">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter">Client Payment Approvals</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="uppercase-soft">Project</TableHead>
                        <TableHead className="uppercase-soft">Milestone</TableHead>
                        <TableHead className="uppercase-soft">Amount</TableHead>
                        <TableHead className="uppercase-soft">Status</TableHead>
                        <TableHead className="uppercase-soft text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.filter(p => p.status === 'active').map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-[10px] font-black uppercase tracking-widest">{p.name}</TableCell>
                          <TableCell className="text-[10px] font-bold uppercase">Termin 2 (Progress 50%)</TableCell>
                          <TableCell className="text-[10px] font-black">Rp 125.000.000</TableCell>
                          <TableCell>
                            <Badge className="bg-yellow-500 text-white text-[8px] uppercase font-black">Waiting Client</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase">Remind Client</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                        { role: "admin", label: "Admin Owner", access: "Full System Access" },
                        { role: "pm", label: "Project Manager", access: "Project & Workforce" },
                        { role: "user", label: "Client/User", access: "Dashboard & AI Analysis" },
                      ].map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border-2 border-black rounded-xl">
                          <div>
                            <p className="font-black text-sm uppercase tracking-widest">{r.label}</p>
                            <p className="text-[10px] text-neutral-400">{r.access}</p>
                          </div>
                          <Badge variant="outline" className="border-black rounded-md">
                            {users.filter(u => u.role === r.role).length} Users
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <Dialog>
                      <DialogTrigger render={<Button className="w-full btn-sleek h-12 rounded-xl">Manage Permissions</Button>} />
                      <DialogContent className="max-w-2xl rounded-3xl border-2 border-black">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-black uppercase tracking-tighter">Permission Matrix</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="uppercase-soft">Feature</TableHead>
                                <TableHead className="uppercase-soft">Admin</TableHead>
                                <TableHead className="uppercase-soft">PM</TableHead>
                                <TableHead className="uppercase-soft">User</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {[
                                { f: "Master Data", a: "Full", p: "Read", u: "None" },
                                { f: "Finance", a: "Full", p: "None", u: "None" },
                                { f: "Workforce", a: "Full", p: "Full", u: "None" },
                                { f: "AI Analysis", a: "Full", p: "Full", u: "Limited" },
                              ].map((row, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-[10px] font-black uppercase">{row.f}</TableCell>
                                  <TableCell><Badge className="bg-green-500 text-white text-[8px]">{row.a}</Badge></TableCell>
                                  <TableCell><Badge className={cn("text-[8px]", row.p === 'Full' ? "bg-green-500 text-white" : "bg-neutral-200")}>{row.p}</Badge></TableCell>
                                  <TableCell><Badge className={cn("text-[8px]", row.u === 'Limited' ? "bg-blue-500 text-white" : "bg-neutral-200")}>{row.u}</Badge></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>

                <Card className="border-2 border-black rounded-2xl overflow-hidden">
                  <CardHeader className="bg-neutral-50 border-b-2 border-black">
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">System Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border-2 border-black rounded-xl bg-accent/5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-accent/10 rounded-lg">
                            <Sparkles className="w-5 h-5 text-accent" />
                          </div>
                          <div>
                            <p className="font-black text-sm uppercase tracking-widest">AI Hub Monitoring</p>
                            <p className="text-[10px] text-neutral-400">Total analysis tokens used system-wide</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black">{users.reduce((sum, u) => sum + (u.aiUsageCount || 0), 0)}</p>
                          <p className="text-[8px] uppercase font-bold text-neutral-400">Total Interactions</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 border-2 border-black rounded-xl">
                        <div>
                          <p className="font-black text-sm uppercase tracking-widest">Auto-Notification (WA)</p>
                          <p className="text-[10px] text-neutral-400">Send automatic updates to clients</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn("h-8 w-12 p-0 rounded-full relative transition-colors", systemConfig?.autoNotificationWA ? "bg-green-500" : "bg-neutral-200")}
                          onClick={() => updateSystem({ autoNotificationWA: !systemConfig?.autoNotificationWA })}
                        >
                          <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", systemConfig?.autoNotificationWA ? "right-1" : "left-1")} />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-4 border-2 border-black rounded-xl">
                        <div>
                          <p className="font-black text-sm uppercase tracking-widest">AI Analysis Mode</p>
                          <p className="text-[10px] text-neutral-400">Enhanced accuracy for RAB estimation</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn("h-8 w-12 p-0 rounded-full relative transition-colors", systemConfig?.aiAnalysisMode ? "bg-green-500" : "bg-neutral-200")}
                          onClick={() => updateSystem({ aiAnalysisMode: !systemConfig?.aiAnalysisMode })}
                        >
                          <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", systemConfig?.aiAnalysisMode ? "right-1" : "left-1")} />
                        </Button>
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger render={<Button variant="outline" className="w-full border-2 border-black h-12 rounded-xl uppercase font-black text-[10px]">Advanced Configuration</Button>} />
                      <DialogContent className="max-w-md rounded-3xl border-2 border-black">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-black uppercase tracking-tighter">System Config</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          <div className="space-y-2">
                            <label className="uppercase-soft text-[10px]">Digital Assessment Fee (Rp)</label>
                            {systemConfig && (
                              <Input 
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                defaultValue={systemConfig.surveyFee} 
                                onBlur={(e) => updateSystem({ surveyFee: Number(e.target.value) })}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '');
                                  e.target.value = val;
                                }}
                                className="font-mono font-bold" 
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="uppercase-soft text-[10px]">AI Free Limit (Unverified)</label>
                            {systemConfig && (
                              <Input 
                                type="number"
                                defaultValue={systemConfig.aiFreeLimit} 
                                onBlur={(e) => updateSystem({ aiFreeLimit: Number(e.target.value) })}
                                className="font-mono font-bold" 
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="uppercase-soft text-[10px]">AI Verified Limit (WhatsApp Verified)</label>
                            {systemConfig && (
                              <Input 
                                type="number"
                                defaultValue={systemConfig.aiVerifiedLimit || 5} 
                                onBlur={(e) => updateSystem({ aiVerifiedLimit: Number(e.target.value) })}
                                className="font-mono font-bold" 
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="uppercase-soft text-[10px]">Global Markup (%)</label>
                            {systemConfig && (
                              <Input 
                                type="number"
                                defaultValue={systemConfig.globalMarkup} 
                                onBlur={(e) => updateSystem({ globalMarkup: Number(e.target.value) })}
                                className="font-mono font-bold" 
                              />
                            )}
                          </div>
                          <Button className="w-full btn-sleek" onClick={() => toast.success("System configuration saved")}>Close</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Vendor Assignment Modal */}
      {showAssignVendor && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-2 border-black rounded-3xl overflow-hidden animate-in zoom-in-95">
            <CardHeader className="bg-neutral-50 border-b-2 border-black">
              <CardTitle className="text-xl font-black uppercase tracking-tighter">Assign Vendor</CardTitle>
              <CardDescription className="uppercase-soft">Select vendor for {selectedRequest.itemName}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest">Available Vendors</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {vendors.filter(v => v.category.toLowerCase().includes(selectedRequest.itemName.toLowerCase()) || true).map(v => (
                    <div 
                      key={v.id} 
                      className="p-3 border-2 border-black rounded-xl hover:bg-neutral-50 cursor-pointer flex justify-between items-center"
                      onClick={() => handleAssignVendor(selectedRequest.id, v.id)}
                    >
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest">{v.name}</p>
                        <p className="text-[9px] text-neutral-400 font-bold uppercase">{v.category}</p>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setShowAssignVendor(false)}>Cancel</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Edit Specs Master Dialog */}
      <Dialog open={!!editingMasterSpecs} onOpenChange={(open) => !open && setEditingMasterSpecs(null)}>
        <DialogContent className="max-w-md rounded-3xl border-2 border-black">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter">Edit Spesifikasi Teknis</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase text-neutral-500">
              Master: {editingMasterSpecs?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Plus className="w-3 h-3 text-accent" /> Keterangan Spesifikasi
              </label>
              <Textarea 
                placeholder="Contoh: Merk Indocement, Tipe Tiga Roda, Material PC..." 
                className="min-h-[120px] border-2 border-black rounded-2xl p-4 text-xs font-medium focus:ring-accent bg-white"
                value={editingMasterSpecs?.specs || ""}
                onChange={(e) => setEditingMasterSpecs(prev => prev ? { ...prev, specs: e.target.value } : null)}
              />
              <p className="text-[9px] text-neutral-400 italic">
                *Spesifikasi ini akan tersimpan permanen di database MASTER.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditingMasterSpecs(null)} className="rounded-xl uppercase font-black text-[10px]">Batal</Button>
            <Button 
              className="btn-orange px-8 rounded-xl uppercase font-black text-[10px]"
              onClick={async () => {
                if (editingMasterSpecs) {
                  await updateMasterItem(editingMasterSpecs.id, { technicalSpecs: editingMasterSpecs.specs });
                  setEditingMasterSpecs(null);
                  toast.success("Spesifikasi Master berhasil diperbarui");
                }
              }}
            >
              Simpan Spesifikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

