import { useState, useEffect } from "react";
import { auth, db, storage, handleFirestoreError, OperationType } from "@/lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy, addDoc, updateDoc, deleteDoc, getDocs, writeBatch, limit } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Project, BudgetCategory, BudgetItem, UserProfile, Property, WorkItemMaster, Workforce, Attendance, MaterialRequest, CMSConfig, Campaign, SystemConfig, Vendor, GalleryItem, TimelineEvent, MediaAsset, MediaCategory, MasterDataVersion } from "@/types";
import { WORK_ITEMS_MASTER } from "@/constants";
import { nuclearWipe } from "./database";
import { toast } from "sonner";

export const uploadImage = async (
  file: File, 
  path: string, 
  onProgress?: (progress: number) => void
): Promise<string> => {
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      }, 
      (error) => {
        console.error("Upload error:", error);
        toast.error("Gagal mengupload gambar.");
        reject(error);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            const isAdminEmail = firebaseUser.email === "harrisdwiditaputra@gmail.com";
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "User",
              photoURL: firebaseUser.photoURL || undefined,
              role: isAdminEmail ? "admin" : "user",
              tier: isAdminEmail ? "deal" : "prospect",
              aiUsageCount: 0,
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newUser);
            setUser(newUser);
          } else {
            const data = userDoc.data() as UserProfile;
            // Auto-promote specific email if not already admin
            if (firebaseUser.email === "harrisdwiditaputra@gmail.com" && data.role !== "admin") {
              await updateDoc(userDocRef, { role: "admin", tier: "deal" });
              setUser({ ...data, role: "admin", tier: "deal" });
            } else {
              setUser(data);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success("Login berhasil!");
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error("Domain belum diizinkan di Firebase Console. Silakan tambahkan domain ini ke Authorized Domains.");
      } else {
        toast.error("Gagal login: " + (error.message || "Terjadi kesalahan"));
      }
    }
  };

  const loginAsGuest = () => {
    const guestUser: UserProfile = {
      uid: "guest-" + Math.random().toString(36).substr(2, 9),
      email: "guest@tbj.com",
      displayName: "Guest User",
      role: "user",
      tier: "prospect",
      createdAt: new Date().toISOString()
    };
    setUser(guestUser);
    toast.success("Masuk sebagai Tamu (Demo Mode)");
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    
    // Handle Guest mode
    if (user.uid.startsWith("guest-")) {
      setUser(prev => prev ? { ...prev, ...data } : null);
      toast.success("Profil tamu diperbarui (Local only)");
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), data);
      setUser(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error("Update profile error:", error);
      toast.error("Gagal memperbarui profil");
    }
  };

  const incrementAIUsage = async () => {
    if (!user || user.uid.startsWith("guest-")) return;
    const newCount = (user.aiUsageCount || 0) + 1;
    await updateProfile({ aiUsageCount: newCount });
  };

  return { user, loading, login, loginAsGuest, logout, updateProfile, incrementAIUsage };
}

export function useProjects(userId?: string, userRole?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setProjects([]);
      setLoading(false);
      return;
    }

    // If userId not provided, we are listing all (Staff only)
    if (!userId && userRole !== 'admin' && userRole !== 'pm') {
      setProjects([]);
      setLoading(false);
      return;
    }

    // If guest, show nothing
    if (userId && userId.startsWith("guest-")) {
      setProjects([]);
      setLoading(false);
      return;
    }

    // If userId provided, filter by owner. Otherwise (for PM/Admin), show all.
    const q = userId 
      ? query(collection(db, "projects"), where("ownerId", "==", userId), orderBy("createdAt", "desc"))
      : query(collection(db, "projects"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "projects");
    });

    return () => unsubscribe();
  }, [auth.currentUser, userId, userRole]);

  const createProject = async (name: string, description: string) => {
    if (!userId) return;
    try {
      const newProject = {
        name,
        description,
        ownerId: userId,
        createdAt: new Date().toISOString(),
        totalBudget: 0,
        escrowBalance: 0,
        releasedAmount: 0,
        paymentMilestones: [
          { id: "dp", label: "DP Awal", percentage: 30, amount: 0, status: "pending", requiredProgress: 0 },
          { id: "progress30", label: "Progress 30%", percentage: 30, amount: 0, status: "pending", requiredProgress: 30 },
          { id: "progress60", label: "Progress 60%", percentage: 35, amount: 0, status: "pending", requiredProgress: 60 },
          { id: "retention", label: "Retensi 5%", percentage: 5, amount: 0, status: "pending", requiredProgress: 100 }
        ],
        status: "draft"
      };
      await addDoc(collection(db, "projects"), newProject);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "projects");
    }
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
    try {
      await updateDoc(doc(db, "projects", id), data);
      toast.success("Project updated successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await deleteDoc(doc(db, "projects", id));
      toast.success("Project deleted successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${id}`);
    }
  };

  const fixProjectMilestones = async () => {
    try {
      for (const p of projects) {
        const updatedMilestones = [
          { id: "dp", label: "DP Awal", percentage: 30, amount: p.totalBudget * 0.3, status: p.paymentMilestones[0]?.status || "pending", requiredProgress: 0 },
          { id: "progress30", label: "Progress 30%", percentage: 30, amount: p.totalBudget * 0.3, status: p.paymentMilestones[1]?.status || "pending", requiredProgress: 30 },
          { id: "progress60", label: "Progress 60%", percentage: 35, amount: p.totalBudget * 0.35, status: p.paymentMilestones[2]?.status || "pending", requiredProgress: 60 },
          { id: "retention", label: "Retensi 5%", percentage: 5, amount: p.totalBudget * 0.05, status: p.paymentMilestones[3]?.status || "pending", requiredProgress: 100 }
        ];
        await updateDoc(doc(db, "projects", p.id), { paymentMilestones: updatedMilestones });
      }
      toast.success("All project milestones updated to 30%, 30%, 35%, 5%");
    } catch (error) {
      toast.error("Failed to fix milestones");
    }
  };

  return { projects, loading, createProject, updateProject, deleteProject, fixProjectMilestones };
}

export function useProjectDetails(projectId: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || projectId.startsWith("guest-") || !auth.currentUser) {
      setLoading(false);
      return;
    }

    // Project Doc
    const projectUnsubscribe = onSnapshot(doc(db, "projects", projectId), (snapshot) => {
      if (snapshot.exists()) {
        setProject({ id: snapshot.id, ...snapshot.data() } as Project);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `projects/${projectId}`);
    });

    // Categories
    const categoriesUnsubscribe = onSnapshot(
      query(collection(db, "projects", projectId, "categories"), orderBy("order", "asc")),
      (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BudgetCategory[]);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/categories`);
      }
    );

    // Items
    const itemsUnsubscribe = onSnapshot(
      collection(db, "projects", projectId, "items"),
      (snapshot) => {
        setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BudgetItem[]);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/items`);
      }
    );

    setLoading(false);
    return () => {
      projectUnsubscribe();
      categoriesUnsubscribe();
      itemsUnsubscribe();
    };
  }, [projectId]);

  const addCategory = async (name: string) => {
    if (!projectId) return;
    try {
      await addDoc(collection(db, "projects", projectId, "categories"), {
        projectId,
        name,
        order: categories.length
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/categories`);
    }
  };

  const addItem = async (categoryId: string, name: string, quantity: number, unit: string, pricePerUnit: number, technicalSpecs?: string) => {
    if (!projectId) return;
    try {
      const totalPrice = quantity * pricePerUnit;
      await addDoc(collection(db, "projects", projectId, "items"), {
        projectId,
        categoryId,
        name,
        technicalSpecs: technicalSpecs || "",
        quantity,
        unit,
        pricePerUnit,
        totalPrice,
        progress: 0
      });

      // Update project total budget (simplified, in real app use cloud functions or transactions)
      if (project) {
        await updateDoc(doc(db, "projects", projectId), {
          totalBudget: project.totalBudget + totalPrice
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/items`);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!projectId) return;
    try {
      // Delete all items in category first
      const itemsToDelete = items.filter(i => i.categoryId === categoryId);
      for (const item of itemsToDelete) {
        await deleteDoc(doc(db, "projects", projectId, "items", item.id));
      }
      await deleteDoc(doc(db, "projects", projectId, "categories", categoryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}/categories/${categoryId}`);
    }
  };

  const deleteItem = async (itemId: string, itemPrice: number) => {
    if (!projectId || !project) return;
    try {
      await deleteDoc(doc(db, "projects", projectId, "items", itemId));
      await updateDoc(doc(db, "projects", projectId), {
        totalBudget: Math.max(0, project.totalBudget - itemPrice)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}/items/${itemId}`);
    }
  };

  const updateProjectStatus = async (status: "survey" | "active" | "completed") => {
    if (!projectId) return;
    try {
      await updateDoc(doc(db, "projects", projectId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  const updateItemProgress = async (itemId: string, progress: number) => {
    if (!projectId) return;
    try {
      await updateDoc(doc(db, "projects", projectId, "items", itemId), { progress });
      
      // Recalculate project total progress (weighted by price)
      const itemsSnapshot = await getDocs(collection(db, "projects", projectId, "items"));
      const allItems = itemsSnapshot.docs.map(d => d.data() as BudgetItem);
      
      const totalBudget = allItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
      let totalProgress = 0;
      
      if (totalBudget > 0) {
        const weightedProgress = allItems.reduce((acc, item) => {
          return acc + ((item.progress || 0) * (item.totalPrice || 0));
        }, 0);
        totalProgress = Math.round(weightedProgress / totalBudget);
      } else if (allItems.length > 0) {
        totalProgress = Math.round(allItems.reduce((acc, item) => acc + (item.progress || 0), 0) / allItems.length);
      }
      
      await updateDoc(doc(db, "projects", projectId), { progress: totalProgress });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/items/${itemId}`);
    }
  };

  const updateItem = async (itemId: string, data: Partial<BudgetItem>) => {
    if (!projectId) return;
    try {
      await updateDoc(doc(db, "projects", projectId, "items", itemId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/items/${itemId}`);
    }
  };

  const releaseMilestone = async (milestoneId: string) => {
    if (!projectId || !project) return;
    try {
      const updatedMilestones = project.paymentMilestones.map(m => {
        if (m.id === milestoneId) {
          return { ...m, status: "released" as const, releaseDate: new Date().toISOString() };
        }
        return m;
      });
      
      const milestone = project.paymentMilestones.find(m => m.id === milestoneId);
      if (milestone && milestone.status !== "released") {
        await updateDoc(doc(db, "projects", projectId), {
          paymentMilestones: updatedMilestones,
          releasedAmount: project.releasedAmount + milestone.amount,
          escrowBalance: project.escrowBalance - milestone.amount
        });
        
        // Record transaction
        await addDoc(collection(db, "financial_transactions"), {
          projectId,
          projectName: project.name,
          type: "income",
          category: "client_payment",
          amount: milestone.amount,
          description: `Pencairan Milestone: ${milestone.label}`,
          date: new Date().toISOString(),
          status: "completed"
        });
        
        toast.success(`Dana ${milestone.label} berhasil dicairkan`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  const addSiteLog = async (data: any) => {
    if (!projectId) return;
    try {
      await addDoc(collection(db, "projects", projectId, "site_logs"), {
        ...data,
        createdAt: new Date().toISOString()
      });
      toast.success("Site log added successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/site_logs`);
    }
  };

  const addTimelineEvent = async (event: Omit<TimelineEvent, "id">) => {
    if (!projectId || !project) return;
    try {
      const newTimeline = [...(project.timeline || []), { ...event, id: Math.random().toString(36).substring(7) }];
      await updateDoc(doc(db, "projects", projectId), { timeline: newTimeline });
      toast.success("Milestone added to timeline");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  const updateTimelineEvent = async (eventId: string, status: TimelineEvent["status"]) => {
    if (!projectId || !project) return;
    try {
      const newTimeline = (project.timeline || []).map(e => e.id === eventId ? { ...e, status } : e);
      await updateDoc(doc(db, "projects", projectId), { timeline: newTimeline });
      toast.success("Timeline updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  return { project, categories, items, loading, addCategory, addItem, updateItem, deleteCategory, deleteItem, updateProjectStatus, updateItemProgress, releaseMilestone, addSiteLog, addTimelineEvent, updateTimelineEvent };
}

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setProperties([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "properties"), orderBy("title", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProperties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Property[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "properties");
    });
    return () => unsubscribe();
  }, [auth.currentUser]);

  const addProperty = async (data: Omit<Property, "id">) => {
    try {
      await addDoc(collection(db, "properties"), {
        ...data,
        published: true // Default to published for now
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "properties");
    }
  };

  const updateProperty = async (id: string, data: Partial<Property>) => {
    try {
      await updateDoc(doc(db, "properties", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `properties/${id}`);
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      await deleteDoc(doc(db, "properties", id));
      toast.success("Property removed");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `properties/${id}`);
    }
  };

  return { properties, loading, addProperty, updateProperty, deleteProperty };
}

export function useGallery() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGallery(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GalleryItem[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "gallery");
    });
    return () => unsubscribe();
  }, []);

  const addGalleryItem = async (data: Omit<GalleryItem, "id" | "createdAt">) => {
    try {
      await addDoc(collection(db, "gallery"), {
        ...data,
        published: true, // Default to true
        createdAt: new Date().toISOString()
      });
      toast.success("Gallery item added");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "gallery");
    }
  };

  const deleteGalleryItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, "gallery", id));
      toast.success("Gallery item removed");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `gallery/${id}`);
    }
  };

  const updateGalleryItem = async (id: string, data: Partial<GalleryItem>) => {
    try {
      await updateDoc(doc(db, "gallery", id), data);
      toast.success("Gallery item updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `gallery/${id}`);
    }
  };

  return { gallery, loading, addGalleryItem, deleteGalleryItem, updateGalleryItem };
}

export function useMediaAssets(category?: MediaCategory, projectId?: string) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser && category !== 'system' && category !== 'marketing') {
      setAssets([]);
      setLoading(false);
      return;
    }
    let constraints: any[] = [];
    
    if (category) constraints.push(where("category", "==", category));
    if (projectId) constraints.push(where("projectId", "==", projectId));
    
    // Always sort by date
    constraints.push(orderBy("createdAt", "desc"));
    
    const q = query(collection(db, "media_assets"), ...constraints);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MediaAsset[];
      setAssets(data);
      setLoading(false);
    }, (error) => {
      console.error("Media assets error:", error);
      // Fallback if index not ready
      if (error.code === 'failed-precondition') {
        const simpleQ = query(collection(db, "media_assets"), orderBy("createdAt", "desc"));
        onSnapshot(simpleQ, (snap) => {
          const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MediaAsset[];
          setAssets(category ? d.filter(a => a.category === category) : d);
          setLoading(false);
        });
      } else {
        handleFirestoreError(error, OperationType.LIST, "media_assets");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [category, projectId]);

  const addAsset = async (data: Omit<MediaAsset, "id">) => {
    try {
      // Filter out undefined values as Firestore doesn't support them
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
      await addDoc(collection(db, "media_assets"), cleanData);
      toast.success("Aset media berhasil ditambahkan.");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "media_assets");
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      await deleteDoc(doc(db, "media_assets", id));
      toast.success("Aset media berhasil dihapus.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "media_assets");
    }
  };

  const updateAsset = async (id: string, data: Partial<MediaAsset>) => {
    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
      await updateDoc(doc(db, "media_assets", id), cleanData);
      toast.success("Aset media berhasil diperbarui.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "media_assets");
    }
  };

  return { assets, loading, addAsset, deleteAsset, updateAsset };
}

export function useSavedEstimates(userId?: string) {
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId && !auth.currentUser) {
      setEstimates([]);
      setLoading(false);
      return;
    }
    const targetUserId = userId || auth.currentUser?.uid;
    if (!targetUserId) return;

    const q = query(collection(db, "saved_estimates"), where("ownerId", "==", targetUserId), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEstimates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "saved_estimates");
    });
    return () => unsubscribe();
  }, [userId]);

  const saveEstimate = async (data: any) => {
    try {
      const estRef = doc(collection(db, "saved_estimates"));
      await setDoc(estRef, {
        ...data,
        ownerId: auth.currentUser?.uid,
        createdAt: new Date().toISOString()
      });
      toast.success("Draf RAB berhasil disimpan ke saved_estimates.");
      return estRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "saved_estimates");
    }
  };

  const deleteEstimate = async (id: string) => {
    try {
      await deleteDoc(doc(db, "saved_estimates", id));
      toast.success("Draf RAB berhasil dihapus.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `saved_estimates/${id}`);
    }
  };

  return { estimates, loading, saveEstimate, deleteEstimate };
}

export const saveImageToGudang = async (file: File, category: MediaCategory = "projects", projectId?: string, name?: string) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const assetData: Omit<MediaAsset, "id"> = {
          name: name || file.name,
          url: base64,
          category,
          projectId,
          fileType: "image",
          uploadedBy: auth.currentUser?.uid || "system",
          uploadedByName: auth.currentUser?.displayName || "System",
          createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, "media_assets"), assetData);
        toast.success("Gambar berhasil disimpan ke Gudang Gambar.");
        resolve(base64);
      } catch (error) {
        toast.error("Gagal menyimpan gambar.");
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setVendors([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "vendors"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVendors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Vendor[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "vendors");
    });
    return () => unsubscribe();
  }, []);

  const addVendor = async (data: Omit<Vendor, "id">) => {
    try {
      await addDoc(collection(db, "vendors"), data);
      toast.success("Vendor added to database");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "vendors");
    }
  };

  const updateVendor = async (id: string, data: Partial<Vendor>) => {
    try {
      await updateDoc(doc(db, "vendors", id), data);
      toast.success("Vendor updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vendors/${id}`);
    }
  };

  const deleteVendor = async (id: string) => {
    try {
      await deleteDoc(doc(db, "vendors", id));
      toast.success("Vendor removed");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vendors/${id}`);
    }
  };

  return { vendors, loading, addVendor, updateVendor, deleteVendor };
}

export function useMasterData(userRole?: string) {
  const [masterData, setMasterData] = useState<WorkItemMaster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setMasterData(WORK_ITEMS_MASTER);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "master_data"), orderBy("category", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WorkItemMaster[];
      
      // Merge: 
      // 1. Start with local data as base
      const itemsMap = new Map<string, WorkItemMaster>();
      WORK_ITEMS_MASTER.forEach(item => itemsMap.set(item.id, item));
      
      // 2. Overwrite with Cloud data. If Cloud has a new ID, it adds it.
      // If Cloud has the same field 'code', we might still have duplicates if ID differs.
      // We will prefer the ID from Cloud.
      dbData.forEach(item => {
        itemsMap.set(item.id, item);
      });
      
      setMasterData(Array.from(itemsMap.values()));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "master_data");
    });
    return () => unsubscribe();
  }, [auth.currentUser, userRole]);

  const addMasterItem = async (data: WorkItemMaster | Omit<WorkItemMaster, "id">) => {
    try {
      if ('id' in data) {
        // Use setDoc if we have a specific ID (especially for syncing constants)
        await setDoc(doc(db, "master_data", data.id), data);
      } else {
        await addDoc(collection(db, "master_data"), data);
      }
      toast.success("Item berhasil ditambahkan ke database.");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "master_data");
    }
  };

  const bulkAddMasterItems = async (items: any[]) => {
    try {
      const total = items.length;
      toast.loading(`Importing ${total} items...`, { id: "bulk-import" });
      
      let batch = writeBatch(db);
      let count = 0;
      let processed = 0;

      for (const item of items) {
        const docRef = ('id' in item) ? doc(db, "master_data", item.id) : doc(collection(db, "master_data"));
        batch.set(docRef, {
          ...item,
          soldCount: item.soldCount || 0,
          revenue: item.revenue || 0,
          status: item.status || "visible",
          createdAt: item.createdAt || new Date().toISOString()
        });
        
        count++;
        processed++;

        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
          toast.loading(`Imported ${processed}/${total}...`, { id: "bulk-import" });
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      toast.success(`Successfully imported ${total} items.`, { id: "bulk-import" });
    } catch (error) {
      console.error("Bulk add error:", error);
      handleFirestoreError(error, OperationType.CREATE, "master_data");
    }
  };

  const updateMasterItem = async (id: string, data: Partial<WorkItemMaster>) => {
    try {
      await updateDoc(doc(db, "master_data", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `master_data/${id}`);
    }
  };

  const deleteMasterItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, "master_data", id));
      toast.success("Item deleted from Master Database");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `master_data/${id}`);
    }
  };

  const [masterVersions, setMasterVersions] = useState<MasterDataVersion[]>([]);

  useEffect(() => {
    if (userRole !== "admin") return;
    const q = query(collection(db, "master_data_versions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMasterVersions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterDataVersion)));
    });
    return () => unsubscribe();
  }, [userRole]);

  const saveVersion = async (versionName: string, notes?: string) => {
    try {
      const versionDoc: Omit<MasterDataVersion, "id"> = {
        versionName,
        items: masterData,
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || 'system',
        notes
      };
      await addDoc(collection(db, "master_data_versions"), versionDoc);
      toast.success(`Versi Master "${versionName}" berhasil disimpan.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "master_data_versions");
    }
  };

  const activateVersion = async (versionId: string) => {
    const version = masterVersions.find(v => v.id === versionId);
    if (!version) return;

    if (!confirm(`⚠️ PERINGATAN: Ini akan MENGGANTI seluruh data master saat ini dengan veri "${version.versionName}". Lanjutkan?`)) return;

    try {
      toast.loading(`Mengaktifkan versi ${version.versionName}...`, { id: 'activate-version' });
      
      // 1. Clear current master
      const q = query(collection(db, "master_data"), limit(500));
      let snap = await getDocs(q);
      while (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        snap = await getDocs(q);
      }

      // 2. Upload version items
      let batch = writeBatch(db);
      let count = 0;
      for (const item of version.items) {
        // Remove ID to create new docs
        const { id, ...itemData } = item;
        const newRef = doc(collection(db, "master_data"));
        batch.set(newRef, itemData);
        count++;
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();

      toast.success(`Versi "${version.versionName}" berhasil diaktifkan.`, { id: 'activate-version' });
    } catch (error) {
      console.error("Activate Version failed", error);
      toast.error("Gagal mengaktifkan versi.", { id: 'activate-version' });
    }
  };

  const deleteVersion = async (id: string) => {
    if (!confirm("Hapus versi ini dari arsip?")) return;
    try {
      await deleteDoc(doc(db, "master_data_versions", id));
      toast.success("Versi berhasil dihapus.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `master_data_versions/${id}`);
    }
  };

  const addMasterCategory = async (name: string) => {
    try {
      await addDoc(collection(db, "master_categories"), { name, createdAt: new Date().toISOString() });
      toast.success("Category added to Master Database");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "master_categories");
    }
  };

  const resetDatabase = async () => {
    if (!confirm("PERINGATAN: Ini akan menghapus SEMUA proyek dan data klien. Data Master tidak akan dihapus. Lanjutkan?")) return;
    
    try {
      toast.loading("Resetting database...", { id: "reset-db" });
      
      const collectionsToClear = ["projects", "material_requests", "attendance", "financial_transactions", "worker_wages"];
      for (const colName of collectionsToClear) {
        let hasMore = true;
        let deletedInCol = 0;
        
        while (hasMore) {
          const q = query(collection(db, colName), limit(500));
          const snap = await getDocs(q);
          
          if (snap.empty) {
            hasMore = false;
            break;
          }
          
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
          deletedInCol += snap.docs.length;
          toast.loading(`Resetting ${colName}: ${deletedInCol} items...`, { id: "reset-db" });
        }
      }
      
      const usersSnap = await getDocs(collection(db, "users"));
      let userBatch = writeBatch(db);
      let userCount = 0;
      for (const d of usersSnap.docs) {
        if (d.id !== auth.currentUser?.uid) {
          userBatch.delete(d.ref);
          userCount++;
          if (userCount === 500) {
            await userBatch.commit();
            userBatch = writeBatch(db);
            userCount = 0;
          }
        }
      }
      if (userCount > 0) await userBatch.commit();
      
      toast.success("Database berhasil di-reset (Kecuali Master)", { id: "reset-db" });
      window.location.reload();
    } catch (error: any) {
      console.error("Reset error:", error);
      toast.error(`Gagal reset: ${error.message || "Unknown error"}`, { id: "reset-db" });
    }
  };

  const clearMasterData = async () => {
    if (!confirm("⚠️ PERINGATAN KRITIKAL: Ini akan MENGHAPUS SEMUA DATA MASTER di Firestore. Lanjutkan?")) return;
    await nuclearWipe();
  };

  return { masterData, loading, addMasterItem, updateMasterItem, deleteMasterItem, saveVersion, masterVersions, activateVersion, deleteVersion, addMasterCategory, resetDatabase, clearMasterData, bulkAddMasterItems };
}

export function useMasterCategories() {
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setCategories([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "master_categories"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "master_categories");
    });
    return () => unsubscribe();
  }, []);

  return { categories, loading };
}

export function useUsers(userRole?: string) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser || (userRole !== 'admin' && userRole !== 'pm')) {
      setUsers([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "users"), orderBy("role", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data() })) as UserProfile[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsubscribe();
  }, [auth.currentUser, userRole]);

  const updateUser = async (uid: string, data: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, "users", uid), data);
      toast.success("User updated successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  return { users, loading, updateUser };
}

export function useUser(uid: string | undefined) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !auth.currentUser) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", uid), (snapshot) => {
      if (snapshot.exists()) {
        setUser({ ...snapshot.data() } as UserProfile);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    });

    return () => unsubscribe();
  }, [uid]);

  return { user, loading };
}

export function usePMs() {
  const [pms, setPMs] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setPMs([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "users"), where("role", "==", "pm"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPMs(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsubscribe();
  }, []);

  return { pms, loading };
}

export function useWorkforce(userRole?: string, userTier?: string) {
  const [workforce, setWorkforce] = useState<Workforce[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setWorkforce([]);
      setLoading(false);
      return;
    }

    // Allow Admin, PM, or Tier 3 users
    if (userRole !== 'admin' && userRole !== 'pm' && userTier !== 'deal') {
      setWorkforce([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "workforce"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWorkforce(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Workforce[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "workforce");
    });
    return () => unsubscribe();
  }, [auth.currentUser, userRole]);

  const addWorkforce = async (data: Omit<Workforce, "id">) => {
    try {
      await addDoc(collection(db, "workforce"), data);
      toast.success("Workforce added");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "workforce");
    }
  };

  const updateWorkforce = async (id: string, data: Partial<Workforce>) => {
    try {
      await updateDoc(doc(db, "workforce", id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workforce/${id}`);
    }
  };

  const deleteWorkforce = async (id: string) => {
    try {
      await deleteDoc(doc(db, "workforce", id));
      toast.success("Workforce removed");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workforce/${id}`);
    }
  };

  return { workforce, loading, addWorkforce, updateWorkforce, deleteWorkforce };
}

export function useAttendance(userRole?: string) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser || (userRole !== 'admin' && userRole !== 'pm')) {
      setAttendance([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "attendance"), orderBy("checkIn", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Attendance[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "attendance");
    });
    return () => unsubscribe();
  }, [auth.currentUser, userRole]);

  const checkIn = async (data: Omit<Attendance, "id">) => {
    try {
      await addDoc(collection(db, "attendance"), data);
      toast.success("Check-in successful");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "attendance");
    }
  };

  const checkOut = async (id: string, location?: { lat: number; lng: number }) => {
    try {
      await updateDoc(doc(db, "attendance", id), {
        checkOut: new Date().toISOString(),
        location
      });
      toast.success("Check-out successful");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `attendance/${id}`);
    }
  };

  return { attendance, loading, checkIn, checkOut };
}

export function useMaterialRequests(userRole?: string) {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser || (userRole !== 'admin' && userRole !== 'pm')) {
      setRequests([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "material_requests"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MaterialRequest[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "material_requests");
    });
    return () => unsubscribe();
  }, [auth.currentUser, userRole]);

  const addRequest = async (data: Omit<MaterialRequest, "id" | "createdAt" | "updatedAt" | "log">) => {
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "material_requests"), {
        ...data,
        note: data.note || "",
        createdAt: now,
        updatedAt: now,
        log: [{ time: now, action: "Request created", note: data.note || "Initial request" }]
      });
      toast.success("Material request sent");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "material_requests");
    }
  };

  const updateRequestStatus = async (id: string, status: MaterialRequest["status"], note?: string) => {
    try {
      const now = new Date().toISOString();
      const docRef = doc(db, "material_requests", id);
      const snap = await getDoc(docRef);
      const currentLog = snap.data()?.log || [];
      
      await updateDoc(docRef, {
        status,
        updatedAt: now,
        log: [...currentLog, { time: now, action: `Status changed to ${status}`, note: note || "" }]
      });
      toast.success(`Request ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `material_requests/${id}`);
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      await deleteDoc(doc(db, "material_requests", id));
      toast.success("Request deleted successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `material_requests/${id}`);
    }
  };

  const assignVendor = async (id: string, vendorId: string, vendorName: string) => {
    try {
      const now = new Date().toISOString();
      const docRef = doc(db, "material_requests", id);
      const snap = await getDoc(docRef);
      const currentLog = snap.data()?.log || [];
      
      await updateDoc(docRef, {
        vendorId,
        vendorName,
        status: "approved",
        updatedAt: now,
        log: [...currentLog, { time: now, action: `Vendor assigned: ${vendorName}`, note: `Assigned to ${vendorName}` }]
      });
      toast.success(`Vendor ${vendorName} assigned to request`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `material_requests/${id}`);
    }
  };

  return { requests, loading, addRequest, updateRequestStatus, deleteRequest, assignVendor };
}

export function useMaterialSuggestions() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "material_suggestions"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSuggestions(snapshot.docs.map(doc => doc.data().name));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "material_suggestions");
    });
    return () => unsubscribe();
  }, []);

  const addSuggestion = async (name: string) => {
    if (!name) return;
    try {
      // Check if already exists in local state to avoid redundant writes
      const exists = suggestions.some(s => s.toLowerCase() === name.toLowerCase());
      if (exists) return;

      await addDoc(collection(db, "material_suggestions"), {
        name,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error adding suggestion:", error);
    }
  };

  return { suggestions, loading, addSuggestion };
}

export function useCMSConfig() {
  const [config, setConfig] = useState<CMSConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "content_management", "dashboard_config"), (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data() as CMSConfig);
      } else {
        // Default values
        setConfig({
          heroTitle: "Membangun Masa Depan Konstruksi Indonesia",
          heroSubtitle: "Platform All-in-One untuk Renovasi, Interior, dan Bangun Baru dengan Teknologi AI.",
          promoText: "Promo Ramadan: Diskon 15% untuk Jasa Desain Interior!",
          promoActive: true
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "content_management/dashboard_config");
    });
    return () => unsubscribe();
  }, []);

  const updateConfig = async (data: Partial<CMSConfig>) => {
    try {
      await setDoc(doc(db, "content_management", "dashboard_config"), data, { merge: true });
      toast.success("CMS Configuration updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "content_management/dashboard_config");
    }
  };

  return { config, loading, updateConfig };
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setCampaigns([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "campaigns"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Campaign[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "campaigns");
    });
    return () => unsubscribe();
  }, []);

  const addCampaign = async (data: Omit<Campaign, "id" | "createdAt">) => {
    try {
      await addDoc(collection(db, "campaigns"), {
        ...data,
        createdAt: new Date().toISOString()
      });
      toast.success("Campaign created");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "campaigns");
    }
  };

  const updateCampaign = async (id: string, data: Partial<Campaign>) => {
    try {
      await updateDoc(doc(db, "campaigns", id), data);
      toast.success("Campaign updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `campaigns/${id}`);
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      await deleteDoc(doc(db, "campaigns", id));
      toast.success("Campaign deleted");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `campaigns/${id}`);
    }
  };

  return { campaigns, loading, addCampaign, updateCampaign, deleteCampaign };
}

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "system_settings", "global_config"), (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data() as SystemConfig);
      } else {
        // Default values
        setConfig({
          surveyFee: 399000,
          aiFreeLimit: 1,
          globalMarkup: 20,
          autoNotificationWA: true,
          aiAnalysisMode: true
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "system_settings/global_config");
    });
    return () => unsubscribe();
  }, []);

  const updateConfig = async (data: Partial<SystemConfig>) => {
    try {
      await setDoc(doc(db, "system_settings", "global_config"), data, { merge: true });
      toast.success("System configuration updated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "system_settings/global_config");
    }
  };

  return { config, loading, updateConfig };
}

export async function incrementAIUsage() {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      const currentUsage = data.aiUsageCount || 0;
      const isVerified = data.waVerified || false;
      
      // If verified, limit might be higher (e.g. 2), otherwise 1
      const limit = isVerified ? 2 : 1;
      
      await updateDoc(userRef, {
        aiUsageCount: currentUsage + 1
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
  }
}

export function useFinance(projectId?: string) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    let q = query(collection(db, "financial_transactions"), orderBy("date", "desc"));
    if (projectId) {
      q = query(collection(db, "financial_transactions"), where("projectId", "==", projectId), orderBy("date", "desc"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "financial_transactions");
    });
    return () => unsubscribe();
  }, [projectId]);

  const addTransaction = async (data: any) => {
    try {
      await addDoc(collection(db, "financial_transactions"), {
        ...data,
        date: data.date || new Date().toISOString()
      });
      toast.success("Transaksi berhasil dicatat");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "financial_transactions");
    }
  };

  return { transactions, loading, addTransaction };
}

export function useWorkerWages(projectId?: string) {
  const [wages, setWages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setWages([]);
      setLoading(false);
      return;
    }
    let q = query(collection(db, "worker_wages"), orderBy("weekEnding", "desc"));
    if (projectId) {
      q = query(collection(db, "worker_wages"), where("projectId", "==", projectId), orderBy("weekEnding", "desc"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "worker_wages");
    });
    return () => unsubscribe();
  }, [projectId]);

  const addWage = async (data: any) => {
    try {
      await addDoc(collection(db, "worker_wages"), {
        ...data,
        createdAt: new Date().toISOString()
      });
      toast.success("Gaji tukang berhasil dicatat");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "worker_wages");
    }
  };

  const updateWageStatus = async (id: string, status: "pending" | "paid") => {
    try {
      await updateDoc(doc(db, "worker_wages", id), { status });
      toast.success("Status gaji diperbarui");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `worker_wages/${id}`);
    }
  };

  return { wages, loading, addWage, updateWageStatus };
}

export function useSiteLogs(projectId?: string) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !auth.currentUser) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "projects", projectId, "site_logs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/site_logs`);
    });
    return () => unsubscribe();
  }, [projectId]);

  return { logs, loading };
}
