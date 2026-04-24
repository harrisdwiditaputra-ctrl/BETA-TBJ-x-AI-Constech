export type UserTier = "prospect" | "survey" | "deal" | "admin";

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  pmId?: string;
  workerIds?: string[]; // Added for Tier 3 tracking
  createdAt: string;
  totalBudget: number;
  escrowBalance: number; // Total money paid by client but not yet released
  releasedAmount: number; // Total money released to company
  paymentMilestones: PaymentMilestone[];
  status: "draft" | "survey" | "active" | "completed";
  contractUrl?: string;
  timeline?: TimelineEvent[];
  location?: string;
  locationCoords?: { lat: number; lng: number }; // Added for multi-site tracking
  area?: number;
  type?: string;
  category?: string;
  dailyReports?: DailyReport[];
  requests?: ProjectRequest[];
  cctvUrls?: { id: string; name: string; url: string }[];
  imageUrl?: string;
  clientId?: string;
  progress?: number;
}

export interface PaymentMilestone {
  id: string;
  label: string;
  percentage: number;
  amount: number;
  status: "pending" | "requested" | "released";
  releaseDate?: string;
  requiredProgress: number;
}

export interface DailyReport {
  id: string;
  date: string;
  description: string;
  photos: string[];
}

export interface ProjectRequest {
  id: string;
  item: string;
  volume: number;
  unit: string;
  price: number;
  tag: "client" | "pm" | "system";
  photoUrl?: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  dueDate?: string; // Added for task tracking
  status: "pending" | "ongoing" | "completed";
}

export interface BudgetCategory {
  id: string;
  projectId: string;
  name: string;
  order: number;
}

export interface BudgetItem {
  id: string;
  projectId: string;
  categoryId: string;
  name: string;
  description: string;
  technicalSpecs?: string; // Brand, Type, Material specific
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  photos?: {
    before?: string[];
    progress?: string[];
    after?: string[];
  };
  progress?: number; // 0 to 100
  startDate?: string;
  endDate?: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  type: "jual" | "lahan" | "bangun" | "sewa" | "perizinan" | "kerjasama" | "revitalisasi" | "legal";
  location: string;
  coordinates?: { lat: number; lng: number };
  area: number;
  photos: string[];
  features: string[];
  status: "available" | "sold" | "rented" | "requested";
  category?: string; // e.g. Rumah, Ruko, Tanah
  published?: boolean;
}

export interface Workforce {
  id: string;
  name: string;
  ktp: string;
  photoUrl: string;
  role: "pm" | "designer" | "drafter" | "tukang" | "mandor" | "kenek" | string;
  skill?: string; // Added for worker specialization
  whatsapp: string;
  projectId?: string; // Label proyek dimana
  status: "active" | "inactive";
  location?: { lat: number; lng: number };
  lastSeen?: string;
}

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  checkIn: string;
  checkOut?: string;
  location?: { lat: number; lng: number };
  photoUrl?: string;
  status?: string;
}

export interface MaterialRequest {
  id: string;
  projectId: string;
  projectName: string;
  requesterId: string;
  requesterName: string;
  itemName: string;
  quantity: number;
  unit: string;
  note: string;
  status: "pending" | "approved" | "rejected" | "purchased" | "ordered" | "delivered";
  vendorId?: string;
  vendorName?: string;
  createdAt: string;
  updatedAt: string;
  log: { time: string; action: string; note?: string }[];
  items?: { name: string; quantity: number; unit: string }[];
}

export interface WorkItemMaster {
  id: string;
  code?: string; // PT010, FR024
  category: string;
  name: string;
  description?: string;
  technicalSpecs?: string; // Brand, Type, Material specific
  unit: string;
  price: number;
  status?: "visible" | "hidden" | "deleted";
  soldCount?: number;
  revenue?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: "admin" | "user" | "pm";
  tier: UserTier;
  whatsapp?: string;
  phoneNumber?: string; // Added for AI limit tracking
  aiUsageCount?: number; // Added for AI limit tracking
  location?: string;
  address?: string; // Detailed address
  secondaryContact?: string; // Emergency or secondary contact
  notes?: string; // Internal notes about client
  projectHistory?: string[]; // IDs of projects associated with client
  createdAt: string;
  lastPaymentStatus?: "unpaid" | "pending" | "paid";
  lifetimeAccess?: boolean; // Added for lifetime access
  waVerified?: boolean; // Added for WA OTP verification
}

export interface AIEstimateItem {
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  reasoning: string;
}

export interface AIEstimateResponse {
  analysis: string;
  items: AIEstimateItem[];
  totalEstimatedCost: number;
}

export type MaterialOption = {
  nama: string;
  hargaSatuan: number;
  deskripsi: string;
};

export interface KalkulasiInput {
  luasAtap: number;
  kodeMaterial: "alderon" | "spandek";
  termasukRangka?: boolean;
}

export interface HasilRAB {
  material: string;
  luas: number;
  hargaSatuan: number;
  biayaRangka: number;
  totalHarga: number;
}

export interface CMSConfig {
  heroTitle: string;
  heroSubtitle: string;
  promoText: string;
  promoActive: boolean;
  // Dynamic Payment & Transfer Instructions
  paymentBankName?: string;
  paymentAccountNumber?: string;
  paymentAccountHolder?: string;
  paymentQrisInstructions?: string;
  surveyPaymentTerms?: string;
  surveyBenefits?: string[];
}

export interface Campaign {
  id: string;
  name: string;
  status: "Active" | "Draft" | "Paused";
  reach: string;
  conversion: string;
  content: string;
  locations: string[];
  createdAt: string;
  scheduledDeleteDate?: string;
}

export interface SystemConfig {
  surveyFee: number;
  aiFreeLimit: number;
  aiVerifiedLimit?: number;
  globalMarkup: number;
  autoNotificationWA: boolean;
  aiAnalysisMode: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contactName: string;
  whatsapp: string;
  email?: string;
  address?: string;
  rating?: number;
}

export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  createdAt: string;
  published?: boolean;
}

export type MediaCategory = 'system' | 'finance' | 'marketing' | 'projects';

export interface MediaAsset {
  id: string;
  url: string;
  name: string;
  category: MediaCategory;
  projectId?: string;
  description?: string;
  uploadedBy: string;
  uploadedByName?: string;
  createdAt: string;
  fileSize?: number;
  fileType?: string;
}

export interface FinancialTransaction {
  id: string;
  projectId?: string;
  projectName?: string;
  type: "income" | "expense";
  category: "client_payment" | "material" | "labor" | "assessment" | "other";
  amount: number;
  description: string;
  date: string;
  referenceId?: string; // ID of the related object (e.g. material request ID, worker ID)
  status: "pending" | "completed";
}

export interface WorkerWage {
  id: string;
  workerId: string;
  workerName: string;
  projectId: string;
  projectName: string;
  amount: number;
  weekEnding: string;
  status: "pending" | "paid";
  createdAt: string;
}

export interface MasterDataVersion {
  id: string;
  versionName: string;
  items: WorkItemMaster[];
  createdAt: string;
  createdBy: string;
  notes?: string;
}
