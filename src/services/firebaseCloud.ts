import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User as FirebaseUser,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Order,
  OrderStatus,
  PaymentState,
  StudentUser,
} from '../types';
import { buildOrderTimeline } from './firebaseReady';

export const ADMIN_EMAIL = 'isha.0251mba110@dgu.ac.in';

const app = initializeApp(firebaseConfig);
export const firebaseDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const firebaseAuth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuth.currentUser?.uid,
      email: firebaseAuth.currentUser?.email,
      emailVerified: firebaseAuth.currentUser?.emailVerified,
      isAnonymous: firebaseAuth.currentUser?.isAnonymous,
      tenantId: firebaseAuth.currentUser?.tenantId,
      providerInfo:
        firebaseAuth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(firebaseDb, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export function isAdminEmail(email?: string | null): boolean {
  return (email ?? '').trim().toLowerCase() === ADMIN_EMAIL;
}

function clampStr(val: unknown, max: number, fallback = ''): string {
  const trimmed = typeof val === 'string' ? val.trim() : '';
  return (trimmed || fallback).slice(0, max);
}

function clampId(val: unknown, max: number, fallback: string): string {
  const raw = typeof val === 'string' ? val.trim() : '';
  const sanitized = raw.replace(/[^a-zA-Z0-9_-]/g, '-');
  return (sanitized || fallback).slice(0, max);
}

function toIsoDate(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (
    val &&
    typeof val === 'object' &&
    'toDate' in val &&
    typeof (val as { toDate: () => Date }).toDate === 'function'
  ) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string' && val) {
    return val;
  }
  return new Date().toISOString();
}

const profileSyncLocks = new Map<string, Promise<StudentUser>>();

async function ensureCloudUserProfileInternal(
  firebaseUser: FirebaseUser,
  overrides?: Partial<StudentUser>
): Promise<StudentUser> {
  const uid = clampId(firebaseUser.uid, 128, 'user');
  const path = `users/${uid}`;
  const ref = doc(firebaseDb, 'users', uid);
  const email = clampStr(firebaseUser.email || `${uid}@campus.local`, 160, `${uid}@campus.local`);
  const adminFlag = isAdminEmail(email);

  let existingSnap;
  try {
    try {
      existingSnap = await getDocFromServer(ref);
    } catch {
      existingSnap = await getDoc(ref);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const applyExistingUpdate = async (snapData: Record<string, unknown>): Promise<StudentUser> => {
    const resolvedRole: 'admin' | 'student' = adminFlag
      ? 'admin'
      : snapData.role === 'admin'
      ? 'admin'
      : 'student';

    const nextName = clampStr(
      overrides?.name || snapData.name || firebaseUser.displayName || 'Campus Student',
      100,
      'Campus Student'
    );
    const nextMobile = clampStr(overrides?.mobile ?? snapData.mobile ?? '', 20);
    const nextUniId = clampStr(overrides?.universityId || snapData.universityId || 'uni-dgu', 64, 'uni-dgu');
    const nextCampusId = clampStr(overrides?.campusId || snapData.campusId || 'dgu-selaqui', 64, 'dgu-selaqui');
    const nextHostel = clampStr(overrides?.hostel || snapData.hostel || 'Aarav Boys Hostel', 120, 'Aarav Boys Hostel');
    const nextRoom = clampStr(overrides?.roomNumber ?? snapData.roomNumber ?? '', 40);

    const hasOverrideChange =
      Boolean(
        overrides &&
          (overrides.name ||
            overrides.mobile ||
            overrides.universityId ||
            overrides.campusId ||
            overrides.hostel ||
            overrides.roomNumber)
      ) || (adminFlag && snapData.role !== 'admin');

    if (hasOverrideChange) {
      const updatePayload: Record<string, unknown> = {
        name: nextName,
        mobile: nextMobile,
        universityId: nextUniId,
        campusId: nextCampusId,
        hostel: nextHostel,
        roomNumber: nextRoom,
        updatedAt: serverTimestamp(),
      };
      if (adminFlag && snapData.role !== 'admin') {
        updatePayload.role = 'admin';
      }
      try {
        await updateDoc(ref, updatePayload);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    return {
      uid,
      name: nextName,
      email: clampStr(snapData.email || email, 160, email),
      mobile: nextMobile,
      universityId: nextUniId,
      campusId: nextCampusId,
      hostel: nextHostel,
      roomNumber: nextRoom,
      role: resolvedRole,
      createdAt: toIsoDate(snapData.createdAt),
    };
  };

  if (existingSnap.exists()) {
    return applyExistingUpdate(existingSnap.data() as Record<string, unknown>);
  }

  const newProfile = {
    uid,
    name: clampStr(
      overrides?.name || firebaseUser.displayName || email.split('@')[0] || 'Campus Student',
      100,
      'Campus Student'
    ),
    email,
    mobile: clampStr(overrides?.mobile || '', 20),
    universityId: clampStr(overrides?.universityId || 'uni-dgu', 64, 'uni-dgu'),
    campusId: clampStr(overrides?.campusId || 'dgu-selaqui', 64, 'dgu-selaqui'),
    hostel: clampStr(overrides?.hostel || 'Aarav Boys Hostel', 120, 'Aarav Boys Hostel'),
    roomNumber: clampStr(overrides?.roomNumber || '', 40),
    role: adminFlag ? 'admin' : 'student',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, newProfile);
  } catch (error) {
    // If another tab or concurrent call created the document milliseconds earlier,
    // setDoc triggers `allow update` and rejects createdAt overwrite. Check server once:
    try {
      const retrySnap = await getDocFromServer(ref);
      if (retrySnap.exists()) {
        return applyExistingUpdate(retrySnap.data() as Record<string, unknown>);
      }
    } catch {
      // Fall through to structured FirestoreErrorInfo
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return {
    uid: newProfile.uid,
    name: newProfile.name,
    email: newProfile.email,
    mobile: newProfile.mobile,
    universityId: newProfile.universityId,
    campusId: newProfile.campusId,
    hostel: newProfile.hostel,
    roomNumber: newProfile.roomNumber,
    role: newProfile.role as 'admin' | 'student',
    createdAt: new Date().toISOString(),
  };
}

export async function ensureCloudUserProfile(
  firebaseUser: FirebaseUser,
  overrides?: Partial<StudentUser>
): Promise<StudentUser> {
  const uid = clampId(firebaseUser.uid, 128, 'user');
  const prev = profileSyncLocks.get(uid) ?? Promise.resolve(null as unknown as StudentUser);
  const next = prev
    .catch(() => null as unknown as StudentUser)
    .then(() => ensureCloudUserProfileInternal(firebaseUser, overrides));

  profileSyncLocks.set(uid, next);
  try {
    return await next;
  } finally {
    if (profileSyncLocks.get(uid) === next) {
      profileSyncLocks.delete(uid);
    }
  }
}

export async function signInWithGoogleAccount(defaults?: {
  universityId?: string;
  campusId?: string;
  hostel?: string;
  roomNumber?: string;
  mobile?: string;
}): Promise<{ user: StudentUser; firebaseUser: FirebaseUser }> {
  const credential = await signInWithPopup(firebaseAuth, googleProvider);
  const user = await ensureCloudUserProfile(credential.user, defaults);
  return { user, firebaseUser: credential.user };
}

export async function signOutFirebaseAccount(): Promise<void> {
  await signOut(firebaseAuth);
}

export function subscribeFirebaseAuth(
  callback: (firebaseUser: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function saveCloudOrder(
  firebaseUser: FirebaseUser,
  order: Order
): Promise<void> {
  const cleanOrderId = clampId(order.id, 64, `ORD-${Date.now()}`);
  const path = `orders/${cleanOrderId}`;
  const ref = doc(firebaseDb, 'orders', cleanOrderId);

  const boundedItems = (order.items ?? []).slice(0, 50).map((item) => ({
    productId: clampStr(item.productId, 64, 'item'),
    name: clampStr(item.name, 160, 'Campus Item'),
    category: item.category,
    price: Math.max(0, Number(item.price) || 0),
    quantity: Math.max(1, Number(item.quantity) || 1),
    image: clampStr(item.image, 500),
  }));

  const boundedTimeline = (
    order.timeline?.length ? order.timeline : buildOrderTimeline(order.status, order.campusName)
  )
    .slice(0, 10)
    .map((step) => ({
      status: step.status,
      label: clampStr(step.label, 80, 'Order Placed'),
      timestamp: clampStr(step.timestamp, 80, 'Just now'),
      note: clampStr(step.note, 200),
      completed: Boolean(step.completed),
    }));

  const payload: Record<string, unknown> = {
    id: cleanOrderId,
    userId: clampId(firebaseUser.uid, 128, 'user'),
    studentName: clampStr(order.studentName || firebaseUser.displayName || 'Campus Student', 100, 'Campus Student'),
    studentEmail: clampStr(firebaseUser.email || '', 160),
    phone: clampStr(order.phone || '0000000000', 20, '0000000000'),
    universityId: clampStr(order.universityId, 64, 'uni-dgu'),
    universityName: clampStr(order.universityName, 160),
    campusId: clampStr(order.campusId, 64, 'dgu-selaqui'),
    campusName: clampStr(order.campusName, 120),
    hostel: clampStr(order.hostel, 120),
    block: clampStr(order.block, 60),
    roomNumber: clampStr(order.roomNumber, 40),
    deliveryInstructions: clampStr(
      order.deliveryInstructions || 'Call upon arrival at hostel gate',
      300,
      'Call upon arrival at hostel gate'
    ),
    items: boundedItems,
    subtotal: Math.max(0, Number(order.subtotal) || 0),
    discount: Math.max(0, Number(order.discount) || 0),
    deliveryFee: Math.max(0, Number(order.deliveryFee) || 0),
    total: Math.max(0, Number(order.total) || 0),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
    timeline: boundedTimeline,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (order.couponCode && order.couponCode.trim()) {
    payload.couponCode = clampStr(order.couponCode, 32);
  }

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCloudOrderStatus(
  orderId: string,
  status: OrderStatus,
  paymentStatus: PaymentState | undefined,
  campusName: string
): Promise<boolean> {
  const path = `orders/${orderId}`;
  const ref = doc(firebaseDb, 'orders', orderId);

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!snap.exists()) {
    return false;
  }

  const updates: Record<string, unknown> = {
    status,
    timeline: buildOrderTimeline(status, campusName).slice(0, 10),
    updatedAt: serverTimestamp(),
  };
  if (paymentStatus) {
    updates.paymentStatus = paymentStatus;
  }

  try {
    await updateDoc(ref, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  return true;
}

export function subscribeToCloudOrders(
  firebaseUser: FirebaseUser,
  asAdmin: boolean,
  onOrders: (orders: Order[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = 'orders';
  const ordersRef = collection(firebaseDb, path);
  const q = asAdmin
    ? ordersRef
    : query(ordersRef, where('userId', '==', firebaseUser.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Order[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          userId: String(data.userId || ''),
          studentName: String(data.studentName || 'Campus Student'),
          phone: String(data.phone || ''),
          universityId: String(data.universityId || ''),
          universityName: String(data.universityName || ''),
          campusId: String(data.campusId || ''),
          campusName: String(data.campusName || ''),
          hostel: String(data.hostel || ''),
          block: String(data.block || ''),
          roomNumber: String(data.roomNumber || ''),
          deliveryInstructions: String(data.deliveryInstructions || ''),
          items: Array.isArray(data.items) ? data.items : [],
          subtotal: Number(data.subtotal) || 0,
          discount: Number(data.discount) || 0,
          couponCode: typeof data.couponCode === 'string' ? data.couponCode : undefined,
          deliveryFee: Number(data.deliveryFee) || 0,
          total: Number(data.total) || 0,
          paymentMethod: data.paymentMethod || 'Campus UPI Demo',
          paymentStatus: data.paymentStatus || 'pending',
          status: data.status || 'Pending',
          createdAt: toIsoDate(data.createdAt),
          timeline: Array.isArray(data.timeline) ? data.timeline : [],
        };
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onOrders(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToCloudCustomers(
  onCustomers: (users: StudentUser[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = 'users';
  const usersRef = collection(firebaseDb, path);

  return onSnapshot(
    usersRef,
    (snapshot) => {
      const list: StudentUser[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            uid: String(data.uid || d.id),
            name: String(data.name || 'Campus Student'),
            email: String(data.email || ''),
            mobile: String(data.mobile || ''),
            universityId: String(data.universityId || 'uni-dgu'),
            campusId: String(data.campusId || 'dgu-selaqui'),
            hostel: String(data.hostel || ''),
            roomNumber: String(data.roomNumber || ''),
            role: (data.role === 'admin' ? 'admin' : 'student') as 'student' | 'admin',
            createdAt: toIsoDate(data.createdAt),
          };
        })
        .filter((u) => !isAdminEmail(u.email));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onCustomers(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}
