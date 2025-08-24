import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBxgvYasrsyi9OaskNjDUpHRpoVwiMm3mc",
  authDomain: "cuisine-8314c.firebaseapp.com",
  projectId: "cuisine-8314c",
  storageBucket: "cuisine-8314c.firebasestorage.app",
  messagingSenderId: "584100186110",
  appId: "1:584100186110:web:ee35386662f669b6e762af",
  measurementId: "G-T5L66N2VRN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;