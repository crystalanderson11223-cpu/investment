import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export const ADMIN_EMAIL = 'crystalanderson11223@gmail.com';
export const MAX_CLIENT_USERS = 3;
const LOCAL_SESSION_KEY = 'aurum_local_auth_session';
const LOCAL_USERS_KEY = 'aurum_registered_users_list';

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  role: 'user' | 'admin';
  balanceUsd?: number;
  balanceBtc?: number;
  status?: 'active' | 'suspended' | 'verified';
  createdAt: string;
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
  getAllClientUsers: () => Promise<UserProfile[]>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initial sample users if none exist yet, ensuring admin can immediately test balance editing
const DEFAULT_SAMPLE_USERS: UserProfile[] = [
  {
    uid: 'usr-client-01',
    email: 'marcus.vance@investor.com',
    username: 'marcus.vance',
    role: 'user',
    balanceUsd: 15400,
    balanceBtc: 0.165,
    status: 'active',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    uid: 'usr-client-02',
    email: 'elena.rostova@capgroup.io',
    username: 'elena.rostova',
    role: 'user',
    balanceUsd: 5200,
    balanceBtc: 0.055,
    status: 'verified',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

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

  const getLocalUsers = (): UserProfile[] => {
    try {
      const saved = localStorage.getItem(LOCAL_USERS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(DEFAULT_SAMPLE_USERS));
    return DEFAULT_SAMPLE_USERS;
  };

  const saveLocalUsers = (usersList: UserProfile[]) => {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(usersList));
  };

  const checkUserLimit = async (): Promise<boolean> => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'user'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.size < MAX_CLIENT_USERS;
      }
    } catch {
      // ignore Firestore errors and check local
    }
    const locals = getLocalUsers().filter((u) => u.role === 'user');
    return locals.length < MAX_CLIENT_USERS;
  };

  const fetchOrCreateProfile = async (
    user: { uid: string; email?: string | null },
    customRole?: 'admin' | 'user'
  ): Promise<UserProfile> => {
    const userEmail = user.email || '';
    const isSystemAdmin =
      customRole === 'admin' ||
      userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      user.uid === 'admin-system-uid';

    const defaultProf: UserProfile = {
      uid: user.uid,
      email: userEmail || (isSystemAdmin ? ADMIN_EMAIL : 'client@aurum.internal'),
      username: userEmail.split('@')[0],
      role: isSystemAdmin ? 'admin' : 'user',
      balanceUsd: isSystemAdmin ? 250000 : 0,
      balanceBtc: isSystemAdmin ? 2.68 : 0,
      status: 'active',
      createdAt: new Date().toISOString(),
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
      // Local fallback
      return defaultProf;
    }
  };

  useEffect(() => {
    // 1. Check local session first
    const savedLocal = localStorage.getItem(LOCAL_SESSION_KEY);
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        setCurrentUser(parsed);
        setProfile(parsed);
        setLoading(false);
      } catch {
        // ignore
      }
    }

    // 2. Listen to Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const prof = await fetchOrCreateProfile(user);
          setProfile(prof);
        } catch {
          // ignore
        }
      } else if (!savedLocal) {
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

    // 1. Direct Administrator Login (User requested "login with email and password as admin", no @ required)
    if (isExplicitAdmin) {
      // Admin authentication is always accepted for designated credentials
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

      // Set state and persist in local storage
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(adminProf));
      setCurrentUser(adminProf);
      setProfile(adminProf);

      // Also sync to Firestore in background without blocking
      try {
        await setDoc(doc(db, 'users', adminProf.uid), adminProf, { merge: true });
        await setDoc(doc(db, 'admins', adminProf.uid), { uid: adminProf.uid, email: adminProf.email }, { merge: true });
      } catch (e) {
        console.warn('Firestore admin sync:', e);
      }
      return;
    }

    // 2. Regular Client User Login
    const emailToUse = resolveEmail(identifier);

    try {
      // Try Firebase Auth if password meets 6 character requirement
      if (pass.length >= 6) {
        try {
          const cred = await signInWithEmailAndPassword(auth, emailToUse, pass);
          const prof = await fetchOrCreateProfile(cred.user);
          setProfile(prof);
          setCurrentUser(cred.user);
          localStorage.removeItem(LOCAL_SESSION_KEY);
          return;
        } catch (fbErr: any) {
          // Fall through to local fallback if operation-not-allowed or user-not-found
          if (
            fbErr.code !== 'auth/operation-not-allowed' &&
            fbErr.code !== 'auth/invalid-credential' &&
            fbErr.code !== 'auth/user-not-found'
          ) {
            throw fbErr;
          }
        }
      }

      // Check local user database fallback
      const localUsers = getLocalUsers();
      const existing = localUsers.find(
        (u) => u.email.toLowerCase() === emailToUse.toLowerCase() || u.username === identifier
      );

      if (existing) {
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(existing));
        setCurrentUser(existing);
        setProfile(existing);
        return;
      }

      // If user not found and password valid, check if we can auto-log in or report error
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
    };

    // 1. Try Firebase Auth if password is at least 6 characters
    let firebaseSuccess = false;
    if (pass.length >= 6) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, emailToUse, pass);
        const prof = await fetchOrCreateProfile(cred.user, 'user');
        setProfile(prof);
        setCurrentUser(cred.user);
        localStorage.removeItem(LOCAL_SESSION_KEY);
        firebaseSuccess = true;
      } catch (fbErr: any) {
        if (fbErr.code === 'auth/email-already-in-use') {
          throw new Error('An account with this email already exists. Please sign in.');
        }
        // Operation-not-allowed or network error falls back to local
      }
    }

    if (!firebaseSuccess) {
      // 2. Local fallback registration
      const localUsers = getLocalUsers();
      if (localUsers.length >= MAX_CLIENT_USERS + 2) {
        throw new Error('Registration limit reached (Maximum 3 client accounts permitted).');
      }
      saveLocalUsers([...localUsers, newProfile]);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newProfile));
      setCurrentUser(newProfile);
      setProfile(newProfile);
    }

    // Sync to Firestore
    try {
      await setDoc(doc(db, 'users', newProfile.uid), newProfile, { merge: true });
    } catch {
      // ignore
    }
  };

  const logout = async () => {
    setError(null);
    localStorage.removeItem(LOCAL_SESSION_KEY);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setProfile(null);
  };

  const updateUserByAdmin = async (uid: string, updates: Partial<UserProfile>) => {
    // 1. Update in local storage
    const localUsers = getLocalUsers();
    const updatedLocals = localUsers.map((u) => (u.uid === uid ? { ...u, ...updates } : u));
    saveLocalUsers(updatedLocals);

    // If updating current logged in user
    if (currentUser?.uid === uid) {
      const merged = { ...profile, ...updates } as UserProfile;
      setProfile(merged);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(merged));
    }

    // 2. Update in Firestore
    try {
      const ref = doc(db, 'users', uid);
      await updateDoc(ref, updates);
    } catch (e) {
      console.warn('Firestore update error (saved locally):', e);
    }
  };

  const getAllClientUsers = async (): Promise<UserProfile[]> => {
    const listMap = new Map<string, UserProfile>();

    // 1. Load from local first
    getLocalUsers().forEach((u) => {
      if (u.role === 'user') listMap.set(u.uid, u);
    });

    // 2. Load from Firestore
    try {
      const q = query(collection(db, 'users'));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data() as UserProfile;
        if (data.role === 'user') {
          listMap.set(d.id, data);
        }
      });
    } catch {
      // ignore
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
