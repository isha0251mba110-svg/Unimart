import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATEGORIES,
  COMBO_OFFERS,
  INITIAL_COUPONS,
  RAW_PRODUCTS,
  TESTIMONIALS,
} from '../src/data/catalogData.ts';
import { INITIAL_UNIVERSITIES } from '../src/data/universities.ts';
import type {
  AddressItem,
  CartItem,
  CategoryId,
  ComboOffer,
  Coupon,
  NotificationItem,
  Order,
  OrderStatus,
  Product,
  StudentUser,
  Testimonial,
  University,
} from '../src/types.ts';

export interface StoredUserRecord extends StudentUser {
  passwordHash: string;
}

export interface SessionRecord {
  token: string;
  uid: string;
  createdAt: string;
  expiresAt: string;
}

export interface PasswordResetRecord {
  email: string;
  token: string;
  requestedAt: string;
}

export interface CampusPreference {
  universityId: string;
  campusId: string;
}

export interface UnimartDatabase {
  version: number;
  updatedAt: string;
  categories: { id: CategoryId; subtitle: string; iconKey: string }[];
  universities: University[];
  products: Product[];
  combos: ComboOffer[];
  testimonials: Testimonial[];
  coupons: Coupon[];
  users: StoredUserRecord[];
  sessions: Record<string, SessionRecord>;
  passwordResets: PasswordResetRecord[];
  orders: Order[];
  carts: Record<string, CartItem[]>;
  wishlists: Record<string, string[]>;
  addresses: Record<string, AddressItem[]>;
  notifications: NotificationItem[];
  campusPreferences: Record<string, CampusPreference>;
}

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const isReadOnlyRuntime = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_DIR = isReadOnlyRuntime
  ? path.join('/tmp', 'unimart-data')
  : path.join(serverDir, 'data');
const DB_PATH = path.join(DB_DIR, 'unimart-db.json');

export function hashPassword(password: string, existingSalt?: string): string {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (!storedHash.includes(':')) {
    return password === storedHash;
  }
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (derivedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derivedBuf, expectedBuf);
}

export function sanitizeUser(record: StoredUserRecord): StudentUser {
  const { passwordHash: _ignored, ...publicUser } = record;
  return publicUser;
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

function createSeedDatabase(): UnimartDatabase {
  const products: Product[] = RAW_PRODUCTS.map((p) => ({
    ...p,
    highlights: [...p.highlights],
    stockByCampus: { ...p.stockByCampus },
  }));

  const findImg = (id: string) => products.find((p) => p.id === id)?.image ?? '';

  const initialUsers: StoredUserRecord[] = [
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
      passwordHash: hashPassword('Campus@123'),
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
      passwordHash: hashPassword('Campus@123'),
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
      passwordHash: hashPassword('Campus@123'),
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
      passwordHash: hashPassword('Admin@123'),
    },
  ];

  const initialOrders: Order[] = [
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
          image: findImg('prod-maggi'),
        },
        {
          productId: 'prod-nescafe',
          name: 'Nescafé Classic Instant Coffee Glass Jar',
          category: 'Beverages',
          price: 285,
          quantity: 1,
          image: findImg('prod-nescafe'),
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
          image: findImg('prod-extension-board'),
        },
        {
          productId: 'prod-detergent',
          name: 'Surf Excel Easy Wash Detergent Powder (Hostel 2kg Pack)',
          category: 'Laundry',
          price: 265,
          quantity: 1,
          image: findImg('prod-detergent'),
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
          image: findImg('prod-calculator'),
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

  const defaultAddresses: AddressItem[] = [
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

  const initialNotifications: NotificationItem[] = [
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

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    categories: CATEGORIES.map((c) => ({ ...c })),
    universities: structuredClone(INITIAL_UNIVERSITIES),
    products,
    combos: structuredClone(COMBO_OFFERS),
    testimonials: structuredClone(TESTIMONIALS),
    coupons: structuredClone(INITIAL_COUPONS),
    users: initialUsers,
    sessions: {},
    passwordResets: [],
    orders: initialOrders,
    carts: {},
    wishlists: {
      default: ['prod-maggi', 'prod-backpack', 'prod-desk-lamp'],
    },
    addresses: {
      default: defaultAddresses,
      'stu-aarav-001': structuredClone(defaultAddresses),
    },
    notifications: initialNotifications,
    campusPreferences: {
      default: { universityId: 'uni-dgu', campusId: 'dgu-selaqui' },
    },
  };
}

let cachedDb: UnimartDatabase | null = null;

function persistToDisk(db: UnimartDatabase): void {
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
    const serialized = JSON.stringify(db, null, 2);
    const tmpPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, serialized, 'utf8');
    fs.renameSync(tmpPath, DB_PATH);
  } catch (err) {
    console.warn('[UNIMART DB] Could not persist to disk, keeping in-memory state:', err);
  }
}

export function getDb(): UnimartDatabase {
  if (cachedDb) return cachedDb;

  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<UnimartDatabase>;
      if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.universities)) {
        const seed = createSeedDatabase();
        cachedDb = {
          ...seed,
          ...parsed,
          categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : seed.categories,
          combos: Array.isArray(parsed.combos) && parsed.combos.length > 0 ? parsed.combos : seed.combos,
          testimonials: Array.isArray(parsed.testimonials) && parsed.testimonials.length > 0 ? parsed.testimonials : seed.testimonials,
          coupons: Array.isArray(parsed.coupons) && parsed.coupons.length > 0 ? parsed.coupons : seed.coupons,
          users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : seed.users,
          sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
          passwordResets: Array.isArray(parsed.passwordResets) ? parsed.passwordResets : [],
          orders: Array.isArray(parsed.orders) ? parsed.orders : seed.orders,
          carts: parsed.carts && typeof parsed.carts === 'object' ? parsed.carts : {},
          wishlists: parsed.wishlists && typeof parsed.wishlists === 'object' ? parsed.wishlists : seed.wishlists,
          addresses: parsed.addresses && typeof parsed.addresses === 'object' ? parsed.addresses : seed.addresses,
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : seed.notifications,
          campusPreferences: parsed.campusPreferences && typeof parsed.campusPreferences === 'object' ? parsed.campusPreferences : seed.campusPreferences,
        };
        return cachedDb;
      }
    }
  } catch (err) {
    console.warn('[UNIMART DB] Re-seeding database after read error:', err);
  }

  cachedDb = createSeedDatabase();
  persistToDisk(cachedDb);
  return cachedDb;
}

export function saveDb(nextDb: UnimartDatabase): UnimartDatabase {
  nextDb.updatedAt = new Date().toISOString();
  cachedDb = nextDb;
  persistToDisk(nextDb);
  return nextDb;
}

export function resetDb(): UnimartDatabase {
  cachedDb = createSeedDatabase();
  persistToDisk(cachedDb);
  return cachedDb;
}
