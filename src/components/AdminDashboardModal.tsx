import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, UserProfile, MAX_CLIENT_USERS } from '../context/AuthContext';
import {
  formatUSD,
  formatBTC,
  getLocalDepositRequests,
  updateLocalDepositRequestStatus,
  saveInvestment,
  LocalDepositRequest,
} from '../utils/bitcoin';
import {
  X,
  Shield,
  Check,
  XCircle,
  ExternalLink,
  Users,
  Clock,
  AlertCircle,
  RefreshCw,
  Edit3,
  DollarSign,
  UserCheck,
  Save,
  Plus,
  Trash2,
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ isOpen, onClose }) => {
  const { isAdmin, currentUser, updateUserByAdmin, deleteUserByAdmin, getAllClientUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'users'>('requests');
  const [requests, setRequests] = useState<LocalDepositRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User editing state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUsdBalance, setEditUsdBalance] = useState<number>(0);
  const [editBtcBalance, setEditBtcBalance] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<'active' | 'suspended' | 'verified'>('active');
  const [editUsername, setEditUsername] = useState<string>('');
  const [savingUser, setSavingUser] = useState<boolean>(false);

  // Load requests and users
  const reloadData = async () => {
    setLoading(true);
    setStatusMsg(null);

    // 1. Fetch Users
    try {
      const uList = await getAllClientUsers();
      setUsers(uList);
    } catch (err) {
      console.warn('Error loading users list:', err);
    }

    // 2. Fetch Requests
    try {
      const localReqs = getLocalDepositRequests();
      setRequests(localReqs);

      // Attempt Firestore live sync
      const q = query(collection(db, 'deposit_requests'), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const firestoreReqs: LocalDepositRequest[] = [];
        snap.forEach((d) => {
          firestoreReqs.push({ id: d.id, ...(d.data() as any) });
        });

        // Merge keeping newest
        const map = new Map<string, LocalDepositRequest>();
        localReqs.forEach((r) => map.set(r.id, r));
        firestoreReqs.forEach((r) => map.set(r.id, r));
        setRequests(Array.from(map.values()).sort((a, b) => b.submittedAt - a.submittedAt));
      }
    } catch (err) {
      console.warn('Firestore requests sync:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    reloadData();

    // Set up Firestore listener if accessible
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'deposit_requests'), orderBy('submittedAt', 'desc'));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const items: LocalDepositRequest[] = [];
            snapshot.forEach((docSnap) => {
              items.push({ id: docSnap.id, ...(docSnap.data() as any) });
            });
            const localReqs = getLocalDepositRequests();
            const map = new Map<string, LocalDepositRequest>();
            localReqs.forEach((r) => map.set(r.id, r));
            items.forEach((r) => map.set(r.id, r));
            setRequests(Array.from(map.values()).sort((a, b) => b.submittedAt - a.submittedAt));
          }
        },
        () => {
          // ignore error and rely on local state
        }
      );
    } catch {
      // ignore
    }

    return () => unsubscribe();
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 text-center space-y-4 shadow-xl">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Administrator Access Required</h2>
          <p className="text-xs text-slate-500">
            Please log in with the administrator credentials to view and manage this console.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleApprove = async (req: LocalDepositRequest) => {
    setProcessingId(req.id);
    setStatusMsg(null);
    try {
      const now = Date.now();

      // 1. Update in local storage
      updateLocalDepositRequestStatus(req.id, 'approved', currentUser?.email || 'admin');

      // 2. Add to active investments so user dashboard/portfolio immediately shows it
      saveInvestment({
        id: req.id,
        packageId: req.packageId,
        packageName: req.packageName,
        investedUsd: req.amountUsd,
        investedBtc: req.amountBtc,
        apyPercent: 12.8,
        termDays: 90,
        startDate: now,
        endDate: now + 90 * 24 * 60 * 60 * 1000,
        txHash: req.txHash,
        status: 'active',
        nextPayoutDate: now + 24 * 60 * 60 * 1000,
        accruedEarningsUsd: 0,
        btcPriceAtDeposit: 98000,
      });

      // 3. Sync to Firestore
      try {
        const reqRef = doc(db, 'deposit_requests', req.id);
        await updateDoc(reqRef, {
          status: 'approved',
          reviewedAt: now,
          reviewedBy: currentUser?.email || 'admin',
        });

        const invRef = doc(db, 'active_investments', req.id);
        await setDoc(invRef, {
          id: req.id,
          userId: req.userId,
          userEmail: req.userEmail,
          packageId: req.packageId,
          packageName: req.packageName,
          investedUsd: req.amountUsd,
          investedBtc: req.amountBtc,
          apyPercent: 12.8,
          termDays: 90,
          startDate: now,
          endDate: now + 90 * 24 * 60 * 60 * 1000,
          txHash: req.txHash,
          status: 'active',
        });
      } catch (fbErr) {
        console.warn('Firestore approve sync:', fbErr);
      }

      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: 'approved', reviewedAt: now } : r))
      );
      setStatusMsg({ type: 'success', text: `Deposit ${req.orderId} approved successfully!` });
    } catch (err: any) {
      console.error('Error approving request:', err);
      setStatusMsg({ type: 'error', text: `Error approving: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: LocalDepositRequest) => {
    setProcessingId(req.id);
    setStatusMsg(null);
    try {
      const now = Date.now();
      updateLocalDepositRequestStatus(req.id, 'rejected', currentUser?.email || 'admin');

      try {
        const reqRef = doc(db, 'deposit_requests', req.id);
        await updateDoc(reqRef, {
          status: 'rejected',
          reviewedAt: now,
          reviewedBy: currentUser?.email || 'admin',
        });
      } catch (fbErr) {
        console.warn('Firestore reject sync:', fbErr);
      }

      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: 'rejected', reviewedAt: now } : r))
      );
      setStatusMsg({ type: 'success', text: `Deposit ${req.orderId} rejected.` });
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      setStatusMsg({ type: 'error', text: `Error: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  const openUserEditor = (user: UserProfile) => {
    setEditingUser(user);
    setEditUsdBalance(user.balanceUsd || 0);
    setEditBtcBalance(user.balanceBtc || 0);
    setEditStatus(user.status || 'active');
    setEditUsername(user.username || user.email.split('@')[0]);
  };

  const handleSaveUserChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingUser(true);
    setStatusMsg(null);

    const updates: Partial<UserProfile> = {
      balanceUsd: Number(editUsdBalance),
      balanceBtc: Number(editBtcBalance),
      status: editStatus,
      username: editUsername.trim(),
    };

    try {
      await updateUserByAdmin(editingUser.uid, updates);
      setUsers((prev) =>
        prev.map((u) => (u.uid === editingUser.uid ? { ...u, ...updates } : u))
      );
      setStatusMsg({
        type: 'success',
        text: `Updated details and balance for ${editingUser.email} successfully!`,
      });
      setEditingUser(null);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Failed to update user: ${err.message}` });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (
      !window.confirm(
        `Are you sure you want to completely delete user ${user.email}? This will permanently remove their account and data from Firestore and local storage.`
      )
    ) {
      return;
    }
    setStatusMsg(null);
    try {
      await deleteUserByAdmin(user.uid);
      setUsers((prev) => prev.filter((item) => item.uid !== user.uid));
      setStatusMsg({ type: 'success', text: `Successfully deleted user ${user.email} completely.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Failed to delete user: ${err.message}` });
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const clientUsers = users.filter((u) => u.role === 'user');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-amber-50/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-slate-950 font-bold shadow-xs">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Administrator Console
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono font-bold">
                  Live
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Admin: <span className="text-slate-800 font-semibold">{currentUser?.email || 'admin'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reloadData}
              disabled={loading}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sub-nav tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-3 px-5 sm:px-6 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'text-slate-900 border-b-2 border-amber-500 font-bold bg-white'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="h-4 w-4 text-amber-500" />
            <span>Deposit Requests</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-bold">
                {pendingRequests.length} Pending
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-5 sm:px-6 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'users'
                ? 'text-slate-900 border-b-2 border-amber-500 font-bold bg-white'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4 text-amber-500" />
            <span>Users & Balances</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono text-[10px]">
              {clientUsers.length}/{MAX_CLIENT_USERS} Limit
            </span>
          </button>
        </div>

        {/* Status Toast Message */}
        {statusMsg && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl border flex items-center gap-2 text-xs font-mono shrink-0 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'requests' ? (
            /* TAB 1: DEPOSIT REQUESTS */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Bitcoin Deposit Verification Queue
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Review and approve submitted Bitcoin on-chain transactions to credit user balances.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Total Submissions: <span className="font-bold text-slate-800">{requests.length}</span>
                </div>
              </div>

              {loading && requests.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-mono text-xs">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-500" />
                  Loading deposit queue...
                </div>
              ) : requests.length === 0 ? (
                <div className="p-12 text-center rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <Clock className="h-8 w-8 text-slate-400 mx-auto" />
                  <div className="text-sm font-semibold text-slate-800">No Deposit Requests Yet</div>
                  <div className="text-xs text-slate-500 max-w-sm mx-auto">
                    When investors allocate capital and click &quot;I Have Paid&quot;, their deposit proofs appear here for manual verification.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs font-mono shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{req.orderId}</span>
                          <span className="text-slate-500 ml-2">Client: {req.userEmail}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              req.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : req.status === 'rejected'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                        <div>
                          <span className="text-slate-400 block text-[10px]">PACKAGE</span>
                          <span className="text-slate-900 font-semibold">{req.packageName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">DEPOSIT VALUE</span>
                          <span className="text-slate-900 font-semibold">
                            {formatUSD(req.amountUsd)} ({req.amountBtc} BTC)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">SUBMITTED</span>
                          <span className="text-slate-600">
                            {new Date(req.submittedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">TX HASH</span>
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[90px]" title={req.txHash}>
                              {req.txHash.slice(0, 8)}...{req.txHash.slice(-4)}
                            </span>
                            <a
                              href={`https://mempool.space/tx/${req.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-600 hover:text-amber-700 p-0.5 rounded hover:bg-amber-50"
                              title="Inspect on Mempool Explorer"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>

                      {req.status === 'pending' ? (
                        <div className="flex gap-2 pt-2 border-t border-slate-200">
                          <button
                            onClick={() => handleApprove(req)}
                            disabled={processingId === req.id}
                            className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs transition-colors"
                          >
                            <Check className="h-4 w-4" />
                            <span>Approve Deposit</span>
                          </button>
                          <button
                            onClick={() => handleReject(req)}
                            disabled={processingId === req.id}
                            className="flex-1 py-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <div className="pt-1 text-[11px] text-slate-400">
                          {req.status === 'approved' ? '✓ Credited to user account' : '✗ Transaction rejected'}
                          {req.reviewedBy && ` by ${req.reviewedBy}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: USERS & BALANCE EDITOR */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-amber-500" />
                    <span>Client Users & Balance Controls</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Edit user portfolio balances, update verification status, and manage registration limits.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono">
                    Capacity: <span className="font-bold text-amber-600">{clientUsers.length}</span> / {MAX_CLIENT_USERS} Users Max
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {clientUsers.length === 0 ? (
                  <div className="p-12 text-center rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <Users className="h-8 w-8 text-slate-400 mx-auto" />
                    <div className="text-sm font-semibold text-slate-800">No Client Accounts Registered</div>
                    <div className="text-xs text-slate-500">
                      When users register an account, they will appear here for balance management.
                    </div>
                  </div>
                ) : (
                  clientUsers.map((u, i) => (
                    <div
                      key={u.uid}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 font-mono text-xs shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              User #{i + 1}: {u.username || u.email.split('@')[0]}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                u.status === 'verified'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : u.status === 'suspended'
                                  ? 'bg-red-100 text-red-800 border border-red-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {u.status || 'active'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">{u.email}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openUserEditor(u)}
                            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                            title="Completely delete user account and data"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                        <div>
                          <span className="text-slate-400 block text-[10px]">USD BALANCE</span>
                          <span className="text-slate-900 font-bold text-sm">
                            {formatUSD(u.balanceUsd || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">BITCOIN HOLDING</span>
                          <span className="text-slate-900 font-bold text-sm">
                            {formatBTC(u.balanceBtc || 0)} BTC
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">REGISTERED</span>
                          <span className="text-slate-600">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">UID</span>
                          <span className="text-slate-500 truncate block max-w-[120px]" title={u.uid}>
                            {u.uid}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: EDIT USER BALANCE & DETAILS */}
      {editingUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-amber-50/50">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Edit User Balance & Details
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserChanges} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-mono text-[11px]">
                <div className="font-bold text-slate-900">{editingUser.email}</div>
                <div className="text-slate-500">UID: {editingUser.uid}</div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Display Username:</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Balance (USD $):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editUsdBalance}
                    onChange={(e) => setEditUsdBalance(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Balance (BTC):</label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={editBtcBalance}
                    onChange={(e) => setEditBtcBalance(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Quick Adjust Buttons */}
              <div>
                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                  Quick Add Balance:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[500, 1000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setEditUsdBalance((prev) => prev + amt);
                        setEditBtcBalance((prev) => parseFloat((prev + amt / 98000).toFixed(8)));
                      }}
                      className="py-1 px-2 rounded bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-900 font-mono text-[10px] border border-slate-200 transition-colors cursor-pointer"
                    >
                      +${amt >= 1000 ? `${amt / 1000}k` : amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Account Status:</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                >
                  <option value="active">Active (Full Access)</option>
                  <option value="verified">Verified Investor</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="flex-1 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {savingUser ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Balance</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
