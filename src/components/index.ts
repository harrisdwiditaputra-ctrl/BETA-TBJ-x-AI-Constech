// ─── User & Auth ──────────────────────────────────────────────────────────────
export type UserTier = "prospect" | "survey" | "deal";
export type UserRole = "admin" | "user" | "pm";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  tier: UserTier;
  whatsapp?: string;
  analysisCount?: number;
  proTierExpiresAt?: string;
  location?: string;
  createdAt?: string;
  lastPaymentStatus?: string;
}

// ─── CMS Config ───────────────────────────────────────────────────────────────
export interface CmsConfig {
  heroTitle: string;
  heroSubtitle: string;
  whatsappNumber?: string;
  instagramUrl?: string;
  googleMapsUrl?: string;
  announcementText?: string;
  updatedAt?: string;
}

// ─── Project & RAB ────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  pmId?: string;
  createdAt: string;
  totalBudget: number;
  status: "draft" | "survey" | "active" | "completed";
  location?: string;
  area?: number;
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
  description?: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  progress?: number;
}

// ─── Property ─────────────────────────────────────────────────────────────────
export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  type: "sale" | "rent";
  location: string;
  images: string[];
  status: "available" | "sold" | "rented";
  area?: number;
}

// ─── Master Data ──────────────────────────────────────────────────────────────
export interface WorkItemMaster {
  id: string;
  code?: string;
  category: string;
  name: string;
  description?: string;
  unit: string;
  price: number;
  status?: "visible" | "hidden";
  soldCount?: number;
  revenue?: number;
}

// ─── Gallery ──────────────────────────────────────────────────────────────────
export interface GalleryItem {
  id: string;
  title: string;
  images: string[];
  date: string;
  value: number;
  description: string;
  testimonial?: string;
  clientName?: string;
  videoUrl?: string;
}

// ─── Workforce & Attendance ───────────────────────────────────────────────────
export interface Workforce {
  id: string;
  name: string;
  ktp: string;
  role: string;
  photoUrl?: string;
  status: "active" | "inactive";
  lastSeen?: string;
}

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  checkIn: string;
  checkOut?: string;
  location?: { lat: number; lng: number };
  status?: string;
}

// ─── Material Requests ────────────────────────────────────────────────────────
export interface MaterialRequest {
  id: string;
  projectId: string;
  projectName?: string;
  requesterId: string;
  requesterName?: string;
  itemName: string;
  quantity: number;
  unit: string;
  status: "pending" | "approved" | "rejected";
  note?: string;
  createdAt: string;
  updatedAt?: string;
  log?: Array<{ action: string; by: string; at: string }>;
}

export interface MaterialSuggestion {
  id: string;
  name: string;
}

// ─── Media Asset ──────────────────────────────────────────────────────────────
export interface MediaAsset {
  id: string;
  url: string;
  name: string;
  category: "system" | "finance" | "marketing" | "projects";
  projectId?: string;
  description?: string;
  uploadedBy: string;
  createdAt: string;
}

// ─── Saved Estimate ───────────────────────────────────────────────────────────
export interface SavedEstimate {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  items: AIEstimateItem[];
  totalBudget: number;
  createdAt: string;
}

// ─── Lead / CRM ───────────────────────────────────────────────────────────────
export type LeadStatus = "Lead" | "Qualified" | "Won" | "Lost";

export interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  source?: string;
  status: LeadStatus;
  notes?: string;
  createdAt: string;
  projectType?: string;
  estimatedBudget?: number;
}

// ─── AI Estimation ────────────────────────────────────────────────────────────
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
  disclaimer?: string;
}

// ─── Timeline Event ───────────────────────────────────────────────────────────
export interface TimelineEvent {
  id: string;
  projectId: string;
  title: string;
  date: string;
  dueDate?: string;
  status: "pending" | "ongoing" | "completed";
  priority?: "Low" | "Medium" | "High" | "Urgent";
  description?: string;
}

// ─── Media Category ───────────────────────────────────────────────────────────
export type MediaCategory = "system" | "finance" | "marketing" | "projects";

// ─── Finance ──────────────────────────────────────────────────────────────────
export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  projectId?: string;
  projectName?: string;
  category?: string;
  createdAt: string;
  createdBy?: string;
}

// ─── System Config ────────────────────────────────────────────────────────────
export interface SystemConfig {
  globalMarkup: number;          // e.g. 0.2 = 20%
  surveyFee: number;             // e.g. 399000
  escrowBank: string;
  escrowAccount: string;
  escrowName: string;
  maintenanceMode: boolean;
  galleryPublishAll: boolean;
  updatedAt?: string;
}

// ─── CMS Promo ────────────────────────────────────────────────────────────────
export interface CmsPromo {
  id: string;
  text: string;
  isActive: boolean;
  scheduledAt?: string;
  expiresAt?: string;
}

// Update CmsConfig to include promos
export interface CmsConfigExtended extends CmsConfig {
  promos?: CmsPromo[];
  promoActive?: boolean;
  promoText?: string;
  whatsappNumber?: string;
  instagramUrl?: string;
}

// ─── Site Log ─────────────────────────────────────────────────────────────────
export interface SiteLog {
  id: string;
  projectId: string;
  type: "photo" | "note" | "issue" | "milestone";
  description: string;
  photoUrl?: string;
  createdBy: string;
  createdAt: string;
}

// ─── Worker Wages ─────────────────────────────────────────────────────────────
export interface WorkerWage {
  id: string;
  workerId: string;
  workerName: string;
  projectId?: string;
  amount: number;
  period: string;
  status: "pending" | "paid";
  paidAt?: string;
  createdAt: string;
}

// ─── Vendor ───────────────────────────────────────────────────────────────────
export interface Vendor {
  id: string;
  name: string;
  category: string;
  contact?: string;
  whatsapp?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

// ─── BudgetItem Extended ──────────────────────────────────────────────────────
// Extend BudgetItem with optional fields used in ProjectAIHealth
declare module "@/types" {
  interface BudgetItem {
    technicalSpecs?: string;
    vendor?: string;
  }
  interface Project {
    progress?: number;
    pmId?: string;
    location?: string;
  }
}
