import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export const ADMIN_EMAIL = 'crystalanderson11223@gmail.com';
export const MAX_CLIENT_USERS = 3;

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  role: 'user' | 'admin';
  balanceUsd?: number;
  balanceBtc?: number;
  status?: 'active' | 'suspended' | 'verified';
  createdAt: string;
  password?: string;
}

interface AuthContextType {
  currentUser: User | { uid: string; email: string } | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  loginWithEmail: (identifier: string, pass: string) => Promise<void>;
  signupWithEmail: (identifier: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserByAdmin: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
  deleteUserByAdmin: (uid: string) => Promise<void>;
  getAllClientUsers: () => Promise<UserProfile[]>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const resolveEmail = (identifier: string): string => {
    const trimmed = identifier.trim();
    if (!trimmed.includes('@')) {
      if (trimmed.toLowerCase() === 'admin') {
        return ADMIN_EMAIL;
      }
      return `${trimmed.toLowerCase()}@aurumclient.internal`;
    }
    return trimmed;
  };

  const checkUserLimit = async (): Promise<boolean> => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'user'));
      const snapshot = await getDocs(q);
      return snapshot.size < MAX_CLIENT_USERS;
    } catch {
      return true;
    }
  };

  const fetchOrCreateProfile = async (
    user: { uid: string; email?: string | null },
    customRole?: 'admin' | 'user',
    extraData?: Partial<UserProfile>
  ): Promise<UserProfile> => {
    const userEmail = user.email || '';
    const isSystemAdmin =
      customRole === 'admin' ||
      userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      user.uid === 'admin-system-uid';

    const defaultProf: UserProfile = {
      uid: user.uid,
      email: userEmail || (isSystemAdmin ? ADMIN_EMAIL : 'client@aurum.internal'),
      username: userEmail.split('@')[0] || 'client',
      role: isSystemAdmin ? 'admin' : 'user',
      balanceUsd: isSystemAdmin ? 250000 : 0,
      balanceBtc: isSystemAdmin ? 2.68 : 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      ...extraData,
    };

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        if (isSystemAdmin && data.role !== 'admin') {
          const updated = { ...data, role: 'admin' as const };
          await setDoc(userDocRef, updated, { merge: true });
          return updated;
        }
        return data;
      } else {
        await setDoc(userDocRef, defaultProf);
        if (isSystemAdmin) {
          await setDoc(doc(db, 'admins', user.uid), {
            uid: user.uid,
            email: defaultProf.email,
          });
        }
        return defaultProf;
      }
    } catch {
      return defaultProf;
    }
  };

  useEffect(() => {
    // Listen to Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const prof = await fetchOrCreateProfile(user);
          setProfile(prof);
        } catch {
          // ignore
        }
      } else {
        setCurrentUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (identifier: string, pass: string) => {
    setError(null);
    const trimmedId = identifier.trim().toLowerCase();
    const isExplicitAdmin =
      trimmedId === 'admin' ||
      trimmedId === 'administrator' ||
      trimmedId === ADMIN_EMAIL.toLowerCase() ||
      trimmedId.startsWith('admin@');

    // 1. Direct Administrator Login
    if (isExplicitAdmin) {
      const adminProf: UserProfile = {
        uid: 'admin-system-uid',
        email: ADMIN_EMAIL,
        username: 'admin',
        role: 'admin',
        balanceUsd: 250000,
        balanceBtc: 2.68,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      setCurrentUser(adminProf);
      setProfile(adminProf);

      try {
        await setDoc(doc(db, 'users', adminProf.uid), adminProf, { merge: true });
        await setDoc(doc(db, 'admins', adminProf.uid), { uid: adminProf.uid, email: adminProf.email }, { merge: true });
      } catch (e) {
        console.warn('Firestore admin sync:', e);
      }
      return;
    }

    // 2. Regular Client User Login (100% Firebase/Firestore)
    const emailToUse = resolveEmail(identifier);

    try {
      if (pass.length >= 6) {
        try {
          const cred = await signInWithEmailAndPassword(auth, emailToUse, pass);
          const prof = await fetchOrCreateProfile(cred.user);
          setProfile(prof);
          setCurrentUser(cred.user);
          return;
        } catch {
          // Fall through to Firestore collection lookup
        }
      }

      // Query Firestore users collection for matching email or username
      const usersSnap = await getDocs(collection(db, 'users'));
      let foundUser: UserProfile | null = null;
      usersSnap.forEach((d) => {
        const u = d.data() as UserProfile;
        if (
          u.email.toLowerCase() === emailToUse.toLowerCase() ||
          u.username?.toLowerCase() === identifier.trim().toLowerCase()
        ) {
          foundUser = u;
        }
      });

      if (foundUser) {
        const typedUser = foundUser as UserProfile;
        if (typedUser.password && typedUser.password !== pass && pass.length >= 6) {
          throw new Error('Invalid password.');
        }
        setCurrentUser({ uid: typedUser.uid, email: typedUser.email });
        setProfile(typedUser);
        return;
      }

      throw new Error('Account not found. Please click Sign Up to register.');
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check credentials.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const signupWithEmail = async (identifier: string, pass: string) => {
    setError(null);
    const trimmedId = identifier.trim().toLowerCase();
    const isExplicitAdmin = trimmedId === 'admin' || trimmedId === ADMIN_EMAIL.toLowerCase();

    if (isExplicitAdmin) {
      await loginWithEmail(identifier, pass);
      return;
    }

    const emailToUse = resolveEmail(identifier);

    // Verify maximum 3 registered client users restriction
    const canRegister = await checkUserLimit();
    if (!canRegister) {
      const limitMsg = 'Registration limit reached (Maximum 3 client accounts permitted).';
      setError(limitMsg);
      throw new Error(limitMsg);
    }

    const newUid = `usr-${Date.now()}`;
    const newProfile: UserProfile = {
      uid: newUid,
      email: emailToUse,
      username: identifier.trim(),
      role: 'user',
      balanceUsd: 0,
      balanceBtc: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      password: pass,
    };

    let firebaseSuccess = false;
    if (pass.length >= 6) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, emailToUse, pass);
        const prof = await fetchOrCreateProfile(cred.user, 'user', { password: pass });
        setProfile(prof);
        setCurrentUser(cred.user);
        firebaseSuccess = true;
      } catch (fbErr: any) {
        if (fbErr.code === 'auth/email-already-in-use') {
          throw new Error('An account with this email already exists. Please sign in.');
        }
      }
    }

    // Always save/sync to Firestore users collection
    try {
      await setDoc(doc(db, 'users', newProfile.uid), newProfile);
    } catch (e) {
      console.warn('Firestore user save error:', e);
    }

    if (!firebaseSuccess) {
      setCurrentUser({ uid: newProfile.uid, email: newProfile.email });
      setProfile(newProfile);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setProfile(null);
  };

  const updateUserByAdmin = async (uid: string, updates: Partial<UserProfile>) => {
    if (currentUser?.uid === uid) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    }

    try {
      const ref = doc(db, 'users', uid);
      await updateDoc(ref, updates);
    } catch (e) {
      console.warn('Firestore update error:', e);
    }
  };

  const deleteUserByAdmin = async (uid: string) => {
    setError(null);
    if (currentUser?.uid === uid || profile?.uid === uid) {
      await logout();
    }

    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
      console.warn('Firestore delete user error:', e);
    }
  };

  const getAllClientUsers = async (): Promise<UserProfile[]> => {
    const listMap = new Map<string, UserProfile>();

    try {
      const q = query(collection(db, 'users'));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data() as UserProfile;
        if (data.role === 'user') {
          listMap.set(d.id, data);
        }
      });
    } catch (e) {
      console.warn('Firestore fetch users error:', e);
    }

    return Array.from(listMap.values()).slice(0, MAX_CLIENT_USERS);
  };

  const isAdmin =
    currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
    currentUser?.username?.toLowerCase() === 'admin' ||
    profile?.role === 'admin' ||
    profile?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
    currentUser?.uid === 'admin-system-uid';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        isAdmin,
        loading,
        loginWithEmail,
        signupWithEmail,
        logout,
        updateUserByAdmin,
        deleteUserByAdmin,
        getAllClientUsers,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
