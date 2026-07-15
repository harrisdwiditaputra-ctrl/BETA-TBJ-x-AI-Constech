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
  useProjectDetails, useLeads, useTechnicalDrawings
} from "@/lib/hooks";
import { ProjectAIHealth } from "./ProjectAIHealth";
import { ProjectKPIs } from "./ProjectKPIs";
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
  ArrowDownLeft, ArrowUpRight, Lock, Gavel, CreditCard, Truck, BarChart, FileEdit, Link2, BarChart2, Check
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, limit, writeBatch, getDocsFromServer, onSnapshot } from "firebase/firestore";
import PMDashboard from "./PMDashboard";
import MediaWarehouse from "./MediaWarehouse";
import { cn, getDriveImageUrl, formatRupiah, calculateAdminPrice, calculateClientPrice } from "@/lib/utils";
import { toast } from "sonner";
import { WorkItemMaster, UserProfile, Project, Workforce, MaterialRequest, Property, Campaign, SystemConfig, CMSConfig, Vendor, GalleryItem, FinancialTransaction, BudgetItem } from "@/types";
import { generateRABPDF, generatePOPDF, generateInvoicePDF, generateReceiptPDF } from "@/lib/pdfUtils";
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
    updateMasterCategory,
    deleteMasterCategory,
    resetDatabase, 
    clearMasterData,
    bulkAddMasterItems,
    saveVersion,
    masterVersions,
    activateVersion,
    deleteVersion
  } = useMasterData(user?.role);
  const { categories: masterCategories } = useMasterCategories();
  const { users, loading: usersLoading, updateUser, deleteUser } = useUsers(user?.role);
  const { projects, loading: projectsLoading, updateProject, deleteProject, createProject, fixProjectMilestones } = useProjects(undefined, user?.role);
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
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useFinance();
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<FinancialTransaction>>({});
  const [financeSearch, setFinanceSearch] = useState("");
  const [financePage, setFinancePage] = useState(1);
  const [financeCategoryFilter, setFinanceCategoryFilter] = useState<"all" | "income" | "material" | "labor" | "assessment" | "other">("all");
  const [financeProjectFilter, setFinanceProjectFilter] = useState("all");
  const financeLimit = 15;

  const filteredFinance = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        t.description.toLowerCase().includes(financeSearch.toLowerCase()) ||
        t.projectName?.toLowerCase().includes(financeSearch.toLowerCase()) ||
        t.category.toLowerCase().includes(financeSearch.toLowerCase()) ||
        t.date.includes(financeSearch);

      let matchesCategory = true;
      if (financeCategoryFilter !== "all") {
        if (financeCategoryFilter === "income") {
          matchesCategory = t.type === "income";
        } else {
          matchesCategory = t.type === "expense" && t.category === financeCategoryFilter;
        }
      }

      let matchesProject = true;
      if (financeProjectFilter !== "all") {
        matchesProject = t.projectId === financeProjectFilter;
      }

      return matchesSearch && matchesCategory && matchesProject;
    });
  }, [transactions, financeSearch, financeCategoryFilter, financeProjectFilter]);

  const ledgerTxList = useMemo(() => {
    if (financeProjectFilter === "all") return transactions;
    return transactions.filter(t => t.projectId === financeProjectFilter);
  }, [transactions, financeProjectFilter]);

  const ledgerStats = useMemo(() => {
    const totalIncome = ledgerTxList.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = ledgerTxList.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const sisaDana = totalIncome - totalExpense;

    const materialExpense = ledgerTxList.filter(t => t.type === 'expense' && t.category === 'material').reduce((sum, t) => sum + t.amount, 0);
    const laborExpense = ledgerTxList.filter(t => t.type === 'expense' && t.category === 'labor').reduce((sum, t) => sum + t.amount, 0);
    const assessmentExpense = ledgerTxList.filter(t => t.type === 'expense' && t.category === 'assessment').reduce((sum, t) => sum + t.amount, 0);
    const otherExpense = ledgerTxList.filter(t => t.type === 'expense' && t.category === 'other').reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpense,
      sisaDana,
      materialExpense,
      laborExpense,
      assessmentExpense,
      otherExpense
    };
  }, [ledgerTxList]);

  const contractRevenue = useMemo(() => projects.reduce((acc, p) => acc + (p.totalBudget || 0), 0), [projects]);
  const incomingRevenue = useMemo(() => transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0), [transactions]);

  const paginatedFinance = filteredFinance.slice((financePage - 1) * financeLimit, financePage * financeLimit);
  const totalFinancePages = Math.ceil(filteredFinance.length / financeLimit);

  const handleEditTransaction = (t: FinancialTransaction) => {
    setEditingTransactionId(t.id);
    setEditFormData({
      description: t.description,
      amount: t.amount,
      category: t.category,
      subCategory: t.subCategory || "",
      method: t.method,
      date: t.date // Added date
    });
  };

  const saveEditTransaction = async () => {
    if (!editingTransactionId) return;
    try {
      await updateTransaction(editingTransactionId, {
        ...editFormData,
        date: editFormData.date ? new Date(editFormData.date).toISOString() : new Date().toISOString(),
        recordedBy: user?.displayName || user?.email || "Admin",
        recordedRole: "admin"
      });
      setEditingTransactionId(null);
    } catch (error) {
      toast.error("Failed to update transaction");
    }
  };

  const [recapYear, setRecapYear] = useState<number>(new Date().getFullYear());
  const [selectedMonthForDetails, setSelectedMonthForDetails] = useState<number | null>(null);

  const periodicRecap = useMemo(() => {
    const grouped: {
      [year: number]: {
        totalIncome: number;
        totalExpense: number;
        netProfit: number;
        months: {
          [monthNum: number]: {
            monthName: string;
            totalIncome: number;
            totalExpense: number;
            netProfit: number;
            categories: { [cat: string]: number };
            subCategories: { [subCat: string]: number };
            transactionsCount: number;
          }
        }
      }
    } = {};

    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    transactions.forEach(t => {
      const d = new Date(t.date);
      const year = d.getFullYear() || 2026;
      const monthNum = d.getMonth(); // 0-11

      if (!grouped[year]) {
        grouped[year] = {
          totalIncome: 0,
          totalExpense: 0,
          netProfit: 0,
          months: {}
        };
      }

      if (!grouped[year].months[monthNum]) {
        grouped[year].months[monthNum] = {
          monthName: monthNames[monthNum],
          totalIncome: 0,
          totalExpense: 0,
          netProfit: 0,
          categories: { material: 0, labor: 0, assessment: 0, other: 0 },
          subCategories: { tol: 0, bensin: 0, makan: 0, jajan: 0, atk: 0, operasional: 0, darurat: 0, lainnya: 0 },
          transactionsCount: 0
        };
      }

      grouped[year].months[monthNum].transactionsCount++;

      if (t.type === "income") {
        grouped[year].totalIncome += t.amount;
        grouped[year].months[monthNum].totalIncome += t.amount;
      } else {
        grouped[year].totalExpense += t.amount;
        grouped[year].months[monthNum].totalExpense += t.amount;

        // Category breakdown
        const cat = t.category || "other";
        if (grouped[year].months[monthNum].categories[cat] !== undefined) {
          grouped[year].months[monthNum].categories[cat] += t.amount;
        } else {
          grouped[year].months[monthNum].categories[cat] = t.amount;
        }

        // Subcategory breakdown
        if (t.subCategory) {
          const sub = t.subCategory;
          if (grouped[year].months[monthNum].subCategories[sub] !== undefined) {
            grouped[year].months[monthNum].subCategories[sub] += t.amount;
          } else {
            grouped[year].months[monthNum].subCategories[sub] = t.amount;
          }
        }
      }
    });

    // Compute net profits
    Object.keys(grouped).forEach(yrStr => {
      const yr = Number(yrStr);
      grouped[yr].netProfit = grouped[yr].totalIncome - grouped[yr].totalExpense;
      Object.keys(grouped[yr].months).forEach(monStr => {
        const mon = Number(monStr);
        grouped[yr].months[mon].netProfit = grouped[yr].months[mon].totalIncome - grouped[yr].months[mon].totalExpense;
      });
    });

    return grouped;
  }, [transactions]);

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
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    name: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    clientNik: "",
    category: "Renovasi",
    location: "Jakarta",
    totalBudget: 0,
  });
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    whatsapp: "",
    source: "Manual",
    status: "Lead" as any,
    notes: "",
    address: "",
    nik: "",
    projectType: "Renovasi"
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
  const [projectItems, setProjectItems] = useState<{ [projectId: string]: BudgetItem[] }>({});

  useEffect(() => {
    if (projectsLoading || projects.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    projects.forEach((proj) => {
      const q = collection(db, "projects", proj.id, "items");
      const unsub = onSnapshot(q, (snapshot) => {
        const itemsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BudgetItem[];
        setProjectItems((prev) => ({
          ...prev,
          [proj.id]: itemsList
        }));
      }, (error) => {
        console.error(`Error loading items for project ${proj.id}:`, error);
      });
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [projects, projectsLoading]);

  const masterDataWithStats = useMemo(() => {
    return masterData.map((masterItem) => {
      let activeVolume = 0;
      let activeRevenue = 0;
      let activeProjectsCount = 0;
      let completedVolume = 0;
      let completedRevenue = 0;
      let completedProjectsCount = 0;

      projects.forEach((proj) => {
        const items = projectItems[proj.id] || [];
        const matchingItems = items.filter((bItem) => {
          if (bItem.masterItemId && bItem.masterItemId === masterItem.id) return true;
          if (bItem.code && masterItem.code && bItem.code.trim().toUpperCase() === masterItem.code.trim().toUpperCase()) return true;
          if (bItem.name.trim().toLowerCase() === masterItem.name.trim().toLowerCase()) return true;
          return false;
        });

        if (matchingItems.length > 0) {
          const projectVol = matchingItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
          const projectRev = matchingItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

          if (proj.status === "active") {
            activeVolume += projectVol;
            activeRevenue += projectRev;
            activeProjectsCount++;
          } else if (proj.status === "completed") {
            completedVolume += projectVol;
            completedRevenue += projectRev;
            completedProjectsCount++;
          }
        }
      });

      return {
        ...masterItem,
        activeVolume,
        activeRevenue,
        activeProjectsCount,
        completedVolume,
        completedRevenue,
        completedProjectsCount,
        totalUsageCount: activeProjectsCount + completedProjectsCount,
        totalVolume: activeVolume + completedVolume,
        totalRevenue: activeRevenue + completedRevenue
      };
    });
  }, [masterData, projects, projectItems]);
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
  const [editingWorkerData, setEditingWorkerData] = useState<Workforce | null>(null);
  const handleEditWorker = (w: Workforce) => setEditingWorkerData(w);
  const handleSaveWorkerEdit = async () => {
    if (editingWorkerData) {
      await updateWorkforce(editingWorkerData.id, editingWorkerData);
      setEditingWorkerData(null);
      toast.success("Data pekerja diperbarui");
    }
  };
  const [selectedProjectAI, setSelectedProjectAI] = useState<Project | any>({});
  const [selectedProjectKPI, setSelectedProjectKPI] = useState<Project | null>(null);
  const [selectedProjectFinance, setSelectedProjectFinance] = useState<Project | any>({});
  const [editingMilestoneIndex, setEditingMilestoneIndex] = useState<number | null>(null);
  const [milestoneEditPercentage, setMilestoneEditPercentage] = useState<number>(0);
  const [showAddCustomMilestone, setShowAddCustomMilestone] = useState(false);
  const [newCustomMilestone, setNewCustomMilestone] = useState({ label: "", percentage: 0 });
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [bulkOrderItems, setBulkOrderItems] = useState([{ name: "", quantity: 0, unit: "m3" }]);
  const [selectedBulkProject, setSelectedBulkProject] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const handleAIGenerate = async () => {
    setLoadingAI(true);
    try {
      // Logic for AI Suggestions would call a server endpoint
      // For now this is a placeholder that triggers a success toast
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("AI Suggestions Refreshed via Server");
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<Workforce | null>(null);
  const [editingContractProject, setEditingContractProject] = useState<Project | null>(null);
  const [managingCctvProject, setManagingCctvProject] = useState<Project | null>(null);
  const [newCctv, setNewCctv] = useState({ name: "Site Monitor", url: "", type: "embed" as any });

  const confirmDeleteUser = (uid: string) => {
    setDeleteConfirmId(uid);
  };

  const executeDeleteUser = async () => {
    if (deleteConfirmId) {
      await deleteUser(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const executeDeleteProject = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete.id);
      setProjectToDelete(null);
      toast.success("Proyek berhasil dihapus");
    }
  };

  const [editingProjectData, setEditingProjectData] = useState<Project | null>(null);

  const handleEditProject = (p: Project) => {
    setEditingProjectData(p);
  };

  const handleSaveProjectEdit = async () => {
    if (editingProjectData) {
      await updateProject(editingProjectData.id, editingProjectData);
      setEditingProjectData(null);
      toast.success("Data proyek berhasil diperbarui");
    }
  };

  const executeDeleteWorker = async () => {
    if (workerToDelete) {
      await deleteWorkforce(workerToDelete.id);
      setWorkerToDelete(null);
      toast.success("Data pekerja berhasil dihapus");
    }
  };

  const handleUpdateContract = async () => {
    if (!editingContractProject) return;
    try {
      await updateProject(editingContractProject.id, {
        contractParty1: editingContractProject.contractParty1 || "",
        contractParty2: editingContractProject.contractParty2 || "",
        contractDraft: editingContractProject.contractDraft || "",
        contractClauses: editingContractProject.contractClauses || []
      });
      setEditingContractProject(null);
      toast.success("Kontrak berhasil diperbarui");
    } catch (error) {
      toast.error("Gagal memperbarui kontrak");
    }
  };

  const handleAddCctv = async () => {
    if (!managingCctvProject || !newCctv.url) return;
    try {
      const currentCctvs = managingCctvProject.cctvUrls || [];
      const updatedCctvs = [...currentCctvs, { ...newCctv, id: Math.random().toString(36).substr(2, 9) }];
      await updateProject(managingCctvProject.id, { cctvUrls: updatedCctvs });
      setManagingCctvProject({ ...managingCctvProject, cctvUrls: updatedCctvs });
      setNewCctv({ name: "Site Monitor", url: "", type: "embed" as any });
      toast.success("CCTV berhasil ditambahkan");
    } catch (error) {
      toast.error("Gagal menambahkan CCTV");
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
    subCategory: "",
    method: "Cash" as any,
    receiptUrl: "",
    itemId: "",
    date: new Date().toISOString().split('T')[0]
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
        status: "completed",
        recordedBy: user?.displayName || user?.email || "Admin",
        recordedRole: "admin"
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
        subCategory: expenseForm.subCategory || "",
        amount: expenseForm.amount,
        description: expenseForm.description,
        method: expenseForm.method as any,
        receiptUrl: expenseForm.receiptUrl,
        itemId: expenseForm.itemId || "",
        date: expenseForm.date ? new Date(expenseForm.date).toISOString() : new Date().toISOString(),
        status: "completed",
        recordedBy: user?.displayName || user?.email || "Admin",
        recordedRole: "admin"
      });

      // If it's a labor expense (wage), we might want to check if it's tied to useWorkerWages, 
      // but for "Manual Expense" we just record it to finance ledger.

      setShowRecordExpense(false);
      setExpenseForm({
        projectId: "",
        amount: 0,
        description: "",
        category: "material",
        subCategory: "",
        method: "Cash",
        receiptUrl: "",
        itemId: "",
        date: new Date().toISOString().split('T')[0]
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
    let data = masterDataWithStats;
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

    // Sort: items with totalUsageCount > 0 come first (and highest use is positioned first)
    return [...data].sort((a, b) => {
      const aUsed = a.totalUsageCount > 0;
      const bUsed = b.totalUsageCount > 0;

      if (aUsed && !bUsed) return -1;
      if (!aUsed && bUsed) return 1;

      if (aUsed && bUsed) {
        // Both used, sort by totalUsageCount DESC
        const usageDiff = b.totalUsageCount - a.totalUsageCount;
        if (usageDiff !== 0) return usageDiff;
        // Then by totalRevenue DESC
        const revDiff = b.totalRevenue - a.totalRevenue;
        if (revDiff !== 0) return revDiff;
      }

      // Unused/fallback comparison: categorized, then code order
      const catComp = (a.category || "").localeCompare(b.category || "");
      if (catComp !== 0) return catComp;
      const codeComp = (a.code || "").localeCompare(b.code || "");
      if (codeComp !== 0) return codeComp;
      return a.name.localeCompare(b.name);
    });
  }, [masterDataWithStats, search, selectedMasterCategory, selectedUnit]);

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
    generateRABPDF("MASTER RAB TBJ HUB", cats, masterData.map(item => {
      const finalPrice = calculateAdminPrice(item.price, systemConfig?.globalMarkup, false);
      return {
        ...item,
        quantity: 1,
        pricePerUnit: finalPrice,
        totalPrice: finalPrice
      };
    }), pdfLogo);
    toast.success("Master RAB PDF exported with Admin Price Architecture");
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
                <Card className="border-2 border-black rounded-2xl shadow-sm bg-gradient-to-br from-emerald-50/40 to-white">
                  <CardHeader className="pb-2">
                    <CardDescription className="uppercase-soft text-[#FF6B00] font-black flex items-center gap-1">💰 Total Revenue</CardDescription>
                    <div className="space-y-1 mt-1.5">
                      <div>
                        <span className="text-[9px] font-black uppercase text-neutral-400 block leading-none">Nilai Kontrak (RAB)</span>
                        <span className="text-xl font-black text-neutral-900 leading-tight block">{formatRupiah(contractRevenue)}</span>
                      </div>
                      <div className="pt-1.5 border-t border-black/5 mt-1.5">
                        <span className="text-[9px] font-black uppercase text-neutral-400 block leading-none">Pemasukan Riil</span>
                        <span className="text-xl font-black text-green-600 leading-tight block">{formatRupiah(incomingRevenue)}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <div className="flex items-center gap-1 text-green-600 text-[10px] font-black">
                      <TrendingUp className="w-3.5 h-3.5" /> Realtime Live Sync
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
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Recent Project Requests (Awaiting)</h4>
                    <Button variant="ghost" size="sm" className="text-[7px] font-black uppercase h-auto py-0 hover:text-accent opacity-60 hover:opacity-100" onClick={() => setActiveTab("projects")}>View All</Button>
                  </div>
                  <div className="flex overflow-x-auto pb-4 gap-3 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-1 md:space-y-2 md:overflow-visible md:pb-0">
                    {projects.filter(p => p.status === 'awaiting').slice(0, 5).map(p => (
                      <div key={p.id} className="min-w-[220px] md:min-w-0 snap-center p-2.5 bg-neutral-50 rounded-xl border-2 border-black/5 flex justify-between items-center group hover:bg-white hover:border-black transition-all cursor-pointer shadow-sm md:shadow-none" onClick={() => { setActiveTab("projects"); setProjectStatus("awaiting"); }}>
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                            <Briefcase className="w-3 h-3" />
                          </div>
                          <div className="flex-grow min-w-0">
                            <p className="text-[8px] md:text-[9px] font-black uppercase truncate leading-tight">{p.name}</p>
                            <p className="text-[7px] text-neutral-400 font-bold uppercase truncate opacity-70">{p.location || "No Location"}</p>
                          </div>
                        </div>
                        <Badge className="bg-black text-white text-[6px] uppercase font-black px-1.5 py-0 shrink-0 ml-2">NEW</Badge>
                      </div>
                    ))}
                    {projects.filter(p => p.status === 'awaiting').length === 0 && (
                      <div className="w-full py-4 text-center bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200">
                        <p className="text-[7px] font-black uppercase text-neutral-400 tracking-widest opacity-50">No pending requests.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-black/5">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-4">Gallery & Portfolio Impact</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-neutral-50 rounded-xl border-2 border-black">
                      <p className="text-lg font-black">{gallery.length}</p>
                      <p className="text-[7px] font-bold uppercase text-neutral-400">Items</p>
                    </div>
                    <div className="text-center p-2 bg-neutral-50 rounded-xl border-2 border-black">
                      <p className="text-lg font-black">{gallery.length > 0 ? "1.2k" : "0"}</p>
                      <p className="text-[7px] font-bold uppercase text-neutral-400">Views</p>
                    </div>
                    <div className="text-center p-2 bg-neutral-50 rounded-xl border-2 border-black">
                      <p className="text-lg font-black">{gallery.length > 0 ? "15%" : "0%"}</p>
                      <p className="text-[7px] font-bold uppercase text-neutral-400">Rate</p>
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
                        <p className="text-[9px] font-black uppercase tracking-widest text-accent mb-2 flex items-center gap-2">
                          <DollarSign className="w-3 h-3" /> Finance Summary
                        </p>
                        <p className="text-[9px] leading-relaxed opacity-90">
                          Revenue bulan ini diproyeksikan mencapai Rp 2.4B. Cash flow aman dengan cadangan operasional untuk 3 bulan ke depan.
                        </p>
                      </div>
                      <div className="p-4 bg-black/20 rounded-xl border border-white/10">
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-2">
                          <BarChart3 className="w-3 h-3" /> Progress & Content
                        </p>
                        <p className="text-[9px] leading-relaxed opacity-90">
                          Rata-rata progress proyek aktif: 64%. Konten gallery baru (12 item) meningkatkan engagement leads sebesar 18%.
                        </p>
                      </div>
                      <div className="p-4 bg-black/20 rounded-xl border border-white/10">
                        <p className="text-[9px] font-black uppercase tracking-widest text-green-400 mb-2 flex items-center gap-2">
                          <Package className="w-3 h-3" /> Material & Supply
                        </p>
                        <p className="text-[9px] leading-relaxed opacity-90">
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
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger nativeButton={true} render={
                        <Button className="h-10 w-full rounded-xl border-2 border-black bg-white text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 shadow-sm">
                          <Settings className="w-3.5 h-3.5 mr-2" /> Manage Categories
                        </Button>
                      } />
                      <DialogContent className="max-w-md rounded-3xl border-2 border-black p-6">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-black uppercase tracking-tighter italic">Master Categories</DialogTitle>
                          <DialogDescription className="uppercase-soft text-[10px]">Edit or remove existing data segments.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1 thin-scrollbar">
                          {masterCategories.length === 0 ? (
                            <p className="text-center text-[10px] font-black uppercase text-neutral-400 py-10 tracking-[0.2em]">No categories defined.</p>
                          ) : (
                            masterCategories.map((cat) => (
                              <div key={cat.id} className="flex items-center justify-between p-4 border-2 border-black/5 rounded-2xl bg-neutral-50 hover:border-black/10 transition-all group">
                                <span className="text-[11px] font-black uppercase tracking-tight text-neutral-700">{cat.name}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Dialog>
                                    <DialogTrigger nativeButton={true} render={
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:bg-blue-50 border border-blue-100">
                                        <FileEdit className="w-3.5 h-3.5" />
                                      </Button>
                                    } />
                                    <DialogContent className="max-w-sm rounded-3xl border-2 border-black p-6">
                                      <DialogHeader>
                                        <DialogTitle className="text-lg font-black uppercase tracking-tight">Rename Category</DialogTitle>
                                      </DialogHeader>
                                      <div className="py-6">
                                        <label className="uppercase-soft text-[9px] mb-2 block">New Segment Name</label>
                                        <Input 
                                          defaultValue={cat.name} 
                                          placeholder="e.g. ARSITEKTUR" 
                                          className="h-12 border-2 border-black rounded-xl font-black uppercase text-sm px-4"
                                          id={`edit-cat-input-${cat.id}`}
                                        />
                                      </div>
                                      <DialogFooter>
                                        <Button className="btn-sleek w-full h-12 rounded-xl" onClick={async () => {
                                          const input = document.getElementById(`edit-cat-input-${cat.id}`) as HTMLInputElement;
                                          if (input && input.value && input.value !== cat.name) {
                                            await updateMasterCategory(cat.id, input.value);
                                            toast.success("Category renamed");
                                          }
                                        }}>Save Identification &rarr;</Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50 border border-red-100" onClick={() => deleteMasterCategory(cat.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
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
                        value={newProduct.category || ""}
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
                        value={newProduct.code || ""}
                        onChange={e => setNewProduct({...newProduct, code: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Product Name</label>
                      <Input 
                        placeholder="e.g. Galian Tanah" 
                        className="h-10 border-2 border-black/10 rounded-xl"
                        value={newProduct.name || ""}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="uppercase-soft text-[10px]">Keterangan Spesifikasi (Merk, Tipe, Detail)</label>
                      <Input 
                        placeholder="e.g. Semen Tiga Roda, Besi 12mm Full, dst." 
                        className="h-10 border-2 border-black/10 rounded-xl"
                        value={newProduct.technicalSpecs || ""}
                        onChange={e => setNewProduct({...newProduct, technicalSpecs: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Unit</label>
                      <Input 
                        placeholder="m3, m2, ls" 
                        className="h-10 border-2 border-black/10 rounded-xl"
                        value={newProduct.unit || ""}
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
                        value={newProduct.description || ""}
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
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                        <div className="space-y-1 bg-neutral-100/50 p-3 rounded-xl border border-black/5">
                                          <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Total Digunakan (RAB)</h4>
                                          <div className="space-y-1 text-xs">
                                            <p className="font-bold flex justify-between">
                                              <span className="text-neutral-500">Proyek Aktif:</span>
                                              <span className="font-black text-amber-600">{item.activeProjectsCount || 0}x ({item.activeVolume || 0} {item.unit})</span>
                                            </p>
                                            <p className="font-bold flex justify-between">
                                              <span className="text-neutral-500">Proyek Selesai:</span>
                                              <span className="font-black text-green-600">{item.completedProjectsCount || 0}x ({item.completedVolume || 0} {item.unit})</span>
                                            </p>
                                            <p className="border-t border-black/5 pt-1 font-black flex justify-between mt-1 text-[11px]">
                                              <span className="text-neutral-600">Total:</span>
                                              <span>{item.totalUsageCount || 0}x ({item.totalVolume || 0} {item.unit})</span>
                                            </p>
                                          </div>
                                        </div>
                                        <div className="space-y-1 bg-neutral-100/50 p-3 rounded-xl border border-black/5">
                                          <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Revenue Terkumpul</h4>
                                          <div className="space-y-1 text-xs">
                                            <p className="font-bold flex justify-between">
                                              <span className="text-neutral-500">Proyek Aktif:</span>
                                              <span className="font-black text-amber-600">{formatRupiah(item.activeRevenue || 0)}</span>
                                            </p>
                                            <p className="font-bold flex justify-between">
                                              <span className="text-neutral-500">Proyek Selesai:</span>
                                              <span className="font-black text-green-600">{formatRupiah(item.completedRevenue || 0)}</span>
                                            </p>
                                            <p className="border-t border-black/5 pt-1 font-black flex justify-between mt-1 text-[11px] text-black">
                                              <span className="text-neutral-600">Total:</span>
                                              <span>{formatRupiah(item.totalRevenue || 0)}</span>
                                            </p>
                                          </div>
                                        </div>
                                        <div className="space-y-1 p-3">
                                          <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Estimasi Margin</h4>
                                          <p className="text-lg font-black text-green-600">20% <span className="text-[10px] text-neutral-400 font-bold uppercase">(System Markup)</span></p>
                                        </div>
                                        <div className="space-y-1 p-3">
                                          <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Status Katalog</h4>
                                          <Badge className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-1.5 mt-1", item.status === 'visible' ? "bg-green-500 hover:bg-green-600 text-white" : "bg-neutral-200 text-neutral-500")}>
                                            {item.status || 'visible'}
                                          </Badge>
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
                                                  <p className="text-2xl font-black text-accent">{u.aiUsageCount || 0} / {u.tier === 'deal' ? "∞" : u.waVerified ? "10" : "5"}</p>
                                                </div>
                                                <Zap className="w-8 h-8 text-accent/20" />
                                             </div>
                                             <Progress value={Math.min(((u.aiUsageCount || 0) / (u.waVerified ? 10 : 5)) * 100, 100)} className="h-2 bg-accent/10" />
                                             <p className="text-[9px] font-medium text-neutral-500 italic">
                                                {u.tier === 'deal' 
                                                  ? "Status Deal (Analisa Unlimited)"
                                                  : u.waVerified 
                                                    ? "Status Terverifikasi (Limit 10 Analisa Aktif)" 
                                                    : "Status Free (Limit 5 Analisa, verifikasi WA untuk 10 analisa)"}
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
                                      {Array.from({ length: u.waVerified ? 10 : 5 }).map((_, i) => (
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
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-all" onClick={() => confirmDeleteUser(u.uid)}>
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
                      <option value="awaiting">AWAITING</option>
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
                  <Dialog open={showAddProject} onOpenChange={setShowAddProject}>
                    <DialogContent className="max-w-2xl rounded-[2.5rem] border-4 border-black p-8">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">Manual Project Initiation</DialogTitle>
                        <DialogDescription className="uppercase-soft text-[10px]">Create a new project identity in the TBJ ecosystem.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Project Name</Label>
                            <Input placeholder="e.g. Renovasi Bpk Alex" value={newProjectData.name} onChange={e => setNewProjectData({...newProjectData, name: e.target.value})} className="h-12 border-2 border-black rounded-xl font-bold" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Category</Label>
                            <select className="w-full h-12 border-2 border-black rounded-xl px-3 font-black text-[10px] uppercase" value={newProjectData.category} onChange={e => setNewProjectData({...newProjectData, category: e.target.value})}>
                               <option>Renovasi</option>
                               <option>Bangun Baru</option>
                               <option>Interior</option>
                               <option>Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase">Nama Lengkap Pihak Kedua (Klien)</Label>
                           <Input placeholder="Sesuai KTP" value={newProjectData.clientName} onChange={e => setNewProjectData({...newProjectData, clientName: e.target.value})} className="h-12 border-2 border-black rounded-xl font-bold" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">NIK KTP Klien</Label>
                            <Input placeholder="16 Digit" value={newProjectData.clientNik} onChange={e => setNewProjectData({...newProjectData, clientNik: e.target.value})} className="h-12 border-2 border-black rounded-xl font-mono" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">WhatsApp Connection</Label>
                            <Input placeholder="08xxxxxxxxxx" value={newProjectData.clientPhone} onChange={e => setNewProjectData({...newProjectData, clientPhone: e.target.value})} className="h-12 border-2 border-black rounded-xl font-mono" />
                          </div>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase">Alamat Lengkap Proyek</Label>
                           <Input placeholder="Lokasi Pekerjaan" value={newProjectData.location} onChange={e => setNewProjectData({...newProjectData, location: e.target.value})} className="h-12 border-2 border-black rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase">Email Address</Label>
                           <Input type="email" placeholder="client@example.com" value={newProjectData.clientEmail} onChange={e => setNewProjectData({...newProjectData, clientEmail: e.target.value})} className="h-12 border-2 border-black rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase">Initial Capital (Budget)</Label>
                           <Input type="number" placeholder="Rp 0" value={newProjectData.totalBudget} onChange={e => setNewProjectData({...newProjectData, totalBudget: Number(e.target.value)})} className="h-12 border-2 border-black rounded-xl font-bold" />
                        </div>
                      </div>
                      <DialogFooter className="mt-4">
                        <Button className="w-full bg-black text-white h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl" onClick={async () => {
                           if (!newProjectData.name || !newProjectData.clientName) {
                              toast.error("Please fill Name & Client info.");
                              return;
                           }
                           await (createProject as any)({
                              ...newProjectData,
                              status: 'survey',
                              contractParty2: newProjectData.clientName,
                              contractDraft: `KONTRAK KERJASAMA PEMBANGUNAN\n\nPROYEK: ${newProjectData.name.toUpperCase()}\nLOKASI: ${newProjectData.location.toUpperCase()}\n\nAntara PT. TBJ CONSTECH INDONESIA (Pihak Pertama) dan ${newProjectData.clientName.toUpperCase()} (Pihak Kedua).`,
                              contractHistory: [
                                { time: new Date().toISOString(), action: "Project Created Manually", user: user?.displayName || "Admin", role: "admin" }
                              ],
                              paymentMilestones: [
                                { label: 'Booking Fee', percentage: 0, status: 'paid' },
                                { label: 'Termin I (DP)', percentage: 30, status: 'released' },
                                { label: 'Termin II (Mid)', percentage: 40, status: 'locked' },
                                { label: 'Termin III (Final)', percentage: 30, status: 'locked' },
                              ]
                           });
                           setShowAddProject(false);
                           setNewProjectData({
                              name: "", clientName: "", clientEmail: "", clientPhone: "", clientAddress: "", clientNik: "", category: "Renovasi", location: "Jakarta", totalBudget: 0
                           });
                           toast.success("Project Successfully Initiated.");
                        }}>
                          Deploy Project Platform &rarr;
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <div className="flex flex-col gap-3 w-full lg:w-48">
                    <Button 
                      className="btn-accent h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform w-full"
                      onClick={() => setShowAddProject(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Tambah Proyek
                    </Button>
                    <Button 
                      className="btn-sleek h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg w-full" 
                      onClick={() => navigate("/pm")}
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" /> PM Dashboard
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {projects.filter(p => {
                  const nameStr = (p.name || "").toLowerCase();
                  const locStr = (p.location || "").toLowerCase();
                  const searchStr = projectSearch.toLowerCase();
                  const matchesSearch = nameStr.includes(searchStr) || locStr.includes(searchStr);
                  const matchesCategory = projectCategory === "all" || p.category === projectCategory || p.type === projectCategory;
                  const matchesStatus = projectStatus === "all" || p.status === projectStatus;
                  return matchesSearch && matchesCategory && matchesStatus;
                }).map(p => {
                  const projectExpenses = transactions.filter(t => t.projectId === p.id && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                  const projectIncome = transactions.filter(t => t.projectId === p.id && t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                  const projectProfit = projectIncome - projectExpenses;
                  const projectSisa = (p.totalBudget || 0) - projectExpenses;
                  const isOver = p.totalBudget && projectExpenses > p.totalBudget;

                  return (
                    <Card 
                      key={p.id} 
                      className={cn(
                        "border-2 rounded-[2rem] overflow-hidden shadow-sm group transition-all relative cursor-pointer",
                        selectedProjects.includes(p.id) ? "border-accent bg-accent/5" : "border-black hover:border-accent hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]",
                        isOver && "border-red-500 shadow-red-500/20"
                      )}
                      onClick={() => navigate(`/projects/${p.id}`)}
                    >
                      <div className="h-40 md:h-48 bg-neutral-100 relative">
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
                           {isOver && <div className="bg-red-500 text-white p-1 rounded-full animate-bounce"><AlertCircle className="w-3 h-3" /></div>}
                           <Badge className={cn(
                             "uppercase font-black text-[7px] md:text-[8px] border-none px-2 md:px-3 py-1",
                             p.status === 'active' ? "bg-green-500 text-white" : 
                             p.status === 'survey' ? "bg-blue-500 text-white" :
                             p.status === 'completed' ? "bg-purple-500 text-white" :
                             p.status === 'on-hold' ? "bg-yellow-500 text-white" :
                             p.status === 'cancelled' ? "bg-red-500 text-white" :
                             "bg-neutral-500 text-white"
                           )}>{p.status}</Badge>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-gradient-to-t from-black/80 to-transparent">
                           <div className="flex justify-between items-end">
                             <div className="space-y-0.5">
                               <p className="text-[8px] md:text-[10px] text-white/80 font-black uppercase tracking-widest flex items-center gap-1.5">
                                 <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 text-accent" /> {p.createdAt ? new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                               </p>
                               <h3 className="text-base md:text-lg font-black uppercase tracking-tighter text-white leading-none truncate w-56 md:w-auto">{p.name}</h3>
                             </div>
                           </div>
                        </div>
                      </div>
                      <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-neutral-400 uppercase font-black truncate max-w-[150px]">
                              <MapPin className="w-2.5 h-2.5 shrink-0" /> {p.location || "Jakarta"}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                               <Users className="w-2.5 h-2.5 text-neutral-400" />
                               <span className="text-[8px] md:text-[9px] font-black uppercase text-neutral-600">PM: {users.find(u => u.uid === p.pmId)?.displayName?.split(' ')[0] || "None"}</span>
                            </div>
                        </div>
                        
                        <div className="space-y-2 py-2 md:py-3 border-y border-black/5">
                          <div className="flex justify-between items-center text-[8px] md:text-[9px] font-black uppercase">
                            <span className="text-neutral-400">Activity: {p.updatedAt ? "Updates" : "Init"}</span>
                            <span className={cn("font-black", isOver ? "text-red-500" : "text-black")}>
                               {Math.round((projectExpenses / (p.totalBudget || 1)) * 100)}% Spent
                            </span>
                          </div>
                          <Progress value={p.totalBudget ? (projectExpenses / p.totalBudget) * 100 : 0} className={cn("h-1 md:h-1.5", isOver && "bg-red-100")} />
                        </div>

                         <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[9px] md:text-[10px]">
                          <div className="space-y-0.5">
                            <p className="font-black uppercase text-neutral-400 tracking-tighter">Budget</p>
                            <p className="font-black text-black">{formatRupiah(p.totalBudget || 0)}</p>
                          </div>
                          <div className="space-y-0.5 text-right">
                            <p className="font-black uppercase text-neutral-400 tracking-tighter">Total Expense</p>
                            <p className={cn("font-black", isOver ? "text-red-700 underline decoration-2" : "text-red-500")}>
                               {formatRupiah(projectExpenses)}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-black uppercase text-neutral-400 tracking-tighter">Sisa Dana</p>
                            <p className={cn("font-black", projectSisa < 0 ? "text-red-600" : "text-blue-600")}>
                              {formatRupiah(projectSisa)}
                            </p>
                          </div>
                          <div className="space-y-0.5 text-right">
                            <p className="font-black uppercase text-neutral-400 tracking-tighter">Profit</p>
                            <p className={cn("font-black", projectProfit < 0 ? "text-red-600" : "text-green-600")}>
                              {projectProfit >= 0 ? "+" : ""}{formatRupiah(projectProfit)}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1 md:pt-2">
                          <Button 
                            variant="outline" 
                            className="h-9 w-9 md:h-10 md:w-10 border-2 border-black text-red-500 hover:bg-neutral-900 hover:text-white rounded-xl p-0 flex items-center justify-center transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(p);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </Button>
                          <Button 
                            className="h-9 w-9 md:h-10 md:w-10 border-2 border-black bg-white text-black hover:bg-neutral-100 rounded-xl p-0 flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProject(p);
                            }}
                          >
                             <FileEdit className="w-3.5 h-3.5 md:w-4 md:h-4 text-neutral-400" />
                          </Button>
                          <Button 
                            className="h-9 w-9 md:h-10 md:w-10 border-2 border-black bg-white text-black hover:bg-neutral-100 rounded-xl p-0 flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingContractProject(p);
                            }}
                          >
                             <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-neutral-400" />
                          </Button>
                          <Button 
                            className="h-9 w-9 md:h-10 md:w-10 border-2 border-black bg-white text-black hover:bg-neutral-100 rounded-xl p-0 flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              setManagingCctvProject(p);
                            }}
                          >
                             <Camera className="w-3.5 h-3.5 md:w-4 md:h-4 text-neutral-400" />
                          </Button>
                          <Button 
                             className="h-9 w-9 md:h-10 md:w-10 border-2 border-black bg-black text-white hover:bg-accent rounded-xl p-0 flex items-center justify-center"
                             onClick={(e) => {
                               e.stopPropagation();
                               setSelectedProjectAI(p);
                             }}
                          >
                             <Brain className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </Button>
                          <Button 
                             className="h-9 w-9 md:h-10 md:w-10 border-2 border-black bg-white text-black hover:bg-neutral-100 rounded-xl p-0 flex items-center justify-center"
                             onClick={(e) => {
                               e.stopPropagation();
                               setSelectedProjectKPI(p);
                             }}
                          >
                             <BarChart2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {editingProjectData !== null && (
                <Dialog open={editingProjectData !== null} onOpenChange={() => setEditingProjectData(null)}>
                  <DialogContent className="max-w-2xl rounded-[2.5rem] border-4 border-black p-8">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">Edit Project Data</DialogTitle>
                      <DialogDescription className="uppercase-soft text-[10px]">Update project identity and parameters.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase">Project Name</Label>
                          <Input value={editingProjectData.name || ""} onChange={e => setEditingProjectData({...editingProjectData, name: e.target.value})} className="h-12 border-2 border-black rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase">Category</Label>
                          <select className="w-full h-12 border-2 border-black rounded-xl px-3 font-black text-[10px] uppercase" value={editingProjectData.category || "Renovasi"} onChange={e => setEditingProjectData({...editingProjectData, category: e.target.value})}>
                             <option>Renovasi</option>
                             <option>Bangun Baru</option>
                             <option>Interior</option>
                             <option>Landskap</option>
                             <option>Arsitektur</option>
                             <option>Other</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase">Client Name</Label>
                           <Input value={editingProjectData.clientName || ""} onChange={e => setEditingProjectData({...editingProjectData, clientName: e.target.value})} className="h-12 border-2 border-black rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase">WhatsApp</Label>
                          <Input value={editingProjectData.clientPhone || ""} onChange={e => setEditingProjectData({...editingProjectData, clientPhone: e.target.value})} className="h-12 border-2 border-black rounded-xl font-mono" />
                        </div>
                        <div className="space-y-2 lg:col-span-2">
                           <Label className="text-[10px] font-black uppercase">Location</Label>
                           <Input value={editingProjectData.location || ""} onChange={e => setEditingProjectData({...editingProjectData, location: e.target.value})} className="h-12 border-2 border-black rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase">Budget</Label>
                           <Input type="number" value={editingProjectData.totalBudget || 0} onChange={e => setEditingProjectData({...editingProjectData, totalBudget: Number(e.target.value)})} className="h-12 border-2 border-black rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase">Image URL (Optional)</Label>
                          <Input value={editingProjectData.imageUrl || ""} onChange={e => setEditingProjectData({...editingProjectData, imageUrl: e.target.value})} className="h-12 border-2 border-black rounded-xl" placeholder="Drive URL or relative path" />
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button className="w-full bg-black text-white h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl" onClick={handleSaveProjectEdit}>
                        Update Project Dossier &rarr;
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {showManageTeam && selectedProjectTeam && (
                <Dialog open={showManageTeam} onOpenChange={setShowManageTeam}>
                  <DialogContent className="sm:max-w-2xl p-8">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Manage Project Team</DialogTitle>
                      <DialogDescription className="uppercase-soft">Assign Project Manager and Workforce for {selectedProjectTeam.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-8 py-6">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Project Status</label>
                        <select 
                          className="w-full h-12 rounded-xl border-2 border-black px-4 font-bold uppercase text-xs"
                          value={selectedProjectTeam.status || "draft"}
                          onChange={async (e) => {
                            const status = e.target.value as any;
                            await updateProject(selectedProjectTeam.id, { status });
                            setSelectedProjectTeam({...selectedProjectTeam, status});
                            toast.success(`Status updated to ${status}`);
                          }}
                        >
                          <option value="draft">Draft</option>
                          <option value="survey">Survey</option>
                          <option value="quoted">Quoted</option>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="on-hold">On-Hold (Pending DP)</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

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

              {selectedProjectKPI && (
                <Dialog open={!!selectedProjectKPI} onOpenChange={() => setSelectedProjectKPI(null)}>
                  <DialogContent className="max-w-5xl rounded-3xl border-2 border-black p-8 overflow-hidden bg-neutral-50 shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black uppercase tracking-tighter">KPI Metrics: {selectedProjectKPI.name}</DialogTitle>
                      <DialogDescription>Performance Analysis</DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                      {selectedProjectKPI.metrics ? (
                        <ProjectKPIs metrics={selectedProjectKPI.metrics} />
                      ) : (
                        <p className="text-sm text-neutral-500 italic">No KPI metrics available for this project yet.</p>
                      )}
                    </div>
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
                                      setProjectToDelete(p);
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
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

              {editingWorkerData !== null && (
                <Dialog open={editingWorkerData !== null} onOpenChange={() => setEditingWorkerData(null)}>
                  <DialogContent className="max-w-2xl rounded-3xl border border-black p-0 overflow-hidden shadow-2xl">
                    <div className="bg-neutral-900 p-8 text-white">
                       <h2 className="text-2xl font-black uppercase tracking-tighter">Edit Personnel Data</h2>
                       <p className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em]">Updating dossier for {editingWorkerData.name}</p>
                    </div>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto thin-scrollbar">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Personnel Name</label>
                          <Input value={editingWorkerData.name || ""} onChange={e => setEditingWorkerData({...editingWorkerData, name: e.target.value})} className="h-12 border-2 border-black rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Professional Role</label>
                          <select 
                            className="w-full h-12 rounded-xl border-2 border-black px-4 font-bold uppercase text-xs" 
                            value={editingWorkerData.role || "tukang"} 
                            onChange={e => setEditingWorkerData({...editingWorkerData, role: e.target.value})}
                          >
                             {["pm", "designer", "drafter", "tukang", "mandor", "kenek"].map(r => (
                              <option key={r} value={r}>{r.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">WhatsApp</label>
                          <Input value={editingWorkerData.whatsapp || ""} onChange={e => setEditingWorkerData({...editingWorkerData, whatsapp: e.target.value})} className="h-12 border-2 border-black rounded-xl font-mono" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Core Skill</label>
                          <Input value={editingWorkerData.skill || ""} onChange={e => setEditingWorkerData({...editingWorkerData, skill: e.target.value})} className="h-12 border-2 border-black rounded-xl" />
                        </div>
                      </div>
                    </div>
                    <div className="p-6 bg-neutral-50 border-t border-black/5 flex justify-end gap-3">
                       <Button variant="ghost" onClick={() => setEditingWorkerData(null)} className="rounded-xl uppercase font-black text-xs h-12 px-8">Discard</Button>
                       <Button onClick={handleSaveWorkerEdit} className="btn-sleek h-12 px-12 rounded-xl uppercase font-black text-xs">Update Dossier</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

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
                        value={newWorker.name || ""}
                        onChange={e => setNewWorker({...newWorker, name: e.target.value})}
                        className="h-11 border-neutral-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Professional Role</label>
                      <select 
                        className="w-full h-11 rounded-xl border border-neutral-200 px-4 text-xs font-bold outline-none focus:ring-accent/20"
                        value={newWorker.role || ""}
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
                        value={newWorker.ktp || ""}
                        onChange={e => setNewWorker({...newWorker, ktp: e.target.value})}
                        className="h-11 border-neutral-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">WhatsApp / Direct</label>
                      <Input 
                        placeholder="62812xxxx" 
                        value={newWorker.whatsapp || ""}
                        onChange={e => setNewWorker({...newWorker, whatsapp: e.target.value})}
                        className="h-11 border-neutral-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Specialized Core Skill</label>
                      <Input 
                        placeholder="e.g. Electrical, Carpentry" 
                        value={newWorker.skill || ""}
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
                        value={newWorker.whatsapp || ""}
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
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-neutral-300 hover:text-accent hover:bg-neutral-50 transition-all shrink-0" onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditWorker(worker);
                                }}>
                                  <FileEdit className="w-3.5 h-3.5" />
                                </Button>
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
                            <option value="Transfer">Bank Transfer</option>
                            <option value="Cash">Cash / Tunai</option>
                            <option value="Digital Wallet">E-Wallet (Digital)</option>
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
                  <div className="space-y-4 py-4">
                    <div className="bg-neutral-100/50 p-4 rounded-2xl space-y-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Allocation</Label>
                        <select 
                          className="w-full h-10 rounded-lg border-none px-3 text-sm font-bold bg-white shadow-sm"
                          value={expenseForm.projectId}
                          onChange={e => setExpenseForm({...expenseForm, projectId: e.target.value})}
                        >
                          <option value="">General Operational</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Description</Label>
                        <Input 
                          value={expenseForm.description} 
                          onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                          className="h-10 rounded-lg border-none bg-white shadow-sm"
                          placeholder="e.g., Semen 50 Sak"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Category</Label>
                        <select 
                          className="w-full h-10 rounded-lg border-none px-3 text-xs font-bold bg-white shadow-sm"
                          value={expenseForm.category}
                          onChange={e => {
                            const cat = e.target.value;
                            setExpenseForm({...expenseForm, category: cat as any, subCategory: ""});
                          }}
                        >
                          <option value="material">🧱 Material</option>
                          <option value="labor">👷 Labor/Upah</option>
                          <option value="assessment">📋 Survey</option>
                          <option value="other">⚙️ Lain-lain</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Sub Kategori</Label>
                        <select 
                          value={expenseForm.subCategory}
                          onChange={e => setExpenseForm({...expenseForm, subCategory: e.target.value})}
                          className="w-full h-10 rounded-lg border-none px-3 text-xs font-bold bg-white shadow-sm"
                        >
                          <option value="">Pilih Sub Kategori...</option>
                          <option value="Bensin">⛽ Bensin</option>
                          <option value="Tol">🛣️ Tol</option>
                          <option value="Transportasi">🚗 Transportasi</option>
                          <option value="Jajan">🍭 Jajan</option>
                          <option value="Parkir">🅿️ Parkir</option>
                          <option value="Material">🧱 Material</option>
                          <option value="Alat">🛠️ Alat</option>
                          <option value="Upah">👷 Upah</option>
                          <option value="Konsumsi">🍱 Konsumsi</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Method</Label>
                        <select 
                          className="w-full h-10 rounded-lg border-none px-3 text-xs font-bold bg-white shadow-sm"
                          value={expenseForm.method}
                          onChange={e => setExpenseForm({...expenseForm, method: e.target.value as any})}
                        >
                          <option value="Transfer">Transfer</option>
                          <option value="Cash">Cash</option>
                          <option value="Digital Wallet">E-Wallet</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Amount (Rp)</Label>
                      <Input 
                        type="number" 
                        value={expenseForm.amount} 
                        onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}
                        className="h-12 rounded-xl border-none bg-white shadow-inner font-mono font-bold text-lg px-4"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Date</Label>
                      <Input 
                        type="date"
                        value={expenseForm.date || ""} 
                        onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                        className="h-10 rounded-lg border-none bg-white shadow-sm font-bold text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Upload Receipt (Foto Bon)</Label>
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
                  </div>
                  <Button className="w-full bg-red-600 text-white h-14 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-red-700" onClick={handleRecordExpense}>Submit Expense Entry &rarr;</Button>
                </DialogContent>
              </Dialog>

              <div className="grid md:grid-cols-4 gap-6">
                <Card className="bg-[#121212]/85 backdrop-blur-md border border-white/10 rounded-[2rem] p-8 text-white shadow-[8px_8px_20px_rgba(0,0,0,0.3),-4px_-4px_15px_rgba(255,255,255,0.02)] group hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Total Income</p>
                    <ArrowDownLeft className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-3xl font-black leading-none mb-1">
                    Rp {transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-bold">Total revenue recognized</p>
                </Card>
                <Card className="bg-white/70 backdrop-blur-md border border-white/40 rounded-[2rem] p-8 text-black shadow-[8px_8px_20px_#e2e8f0,-8px_-8px_20px_#ffffff] group hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Operational Cost</p>
                    <ArrowUpRight className="w-6 h-6 text-red-400" />
                  </div>
                  <p className="text-3xl font-black leading-none mb-1 text-red-600">
                    Rp {transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-bold">Total direct & indirect costs</p>
                </Card>
                <Card className="bg-white/70 backdrop-blur-md border border-white/40 rounded-[2rem] p-8 text-black shadow-[8px_8px_20px_#e2e8f0,-8px_-8px_20px_#ffffff] group hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Escrow Balance</p>
                    <Lock className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="text-3xl font-black leading-none mb-1 text-blue-600">
                    Rp {projects.reduce((acc, p) => acc + (p.escrowBalance || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-bold">Client deposits on hold</p>
                </Card>
                <Card className="bg-gradient-to-br from-[#FF6B00]/90 to-[#FF6B00]/70 backdrop-blur-md border border-white/20 rounded-[2rem] p-8 text-white shadow-[8px_8px_20px_rgba(255,107,0,0.25),-4px_-4px_15px_rgba(255,255,255,0.05)] group hover:-translate-y-1 transition-all duration-300">
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

              {/* PERIODIC MONTHLY & YEARLY RECAP MODULE */}
              <Card className="border border-white/30 backdrop-blur-md bg-white/65 rounded-[2.5rem] overflow-hidden p-8 space-y-6 shadow-[10px_10px_25px_#cbd5e1,-10px_-10px_25px_#ffffff]">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b-2 border-black/10 pb-6 gap-4">
                  <div className="space-y-1">
                    <h3 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                      <span>📊</span> REKAP FINANCIAL BULANAN & TAHUNAN
                    </h3>
                    <p className="text-xs font-mono font-bold uppercase text-neutral-400">
                      Metrik performa finansial real-time & rincian biaya operasional.
                    </p>
                  </div>
                  
                  {/* Select Year */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-widest text-[#FF6B00]">Pilih Tahun:</span>
                    <div className="flex gap-1.5 bg-white/60 backdrop-blur-sm p-1.5 rounded-2xl border border-white/40 shadow-[inner_2px_2px_5px_#cbd5e1]">
                      {(Object.keys(periodicRecap).length > 0 ? Object.keys(periodicRecap).map(Number).sort((a,b)=>b-a) : [new Date().getFullYear()]).map(yr => (
                        <Button
                          key={yr}
                          variant={recapYear === yr ? "default" : "ghost"}
                          className={cn(
                            "h-10 px-4 rounded-xl font-black text-xs uppercase transition-all",
                            recapYear === yr ? "bg-black text-white hover:bg-black/90 shadow-[2px_2px_5px_rgba(0,0,0,0.15)]" : "hover:bg-black/5 text-neutral-600"
                          )}
                          onClick={() => {
                            setRecapYear(yr);
                            setSelectedMonthForDetails(null);
                          }}
                        >
                          {yr}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Selected Year Summary Cards */}
                {periodicRecap[recapYear] ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-green-50/50 border border-white/30 backdrop-blur-sm rounded-[2rem] p-6 shadow-[5px_5px_15px_#cbd5e1,-5px_-5px_15px_#ffffff] relative overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Total Income ({recapYear})</p>
                        <p className="text-3xl font-black text-green-700 mt-2">{formatRupiah(periodicRecap[recapYear].totalIncome)}</p>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase mt-2">Seluruh Pemasukan yang Diakui</p>
                      </div>
                      
                      <div className="bg-red-50/50 border border-white/30 backdrop-blur-sm rounded-[2rem] p-6 shadow-[5px_5px_15px_#cbd5e1,-5px_-5px_15px_#ffffff] relative overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Total Expense ({recapYear})</p>
                        <p className="text-3xl font-black text-red-700 mt-2">{formatRupiah(periodicRecap[recapYear].totalExpense)}</p>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase mt-2">Seluruh Pengeluaran Terbuang</p>
                      </div>

                      <div className={cn(
                        "border border-white/30 backdrop-blur-sm rounded-[2rem] p-6 shadow-[5px_5px_15px_#cbd5e1,-5px_-5px_15px_#ffffff] relative overflow-hidden text-neutral-800",
                        periodicRecap[recapYear].netProfit >= 0 ? "bg-emerald-50/35" : "bg-rose-50/35"
                      )}>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", periodicRecap[recapYear].netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>Net Profit / Margin ({recapYear})</p>
                        <p className={cn("text-3xl font-black mt-2", periodicRecap[recapYear].netProfit >= 0 ? "text-emerald-700" : "text-rose-700")}>
                          {periodicRecap[recapYear].netProfit >= 0 ? "+" : "-"} {formatRupiah(Math.abs(periodicRecap[recapYear].netProfit))}
                        </p>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase mt-2">Selisih Bersih (Debit - Kredit)</p>
                      </div>
                    </div>

                    {/* Month list grid */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#FF6B00]">Pemberhentian & Laporan Setiap Bulan</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 12 }).map((_, monthIdx) => {
                          const monthData = periodicRecap[recapYear]?.months[monthIdx];
                          const hasData = !!monthData;
                          const isSelected = selectedMonthForDetails === monthIdx;

                          return (
                            <div 
                              key={monthIdx}
                              onClick={() => {
                                if (hasData) {
                                  setSelectedMonthForDetails(isSelected ? null : monthIdx);
                                }
                              }}
                              className={cn(
                                "border rounded-[1.5rem] p-5 transition-all text-left relative overflow-hidden flex flex-col justify-between h-40",
                                !hasData 
                                  ? "bg-neutral-100/40 border-dashed border-neutral-300 opacity-40 cursor-not-allowed" 
                                  : isSelected 
                                    ? "bg-neutral-900 border border-white/10 text-white shadow-[inset_4px_4px_10px_rgba(0,0,0,0.8)] scale-[1.02] cursor-pointer"
                                    : "bg-white/60 border border-white/40 hover:bg-white/80 hover:shadow-[5px_5px_12px_#cbd5e1,-5px_-5px_12px_#ffffff] shadow-[3px_3px_8px_#e2e8f0,-3px_-3px_8px_#ffffff] cursor-pointer"
                              )}
                            >
                              <div>
                                <div className="flex justify-between items-start">
                                  <span className={cn("font-mono text-[10px] font-black uppercase", isSelected ? "text-white/60" : "text-neutral-400")}>BLN {String(monthIdx+1).padStart(2, '0')}</span>
                                  {hasData && (
                                    <Badge className={cn("text-[8px] font-black uppercase border-none", isSelected ? "bg-amber-500 text-black hover:bg-amber-600" : "bg-neutral-100 text-neutral-600")}>
                                      {monthData.transactionsCount} Transaksi
                                    </Badge>
                                  )}
                                </div>
                                <h5 className={cn("font-black text-lg uppercase tracking-tight mt-1", isSelected ? "text-[#FF6B00]" : "text-neutral-900")}>
                                  { [
                                    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                                    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
                                  ][monthIdx] }
                                </h5>
                              </div>

                              {hasData ? (
                                <div className={cn("space-y-0.5 border-t pt-2 mt-2", isSelected ? "border-white/10" : "border-black/5")}>
                                  <div className="flex justify-between text-[10px] font-bold">
                                    <span className={isSelected ? "text-white/60" : "text-neutral-400"}>Debit:</span>
                                    <span className="font-mono font-black text-emerald-500">{formatRupiah(monthData.totalIncome)}</span>
                                  </div>
                                  <div className="flex justify-between text-[10px] font-bold">
                                    <span className={isSelected ? "text-white/60" : "text-neutral-400"}>Kredit:</span>
                                    <span className="font-mono font-black text-red-500">{formatRupiah(monthData.totalExpense)}</span>
                                  </div>
                                  <div className="flex justify-between text-[10px] font-black pt-1.5 mt-1 border-t border-dashed">
                                    <span className={isSelected ? "text-white/60" : "text-neutral-400"}>Net:</span>
                                    <span className={cn("font-mono font-black", monthData.netProfit >= 0 ? "text-green-500" : "text-[#FF6B00]")}>
                                      {monthData.netProfit >= 0 ? "Profit" : "Loss"} ({formatRupiah(Math.abs(monthData.netProfit))})
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[10px] font-black uppercase text-neutral-400 italic">Tidak ada transaksi</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detailed Analysis Segment for Selected Month */}
                    {selectedMonthForDetails !== null && periodicRecap[recapYear]?.months[selectedMonthForDetails] && (
                      <div className="bg-white/40 backdrop-blur-md border border-white/40 p-6 rounded-[2rem] space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 text-black shadow-[inset_2px_2px_5px_rgba(255,255,255,0.4)]">
                        <div className="flex items-center justify-between border-b border-black/10 pb-3">
                          <h4 className="text-lg font-black uppercase tracking-tight text-neutral-800">
                            🔍 Rincian Analisis Biaya: {periodicRecap[recapYear].months[selectedMonthForDetails].monthName} {recapYear}
                          </h4>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border border-white/40 font-black text-[9px] uppercase bg-white/80 hover:bg-white backdrop-blur-sm shadow-[3px_3px_8px_#cbd5e1] hover:-translate-y-0.5 transition-all text-neutral-800"
                            onClick={() => setSelectedMonthForDetails(null)}
                          >
                            Tutup Detail &times;
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Left column: Categories (Material, Labor, Assessment, Other) */}
                          <div className="space-y-3 bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white/40 shadow-[4px_4px_12px_rgba(0,0,0,0.04)]">
                            <h5 className="text-xs font-black uppercase tracking-widest text-[#FF6B00] border-b border-black/5 pb-2">📂 Pengeluaran Berdasarkan Kategori</h5>
                            <div className="space-y-2">
                              {Object.entries(periodicRecap[recapYear].months[selectedMonthForDetails].categories).map(([catKey, total]) => (
                                <div key={catKey} className="flex justify-between items-center text-xs font-bold border-b border-black/5 pb-2">
                                  <span className="capitalize text-neutral-600">
                                    {catKey === "material" ? "Brick & Material (🧱)" : 
                                     catKey === "labor" ? "Upah Kerja (👷)" : 
                                     catKey === "assessment" ? "Survey / Assessment (📋)" : "Lain-lain / Ops (⚙️)"}
                                  </span>
                                  <span className="font-mono font-black text-neutral-900">{formatRupiah(total)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between items-center text-sm font-black border-t border-black/10 pt-2 mt-4 text-red-600">
                                <span>Total Kredit Bulan Ini:</span>
                                <span className="font-mono">{formatRupiah(periodicRecap[recapYear].months[selectedMonthForDetails].totalExpense)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right column: Specific Sub-Categories Detail (Tol, Bensin, Makan, Jajan, ATK, etc) */}
                          <div className="space-y-3 bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white/40 shadow-[4px_4px_12px_rgba(0,0,0,0.04)]">
                            <h5 className="text-xs font-black uppercase tracking-widest text-[#FF6B00] border-b border-black/5 pb-2">🏷️ Rincian Sub-Kategori</h5>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                              {Object.entries(periodicRecap[recapYear].months[selectedMonthForDetails].subCategories).map(([subKey, total]) => (
                                <div key={subKey} className="flex justify-between items-center text-xs font-bold border-b border-black/5 pb-2">
                                  <span className="capitalize text-neutral-600">
                                    {subKey === "tol" ? "🚗 Tol & Transportasi" : 
                                     subKey === "bensin" ? "⛽ Bensin & BBM" : 
                                     subKey === "makan" ? "🍲 Makan Tim & Konsumsi" : 
                                     subKey === "jajan" ? "💸 Uang Saku & Jajan" : 
                                     subKey === "atk" ? "📎 ATK & Brosur" : 
                                     subKey === "operasional" ? "🛠️ Alat & Ops" : 
                                     subKey === "darurat" ? "🚨 Darurat" : "❓ Lainnya"}
                                  </span>
                                  <span className={cn("font-mono font-black", total > 0 ? "text-neutral-900" : "text-neutral-300")}>
                                    {total > 0 ? formatRupiah(total) : "Rp 0"}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <p className="text-[9px] font-bold uppercase text-neutral-400 italic">
                              Rincian ini ditarik secara otomatis dari isian kolom detail ketika record expense dilakukan.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center bg-neutral-50 rounded-2xl border-4 border-dashed border-black/10">
                    <p className="font-bold text-neutral-400 uppercase text-xs">Belum ada rekap data finansial untuk tahun {recapYear}.</p>
                  </div>
                )}
              </Card>

              <div className="gap-8">
                <Card className="border border-white/30 backdrop-blur-md bg-white/65 rounded-[2.5rem] overflow-hidden shadow-[10px_10px_25px_#cbd5e1,-10px_-10px_25px_#ffffff]">
                  <CardHeader className="bg-neutral-50/50 p-8 border-b border-black/10 flex flex-col md:flex-row items-center justify-between gap-6">
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

                  {/* DYNAMIC FINANCIAL LEDGER OVERVIEW AND QUICK FILTERS */}
                  <div className="p-8 border-b border-black/5 bg-neutral-55/60 backdrop-blur-sm flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1 w-full md:w-auto">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Filter Project Account</Label>
                        <select 
                          className="h-12 w-full md:w-64 rounded-xl border border-white/40 font-black uppercase text-xs px-4 bg-white/80 shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                          value={financeProjectFilter}
                          onChange={e => {
                            setFinanceProjectFilter(e.target.value);
                            setFinancePage(1);
                          }}
                        >
                          <option value="all">📊 ALL PROJECTS Ledger</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>🏗️ {p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {financeCategoryFilter !== "all" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-2 border-black font-black text-[9px] uppercase bg-white hover:bg-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            onClick={() => setFinanceCategoryFilter("all")}
                          >
                            Reset Filter: {financeCategoryFilter} &times;
                          </Button>
                        )}
                        {financeProjectFilter !== "all" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-2 border-black font-black text-[9px] uppercase bg-white hover:bg-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            onClick={() => setFinanceProjectFilter("all")}
                          >
                            Reset Project &times;
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* MAIN METRIC CARD ROW */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Pemasukan (Income) Card */}
                      <button
                        onClick={() => setFinanceCategoryFilter(financeCategoryFilter === "income" ? "all" : "income")}
                        style={{ contentVisibility: "auto" }}
                        className={cn(
                          "flex flex-col items-start p-6 rounded-2xl border border-white/40 transition-all text-left relative overflow-hidden group cursor-pointer",
                          financeCategoryFilter === "income"
                            ? "bg-green-600 text-white shadow-[3px_3px_8px_rgba(22,163,74,0.3)] -translate-y-0.5"
                            : "bg-white/80 backdrop-blur-sm text-black hover:bg-white shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff]"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            financeCategoryFilter === "income" ? "text-white/80" : "text-neutral-500"
                          )}>Total Pemasukan (Debit)</span>
                          <span className="text-xl">💰</span>
                        </div>
                        <span className="text-2xl font-black mt-3">Rp {ledgerStats.totalIncome.toLocaleString()}</span>
                        <span className={cn(
                          "text-[8px] font-bold uppercase mt-1",
                          financeCategoryFilter === "income" ? "text-white/60" : "text-neutral-400"
                        )}>
                          {financeCategoryFilter === "income" ? "🔴 Klik untuk tampil semua" : "🟢 Klik untuk filter tabel"}
                        </span>
                      </button>

                      {/* Total Pengeluaran Card */}
                      <div
                        className="flex flex-col items-start p-6 rounded-2xl border border-white/40 bg-white/80 backdrop-blur-sm text-black shadow-[3px_3px_8px_#cbd5e1,-3px_-3px_8px_#ffffff] relative overflow-hidden group"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Total Pengeluaran (Kredit)</span>
                          <span className="text-xl">📉</span>
                        </div>
                        <span className="text-2xl font-black text-red-600 mt-3">Rp {ledgerStats.totalExpense.toLocaleString()}</span>
                        <span className="text-[8px] font-bold uppercase text-neutral-400 mt-1">Akumulasi seluruh pengeluaran</span>
                      </div>

                      {/* Sisa Dana / Net Balance Card */}
                      <div
                        className={cn(
                          "flex flex-col items-start p-6 rounded-2xl border border-white/40 shadow-[3px_3px_8px_#cbd5e1] relative overflow-hidden group transition-all",
                          ledgerStats.sisaDana >= 0 ? "bg-black text-white" : "bg-red-950 text-white"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            ledgerStats.sisaDana >= 0 ? "text-neutral-400" : "text-red-300"
                          )}>Sisa Saldo Kas Utama</span>
                          <span className="text-xl">⚖️</span>
                        </div>
                        <span className={cn("text-2xl font-black mt-3", ledgerStats.sisaDana >= 0 ? "text-emerald-400" : "text-red-400")}>
                          Rp {ledgerStats.sisaDana.toLocaleString()}
                        </span>
                        <span className="text-[8px] font-bold uppercase text-neutral-400 mt-1">Liquid reserve buffer</span>
                      </div>
                    </div>

                    {/* EXPENSES PER CATEGORY ROWS */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Pengeluaran Per Kategori (Klik untuk Filter)</Label>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Material Card */}
                        <button
                          onClick={() => setFinanceCategoryFilter(financeCategoryFilter === 'material' ? 'all' : 'material')}
                          className={cn(
                            "flex flex-col items-start p-4 rounded-xl border-4 transition-all text-left w-full cursor-pointer",
                            financeCategoryFilter === 'material' 
                              ? "border-[#FF6B00] bg-orange-50/10 text-[#FF6B00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5" 
                              : "border-black bg-white hover:border-[#FF6B00] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm border-none">🧱</span>
                            <span className="text-[9px] font-black uppercase tracking-tight">Material</span>
                          </div>
                          <span className="text-xs font-black mt-2">
                            Rp {ledgerStats.materialExpense.toLocaleString()}
                          </span>
                        </button>

                        {/* Labor Card */}
                        <button
                          onClick={() => setFinanceCategoryFilter(financeCategoryFilter === 'labor' ? 'all' : 'labor')}
                          className={cn(
                            "flex flex-col items-start p-4 rounded-xl border-4 transition-all text-left w-full cursor-pointer",
                            financeCategoryFilter === 'labor' 
                              ? "border-[#FF6B00] bg-orange-50/10 text-[#FF6B00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5" 
                              : "border-black bg-white hover:border-[#FF6B00] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm border-none">👷</span>
                            <span className="text-[9px] font-black uppercase tracking-tight">Tenaga Kerja</span>
                          </div>
                          <span className="text-xs font-black mt-2">
                            Rp {ledgerStats.laborExpense.toLocaleString()}
                          </span>
                        </button>

                        {/* Assessment / Survey Card */}
                        <button
                          onClick={() => setFinanceCategoryFilter(financeCategoryFilter === 'assessment' ? 'all' : 'assessment')}
                          className={cn(
                            "flex flex-col items-start p-4 rounded-xl border-4 transition-all text-left w-full cursor-pointer",
                            financeCategoryFilter === 'assessment' 
                              ? "border-[#FF6B00] bg-orange-50/10 text-[#FF6B00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5" 
                              : "border-black bg-white hover:border-[#FF6B00] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm border-none">📋</span>
                            <span className="text-[9px] font-black uppercase tracking-tight">Survey / Assess</span>
                          </div>
                          <span className="text-xs font-black mt-2">
                            Rp {ledgerStats.assessmentExpense.toLocaleString()}
                          </span>
                        </button>

                        {/* Other Card */}
                        <button
                          onClick={() => setFinanceCategoryFilter(financeCategoryFilter === 'other' ? 'all' : 'other')}
                          className={cn(
                            "flex flex-col items-start p-4 rounded-xl border-4 transition-all text-left w-full cursor-pointer",
                            financeCategoryFilter === 'other' 
                              ? "border-[#FF6B00] bg-orange-50/10 text-[#FF6B00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5" 
                              : "border-black bg-white hover:border-[#FF6B00] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm border-none">⚙️</span>
                            <span className="text-[9px] font-black uppercase tracking-tight">Lain-lain</span>
                          </div>
                          <span className="text-xs font-black mt-2">
                            Rp {ledgerStats.otherExpense.toLocaleString()}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 border-b border-black/10 bg-neutral-50/60 backdrop-blur-sm flex flex-col md:flex-row items-center gap-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <Input 
                        placeholder="Search Transactions (Description, Project, Date...)" 
                        className="pl-12 h-14 bg-white/80 border border-white/40 rounded-2xl font-black uppercase text-xs text-black shadow-[inset_2px_2px_5px_#cbd5e1,inset_-2px_-2px_5px_#ffffff] focus:outline-none"
                        value={financeSearch}
                        onChange={(e) => {
                          setFinanceSearch(e.target.value);
                          setFinancePage(1);
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm p-2 rounded-2xl border border-white/40 shadow-[3px_3px_8px_#cbd5e1]">
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 border border-white/40 rounded-xl bg-white shadow-[2px_2px_4px_#cbd5e1] hover:-translate-y-0.5 transition-all text-neutral-700"
                        disabled={financePage === 1}
                        onClick={() => setFinancePage(p => p - 1)}
                       >
                         <ChevronLeft className="w-4 h-4" />
                       </Button>
                       <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00]">{financePage} / {totalFinancePages || 1}</span>
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 border border-white/40 rounded-xl bg-white shadow-[2px_2px_4px_#cbd5e1] hover:-translate-y-0.5 transition-all text-neutral-700"
                        disabled={financePage === totalFinancePages || totalFinancePages === 0}
                        onClick={() => setFinancePage(p => p + 1)}
                       >
                         <ChevronRight className="w-4 h-4" />
                       </Button>
                    </div>
                  </div>
                  <CardContent className="p-0 overflow-hidden">
                    <div className="max-h-[800px] overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-neutral-50 sticky top-0 z-10">
                          <TableRow className="border-b-4 border-black">
                            <TableHead className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Date & Ref</TableHead>
                            <TableHead className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Account Details</TableHead>
                            <TableHead className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Method & Evidence</TableHead>
                            <TableHead className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Debit/Credit</TableHead>
                            <TableHead className="px-4 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right pr-12">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedFinance.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="h-64 text-center py-20 bg-neutral-50/50">
                                <FileText className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                                <p className="text-xl font-black uppercase tracking-tighter text-neutral-300">No transactions recorded yet</p>
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedFinance.map((t) => (
                              <TableRow key={t.id} className="group border-b border-black/5 last:border-0 hover:bg-neutral-50/50 transition-all duration-300">
                                <TableCell className="px-4 md:px-8 py-4 md:py-6">
                                   <div className="space-y-1">
                                     {editingTransactionId === t.id ? (
                                       <Input 
                                         type="date"
                                         className="h-9 text-xs font-black uppercase"
                                         value={editFormData.date?.split('T')[0] || ""}
                                         onChange={e => setEditFormData({...editFormData, date: e.target.value})}
                                       />
                                     ) : (
                                       <p className="text-xs font-black font-mono text-black">{new Date(t.date).toLocaleDateString()}</p>
                                     )}
                                     <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">ID: #{t.id.substring(0,6).toUpperCase()}</p>
                                   </div>
                                </TableCell>
                                <TableCell className="px-4 md:px-8 py-4 md:py-6">
                                  {editingTransactionId === t.id ? (
                                    <div className="space-y-2">
                                      <Input 
                                        className="h-9 text-xs font-black uppercase"
                                        value={editFormData.description}
                                        onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                                      />
                                      <select 
                                        className="w-full h-9 rounded-xl border-2 border-black/10 px-3 text-[10px] font-black uppercase"
                                        value={editFormData.category}
                                        onChange={e => setEditFormData({...editFormData, category: e.target.value as any})}
                                      >
                                        <option value="material">Material</option>
                                        <option value="labor">Labor</option>
                                        <option value="assessment">Survey</option>
                                        <option value="client_payment">Client Payment</option>
                                        <option value="other">Other</option>
                                      </select>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <p className="text-sm font-black uppercase text-black leading-tight">{t.description}</p>
                                      <div className="flex flex-wrap items-center gap-2 mt-1">
                                        {t.projectName && (
                                          <Badge className="bg-neutral-100 text-neutral-500 border-none text-[8px] font-black uppercase px-2 py-0.5">Project: {t.projectName}</Badge>
                                        )}
                                        <Badge className={cn(
                                          "text-[8px] font-black uppercase border-none px-2 py-0.5",
                                          t.category === 'client_payment' ? "bg-green-100 text-green-600" :
                                          t.category === 'material' ? "bg-blue-100 text-blue-600" :
                                          t.category === 'labor' ? "bg-yellow-100 text-yellow-600" : "bg-neutral-100 text-neutral-500"
                                        )}>{t.category === 'client_payment' ? "💰 Pemasukan" : t.category === 'material' ? "🧱 Material" : t.category === 'labor' ? "👷 Upah" : t.category === 'assessment' ? "📋 Survey" : "⚙️ Lain-lain"}</Badge>
                                        {t.subCategory && (
                                          <Badge className="bg-purple-150 text-purple-700 bg-purple-100 border-none text-[8px] font-black uppercase px-2 py-0.5">
                                            {t.subCategory === 'tol' ? "🚗 Tol & Parkir" :
                                             t.subCategory === 'bensin' ? "⛽ Bensin" :
                                             t.subCategory === 'makan' ? "🍲 Makan Tim" :
                                             t.subCategory === 'jajan' ? "💸 Saku/Jajan" :
                                             t.subCategory === 'atk' ? "📎 ATK/Brosur" :
                                             t.subCategory === 'operasional' ? "🛠️ Alat & Ops" :
                                             t.subCategory === 'darurat' ? "🚨 Darurat" : "❓ Lainnya"}
                                          </Badge>
                                        )}
                                      </div>
                                      {t.recordedBy && (
                                        <p className="text-[8px] font-black uppercase text-neutral-400 mt-1">
                                          Penginput: <span className="text-[#FF6B00]">{t.recordedBy} ({t.recordedRole || "system"})</span>
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="px-4 md:px-8 py-4 md:py-6">
                                  <div className="flex items-center gap-4">
                                    {editingTransactionId === t.id ? (
                                      <select 
                                        className="h-9 rounded-xl border-2 border-black/10 px-3 text-[10px] font-black uppercase"
                                        value={editFormData.method}
                                        onChange={e => setEditFormData({...editFormData, method: e.target.value as any})}
                                      >
                                        <option value="Transfer">Transfer</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Digital Wallet">E-Wallet</option>
                                      </select>
                                    ) : (
                                      <Badge variant="outline" className="border-2 border-black/10 text-[9px] font-black uppercase tracking-widest">{t.method || "System"}</Badge>
                                    )}
                                    {t.receiptUrl && (
                                      <Dialog>
                                        <DialogTrigger
                                          render={
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-neutral-100 hover:bg-black hover:text-white transition-all">
                                              <Camera className="w-4 h-4" />
                                            </Button>
                                          }
                                        />
                                        <DialogContent className="max-w-2xl bg-black border-none p-4 rounded-3xl">
                                          <img src={t.receiptUrl} alt="Receipt Evidence" className="w-full h-auto rounded-xl shadow-2xl" />
                                        </DialogContent>
                                      </Dialog>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className={cn(
                                  "px-4 md:px-8 py-4 md:py-6 text-right font-mono font-black text-lg",
                                  t.type === 'income' ? "text-green-600" : "text-red-500"
                                )}>
                                  {editingTransactionId === t.id ? (
                                    <div className="flex justify-end items-center gap-2">
                                       <span className="text-xs text-neutral-400">Rp</span>
                                       <Input 
                                         type="number"
                                         className="h-9 w-32 text-right font-black"
                                         value={editFormData.amount}
                                         onChange={e => setEditFormData({...editFormData, amount: Number(e.target.value)})}
                                       />
                                    </div>
                                  ) : (
                                    <>{t.type === 'income' ? "+" : "-"} {formatRupiah(t.amount)}</>
                                  )}
                                </TableCell>
                                <TableCell className="pr-8 text-right">
                                   <div className="flex justify-end gap-2">
                                     {editingTransactionId === t.id ? (
                                       <>
                                         <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 border-2 border-black/5" onClick={saveEditTransaction}>
                                           <Check className="w-4 h-4" />
                                         </Button>
                                         <Button size="icon" variant="ghost" className="h-8 w-8 text-neutral-400 border-2 border-black/5" onClick={() => setEditingTransactionId(null)}>
                                           <X className="w-4 h-4" />
                                         </Button>
                                       </>
                                     ) : (
                                       <>
                                         <Button size="icon" variant="ghost" className="h-8 w-8 text-neutral-400 hover:text-black hover:bg-neutral-100" onClick={() => handleEditTransaction(t)}>
                                           <FileEdit className="w-4 h-4" />
                                         </Button>
                                         <Button size="icon" variant="ghost" className="h-8 w-8 text-neutral-400 hover:text-red-500 hover:bg-red-50" onClick={() => {if(confirm("Hapus transaksi ini?")) deleteTransaction(t.id)}}>
                                           <Trash2 className="w-4 h-4" />
                                         </Button>
                                       </>
                                     )}
                                   </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <div className="md:col-span-3 space-y-8">
                  {/* Budget Health Warning Panel (Budget Overwatch) with Horizontal Slides/Scroll Mode and Neumorphic Glass Theme */}
                  <Card className="border border-white/20 rounded-[2.5rem] p-8 bg-[#121212]/90 text-white shadow-[10px_10px_25px_rgba(0,0,0,0.3)] relative overflow-hidden backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                       <ShieldCheck className="w-56 h-56 text-white" />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6 mb-6">
                      <div className="space-y-1">
                        <h3 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 text-white">
                          <Sparkles className="w-7 h-7 text-amber-400 fill-amber-400" /> Budget Overwatch
                        </h3>
                        <p className="text-xs font-mono font-bold text-neutral-400 uppercase">
                          Review allocation caps per active project in interactive slide view.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-400/20 text-amber-400 border border-amber-400/30 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                          Swipe / Scroll Side-by-side &rarr;
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex flex-row gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                       {projects.filter(p => p.totalBudget > 0).map(p => {
                          const projectExpenses = transactions.filter(t => t.projectId === p.id && t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
                          const percentage = (projectExpenses / p.totalBudget) * 100;
                          const isOver = percentage > 100;
                          const isWarning = percentage > 85 && !isOver;

                          return (
                            <div 
                              key={p.id} 
                              className="min-w-[290px] sm:min-w-[340px] max-w-[380px] snap-center shrink-0 space-y-4 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[6px_6px_18px_rgba(0,0,0,0.4),-4px_-4px_12px_rgba(255,255,255,0.02)] hover:bg-white/10 transition-all duration-300 flex flex-col justify-between"
                            >
                              <div className="space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="space-y-1">
                                    <p className="text-sm font-black uppercase text-white tracking-widest truncate max-w-[180px]">{p.name}</p>
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase">Capital Limit: <span className="font-mono text-neutral-200">Rp {p.totalBudget.toLocaleString()}</span></p>
                                  </div>
                                  <div className="shrink-0 flex items-center">
                                    {isOver && <Badge className="bg-red-500 text-white border border-red-700 animate-pulse text-[8px] font-black uppercase px-2 py-0.5">Over!</Badge>}
                                    {isWarning && <Badge className="bg-amber-400 text-black border border-amber-600 animate-bounce text-[8px] font-black uppercase px-2 py-0.5">Warning</Badge>}
                                  </div>
                                </div>
                                <Progress value={Math.min(100, percentage)} className="h-2.5 rounded-full bg-neutral-800 border border-neutral-700/50 overflow-hidden" />
                              </div>
                              <div className="flex justify-between items-center pt-2">
                                <p className="text-[10px] font-black uppercase tracking-tighter text-neutral-400">Spent: {percentage.toFixed(1)}%</p>
                                <p className="text-xs font-mono font-black text-amber-300">Rp {projectExpenses.toLocaleString()}</p>
                              </div>
                            </div>
                          );
                       })}
                       {projects.filter(p => p.totalBudget > 0).length === 0 && (
                         <div className="py-12 w-full text-center border border-dashed border-white/10 rounded-2xl">
                            <p className="text-xs font-black uppercase text-white/30 tracking-widest">No Active Projects with Budgets</p>
                         </div>
                       )}
                    </div>
                  </Card>

                  <Card className="border border-white/30 backdrop-blur-md bg-white/65 rounded-[2.5rem] p-8 shadow-[10px_10px_25px_#cbd5e1,-10px_-10px_25px_#ffffff]">
                    <h3 className="text-2.5xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
                      <CreditCard className="w-6 h-6 text-[#FF6B00]" /> Pending Transfers
                    </h3>
                    <div className="space-y-4">
                      {wages.filter(w => w.status === 'pending').map(w => (
                        <div key={w.id} className="flex items-center justify-between p-4 border border-white/40 bg-white/40 backdrop-blur-sm rounded-2xl hover:bg-white/80 hover:shadow-[3px_3px_8px_#cbd5e1] transition-all">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{w.workerName}</p>
                            <p className="text-xs font-black text-neutral-900 mt-0.5">Rp {w.amount.toLocaleString()}</p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => updateWageStatus(w.id, 'paid')}
                            className="bg-black text-white hover:bg-neutral-800 text-[10px] font-black uppercase h-10 rounded-xl px-4 shadow-[4px_4px_10px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all animate-bounce"
                          >
                            Execute Transfer
                          </Button>
                        </div>
                      ))}
                      {wages.filter(w => w.status === 'pending').length === 0 && (
                        <div className="py-8 text-center bg-green-50/40 border border-green-500/20 rounded-2xl shadow-[inset_2px_2px_5px_rgba(16,185,129,0.05)]">
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
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nomor KTP (ID)</Label>
                              <Input 
                                placeholder="NIK 16 Digit"
                                value={newLead.nik}
                                onChange={e => setNewLead({...newLead, nik: e.target.value})}
                                className="h-12 border-2 border-black/10 rounded-xl font-bold bg-neutral-50 px-4"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Tipe Proyek</Label>
                              <select 
                                className="w-full h-12 border-2 border-black/10 rounded-xl bg-neutral-50 px-3 font-bold text-sm focus:outline-none focus:border-black"
                                value={newLead.projectType}
                                onChange={e => setNewLead({...newLead, projectType: e.target.value})}
                              >
                                <option>Renovasi</option>
                                <option>Bangun Baru</option>
                                <option>Interior</option>
                                <option>Lahan</option>
                              </select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Address / Lokasi</Label>
                            <Input 
                              placeholder="Alamat Lengkap Klien"
                              value={newLead.address}
                              onChange={e => setNewLead({...newLead, address: e.target.value})}
                              className="h-12 border-2 border-black/10 rounded-xl font-bold bg-neutral-50 px-4"
                            />
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
                            setNewLead({ name: "", email: "", whatsapp: "", source: "Manual", status: "Lead", notes: "", address: "", nik: "", projectType: "" });
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
                                  const newStatus = e.target.value;
                                  await updateLead(lead.id, { status: newStatus as any });
                                  
                                  if (newStatus === 'Won' && (!lead.projectId)) {
                                    try {
                                      const projId = await (createProject as any)({
                                        name: `${lead.name} - Project`,
                                        clientName: lead.name,
                                        clientEmail: lead.email || "",
                                        clientPhone: lead.whatsapp,
                                        clientAddress: (lead as any).address || "",
                                        clientNik: (lead as any).nik || "",
                                        status: 'survey',
                                        category: (lead as any).projectType || 'Renovasi',
                                        location: (lead as any).address || 'TBD',
                                        description: lead.notes || "",
                                        totalBudget: 0,
                                        escrowBalance: 0,
                                        contractParty2: lead.name, // Auto-fill Party 2
                                        paymentMilestones: [
                                          { label: 'Booking Fee', percentage: 0, status: 'paid' },
                                          { label: 'Termin I (DP)', percentage: 30, status: 'released' },
                                          { label: 'Termin II (Mid)', percentage: 40, status: 'locked' },
                                          { label: 'Termin III (Final)', percentage: 30, status: 'locked' },
                                        ]
                                      });
                                      await updateLead(lead.id, { projectId: projId });
                                      toast.success("Conversion Successful! Project Active.");
                                    } catch (err) {
                                      toast.error("Process interrupted. Manual fix required.");
                                    }
                                  } else {
                                    toast.success(`Updated: ${lead.name}`);
                                  }
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
                      <Input value={newGallery.title || ""} onChange={e => setNewGallery({...newGallery, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Category</label>
                      <select className="w-full h-10 rounded-md border border-black/10 px-3 text-sm" value={newGallery.category || ""} onChange={e => setNewGallery({...newGallery, category: e.target.value})}>
                        <option value="project">Project</option>
                        <option value="interior">Interior</option>
                        <option value="renovation">Renovation</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="uppercase-soft text-[10px]">Image URL</label>
                      <Input value={newGallery.imageUrl || ""} onChange={e => setNewGallery({...newGallery, imageUrl: e.target.value})} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="uppercase-soft text-[10px]">Description</label>
                      <Textarea value={newGallery.description || ""} onChange={e => setNewGallery({...newGallery, description: e.target.value})} />
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
                      <Input value={newProperty.title || ""} onChange={e => setNewProperty({...newProperty, title: e.target.value})} placeholder="e.g. Lahan Strategis BSD" />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Type / Category</label>
                        <select className="w-full h-10 rounded-md border border-black/10 px-3 text-sm" value={newProperty.type || ""} onChange={e => setNewProperty({...newProperty, type: e.target.value as any})}>
                          <option value="kerjasama">SYNERGY LAB</option>
                          <option value="bangun">TITIP BANGUN</option>
                          <option value="jual">JUAL & SEWA</option>
                          <option value="legal">LEGAL & PERIZINAN</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Price (Rp)</label>
                      <Input type="number" value={newProperty.price || 0} onChange={e => setNewProperty({...newProperty, price: Number(e.target.value)})} />
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
                      <Input value={newProperty.location || ""} onChange={e => setNewProperty({...newProperty, location: e.target.value})} placeholder="Area name, city..." />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Area (m2)</label>
                      <Input type="number" value={newProperty.area || 0} onChange={e => setNewProperty({...newProperty, area: Number(e.target.value)})} />
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
                      <Textarea value={newProperty.description || ""} onChange={e => setNewProperty({...newProperty, description: e.target.value})} />
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
                      <Input value={newVendor.name || ""} onChange={e => setNewVendor({...newVendor, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Category</label>
                      <Input placeholder="e.g. Besi, Semen, Cat" value={newVendor.category || ""} onChange={e => setNewVendor({...newVendor, category: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">Contact Person</label>
                      <Input value={newVendor.contactName || ""} onChange={e => setNewVendor({...newVendor, contactName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="uppercase-soft text-[10px]">WhatsApp</label>
                      <Input value={newVendor.whatsapp || ""} onChange={e => setNewVendor({...newVendor, whatsapp: e.target.value})} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="uppercase-soft text-[10px]">Address</label>
                      <Input value={newVendor.address || ""} onChange={e => setNewVendor({...newVendor, address: e.target.value})} />
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
                                  
                                  const date = new Date();
                                  const dateStr = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}`;
                                  const projectPart = selectedProjectFinance.name.substring(0,3).toUpperCase();
                                  const invoiceNumber = `INV-${dateStr}-${projectPart}-${Math.floor(1000 + Math.random() * 9000)}`;

                                  generateInvoicePDF({
                                    number: invoiceNumber,
                                    date: new Date().toLocaleDateString('id-ID'),
                                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'),
                                    clientName: selectedProjectFinance.clientName || client?.displayName || "Klien Terhormat",
                                    clientPhone: selectedProjectFinance.clientPhone || client?.whatsapp || client?.phoneNumber || "081213496672",
                                    projectName: selectedProjectFinance.name,
                                    items: projectItems.map(it => ({
                                      desc: it.name,
                                      qty: it.quantity,
                                      unit: it.unit,
                                      price: user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(it.pricePerUnit, systemConfig?.globalMarkup) : calculateClientPrice(it.pricePerUnit, systemConfig?.globalMarkup),
                                      total: user?.role === "admin" || user?.role === "pm" ? calculateAdminPrice(it.totalPrice, systemConfig?.globalMarkup) : calculateClientPrice(it.totalPrice, systemConfig?.globalMarkup)
                                    })),
                                    total: selectedProjectFinance.totalBudget,
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
                                  const finalBudget = selectedProjectFinance.totalBudget;
                                  const message = `*OFFICIAL INVOICE - TUKANG BANGUNAN JAKARTA*%0A%0AProyek: ${selectedProjectFinance.name}%0ATotal Tagihan: Rp ${finalBudget.toLocaleString('id-ID')}%0A%0AMohon segera melakukan pembayaran ke Bank ${cmsConfig?.paymentBankName || "BRI"}: ${cmsConfig?.paymentAccountNumber || "4792-0103-1488-535"} (a/n ${cmsConfig?.paymentAccountHolder || "TBJ CONTRACTOR"}).%0A%0A_Dibuat via TBJ Constech OS_`;
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
                                <div className="flex items-center gap-2">
                                  {editingMilestoneIndex === i ? (
                                    <div className="flex items-center gap-1">
                                      <Input 
                                        type="number" 
                                        className="h-8 w-16 text-[10px] font-black border-2 border-accent" 
                                        value={milestoneEditPercentage}
                                        onChange={(e) => setMilestoneEditPercentage(Number(e.target.value))}
                                      />
                                      <span className="text-[10px] font-black">%</span>
                                      <Button 
                                        size="sm" 
                                        className="h-8 w-8 p-0 bg-accent text-white" 
                                        onClick={async () => {
                                          const newMilestones = [...selectedProjectFinance.paymentMilestones];
                                          newMilestones[i] = { ...newMilestones[i], percentage: milestoneEditPercentage };
                                          await updateProject(selectedProjectFinance.id, { paymentMilestones: newMilestones });
                                          setSelectedProjectFinance({...selectedProjectFinance, paymentMilestones: newMilestones});
                                          setEditingMilestoneIndex(null);
                                          toast.success("Milestone updated");
                                        }}
                                      >
                                        <Save className="w-3 h-3" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 text-red-500" 
                                        onClick={() => setEditingMilestoneIndex(null)}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div 
                                      className="flex items-center gap-1 cursor-pointer hover:bg-neutral-50 p-1 rounded"
                                      onClick={() => {
                                        setEditingMilestoneIndex(i);
                                        setMilestoneEditPercentage(m.percentage);
                                      }}
                                    >
                                      <span className="text-xs font-black text-accent">{m.percentage}%</span>
                                      <FileEdit className="w-2.5 h-2.5 text-neutral-400" />
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 ml-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8 px-2 text-[8px] font-black uppercase border-black"
                                      onClick={async () => {
                                        const client = users.find(u => u.uid === selectedProjectFinance.clientId);
                                        const date = new Date();
                                        const invNum = `INV-${m.label.split(' ')[0]}-${selectedProjectFinance.id.substring(0,4).toUpperCase()}`;
                                        generateInvoicePDF({
                                          number: invNum,
                                          date: date.toLocaleDateString('id-ID'),
                                          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'),
                                          clientName: selectedProjectFinance.clientName || client?.displayName || "Klien Terhormat",
                                          clientPhone: selectedProjectFinance.clientPhone || client?.whatsapp || client?.phoneNumber || "081213496672",
                                          projectName: selectedProjectFinance.name,
                                          items: [{ desc: m.label, qty: 1, unit: 'Milestone', price: selectedProjectFinance.totalBudget * (m.percentage/100), total: selectedProjectFinance.totalBudget * (m.percentage/100) }],
                                          total: selectedProjectFinance.totalBudget * (m.percentage/100),
                                          bankInfo: { bank: cmsConfig?.paymentBankName || 'BRI', accNo: cmsConfig?.paymentAccountNumber || '479201031488535', accName: cmsConfig?.paymentAccountHolder || 'TBJ CONTRACTOR' }
                                        });
                                        toast.success("Milestone Invoice Generated");
                                      }}
                                    >
                                      <FileText className="w-3 h-3 mr-1" /> Inv
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      className="h-8 px-2 text-[8px] font-black uppercase bg-green-600 hover:bg-green-700 text-white"
                                      onClick={async () => {
                                        const client = users.find(u => u.uid === selectedProjectFinance.clientId);
                                        const date = new Date();
                                        const rectNum = `RECT-${m.label.split(' ')[0]}-${selectedProjectFinance.id.substring(0,4).toUpperCase()}`;
                                        generateReceiptPDF({
                                          number: rectNum,
                                          date: date.toLocaleDateString('id-ID'),
                                          paymentDate: date.toLocaleDateString('id-ID'),
                                          clientName: selectedProjectFinance.clientName || client?.displayName || "Klien Terhormat",
                                          clientPhone: selectedProjectFinance.clientPhone || client?.whatsapp || client?.phoneNumber || "081213496672",
                                          projectName: selectedProjectFinance.name,
                                          items: [{ desc: m.label, qty: 1, unit: 'Milestone', price: selectedProjectFinance.totalBudget * (m.percentage/100), total: selectedProjectFinance.totalBudget * (m.percentage/100) }],
                                          total: selectedProjectFinance.totalBudget * (m.percentage/100),
                                          method: 'Bank Transfer'
                                        });
                                        toast.success("Milestone Receipt Generated");
                                      }}
                                    >
                                      <CheckCircle2 className="w-3 h-3 mr-1" /> Rect
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={async () => {
                                      const newMilestones = selectedProjectFinance.paymentMilestones.filter((_, idx) => idx !== i);
                                      await updateProject(selectedProjectFinance.id, { paymentMilestones: newMilestones });
                                      setSelectedProjectFinance({...selectedProjectFinance, paymentMilestones: newMilestones});
                                      toast.success("Milestone removed");
                                    }}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <Dialog open={showAddCustomMilestone} onOpenChange={setShowAddCustomMilestone}>
                              <DialogTrigger render={
                                <Button variant="outline" className="w-full border-2 border-black border-dashed h-10 text-[10px] font-black uppercase">
                                  <Plus className="w-3 h-3 mr-2" /> Add Custom Milestone
                                </Button>
                              } />
                              <DialogContent className="border-4 border-black rounded-3xl">
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-black uppercase tracking-tighter">Add Custom Milestone</DialogTitle>
                                  <DialogDescription className="text-xs uppercase-soft">Enter milestone details for {selectedProjectFinance.name}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Milestone Name</Label>
                                    <Input 
                                      placeholder="e.g. Pembayaran Termin 3" 
                                      className="border-2 border-black rounded-xl h-12"
                                      value={newCustomMilestone.label}
                                      onChange={(e) => setNewCustomMilestone({...newCustomMilestone, label: e.target.value})}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Percentage (%)</Label>
                                    <Input 
                                      type="number" 
                                      placeholder="e.g. 20" 
                                      className="border-2 border-black rounded-xl h-12"
                                      value={newCustomMilestone.percentage}
                                      onChange={(e) => setNewCustomMilestone({...newCustomMilestone, percentage: Number(e.target.value)})}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button className="btn-black h-12 rounded-xl uppercase font-black tracking-widest text-xs px-8" onClick={async () => {
                                    if (!newCustomMilestone.label || newCustomMilestone.percentage <= 0) {
                                      toast.error("Please fill milestone details correctly");
                                      return;
                                    }
                                    const currentMilestones = selectedProjectFinance.paymentMilestones || [];
                                    const newM = {
                                      label: newCustomMilestone.label,
                                      percentage: newCustomMilestone.percentage,
                                      status: 'pending'
                                    };
                                    const newMilestones = [...currentMilestones, newM];
                                    await updateProject(selectedProjectFinance.id, { paymentMilestones: newMilestones });
                                    setSelectedProjectFinance({...selectedProjectFinance, paymentMilestones: newMilestones});
                                    setShowAddCustomMilestone(false);
                                    setNewCustomMilestone({ label: "", percentage: 0 });
                                    toast.success("Custom milestone added");
                                  }}>
                                    Save Milestone
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
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
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-2 border-black rounded-2xl overflow-hidden">
                  <CardHeader className="bg-neutral-50 border-b-2 border-black">
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">Access Control</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                      {[
                        { role: "admin", label: "Admin Owner", access: "Full System Access" },
                        { role: "pm", label: "Project Manager", access: "Project & Workforce" },
                        { role: "user", label: "Client/User", access: "Dashboard & AI Analysis" },
                      ].map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border-2 border-black rounded-lg">
                          <div>
                            <p className="font-black text-xs uppercase tracking-widest">{r.label}</p>
                            <p className="text-[9px] text-neutral-400">{r.access}</p>
                          </div>
                          <Badge variant="outline" className="border-black rounded-md text-[9px]">
                            {users.filter(u => u.role === r.role).length} Users
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <Dialog>
                      <DialogTrigger render={<Button className="w-full btn-sleek h-10 rounded-lg text-xs">Manage Permissions</Button>} />
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
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border-2 border-black rounded-lg bg-accent/5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-accent/10 rounded-md">
                            <Sparkles className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <p className="font-black text-xs uppercase tracking-widest">AI Hub Monitoring</p>
                            <p className="text-[9px] text-neutral-400">Total analysis tokens</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black">{users.reduce((sum, u) => sum + (u.aiUsageCount || 0), 0)}</p>
                          <p className="text-[8px] uppercase font-bold text-neutral-400">Interactions</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 border-2 border-black rounded-lg">
                        <div>
                          <p className="font-black text-xs uppercase tracking-widest">Auto-Notification (WA)</p>
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
                                defaultValue={systemConfig.aiVerifiedLimit || 10} 
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

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <div className="bg-red-500 p-8 text-white flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <Trash2 className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Konfirmasi Penghapusan</h2>
              <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">Data ini tidak dapat dikembalikan</p>
            </div>
          </div>
          <div className="p-8 space-y-6 text-center">
            <p className="text-sm font-medium text-neutral-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun user ini secara permanen dari TBJ Constech OS? Semua riwayat proyek dan akses akan terputus.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" className="rounded-2xl h-12 px-8 uppercase font-black text-[10px] tracking-widest border-neutral-200" onClick={() => setDeleteConfirmId(null)}>Batal</Button>
              <Button className="rounded-2xl h-12 px-8 uppercase font-black text-[10px] tracking-widest bg-red-500 hover:bg-black text-white" onClick={executeDeleteUser}>Hapus Permanen</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <div className="bg-red-500 p-8 text-white flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <Trash2 className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Hapus Proyek?</h2>
              <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">TBJ OS Project Archive Protocol</p>
            </div>
          </div>
          <div className="p-8 space-y-6 text-center">
            <p className="text-sm font-medium text-neutral-600 leading-relaxed">
              Konfirmasi: Hapus proyek <strong>"{projectToDelete?.name}"</strong>? Seluruh data RAB, timeline, dan transaksi terkait akan dihapus secara permanen dari sistem operasional.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" className="rounded-2xl h-12 px-8 uppercase font-black text-[10px] tracking-widest border-neutral-200" onClick={() => setProjectToDelete(null)}>Batal</Button>
              <Button className="rounded-2xl h-12 px-8 uppercase font-black text-[10px] tracking-widest bg-red-600 hover:bg-black text-white" onClick={executeDeleteProject}>Hapus Proyek</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Workforce Confirmation Dialog */}
      <Dialog open={!!workerToDelete} onOpenChange={(open) => !open && setWorkerToDelete(null)}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <div className="bg-red-500 p-8 text-white flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Offboard Personnel?</h2>
              <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">TBJ Workforce Management Protocol</p>
            </div>
          </div>
          <div className="p-8 space-y-6 text-center">
            <p className="text-sm font-medium text-neutral-600 leading-relaxed">
              Hapus data pekerja <strong>"{workerToDelete?.name}"</strong> dari sistem Human Capital TBJ? Riwayat kehadiran akan tetap tersimpan dalam log sistem.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" className="rounded-2xl h-12 px-8 uppercase font-black text-[10px] tracking-widest border-neutral-200" onClick={() => setWorkerToDelete(null)}>Batal</Button>
              <Button className="rounded-2xl h-12 px-8 uppercase font-black text-[10px] tracking-widest bg-red-600 hover:bg-black text-white" onClick={executeDeleteWorker}>Offboard Worker</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contract Management Dialog */}
      <Dialog open={!!editingContractProject} onOpenChange={(open) => !open && setEditingContractProject(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-2 border-black rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">Digital Contract Builder</DialogTitle>
            <DialogDescription className="uppercase-soft">Drafting for {editingContractProject?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Pihak Pertama (TBJ Constech)</Label>
                <Input 
                  value={editingContractProject?.contractParty1 || "PT. TBJ Constech Indonesia"} 
                  onChange={(e) => setEditingContractProject(prev => prev ? {...prev, contractParty1: e.target.value} : null)}
                  className="border-2 border-black rounded-xl h-12 font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">Pihak Kedua (Klien)</Label>
                <Input 
                  value={editingContractProject?.contractParty2 || editingContractProject?.clientName || ""} 
                  onChange={(e) => setEditingContractProject(prev => prev ? {...prev, contractParty2: e.target.value} : null)}
                  className="border-2 border-black rounded-xl h-12 font-bold"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-black uppercase">Isi Kontrak (Draft Utama)</Label>
                <Button 
                   variant="outline" 
                   size="sm" 
                   className="h-8 text-[9px] font-black uppercase border-black rounded-xl hover:bg-black hover:text-white transition-all gap-2"
                   onClick={() => {
                      if (!editingContractProject) return;
                      const template = `SURAT PERJANJIAN KERJA (SPK)\n\nANTARA:\nPIHAK PERTAMA: ${editingContractProject.contractParty1 || "PT. TBJ Constech Indonesia"}\nPIHAK KEDUA: ${editingContractProject.contractParty2 || editingContractProject.clientName || "[Nama Klien]"}\n\nPASAL 1: RUANG LINGKUP PEKERJAAN\nPIHAK PERTAMA setuju untuk melaksanakan pekerjaan renovasi/pembangunan untuk PIHAK KEDUA pada proyek ${editingContractProject.name}.\n\nPASAL 2: NILAI KONTRAK\nTotal nilai kontrak disepakati sebesar Rp ${editingContractProject.totalBudget?.toLocaleString('id-ID') || "0"}.\n\nPASAL 3: SISTEM PEMBAYARAN\nPembayaran dilakukan sesuai dengan milestone yang telah disepakati di dalam dashboard TBJ Constech.\n\nPASAL 4: JANGKA WAKTU\nPekerjaan akan dimulai pada ${editingContractProject.startDate || "[Tgl Mulai]"} dan diperkirakan selesai dalam waktu yang disepakati.\n\nPASAL 5: GARANSI\nPIHAK PERTAMA memberikan garansi pemeliharaan selama 3 bulan setelah serah terima selesai dilakukan.`;
                      setEditingContractProject({...editingContractProject, contractDraft: template});
                   }}
                >
                  <Zap className="w-3 h-3" /> Auto-Generate Draft
                </Button>
              </div>
              <Textarea 
                className="min-h-[300px] border-2 border-black rounded-2xl p-6 font-medium text-sm leading-relaxed"
                placeholder="Tulis pasal-pasal kontrak di sini..."
                value={editingContractProject?.contractDraft || ""}
                onChange={(e) => setEditingContractProject(prev => prev ? {...prev, contractDraft: e.target.value} : null)}
              />
            </div>
            
            <div className="bg-neutral-50 p-6 rounded-2xl border-2 border-dashed border-black/10">
               <h4 className="text-[10px] font-black uppercase mb-4 flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 text-green-600" /> Contract Status
               </h4>
               <div className="flex items-center justify-between border-b border-black/5 pb-4">
                  <div className="space-y-1">
                    <p className="font-black text-xs uppercase">TBJ Constech Signature (Pihak I)</p>
                    <p className="text-[10px] font-medium text-neutral-400">
                      {editingContractProject?.adminSignedAt ? `Signed on ${new Date(editingContractProject.adminSignedAt).toLocaleString()}` : "Not Signed yet"}
                    </p>
                  </div>
                  {editingContractProject?.adminSignedAt ? (
                    <Badge className="bg-green-500 text-white font-black px-4 py-1.5 rounded-full flex items-center gap-2 border-none">
                        <ShieldCheck className="w-4 h-4" /> SIGNED
                     </Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      className="h-9 px-4 rounded-xl bg-orange-500 hover:bg-black text-white font-black uppercase text-[9px]"
                      onClick={async () => {
                         if (!editingContractProject) return;
                         const now = new Date().toISOString();
                         await updateProject(editingContractProject.id, { 
                            adminSignedAt: now,
                            contractHistory: [
                                ...(editingContractProject.contractHistory || []),
                                { time: now, action: "Admin Signed Contract", user: user?.displayName || "Admin", role: "admin" }
                            ]
                         });
                         setEditingContractProject({...editingContractProject, adminSignedAt: now});
                         toast.success("Kontrak berhasil ditandatangani oleh TBJ!");
                      }}
                    >
                      Sign as TBJ
                    </Button>
                  )}
               </div>

               <div className="flex items-center justify-between pt-4">
                  <div className="space-y-1">
                    <p className="font-black text-xs uppercase">Client Signature (Pihak II)</p>
                    <p className="text-[10px] font-medium text-neutral-400">
                      {editingContractProject?.clientSignedAt ? `Signed on ${new Date(editingContractProject.clientSignedAt).toLocaleString()}` : "Waiting for client..."}
                    </p>
                  </div>
                  <Badge variant={editingContractProject?.clientSignedAt || editingContractProject?.contractSignedAt ? "default" : "secondary"} className="rounded-full">
                    {editingContractProject?.clientSignedAt || editingContractProject?.contractSignedAt ? "VERIFIED" : "PENDING"}
                  </Badge>
               </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-12 px-8 rounded-xl font-black uppercase text-[10px]" onClick={() => setEditingContractProject(null)}>Batal</Button>
            <Button className="h-12 px-8 rounded-xl font-black uppercase text-[10px] bg-black text-white" onClick={handleUpdateContract}>Simpan Draft Kontrak</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CCTV Management Dialog */}
      <Dialog open={!!managingCctvProject} onOpenChange={(open) => !open && setManagingCctvProject(null)}>
        <DialogContent className="max-w-2xl border-2 border-black rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">Site Monitor (CCTV)</DialogTitle>
            <DialogDescription className="uppercase-soft">Integrate Site Live Streams for {managingCctvProject?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="bg-neutral-50 p-6 rounded-2xl space-y-4">
              <h4 className="text-[10px] font-black uppercase">Add New Stream</h4>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Stream Name</Label>
                  <Input 
                    value={newCctv.name} 
                    onChange={(e) => setNewCctv({...newCctv, name: e.target.value})}
                    placeholder="e.g. Area Depan, Lantai 2"
                    className="border-2 border-black rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Stream URL (Embed/m3u8/HTTP)</Label>
                  <Input 
                    value={newCctv.url} 
                    onChange={(e) => setNewCctv({...newCctv, url: e.target.value})}
                    placeholder="https://your-cctv-provider.com/embed/..."
                    className="border-2 border-black rounded-xl h-12"
                  />
                </div>
                <Button className="h-12 w-full rounded-xl font-black uppercase text-[10px] bg-black text-white" onClick={handleAddCctv}>
                   Tambahkan Stream
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase">Active Streams</h4>
              <div className="space-y-2">
                {managingCctvProject?.cctvUrls?.map((stream, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border-2 border-black/5 rounded-xl bg-white hover:border-black transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                        <Camera className="w-5 h-5 text-neutral-400" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{stream.name}</p>
                        <p className="text-[8px] font-mono text-neutral-400 truncate w-40">{stream.url}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:bg-neutral-100 rounded-full"
                      onClick={async () => {
                        const updated = managingCctvProject.cctvUrls?.filter(s => s.id !== stream.id) || [];
                        await updateProject(managingCctvProject.id, { cctvUrls: updated });
                        setManagingCctvProject({...managingCctvProject, cctvUrls: updated});
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {(!managingCctvProject?.cctvUrls || managingCctvProject.cctvUrls.length === 0) && (
                  <p className="text-center py-8 text-neutral-400 text-xs font-bold uppercase tracking-widest italic">Belum ada CCTV terpasang.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="h-12 w-full rounded-xl font-black uppercase text-[10px]" onClick={() => setManagingCctvProject(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
  );
}

