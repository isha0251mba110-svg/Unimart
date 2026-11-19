import crypto from 'node:crypto';
import express from 'express';
import type { Request, Response } from 'express';
import type {
  AddressItem,
  CartItem,
  CategoryId,
  Coupon,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentState,
  Product,
  University,
} from '../src/types.ts';
import {
  buildOrderTimeline,
  getDb,
  hashPassword,
  resetDb,
  sanitizeUser,
  saveDb,
  verifyPassword,
} from './db.ts';
import type { StoredUserRecord, UnimartDatabase } from './db.ts';

export const apiApp = express();
apiApp.use(express.json({ limit: '4mb' }));

const SESSION_COOKIE_NAME = 'unimart_session';

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    if (key) result[key] = val;
  }
  return result;
}

function getSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const customHeader = req.headers['x-unimart-session'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE_NAME] || null;
}

function getClientKey(req: Request, user: StoredUserRecord | null): string {
  if (user) return user.uid;
  const headerId = req.headers['x-unimart-client'];
  if (typeof headerId === 'string' && headerId.trim()) {
    return `guest:${headerId.trim().slice(0, 64)}`;
  }
  return 'default';
}

function resolveSessionUser(req: Request, db: UnimartDatabase): {
  user: StoredUserRecord | null;
  token: string | null;
} {
  const token = getSessionToken(req);
  if (!token) return { user: null, token: null };
  const session = db.sessions[token];
  if (!session) return { user: null, token: null };
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    delete db.sessions[token];
    saveDb(db);
    return { user: null, token: null };
  }
  const user = db.users.find((u) => u.uid === session.uid) ?? null;
  return { user, token };
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 14,
  });
}

function getScopedCart(db: UnimartDatabase, clientKey: string): CartItem[] {
  return db.carts[clientKey] ?? [];
}

function getScopedWishlist(db: UnimartDatabase, clientKey: string): string[] {
  return db.wishlists[clientKey] ?? db.wishlists.default ?? [];
}

function getScopedAddresses(db: UnimartDatabase, clientKey: string, user: StoredUserRecord | null): AddressItem[] {
  if (user && db.addresses[user.uid]) return db.addresses[user.uid];
  return db.addresses[clientKey] ?? db.addresses.default ?? [];
}

function getScopedCampusPref(db: UnimartDatabase, clientKey: string, user: StoredUserRecord | null) {
  if (db.campusPreferences[clientKey]) return db.campusPreferences[clientKey];
  if (user) return { universityId: user.universityId, campusId: user.campusId };
  return db.campusPreferences.default ?? { universityId: 'uni-dgu', campusId: 'dgu-selaqui' };
}

function computeOrderAmounts(
  db: UnimartDatabase,
  items: { productId: string; quantity: number }[],
  campusId: string,
  couponCode?: string
) {
  const campus =
    db.universities.flatMap((u) => u.campuses).find((c) => c.id === campusId) ??
    db.universities[0].campuses[0];

  let subtotal = 0;
  const resolvedItems: Order['items'] = [];

  for (const item of items) {
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const prod = db.products.find((p) => p.id === item.productId);
    if (!prod) continue;
    subtotal += prod.price * qty;
    resolvedItems.push({
      productId: prod.id,
      name: prod.name,
      category: prod.category,
      price: prod.price,
      quantity: qty,
      image: prod.image,
    });
  }

  let discount = 0;
  let appliedCoupon: string | undefined;
  if (couponCode) {
    const found = db.coupons.find(
      (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.active
    );
    if (found && subtotal >= found.minCartValue) {
      appliedCoupon = found.code;
      if (found.discountType === 'flat') {
        discount = found.discountValue;
      } else {
        const pct = Math.round((subtotal * found.discountValue) / 100);
        discount = found.maxDiscount ? Math.min(pct, found.maxDiscount) : pct;
      }
      discount = Math.min(discount, subtotal);
    }
  }

  const afterDiscount = Math.max(0, subtotal - discount);
  const deliveryFee =
    resolvedItems.length === 0
      ? 0
      : afterDiscount >= campus.freeDeliveryAbove
      ? 0
      : campus.deliveryFee;

  return {
    resolvedItems,
    subtotal,
    discount,
    appliedCoupon,
    deliveryFee,
    total: afterDiscount + deliveryFee,
  };
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escapeCell = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
  return [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Health & Bootstrap
// ---------------------------------------------------------------------------
apiApp.get('/api/health', (_req, res) => {
  const db = getDb();
  res.json({
    ok: true,
    service: 'unimart-backend',
    updatedAt: db.updatedAt,
    counts: {
      products: db.products.length,
      categories: db.categories.length,
      universities: db.universities.length,
      orders: db.orders.length,
      users: db.users.length,
      coupons: db.coupons.length,
    },
  });
});

apiApp.get('/api/bootstrap', (req, res) => {
  const db = getDb();
  const { user } = resolveSessionUser(req, db);
  const clientKey = getClientKey(req, user);

  res.json({
    categories: db.categories,
    universities: db.universities,
    products: db.products,
    combos: db.combos,
    testimonials: db.testimonials,
    coupons: db.coupons,
    orders: db.orders,
    cart: getScopedCart(db, clientKey),
    wishlist: getScopedWishlist(db, clientKey),
    addresses: getScopedAddresses(db, clientKey, user),
    notifications: db.notifications,
    currentUser: user ? sanitizeUser(user) : null,
    students: db.users.filter((u) => u.role === 'student').map(sanitizeUser),
    activeCampus: getScopedCampusPref(db, clientKey, user),
  });
});

// ---------------------------------------------------------------------------
// Authentication & Student Profile
// ---------------------------------------------------------------------------
apiApp.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const db = getDb();
  const match = db.users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && verifyPassword(password, u.passwordHash)
  );
  if (!match) {
    res.status(401).json({
      error: 'Invalid campus email or password. Try aarav.sharma@dgu.ac.in / Campus@123',
    });
    return;
  }

  // Merge guest cart/wishlist into user cart/wishlist if user cart is empty
  const guestHeader = req.headers['x-unimart-client'];
  if (typeof guestHeader === 'string' && guestHeader.trim()) {
    const guestKey = `guest:${guestHeader.trim().slice(0, 64)}`;
    if ((db.carts[guestKey]?.length ?? 0) > 0 && (db.carts[match.uid]?.length ?? 0) === 0) {
      db.carts[match.uid] = [...db.carts[guestKey]];
    }
    if ((db.wishlists[guestKey]?.length ?? 0) > 0 && (db.wishlists[match.uid]?.length ?? 0) === 0) {
      db.wishlists[match.uid] = [...db.wishlists[guestKey]];
    }
  }

  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = {
    token,
    uid: match.uid,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
  };
  saveDb(db);
  setSessionCookie(res, token);

  res.json({
    user: sanitizeUser(match),
    token,
    cart: getScopedCart(db, match.uid),
    wishlist: getScopedWishlist(db, match.uid),
    addresses: getScopedAddresses(db, match.uid, match),
  });
});

apiApp.post('/api/auth/register', (req, res) => {
  const { name, email, mobile, universityId, campusId, hostel, roomNumber, password } = req.body ?? {};
  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof mobile !== 'string' ||
    typeof universityId !== 'string' ||
    typeof campusId !== 'string' ||
    typeof hostel !== 'string' ||
    typeof roomNumber !== 'string' ||
    typeof password !== 'string' ||
    !name.trim() ||
    !email.trim() ||
    !/^\d{10}$/.test(mobile.trim()) ||
    !roomNumber.trim() ||
    password.length < 6
  ) {
    res.status(400).json({
      error: 'Please complete all fields (valid 10-digit mobile, hostel room number, and password min 6 characters).',
    });
    return;
  }

  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    return;
  }

  const newRecord: StoredUserRecord = {
    uid: `stu-${Date.now().toString(36)}`,
    name: name.trim(),
    email: normalizedEmail,
    mobile: mobile.trim(),
    universityId,
    campusId,
    hostel,
    roomNumber: roomNumber.trim(),
    role: 'student',
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(password),
  };

  db.users.push(newRecord);
  db.addresses[newRecord.uid] = [
    {
      id: `addr-${Date.now().toString(36)}`,
      label: 'My Hostel Room',
      universityId,
      campusId,
      hostel,
      block: 'Block A',
      roomNumber: roomNumber.trim(),
      phone: mobile.trim(),
      isDefault: true,
    },
  ];
  db.notifications.unshift({
    id: `notif-${Date.now().toString(36)}`,
    title: `Welcome to UNIMART, ${newRecord.name.split(' ')[0]}!`,
    message: `Your hostel delivery profile for ${hostel} (Room ${newRecord.roomNumber}) is active. Use code UNIFIRST for ₹50 off.`,
    timestamp: 'Just now',
    read: false,
    type: 'campus',
  });

  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = {
    token,
    uid: newRecord.uid,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
  };

  saveDb(db);
  setSessionCookie(res, token);

  res.status(201).json({
    user: sanitizeUser(newRecord),
    token,
    addresses: db.addresses[newRecord.uid],
  });
});

apiApp.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body ?? {};
  if (typeof email !== 'string' || !email.trim()) {
    res.status(400).json({ error: 'Enter your registered university email.' });
    return;
  }
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const exists = db.users.some((u) => u.email.toLowerCase() === normalized);
  if (!exists) {
    res.status(404).json({ error: 'No student account found for that email address.' });
    return;
  }

  db.passwordResets.push({
    email: normalized,
    token: crypto.randomBytes(12).toString('hex'),
    requestedAt: new Date().toISOString(),
  });
  saveDb(db);

  res.json({
    message: `Password reset request logged for ${email.trim()}. Demo credentials can also be used to sign in immediately.`,
  });
});

apiApp.get('/api/auth/me', (req, res) => {
  const db = getDb();
  const { user } = resolveSessionUser(req, db);
  res.json({ user: user ? sanitizeUser(user) : null });
});

apiApp.put('/api/auth/profile', (req, res) => {
  const db = getDb();
  const { user } = resolveSessionUser(req, db);
  const body = req.body ?? {};
  const targetUid = user?.uid || body.uid;
  if (!targetUid) {
    res.status(401).json({ error: 'Authentication required to update profile.' });
    return;
  }
  const idx = db.users.findIndex((u) => u.uid === targetUid);
  if (idx === -1) {
    res.status(404).json({ error: 'Student account not found.' });
    return;
  }

  const current = db.users[idx];
  db.users[idx] = {
    ...current,
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : current.name,
    mobile: typeof body.mobile === 'string' && body.mobile.trim() ? body.mobile.trim() : current.mobile,
    universityId: typeof body.universityId === 'string' ? body.universityId : current.universityId,
    campusId: typeof body.campusId === 'string' ? body.campusId : current.campusId,
    hostel: typeof body.hostel === 'string' ? body.hostel : current.hostel,
    roomNumber: typeof body.roomNumber === 'string' && body.roomNumber.trim() ? body.roomNumber.trim() : current.roomNumber,
  };
  saveDb(db);
  res.json({ user: sanitizeUser(db.users[idx]) });
});

apiApp.post('/api/auth/logout', (req, res) => {
  const db = getDb();
  const token = getSessionToken(req);
  if (token && db.sessions[token]) {
    delete db.sessions[token];
    saveDb(db);
  }
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Catalog: Categories, Products, Combos, Testimonials
// ---------------------------------------------------------------------------
apiApp.get('/api/categories', (_req, res) => {
  const db = getDb();
  res.json({ categories: db.categories });
});

apiApp.get('/api/combos', (_req, res) => {
  const db = getDb();
  res.json({ combos: db.combos });
});

apiApp.get('/api/testimonials', (_req, res) => {
  const db = getDb();
  res.json({ testimonials: db.testimonials });
});

apiApp.get('/api/products', (req, res) => {
  const db = getDb();
  const category = typeof req.query.category === 'string' ? req.query.category : 'All';
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const campusId = typeof req.query.campusId === 'string' ? req.query.campusId : '';
  const inStockOnly = req.query.inStockOnly === 'true';
  const minRating = Number(req.query.minRating) || 0;
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'featured';

  let list = db.products.filter((p) => {
    const matchesCat = category === 'All' || p.category === category;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search) ||
      p.brand.toLowerCase().includes(search) ||
      p.category.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search);
    const matchesRating = p.rating >= minRating;
    const matchesStock = !inStockOnly || !campusId || (p.stockByCampus[campusId] ?? 0) > 0;
    return matchesCat && matchesSearch && matchesRating && matchesStock;
  });

  if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
  else if (sort === 'rating-desc') list = [...list].sort((a, b) => b.rating - a.rating);
  else if (sort === 'discount-desc') {
    list = [...list].sort((a, b) => {
      const dbPct = b.mrp > 0 ? (b.mrp - b.price) / b.mrp : 0;
      const daPct = a.mrp > 0 ? (a.mrp - a.price) / a.mrp : 0;
      return dbPct - daPct;
    });
  }

  res.json({ products: list });
});

apiApp.get('/api/products/:id', (req, res) => {
  const db = getDb();
  const prod = db.products.find((p) => p.id === req.params.id);
  if (!prod) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  res.json({ product: prod });
});

apiApp.post('/api/products', (req, res) => {
  const db = getDb();
  const body = req.body ?? {};
  if (typeof body.name !== 'string' || !body.name.trim()) {
    res.status(400).json({ error: 'Product name is required.' });
    return;
  }
  const category: CategoryId = body.category || 'Snacks';
  const fallbackImg =
    db.products.find((p) => p.category === category)?.image || db.products[0]?.image || '';

  const allCampusIds = db.universities.flatMap((u) => u.campuses.map((c) => c.id));
  const stockMap: Record<string, number> = {};
  for (const cid of allCampusIds) {
    stockMap[cid] = body.stockByCampus?.[cid] ?? 25;
  }

  const price = Math.max(1, Number(body.price) || 99);
  const mrp = Math.max(price, Number(body.mrp) || price);

  const created: Product = {
    id: body.id || `prod-${Date.now().toString(36)}`,
    sku: body.sku || `UNI-ADM-${Math.floor(100 + Math.random() * 899)}`,
    name: body.name.trim(),
    brand: (typeof body.brand === 'string' && body.brand.trim()) || 'UNIMART Select',
    category,
    price,
    mrp,
    rating: Number(body.rating) || 4.7,
    reviewCount: Number(body.reviewCount) || 12,
    unitLabel: (typeof body.unitLabel === 'string' && body.unitLabel.trim()) || '1 Unit',
    description:
      (typeof body.description === 'string' && body.description.trim()) ||
      'Added via UNIMART Campus Admin Console for hostel resident delivery.',
    highlights: Array.isArray(body.highlights) && body.highlights.length > 0
      ? body.highlights
      : ['Campus hub verified stock', 'Fast hostel gate delivery'],
    image: (typeof body.image === 'string' && body.image) || fallbackImg,
    stockByCampus: stockMap,
    isTrending: Boolean(body.isTrending ?? true),
    isBestseller: Boolean(body.isBestseller),
    isStudentDeal: Boolean(body.isStudentDeal),
  };

  db.products.unshift(created);
  saveDb(db);
  res.status(201).json({ product: created, products: db.products });
});

apiApp.patch('/api/products/:id', (req, res) => {
  const db = getDb();
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  const existing = db.products[idx];
  const body = req.body ?? {};
  db.products[idx] = {
    ...existing,
    ...body,
    id: existing.id,
    price: body.price !== undefined ? Math.max(1, Number(body.price) || existing.price) : existing.price,
    stockByCampus: body.stockByCampus ? { ...existing.stockByCampus, ...body.stockByCampus } : existing.stockByCampus,
  };
  saveDb(db);
  res.json({ product: db.products[idx], products: db.products });
});

apiApp.put('/api/products', (req, res) => {
  const products = req.body?.products;
  if (!Array.isArray(products)) {
    res.status(400).json({ error: 'Invalid products payload.' });
    return;
  }
  const db = getDb();
  db.products = products;
  saveDb(db);
  res.json({ products: db.products });
});

apiApp.delete('/api/products/:id', (req, res) => {
  const db = getDb();
  db.products = db.products.filter((p) => p.id !== req.params.id);
  saveDb(db);
  res.json({ products: db.products });
});

// ---------------------------------------------------------------------------
// Universities & Hostels
// ---------------------------------------------------------------------------
apiApp.get('/api/universities', (_req, res) => {
  const db = getDb();
  res.json({ universities: db.universities });
});

apiApp.post('/api/universities', (req, res) => {
  const { name, shortName, campusName, city } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim() || typeof campusName !== 'string' || !campusName.trim()) {
    res.status(400).json({ error: 'University name and campus name are required.' });
    return;
  }
  const db = getDb();
  const uniId = `uni-${Date.now().toString(36)}`;
  const campId = `camp-${Date.now().toString(36)}`;
  const createdUni: University = {
    id: uniId,
    name: name.trim(),
    shortName: (typeof shortName === 'string' && shortName.trim()) || name.trim().slice(0, 14),
    campuses: [
      {
        id: campId,
        name: campusName.trim(),
        city: (typeof city === 'string' && city.trim()) || 'India',
        hostels: ['Boys Hostel Block 1', 'Girls Hostel Block 1'],
        blocks: ['Block A', 'Block B'],
        deliveryFee: 19,
        freeDeliveryAbove: 299,
        dispatchWindow: '25–40 mins to Hostel Gate',
      },
    ],
  };

  db.universities.push(createdUni);
  db.products = db.products.map((p) => ({
    ...p,
    stockByCampus: { ...p.stockByCampus, [campId]: 20 },
  }));
  saveDb(db);
  res.status(201).json({ university: createdUni, universities: db.universities, products: db.products });
});

apiApp.post('/api/universities/:universityId/hostels', (req, res) => {
  const { hostelName } = req.body ?? {};
  if (typeof hostelName !== 'string' || !hostelName.trim()) {
    res.status(400).json({ error: 'Hostel name is required.' });
    return;
  }
  const db = getDb();
  db.universities = db.universities.map((u) =>
    u.id === req.params.universityId
      ? {
          ...u,
          campuses: u.campuses.map((c, idx) =>
            idx === 0 && !c.hostels.includes(hostelName.trim())
              ? { ...c, hostels: [...c.hostels, hostelName.trim()] }
              : c
          ),
        }
      : u
  );
  saveDb(db);
  res.json({ universities: db.universities });
});

apiApp.put('/api/universities', (req, res) => {
  const universities = req.body?.universities;
  if (!Array.isArray(universities)) {
    res.status(400).json({ error: 'Invalid universities payload.' });
    return;
  }
  const db = getDb();
  db.universities = universities;
  saveDb(db);
  res.json({ universities: db.universities });
});

// ---------------------------------------------------------------------------
// Cart, Wishlist, Addresses, Notifications & Campus Preference
// ---------------------------------------------------------------------------
apiApp.get('/api/cart', (req, res) => {
  const db = getDb();
  const { user } = resolveSessionUser(req, db);
  const clientKey = getClientKey(req, user);
  res.json({ cart: getScopedCart(db, clientKey) });
});

apiApp.put('/api/cart', (req, res) => {
  const cart = req.body?.cart;
  if (!Array.isArray(cart)) {
    res.status(400).json({ error: 'Invalid cart payload.' });
    return;
  }
  const db = getDb();
  const { user } = resolveSessionUser(req, db);
  const clientKey = getClientKey(req, user);
  db.carts[clientKey] = cart.filter(
    (item: CartItem) => item && typeof item.productId === 'string' && Number(item.quantity) > 0
  );
  saveDb(db);
  res.json({ cart: db.carts[clientKey] });
});

apiApp.get('/api/wishlist', (req, res) => {
  const db = getDb();
  const { user } = resolveSessionUser(req, db);
  const clientKey = getClientKey(req, user);
  res.json({ wishlist: getScopedWishlist(db, clientKey) });
});

apiApp.put('/api/wishlist', (req, res) => {
  const wishlist = req.body?.wishlist;
  if (!Array.isArray(wishlist)) {
    res.status(400).json({ error: 'Invalid wishlist payload.' });
    return;
  }
  const db = getDb();
  const { user } = resolveSessionUser(req, db);
  const clientKey = getClientKey(req, user);
  db.wishlists[clientKey] = wishlist.filter((id: unknown) => typeof id === 'string');
  saveDb(db);
  res.json({ wishlist: db.wishlists[clientKey] });
});

apiApp.put('/api/preferences/campus', (req, res) => {
  const { universityId, campusId } = req.body ?? {};
  if (typeof universityId !== 'string' || typeof campusId !== 'string') {
    res.status(400).json({ error: 'universityId and campusId are required.' });
    return;
  }
  const db = getDb();
  const { user } = resolveSessionUser(req, db);
  const clientKey = getClientKey(req, user);
  db.campusPreferences[clientKey] = { universityId, campusId };
  saveDb(db);
  res.json({ activeCampus: db.campusPreferences[clientKey] });
});

apiApp.get('/api/addresses', (req, res) => {
  const db = getDb();
  const { user } = resolveSessionUser(req, db);
  const clientKey = getClientKey(req, user);
  res.json({ addresses: getScopedAddresses(db, clientKey, user) });
});

apiApp.put('/api/addresses', (req, res) => {
  const addresses = req.body?.addresses;
  if (!Array.isArray(addresses)) {
    res.status(400).json({ error: 'Invalid addresses payload.' });
    return;
  }
  const db = getDb();
  const { user } = resolveSessionUser(req, db);
  const clientKey = getClientKey(req, user);
  db.addresses[clientKey] = addresses;
  if (user) db.addresses[user.uid] = addresses;
  saveDb(db);
  res.json({ addresses });
});

apiApp.get('/api/notifications', (_req, res) => {
  const db = getDb();
  res.json({ notifications: db.notifications });
});

apiApp.post('/api/notifications/read-all', (_req, res) => {
  const db = getDb();
  db.notifications = db.notifications.map((n) => ({ ...n, read: true }));
  saveDb(db);
  res.json({ notifications: db.notifications });
});

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------
apiApp.get('/api/coupons', (_req, res) => {
  const db = getDb();
  res.json({ coupons: db.coupons });
});

apiApp.post('/api/coupons/validate', (req, res) => {
  const { code, subtotal } = req.body ?? {};
  const db = getDb();
  const cleanCode = String(code || '').trim().toUpperCase();
  const found = db.coupons.find((c) => c.code.toUpperCase() === cleanCode && c.active);
  if (!found) {
    res.status(404).json({ error: 'Invalid or expired promo code.' });
    return;
  }
  const cartSubtotal = Number(subtotal) || 0;
  if (cartSubtotal < found.minCartValue) {
    res.status(400).json({ error: `Add ₹${found.minCartValue - cartSubtotal} more to use ${found.code}.` });
    return;
  }
  const discount =
    found.discountType === 'flat'
      ? found.discountValue
      : Math.min(
          found.maxDiscount ?? Number.MAX_SAFE_INTEGER,
          Math.round((cartSubtotal * found.discountValue) / 100)
        );
  res.json({ coupon: found, discount: Math.min(discount, cartSubtotal) });
});

apiApp.put('/api/coupons', (req, res) => {
  const coupons = req.body?.coupons;
  if (!Array.isArray(coupons)) {
    res.status(400).json({ error: 'Invalid coupons payload.' });
    return;
  }
  const db = getDb();
  db.coupons = coupons;
  saveDb(db);
  res.json({ coupons: db.coupons });
});

apiApp.post('/api/coupons', (req, res) => {
  const body = req.body ?? {};
  const cleanCode = String(body.code || '').trim().toUpperCase();
  if (!cleanCode) {
    res.status(400).json({ error: 'Coupon code is required.' });
    return;
  }
  const db = getDb();
  if (db.coupons.some((c) => c.code.toUpperCase() === cleanCode)) {
    res.status(409).json({ error: 'Coupon code already exists.' });
    return;
  }
  const discountType: Coupon['discountType'] = body.discountType === 'percent' ? 'percent' : 'flat';
  const discountValue = Math.max(1, Number(body.discountValue) || 20);
  const minCartValue = Math.max(0, Number(body.minCartValue) || 199);

  const created: Coupon = {
    code: cleanCode,
    description:
      body.description ||
      (discountType === 'flat'
        ? `Flat ₹${discountValue} off on orders above ₹${minCartValue}`
        : `${discountValue}% off on orders above ₹${minCartValue}`),
    discountType,
    discountValue,
    minCartValue,
    maxDiscount: discountType === 'percent' ? 150 : undefined,
    active: true,
  };
  db.coupons.unshift(created);
  saveDb(db);
  res.status(201).json({ coupon: created, coupons: db.coupons });
});

// ---------------------------------------------------------------------------
// Orders & Fulfillment Timeline
// ---------------------------------------------------------------------------
apiApp.get('/api/orders', (req, res) => {
  const db = getDb();
  const { user } = resolveSessionUser(req, db);
  if (req.query.mine === 'true' && user) {
    res.json({ orders: db.orders.filter((o) => o.userId === user.uid || o.userId === 'guest-student') });
    return;
  }
  res.json({ orders: db.orders });
});

apiApp.post('/api/orders', (req, res) => {
  const db = getDb();
  const { user } = resolveSessionUser(req, db);
  const clientKey = getClientKey(req, user);
  const body = req.body ?? {};

  const itemsInput: { productId: string; quantity: number }[] = Array.isArray(body.items) ? body.items : [];
  if (itemsInput.length === 0) {
    res.status(400).json({ error: 'Cannot place an order with an empty cart.' });
    return;
  }

  const university = db.universities.find((u) => u.id === body.universityId) ?? db.universities[0];
  const campus = university.campuses.find((c) => c.id === body.campusId) ?? university.campuses[0];

  const pricing = computeOrderAmounts(db, itemsInput, campus.id, body.couponCode);
  if (pricing.resolvedItems.length === 0) {
    res.status(400).json({ error: 'No valid products found in order.' });
    return;
  }

  const paymentStatus: PaymentState = body.paymentStatus === 'success' ? 'success' : 'pending';
  const paymentMethod: PaymentMethod = body.paymentMethod || 'Campus UPI Demo';
  const status: OrderStatus = paymentStatus === 'success' ? 'Confirmed' : 'Pending';
  const orderId = body.id || `UNI-2604-${Math.floor(1000 + Math.random() * 9000)}`;

  const createdOrder: Order = {
    id: orderId,
    userId: user?.uid || body.userId || 'guest-student',
    studentName: String(body.studentName || user?.name || 'Hostel Student').trim(),
    phone: String(body.phone || user?.mobile || '').trim(),
    universityId: university.id,
    universityName: university.name,
    campusId: campus.id,
    campusName: campus.name,
    hostel: String(body.hostel || campus.hostels[0] || ''),
    block: String(body.block || campus.blocks[0] || 'Block A'),
    roomNumber: String(body.roomNumber || '').trim(),
    deliveryInstructions:
      String(body.deliveryInstructions || '').trim() || 'Call upon arrival at hostel gate',
    items: pricing.resolvedItems,
    subtotal: pricing.subtotal,
    discount: pricing.discount,
    couponCode: pricing.appliedCoupon,
    deliveryFee: pricing.deliveryFee,
    total: pricing.total,
    paymentMethod,
    paymentStatus,
    status,
    createdAt: new Date().toISOString(),
    timeline: buildOrderTimeline(status, campus.name),
  };

  // Atomic stock deduction on backend DB
  db.products = db.products.map((prod) => {
    const orderedItem = createdOrder.items.find((i) => i.productId === prod.id);
    if (!orderedItem) return prod;
    const currentStock = prod.stockByCampus[campus.id] ?? 0;
    return {
      ...prod,
      stockByCampus: {
        ...prod.stockByCampus,
        [campus.id]: Math.max(0, currentStock - orderedItem.quantity),
      },
    };
  });

  db.orders.unshift(createdOrder);
  db.carts[clientKey] = [];
  db.notifications.unshift({
    id: `notif-${Date.now().toString(36)}`,
    title: `Order ${createdOrder.id} ${createdOrder.paymentStatus === 'success' ? 'Confirmed' : 'Logged (Pending)'}`,
    message: `Delivery to ${createdOrder.hostel}, ${createdOrder.block} Room ${createdOrder.roomNumber}.`,
    timestamp: 'Just now',
    read: false,
    type: 'order',
  });

  saveDb(db);
  res.status(201).json({
    order: createdOrder,
    products: db.products,
    notifications: db.notifications,
  });
});

apiApp.patch('/api/orders/:id', (req, res) => {
  const db = getDb();
  const idx = db.orders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const existing = db.orders[idx];
  const nextStatus: OrderStatus = req.body?.status || existing.status;
  const nextPaymentStatus: PaymentState = req.body?.paymentStatus || existing.paymentStatus;

  const updated: Order = {
    ...existing,
    status: nextStatus,
    paymentStatus: nextPaymentStatus,
    timeline: buildOrderTimeline(nextStatus, existing.campusName),
  };
  db.orders[idx] = updated;
  saveDb(db);
  res.json({ order: updated });
});

// ---------------------------------------------------------------------------
// Admin Analytics, Customers, CSV Reports & Reset
// ---------------------------------------------------------------------------
apiApp.get('/api/admin/overview', (req, res) => {
  const db = getDb();
  const campusScope = typeof req.query.campusId === 'string' ? req.query.campusId : 'all';
  const scopedOrders =
    campusScope === 'all' ? db.orders : db.orders.filter((o) => o.campusId === campusScope);

  const totalRevenue = scopedOrders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const categoryRevenue: Record<string, number> = {};
  for (const o of scopedOrders) {
    if (o.status === 'Cancelled') continue;
    for (const item of o.items) {
      categoryRevenue[item.category] = (categoryRevenue[item.category] || 0) + item.price * item.quantity;
    }
  }

  res.json({
    totalRevenue,
    orderCount: scopedOrders.length,
    deliveredCount: scopedOrders.filter((o) => o.status === 'Delivered').length,
    avgOrderValue: scopedOrders.length > 0 ? Math.round(totalRevenue / scopedOrders.length) : 0,
    categoryRevenue,
    students: db.users.filter((u) => u.role === 'student').map(sanitizeUser),
  });
});

apiApp.get('/api/admin/customers', (_req, res) => {
  const db = getDb();
  res.json({
    students: db.users.filter((u) => u.role === 'student').map(sanitizeUser),
  });
});

apiApp.get('/api/admin/reports/:type', (req, res) => {
  const db = getDb();
  const campusScope = typeof req.query.campusId === 'string' ? req.query.campusId : 'all';
  const type = req.params.type;

  if (type === 'orders.csv') {
    const scopedOrders =
      campusScope === 'all' ? db.orders : db.orders.filter((o) => o.campusId === campusScope);
    const csv = toCsv(
      ['Order ID', 'Student', 'Phone', 'University', 'Campus', 'Hostel', 'Room', 'Total INR', 'Payment Status', 'Order Status'],
      scopedOrders.map((o) => [
        o.id,
        o.studentName,
        o.phone,
        o.universityName,
        o.campusName,
        o.hostel,
        o.roomNumber,
        o.total,
        o.paymentStatus,
        o.status,
      ])
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="unimart-orders-report.csv"');
    res.send(csv);
    return;
  }

  if (type === 'inventory.csv') {
    const allCampuses = db.universities.flatMap((u) =>
      u.campuses.map((c) => ({ ...c, uniName: u.shortName }))
    );
    const csv = toCsv(
      ['SKU', 'Name', 'Category', 'Price INR', 'MRP INR', ...allCampuses.map((c) => `${c.uniName} - ${c.name}`)],
      db.products.map((p) => [
        p.sku,
        p.name,
        p.category,
        p.price,
        p.mrp,
        ...allCampuses.map((c) => p.stockByCampus[c.id] ?? 0),
      ])
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="unimart-inventory-report.csv"');
    res.send(csv);
    return;
  }

  if (type === 'students.csv') {
    const students = db.users.filter((u) => u.role === 'student').map(sanitizeUser);
    const csv = toCsv(
      ['UID', 'Name', 'Email', 'Mobile', 'University ID', 'Campus ID', 'Hostel', 'Room'],
      students.map((s) => [s.uid, s.name, s.email, s.mobile, s.universityId, s.campusId, s.hostel, s.roomNumber])
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="unimart-students-report.csv"');
    res.send(csv);
    return;
  }

  res.status(404).json({ error: 'Unknown report type.' });
});

apiApp.post('/api/admin/reset', (_req, res) => {
  const db = resetDb();
  res.json({
    ok: true,
    universities: db.universities,
    products: db.products,
    orders: db.orders,
    coupons: db.coupons,
    addresses: db.addresses.default ?? [],
    notifications: db.notifications,
    wishlist: db.wishlists.default ?? [],
    students: db.users.filter((u) => u.role === 'student').map(sanitizeUser),
  });
});

apiApp.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});
