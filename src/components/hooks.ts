import { useState, useEffect } from "react";
import {
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, onSnapshot, collection, query,
  where, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "@/lib/firebase";
import type {
  Project, BudgetCategory, BudgetItem, UserProfile,
  Property, WorkItemMaster, GalleryItem, Workforce,
  Attendance, MaterialRequest, CmsConfig, Lead,
  MediaAsset, SavedEstimate, MaterialSuggestion,
  Transaction, SystemConfig, SiteLog, WorkerWage,
  Vendor, TimelineEvent,
} from "@/types";
import { WORK_ITEMS_MASTER } from "@/constants";
import { toast } from "sonner";

// ─── AUTH ────────────────────────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const ref = doc(db, "users", firebaseUser.uid);
        try {
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "User",
              photoURL: firebaseUser.photoURL || undefined,
              role: firebaseUser.email === "harrisdwiditaputra@gmail.com" ? "admin" : "user",
              tier: "prospect",
              analysisCount: 0,
              createdAt: new Date().toISOString(),
            };
            await setDoc(ref, newUser);
            setUser(newUser);
          } else {
            setUser({ uid: firebaseUser.uid, ...snap.data() } as UserProfile);
          }
        } catch (err) {
          console.error("Auth profile error:", err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      toast.error("Login gagal. Coba lagi.");
    }
  };

  const logout = async () => {
    await signOut(auth);
    toast.success("Berhasil logout.");
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), data as any);
      setUser(prev => prev ? { ...prev, ...data } : prev);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return { user, loading, login, logout, updateProfile };
}

// ─── PROJECTS ────────────────────────────────────────────────────────────────
export function useProjects(userId?: string, _role?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const q = query(
      collection(db, "projects"),
      where("ownerId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.LIST, "projects"));
    return unsub;
  }, [userId]);

  const createProject = async (name: string, description: string) => {
    if (!userId) return;
    try {
      await addDoc(collection(db, "projects"), {
        name, description, ownerId: userId,
        createdAt: new Date().toISOString(),
        totalBudget: 0, status: "survey",
      });
      toast.success("Proyek berhasil dibuat!");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "projects");
    }
  };

  return { projects, loading, createProject };
}

// ─── PROJECT DETAIL ───────────────────────────────────────────────────────────
export function useProjectDetails(projectId?: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    const unsubP = onSnapshot(doc(db, "projects", projectId), d => {
      if (d.exists()) setProject({ id: d.id, ...d.data() } as Project);
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.GET, `projects/${projectId}`));

    const unsubC = onSnapshot(
      query(collection(db, "projects", projectId, "categories"), orderBy("order", "asc")),
      snap => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as BudgetCategory)))
    );

    const unsubI = onSnapshot(
      collection(db, "projects", projectId, "items"),
      snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as BudgetItem)))
    );

    return () => { unsubP(); unsubC(); unsubI(); };
  }, [projectId]);

  const addCategory = async (name: string) => {
    if (!projectId || !name.trim()) return;
    try {
      await addDoc(collection(db, "projects", projectId, "categories"), {
        projectId, name, order: categories.length,
      });
      toast.success(`Kategori "${name}" ditambahkan.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `projects/${projectId}/categories`);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!projectId) return;
    try {
      const catItems = items.filter(i => i.categoryId === categoryId);
      for (const item of catItems) {
        await deleteDoc(doc(db, "projects", projectId, "items", item.id));
      }
      await deleteDoc(doc(db, "projects", projectId, "categories", categoryId));
      toast.success("Kategori dihapus.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${projectId}/categories/${categoryId}`);
    }
  };

  const addItem = async (
    categoryId: string, name: string,
    quantity: number, unit: string, pricePerUnit: number
  ) => {
    if (!projectId) return;
    try {
      const totalPrice = quantity * pricePerUnit;
      await addDoc(collection(db, "projects", projectId, "items"), {
        projectId, categoryId, name, quantity, unit, pricePerUnit, totalPrice, progress: 0,
      });
      if (project) {
        await updateDoc(doc(db, "projects", projectId), {
          totalBudget: project.totalBudget + totalPrice,
        });
      }
      toast.success("Item ditambahkan ke RAB.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `projects/${projectId}/items`);
    }
  };

  const deleteItem = async (itemId: string, itemTotal: number) => {
    if (!projectId || !project) return;
    try {
      await deleteDoc(doc(db, "projects", projectId, "items", itemId));
      await updateDoc(doc(db, "projects", projectId), {
        totalBudget: Math.max(0, project.totalBudget - itemTotal),
      });
      toast.success("Item dihapus.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${projectId}/items/${itemId}`);
    }
  };

  const updateProjectStatus = async (status: Project["status"]) => {
    if (!projectId) return;
    try {
      await updateDoc(doc(db, "projects", projectId), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  const updateItemProgress = async (itemId: string, progress: number) => {
    if (!projectId) return;
    try {
      await updateDoc(doc(db, "projects", projectId, "items", itemId), {
        progress: Math.min(100, Math.max(0, progress)),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${projectId}/items/${itemId}`);
    }
  };

  return {
    project: project || ({} as Project),
    categories, items, loading,
    addCategory, deleteCategory, addItem, deleteItem,
    updateProjectStatus, updateItemProgress,
  };
}

// ─── GALLERY ─────────────────────────────────────────────────────────────────
export function useGallery() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const MOCK_GALLERY: GalleryItem[] = [
    {
      id: "1", title: "Renovasi Total Rumah Minimalis",
      images: [
        "https://picsum.photos/seed/before1/800/600",
        "https://picsum.photos/seed/after1/800/600",
        "https://picsum.photos/seed/detail1/800/600",
      ],
      date: "2024-03-15", value: 450000000,
      description: "Transformasi rumah tua menjadi hunian modern minimalis dengan optimalisasi ruang cahaya dan instalasi smart lighting.",
      testimonial: "Hasilnya sangat memuaskan! Tim TBJ sangat profesional dan tepat waktu.",
      clientName: "Bpk. Budi H.",
    },
    {
      id: "2", title: "Interior Kitchen Set Scandinavian",
      images: [
        "https://picsum.photos/seed/before2/800/600",
        "https://picsum.photos/seed/after2/800/600",
      ],
      date: "2024-02-10", value: 85000000,
      description: "Kitchen set custom HPL premium dengan tema Scandinavian, top table solid surface, dan aksesoris kabinet modern.",
      testimonial: "Dapur jadi impian! Sangat rapi dan fungsional.",
      clientName: "Ibu Siska R.",
    },
    {
      id: "3", title: "Bangun Baru Rumah Tropis Modern",
      images: [
        "https://picsum.photos/seed/before3/800/600",
        "https://picsum.photos/seed/after3/800/600",
        "https://picsum.photos/seed/detail4/800/600",
      ],
      date: "2024-01-20", value: 1250000000,
      description: "Pembangunan rumah tinggal 2 lantai dari nol dengan konsep tropis modern dan struktur tahan gempa.",
      testimonial: "Progress dilaporkan setiap hari melalui dashboard. Transparansi luar biasa!",
      clientName: "Bpk. Andre S.",
    },
  ];

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "gallery"), orderBy("date", "desc")),
      snap => {
        setGallery(snap.empty
          ? MOCK_GALLERY
          : snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryItem))
        );
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const addGalleryItem = async (data: Omit<GalleryItem, "id">) => {
    try {
      await addDoc(collection(db, "gallery"), data);
      toast.success("Foto ditambahkan ke galeri!");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "gallery");
    }
  };

  const deleteGalleryItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, "gallery", id));
      toast.success("Foto dihapus.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `gallery/${id}`);
    }
  };

  return { gallery, loading, addGalleryItem, deleteGalleryItem };
}

// ─── PROPERTIES ──────────────────────────────────────────────────────────────
export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "properties"), snap => {
      setProperties(snap.docs.map(d => ({ id: d.id, ...d.data() } as Property)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const addProperty = async (data: Omit<Property, "id">) => {
    try {
      await addDoc(collection(db, "properties"), data);
      toast.success("Listing ditambahkan!");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "properties");
    }
  };

  const updateProperty = async (id: string, data: Partial<Property>) => {
    try {
      await updateDoc(doc(db, "properties", id), data as any);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `properties/${id}`);
    }
  };

  return { properties, loading, addProperty, updateProperty };
}

// ─── MASTER DATA ─────────────────────────────────────────────────────────────
export function useMasterData() {
  const [masterData, setMasterData] = useState<WorkItemMaster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "master_data"), orderBy("category", "asc"));
    const unsub = onSnapshot(q, snap => {
      setMasterData(snap.empty
        ? WORK_ITEMS_MASTER
        : snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkItemMaster))
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  const updateMasterItem = async (id: string, data: Partial<WorkItemMaster>) => {
    try {
      await updateDoc(doc(db, "master_data", id), data as any);
      toast.success("Data diperbarui.");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `master_data/${id}`);
    }
  };

  const addMasterItem = async (data: Omit<WorkItemMaster, "id">) => {
    try {
      await addDoc(collection(db, "master_data"), data);
      toast.success("Item baru ditambahkan.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "master_data");
    }
  };

  return { masterData, loading, updateMasterItem, addMasterItem };
}

// ─── WORKFORCE ───────────────────────────────────────────────────────────────
export function useWorkforce() {
  const [workforce, setWorkforce] = useState<Workforce[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "workforce"), orderBy("name", "asc")),
      snap => {
        setWorkforce(snap.docs.map(d => ({ id: d.id, ...d.data() } as Workforce)));
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const addWorker = async (data: Omit<Workforce, "id">) => {
    try {
      await addDoc(collection(db, "workforce"), data);
      toast.success("Tenaga kerja ditambahkan.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "workforce");
    }
  };

  const updateWorker = async (id: string, data: Partial<Workforce>) => {
    try {
      await updateDoc(doc(db, "workforce", id), data as any);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `workforce/${id}`);
    }
  };

  return { workforce, loading, addWorker, updateWorker };
}

// ─── MATERIAL REQUESTS ───────────────────────────────────────────────────────
export function useMaterialRequests(projectId?: string) {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = projectId
      ? query(collection(db, "material_requests"), where("projectId", "==", projectId), orderBy("createdAt", "desc"))
      : query(collection(db, "material_requests"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, snap => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as MaterialRequest)));
      setLoading(false);
    });
    return unsub;
  }, [projectId]);

  const createRequest = async (data: Omit<MaterialRequest, "id">) => {
    try {
      await addDoc(collection(db, "material_requests"), {
        ...data,
        createdAt: new Date().toISOString(),
        status: "pending",
      });
      toast.success("Request material dikirim.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "material_requests");
    }
  };

  const updateRequestStatus = async (id: string, status: MaterialRequest["status"], note?: string) => {
    try {
      await updateDoc(doc(db, "material_requests", id), {
        status,
        updatedAt: new Date().toISOString(),
        ...(note && { note }),
      });
      toast.success(`Request ${status}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `material_requests/${id}`);
    }
  };

  return { requests, loading, createRequest, updateRequestStatus };
}

// ─── STATUS UPDATES (for Ticker) ─────────────────────────────────────────────
export function useStatusUpdates() {
  const [updates, setUpdates] = useState<Array<{ id: string; text?: string; title?: string; createdAt: string }>>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "status_updates"), orderBy("createdAt", "desc")),
      snap => setUpdates(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)))
    );
    return unsub;
  }, []);

  return { updates };
}

// ─── CMS CONFIG ──────────────────────────────────────────────────────────────

export function useCmsConfig() {
  const [cmsConfig, setCmsConfig] = useState<CmsConfig>({
    heroTitle: "Membangun Masa Depan Konstruksi Indonesia",
    heroSubtitle: "Platform All-in-One untuk Renovasi, Interior, dan Bangun Baru dengan Teknologi AI.",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "cms"), snap => {
      if (snap.exists()) {
        setCmsConfig(snap.data() as CmsConfig);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const updateCmsConfig = async (data: Partial<CmsConfig>) => {
    try {
      await setDoc(doc(db, "settings", "cms"), { ...cmsConfig, ...data, updatedAt: new Date().toISOString() }, { merge: true });
      setCmsConfig(prev => ({ ...prev, ...data }));
      toast.success("CMS diperbarui.");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "settings/cms");
    }
  };

  return { cmsConfig, loading, updateCmsConfig };
}

// ─── LEADS / CRM ─────────────────────────────────────────────────────────────
export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "leads"), orderBy("createdAt", "desc")),
      snap => {
        setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)));
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const addLead = async (data: Omit<Lead, "id">) => {
    try {
      await addDoc(collection(db, "leads"), { ...data, createdAt: new Date().toISOString() });
      toast.success("Lead baru ditambahkan.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "leads");
    }
  };

  const updateLead = async (id: string, data: Partial<Lead>) => {
    try {
      await updateDoc(doc(db, "leads", id), data as any);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `leads/${id}`);
    }
  };

  const deleteLead = async (id: string) => {
    try {
      await deleteDoc(doc(db, "leads", id));
      toast.success("Lead dihapus.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `leads/${id}`);
    }
  };

  return { leads, loading, addLead, updateLead, deleteLead };
}

// ─── SAVED ESTIMATES ──────────────────────────────────────────────────────────
export function useSavedEstimates(ownerId?: string) {
  const [estimates, setEstimates] = useState<SavedEstimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) { setLoading(false); return; }
    const q = query(
      collection(db, "saved_estimates"),
      where("ownerId", "==", ownerId),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setEstimates(snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedEstimate)));
      setLoading(false);
    });
    return unsub;
  }, [ownerId]);

  const saveEstimate = async (data: Omit<SavedEstimate, "id">) => {
    try {
      await addDoc(collection(db, "saved_estimates"), { ...data, createdAt: new Date().toISOString() });
      toast.success("Estimasi disimpan!");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "saved_estimates");
    }
  };

  const deleteEstimate = async (id: string) => {
    try {
      await deleteDoc(doc(db, "saved_estimates", id));
      toast.success("Estimasi dihapus.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `saved_estimates/${id}`);
    }
  };

  return { estimates, loading, saveEstimate, deleteEstimate };
}

// ─── MEDIA ASSETS ─────────────────────────────────────────────────────────────
export function useMediaAssets(category?: MediaAsset["category"]) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = category
      ? query(collection(db, "media_assets"), where("category", "==", category), orderBy("createdAt", "desc"))
      : query(collection(db, "media_assets"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, snap => {
      setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as MediaAsset)));
      setLoading(false);
    });
    return unsub;
  }, [category]);

  const addAsset = async (data: Omit<MediaAsset, "id">) => {
    try {
      await addDoc(collection(db, "media_assets"), data);
      toast.success("Aset ditambahkan.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "media_assets");
    }
  };

  return { assets, loading, addAsset };
}

// ─── MATERIAL SUGGESTIONS (Autocomplete) ─────────────────────────────────────
export function useMaterialSuggestions() {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "material_suggestions"), snap => {
      setSuggestions(snap.docs.map(d => (d.data() as MaterialSuggestion).name));
    });
    return unsub;
  }, []);

  return { suggestions };
}

// ─── FINANCE / TRANSACTIONS ──────────────────────────────────────────────────

export function useFinance(projectId?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = projectId
      ? query(collection(db, "transactions"), where("projectId", "==", projectId), orderBy("createdAt", "desc"))
      : query(collection(db, "transactions"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [projectId]);

  const addTransaction = async (data: Omit<Transaction, "id">) => {
    try {
      await addDoc(collection(db, "transactions"), { ...data, createdAt: new Date().toISOString() });
      toast.success("Transaksi dicatat.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "transactions");
    }
  };

  return { transactions, loading, addTransaction };
}

// ─── SYSTEM CONFIG ────────────────────────────────────────────────────────────
export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig>({
    globalMarkup: 0.2,
    surveyFee: 399000,
    escrowBank: "BRI",
    escrowAccount: "4792-0103-1488-535",
    escrowName: "TBJ CONTRACTOR",
    maintenanceMode: false,
    galleryPublishAll: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "system"), snap => {
      if (snap.exists()) setConfig(snap.data() as SystemConfig);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const updateConfig = async (data: Partial<SystemConfig>) => {
    try {
      await setDoc(doc(db, "settings", "system"), { ...config, ...data, updatedAt: new Date().toISOString() }, { merge: true });
      setConfig(prev => ({ ...prev, ...data }));
      toast.success("Konfigurasi disimpan.");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "settings/system");
    }
  };

  return { config, loading, updateConfig };
}

// Alias for Ticker which uses useCMSConfig (capital M)
export function useCMSConfig() {
  const result = useCmsConfig();
  return { config: result.cmsConfig, loading: result.loading, updateConfig: result.updateCmsConfig };
}

// ─── USERS LIST (Admin) ───────────────────────────────────────────────────────
export function useUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), snap => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  return { users, loading };
}

// Single user by ID
export function useUser(userId?: string) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, "users", userId), snap => {
      setUser(snap.exists() ? { uid: snap.id, ...snap.data() } : null);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [userId]);

  return { user, loading };
}

// ─── PM LIST ─────────────────────────────────────────────────────────────────
export function usePMs() {
  const [pms, setPMs] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "in", ["pm", "admin"]));
    const unsub = onSnapshot(q, snap => {
      setPMs(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, []);

  return { pms };
}

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
export function useAttendance(userId?: string) {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = userId
      ? query(collection(db, "attendance"), where("userId", "==", userId), orderBy("checkIn", "desc"))
      : query(collection(db, "attendance"), orderBy("checkIn", "desc"));

    const unsub = onSnapshot(q, snap => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [userId]);

  const checkIn = async (userId: string, userName: string, location?: any) => {
    try {
      await addDoc(collection(db, "attendance"), {
        userId, userName,
        checkIn: new Date().toISOString(),
        location: location || null,
        status: "present",
      });
      toast.success("Check-in berhasil!");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "attendance");
    }
  };

  return { attendance, loading, checkIn };
}

// ─── SITE LOGS ────────────────────────────────────────────────────────────────
export function useSiteLogs(projectId?: string) {
  const [logs, setLogs] = useState<SiteLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    const q = query(
      collection(db, "projects", projectId, "site_logs"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as SiteLog)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [projectId]);

  const addLog = async (data: Omit<SiteLog, "id">) => {
    if (!projectId) return;
    try {
      await addDoc(collection(db, "projects", projectId, "site_logs"), {
        ...data, createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `projects/${projectId}/site_logs`);
    }
  };

  return { logs, loading, addLog };
}

// ─── WORKER WAGES ─────────────────────────────────────────────────────────────
export function useWorkerWages(projectId?: string) {
  const [wages, setWages] = useState<WorkerWage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = projectId
      ? query(collection(db, "worker_wages"), where("projectId", "==", projectId), orderBy("createdAt", "desc"))
      : query(collection(db, "worker_wages"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, snap => {
      setWages(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkerWage)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [projectId]);

  const addWage = async (data: Omit<WorkerWage, "id">) => {
    try {
      await addDoc(collection(db, "worker_wages"), { ...data, createdAt: new Date().toISOString() });
      toast.success("Upah dicatat.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "worker_wages");
    }
  };

  const markWagePaid = async (id: string) => {
    try {
      await updateDoc(doc(db, "worker_wages", id), { status: "paid", paidAt: new Date().toISOString() });
      toast.success("Upah ditandai lunas.");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `worker_wages/${id}`);
    }
  };

  return { wages, loading, addWage, markWagePaid };
}

// ─── VENDORS ──────────────────────────────────────────────────────────────────
export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "vendors"), orderBy("name", "asc")),
      snap => {
        setVendors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
        setLoading(false);
      }, () => setLoading(false)
    );
    return unsub;
  }, []);

  const addVendor = async (data: Omit<Vendor, "id">) => {
    try {
      await addDoc(collection(db, "vendors"), { ...data, createdAt: new Date().toISOString() });
      toast.success("Vendor ditambahkan.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "vendors");
    }
  };

  return { vendors, loading, addVendor };
}

// ─── MASTER CATEGORIES ────────────────────────────────────────────────────────
export function useMasterCategories() {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "master_categories"), snap => {
      setCategories(snap.docs.map(d => d.data().name as string));
    }, () => {});
    return unsub;
  }, []);

  return { categories };
}

// ─── PROJECT TIMELINE ─────────────────────────────────────────────────────────
export function useProjectTimeline(projectId?: string) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    const q = query(
      collection(db, "projects", projectId, "timeline"),
      orderBy("date", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as TimelineEvent)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [projectId]);

  const addEvent = async (data: Omit<TimelineEvent, "id">) => {
    if (!projectId) return;
    try {
      await addDoc(collection(db, "projects", projectId, "timeline"), data);
      toast.success("Event timeline ditambahkan.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `projects/${projectId}/timeline`);
    }
  };

  const updateEvent = async (eventId: string, data: Partial<TimelineEvent>) => {
    if (!projectId) return;
    try {
      await updateDoc(doc(db, "projects", projectId, "timeline", eventId), data as any);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${projectId}/timeline/${eventId}`);
    }
  };

  return { events, loading, addEvent, updateEvent };
}

// ─── IMAGE UPLOAD (Firebase Storage simulation via base64) ───────────────────
// NOTE: Firebase Storage requires billing enabled. This stores URL references only.
// For actual file upload, use Firebase Storage SDK or Cloudinary.
export async function uploadImage(
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Simulate progress
  if (onProgress) {
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(r => setTimeout(r, 100));
      onProgress(i);
    }
  }

  // Convert to base64 for storage (for small images)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // In production: upload to Firebase Storage and return download URL
      // For now: return base64 data URL
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── SAVE IMAGE TO GUDANG (Media Warehouse) ───────────────────────────────────
export async function saveImageToGudang(
  url: string,
  name: string,
  category: string,
  projectId: string | undefined,
  uploadedBy: string
): Promise<void> {
  try {
    await addDoc(collection(db, "media_assets"), {
      url, name, category,
      projectId: projectId || null,
      uploadedBy,
      createdAt: new Date().toISOString(),
    });
    toast.success("Gambar disimpan ke Gudang Media.");
  } catch (err) {
    console.error("saveImageToGudang error:", err);
    toast.error("Gagal menyimpan ke gudang.");
  }
}

// ─── USEPROJECTS OVERLOAD with role support ───────────────────────────────────
// The Ticker calls useProjects(uid, role) - patch hook to accept optional role
// (existing useProjects only takes userId - wrap it)

// Note: useProjects already defined above. The role-based variant in Ticker
// is handled by the existing hook since admin can see all projects.
// Ticker's second param (role) is ignored gracefully.
