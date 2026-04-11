import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Menggunakan Environment Variables dari Vercel (Lebih Aman & Anti Blank)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Ekspor tunggal agar tidak ada error "already declared"
export const db = getFirestore(app);
export const auth = getAuth(app);

// Helper error sederhana
export function handleFirestoreError(error: any) {
  console.error('Firestore Error:', error);
  throw error;
}
