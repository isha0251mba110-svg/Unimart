import {
  INITIAL_COUPONS,
  INITIAL_PRODUCTS,
  resolveProductImage,
} from '../data/products';
import { INITIAL_UNIVERSITIES } from '../data/universities';
import type {
  AddressItem,
  CartItem,
  CategoryId,
  ComboOffer,
  Coupon,
  NotificationItem,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentState,
  Product,
  StudentUser,
  Testimonial,
  University,
} from '../types';

export const firebaseConfigPlaceholder = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'FULLSTACK_EXPRESS_BACKEND_ACTIVE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'unimart-campus-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'unimart-campus-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'unimart-campus-demo.appspot.com',
  isConfigured: Boolean(import.meta.env.VITE_FIREBASE_API_KEY),
};

const SESSION_TOKEN_KEY = 'unimart_session_token';
const CLIENT_ID_KEY = 'unimart_client_id';
const USER_CACHE_KEY = 'unimart_v2_current_user';

export interface BootstrapPayload {
  categories: { id: CategoryId; subtitle: string; iconKey: string }[];
  universities: University[];
  products: Product[];
  combos: ComboOffer[];
  testimonials: Testimonial[];
  coupons: Coupon[];
  orders: Order[];
  cart: CartItem[];
  wishlist: string[];
  addresses: AddressItem[];
  notifications: NotificationItem[];
  currentUser: StudentUser | null;
  students: StudentUser[];
  activeCampus: { universityId: string; campusId: string };
}

function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = `cli-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return 'default';
  }
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

function cacheCurrentUser(user: StudentUser | null): void {
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // ignore
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('x-unimart-client', getClientId());
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    const errMsg =
      typeof data.error === 'string' && data.error
        ? data.error
        : `Server error (${res.status})`;
    throw new Error(errMsg);
  }

  return data as T;
}

export function hydrateProduct(p: Product): Product {
  return {
    ...p,
    image: resolveProductImage(p.id, p.image, p.category),
    highlights: Array.isArray(p.highlights) ? p.highlights : [],
    stockByCampus: p.stockByCampus && typeof p.stockByCampus === 'object' ? p.stockByCampus : {},
    rating: typeof p.rating === 'number' ? p.rating : 4.5,
  };
}

export function hydrateOrder(o: Order): Order {
  return {
    ...o,
    items: Array.isArray(o.items)
      ? o.items.map((item) => ({
          ...item,
          image: resolveProductImage(item.productId, item.image, item.category),
        }))
      : [],
    timeline: Array.isArray(o.timeline)
      ? o.timeline
      : buildOrderTimeline(o.status || 'Pending', o.campusName || 'Campus'),
  };
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

let cachedStudents: StudentUser[] = [];

export const authService = {
  getUsers(): StudentUser[] {
    return cachedStudents;
  },

  getCurrentUser(): StudentUser | null {
    try {
      const raw = localStorage.getItem(USER_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StudentUser;
      return parsed && parsed.uid ? parsed : null;
    } catch {
      return null;
    }
  },

  async login(email: string, password: string): Promise<{
    user: StudentUser;
    cart?: CartItem[];
    wishlist?: string[];
    addresses?: AddressItem[];
  }> {
    const data = await apiFetch<{
      user: StudentUser;
      token: string;
      cart?: CartItem[];
      wishlist?: string[];
      addresses?: AddressItem[];
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    cacheCurrentUser(data.user);
    return {
      user: data.user,
      cart: data.cart,
      wishlist: data.wishlist,
      addresses: data.addresses,
    };
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
  }): Promise<{ user: StudentUser; addresses?: AddressItem[] }> {
    const data = await apiFetch<{
      user: StudentUser;
      token: string;
      addresses?: AddressItem[];
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(data.token);
    cacheCurrentUser(data.user);
    return { user: data.user, addresses: data.addresses };
  },

  async sendPasswordReset(email: string): Promise<string> {
    const data = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return data.message;
  },

  async updateProfile(updatedUser: StudentUser): Promise<StudentUser> {
    const data = await apiFetch<{ user: StudentUser }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updatedUser),
    });
    cacheCurrentUser(data.user);
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear local session regardless
    }
    setStoredToken(null);
    cacheCurrentUser(null);
  },
};

export const storeService = {
  async bootstrap(): Promise<BootstrapPayload> {
    const data = await apiFetch<BootstrapPayload>('/api/bootstrap');
    cachedStudents = Array.isArray(data.students) ? data.students : [];
    cacheCurrentUser(data.currentUser ?? null);
    return {
      ...data,
      products: (data.products ?? INITIAL_PRODUCTS).map(hydrateProduct),
      universities:
        Array.isArray(data.universities) && data.universities.length > 0
          ? data.universities
          : INITIAL_UNIVERSITIES,
      orders: (data.orders ?? []).map(hydrateOrder),
      coupons: Array.isArray(data.coupons) ? data.coupons : INITIAL_COUPONS,
      cart: Array.isArray(data.cart) ? data.cart : [],
      wishlist: Array.isArray(data.wishlist) ? data.wishlist : [],
      addresses: Array.isArray(data.addresses) ? data.addresses : [],
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
      activeCampus: data.activeCampus || { universityId: 'uni-dgu', campusId: 'dgu-selaqui' },
    };
  },

  getProducts(): Product[] {
    return INITIAL_PRODUCTS;
  },

  getUniversities(): University[] {
    return INITIAL_UNIVERSITIES;
  },

  getOrders(): Order[] {
    return [];
  },

  getCoupons(): Coupon[] {
    return INITIAL_COUPONS;
  },

  getCart(): CartItem[] {
    return [];
  },

  getWishlist(): string[] {
    return ['prod-maggi', 'prod-backpack', 'prod-desk-lamp'];
  },

  getAddresses(): AddressItem[] {
    return [];
  },

  getNotifications(): NotificationItem[] {
    return [];
  },

  getActiveCampusSelection(): { universityId: string; campusId: string } {
    return { universityId: 'uni-dgu', campusId: 'dgu-selaqui' };
  },

  async saveProducts(products: Product[]): Promise<Product[]> {
    const data = await apiFetch<{ products: Product[] }>('/api/products', {
      method: 'PUT',
      body: JSON.stringify({ products }),
    });
    return data.products.map(hydrateProduct);
  },

  async saveUniversities(universities: University[]): Promise<University[]> {
    const data = await apiFetch<{ universities: University[] }>('/api/universities', {
      method: 'PUT',
      body: JSON.stringify({ universities }),
    });
    return data.universities;
  },

  async createOrder(payload: {
    userId?: string;
    studentName: string;
    phone: string;
    universityId: string;
    campusId: string;
    hostel: string;
    block: string;
    roomNumber: string;
    deliveryInstructions: string;
    items: CartItem[];
    couponCode?: string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentState;
  }): Promise<{ order: Order; products: Product[]; notifications: NotificationItem[] }> {
    const data = await apiFetch<{
      order: Order;
      products: Product[];
      notifications: NotificationItem[];
    }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return {
      order: hydrateOrder(data.order),
      products: data.products.map(hydrateProduct),
      notifications: data.notifications,
    };
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    paymentStatus?: PaymentState
  ): Promise<Order> {
    const data = await apiFetch<{ order: Order }>(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, paymentStatus }),
    });
    return hydrateOrder(data.order);
  },

  async saveCoupons(coupons: Coupon[]): Promise<Coupon[]> {
    const data = await apiFetch<{ coupons: Coupon[] }>('/api/coupons', {
      method: 'PUT',
      body: JSON.stringify({ coupons }),
    });
    return data.coupons;
  },

  async saveCart(cart: CartItem[]): Promise<void> {
    await apiFetch('/api/cart', {
      method: 'PUT',
      body: JSON.stringify({ cart }),
    });
  },

  async saveWishlist(wishlist: string[]): Promise<void> {
    await apiFetch('/api/wishlist', {
      method: 'PUT',
      body: JSON.stringify({ wishlist }),
    });
  },

  async saveAddresses(addresses: AddressItem[]): Promise<void> {
    await apiFetch('/api/addresses', {
      method: 'PUT',
      body: JSON.stringify({ addresses }),
    });
  },

  async markAllNotificationsRead(): Promise<NotificationItem[]> {
    const data = await apiFetch<{ notifications: NotificationItem[] }>(
      '/api/notifications/read-all',
      { method: 'POST' }
    );
    return data.notifications;
  },

  async saveActiveCampusSelection(universityId: string, campusId: string): Promise<void> {
    await apiFetch('/api/preferences/campus', {
      method: 'PUT',
      body: JSON.stringify({ universityId, campusId }),
    });
  },

  async fetchOrders(): Promise<Order[]> {
    const data = await apiFetch<{ orders: Order[] }>('/api/orders');
    return (data.orders ?? []).map(hydrateOrder);
  },

  async fetchCustomers(): Promise<StudentUser[]> {
    const data = await apiFetch<{ students: StudentUser[] }>('/api/admin/customers');
    cachedStudents = data.students;
    return data.students;
  },

  getReportDownloadUrl(type: 'orders.csv' | 'inventory.csv' | 'students.csv', campusId: string): string {
    return `/api/admin/reports/${type}?campusId=${encodeURIComponent(campusId)}`;
  },

  async resetAllDemoData(): Promise<{
    universities: University[];
    products: Product[];
    orders: Order[];
    coupons: Coupon[];
    addresses: AddressItem[];
    notifications: NotificationItem[];
    wishlist: string[];
    students: StudentUser[];
  }> {
    const data = await apiFetch<{
      universities: University[];
      products: Product[];
      orders: Order[];
      coupons: Coupon[];
      addresses: AddressItem[];
      notifications: NotificationItem[];
      wishlist: string[];
      students: StudentUser[];
    }>('/api/admin/reset', { method: 'POST' });
    cachedStudents = data.students ?? [];
    return {
      ...data,
      products: data.products.map(hydrateProduct),
      orders: data.orders.map(hydrateOrder),
    };
  },
};
