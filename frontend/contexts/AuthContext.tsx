"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  UserCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  waiverSigned: boolean;
  checkingWaiver: boolean;
  markWaiverSigned: () => void;
  refreshWaiverStatus: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<UserCredential>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [waiverSigned, setWaiverSigned] = useState(false);
  const [checkingWaiver, setCheckingWaiver] = useState(false);

  // Function to check waiver status
  const checkWaiverStatus = async (userId: string) => {
    try {
      setCheckingWaiver(true);
      const response = await fetch(`/api/volunteers/profile?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setWaiverSigned(data.profile?.waiverAccepted || false);
      } else {
        setWaiverSigned(false);
      }
    } catch (error) {
      console.error('Error checking waiver status:', error);
      setWaiverSigned(false);
    } finally {
      setCheckingWaiver(false);
    }
  };

  const markWaiverSigned = () => setWaiverSigned(true);

  const refreshWaiverStatus = async () => {
    if (user) {
      await checkWaiverStatus(user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      // Sync user to MongoDB when auth state changes
      if (user) {
        try {
          await fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firebaseUid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0],
            }),
          });

          // Auto-link to volunteer profile if one exists
          await fetch('/api/volunteers/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              email: user.email,
            }),
          });

          // Check waiver status
          await checkWaiverStatus(user.uid);
        } catch (error) {
          console.error('Error syncing user to MongoDB:', error);
        }
      } else {
        setWaiverSigned(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    setUser(userCredential.user);
    return userCredential;
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    const actionCodeSettings = {
      url: `${window.location.origin}/login`,
      handleCodeInApp: false,
    };
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
  };

  const value = {
    user,
    loading,
    waiverSigned,
    checkingWaiver,
    markWaiverSigned,
    refreshWaiverStatus,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
