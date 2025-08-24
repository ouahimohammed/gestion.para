import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // ✅ imported

import {  setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type UserRole = 'super_admin' | 'responsable' | 'employe';

export interface UserProfile {
  uid: string;
  nom: string;
  email: string;
  role: UserRole;
  entreprise?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserProfile({ uid: user.uid, ...userDoc.data() } as UserProfile);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Utilisateur authentifié:", userCredential.user.uid);
    
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (userDoc.exists()) {
      const profileData = { uid: userCredential.user.uid, ...userDoc.data() } as UserProfile;
      console.log("Profil utilisateur:", profileData);
      setUserProfile(profileData);
    } else {
      console.log("Création d'un profil utilisateur par défaut");
      
      // Créer un profil par défaut
      const defaultProfile: UserProfile = {
        uid: userCredential.user.uid,
        nom: userCredential.user.email?.split('@')[0] || 'Utilisateur',
        email: userCredential.user.email || '',
        role: 'super_admin', // rôle par défaut
        entreprise: 'default' // à modifier selon votre logique
      };
      
      // Enregistrer dans Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), defaultProfile);
      setUserProfile(defaultProfile);
    }
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    throw error;
  }
};

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}