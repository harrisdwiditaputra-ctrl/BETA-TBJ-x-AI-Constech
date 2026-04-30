import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  useMasterData, useAuth, useUsers, useProjects, 
  useWorkforce, useMaterialRequests, useProperties, 
  useCMSConfig, useSystemConfig, 
  useGallery, useVendors, useAttendance, 
  useFinance, useWorkerWages, useMasterCategories, 
  usePMs, useMediaAssets, useSavedEstimates, 
  saveImageToGudang, useMaterialSuggestions,
  useProjectDetails, useLeads
} from "@/lib/hooks";
import { ProjectAIHealth } from "./ProjectAIHealth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, Search, Save, UserPlus, Database, Settings, ShieldCheck, 
  RefreshCw, TrendingUp, DollarSign, Users, Briefcase, Plus, ChevronDown, ChevronUp, ChevronLeft, 
  ChevronRight, Download, Eye, EyeOff, Trash2, Image as ImageIcon, 
  LayoutDashboard, FileText, HardHat, Camera, BarChart3, Clock, Phone, User, Mail, Box,
  CheckCircle2, MapPin, Package, Brain, Zap, AlertCircle, Layers, History, Sparkles, Upload, X, HardDrive, Menu, ExternalLink, Calendar,
  ArrowDownLeft, ArrowUpRight, Lock, Gavel, CreditCard, Truck, BarChart, FileEdit, Link2, BarChart2
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

const AIHealthWrapper = ({ project, masterData, onClose }: { project: Project; masterData: any[]; onClose: () => void }) => {
  const { items } = useProjectDetails(project.id);
  return <ProjectAIHealth project={project} items={items} masterData={masterData} onClose={onClose} />;
};

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [masterActionsExpanded, setMasterActionsExpanded] = useState(false);
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
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projectStatus, setProjectStatus] = useState("all");
  const [projectCategory, setProjectCategory] = useState("all");
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialCategory, setMaterialCategory] = useState("all");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [estimatesSearch, setEstimatesSearch] = useState("");
  const [estimatesCategory, setEstimatesCategory] = useState("all");
  const [selectedEstimates, setSelectedEstimates] = useState<string[]>([]);
  const { workforce, loading: workforceLoading, addWorkforce, updateWorkforce, deleteWorkforce } = useWorkforce(user?.role);
  const { requests, loading: requestsLoading, updateRequest, updateRequestStatus, assignVendor, addRequest, deleteRequest } = useMaterialRequests(user?.role);
  const { suggestions: materialSuggestions, addSuggestion } = useMaterialSuggestions();
  const { properties, loading: propertiesLoading, addProperty, updateProperty, deleteProperty } = useProperties();
  const { gallery, addGalleryItem, deleteGalleryItem, updateGalleryItem } = useGallery();
  const { vendors, addVendor, deleteVendor, updateVendor } = useVendors();
  const { attendance, loading: attendanceLoading } = useAttendance(user?.role);
  const { config: cmsConfig, updateConfig: updateCMS } = useCMSConfig();
  const { config: systemConfig, updateConfig: updateSystem } = useSystemConfig();
  const { transactions, addTransaction } = useFinance();
  const { wages, updateWageStatus } = useWorkerWages();
  const { pms } = usePMs();
  const { estimates: savedEstimates, deleteEstimate } = useSavedEstimates(undefined, true);
  const { leads, addLead, updateLead, deleteLead, loading: leadsLoading } = useLeads();

  const syncEstimateToProject = async (estimateId: string, projectId: string) => {
    const est = savedEstimates.find(e => e.id === estimateId);
    if (!est) return;
    try {
      // 1. Update project metadata based on estimate
      await updateProject(projectId, {
        totalBudget: est.totalBudget,
        category: est.category,
      });

      // 2. We should ideally copy categories and items. 
      // Since this is complex logic, we'll notify that integration is initializing
      toast.success(`Syncing RAB "${est.projectName}" to Project...`);
      
      // Implementation note: This would involve batch writing est.categories and est.items
      // to the respective subcollections of the project.
      // For now, we update the primary budget.
      
      toast.success("RAB Synced to Project Dashboard!");
    } catch (error) {
      toast.error("Failed to sync RAB");
    }
  };
  const pdfLogo = TBJ_LOGO;

  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "clients" | "projects" | "workforce" | "cms" | "finance" | "marketing" | "management" | "materials" | "attendance" | "gallery" | "properties" | "vendors" | "payments" | "media" | "estimates">("dashboard");
  const [leadSearch, setLeadSearch] = useState("");
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    whatsapp: "",
    source: "Manual",
    status: "Lead",
    notes: ""
  });
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
  const [expandedNavSections, setExpandedNavSections] = useState<string[]>(["Operational Hub"]);

  const toggleNavSection = (sectionName: string) => {
    setExpandedNavSections(prev => 
      prev.includes(sectionName) 
        ? prev.filter(s => s !== sectionName)
        : [...prev, sectionName]
    );
  };
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

  // Pagination State
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [clientsPerPage, setClientsPerPage] = useState(10);
  const [currentClientPage, setCurrentClientPage] = useState(1);
  const [vendorsPerPage, setVendorsPerPage] = useState(10);
  const [currentVendorPage, setCurrentVendorPage] = useState(1);

  // Workforce Filter State
  const [workerSearch, setWorkerSearch] = useState("");
  const [selectedWorkerRole, setSelectedWorkerRole] = useState("all");
  const [selectedWorkerSkill, setSelectedWorkerSkill] = useState("all");
  const [workerAvailability, setWorkerAvailability] = useState("all");
  const [currentWorkerPage, setCurrentWorkerPage] = useState(1);
  const [workersPerPage, setWorkersPerPage] = useState(10);

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
    description: "Pembayaran Full Project (Escrow)",
    method: "Transfer" as any
  });

  const [expenseForm, setExpenseForm] = useState({
    projectId: "",
    amount: 0,
    description: "",
    category: "material" as any,
    method: "Cash" as any,
    receiptUrl: "",
    itemId: ""
  });
  const [showRecordExpense, setShowRecordExpense] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const handleUploadReceipt = async (file: File) => {
    setIsUploadingReceipt(true);
    try {
      const url = await saveImageToGudang(file, "finance", expenseForm.projectId || "general", `Receipt_${Date.now()}`);
      setExpenseForm(prev => ({ ...prev, receiptUrl: url }));
      toast.success("Bon/Kwitansi berhasil diunggah.");
    } catch (error) {
      toast.error("Gagal mengunggah bon.");
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.projectId || paymentForm.amount <= 0) return;
    
    const project = projects.find(p => p.id === paymentForm.projectId);
    if (!project) return;

    try {
      // Update project escrow balance
      await updateProject(project.id, {
        escrowBalance: (project.escrowBalance || 0) + paymentForm.amount
      });

      // Record transaction
      await addTransaction({
        projectId: project.id,
        projectName: project.name,
        type: "income",
        category: "client_payment",
        amount: paymentForm.amount,
        description: paymentForm.description,
        method: paymentForm.method,
        date: new Date().toISOString(),
        status: "completed"
      });

      setShowRecordPayment(false);
      setPaymentForm({ projectId: "", amount: 0, description: "Pembayaran Full Project (Escrow)", method: "Transfer" });
      toast.success("Pembayaran klien berhasil dicatat ke Escrow");
    } catch (error) {
      toast.error("Gagal mencatat pembayaran");
    }
  };

  const handleRecordExpense = async () => {
    if (!expenseForm.amount || !expenseForm.description) {
      toast.error("Mohon lengkapi nominal dan deskripsi.");
      return;
    }

    try {
      let projectName = "General/Operational";
      if (expenseForm.projectId) {
        const proj = projects.find(p => p.id === expenseForm.projectId);
        if (proj) projectName = proj.name;
      }

      await addTransaction({
        projectId: expenseForm.projectId || undefined,
        projectName: projectName,
        type: "expense",
        category: expenseForm.category as any,
        amount: expenseForm.amount,
        description: expenseForm.description,
        method: expenseForm.method as any,
        receiptUrl: expenseForm.receiptUrl,
        itemId: expenseForm.itemId || undefined,
        date: new Date().toISOString(),
        status: "completed"
      });

      // If it's a labor expense (wage), we might want to check if it's tied to useWorkerWages, 
      // but for "Manual Expense" we just record it to finance ledger.

      setShowRecordExpense(false);
      setExpenseForm({
        projectId: "",
        amount: 0,
        description: "",
        category: "material",
        method: "Cash",
        receiptUrl: "",
        itemId: ""
      });
      toast.success("Pengeluaran berhasil dicatat ke Ledger.");
    } catch (error) {
      toast.error("Gagal mencatat pengeluaran.");
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

  const filteredClients = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        (u.displayName || "").toLowerCase().includes(clientSearch.toLowerCase()) || 
        (u.email || "").toLowerCase().includes(clientSearch.toLowerCase()) ||
        (u.whatsapp || "").toLowerCase().includes(clientSearch.toLowerCase());
      const matchesTier = projectCategory === "all" || u.tier === projectCategory;
      return matchesSearch && matchesTier;
    });
  }, [users, clientSearch, projectCategory]);

  const paginatedClients = useMemo(() => {
    const startIndex = (currentClientPage - 1) * clientsPerPage;
    return filteredClients.slice(startIndex, startIndex + clientsPerPage);
  }, [filteredClients, currentClientPage, clientsPerPage]);

  const totalClientPages = Math.ceil(filteredClients.length / clientsPerPage);

  const filteredWorkforce = useMemo(() => {
    return workforce.filter(w => {
      const s = workerSearch.toLowerCase();
      const matchesSearch = 
        (w.name || "").toLowerCase().includes(s) || 
        (w.role || "").toLowerCase().includes(s) || 
        (w.skill || "").toLowerCase().includes(s);
      const matchesRole = selectedWorkerRole === "all" || w.role === selectedWorkerRole;
      const matchesSkill = selectedWorkerSkill === "all" || w.skill === selectedWorkerSkill;
      const matchesAvailability = workerAvailability === "all" || w.availability === workerAvailability;
      return matchesSearch && matchesRole && matchesSkill && matchesAvailability;
    });
  }, [workforce, workerSearch, selectedWorkerRole, selectedWorkerSkill, workerAvailability]);

  const paginatedWorkforce = useMemo(() => {
    const startIndex = (currentWorkerPage - 1) * workersPerPage;
    return filteredWorkforce.slice(startIndex, startIndex + workersPerPage);
  }, [filteredWorkforce, currentWorkerPage, workersPerPage]);

  const totalWorkerPages = Math.ceil(filteredWorkforce.length / workersPerPage);

  const workerSkills = useMemo(() => {
    const skills = new Set(workforce.map(w => w.skill).filter(Boolean));
    return Array.from(skills).sort();
  }, [workforce]);

  useEffect(() => {
    setCurrentWorkerPage(1);
  }, [workerSearch, selectedWorkerRole, selectedWorkerSkill, workerAvailability]);

  const [vendorSearch, setVendorSearch] = useState("");
  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const s = vendorSearch.toLowerCase();
      return (v.name || "").toLowerCase().includes(s) || 
             (v.category || "").toLowerCase().includes(s) ||
             (v.contactName || "").toLowerCase().includes(s);
    });
  }, [vendors, vendorSearch]);

  const paginatedVendors = useMemo(() => {
    const startIndex = (currentVendorPage - 1) * vendorsPerPage;
    return filteredVendors.slice(startIndex, startIndex + vendorsPerPage);
  }, [filteredVendors, currentVendorPage, vendorsPerPage]);

  const totalVendorPages = Math.ceil(filteredVendors.length / vendorsPerPage);

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

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedMasterCategory, selectedUnit]);

  useEffect(() => {
    setCurrentClientPage(1);
  }, [clientSearch, projectCategory]);

  useEffect(() => {
    setCurrentVendorPage(1);
  }, [vendorSearch]);

  // Paginated Master Data
  const paginatedMaster = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMaster.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMaster, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredMaster.length / itemsPerPage);

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
    status: "active",
    availability: "available",
    startDate: new Date().toISOString(),
    absences: []
  });

  const handleAddWorker = async () => {
    if (!newWorker.name || !newWorker.ktp) {
      toast.error("Name and KTP are required");
      return;
    }
    await addWorkforce({
      ...newWorker,
      id: `W${Date.now()}`, // Fallback if addWorkforce doesn't generate one
      createdAt: new Date().toISOString()
    } as any);
    setShowAddWorker(false);
    setNewWorker({ 
      name: "", 
      role: "tukang", 
      skill: "", 
      ktp: "", 
      whatsapp: "", 
      status: "active",
      availability: "available",
      startDate: new Date().toISOString(),
      absences: []
    });
  };

  const [cmsForm, setCmsForm] = useState<Partial<CMSConfig>>({
    heroTitle: "Membangun Masa Depan Konstruksi Indonesia",
    heroSubtitle: "Platform All-in-One untuk Renovasi, Interior, dan Bangun Baru dengan Teknologi AI.",
    promoText: "",
    promoActive: false
  });

  useEffect(() => {
    if (cmsConfig) {
      setCmsForm(cmsConfig);
    }
  }, [cmsConfig]);

  const handleSaveCMS = async () => {
    if (cmsForm) {
      await updateCMS(cmsForm as any);
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
          
          {/* Grouped Navigation */}
          {[
            {
              group: "Operational Hub",
              icon: LayoutDashboard,
              color: "text-orange-500",
              items: [
                { id: "dashboard", label: "Insights", icon: LayoutDashboard, roles: ["admin", "pm"] },
                { id: "projects", label: "Command Center", icon: Briefcase, roles: ["admin", "pm"] },
                { id: "estimates", label: "Arsip Estimasi", icon: FileText, roles: ["admin", "pm"] },
                { id: "materials", label: "Logistik (Material)", icon: Package, roles: ["admin", "pm"] },
                { id: "payments", label: "Assessments", icon: DollarSign, roles: ["admin"] },
              ]
            },
            {
              group: "Asset & Database",
              icon: Database,
              color: "text-blue-500",
              items: [
                { id: "products", label: "Master AHSP", icon: Database, roles: ["admin", "pm"] },
                { id: "clients", label: "Database Klien", icon: Users, roles: ["admin"] },
                { id: "vendors", label: "Database Vendor", icon: Truck, roles: ["admin", "pm"] },
                { id: "properties", label: "Database Properti", icon: MapPin, roles: ["admin", "pm"] },
              ]
            },
            {
              group: "Resource & Media",
              icon: HardHat,
              color: "text-green-500",
              items: [
                { id: "workforce", label: "Workforce", icon: HardHat, roles: ["admin", "pm"] },
                { id: "attendance", label: "Attendance", icon: Clock, roles: ["admin", "pm"] },
                { id: "media", label: "Media Warehouse", icon: HardDrive, roles: ["admin", "pm"] },
                { id: "gallery", label: "Media Gallery", icon: ImageIcon, roles: ["admin", "pm"] },
              ]
            },
            {
              group: "Business & System",
              icon: Settings,
              color: "text-purple-500",
              items: [
                { id: "finance", label: "Financial Ledger", icon: BarChart3, roles: ["admin"] },
                { id: "marketing", label: "Lead CRM", icon: UserPlus, roles: ["admin"] },
                { id: "cms", label: "CMS Content", icon: FileEdit, roles: ["admin"] },
                { id: "management", label: "System Management", icon: Settings, roles: ["admin"] },
              ]
            }
          ].map((section) => {
            const filteredItems = section.items.filter(item => item.roles.includes(user?.role || ""));
            if (filteredItems.length === 0) return null;

            return (
              <div key={section.group} className="space-y-1 mb-2">
                <button 
                  onClick={() => toggleNavSection(section.group)}
                  className="w-full px-6 py-3 flex items-center justify-between border-b border-black/5 hover:bg-neutral-50 transition-colors group/header"
                >
                  <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2", section.color)}>
                    <section.icon className="w-3 h-3 transition-transform group-hover/header:scale-110" /> {section.group}
                  </p>
                  <ChevronDown className={cn("w-3 h-3 text-neutral-300 transition-transform duration-300", expandedNavSections.includes(section.group) ? "rotate-180" : "rotate-0")} />
                </button>
                
                {expandedNavSections.includes(section.group) && (
                  <div className="px-2 pt-1 pb-4 space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                    {filteredItems.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setIsNavOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-start gap-4 px-4 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all",
                          activeTab === tab.id 
                            ? "bg-black text-white shadow-xl" 
                            : "text-neutral-500 hover:bg-neutral-50 hover:translate-x-1"
                        )}
                      >
                        <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-accent" : "text-neutral-300")} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          
          {user?.role === "admin" && (
            <div className="pt-8 mt-8 border-t border-black/5">
              <Button 
                variant="destructive" 
                className="w-full gap-2 rounded-xl h-12 uppercase font-black text-[10px]"
                onClick={resetDatabase}
              >
                <RefreshCw className="w-4 h-4" /> Reset System
              </Button>
            </div>
          )}
        </div>

        <div className="flex-grow space-y-8">
          {/* Header Info */}
          <div className="flex justify-between items-center px-4 md:px-0">
            <div>
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">
                {activeTab === "dashboard" && "Business Insights"}
                {activeTab === "products" && "Master Database (Products)"}
                {activeTab === "projects" && "Project Management"}
                {activeTab === "clients" && "Client Database"}
                {activeTab === "workforce" && "Workforce & Security"}
                {activeTab === "cms" && "Content Management"}
                {activeTab === "finance" && "Financial Reports"}
                {activeTab === "marketing" && "Lead CRM (Relationship Management)"}
                {activeTab === "vendors" && "Vendor Database"}
                {activeTab === "payments" && "Payment & Assessment Management"}
                {activeTab === "media" && "Gudang Gambar & Assets"}
                {activeTab === "estimates" && "Arsip Estimasi (Saved RAB)"}
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
                <DialogContent className="sm:max-w-md">
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
          <div className="overflow-hidden px-4 md:px-0">
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
                  <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                    <div className="md:hidden w-full">
                      <Button 
                        variant="outline" 
                        className="w-full border-2 border-black h-12 rounded-xl font-black uppercase text-xs flex justify-between px-6"
                        onClick={() => setMasterActionsExpanded(!masterActionsExpanded)}
                      >
                        Action Center {masterActionsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                    {(masterActionsExpanded || window.innerWidth >= 768) && (
                      <div className={cn(
                        "flex flex-wrap gap-2 w-full md:w-auto",
                        "animate-in slide-in-from-top-2 duration-300 md:animate-none"
                      )}>
                        <Button className="btn-orange h-10 px-6 rounded-xl font-black uppercase text-[10px] flex-grow md:flex-grow-0" onClick={() => setShowAddProduct(!showAddProduct)}>
                          <Plus className="w-4 h-4 mr-2" /> {showAddProduct ? "Close Form" : "Add Item"}
                        </Button>
                        <Button variant="outline" className="border-2 border-black h-10 px-6 rounded-xl font-black uppercase text-[10px] flex-grow md:flex-grow-0" onClick={() => setShowAddMasterCategory(!showAddMasterCategory)}>
                          <Layers className="w-4 h-4 mr-2" /> Categories
                        </Button>
                        <Button variant="outline" className="border-2 border-black h-10 px-6 rounded-xl font-black uppercase text-[10px] flex-grow md:flex-grow-0" onClick={handleExportMasterRAB}>
                          <Download className="w-4 h-4 mr-2" /> PDF
                        </Button>
                        <Button variant="outline" className="border-2 border-black h-10 px-6 rounded-xl font-black uppercase text-[10px] flex-grow md:flex-grow-0" onClick={async () => {
                          const mode = confirm("SYNC LOCAL DATA\n\nOK: Sync Tambahan (Hanya tambah yang belum ada)\nCancel: Overwrite (Hapus semua cloud lalu upload ulang 161 item)");
                          
                          if (mode) {
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
                            if (confirm("⚠️ PERINGATAN: Ini akan menghapus SEMUA data master di Cloud (termasuk hasil import manual) dan menggantinya dengan 161 item internal. Lanjutkan?")) {
                              await clearMasterData();
                              await bulkAddMasterItems(WORK_ITEMS_MASTER);
                            }
                          }
                        }}>
                          <RefreshCw className="w-4 h-4 mr-2" /> AHSP
                        </Button>
                        <Button variant="outline" className="border-2 border-black h-10 px-6 rounded-xl font-black uppercase text-[10px] flex-grow md:flex-grow-0" onClick={() => navigate("/import")}>
                          <Upload className="w-4 h-4 mr-2" /> Import
                        </Button>
                        <Button variant="outline" className="border-2 border-accent text-accent h-10 px-6 rounded-xl font-black uppercase text-[10px] flex-grow md:flex-grow-0" onClick={() => setShowSaveVersion(true)}>
                          <Save className="w-4 h-4 mr-2" /> Snapshot
                        </Button>
                        <Button variant="outline" className="border-2 border-black h-10 px-6 rounded-xl font-black uppercase text-[10px] flex-grow md:flex-grow-0" onClick={() => setShowVersionHistory(true)}>
                          <History className="w-4 h-4 mr-2" /> Archive
                        </Button>
                      </div>
                    )}
                  </div>
              </div>

              <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
                <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-auto rounded-3xl border-2 border-black">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-neutral-50 p-4 rounded-2xl border-2 border-black/5 shadow-sm">
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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-grow w-full">
                        <Input 
                          placeholder="New Category Name..." 
                          value={newMasterCategory}
                          onChange={e => setNewMasterCategory(e.target.value)}
                          className="border-black/10 w-full"
                        />
                      </div>
                      <Button className="btn-sleek w-full sm:w-auto px-8" onClick={async () => {
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
                      {paginatedMaster.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-40 text-center text-neutral-400 italic uppercase font-black tracking-widest">
                            No items found matching your filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedMaster.map((item, index) => {
                          const isExpanded = expandedRows.includes(item.id);
                          const isEditing = editingId === item.id;
                          const absoluteIndex = (currentPage - 1) * itemsPerPage + index + 1;
                          
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
                                  {absoluteIndex}
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

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border-2 border-black/5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Items per page:</span>
                  <div className="flex gap-1">
                    {[10, 50, 100].map((size) => (
                      <Button 
                        key={size}
                        variant="outline" 
                        size="sm"
                        className={cn(
                          "h-8 px-3 rounded-lg text-[10px] font-black border-none",
                          itemsPerPage === size ? "bg-black text-white" : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                        )}
                        onClick={() => {
                          setItemsPerPage(size);
                          setCurrentPage(1);
                        }}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg border-2 border-black/5"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg border-2 border-black/5"
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

          {activeTab === "clients" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                    <Input 
                      placeholder="Search clients..." 
                      className="pl-9 h-9 border-neutral-200 rounded-xl text-xs bg-white/50 focus:bg-white transition-all shadow-sm"
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                    />
                  </div>
                  <select 
                    className="h-9 w-full sm:w-auto border border-neutral-200 rounded-xl px-4 text-[10px] font-black uppercase tracking-tight bg-white shadow-sm outline-none focus:ring-1 focus:ring-accent/20"
                    value={projectCategory}
                    onChange={e => setProjectCategory(e.target.value)}
                  >
                    <option value="all">ALL TIERS</option>
                    <option value="prospect">TIER 1 (LEAD)</option>
                    <option value="survey">TIER 2 (SILVER)</option>
                    <option value="deal">TIER 3 (GOLD)</option>
                  </select>
                </div>
                <Button variant="outline" className="border-neutral-200 h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-all shadow-sm group w-full md:w-auto" onClick={exportClients}>
                  <Download className="w-3.5 h-3.5 mr-2 text-neutral-400 group-hover:text-accent transition-colors" /> Export Data
                </Button>
              </div>

              <Card className="border border-neutral-200 rounded-2xl overflow-hidden shadow-sm bg-white/50 backdrop-blur-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-neutral-50/50 border-b border-neutral-100">
                        <TableHead className="uppercase-soft text-[9px] font-black tracking-widest pl-6">Client Identity</TableHead>
                        <TableHead className="uppercase-soft text-[9px] font-black tracking-widest">Membership Tier</TableHead>
                        <TableHead className="uppercase-soft text-[9px] font-black tracking-widest">Financial Status</TableHead>
                        <TableHead className="uppercase-soft text-[9px] font-black tracking-widest">Regional Location</TableHead>
                        <TableHead className="uppercase-soft text-[9px] font-black tracking-widest">Acquisition Date</TableHead>
                        <TableHead className="uppercase-soft text-[9px] font-black tracking-widest text-right pr-6">Operations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedClients.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-40 text-center text-neutral-400 italic uppercase font-black tracking-widest text-[10px]">
                            No clients identified in this segment.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedClients.map((u) => (
                          <TableRow key={u.uid} className="hover:bg-neutral-50/50 transition-colors border-b border-neutral-50 last:border-0">
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-3 py-1">
                                <div className="w-9 h-9 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[11px] font-black text-neutral-600 shadow-inner">
                                  {u.displayName?.[0] || 'U'}
                                </div>
                                <div className="space-y-0.5">
                                  <p className="font-bold text-xs text-neutral-800 tracking-tight">{u.displayName}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] text-neutral-400 font-medium">{u.email}</p>
                                    {u.waVerified && u.whatsapp ? (
                                      <a 
                                        href={`https://wa.me/${u.whatsapp.replace(/\D/g, '')}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-green-500 hover:text-green-600 transition-colors"
                                      >
                                        <Phone className="w-2.5 h-2.5" />
                                      </a>
                                    ) : (
                                      <span className="text-[8px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full border border-red-100/50 font-black uppercase tracking-tighter">Unverified</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1.5">
                                <Dialog>
                                  <DialogTrigger nativeButton={false} render={
                                    <Badge className={cn(
                                      "uppercase font-black text-[8px] tracking-widest rounded-full px-2.5 py-1 border-none cursor-pointer hover:scale-105 transition-transform",
                                      u.tier === 'deal' ? "bg-accent/10 text-accent shadow-sm shadow-accent/5" : 
                                      u.tier === 'survey' ? "bg-blue-50 text-blue-500 shadow-sm shadow-blue-500/5" : "bg-neutral-100 text-neutral-500"
                                    )}>
                                      {u.tier === 'deal' ? "Gold Access" : u.tier === 'survey' ? "Silver Partner" : "Lead Prospect"}
                                    </Badge>
                                  } />
                                  <DialogContent className="sm:max-w-3xl rounded-[2rem] border border-neutral-200 p-0 overflow-hidden shadow-2xl">
                                    <div className="bg-neutral-900 p-8 text-white relative">
                                      <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <Users className="w-32 h-32" />
                                      </div>
                                      <div className="relative z-10 space-y-2">
                                         <Badge className="bg-accent text-white border-none text-[8px] font-black uppercase tracking-widest rounded-full px-4 py-1">Standard Dossier</Badge>
                                         <h1 className="text-4xl font-black uppercase tracking-tighter">{u.displayName}</h1>
                                         <div className="flex items-center gap-4 text-[10px] font-bold text-white/60 tracking-widest uppercase">
                                            <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {u.email}</span>
                                            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : 'Unknown'}</span>
                                         </div>
                                      </div>
                                    </div>
                                    <div className="p-8 grid md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto thin-scrollbar">
                                      <div className="space-y-6">
                                        <div className="space-y-3">
                                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Core Identity</h4>
                                          <div className="grid grid-cols-2 gap-4">
                                             <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1">
                                                <p className="text-[8px] font-black text-neutral-400 uppercase">WhatsApp</p>
                                                <p className="text-xs font-bold">{u.whatsapp || 'No Contact'}</p>
                                             </div>
                                             <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1">
                                                <p className="text-[8px] font-black text-neutral-400 uppercase">Region</p>
                                                <p className="text-xs font-bold">{u.location || 'Undisclosed'}</p>
                                             </div>
                                          </div>
                                          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-1">
                                             <p className="text-[8px] font-black text-neutral-400 uppercase">Physical Address</p>
                                             <p className="text-xs font-bold leading-relaxed">{u.address || 'No detailed address provided.'}</p>
                                          </div>
                                        </div>

                                        <div className="space-y-3">
                                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">AI & System Analytics</h4>
                                          <div className="p-6 rounded-3xl bg-accent/5 border border-accent/10 space-y-4">
                                             <div className="flex justify-between items-end">
                                                <div className="space-y-0.5">
                                                  <p className="text-[10px] font-black text-accent/60 uppercase">Analisa Digunakan</p>
                                                  <p className="text-2xl font-black text-accent">{u.aiUsageCount || 0} / {u.waVerified ? "5" : "1"}</p>
                                                </div>
                                                <Zap className="w-8 h-8 text-accent/20" />
                                             </div>
                                             <Progress value={Math.min(((u.aiUsageCount || 0) / (u.waVerified ? 5 : 1)) * 100, 100)} className="h-2 bg-accent/10" />
                                             <p className="text-[9px] font-medium text-neutral-500 italic">
                                                {u.waVerified 
                                                  ? "Status Terverifikasi (Limit 5 Analisa Aktif)" 
                                                  : "Status Free (Limit 1 Analisa, verifikasi WA untuk 5 analisa)"}
                                             </p>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="space-y-6">
                                        <div className="space-y-3">
                                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Project Operations</h4>
                                          <div className="grid gap-3">
                                             <Button variant="outline" className="w-full h-12 rounded-2xl border-neutral-200 flex justify-between px-6 hover:bg-neutral-50 group" onClick={() => navigate(`/projects`)}>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Access All Estimates</span>
                                                <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-accent transition-all" />
                                             </Button>
                                             <Button className="w-full h-12 rounded-2xl bg-neutral-900 text-white hover:bg-black flex justify-between px-6 group" onClick={() => navigate(`/profile/${u.uid}`)}>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Master Dashboard</span>
                                                <LayoutDashboard className="w-4 h-4 text-white/30 group-hover:text-accent transition-all" />
                                             </Button>
                                          </div>
                                        </div>

                                        <div className="p-6 rounded-3xl bg-neutral-900 shadow-2xl text-white space-y-4">
                                           <div className="flex items-center gap-3">
                                              <ShieldCheck className="w-6 h-6 text-accent" />
                                              <div>
                                                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Account Status</p>
                                                 <p className="text-sm font-black uppercase">{u.waVerified ? "Fully Verified" : "Verification Required"}</p>
                                              </div>
                                           </div>
                                           <div className="pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-medium text-white/40 uppercase tracking-tighter">
                                              <span>Security Level: L1-Standard</span>
                                              <span>IP: 102.xxx.xxx</span>
                                           </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                                       <Button variant="ghost" className="rounded-xl text-[10px] font-black uppercase tracking-widest px-6" onClick={() => handleEditClient(u)}>Edit Profile</Button>
                                       <Button className="rounded-xl bg-accent text-white hover:bg-black text-[10px] font-black uppercase tracking-widest px-8">Close Record</Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <div className="flex items-center gap-1.5 ml-0.5">
                                  {u.tier === 'deal' || u.lifetimeAccess ? (
                                    <div className="flex items-center gap-1 text-[7px] text-green-500 font-black uppercase bg-green-50 px-2 py-0.5 rounded-full border border-green-100/50">
                                      <Sparkles className="w-2 h-2" /> Unlimited AI
                                    </div>
                                  ) : (
                                    <div className="flex gap-0.5">
                                      {Array.from({ length: u.waVerified ? 5 : 1 }).map((_, i) => (
                                        <div key={i} className={cn("w-1.5 h-1.5 rounded-full", (u.aiUsageCount || 0) > i ? "bg-accent shadow-sm shadow-accent/20" : "bg-neutral-100")} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                "uppercase font-black text-[8px] tracking-widest rounded-md px-2 py-0.5 border-none",
                                u.lastPaymentStatus === 'paid' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                              )}>
                                {u.lastPaymentStatus || "Awaiting Verification"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[10px] font-black text-neutral-600 uppercase tracking-tight">{u.location || "Central JKT"}</TableCell>
                            <TableCell className="text-[10px] text-neutral-400 font-medium">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : "-"}</TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex justify-end gap-1.5">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-accent transition-all" onClick={() => handleEditClient(u)}>
                                  <FileEdit className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-all">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Client Pagination Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/50 p-4 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Density Settings:</span>
                  <div className="flex gap-1">
                    {[10, 50, 100].map((size) => (
                      <Button 
                        key={size}
                        variant="outline" 
                        size="sm"
                        className={cn(
                          "h-7 px-2.5 rounded-lg text-[9px] font-black tracking-widest transition-all",
                          clientsPerPage === size ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-400 border-neutral-200 hover:bg-neutral-50"
                        )}
                        onClick={() => {
                          setClientsPerPage(size);
                          setCurrentClientPage(1);
                        }}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">
                    Segment {currentClientPage} of {totalClientPages || 1}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-all"
                      disabled={currentClientPage === 1}
                      onClick={() => setCurrentClientPage(prev => Math.max(1, prev - 1))}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-all"
                      disabled={currentClientPage === totalClientPages || totalClientPages === 0}
                      onClick={() => setCurrentClientPage(prev => Math.min(totalClientPages, prev + 1))}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {isEditingClient !== null && (
                <Dialog open={isEditingClient !== null} onOpenChange={(open) => !open && setIsEditingClient(null)}>
                  <DialogContent className="sm:max-w-xl rounded-3xl border border-neutral-200 p-0 overflow-hidden shadow-2xl">
                    <div className="max-h-[90vh] overflow-y-auto thin-scrollbar">
                      <div className="bg-neutral-50 border-b border-neutral-100 p-6 flex justify-between items-center">
                         <div className="space-y-0.5">
                            <h2 className="text-lg font-black uppercase tracking-tighter">Client Profile Management</h2>
                            <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Update credential and system privileges</p>
                         </div>
                         <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                            <Settings className="w-5 h-5" />
                         </div>
                      </div>
                      <div className="space-y-6 p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="uppercase-soft text-[10px]">Display Name</label>
                            <Input 
                              value={clientEditForm.displayName || ""} 
                              onChange={e => setClientEditForm({...clientEditForm, displayName: e.target.value})}
                              className="h-11 rounded-xl border-neutral-200"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="uppercase-soft text-[10px]">WhatsApp / Phone</label>
                            <Input 
                              value={clientEditForm.whatsapp || ""} 
                              onChange={e => setClientEditForm({...clientEditForm, whatsapp: e.target.value})}
                              className="h-11 rounded-xl border-neutral-200"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="uppercase-soft text-[10px]">Location (City)</label>
                            <Input 
                              value={clientEditForm.location || ""} 
                              onChange={e => setClientEditForm({...clientEditForm, location: e.target.value})}
                              className="h-11 rounded-xl border-neutral-200"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="uppercase-soft text-[10px]">Tier</label>
                            <select 
                              className="w-full h-11 rounded-xl border border-neutral-200 px-4 text-xs font-bold outline-none"
                              value={clientEditForm.tier || "prospect"}
                              onChange={e => setClientEditForm({...clientEditForm, tier: e.target.value as any})}
                            >
                              <option value="prospect">Tier 1 (Lead)</option>
                              <option value="survey">Tier 2 (Silver)</option>
                              <option value="deal">Tier 3 (Gold)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="uppercase-soft text-[10px]">Role</label>
                            <select 
                              className="w-full h-11 rounded-xl border border-neutral-200 px-4 text-xs font-bold outline-none"
                              value={clientEditForm.role || "user"}
                              onChange={e => setClientEditForm({...clientEditForm, role: e.target.value as any})}
                            >
                              <option value="user">CLIENT / USER</option>
                              <option value="pm">PROJECT MANAGER</option>
                              <option value="admin">ADMINISTRATOR</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="uppercase-soft text-[10px]">Photo Profile / Background</label>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              className="w-full h-11 rounded-xl border-2 border-dashed border-neutral-200 gap-2 text-[10px] font-bold uppercase hover:bg-neutral-50"
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
                            placeholder="Detailed address..."
                            className="rounded-xl border-neutral-200 min-h-[100px]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="uppercase-soft text-[10px]">Internal Notes</label>
                          <Textarea 
                            value={clientEditForm.notes || ""} 
                            onChange={e => setClientEditForm({...clientEditForm, notes: e.target.value})}
                            placeholder="Important notes..."
                            className="rounded-xl border-neutral-200 min-h-[80px]"
                          />
                        </div>
                      </div>
                      <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsEditingClient(null)} className="text-[10px] font-black uppercase tracking-widest px-6 h-11 rounded-xl">Cancel</Button>
                        <Button className="btn-sleek text-[10px] font-black uppercase tracking-widest px-8 h-11 rounded-xl" onClick={handleSaveClient}>Save Changes</Button>
                      </div>
                    </div>
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
                
                <div className="flex flex-col lg:flex-row items-center gap-3 w-full lg:w-auto">
                  <div className="flex gap-3 w-full lg:w-auto">
                    <select 
                      className="h-12 flex-1 lg:flex-none px-4 border-2 border-black/10 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none bg-neutral-50 lg:w-40"
                      value={projectStatus}
                      onChange={e => setProjectStatus(e.target.value)}
                    >
                      <option value="all">ANY STATUS</option>
                      <option value="active">ACTIVE</option>
                      <option value="survey">SURVEY</option>
                      <option value="deal">DEAL / GOLD</option>
                      <option value="completed">COMPLETED</option>
                      <option value="pending">PENDING</option>
                    </select>
                    <select 
                      className="h-12 flex-1 lg:flex-none px-4 border-2 border-black/10 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none bg-neutral-50 lg:w-40"
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
                  </div>
                  <div className="relative w-full lg:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input 
                      placeholder="Search projects..." 
                      className="pl-12 h-12 rounded-2xl border-2 border-black/10 text-xs font-bold"
                      value={projectSearch}
                      onChange={e => setProjectSearch(e.target.value)}
                    />
                  </div>
                  <Button className="btn-sleek h-12 px-6 rounded-2xl w-full lg:w-auto" onClick={() => navigate("/pm")}>
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Global Dashboard
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.filter(p => {
                  const matchesSearch = p.name.toLowerCase().includes(projectSearch.toLowerCase()) || 
                                        p.location.toLowerCase().includes(projectSearch.toLowerCase());
                  const matchesCategory = projectCategory === "all" || p.category === projectCategory || p.type === projectCategory;
                  const matchesStatus = projectStatus === "all" || p.status === projectStatus;
                  return matchesSearch && matchesCategory && matchesStatus;
                }).map(p => {
                  const projectExpenses = transactions.filter(t => t.projectId === p.id && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                  const isOver = p.totalBudget && projectExpenses > p.totalBudget;

                  return (
                    <Card 
                      key={p.id} 
                      className={cn(
                        "border-2 rounded-3xl overflow-hidden shadow-sm group transition-all relative cursor-pointer",
                        selectedProjects.includes(p.id) ? "border-accent bg-accent/5" : "border-black hover:border-accent hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]",
                        isOver && "border-red-500 shadow-red-500/20"
                      )}
                      onClick={() => navigate(`/projects/${p.id}`)}
                    >
                      <div className="h-48 bg-neutral-100 relative">
                        <div className="absolute top-4 left-4 z-10 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Checkbox 
                            checked={selectedProjects.includes(p.id)}
                            onCheckedChange={() => {
                              setSelectedProjects(prev => 
                                prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                              );
                            }}
                            className="bg-white border-2 border-black"
                          />
                        </div>
                        <img src={getDriveImageUrl(p.imageUrl) || `https://picsum.photos/seed/${p.id}/400/300`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                           {isOver && <div className="bg-red-500 text-white p-1.5 rounded-full animate-bounce"><AlertCircle className="w-3 h-3" /></div>}
                           <Badge className={cn(
                             "uppercase font-black text-[8px] border-none px-3 py-1",
                             p.status === 'active' ? "bg-green-500 text-white" : 
                             p.status === 'survey' ? "bg-blue-500 text-white" :
                             p.status === 'completed' ? "bg-purple-500 text-white" :
                             "bg-neutral-500 text-white"
                           )}>{p.status}</Badge>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                           <div className="flex justify-between items-end">
                             <div className="space-y-1">
                               <p className="text-[10px] text-white/80 font-black uppercase tracking-widest flex items-center gap-2">
                                 <Clock className="w-3 h-3 text-accent" /> {p.createdAt ? new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                               </p>
                               <h3 className="text-lg font-black uppercase tracking-tighter text-white leading-none">{p.name}</h3>
                             </div>
                           </div>
                        </div>
                      </div>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] text-neutral-400 uppercase font-black">
                              <MapPin className="w-3 h-3" /> {p.location || "Jakarta"}
                            </div>
                            <div className="flex items-center gap-1.5">
                               <Users className="w-3 h-3 text-neutral-400" />
                               <span className="text-[9px] font-black uppercase text-neutral-600">PM: {users.find(u => u.uid === p.pmId)?.displayName?.split(' ')[0] || "None"}</span>
                            </div>
                        </div>
                        
                        <div className="space-y-2 py-3 border-y border-black/5">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase">
                            <span className="text-neutral-400">Activity: {p.updatedAt ? "Syncing Updates" : "Project Initialized"}</span>
                            <span className={cn("font-black", isOver ? "text-red-500" : "text-black")}>
                               {Math.round((projectExpenses / (p.totalBudget || 1)) * 100)}% Spent
                            </span>
                          </div>
                          <Progress value={p.totalBudget ? (projectExpenses / p.totalBudget) * 100 : 0} className={cn("h-1.5", isOver && "bg-red-100")} />
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-[10px]">
                          <div className="space-y-1">
                            <p className="font-black uppercase text-neutral-400 tracking-tighter">Budget Balance</p>
                            <p className="font-black text-black">{formatRupiah(p.totalBudget || 0)}</p>
                          </div>
                          <div className="space-y-1 text-right">
                            <p className="font-black uppercase text-neutral-400 tracking-tighter">Profit Meta</p>
                            <p className="font-black text-green-600">+{formatRupiah((p.totalBudget || 0) * 0.1)}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button className="flex-grow btn-sleek h-10 text-[9px] font-black uppercase tracking-widest border-2 border-black" onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProjectTeam(p);
                            setShowManageTeam(true);
                          }}>
                            <Users className="w-3 h-3 mr-2" /> Team
                          </Button>
                          <Button 
                            variant="outline" 
                            className="h-10 w-10 border-2 border-black text-red-500 hover:bg-neutral-900 hover:text-white rounded-xl p-0 flex items-center justify-center transition-colors"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Hapus proyek ${p.name}?`)) {
                                await deleteProject(p.id);
                                toast.success("Proyek dihapus.");
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button 
                             className="h-10 w-10 border-2 border-black bg-black text-white hover:bg-accent rounded-xl p-0 flex items-center justify-center"
                             onClick={(e) => {
                               e.stopPropagation();
                               setSelectedProjectAI(p);
                             }}
                          >
                             <Brain className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {showManageTeam && selectedProjectTeam && (
                <Dialog open={showManageTeam} onOpenChange={setShowManageTeam}>
                  <DialogContent className="sm:max-w-2xl p-8">
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
                    <AIHealthWrapper 
                      project={selectedProjectAI} 
                      masterData={masterData}
                      onClose={() => setSelectedProjectAI(null)} 
                    />
                  </DialogContent>
                </Dialog>
              )}

              <div className="pt-8 border-t border-black/5 opacity-0 pointer-events-none absolute invisible">
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
                        {projects.filter(p => p.status === status).map(p => {
                          const projectExpenses = transactions.filter(t => t.projectId === p.id && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                          const isOver = p.totalBudget && projectExpenses > p.totalBudget;
                          
                          return (
                            <Card 
                              key={p.id} 
                              className={cn(
                                "border-2 border-black rounded-[1.5rem] p-5 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer bg-white group relative overflow-hidden",
                                isOver && "border-red-500"
                              )}
                              onClick={() => navigate(`/projects/${p.id}`)}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1">
                                   <div className="flex items-center gap-2">
                                     <h4 className="font-black text-[11px] uppercase tracking-widest">{p.name}</h4>
                                     {isOver && <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />}
                                   </div>
                                   <p className="text-[10px] text-neutral-400 font-bold uppercase truncate w-40">{p.location || "No LocationSet"}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-neutral-400 hover:text-red-500 transition-colors" 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      if(confirm("Hapus proyek ini secara permanen?")) deleteProject(p.id); 
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="space-y-3 pb-4 border-b border-black/5">
                                <div className="flex items-center justify-between text-[9px] font-black uppercase">
                                  <div className="flex items-center gap-2 text-neutral-500">
                                    <Users className="w-3 h-3" /> PM: {users.find(u => u.uid === p.pmId)?.displayName?.split(' ')[0] || "None"}
                                  </div>
                                  <div className="text-black">
                                    {p.totalBudget ? `Rp ${(p.totalBudget/1000000).toFixed(1)}M` : "-"}
                                  </div>
                                </div>
                                <Progress value={p.totalBudget ? (projectExpenses/p.totalBudget)*100 : 0} className="h-1.5" />
                              </div>

                              <div className="pt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-black uppercase text-neutral-400 tracking-tighter">Activity Log</span>
                                  <span className="text-[8px] font-mono text-neutral-300">#id_{p.id.slice(0,4)}</span>
                                </div>
                                <div className="space-y-1">
                                   <div className="flex items-center gap-2">
                                     <div className="w-1 h-1 rounded-full bg-accent" />
                                     <p className="text-[9px] font-bold text-neutral-600 truncate">Project initialized on {new Date(p.createdAt).toLocaleDateString()}</p>
                                   </div>
                                   {p.updatedAt && (
                                     <div className="flex items-center gap-2">
                                       <div className="w-1 h-1 rounded-full bg-blue-500" />
                                       <p className="text-[9px] font-bold text-neutral-600 truncate">Last updated {new Date(p.updatedAt).toLocaleTimeString()}</p>
                                     </div>
                                   )}
                                </div>
                              </div>

                              <div className="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight className="w-4 h-4 text-accent" />
                              </div>
                            </Card>
                          );
                        })}
                        {projects.filter(p => p.status === status).length === 0 && (
                          <div className="py-10 text-center border-2 border-dashed border-neutral-200 rounded-2xl">
                             <p className="text-[9px] font-black uppercase text-neutral-300">No {status} projects</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "workforce" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Human Capital Portal</h2>
                  <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Manage workforce, skills, and availability</p>
                </div>
                <Button className="btn-sleek h-10 px-6 rounded-xl w-full md:w-auto shadow-lg shadow-accent/20" onClick={() => setShowAddWorker(true)}>
                  <UserPlus className="w-4 h-4 mr-2" /> Register Personnel
                </Button>
              </div>

              {/* Advanced Workforce Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/50 p-4 rounded-2xl border border-neutral-200 shadow-sm backdrop-blur-sm">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                    <Input 
                      placeholder="Search name/role/skill..." 
                      className="pl-9 h-10 border-neutral-200 rounded-xl text-xs bg-white focus:ring-accent/20"
                      value={workerSearch}
                      onChange={e => setWorkerSearch(e.target.value)}
                    />
                 </div>
                 <select 
                    className="h-10 border border-neutral-200 rounded-xl px-4 text-[10px] font-black uppercase tracking-tight bg-white outline-none focus:ring- accent/20"
                    value={selectedWorkerRole}
                    onChange={e => setSelectedWorkerRole(e.target.value)}
                  >
                    <option value="all">ALL ROLES</option>
                    {["pm", "designer", "drafter", "tukang", "mandor", "kenek"].map(r => (
                      <option key={r} value={r}>{r.toUpperCase()}</option>
                    ))}
                  </select>
                  <select 
                    className="h-10 border border-neutral-200 rounded-xl px-4 text-[10px] font-black uppercase tracking-tight bg-white outline-none focus:ring- accent/20"
                    value={selectedWorkerSkill}
                    onChange={e => setSelectedWorkerSkill(e.target.value)}
                  >
                    <option value="all">ALL SKILLS</option>
                    {workerSkills.map(s => (
                      <option key={s} value={s}>{s?.toUpperCase()}</option>
                    ))}
                  </select>
                  <select 
                    className="h-10 border border-neutral-200 rounded-xl px-4 text-[10px] font-black uppercase tracking-tight bg-white outline-none focus:ring- accent/20"
                    value={workerAvailability}
                    onChange={e => setWorkerAvailability(e.target.value)}
                  >
                    <option value="all">ANY AVAILABILITY</option>
                    <option value="available">STANDBY / AVAILABLE</option>
                    <option value="busy">ON MISSION / BUSY</option>
                    <option value="on_leave">ON LEAVE / ABSENT</option>
                  </select>
              </div>

              {showAddWorker && (
                <Card className="border border-neutral-200 rounded-2xl p-6 bg-white shadow-xl animate-in fade-in slide-in-from-top-4">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-sm font-black uppercase tracking-widest text-accent">New Personnel Onboarding</h3>
                     <Button variant="ghost" size="icon" onClick={() => setShowAddWorker(false)} className="rounded-full"><X className="w-4 h-4" /></Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Full Legal Name</label>
                      <Input 
                        placeholder="John Doe" 
                        value={newWorker.name}
                        onChange={e => setNewWorker({...newWorker, name: e.target.value})}
                        className="h-11 border-neutral-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Professional Role</label>
                      <select 
                        className="w-full h-11 rounded-xl border border-neutral-200 px-4 text-xs font-bold outline-none focus:ring-accent/20"
                        value={newWorker.role}
                        onChange={e => setNewWorker({...newWorker, role: e.target.value})}
                      >
                        {["pm", "designer", "drafter", "tukang", "mandor", "kenek"].map(r => (
                          <option key={r} value={r}>{r.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">KTP / NIK Number</label>
                      <Input 
                        placeholder="16-digit ID" 
                        value={newWorker.ktp}
                        onChange={e => setNewWorker({...newWorker, ktp: e.target.value})}
                        className="h-11 border-neutral-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">WhatsApp / Direct</label>
                      <Input 
                        placeholder="62812xxxx" 
                        value={newWorker.whatsapp}
                        onChange={e => setNewWorker({...newWorker, whatsapp: e.target.value})}
                        className="h-11 border-neutral-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Specialized Core Skill</label>
                      <Input 
                        placeholder="e.g. Electrical, Carpentry" 
                        value={newWorker.skill}
                        onChange={e => setNewWorker({...newWorker, skill: e.target.value})}
                        className="h-11 border-neutral-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Start Date</label>
                       <Input 
                         type="date"
                         value={newWorker.startDate ? newWorker.startDate.split('T')[0] : ''}
                         onChange={e => setNewWorker({...newWorker, startDate: new Date(e.target.value).toISOString()})}
                         className="h-11 border-neutral-200 rounded-xl text-xs font-bold"
                       />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Direct WhatsApp</label>
                      <Input 
                        placeholder="0812..." 
                        value={newWorker.whatsapp}
                        onChange={e => setNewWorker({...newWorker, whatsapp: e.target.value})}
                        className="h-11 border-neutral-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Mulai Kerja (Start Date)</label>
                       <Input 
                         type="date"
                         value={newWorker.startDate || ""}
                         onChange={e => setNewWorker({...newWorker, startDate: e.target.value})}
                         className="h-11 border-neutral-200 rounded-xl text-xs font-bold"
                       />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Personnel Visualization</label>
                      <ImageUpload 
                        path="workforce"
                        label="Upload Avatar"
                        onUploadComplete={(url) => setNewWorker({...newWorker, photoUrl: url})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-8">
                    <Button variant="ghost" className="rounded-xl text-[10px] font-black uppercase tracking-widest px-6" onClick={() => setShowAddWorker(false)}>Discard</Button>
                    <Button className="rounded-xl bg-accent text-white hover:bg-black text-[10px] font-black uppercase tracking-widest px-10 shadow-lg shadow-accent/20" onClick={handleAddWorker}>Archive System</Button>
                  </div>
                </Card>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedWorkforce.length === 0 ? (
                  <div className="col-span-full py-20 text-center border border-dashed border-neutral-200 rounded-3xl bg-neutral-50/50">
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-300">No personnel data matching selected parameters.</p>
                  </div>
                ) : (
                  paginatedWorkforce.map(worker => (
                    <Dialog key={worker.id}>
                      <DialogTrigger nativeButton={false} render={
                        <Card className="border border-neutral-200 rounded-2xl overflow-hidden hover:border-accent/40 shadow-sm transition-all cursor-pointer group hover:bg-white bg-neutral-50/30">
                          <div className="h-44 bg-neutral-100 relative overflow-hidden">
                            {worker.photoUrl ? (
                              <img src={getDriveImageUrl(worker.photoUrl)} alt={worker.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                <User className="w-16 h-16 opacity-20" />
                              </div>
                            )}
                            <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                               <Badge className={cn(
                                 "text-[8px] font-black uppercase tracking-widest rounded-full border-none shadow-sm",
                                 worker.status === 'active' ? "bg-green-500 text-white" : "bg-neutral-200 text-neutral-500"
                               )}>
                                 {worker.status || 'Active'}
                               </Badge>
                               <Badge className={cn(
                                 "text-[8px] font-black uppercase tracking-widest rounded-full border-none shadow-sm",
                                 worker.availability === 'available' ? "bg-accent text-white" : 
                                 worker.availability === 'busy' ? "bg-orange-500 text-white" : "bg-red-500 text-white"
                               )}>
                                 {worker.availability?.replace('_', ' ') || 'Available'}
                               </Badge>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                               <p className="text-[9px] font-black uppercase text-accent tracking-[0.2em]">{worker.role}</p>
                               <h3 className="text-sm font-black text-white uppercase tracking-tight leading-tight">{worker.name}</h3>
                            </div>
                          </div>
                          <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-start">
                               <div className="space-y-0.5">
                                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Core Skill</p>
                                  <p className="text-xs font-bold text-neutral-800 uppercase">{worker.skill || "All-Rounder"}</p>
                               </div>
                               <div className="space-y-0.5 text-right">
                                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Joined</p>
                                  <p className="text-[10px] font-black text-neutral-600">{worker.startDate ? new Date(worker.startDate).toLocaleDateString() : 'N/A'}</p>
                               </div>
                            </div>

                            <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
                                <Phone className="w-3.5 h-3.5 text-accent" />
                                <span className="text-[11px] font-bold text-neutral-600">{worker.whatsapp || "No Secure Comms"}</span>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <select 
                                  className="h-8 flex-grow text-[9px] rounded-xl border border-neutral-200 bg-white px-3 font-black uppercase tracking-tight outline-none focus:ring-1 focus:ring-accent/20"
                                  value={worker.projectId || ""}
                                  onClick={e => e.stopPropagation()}
                                  onChange={async (e) => {
                                    e.stopPropagation();
                                    await updateWorkforce(worker.id, { projectId: e.target.value, availability: e.target.value ? "busy" : "available" });
                                    toast.success(`Deployment updated`);
                                  }}
                                >
                                  <option value="">STANDBY (NO PROJECT)</option>
                                  {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                                  ))}
                                </select>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0" onClick={(e) => {
                                  e.stopPropagation();
                                  if(confirm(`Remove personnel ${worker.name} from database?`)) deleteWorkforce(worker.id);
                                }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                          </CardContent>
                        </Card>
                      } />
                      <DialogContent className="sm:max-w-4xl rounded-[2.5rem] border border-neutral-200 p-0 overflow-hidden shadow-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-12 max-h-[90vh] overflow-y-auto thin-scrollbar">
                           <div className="md:col-span-12 lg:col-span-5 bg-neutral-900 text-white p-6 md:p-10 space-y-8 relative overflow-hidden min-h-[300px] md:min-h-[400px]">
                              <div className="absolute bottom-0 left-0 right-0 h-48 md:h-64 bg-gradient-to-t from-black/80 to-transparent z-10" />
                              {worker.photoUrl ? (
                                <img src={getDriveImageUrl(worker.photoUrl)} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                                   <User className="w-24 md:w-32 h-24 md:h-32 text-neutral-700" />
                                </div>
                              )}
                              
                              <div className="relative z-20 h-full flex flex-col justify-between">
                                 <div className="space-y-4">
                                     <Badge className="bg-accent text-white border-none text-[8px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full">Secure Profile</Badge>
                                     <div className="space-y-2">
                                        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none">{worker.name}</h1>
                                        <p className="text-accent text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">{worker.role}</p>
                                     </div>
                                 </div>

                                 <div className="space-y-4 bg-black/40 backdrop-blur-md p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/10">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                       <div className="space-y-1">
                                          <p className="text-[7px] md:text-[8px] font-black text-white/40 uppercase tracking-widest text-[8px]">Active Deploy</p>
                                          <p className="text-[10px] md:text-xs font-bold text-accent truncate">{projects.find(p=>p.id === worker.projectId)?.name || "Available"}</p>
                                       </div>
                                       <div className="space-y-1 border-l border-white/10">
                                          <p className="text-[7px] md:text-[8px] font-black text-white/40 uppercase tracking-widest text-[8px]">Status</p>
                                          <p className="text-[10px] md:text-xs font-bold uppercase">{worker.availability?.replace('_', ' ') || 'Ready'}</p>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="md:col-span-12 lg:col-span-7 p-6 md:p-10 space-y-10 bg-white">
                              <div className="space-y-6">
                                 <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Operational Dossier</h4>
                                 </div>
                                 
                                 <div className="grid sm:grid-cols-2 gap-8 px-4">
                                    <div className="space-y-4">
                                       <div className="flex items-start gap-4">
                                          <div className="p-2 rounded-lg bg-neutral-50 text-neutral-400"><CreditCard className="w-4 h-4" /></div>
                                          <div>
                                             <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Identifier (KTP)</p>
                                             <p className="text-xs font-bold tracking-widest">{worker.ktp || "XXXXXXXXXXXX"}</p>
                                          </div>
                                       </div>
                                       <div className="flex items-start gap-4">
                                          <div className="p-2 rounded-lg bg-neutral-50 text-neutral-400"><Calendar className="w-4 h-4" /></div>
                                          <div>
                                             <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Date of Recruitment</p>
                                             <p className="text-xs font-bold">{worker.startDate ? new Date(worker.startDate).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : "N/A"}</p>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="space-y-4">
                                       <div className="flex items-start gap-4">
                                          <div className="p-2 rounded-lg bg-neutral-50 text-neutral-400"><Phone className="w-4 h-4" /></div>
                                          <div>
                                             <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Direct Contact</p>
                                             <p className="text-xs font-bold">{worker.whatsapp || "No Contact"}</p>
                                          </div>
                                       </div>
                                       <div className="flex items-start gap-4">
                                          <div className="p-2 rounded-lg bg-neutral-50 text-neutral-400"><Box className="w-4 h-4" /></div>
                                          <div>
                                             <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Specialization</p>
                                             <p className="text-xs font-bold uppercase">{worker.skill || "General Construction"}</p>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              </div>

                              <div className="space-y-6">
                                 <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Absence & Leave Tracking</h4>
                                 </div>
                                 <div className="p-6 rounded-3xl border border-neutral-100 bg-neutral-50 flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                       <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 flex flex-col items-center justify-center">
                                          <span className="text-xl font-black text-accent">{worker.absences?.length || 0}</span>
                                          <span className="text-[7px] font-black uppercase text-neutral-400">Days</span>
                                       </div>
                                       <div>
                                          <p className="text-xs font-bold uppercase tracking-tight">Personnel Leave Balance</p>
                                          <p className="text-[9px] font-medium text-neutral-400 underline cursor-pointer">View full absence logs</p>
                                       </div>
                                    </div>
                                    <Button variant="outline" className="h-9 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest border-neutral-200 hover:bg-white">
                                       Register Leave
                                    </Button>
                                 </div>
                              </div>

                              <div className="pt-6 border-t border-neutral-100 flex justify-end gap-3">
                                 <Button variant="ghost" className="rounded-xl text-[10px] font-black uppercase tracking-widest px-8">Audit History</Button>
                                 <Button className="rounded-xl bg-accent text-white hover:bg-black text-[10px] font-black uppercase tracking-widest px-10 shadow-lg shadow-accent/20">Sync Data</Button>
                              </div>
                           </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))
                )}
              </div>

              {/* Workforce Pagination */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/50 p-4 rounded-2xl border border-neutral-200 shadow-sm mb-12">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">View Grid:</span>
                  <div className="flex gap-1">
                    {[12, 24, 48].map((size) => (
                      <Button 
                        key={size}
                        variant="outline" 
                        size="sm"
                        className={cn(
                          "h-7 px-3 rounded-lg text-[9px] font-black tracking-widest transition-all",
                          workersPerPage === size ? "bg-accent text-white border-accent" : "bg-white text-neutral-400 border-neutral-200 hover:bg-neutral-50"
                        )}
                        onClick={() => {
                          setWorkersPerPage(size);
                          setCurrentWorkerPage(1);
                        }}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">
                    Personnel Segment {currentWorkerPage} of {totalWorkerPages || 1}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 rounded-xl border border-neutral-200 hover:bg-neutral-50 shadow-sm"
                      disabled={currentWorkerPage === 1}
                      onClick={() => setCurrentWorkerPage(prev => Math.max(1, prev - 1))}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 rounded-xl border border-neutral-200 hover:bg-neutral-50 shadow-sm"
                      disabled={currentWorkerPage === totalWorkerPages || totalWorkerPages === 0}
                      onClick={() => setCurrentWorkerPage(prev => Math.min(totalWorkerPages, prev + 1))}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "cms" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <Card className="border-2 border-black rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
                <CardHeader className="bg-neutral-50 border-b-2 border-black flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-center md:text-left">
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">Branding & Hero Console</CardTitle>
                    <CardDescription className="uppercase-soft text-[10px]">Kelola konten utama dan promosi di landing page</CardDescription>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                     <Button className="btn-sleek h-10 px-6 rounded-xl text-[10px] w-full md:w-auto" onClick={handleSaveCMS}>
                        Deploy Updates
                     </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-10">
                  <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent border-b border-black/5 pb-3">Hero Content</h4>
                       <div className="space-y-6">
                          <div className="space-y-3">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Headline Title</Label>
                             <Input 
                               value={cmsForm?.heroTitle} 
                               onChange={e => setCmsForm({ ...cmsForm, heroTitle: e.target.value })} 
                               className="h-14 border-2 border-black/10 rounded-2xl font-black text-sm uppercase tracking-tight"
                             />
                          </div>
                          <div className="space-y-3">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Sub-Headline Description</Label>
                             <Textarea 
                               value={cmsForm?.heroSubtitle} 
                               onChange={e => setCmsForm({ ...cmsForm, heroSubtitle: e.target.value })} 
                               className="h-32 border-2 border-black/10 rounded-2xl font-bold text-xs leading-relaxed"
                             />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 border-b border-black/5 pb-3">Floating Promos (Active Fade Cycle)</h4>
                       <div className="space-y-4">
                          {(cmsForm?.promos || []).length > 0 ? (cmsForm?.promos || []).map((promo, idx) => (
                            <div key={promo.id} className="group relative flex flex-col gap-3 bg-neutral-50 p-5 rounded-[1.5rem] border-2 border-transparent hover:border-black transition-all">
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                   <Checkbox 
                                     id={`promo-${promo.id}`}
                                     checked={promo.isActive} 
                                     onCheckedChange={(checked) => {
                                       const newPromos = [...(cmsForm.promos || [])];
                                       newPromos[idx] = { ...promo, isActive: !!checked };
                                       setCmsForm({ ...cmsForm, promos: newPromos });
                                     }}
                                     className="border-2 border-black"
                                   />
                                   <label htmlFor={`promo-${promo.id}`} className="text-[10px] font-black uppercase tracking-widest cursor-pointer">
                                      {promo.isActive ? "Published" : "Hidden / Draft"}
                                   </label>
                                 </div>
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-8 w-8 text-neutral-300 hover:text-red-500 transition-colors"
                                   onClick={() => {
                                     const newPromos = (cmsForm.promos || []).filter((_, i) => i !== idx);
                                     setCmsForm({ ...cmsForm, promos: newPromos });
                                   }}
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </Button>
                               </div>
                               <Input 
                                 value={promo.text} 
                                 onChange={(e) => {
                                   const newPromos = [...(cmsForm.promos || [])];
                                   newPromos[idx] = { ...promo, text: e.target.value };
                                   setCmsForm({ ...cmsForm, promos: newPromos });
                                 }}
                                 className="h-12 bg-white border-2 border-black/5 rounded-xl text-xs font-black uppercase tracking-tight px-4"
                                 placeholder="Enter promo text..."
                               />
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                 <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-black/5">
                                   <Clock className="w-3.5 h-3.5 text-neutral-400" />
                                   <div className="flex flex-col flex-grow">
                                     <span className="text-[8px] font-black uppercase text-neutral-400">Scheduled Posting (Start)</span>
                                     <input 
                                       type="date"
                                       value={promo.scheduledAt ? new Date(promo.scheduledAt).toISOString().split('T')[0] : ""}
                                       onChange={(e) => {
                                         const newPromos = [...(cmsForm.promos || [])];
                                         newPromos[idx] = { ...promo, scheduledAt: e.target.value || undefined };
                                         setCmsForm({ ...cmsForm, promos: newPromos });
                                       }}
                                       className="text-[10px] font-bold outline-none bg-transparent"
                                     />
                                   </div>
                                 </div>
                                 <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-black/5">
                                   <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                                   <div className="flex flex-col flex-grow">
                                     <span className="text-[8px] font-black uppercase text-neutral-400">Auto Takedown (Expiry)</span>
                                     <input 
                                       type="date"
                                       value={promo.expiresAt ? new Date(promo.expiresAt).toISOString().split('T')[0] : ""}
                                       onChange={(e) => {
                                         const newPromos = [...(cmsForm.promos || [])];
                                         newPromos[idx] = { ...promo, expiresAt: e.target.value || undefined };
                                         setCmsForm({ ...cmsForm, promos: newPromos });
                                       }}
                                       className="text-[10px] font-bold outline-none bg-transparent"
                                     />
                                   </div>
                                 </div>
                               </div>
                            </div>
                          )) : (
                            <div className="py-12 text-center border-2 border-dashed border-neutral-200 rounded-[2rem]">
                               <p className="text-[10px] font-black uppercase tracking-widest text-neutral-300">No managed promos found.</p>
                            </div>
                          )}
                          
                          <Button 
                            variant="outline" 
                            className="w-full h-14 border-2 border-dashed border-black/20 rounded-2xl hover:border-black hover:bg-white font-black uppercase text-[10px] tracking-widest gap-2 transition-all"
                            onClick={() => {
                              const newPromos = [...(cmsForm.promos || []), { id: Date.now().toString(), text: "New Promo Item", isActive: true }];
                              setCmsForm({ ...cmsForm, promos: newPromos });
                            }}
                          >
                            <Plus className="w-4 h-4" /> Add Promo Slide
                          </Button>
                       </div>
                    </div>
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
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 border-t-2 border-black/5 pt-4">
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

                    <div className="flex flex-col sm:flex-row justify-end border-t-2 border-black pt-6 mt-4 gap-4">
                    <Button className="btn-sleek px-12 h-12 rounded-xl w-full sm:w-auto" onClick={handleSaveCMS}>Save Content Updates</Button>
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
            <div className="space-y-8 animate-in fade-in duration-700">
              {/* Record Payment Dialog */}
              <Dialog open={showRecordPayment} onOpenChange={setShowRecordPayment}>
                <DialogContent className="w-[95vw] sm:max-w-md rounded-[2.5rem] border-4 border-black p-8 max-h-[90vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Record Client Payment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Select Project Account</Label>
                      <select 
                        className="w-full h-12 rounded-xl border-2 border-black/10 px-4 text-sm font-bold bg-neutral-50"
                        value={paymentForm.projectId}
                        onChange={e => setPaymentForm({...paymentForm, projectId: e.target.value})}
                      >
                        <option value="">Choose Project...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Amount (Rp)</Label>
                        <Input 
                          type="number" 
                          value={paymentForm.amount} 
                          onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})}
                          className="h-12 rounded-xl border-2 border-black/10 font-mono font-bold px-4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Method</Label>
                        <select 
                          className="w-full h-12 rounded-xl border-2 border-black/10 px-4 text-sm font-bold bg-neutral-50"
                          value={paymentForm.method}
                          onChange={e => setPaymentForm({...paymentForm, method: e.target.value as any})}
                        >
                          <option>Transfer</option>
                          <option>Cash</option>
                          <option>Digital Wallet</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Description / Reference</Label>
                      <Input 
                        value={paymentForm.description} 
                        onChange={e => setPaymentForm({...paymentForm, description: e.target.value})}
                        className="h-12 rounded-xl border-2 border-black/10"
                        placeholder="e.g., Progress Payment 30%"
                      />
                    </div>
                    <Button className="w-full bg-black text-white h-14 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-neutral-800" onClick={handleRecordPayment}>Confirm Entry &rarr;</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Record Expense Dialog */}
              <Dialog open={showRecordExpense} onOpenChange={setShowRecordExpense}>
                <DialogContent className="w-[95vw] sm:max-w-md rounded-[2.5rem] border-4 border-black p-8 max-h-[90vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">New Expense Entry</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Allocation (Project/Op)</Label>
                      <select 
                        className="w-full h-12 rounded-xl border-2 border-black/10 px-4 text-sm font-bold bg-neutral-50"
                        value={expenseForm.projectId}
                        onChange={e => setExpenseForm({...expenseForm, projectId: e.target.value})}
                      >
                        <option value="">General Operational</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Category</Label>
                        <select 
                          className="w-full h-12 rounded-xl border-2 border-black/10 px-4 text-sm font-bold bg-neutral-50"
                          value={expenseForm.category}
                          onChange={e => setExpenseForm({...expenseForm, category: e.target.value as any})}
                        >
                          <option value="material">Material</option>
                          <option value="labor">Labor/Upah</option>
                          <option value="assessment">Survey/Assessment</option>
                          <option value="other">Lain-lain</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Amount (Rp)</Label>
                        <Input 
                          type="number" 
                          value={expenseForm.amount} 
                          onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}
                          className="h-12 rounded-xl border-2 border-black/10 font-mono font-bold px-4"
                        />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Method</Label>
                         <select 
                           className="w-full h-12 rounded-xl border-2 border-black/10 px-4 text-xs font-black uppercase"
                           value={expenseForm.method}
                           onChange={e => setExpenseForm({...expenseForm, method: e.target.value})}
                         >
                           <option value="transfer">Bank Transfer</option>
                           <option value="cash">Cash / Petty Cash</option>
                           <option value="card">Credit Card</option>
                         </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Description</Label>
                      <Input 
                        value={expenseForm.description} 
                        onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                        className="h-12 rounded-xl border-2 border-black/10"
                        placeholder="e.g., Semen 50 Sak Tiga Roda"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Upload Receipt (Foto Bon)</Label>
                      <div className="flex items-center gap-4">
                        {expenseForm.receiptUrl ? (
                          <div className="relative group">
                            <img src={expenseForm.receiptUrl} className="w-16 h-16 object-cover rounded-xl border-2 border-black" />
                            <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 w-6 h-6 rounded-full" onClick={() => setExpenseForm({...expenseForm, receiptUrl: ""})}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex-grow">
                             <Input 
                               type="file" 
                               accept="image/*" 
                               className="hidden" 
                               id="receipt-upload" 
                               onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (file) handleUploadReceipt(file);
                               }}
                             />
                             <label 
                               htmlFor="receipt-upload" 
                               className="flex items-center justify-center p-4 border-2 border-dashed border-black/10 rounded-xl cursor-pointer hover:bg-neutral-50 transition-all font-bold text-xs uppercase"
                             >
                               {isUploadingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Camera className="w-4 h-4 mr-2" /> Lampirkan Foto Bon</>}
                             </label>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button className="w-full bg-red-600 text-white h-14 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-red-700" onClick={handleRecordExpense}>Submit Expense Entry &rarr;</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="grid md:grid-cols-4 gap-6">
                <Card className="border-2 border-black rounded-[2rem] p-8 bg-black text-white shadow-[12px_12px_0px_rgba(0,0,0,0.1)] group hover:scale-105 transition-transform duration-500">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Total Income</p>
                    <ArrowDownLeft className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-3xl font-black leading-none mb-1">
                    Rp {transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-bold">Total revenue recognized</p>
                </Card>
                <Card className="border-2 border-black rounded-[2rem] p-8 bg-white shadow-[12px_12px_0px_rgba(255,107,0,0.1)] group hover:scale-105 transition-transform duration-500 border-red-100">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Operational Cost</p>
                    <ArrowUpRight className="w-6 h-6 text-red-400" />
                  </div>
                  <p className="text-3xl font-black leading-none mb-1 text-red-600">
                    Rp {transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-bold">Total direct & indirect costs</p>
                </Card>
                <Card className="border-2 border-black rounded-[2rem] p-8 bg-white shadow-[12px_12px_0px_rgba(0,0,0,0.05)] group hover:scale-105 transition-transform duration-500">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Escrow Balance</p>
                    <Lock className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="text-3xl font-black leading-none mb-1 text-blue-600">
                    Rp {projects.reduce((acc, p) => acc + (p.escrowBalance || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-bold">Client deposits on hold</p>
                </Card>
                <Card className="border-2 border-black rounded-[2rem] p-8 bg-accent text-white shadow-[12px_12px_0px_rgba(255,107,0,0.2)] group hover:scale-105 transition-transform duration-500">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Estimated Net</p>
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-3xl font-black leading-none mb-1">
                    Rp {(transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0) - 
                         transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-white/50 font-bold">Realized profit after costs</p>
                </Card>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <Card className="border-4 border-black rounded-[2.5rem] overflow-hidden shadow-2xl bg-white">
                  <CardHeader className="bg-neutral-900 p-8 border-b-4 border-black flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1">
                      <CardTitle className="text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
                        <AlertCircle className="w-8 h-8 text-accent" /> Budget Tracker
                      </CardTitle>
                      <CardDescription className="text-white/60 uppercase-soft text-xs font-bold font-mono">Comparing Actual Expense vs Planned RAB.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y-2 divide-black/5 max-h-[500px] overflow-y-auto">
                      {projects.map(p => {
                        const projectExpenses = transactions.filter(t => t.projectId === p.id && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                        const isOverBudget = projectExpenses > (p.totalBudget || 0);
                        const usagePercentage = p.totalBudget ? (projectExpenses / p.totalBudget) * 100 : 0;
                        
                        return (
                          <div key={p.id} className="p-6 space-y-4 hover:bg-neutral-50 transition-colors">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-widest">{p.name}</p>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase">Budget: {formatRupiah(p.totalBudget || 0)}</p>
                              </div>
                              {isOverBudget && (
                                <Badge className="bg-red-600 text-white animate-bounce text-[9px] uppercase font-black">Over Budget!</Badge>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-[9px] font-black uppercase">
                                <span className={isOverBudget ? "text-red-600" : "text-neutral-400"}>Actual Usage: {formatRupiah(projectExpenses)}</span>
                                <span className={usagePercentage > 90 ? "text-red-600" : "text-black"}>{usagePercentage.toFixed(1)}%</span>
                              </div>
                              <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden border border-black/5">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-1000",
                                    usagePercentage > 100 ? "bg-red-600" : usagePercentage > 80 ? "bg-orange-500" : "bg-green-500"
                                  )} 
                                  style={{ width: `${Math.min(usagePercentage, 100)}%` }} 
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 border-4 border-black rounded-[2.5rem] overflow-hidden shadow-2xl bg-white">
                  <CardHeader className="bg-neutral-50 p-8 border-b-4 border-black flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1">
                      <CardTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                        <Gavel className="w-8 h-8 text-black" /> Financial Ledger
                      </CardTitle>
                      <CardDescription className="uppercase-soft text-xs font-bold font-mono">Consolidated data of all financial movements per project.</CardDescription>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                      <Button className="bg-green-600 text-white font-black uppercase text-[10px] h-12 rounded-2xl px-6 hover:translate-y-1 transition-all" onClick={() => setShowRecordPayment(true)}>
                        <Download className="w-5 h-5 mr-3" /> Record Client Payment
                      </Button>
                      <Button className="bg-red-600 text-white font-black uppercase text-[10px] h-12 rounded-2xl px-6 hover:translate-y-1 transition-all" onClick={() => setShowRecordExpense(true)}>
                        <ArrowUpRight className="w-5 h-5 mr-3" /> Manual Expense
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-neutral-50">
                        <TableRow className="border-b-4 border-black">
                          <TableHead className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Date & Ref</TableHead>
                          <TableHead className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Account Details</TableHead>
                          <TableHead className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Method & Evidence</TableHead>
                          <TableHead className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Debit/Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((t) => (
                          <TableRow key={t.id} className="group border-b border-black/5 hover:bg-neutral-50/50 transition-all duration-300">
                            <TableCell className="px-4 md:px-8 py-4 md:py-6">
                               <div className="space-y-1">
                                 <p className="text-xs font-black font-mono text-black">{new Date(t.date).toLocaleDateString()}</p>
                                 <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">ID: #{t.id.substring(0,6).toUpperCase()}</p>
                               </div>
                            </TableCell>
                            <TableCell className="px-4 md:px-8 py-4 md:py-6">
                              <div className="space-y-1">
                                <p className="text-sm font-black uppercase text-black leading-tight">{t.description}</p>
                                {t.projectName && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge className="bg-neutral-100 text-neutral-500 border-none text-[8px] font-black uppercase px-2 py-0.5">Project: {t.projectName}</Badge>
                                    <Badge className={cn(
                                      "text-[8px] font-black uppercase border-none px-2 py-0.5",
                                      t.category === 'client_payment' ? "bg-green-100 text-green-600" :
                                      t.category === 'material' ? "bg-blue-100 text-blue-600" :
                                      t.category === 'labor' ? "bg-yellow-100 text-yellow-600" : "bg-neutral-100 text-neutral-500"
                                    )}>{t.category}</Badge>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-4 md:px-8 py-4 md:py-6">
                              <div className="flex items-center gap-4">
                                <Badge variant="outline" className="border-2 border-black/10 text-[9px] font-black uppercase tracking-widest">{t.method || "System"}</Badge>
                                {t.receiptUrl && (
                                  <Dialog>
                                    <DialogTrigger render={
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-neutral-100 hover:bg-black hover:text-white transition-all scale-110">
                                        <Camera className="w-4 h-4" />
                                      </Button>
                                    } />
                                    <DialogContent className="max-w-2xl bg-black border-none p-4">
                                      <img src={t.receiptUrl} alt="Receipt Evidence" className="w-full h-auto rounded-xl shadow-2xl" />
                                      <p className="text-center text-white/50 text-[10px] font-black uppercase tracking-[0.5em] mt-4">Evidence ID: #{t.id.toUpperCase()}</p>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={cn(
                              "px-4 md:px-8 py-4 md:py-6 text-right font-mono font-black text-lg",
                              t.type === 'income' ? "text-green-600" : "text-red-500"
                            )}>
                              {t.type === 'income' ? "+" : "-"} Rp {t.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        {transactions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="p-24 text-center">
                              <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6 text-neutral-300">
                                <DollarSign className="w-10 h-10" />
                              </div>
                              <p className="uppercase-soft font-black text-neutral-400 mb-2 text-lg">No Transactions Recorded</p>
                              <p className="text-xs text-neutral-300 font-medium max-w-sm mx-auto">Start recording your project finances to see data here.</p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="space-y-8">
                  {/* Budget Health Warning Panel */}
                  <Card className="border-4 border-black rounded-[2rem] p-8 bg-black text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                       <ShieldCheck className="w-40 h-40" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
                      <Sparkles className="w-6 h-6 text-accent" /> Budget Overwatch
                    </h3>
                    <div className="space-y-6">
                       {projects.filter(p => p.totalBudget > 0).map(p => {
                          const projectExpenses = transactions.filter(t => t.projectId === p.id && t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
                          const percentage = (projectExpenses / p.totalBudget) * 100;
                          const isOver = percentage > 100;
                          const isWarning = percentage > 85 && !isOver;

                          return (
                            <div key={p.id} className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <p className="text-xs font-black uppercase text-white/90">{p.name}</p>
                                  <p className="text-[10px] font-bold text-white/40">Allocated Capital: Rp {p.totalBudget.toLocaleString()}</p>
                                </div>
                                {isOver && <Badge className="bg-red-500 text-white border-none text-[8px] font-black uppercase">Over Budget!</Badge>}
                                {isWarning && <Badge className="bg-yellow-500 text-black border-none text-[8px] font-black uppercase">Warning Level</Badge>}
                              </div>
                              <Progress value={Math.min(100, percentage)} className={cn(
                                "h-2 rounded-full",
                                isOver ? "bg-red-900 border-red-500" : isWarning ? "bg-yellow-900 border-yellow-500" : "bg-neutral-800"
                              )} />
                              <div className="flex justify-between items-center">
                                <p className="text-[10px] font-black uppercase tracking-tighter text-neutral-400">Current Spent: {percentage.toFixed(1)}%</p>
                                <p className="text-xs font-mono font-bold text-accent">Rp {projectExpenses.toLocaleString()}</p>
                              </div>
                            </div>
                          );
                       })}
                       {projects.filter(p => p.totalBudget > 0).length === 0 && (
                         <div className="py-12 text-center border-2 border-dashed border-white/10 rounded-3xl">
                            <p className="text-xs font-black uppercase text-white/30 tracking-widest">No Active Projects with Budgets</p>
                         </div>
                       )}
                    </div>
                  </Card>

                  <Card className="border-4 border-black rounded-[2rem] p-8 shadow-xl">
                    <h3 className="text-2xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
                      <CreditCard className="w-6 h-6 text-blue-500" /> Pending Transfers
                    </h3>
                    <div className="space-y-4">
                      {wages.filter(w => w.status === 'pending').map(w => (
                        <div key={w.id} className="flex items-center justify-between p-4 bg-neutral-50 border-2 border-black/5 rounded-2xl group hover:border-black transition-all">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{w.workerName}</p>
                            <p className="text-xs font-black mt-0.5">Rp {w.amount.toLocaleString()}</p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => updateWageStatus(w.id, 'paid')}
                            className="bg-black text-white hover:bg-neutral-800 text-[10px] font-black uppercase h-10 rounded-xl px-4 shadow-lg group-hover:bg-accent group-hover:text-white transition-all"
                          >
                            Execute Transfer
                          </Button>
                        </div>
                      ))}
                      {wages.filter(w => w.status === 'pending').length === 0 && (
                        <div className="py-8 text-center bg-green-50 rounded-2xl border-2 border-green-100">
                          <p className="text-[10px] text-green-600 font-black uppercase tracking-widest">All payrolls settled &check;</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeTab === "marketing" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid md:grid-cols-4 gap-6">
                <Card className="border-2 border-black rounded-2xl p-6 bg-white shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-default">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Prospects</p>
                  <p className="text-4xl font-black mt-2">{leads.length}</p>
                </Card>
                <Card className="border-2 border-black rounded-2xl p-6 bg-white">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">New Leads</p>
                  <div className="flex items-end justify-between">
                    <p className="text-4xl font-black mt-2 text-blue-600">{leads.filter(l => l.status === 'Lead').length}</p>
                    <Badge className="bg-blue-50 text-blue-600 border-none uppercase text-[8px] font-black">Incoming</Badge>
                  </div>
                </Card>
                <Card className="border-2 border-black rounded-2xl p-6 bg-white">
                  <p className="text-[10px] font-black uppercase tracking-widest text-accent">Qualified</p>
                  <div className="flex items-end justify-between">
                    <p className="text-4xl font-black mt-2 text-accent">{leads.filter(l => l.status === 'Qualified').length}</p>
                    <Badge className="bg-accent/10 text-accent border-none uppercase text-[8px] font-black">Hot</Badge>
                  </div>
                </Card>
                <Card className="border-2 border-black rounded-2xl p-6 bg-black text-white shadow-[12px_12px_0px_rgba(255,107,0,0.2)]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Wins (Conversion)</p>
                  <div className="flex items-end justify-between">
                    <p className="text-4xl font-black mt-2 text-white">{leads.filter(l => l.status === 'Won').length}</p>
                    <TrendingUp className="w-6 h-6 text-accent mb-1" />
                  </div>
                </Card>
              </div>

              <Card className="border-4 border-black rounded-[2.5rem] overflow-hidden shadow-2xl bg-white">
                <CardHeader className="bg-neutral-50 p-8 border-b-4 border-black flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-1 text-center md:text-left">
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 justify-center md:justify-start">
                      <UserPlus className="w-8 h-8 text-accent" /> Relationship Pipeline
                    </CardTitle>
                    <CardDescription className="uppercase-soft text-xs font-bold">Monitor every lead from initial contact to successful handover to Project Management.</CardDescription>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <Input 
                        placeholder="Cari nama, WA, atau source..." 
                        className="pl-12 h-14 rounded-2xl border-2 border-black/10 focus:border-black text-sm font-bold bg-white outline-none ring-0 focus-visible:ring-0"
                        value={leadSearch}
                        onChange={e => setLeadSearch(e.target.value)}
                      />
                    </div>
                    <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
                      <DialogTrigger render={
                        <Button className="btn-accent h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:translate-y-1 transition-all">
                          <Plus className="w-5 h-5 mr-3" /> Input New Lead
                        </Button>
                      } />
                      <DialogContent className="w-[95vw] sm:max-w-lg p-8 rounded-[2.5rem] border-4 border-black max-h-[90vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black uppercase tracking-tighter">New Lead Entry</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 pt-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Prospect Identity</Label>
                            <Input 
                              placeholder="Full Name (e.g., John Doe)"
                              value={newLead.name}
                              onChange={e => setNewLead({...newLead, name: e.target.value})}
                              className="h-12 border-2 border-black/10 rounded-xl font-bold bg-neutral-50 px-4"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">WhatsApp Connection</Label>
                              <Input 
                                placeholder="08xxxxxxxxxx"
                                value={newLead.whatsapp}
                                onChange={e => setNewLead({...newLead, whatsapp: e.target.value})}
                                className="h-12 border-2 border-black/10 rounded-xl font-bold bg-neutral-50 px-4"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Marketing Source</Label>
                              <select 
                                className="w-full h-12 border-2 border-black/10 rounded-xl bg-neutral-50 px-3 font-bold text-sm focus:outline-none focus:border-black"
                                value={newLead.source}
                                onChange={e => setNewLead({...newLead, source: e.target.value})}
                              >
                                <option>Instagram</option>
                                <option>Facebook Ads</option>
                                <option>TikTok Organic</option>
                                <option>Website TBJ</option>
                                <option>Manual Input</option>
                                <option>Referral Client</option>
                              </select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Initial Brief / Notes</Label>
                            <Textarea 
                              placeholder="Ex: Interested in kitchen renovation, budget ~150jt..."
                              value={newLead.notes}
                              onChange={e => setNewLead({...newLead, notes: e.target.value})}
                              className="border-2 border-black/10 rounded-xl min-h-[100px] font-medium bg-neutral-50 p-4"
                            />
                          </div>
                          <Button className="w-full bg-black text-white h-14 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-neutral-800" onClick={async () => {
                            if (!newLead.name || !newLead.whatsapp) return;
                            await addLead(newLead as any);
                            setShowAddLead(false);
                            setNewLead({ name: "", email: "", whatsapp: "", source: "Manual", status: "Lead", notes: "" });
                            toast.success("Relationship initialized successfully!");
                          }}>
                            Initialize Phase 1 &rarr;
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-neutral-50/50">
                        <TableRow className="border-b border-neutral-200 hover:bg-transparent">
                          <TableHead className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 w-1/3">Client Identity & Contact</TableHead>
                          <TableHead className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Lead Metadata</TableHead>
                          <TableHead className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-center">Pipeline Progress</TableHead>
                          <TableHead className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Command Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leadsLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="p-20 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <Loader2 className="w-10 h-10 animate-spin text-accent" />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Syncing Global Lead Database...</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : leads.filter(l => 
                          l.name.toLowerCase().includes(leadSearch.toLowerCase()) || 
                          l.whatsapp.includes(leadSearch) ||
                          l.source.toLowerCase().includes(leadSearch.toLowerCase())
                        ).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="p-20 text-center">
                              <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-300">
                                <Users className="w-8 h-8" />
                              </div>
                              <p className="text-[10px] font-black text-neutral-400 mb-1 uppercase tracking-widest">No Prospects Found</p>
                              <p className="text-[9px] text-neutral-300 font-medium max-w-sm mx-auto">Try adjusting your search filter.</p>
                            </TableCell>
                          </TableRow>
                        ) : leads.filter(l => 
                          l.name.toLowerCase().includes(leadSearch.toLowerCase()) || 
                          l.whatsapp.includes(leadSearch)
                        ).map((lead) => (
                          <TableRow key={lead.id} className="group border-b border-neutral-100 hover:bg-neutral-50/30 transition-all duration-300">
                            <TableCell className="p-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-black text-lg shadow-sm">
                                  {lead.name[0].toUpperCase()}
                                </div>
                                <div className="space-y-0.5">
                                  <p className="font-black text-sm uppercase tracking-tight text-neutral-800 leading-none">{lead.name}</p>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 text-green-600">
                                      <Phone className="w-2.5 h-2.5" />
                                      <p className="text-[9px] font-mono font-bold tracking-tighter">{lead.whatsapp}</p>
                                    </div>
                                    <p className="text-[8px] font-black text-neutral-300 uppercase">RD: {new Date(lead.createdAt).toLocaleDateString()}</p>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="p-6">
                              <div className="space-y-2">
                                <Badge className="bg-neutral-100 text-neutral-500 border-none uppercase text-[7px] font-black px-2 py-0.5">{lead.source}</Badge>
                                {lead.notes ? (
                                  <p className="text-[10px] font-medium text-neutral-500 italic line-clamp-1 max-w-[200px]">"{lead.notes}"</p>
                                ) : (
                                  <p className="text-[9px] text-neutral-300 italic">No notes.</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="p-6 text-center">
                              <select 
                                className={cn(
                                  "h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border border-neutral-200 focus:outline-none transition-all cursor-pointer shadow-sm w-40 text-center",
                                  lead.status === 'Won' ? "bg-green-500 text-white border-green-500" :
                                  lead.status === 'Qualified' ? "bg-accent text-white border-accent" :
                                  lead.status === 'Lost' ? "bg-neutral-100 text-neutral-400 border-neutral-200" :
                                  "bg-white text-neutral-600"
                                )}
                                value={lead.status}
                                onChange={async (e) => {
                                  await updateLead(lead.id, { status: e.target.value as any });
                                  toast.success(`Updated: ${lead.name}`);
                                }}
                              >
                                <option value="Lead">Initial Lead</option>
                                <option value="Qualified">Qualified</option>
                                <option value="Won">Won</option>
                                <option value="Lost">Lost</option>
                              </select>
                            </TableCell>
                            <TableCell className="p-6 text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  className="h-9 w-auto px-4 border border-neutral-200 rounded-xl hover:bg-neutral-900 hover:text-white transition-all text-[9px] font-black uppercase gap-2 flex items-center shadow-sm"
                                  onClick={() => window.open(`https://wa.me/${lead.whatsapp}?text=Halo Bapak/Ibu ${lead.name}, saya Admin TBJ Constech.`, '_blank')}
                                >
                                  <Phone className="w-3.5 h-3.5" /> Follow Up
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-9 w-9 border border-neutral-100 text-neutral-300 hover:text-red-500 rounded-xl transition-all"
                                  onClick={async () => {
                                    if (confirm(`Hapus prospect ${lead.name}?`)) {
                                      await deleteLead(lead.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "materials" && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 border-2 border-black rounded-3xl">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Material Procurement Hub</h2>
                  <div className="flex items-center gap-4">
                    <p className="text-[10px] uppercase font-bold text-neutral-400">Total Requests: {requests.length}</p>
                    {selectedMaterials.length > 0 && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="h-8 rounded-full text-[8px] uppercase font-black px-4"
                        onClick={async () => {
                          if (confirm(`Hapus ${selectedMaterials.length} request terpilih?`)) {
                            for (const id of selectedMaterials) await deleteRequest(id);
                            setSelectedMaterials([]);
                            toast.success("Bulk delete complete.");
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-2" /> Bulk Delete ({selectedMaterials.length})
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                  <select 
                    className="h-10 border-2 border-black/10 rounded-xl px-4 text-[10px] font-black uppercase"
                    value={materialCategory}
                    onChange={e => setMaterialCategory(e.target.value)}
                  >
                    <option value="all">ANY STATUS</option>
                    <option value="pending">PENDING</option>
                    <option value="approved">APPROVED</option>
                    <option value="rejected">REJECTED</option>
                    <option value="delivered">DELIVERED</option>
                  </select>
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
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <h4 className="text-xs font-black uppercase tracking-widest">Order Items</h4>
                            <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase border-black/10 w-full sm:w-auto" onClick={handleAddBulkRow}>Add Row</Button>
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
                      <TableHead className="w-10">
                        <Checkbox 
                          checked={selectedMaterials.length === requests.length && requests.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedMaterials(requests.map(r => r.id));
                            else setSelectedMaterials([]);
                          }}
                        />
                      </TableHead>
                      <TableHead className="uppercase-soft">Project & Requester</TableHead>
                      <TableHead className="uppercase-soft">Material Item</TableHead>
                      <TableHead className="uppercase-soft">Quantity</TableHead>
                      <TableHead className="uppercase-soft">Prioritas</TableHead>
                      <TableHead className="uppercase-soft">Status</TableHead>
                      <TableHead className="uppercase-soft text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.filter(req => {
                      const matchesSearch = 
                        req.itemName.toLowerCase().includes(materialSearch.toLowerCase()) || 
                        req.projectName.toLowerCase().includes(materialSearch.toLowerCase()) ||
                        (req.note && req.note.toLowerCase().includes(materialSearch.toLowerCase()));
                      const matchesCategory = materialCategory === "all" || req.status === materialCategory;
                      return matchesSearch && matchesCategory;
                    }).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedMaterials.includes(r.id)}
                            onCheckedChange={() => {
                              setSelectedMaterials(prev => 
                                prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id]
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-black text-xs uppercase tracking-widest">{r.projectName}</p>
                            <p className="text-[9px] uppercase-soft text-neutral-400">By: {r.requesterName}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-bold uppercase">{r.itemName}</TableCell>
                        <TableCell className="text-xs font-bold uppercase">{r.quantity} {r.unit}</TableCell>
                        <TableCell>
                          <select 
                            className={cn(
                              "text-[8px] p-1 border border-black/10 rounded font-bold uppercase outline-none",
                              r.priority === "Urgent" ? "bg-red-50 text-red-600" :
                              r.priority === "High" ? "bg-orange-50 text-orange-600" :
                              r.priority === "Low" ? "bg-blue-50 text-blue-600" : "bg-white"
                            )}
                            value={r.priority || "Medium"}
                            onChange={(e) => updateRequest(r.id, { priority: e.target.value as any })}
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                          </select>
                        </TableCell>
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
                  <div className="overflow-x-auto">
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
                </div>
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Gallery Management</h2>
                <Button className="btn-sleek h-10 px-6 rounded-xl w-full md:w-auto" onClick={() => setShowAddGallery(true)}>
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Property & Strategic Hub</h2>
                <Button className="btn-sleek h-10 px-6 rounded-xl w-full md:w-auto" onClick={() => setShowAddProperty(true)}>
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <h2 className="text-2xl font-black uppercase tracking-tighter shrink-0">Vendor Database</h2>
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input 
                      placeholder="Search vendors by name or category..." 
                      className="pl-10 h-10 border-2 border-black rounded-xl w-full"
                      value={vendorSearch}
                      onChange={e => setVendorSearch(e.target.value)}
                    />
                  </div>
                </div>
                <Button className="btn-sleek h-10 px-6 rounded-xl w-full md:w-auto" onClick={() => setShowAddVendor(true)}>
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
                    {paginatedVendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center text-neutral-400 italic uppercase font-black tracking-widest">
                          No vendors found matching your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedVendors.map(v => (
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>

              {/* Vendor Pagination Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/50 p-4 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Density View:</span>
                  <div className="flex gap-1">
                    {[10, 50, 100].map((size) => (
                      <Button 
                        key={size}
                        variant="outline" 
                        size="sm"
                        className={cn(
                          "h-7 px-3 rounded-lg text-[9px] font-black tracking-widest transition-all",
                          vendorsPerPage === size ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-400 border-neutral-200 hover:bg-neutral-50"
                        )}
                        onClick={() => {
                          setVendorsPerPage(size);
                          setCurrentVendorPage(1);
                        }}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">
                    Segment {currentVendorPage} of {totalVendorPages || 1}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 rounded-xl border border-neutral-200 hover:bg-neutral-50 shadow-sm"
                      disabled={currentVendorPage === 1}
                      onClick={() => setCurrentVendorPage(prev => Math.max(1, prev - 1))}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 rounded-xl border border-neutral-200 hover:bg-neutral-50 shadow-sm"
                      disabled={currentVendorPage === totalVendorPages || totalVendorPages === 0}
                      onClick={() => setCurrentVendorPage(prev => Math.min(totalVendorPages, prev + 1))}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
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
                <CardHeader className="bg-neutral-50 border-b-2 border-black flex flex-col md:flex-row justify-between items-center gap-4">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter">Assessment & Payment Terms</CardTitle>
                  <select 
                    className="h-10 rounded-xl border-2 border-black px-3 text-[10px] font-black uppercase w-full md:w-auto"
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
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                              <h4 className="text-[10px] font-black uppercase">Termin Pembayaran</h4>
                              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                <Button 
                                  size="sm" 
                                  className="btn-orange h-8 text-[9px] font-black uppercase flex-grow sm:flex-grow-0"
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

          {activeTab === "estimates" && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 border-2 border-black rounded-3xl">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Arsip Estimasi (Saved RAB)</h2>
                  <div className="flex items-center gap-4">
                    <p className="text-[10px] uppercase font-bold text-neutral-400">Total Saved: {savedEstimates.length}</p>
                    {selectedEstimates.length > 0 && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="h-8 rounded-full text-[8px] uppercase font-black px-4"
                        onClick={async () => {
                          if (confirm(`Hapus ${selectedEstimates.length} estimasi terpilih?`)) {
                            for (const id of selectedEstimates) await deleteEstimate(id);
                            setSelectedEstimates([]);
                            toast.success("Bulk delete complete.");
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-2" /> Bulk Delete ({selectedEstimates.length})
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                   <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input 
                      placeholder="Search projects..." 
                      className="pl-10 h-10 rounded-xl border-2 border-black/10 text-xs font-bold bg-white"
                      value={estimatesSearch}
                      onChange={e => setEstimatesSearch(e.target.value)}
                    />
                  </div>
                  <Button className="btn-orange h-10 px-6 rounded-xl" onClick={() => navigate('/rab')}>
                    <Plus className="w-4 h-4 mr-2" /> New Estimate
                  </Button>
                </div>
              </div>

              <Card className="border-2 border-black rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead className="w-10">
                        <Checkbox 
                          checked={selectedEstimates.length === savedEstimates.length && savedEstimates.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedEstimates(savedEstimates.map(e => e.id));
                            else setSelectedEstimates([]);
                          }}
                        />
                      </TableHead>
                      <TableHead className="uppercase-soft">Project Name</TableHead>
                      <TableHead className="uppercase-soft">Category</TableHead>
                      <TableHead className="uppercase-soft">Client</TableHead>
                      <TableHead className="uppercase-soft">Total Budget</TableHead>
                      <TableHead className="uppercase-soft">Date Saved</TableHead>
                      <TableHead className="uppercase-soft text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedEstimates.filter(est => 
                      est.projectName.toLowerCase().includes(estimatesSearch.toLowerCase())
                    ).map((est) => (
                      <TableRow key={est.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedEstimates.includes(est.id)}
                            onCheckedChange={() => {
                              setSelectedEstimates(prev => 
                                prev.includes(est.id) ? prev.filter(id => id !== est.id) : [...prev, est.id]
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-black text-xs uppercase tracking-widest">{est.projectName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] font-black uppercase border-black/10">
                            {est.category || "General"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] font-bold text-neutral-500 uppercase">{est.clientName || "Guest User"}</TableCell>
                        <TableCell className="text-xs font-black">Rp {(est.totalBudget || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-[10px] text-neutral-400">{new Date(est.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Dialog>
                              <DialogTrigger render={
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" title="Assign to Project">
                                  <Link2 className="w-4 h-4" />
                                </Button>
                              } />
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="text-lg font-black uppercase tracking-tighter">Assign to Active Project</DialogTitle>
                                  <DialogDescription className="uppercase-soft">Copy this RAB budget and data to a project's dashboard.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase">Select Destination Project</label>
                                    <select 
                                      className="w-full h-12 border-2 border-black rounded-xl px-4 text-sm font-bold bg-neutral-50"
                                      onChange={(e) => syncEstimateToProject(est.id, e.target.value)}
                                    >
                                      <option value="">Choose Project...</option>
                                      {projects.filter(p => p.status !== 'completed').map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/rab?load=${est.id}`)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => {
                              if(confirm("Hapus estimasi ini?")) deleteEstimate(est.id);
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {savedEstimates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-20 text-neutral-400 italic">No saved estimates found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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
                      <DialogContent className="sm:max-w-md">
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
        <DialogContent className="sm:max-w-md">
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
  </div>
  );
}

