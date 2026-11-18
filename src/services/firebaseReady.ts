import {
  AddressItem,
  CartItem,
  Coupon,
  NotificationItem,
  Order,
  OrderStatus,
  Product,
  StudentUser,
  University,
} from '../types';
import { INITIAL_COUPONS, INITIAL_PRODUCTS } from '../data/products';
import { INITIAL_UNIVERSITIES } from '../data/universities';

/**
 * Firebase-Ready Architecture Layer
 * ---------------------------------
 * This module encapsulates authentication, Firestore-style collections, and
 * campus-scoped inventory/order operations behind clean async methods.
 * Currently backed by localStorage + realistic seeded sample data so the full
 * application preview runs smoothly without requiring external API keys.
 *
 * To connect live Firebase:
 * 1. Initialize `initializeApp(firebaseConfig)` with your project env vars.
 * 2. Replace localStorage read/write calls inside `authService` and `storeService`
 *    with `firebase/auth` and `firebase/firestore` collection queries.
 */
export const firebaseConfigPlaceholder = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'DEMO_MODE_LOCAL_PERSISTENCE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'unimart-campus-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'unimart-campus-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'unimart-campus-demo.appspot.com',
  isConfigured: Boolean(import.meta.env.VITE_FIREBASE_API_KEY),
};

const KEYS = {
  USERS: 'unimart_v2_users',
  CURRENT_USER: 'unimart_v2_current_user',
  PRODUCTS: 'unimart_v2_products',
  UNIVERSITIES: 'unimart_v2_universities',
  ORDERS: 'unimart_v2_orders',
  COUPONS: 'unimart_v2_coupons',
  CART: 'unimart_v2_cart',
  WISHLIST: 'unimart_v2_wishlist',
  ADDRESSES: 'unimart_v2_addresses',
  NOTIFICATIONS: 'unimart_v2_notifications',
  ACTIVE_CAMPUS: 'unimart_v2_active_campus',
};

interface StoredUserRecord extends StudentUser {
  passwordHash: string; // Demo-only local credential store; replaced by Firebase Auth in production
}

const DEFAULT_DEMO_USERS: StoredUserRecord[] = [
  {
    uid: 'stu-aarav-001',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@dgu.ac.in',
    mobile: '9876543210',
    universityId: 'uni-dgu',
    campusId: 'dgu-selaqui',
    hostel: 'Aarav Boys Hostel',
    roomNumber: 'B-304',
    role: 'student',
    createdAt: '2026-01-14T09:30:00.000Z',
    passwordHash: 'Campus@123',
  },
  {
    uid: 'stu-riya-002',
    name: 'Riya Negi',
    email: 'riya.negi@dgu.ac.in',
    mobile: '9811223344',
    universityId: 'uni-dgu',
    campusId: 'dgu-selaqui',
    hostel: 'Shivalik Girls Hostel',
    roomNumber: 'A-212',
    role: 'student',
    createdAt: '2026-01-20T14:15:00.000Z',
    passwordHash: 'Campus@123',
  },
  {
    uid: 'stu-kabir-003',
    name: 'Kabir Malhotra',
    email: 'kabir.m@iitd.ac.in',
    mobile: '9988776655',
    universityId: 'uni-iitd',
    campusId: 'iitd-hauzkhas',
    hostel: 'Karakoram Hostel',
    roomNumber: 'E-118',
    role: 'student',
    createdAt: '2026-02-02T11:00:00.000Z',
    passwordHash: 'Campus@123',
  },
  {
    uid: 'adm-unimart-001',
    name: 'UNIMART Campus Ops',
    email: 'admin@unimart.in',
    mobile: '9000011111',
    universityId: 'uni-dgu',
    campusId: 'dgu-selaqui',
    hostel: 'Central Operations Hub',
    roomNumber: 'HUB-01',
    role: 'admin',
    createdAt: '2026-01-01T08:00:00.000Z',
    passwordHash: 'Admin@123',
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'UNI-2604-4821',
    userId: 'stu-aarav-001',
    studentName: 'Aarav Sharma',
    phone: '9876543210',
    universityId: 'uni-dgu',
    universityName: 'DBS Global University',
    campusId: 'dgu-selaqui',
    campusName: 'Selaqui Main Campus',
    hostel: 'Aarav Boys Hostel',
    block: 'Block B',
    roomNumber: 'B-304',
    deliveryInstructions: 'Call on arrival at hostel main security gate',
    items: [
      {
        productId: 'prod-maggi',
        name: 'Maggi 2-Minute Masala Noodles 8-Pack Value Bundle',
        category: 'Instant food',
        price: 112,
        quantity: 2,
        image: INITIAL_PRODUCTS.find((p) => p.id === 'prod-maggi')!.image,
      },
      {
        productId: 'prod-nescafe',
        name: 'Nescafé Classic Instant Coffee Glass Jar',
        category: 'Beverages',
        price: 285,
        quantity: 1,
        image: INITIAL_PRODUCTS.find((p) => p.id === 'prod-nescafe')!.image,
      },
    ],
    subtotal: 509,
    discount: 50,
    couponCode: 'UNIFIRST',
    deliveryFee: 0,
    total: 459,
    paymentMethod: 'Campus UPI Demo',
    paymentStatus: 'success',
    status: 'Out for Delivery',
    createdAt: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
    timeline: [
      { status: 'Pending', label: 'Order Placed', timestamp: 'Today, 08:12 PM', note: 'Received at Selaqui Dark Store', completed: true },
      { status: 'Confirmed', label: 'Confirmed by Campus Hub', timestamp: 'Today, 08:14 PM', note: 'Inventory reserved for Block B', completed: true },
      { status: 'Packed', label: 'Packed at Hostel Store', timestamp: 'Today, 08:21 PM', note: 'Sealed in eco-kraft campus bag', completed: true },
      { status: 'Out for Delivery', label: 'Out for Delivery', timestamp: 'Today, 08:29 PM', note: 'Rider en route to Aarav Boys Hostel', completed: true },
      { status: 'Delivered', label: 'Delivered', timestamp: 'Expected 08:42 PM', note: 'Handover at hostel gate / room', completed: false },
    ],
  },
  {
    id: 'UNI-2604-3190',
    userId: 'stu-riya-002',
    studentName: 'Riya Negi',
    phone: '9811223344',
    universityId: 'uni-dgu',
    universityName: 'DBS Global University',
    campusId: 'dgu-selaqui',
    campusName: 'Selaqui Main Campus',
    hostel: 'Shivalik Girls Hostel',
    block: 'Block A',
    roomNumber: 'A-212',
    deliveryInstructions: 'Leave with reception desk if in evening lab',
    items: [
      {
        productId: 'prod-extension-board',
        name: 'Belkin 4-Socket Surge Protector Extension Board (2m Cord)',
        category: 'Electronics',
        price: 849,
        quantity: 1,
        image: INITIAL_PRODUCTS.find((p) => p.id === 'prod-extension-board')!.image,
      },
      {
        productId: 'prod-detergent',
        name: 'Surf Excel Easy Wash Detergent Powder (Hostel 2kg Pack)',
        category: 'Laundry',
        price: 265,
        quantity: 1,
        image: INITIAL_PRODUCTS.find((p) => p.id === 'prod-detergent')!.image,
      },
    ],
    subtotal: 1114,
    discount: 111,
    couponCode: 'HOSTEL10',
    deliveryFee: 0,
    total: 1003,
    paymentMethod: 'Student Wallet Demo',
    paymentStatus: 'success',
    status: 'Delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    timeline: [
      { status: 'Pending', label: 'Order Placed', timestamp: 'Yesterday, 06:05 PM', note: 'Received at Selaqui Dark Store', completed: true },
      { status: 'Confirmed', label: 'Confirmed by Campus Hub', timestamp: 'Yesterday, 06:07 PM', note: 'Inventory verified', completed: true },
      { status: 'Packed', label: 'Packed at Hostel Store', timestamp: 'Yesterday, 06:14 PM', note: 'Quality checked', completed: true },
      { status: 'Out for Delivery', label: 'Out for Delivery', timestamp: 'Yesterday, 06:22 PM', note: 'Dispatched to Shivalik Girls Hostel', completed: true },
      { status: 'Delivered', label: 'Delivered', timestamp: 'Yesterday, 06:31 PM', note: 'Collected at Hostel Reception', completed: true },
    ],
  },
  {
    id: 'UNI-2604-2754',
    userId: 'stu-kabir-003',
    studentName: 'Kabir Malhotra',
    phone: '9988776655',
    universityId: 'uni-iitd',
    universityName: 'Indian Institute of Technology Delhi',
    campusId: 'iitd-hauzkhas',
    campusName: 'Hauz Khas Campus',
    hostel: 'Karakoram Hostel',
    block: 'East Wing',
    roomNumber: 'E-118',
    deliveryInstructions: 'Drop at Karakoram guard desk',
    items: [
      {
        productId: 'prod-calculator',
        name: 'Casio fx-991CW Scientific Calculator & Graph Pad Set',
        category: 'Stationery',
        price: 1295,
        quantity: 1,
        image: INITIAL_PRODUCTS.find((p) => p.id === 'prod-calculator')!.image,
      },
    ],
    subtotal: 1295,
    discount: 130,
    couponCode: 'HOSTEL10',
    deliveryFee: 0,
    total: 1165,
    paymentMethod: 'Campus UPI Demo',
    paymentStatus: 'success',
    status: 'Delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    timeline: [
      { status: 'Pending', label: 'Order Placed', timestamp: '2 days ago, 04:10 PM', note: 'Received at IITD Hub', completed: true },
      { status: 'Confirmed', label: 'Confirmed by Campus Hub', timestamp: '2 days ago, 04:12 PM', note: 'Warranty card verified', completed: true },
      { status: 'Packed', label: 'Packed at Hostel Store', timestamp: '2 days ago, 04:18 PM', note: 'Ready for pickup', completed: true },
      { status: 'Out for Delivery', label: 'Out for Delivery', timestamp: '2 days ago, 04:24 PM', note: 'En route to Karakoram Hostel', completed: true },
      { status: 'Delivered', label: 'Delivered', timestamp: '2 days ago, 04:32 PM', note: 'Delivered to student', completed: true },
    ],
  },
];

const INITIAL_ADDRESSES: AddressItem[] = [
  {
    id: 'addr-1',
    label: 'My Hostel Room',
    universityId: 'uni-dgu',
    campusId: 'dgu-selaqui',
    hostel: 'Aarav Boys Hostel',
    block: 'Block B',
    roomNumber: 'B-304',
    phone: '9876543210',
    isDefault: true,
  },
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Order UNI-2604-4821 is Out for Delivery',
    message: 'Your Maggi & Nescafé order is arriving at Aarav Boys Hostel Gate in ~10 mins.',
    timestamp: '10 mins ago',
    read: false,
    type: 'order',
  },
  {
    id: 'notif-2',
    title: 'Mid-Sem Student Deal Live',
    message: 'Use code EXAMFUEL for ₹30 off snacks & instant food orders above ₹199.',
    timestamp: '2 hours ago',
    read: false,
    type: 'deal',
  },
  {
    id: 'notif-3',
    title: 'Free Campus Delivery Above ₹299',
    message: 'Zero delivery fees unlocked on orders above ₹299 across DGU, MIT & VIT hubs.',
    timestamp: 'Yesterday',
    read: true,
    type: 'campus',
  },
];

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function safeReadArray<T>(key: string, fallback: T[]): T[] {
  const val = safeRead<unknown>(key, fallback);
  return Array.isArray(val) ? (val as T[]) : fallback;
}

function safeWrite<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors in restricted preview contexts
  }
}

export function buildOrderTimeline(status: OrderStatus, campusName: string): Order['timeline'] {
  const steps: { status: OrderStatus; label: string; note: string }[] = [
    { status: 'Pending', label: 'Order Placed', note: `Order logged at ${campusName} Hub` },
    { status: 'Confirmed', label: 'Confirmed by Campus Hub', note: 'Campus inventory reserved' },
    { status: 'Packed', label: 'Packed at Hostel Store', note: 'Sealed for hostel runner pickup' },
    { status: 'Out for Delivery', label: 'Out for Delivery', note: 'Runner heading to hostel block' },
    { status: 'Delivered', label: 'Delivered', note: 'Handed over at hostel gate/room' },
  ];

  const orderIndex = steps.findIndex((s) => s.status === status);
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return steps.map((step, idx) => ({
    status: step.status,
    label: step.label,
    note: step.note,
    timestamp: idx <= orderIndex ? `Updated · ${nowStr}` : 'Upcoming',
    completed: status !== 'Cancelled' && idx <= orderIndex,
  }));
}

export const authService = {
  getUsers(): StoredUserRecord[] {
    const existing = safeReadArray<StoredUserRecord>(KEYS.USERS, []);
    if (existing.length === 0) {
      safeWrite(KEYS.USERS, DEFAULT_DEMO_USERS);
      return DEFAULT_DEMO_USERS;
    }
    return existing;
  },

  getCurrentUser(): StudentUser | null {
    const user = safeRead<StudentUser | null>(KEYS.CURRENT_USER, null);
    if (!user || typeof user !== 'object' || !user.uid) return null;
    return user;
  },

  async login(email: string, password: string): Promise<StudentUser> {
    await new Promise((r) => setTimeout(r, 320));
    const users = this.getUsers();
    const match = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.passwordHash === password
    );
    if (!match) {
      throw new Error('Invalid campus email or password. Try aarav.sharma@dgu.ac.in / Campus@123');
    }
    const { passwordHash: _, ...publicUser } = match;
    safeWrite(KEYS.CURRENT_USER, publicUser);
    return publicUser;
  },

  async register(payload: {
    name: string;
    email: string;
    mobile: string;
    universityId: string;
    campusId: string;
    hostel: string;
    roomNumber: string;
    password: string;
  }): Promise<StudentUser> {
    await new Promise((r) => setTimeout(r, 400));
    const users = this.getUsers();
    if (users.some((u) => u.email.toLowerCase() === payload.email.trim().toLowerCase())) {
      throw new Error('An account with this email already exists. Please sign in.');
    }
    const newRecord: StoredUserRecord = {
      uid: `stu-${Date.now().toString(36)}`,
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      mobile: payload.mobile.trim(),
      universityId: payload.universityId,
      campusId: payload.campusId,
      hostel: payload.hostel,
      roomNumber: payload.roomNumber.trim(),
      role: 'student',
      createdAt: new Date().toISOString(),
      passwordHash: payload.password,
    };
    const updated = [...users, newRecord];
    safeWrite(KEYS.USERS, updated);
    const { passwordHash: _, ...publicUser } = newRecord;
    safeWrite(KEYS.CURRENT_USER, publicUser);
    return publicUser;
  },

  async sendPasswordReset(email: string): Promise<string> {
    await new Promise((r) => setTimeout(r, 320));
    const users = this.getUsers();
    const exists = users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!exists) {
      throw new Error('No student account found for that email address.');
    }
    return `Demo password reset instructions prepared for ${email.trim()}. (In production, Firebase Auth sends an email link.)`;
  },

  updateProfile(updatedUser: StudentUser): StudentUser {
    const users = this.getUsers();
    const nextUsers = users.map((u) =>
      u.uid === updatedUser.uid ? { ...u, ...updatedUser } : u
    );
    safeWrite(KEYS.USERS, nextUsers);
    safeWrite(KEYS.CURRENT_USER, updatedUser);
    return updatedUser;
  },

  logout(): void {
    try {
      localStorage.removeItem(KEYS.CURRENT_USER);
    } catch {
      // ignore
    }
  },
};

const INITIAL_IMAGE_BY_ID = new Map(INITIAL_PRODUCTS.map((p) => [p.id, p.image]));

export const storeService = {
  getProducts(): Product[] {
    const stored = safeReadArray<Product>(KEYS.PRODUCTS, []);
    if (stored.length === 0) {
      safeWrite(KEYS.PRODUCTS, INITIAL_PRODUCTS);
      return INITIAL_PRODUCTS;
    }

    // Re-hydrate bundled asset URLs & ensure required properties exist
    const sanitized = stored
      .filter((p) => p && typeof p === 'object' && p.id && p.name)
      .map((p) => ({
        ...p,
        image: INITIAL_IMAGE_BY_ID.get(p.id) ?? p.image,
        highlights: Array.isArray(p.highlights) ? p.highlights : [],
        stockByCampus: p.stockByCampus && typeof p.stockByCampus === 'object' ? p.stockByCampus : {},
        rating: typeof p.rating === 'number' ? p.rating : 4.5,
      }));

    const existingIds = new Set(sanitized.map((p) => p.id));
    const missing = INITIAL_PRODUCTS.filter((p) => !existingIds.has(p.id));
    const finalProducts = missing.length > 0 ? [...sanitized, ...missing] : sanitized;
    if (finalProducts.length === 0) {
      safeWrite(KEYS.PRODUCTS, INITIAL_PRODUCTS);
      return INITIAL_PRODUCTS;
    }
    safeWrite(KEYS.PRODUCTS, finalProducts);
    return finalProducts;
  },
  saveProducts(products: Product[]): void {
    safeWrite(KEYS.PRODUCTS, products);
  },

  resetAllDemoData(): void {
    Object.values(KEYS).forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    });
  },

  getUniversities(): University[] {
    const stored = safeReadArray<University>(KEYS.UNIVERSITIES, []).filter(
      (u) => u && Array.isArray(u.campuses) && u.campuses.length > 0
    );
    if (stored.length === 0) {
      safeWrite(KEYS.UNIVERSITIES, INITIAL_UNIVERSITIES);
      return INITIAL_UNIVERSITIES;
    }
    return stored;
  },
  saveUniversities(universities: University[]): void {
    safeWrite(KEYS.UNIVERSITIES, universities);
  },

  getOrders(): Order[] {
    const stored = safeReadArray<Order>(KEYS.ORDERS, []);
    if (stored.length === 0) {
      safeWrite(KEYS.ORDERS, INITIAL_ORDERS);
      return INITIAL_ORDERS;
    }
    return stored
      .filter((o) => o && typeof o === 'object' && o.id)
      .map((o) => ({
        ...o,
        items: Array.isArray(o.items)
          ? o.items.map((item) => ({
              ...item,
              image: INITIAL_IMAGE_BY_ID.get(item.productId) ?? item.image,
            }))
          : [],
        timeline: Array.isArray(o.timeline)
          ? o.timeline
          : buildOrderTimeline(o.status || 'Pending', o.campusName || 'Campus'),
      }));
  },
  saveOrders(orders: Order[]): void {
    safeWrite(KEYS.ORDERS, orders);
  },

  getCoupons(): Coupon[] {
    const stored = safeReadArray<Coupon>(KEYS.COUPONS, []);
    if (stored.length === 0) {
      safeWrite(KEYS.COUPONS, INITIAL_COUPONS);
      return INITIAL_COUPONS;
    }
    return stored;
  },
  saveCoupons(coupons: Coupon[]): void {
    safeWrite(KEYS.COUPONS, coupons);
  },

  getCart(): CartItem[] {
    return safeReadArray<CartItem>(KEYS.CART, []);
  },
  saveCart(cart: CartItem[]): void {
    safeWrite(KEYS.CART, cart);
  },

  getWishlist(): string[] {
    return safeReadArray<string>(KEYS.WISHLIST, ['prod-maggi', 'prod-backpack', 'prod-desk-lamp']);
  },
  saveWishlist(wishlist: string[]): void {
    safeWrite(KEYS.WISHLIST, wishlist);
  },

  getAddresses(): AddressItem[] {
    return safeReadArray<AddressItem>(KEYS.ADDRESSES, INITIAL_ADDRESSES);
  },
  saveAddresses(addresses: AddressItem[]): void {
    safeWrite(KEYS.ADDRESSES, addresses);
  },

  getNotifications(): NotificationItem[] {
    return safeReadArray<NotificationItem>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  },
  saveNotifications(notifications: NotificationItem[]): void {
    safeWrite(KEYS.NOTIFICATIONS, notifications);
  },

  getActiveCampusSelection(): { universityId: string; campusId: string } {
    const sel = safeRead<{ universityId?: string; campusId?: string }>(KEYS.ACTIVE_CAMPUS, {});
    return {
      universityId: sel.universityId || 'uni-dgu',
      campusId: sel.campusId || 'dgu-selaqui',
    };
  },
  saveActiveCampusSelection(universityId: string, campusId: string): void {
    safeWrite(KEYS.ACTIVE_CAMPUS, { universityId, campusId });
  },
};
