import { useState, useEffect } from "react";
import { auth, db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy, addDoc, updateDoc, deleteDoc, getDocs } from "firebase/firestore";
import { Project, BudgetCategory, BudgetItem, UserProfile, Property, WorkItemMaster, Workforce, Attendance, MaterialRequest } from "@/types";
import { WORK_ITEMS_MASTER } from "@/constants";
import { toast } from "sonner";

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

  return { projects, loading, createProject, updateProject, deleteProject };
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

  const addItem = async (categoryId: string, name: string, quantity: number, unit: string, pricePerUnit: number) => {
    if (!projectId) return;
    try {
      const totalPrice = quantity * pricePerUnit;
      await addDoc(collection(db, "projects", projectId, "items"), {
        projectId,
        categoryId,
        name,
        quantity,
        unit,
        pricePerUnit,
        totalPrice
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
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/items/${itemId}`);
    }
  };

  return { project, categories, items, loading, addCategory, addItem, deleteCategory, deleteItem, updateProjectStatus, updateItemProgress };
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
      await addDoc(collection(db, "properties"), data);
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

  return { properties, loading, addProperty, updateProperty };
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
      if (snapshot.empty) {
        // Fallback to constants if DB is empty (initial setup)
        setMasterData(WORK_ITEMS_MASTER);
      } else {
        setMasterData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WorkItemMaster[]);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "master_data");
    });
    return () => unsubscribe();
  }, [auth.currentUser, userRole]);

  const addMasterItem = async (data: Omit<WorkItemMaster, "id">) => {
    try {
      await addDoc(collection(db, "master_data"), data);
      toast.success("Item added to Master Database");
    } catch (error) {
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

  const resetDatabase = async () => {
    if (!confirm("PERINGATAN: Ini akan menghapus SEMUA proyek dan data klien. Data Master tidak akan dihapus. Lanjutkan?")) return;
    
    try {
      // Note: In a real app, this should be a Cloud Function. 
      // Here we simulate by clearing the main collections we have access to.
      const projectsSnap = await getDocs(collection(db, "projects"));
      for (const d of projectsSnap.docs) {
        await deleteDoc(doc(db, "projects", d.id));
      }
      
      const usersSnap = await getDocs(collection(db, "users"));
      for (const d of usersSnap.docs) {
        // Don't delete the current admin
        if (d.id !== auth.currentUser?.uid) {
          await deleteDoc(doc(db, "users", d.id));
        }
      }
      
      toast.success("Database berhasil di-reset (Proyek & Klien dihapus)");
      window.location.reload();
    } catch (error) {
      console.error("Reset error:", error);
      toast.error("Gagal melakukan reset database");
    }
  };

  return { masterData, loading, addMasterItem, updateMasterItem, deleteMasterItem, resetDatabase };
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

  return { workforce, loading, addWorkforce, updateWorkforce };
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
        createdAt: now,
        updatedAt: now,
        log: [{ time: now, action: "Request created", note: data.note }]
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
        log: [...currentLog, { time: now, action: `Status changed to ${status}`, note }]
      });
      toast.success(`Request ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `material_requests/${id}`);
    }
  };

  return { requests, loading, addRequest, updateRequestStatus };
}
