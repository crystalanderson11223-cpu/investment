import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, query, where, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
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
        const updates: Partial<UserProfile> = {
          ...(isSystemAdmin && data.role !== 'admin' ? { role: 'admin' as const } : {}),
          ...extraData,
        };
        if (Object.keys(updates).length > 0) {
          const updated = { ...data, ...updates };
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
    let isMounted = true;

    async function restoreSession(firebaseUser: User | null) {
      if (firebaseUser) {
        if (!isMounted) return;
        setCurrentUser(firebaseUser);
        try {
          const prof = await fetchOrCreateProfile(firebaseUser);
          if (isMounted) {
            setProfile(prof);
            try {
              localStorage.setItem('aurum_auth_session_uid', prof.uid);
            } catch {}
          }
        } catch (e) {
          console.warn('Profile fetch error:', e);
        }
        if (isMounted) setLoading(false);
        return;
      }

      // If firebaseUser is null, check stored session UID (for admin or internal accounts)
      let storedUid: string | null = null;
      try {
        storedUid = localStorage.getItem('aurum_auth_session_uid');
      } catch {}

      if (storedUid) {
        try {
          const snap = await getDoc(doc(db, 'users', storedUid));
          if (snap.exists() && isMounted) {
            const data = snap.data() as UserProfile;
            setCurrentUser({ uid: data.uid, email: data.email });
            setProfile(data);
            if (isMounted) setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Session restore error:', e);
        }
      }

      if (isMounted) {
        setCurrentUser(null);
        setProfile(null);
        setLoading(false);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      await restoreSession(user);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Real-time Firestore listener for active user profile & balance
  useEffect(() => {
    const activeUid = currentUser?.uid;
    if (!activeUid) return;

    const unsub = onSnapshot(
      doc(db, 'users', activeUid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      },
      (err) => {
        console.warn('Profile realtime sync notice:', err);
      }
    );

    return () => unsub();
  }, [currentUser?.uid]);

  const loginWithEmail = async (identifier: string, pass: string) => {
    setError(null);
    const cleanId = identifier.trim();
    if (!cleanId || !pass) {
      const msg = 'Please enter both identifier and password.';
      setError(msg);
      throw new Error(msg);
    }

    const trimmedId = cleanId.toLowerCase();
    const isExplicitAdmin =
      trimmedId === 'admin' ||
      trimmedId === 'administrator' ||
      trimmedId === ADMIN_EMAIL.toLowerCase() ||
      trimmedId.startsWith('admin@');

    // 1. Administrator Login
    if (isExplicitAdmin) {
      const adminDocRef = doc(db, 'users', 'admin-system-uid');
      let adminProf: UserProfile = {
        uid: 'admin-system-uid',
        email: ADMIN_EMAIL,
        username: 'admin',
        role: 'admin',
        balanceUsd: 250000,
        balanceBtc: 2.68,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      try {
        const snap = await getDoc(adminDocRef);
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          adminProf = { ...adminProf, ...data };
        }
      } catch (e) {
        console.warn('Error reading admin document:', e);
      }

      // Strictly verify administrator password
      if (adminProf.password) {
        if (adminProf.password !== pass) {
          const msg = 'Invalid administrator password.';
          setError(msg);
          throw new Error(msg);
        }
      } else {
        // If password is not yet established for admin, establish this password
        adminProf.password = pass;
        try {
          await setDoc(adminDocRef, adminProf, { merge: true });
          await setDoc(
            doc(db, 'admins', adminProf.uid),
            { uid: adminProf.uid, email: adminProf.email },
            { merge: true }
          );
        } catch (e) {
          console.warn('Admin password init error:', e);
        }
      }

      try {
        localStorage.setItem('aurum_auth_session_uid', adminProf.uid);
      } catch {}
      setCurrentUser(adminProf);
      setProfile(adminProf);
      return;
    }

    // 2. Regular Client User Login (Search Firestore by username or email)
    const resolvedEmail = resolveEmail(cleanId);
    let foundUser: UserProfile | null = null;

    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach((d) => {
        const u = d.data() as UserProfile;
        if (
          (u.username && u.username.toLowerCase() === trimmedId) ||
          (u.email && u.email.toLowerCase() === trimmedId) ||
          (u.email && u.email.toLowerCase() === resolvedEmail.toLowerCase())
        ) {
          foundUser = u;
        }
      });
    } catch (e) {
      console.warn('Firestore user search error:', e);
    }

    // A. User was found in Firestore
    if (foundUser) {
      const u = foundUser as UserProfile;

      // If user has a password stored in Firestore, strictly verify it
      if (u.password !== undefined && u.password !== null && u.password !== '') {
        if (u.password !== pass) {
          const msg = 'Invalid password.';
          setError(msg);
          throw new Error(msg);
        }

        // Password matches! Attempt Firebase Auth session sync if possible
        if (pass.length >= 6) {
          try {
            const cred = await signInWithEmailAndPassword(auth, u.email, pass);
            try {
              localStorage.setItem('aurum_auth_session_uid', u.uid);
            } catch {}
            setCurrentUser(cred.user);
            setProfile(u);
            return;
          } catch {
            // Internal client account
          }
        }

        try {
          localStorage.setItem('aurum_auth_session_uid', u.uid);
        } catch {}
        setCurrentUser({ uid: u.uid, email: u.email });
        setProfile(u);
        return;
      }

      // If password was NOT stored in Firestore document, verify via Firebase Auth directly
      try {
        const cred = await signInWithEmailAndPassword(auth, u.email, pass);
        // Authentication succeeded! Cache password in Firestore for subsequent checks
        try {
          await updateDoc(doc(db, 'users', u.uid), { password: pass });
        } catch {}
        try {
          localStorage.setItem('aurum_auth_session_uid', u.uid);
        } catch {}
        setCurrentUser(cred.user);
        setProfile({ ...u, password: pass });
        return;
      } catch {
        // Firebase Auth rejected password
        const msg = 'Invalid password.';
        setError(msg);
        throw new Error(msg);
      }
    }

    // B. User was not found in Firestore - check direct Firebase Auth
    try {
      const cred = await signInWithEmailAndPassword(auth, resolvedEmail, pass);
      const prof = await fetchOrCreateProfile(cred.user, 'user', { password: pass });
      try {
        localStorage.setItem('aurum_auth_session_uid', cred.user.uid);
      } catch {}
      setProfile(prof);
      setCurrentUser(cred.user);
      return;
    } catch (authErr: any) {
      if (
        authErr.code === 'auth/wrong-password' ||
        authErr.code === 'auth/invalid-credential'
      ) {
        const msg = 'Invalid password.';
        setError(msg);
        throw new Error(msg);
      }
      const msg = 'Account not found. Please click Sign Up to register.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const signupWithEmail = async (identifier: string, pass: string) => {
    setError(null);
    const cleanId = identifier.trim();
    if (!cleanId || !pass) {
      const msg = 'Please enter both identifier and password.';
      setError(msg);
      throw new Error(msg);
    }
    if (pass.length < 4) {
      const msg = 'Password must be at least 4 characters long.';
      setError(msg);
      throw new Error(msg);
    }

    const trimmedId = cleanId.toLowerCase();
    const isExplicitAdmin = trimmedId === 'admin' || trimmedId === ADMIN_EMAIL.toLowerCase();

    if (isExplicitAdmin) {
      await loginWithEmail(cleanId, pass);
      return;
    }

    const emailToUse = resolveEmail(cleanId);

    // Verify username or email is not already registered
    const existingUsers = await getDocs(collection(db, 'users'));
    let alreadyExists = false;
    existingUsers.forEach((d) => {
      const u = d.data() as UserProfile;
      if (
        (u.username && u.username.toLowerCase() === trimmedId) ||
        (u.email && u.email.toLowerCase() === emailToUse.toLowerCase())
      ) {
        alreadyExists = true;
      }
    });

    if (alreadyExists) {
      const msg = 'An account with this username or email already exists. Please sign in.';
      setError(msg);
      throw new Error(msg);
    }

    // Verify maximum 3 registered client users restriction
    const canRegister = await checkUserLimit();
    if (!canRegister) {
      const limitMsg = 'Registration limit reached (Maximum 3 client accounts permitted).';
      setError(limitMsg);
      throw new Error(limitMsg);
    }

    let finalUid = `usr-${Date.now()}`;
    let firebaseUser: any = null;

    if (pass.length >= 6) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, emailToUse, pass);
        finalUid = cred.user.uid;
        firebaseUser = cred.user;
      } catch (fbErr: any) {
        if (fbErr.code === 'auth/email-already-in-use') {
          const msg = 'An account with this email already exists. Please sign in.';
          setError(msg);
          throw new Error(msg);
        }
      }
    }

    const newProfile: UserProfile = {
      uid: finalUid,
      email: emailToUse,
      username: cleanId,
      role: 'user',
      balanceUsd: 0,
      balanceBtc: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      password: pass,
    };

    // Save directly to Firestore users collection
    await setDoc(doc(db, 'users', finalUid), newProfile);

    try {
      localStorage.setItem('aurum_auth_session_uid', finalUid);
    } catch {}
    setCurrentUser(firebaseUser || { uid: finalUid, email: emailToUse });
    setProfile(newProfile);
  };

  const logout = async () => {
    setError(null);
    try {
      localStorage.removeItem('aurum_auth_session_uid');
    } catch {}
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
