import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  FolderKanban,
  Link2,
  Package,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import { CATEGORIES, INITIAL_PRODUCTS } from '../data/products';
import { authService, storeService } from '../services/firebaseReady';
import type { StudentUser } from '../types';
import {
  CategoryId,
  Coupon,
  Order,
  OrderStatus,
  PaymentState,
  Product,
  University,
} from '../types';
import { ResilientImage } from './ResilientImage';

export type AdminSection =
  | 'analytics'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'coupons'
  | 'universities'
  | 'reports';

interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  universities: University[];
  coupons: Coupon[];
  initialSection?: AdminSection;
  highlightedOrderId?: string | null;
  cloudCustomers?: StudentUser[];
  cloudOrdersCount?: number;
  cloudAdminEmail?: string | null;
  onConnectCloudAdmin?: () => void;
  onSignOut?: () => void;
  onSectionChange?: (section: AdminSection, orderId?: string | null) => void;
  onSaveProducts: (products: Product[]) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, paymentStatus?: PaymentState) => void;
  onSaveCoupons: (coupons: Coupon[]) => void;
  onSaveUniversities: (universities: University[]) => void;
  onResetDemoData: () => void;
}

export function AdminDashboard({
  products,
  orders,
  universities,
  coupons,
  initialSection = 'analytics',
  highlightedOrderId = null,
  cloudCustomers = [],
  cloudOrdersCount = 0,
  cloudAdminEmail = null,
  onConnectCloudAdmin,
  onSignOut,
  onSectionChange,
  onSaveProducts,
  onUpdateOrderStatus,
  onSaveCoupons,
  onSaveUniversities,
  onResetDemoData,
}: AdminDashboardProps) {
  const [section, setSection] = useState<AdminSection>(initialSection);
  const [campusScope, setCampusScope] = useState<string>('all');
  const [productQuery, setProductQuery] = useState('');
  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(highlightedOrderId);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (highlightedOrderId) {
      setSection('orders');
      setExpandedOrderId(highlightedOrderId);
    }
  }, [highlightedOrderId]);

  const handleSelectSection = (next: AdminSection) => {
    setSection(next);
    onSectionChange?.(next, next === 'orders' ? expandedOrderId : null);
  };

  const copyLink = async (path: string, key: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(key);
      setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 2200);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = fullUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopiedId(key);
        setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 2200);
      } catch {
        // Ignore if clipboard blocked
      }
    }
  };

  // Add Product form state
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState<CategoryId>('Snacks');
  const [newPrice, setNewPrice] = useState('99');
  const [newMrp, setNewMrp] = useState('120');
  const [newUnit, setNewUnit] = useState('1 Pack');
  const [newDesc, setNewDesc] = useState('');

  // Add Coupon form state
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'flat' | 'percent'>('flat');
  const [couponValue, setCouponValue] = useState('40');
  const [couponMin, setCouponMin] = useState('250');

  // Add Hostel to University form
  const [targetUniId, setTargetUniId] = useState(universities[0]?.id || '');
  const [newHostelName, setNewHostelName] = useState('');

  // Add University form
  const [newUniName, setNewUniName] = useState('');
  const [newUniShort, setNewUniShort] = useState('');
  const [newCampusName, setNewCampusName] = useState('');
  const [newCampusCity, setNewCampusCity] = useState('');

  const allCampuses = useMemo(
    () =>
      universities.flatMap((u) =>
        u.campuses.map((c) => ({ ...c, uniName: u.shortName, uniId: u.id }))
      ),
    [universities]
  );

  const scopedOrders = useMemo(
    () =>
      campusScope === 'all'
        ? orders
        : orders.filter((o) => o.campusId === campusScope),
    [orders, campusScope]
  );

  const [students, setStudents] = useState<StudentUser[]>(() => authService.getUsers());

  useEffect(() => {
    let active = true;
    const loadStudents = () => {
      storeService
        .fetchCustomers()
        .then((list) => {
          if (active) setStudents(list);
        })
        .catch(() => {
          // fallback to cached list
        });
    };
    loadStudents();
    const timer = setInterval(loadStudents, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [orders.length]);

  const allCustomers = useMemo(() => {
    const byKey = new Map<string, StudentUser>();
    const addCustomer = (stu: StudentUser) => {
      if (stu.role === 'admin') return;
      const key =
        stu.uid && stu.uid !== 'guest-student'
          ? `uid:${stu.uid}`
          : `contact:${stu.mobile || stu.email || stu.name.toLowerCase()}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, stu);
      } else {
        byKey.set(key, {
          ...existing,
          ...stu,
          name: stu.name || existing.name,
          email: stu.email || existing.email,
          mobile: stu.mobile || existing.mobile,
          hostel: stu.hostel || existing.hostel,
          roomNumber: stu.roomNumber || existing.roomNumber,
        });
      }
    };

    for (const s of students) addCustomer(s);
    for (const c of cloudCustomers) addCustomer(c);
    for (const o of orders) {
      const uid = o.userId && o.userId !== 'guest-student' ? o.userId : '';
      const key = uid
        ? `uid:${uid}`
        : `contact:${o.phone || o.studentName.toLowerCase()}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          uid: uid || `order-${o.phone || o.id}`,
          name: o.studentName || 'Campus Student',
          email: '',
          mobile: o.phone || '',
          universityId: o.universityId,
          campusId: o.campusId,
          hostel: o.hostel,
          roomNumber: o.roomNumber,
          role: 'student',
          createdAt: o.createdAt,
        });
      }
    }

    return Array.from(byKey.values());
  }, [students, cloudCustomers, orders]);

  const totalRevenue = scopedOrders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const avgOrderValue =
    scopedOrders.length > 0 ? Math.round(totalRevenue / scopedOrders.length) : 0;

  const categoryRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of scopedOrders) {
      if (o.status === 'Cancelled') continue;
      for (const item of o.items ?? []) {
        map[item.category] = (map[item.category] || 0) + item.price * item.quantity;
      }
    }
    return Object.entries(map)
      .map(([cat, rev]) => ({ cat, rev }))
      .sort((a, b) => b.rev - a.rev);
  }, [scopedOrders]);

  const maxCatRev = Math.max(1, ...categoryRevenue.map((c) => c.rev));

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(productQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(productQuery.toLowerCase())
  );

  const handleStockChange = (productId: string, campusId: string, nextStock: number) => {
    const cleanVal = Math.max(0, nextStock);
    onSaveProducts(
      products.map((p) =>
        p.id === productId
          ? { ...p, stockByCampus: { ...p.stockByCampus, [campusId]: cleanVal } }
          : p
      )
    );
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice) return;
    const stockMap: Record<string, number> = {};
    for (const c of allCampuses) stockMap[c.id] = 25;

    const fallbackImg =
      INITIAL_PRODUCTS.find((p) => p.category === newCategory)?.image ||
      INITIAL_PRODUCTS[0].image;

    const created: Product = {
      id: `prod-${Date.now().toString(36)}`,
      sku: `UNI-ADM-${Math.floor(100 + Math.random() * 899)}`,
      name: newName.trim(),
      brand: newBrand.trim() || 'UNIMART Select',
      category: newCategory,
      price: Math.max(1, Number(newPrice)),
      mrp: Math.max(Number(newPrice), Number(newMrp) || Number(newPrice)),
      rating: 4.7,
      reviewCount: 12,
      unitLabel: newUnit.trim() || '1 Unit',
      description:
        newDesc.trim() ||
        'Added via UNIMART Campus Admin Console for hostel resident delivery.',
      highlights: ['Campus hub verified stock', 'Fast hostel gate delivery'],
      image: fallbackImg,
      stockByCampus: stockMap,
      isTrending: true,
    };

    onSaveProducts([created, ...products]);
    setNewName('');
    setNewBrand('');
    setNewDesc('');
    setShowAddProduct(false);
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode || coupons.some((c) => c.code === cleanCode)) return;
    const next: Coupon = {
      code: cleanCode,
      description:
        couponType === 'flat'
          ? `Flat ₹${couponValue} off on orders above ₹${couponMin}`
          : `${couponValue}% off on orders above ₹${couponMin}`,
      discountType: couponType,
      discountValue: Number(couponValue) || 20,
      minCartValue: Number(couponMin) || 199,
      maxDiscount: couponType === 'percent' ? 150 : undefined,
      active: true,
    };
    onSaveCoupons([next, ...coupons]);
    setCouponCode('');
  };

  const handleAddHostel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostelName.trim()) return;
    onSaveUniversities(
      universities.map((u) =>
        u.id === targetUniId
          ? {
              ...u,
              campuses: u.campuses.map((c, idx) =>
                idx === 0
                  ? { ...c, hostels: [...c.hostels, newHostelName.trim()] }
                  : c
              ),
            }
          : u
      )
    );
    setNewHostelName('');
  };

  const handleAddUniversity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUniName.trim() || !newCampusName.trim()) return;
    const uniId = `uni-${Date.now().toString(36)}`;
    const campId = `camp-${Date.now().toString(36)}`;
    const createdUni: University = {
      id: uniId,
      name: newUniName.trim(),
      shortName: newUniShort.trim() || newUniName.trim().slice(0, 14),
      campuses: [
        {
          id: campId,
          name: newCampusName.trim(),
          city: newCampusCity.trim() || 'India',
          hostels: ['Boys Hostel Block 1', 'Girls Hostel Block 1'],
          blocks: ['Block A', 'Block B'],
          deliveryFee: 19,
          freeDeliveryAbove: 299,
          dispatchWindow: '25–40 mins to Hostel Gate',
        },
      ],
    };
    onSaveUniversities([...universities, createdUni]);
    // Seed campus stock across existing products
    onSaveProducts(
      products.map((p) => ({
        ...p,
        stockByCampus: { ...p.stockByCampus, [campId]: 20 },
      }))
    );
    setNewUniName('');
    setNewUniShort('');
    setNewCampusName('');
    setNewCampusCity('');
  };

  const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const escapeCell = (val: string | number) => {
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };
    const csvContent = [
      headers.map(escapeCell).join(','),
      ...rows.map((r) => r.map(escapeCell).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const navItems: { id: AdminSection; label: string; icon: typeof BarChart3 }[] = [
    { id: 'analytics', label: 'Sales Analytics', icon: BarChart3 },
    { id: 'products', label: 'Products & Inventory', icon: Package },
    { id: 'categories', label: 'Categories', icon: FolderKanban },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'universities', label: 'Universities', icon: Building2 },
    { id: 'reports', label: 'CSV Reports', icon: FileSpreadsheet },
  ];

  const activeCampusObj =
    campusScope === 'all'
      ? allCampuses[0]
      : allCampuses.find((c) => c.id === campusScope) ?? allCampuses[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0 space-y-4">
          <div className="bg-[#0F294A] text-white rounded-2xl p-5">
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#4ADE80] font-semibold">
              UNIMART Ops Console
            </p>
            <h1 className="font-display font-bold text-xl mt-1">Admin Dashboard</h1>
            <div className="mt-4">
              <label className="block text-[11px] text-[#CBD5E1] mb-1">
                Campus Scope Filter
              </label>
              <select
                value={campusScope}
                onChange={(e) => setCampusScope(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-[#1A3A63] border border-white/15 text-xs text-white focus:outline-none"
              >
                <option value="all">All Universities ({allCampuses.length} hubs)</option>
                {allCampuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.uniName} · {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void copyLink('/admin/orders', 'admin-root')}
              className="mt-3 w-full h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedId === 'admin-root' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                  Copied /admin/orders Link
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5 text-[#4ADE80]" />
                  Copy Direct Admin Orders Link
                </>
              )}
            </button>
          </div>

          <nav className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-2 flex lg:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectSection(item.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#0F294A] text-white'
                      : 'text-[#233B57] hover:bg-[#F3EFE6]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Admin Workspace */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Cloud Sync Banner */}
          {cloudAdminEmail ? (
            <div className="bg-[#EAF6EE] border border-[#B7DFC4] rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#14532D]">
                <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                <span>
                  <strong>Live Cloud Sync Active</strong> ({cloudAdminEmail}) · Orders and student names from all friends’ devices sync here automatically.
                </span>
              </div>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="px-3 py-1.5 rounded-lg bg-[#FFFDF9] border border-[#B7DFC4] text-[#0F294A] font-semibold hover:bg-white"
                >
                  Sign Out
                </button>
              )}
            </div>
          ) : (
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-[#78350F]">
                <strong>Connect Admin Google Account (isha.0251mba110@dgu.ac.in)</strong> to view live orders and student names placed from friends’ phones, Shared URL, and Vercel.
              </span>
              {onConnectCloudAdmin && (
                <button
                  type="button"
                  onClick={onConnectCloudAdmin}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0F294A] hover:bg-[#1A3A63] text-white font-semibold shrink-0"
                >
                  Sign In with Google as Admin
                </button>
              )}
            </div>
          )}

          {/* 1. ANALYTICS */}
          {section === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-5">
                  <p className="text-xs text-[#5C6F85]">Gross Campus Revenue</p>
                  <p className="font-mono font-bold text-2xl text-[#0F294A] mt-1 tabular-nums">
                    ₹{totalRevenue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-[#15803D] mt-1">Active campus orders</p>
                </div>
                <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-5">
                  <p className="text-xs text-[#5C6F85]">Total Orders</p>
                  <p className="font-mono font-bold text-2xl text-[#0F294A] mt-1 tabular-nums">
                    {scopedOrders.length}
                  </p>
                  <p className="text-[11px] text-[#5C6F85] mt-1">
                    {scopedOrders.filter((o) => o.status === 'Delivered').length} delivered
                  </p>
                </div>
                <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-5">
                  <p className="text-xs text-[#5C6F85]">Avg Order Value</p>
                  <p className="font-mono font-bold text-2xl text-[#0F294A] mt-1 tabular-nums">
                    ₹{avgOrderValue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-[#5C6F85] mt-1">Per hostel checkout</p>
                </div>
                <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-5">
                  <p className="text-xs text-[#5C6F85]">Active SKUs & Students</p>
                  <p className="font-mono font-bold text-2xl text-[#0F294A] mt-1 tabular-nums">
                    {products.length} / {allCustomers.length}
                  </p>
                  <p className="text-[11px] text-[#5C6F85] mt-1">
                    Across {universities.length} universities
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-5 space-y-4">
                  <h2 className="font-display font-bold text-base text-[#0F294A]">
                    Revenue by Category
                  </h2>
                  {categoryRevenue.length === 0 ? (
                    <p className="text-xs text-[#5C6F85]">No revenue data for selected campus yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {categoryRevenue.map((item) => (
                        <div key={item.cat} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-[#0F294A]">{item.cat}</span>
                            <span className="font-mono text-[#15803D] tabular-nums">
                              ₹{item.rev.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[#F3EFE6] overflow-hidden">
                            <div
                              className="h-full bg-[#0F294A] rounded-full"
                              style={{ width: `${Math.max(8, (item.rev / maxCatRev) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-5 space-y-4">
                  <h2 className="font-display font-bold text-base text-[#0F294A]">
                    Campus Hub Performance
                  </h2>
                  <div className="space-y-3">
                    {allCampuses.map((camp) => {
                      const campOrders = orders.filter((o) => o.campusId === camp.id);
                      const campRev = campOrders.reduce((s, o) => s + o.total, 0);
                      return (
                        <div
                          key={camp.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9]"
                        >
                          <div>
                            <p className="text-xs font-semibold text-[#0F294A]">
                              {camp.uniName} · {camp.name}
                            </p>
                            <p className="text-[11px] text-[#5C6F85]">
                              {camp.hostels.length} hostels · {campOrders.length} orders
                            </p>
                          </div>
                          <span className="font-mono font-bold text-sm text-[#15803D] tabular-nums">
                            ₹{campRev.toLocaleString('en-IN')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PRODUCTS & INVENTORY */}
          {section === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display font-bold text-xl text-[#0F294A]">
                  Products & Per-Campus Inventory ({activeCampusObj?.name})
                </h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#5C6F85] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                      placeholder="Filter SKU or name..."
                      className="h-9 pl-8 pr-3 rounded-lg bg-[#FFFDF9] border border-[#E5DEC9] text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddProduct((v) => !v)}
                    className="h-9 px-3.5 rounded-lg bg-[#15803D] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Product
                  </button>
                </div>
              </div>

              {showAddProduct && (
                <form
                  onSubmit={handleCreateProduct}
                  className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Product Name *"
                    className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs sm:col-span-2"
                  />
                  <input
                    type="text"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="Brand"
                    className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
                  />
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as CategoryId)}
                    className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="Sale Price (₹)"
                    className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-mono"
                  />
                  <input
                    type="number"
                    value={newMrp}
                    onChange={(e) => setNewMrp(e.target.value)}
                    placeholder="MRP (₹)"
                    className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-mono"
                  />
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="Unit (e.g. 500g Pack)"
                    className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
                  />
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Short hostel description"
                    className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs sm:col-span-2"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-3 h-10 rounded-xl bg-[#0F294A] text-white text-xs font-semibold"
                  >
                    Publish Product to All Campus Catalogues
                  </button>
                </form>
              )}

              <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F3EFE6] text-[#5C6F85] font-mono uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Price / MRP</th>
                      <th className="py-3 px-3">
                        Stock ({activeCampusObj?.uniName})
                      </th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAE0]">
                    {filteredProducts.map((p) => {
                      const stockVal = p.stockByCampus?.[activeCampusObj?.id || ''] ?? 0;
                      return (
                        <tr key={p.id} className="hover:bg-[#FAF8F3]">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <ResilientImage
                                src={p.image}
                                alt={p.name}
                                className="w-10 h-10 rounded-lg object-cover border border-[#E5DEC9] shrink-0"
                              />
                              <div>
                                <p className="font-semibold text-[#0F294A] line-clamp-1 max-w-[230px]">
                                  {p.name}
                                </p>
                                <p className="font-mono text-[10px] text-[#5C6F85]">{p.sku}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#233B57]">{p.category}</td>
                          <td className="py-3 px-3 font-mono tabular-nums">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[#5C6F85]">₹</span>
                              <input
                                type="number"
                                min={1}
                                aria-label={`Edit price for ${p.name}`}
                                value={p.price}
                                onChange={(e) => {
                                  const nextPrice = Math.max(1, Number(e.target.value));
                                  onSaveProducts(
                                    products.map((item) =>
                                      item.id === p.id ? { ...item, price: nextPrice } : item
                                    )
                                  );
                                }}
                                className="w-16 h-8 px-1.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] font-mono text-xs font-bold text-[#0F294A] tabular-nums"
                              />
                              <span className="text-[#8A98A9] line-through">₹{p.mrp}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min={0}
                              value={stockVal}
                              onChange={(e) =>
                                handleStockChange(
                                  p.id,
                                  activeCampusObj?.id || '',
                                  Number(e.target.value)
                                )
                              }
                              className="w-20 h-8 px-2 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] font-mono text-xs tabular-nums"
                            />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                onSaveProducts(products.filter((item) => item.id !== p.id))
                              }
                              className="text-[#8A98A9] hover:text-[#B91C1C] p-1"
                              aria-label={`Delete ${p.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. CATEGORIES */}
          {section === 'categories' && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-xl text-[#0F294A]">
                10 Campus Store Categories
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CATEGORIES.map((cat) => {
                  const catItems = products.filter((p) => p.category === cat.id);
                  const totalUnits = catItems.reduce(
                    (s, p) =>
                      s +
                      Object.values(p.stockByCampus ?? {}).reduce((a, b) => a + b, 0),
                    0
                  );
                  return (
                    <div
                      key={cat.id}
                      className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-display font-bold text-sm text-[#0F294A]">
                          {cat.id}
                        </h3>
                        <p className="text-xs text-[#5C6F85]">{cat.subtitle}</p>
                      </div>
                      <div className="text-right font-mono text-xs">
                        <p className="font-bold text-[#0F294A]">{catItems.length} SKUs</p>
                        <p className="text-[#15803D]">{totalUnits} total stock</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. ORDERS */}
          {section === 'orders' && (() => {
            const q = orderQuery.trim().toLowerCase();
            const visibleOrders = scopedOrders.filter((o) => {
              const matchesStatus =
                orderStatusFilter === 'All' || o.status === orderStatusFilter;
              const matchesQuery =
                !q ||
                (o.id ?? '').toLowerCase().includes(q) ||
                (o.studentName ?? '').toLowerCase().includes(q) ||
                (o.phone ?? '').toLowerCase().includes(q) ||
                (o.hostel ?? '').toLowerCase().includes(q) ||
                (o.roomNumber ?? '').toLowerCase().includes(q);
              return matchesStatus && matchesQuery;
            });

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display font-bold text-xl text-[#0F294A]">
                      Campus Orders Management ({visibleOrders.length})
                    </h2>
                    <p className="text-xs text-[#5C6F85]">
                      {cloudAdminEmail
                        ? `${cloudOrdersCount} live cloud order${cloudOrdersCount === 1 ? '' : 's'} synced from friends + ${Math.max(0, orders.length - cloudOrdersCount)} initial demo order${orders.length - cloudOrdersCount === 1 ? '' : 's'}.`
                        : 'Showing initial demo orders only until you sign in with Google as Admin above.'}{' '}
                      Direct link: <span className="font-mono text-[#0F294A]">/admin/orders</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#5C6F85] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={orderQuery}
                        onChange={(e) => setOrderQuery(e.target.value)}
                        placeholder="Search Order ID, student, hostel..."
                        className="h-9 pl-8 pr-3 rounded-lg bg-[#FFFDF9] border border-[#E5DEC9] text-xs w-56"
                      />
                    </div>
                    <select
                      aria-label="Filter orders by status"
                      value={orderStatusFilter}
                      onChange={(e) =>
                        setOrderStatusFilter(e.target.value as OrderStatus | 'All')
                      }
                      className="h-9 px-3 rounded-lg bg-[#FFFDF9] border border-[#E5DEC9] text-xs font-semibold text-[#0F294A]"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Packed">Packed</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {highlightedOrderId && (
                  <div className="bg-[#EAF6EE] border border-[#B7DFC4] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-[#0F294A] font-medium">
                      Direct link active for order{' '}
                      <strong className="font-mono">{highlightedOrderId}</strong>
                      {!orders.some((o) => o.id === highlightedOrderId) &&
                        ' (checking live orders...)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedOrderId(null);
                        onSectionChange?.('orders', null);
                      }}
                      className="px-3 py-1 rounded-lg bg-[#FFFDF9] border border-[#B7DFC4] text-[#0F294A] font-semibold hover:bg-white"
                    >
                      Show All Orders
                    </button>
                  </div>
                )}

                {visibleOrders.length === 0 ? (
                  <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-8 text-center">
                    <ShoppingCart className="w-8 h-8 text-[#8A98A9] mx-auto mb-2 stroke-[1.5]" />
                    <p className="font-display font-semibold text-sm text-[#0F294A]">
                      No matching orders found
                    </p>
                    <p className="text-xs text-[#5C6F85] mt-1">
                      Clear the order search or status filter to view all campus orders.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleOrders.map((order) => {
                      const isExpanded = expandedOrderId === order.id;
                      const isHighlighted = highlightedOrderId === order.id;
                      const orderPath = `/admin/orders/${order.id}`;

                      return (
                        <div
                          key={order.id}
                          className={`bg-[#FFFDF9] border rounded-xl overflow-hidden transition-colors ${
                            isHighlighted
                              ? 'border-[#15803D] ring-2 ring-[#15803D]/20'
                              : 'border-[#E5DEC9]'
                          }`}
                        >
                          <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextId = isExpanded ? null : order.id;
                                    setExpandedOrderId(nextId);
                                    onSectionChange?.('orders', nextId);
                                  }}
                                  className="font-mono font-bold text-sm text-[#0F294A] hover:text-[#15803D] underline decoration-[#E5DEC9] underline-offset-4"
                                >
                                  {order.id}
                                </button>
                                <span
                                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                                    order.status === 'Delivered'
                                      ? 'bg-[#EAF6EE] text-[#15803D]'
                                      : order.status === 'Cancelled'
                                      ? 'bg-[#FEF2F2] text-[#B91C1C]'
                                      : 'bg-[#FEF3C7] text-[#B45309]'
                                  }`}
                                >
                                  {order.status}
                                </span>
                                <span className="text-xs text-[#5C6F85]">
                                  · {order.studentName} ({order.phone})
                                </span>
                              </div>
                              <p className="text-xs text-[#5C6F85]">
                                {order.universityName} · {order.campusName} · {order.hostel} ({order.block}, Room {order.roomNumber})
                              </p>
                              <p className="font-mono text-xs font-semibold text-[#15803D]">
                                ₹{order.total.toLocaleString('en-IN')} · {(order.items ?? []).length} items · {order.paymentMethod} ({order.paymentStatus})
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {order.paymentStatus === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateOrderStatus(order.id, 'Confirmed', 'success')
                                  }
                                  className="h-9 px-3 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold"
                                >
                                  Mark Paid
                                </button>
                              )}

                              <select
                                aria-label={`Update status for ${order.id}`}
                                value={order.status}
                                onChange={(e) =>
                                  onUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                                }
                                className="h-9 px-3 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-semibold text-[#0F294A]"
                              >
                                {(
                                  [
                                    'Pending',
                                    'Confirmed',
                                    'Packed',
                                    'Out for Delivery',
                                    'Delivered',
                                    'Cancelled',
                                  ] as OrderStatus[]
                                ).map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => void copyLink(orderPath, order.id)}
                                className="h-9 px-2.5 rounded-lg border border-[#E5DEC9] text-xs font-semibold text-[#0F294A] hover:bg-[#F3EFE6] inline-flex items-center gap-1"
                                title={`Copy link ${orderPath}`}
                              >
                                {copiedId === order.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-[#15803D]" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Link
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const nextId = isExpanded ? null : order.id;
                                  setExpandedOrderId(nextId);
                                  onSectionChange?.('orders', nextId);
                                }}
                                className="h-9 px-3 rounded-lg bg-[#0F294A] hover:bg-[#1A3A63] text-white text-xs font-semibold inline-flex items-center gap-1"
                              >
                                Details
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-[#F0EAE0] bg-[#FAF8F3] p-4 space-y-4">
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                {/* Ordered Items */}
                                <div className="lg:col-span-7 space-y-2">
                                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#5C6F85] font-semibold">
                                    Ordered Items ({(order.items ?? []).length})
                                  </p>
                                  <div className="space-y-2">
                                    {(order.items ?? []).map((item) => (
                                      <div
                                        key={item.productId}
                                        className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-2.5 flex items-center justify-between gap-3"
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          <ResilientImage
                                            src={item.image}
                                            alt={item.name}
                                            className="w-10 h-10 rounded-lg object-cover border border-[#E5DEC9] shrink-0"
                                          />
                                          <div className="min-w-0">
                                            <p className="text-xs font-semibold text-[#0F294A] truncate">
                                              {item.name}
                                            </p>
                                            <p className="font-mono text-[11px] text-[#5C6F85]">
                                              {item.quantity} × ₹{item.price} · {item.category}
                                            </p>
                                          </div>
                                        </div>
                                        <span className="font-mono font-bold text-xs text-[#0F294A] tabular-nums shrink-0">
                                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Delivery & Billing Summary */}
                                <div className="lg:col-span-5 bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-3.5 space-y-2.5 text-xs">
                                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#5C6F85] font-semibold">
                                    Delivery &amp; Bill Summary
                                  </p>
                                  <div className="text-[#233B57] space-y-1">
                                    <p>
                                      <strong className="text-[#0F294A]">Note:</strong>{' '}
                                      {order.deliveryInstructions || 'Standard hostel gate handover'}
                                    </p>
                                    <p>
                                      <strong className="text-[#0F294A]">Placed:</strong>{' '}
                                      {new Date(order.createdAt).toLocaleString()}
                                    </p>
                                    <p className="font-mono text-[11px] text-[#5C6F85]">
                                      Link: {orderPath}
                                    </p>
                                  </div>
                                  <div className="pt-2 border-t border-[#F0EAE0] space-y-1 font-mono tabular-nums">
                                    <div className="flex justify-between">
                                      <span className="text-[#5C6F85]">Subtotal</span>
                                      <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
                                    </div>
                                    {order.discount > 0 && (
                                      <div className="flex justify-between text-[#15803D]">
                                        <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                                        <span>-₹{order.discount.toLocaleString('en-IN')}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-[#5C6F85]">Delivery</span>
                                      <span>{order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-[#0F294A] pt-1 border-t border-[#F0EAE0]">
                                      <span>Total</span>
                                      <span>₹{order.total.toLocaleString('en-IN')}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 5-Step Status Timeline */}
                              <div>
                                <p className="text-[11px] font-mono uppercase tracking-wider text-[#5C6F85] font-semibold mb-2">
                                  Fulfillment Timeline
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                                  {(order.timeline ?? []).map((step, idx) => (
                                    <div
                                      key={idx}
                                      className={`p-2.5 rounded-xl border text-xs ${
                                        step.completed
                                          ? 'bg-[#EAF6EE] border-[#B7DFC4] text-[#0F294A]'
                                          : 'bg-[#FFFDF9] border-[#E5DEC9] text-[#8A98A9]'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 font-semibold">
                                        {step.completed ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
                                        ) : (
                                          <Clock className="w-3.5 h-3.5 shrink-0" />
                                        )}
                                        <span className="truncate">{step.label}</span>
                                      </div>
                                      <p className="text-[10px] font-mono mt-1">{step.timestamp}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 5. CUSTOMERS */}
          {section === 'customers' && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display font-bold text-xl text-[#0F294A]">
                  Students &amp; Ordering Customers ({allCustomers.length})
                </h2>
                <p className="text-xs text-[#5C6F85] mt-0.5">
                  {cloudAdminEmail
                    ? `${cloudCustomers.length} live cloud customer${cloudCustomers.length === 1 ? '' : 's'} synced + ${students.length} initial demo accounts. Friends appear here automatically as soon as they sign in with Google or place an order after connecting Google.`
                    : 'Showing the 3 initial demo accounts. Sign in with Google as Admin above to see live friends who sign in and order.'}
                </p>
              </div>
              <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F3EFE6] text-[#5C6F85] font-mono uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-3">Email / Mobile</th>
                      <th className="py-3 px-3">University &amp; Hostel</th>
                      <th className="py-3 px-3 text-right">Orders</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAE0]">
                    {allCustomers.map((stu) => {
                      const uni = universities.find((u) => u.id === stu.universityId);
                      const stuOrders = orders.filter(
                        (o) =>
                          (stu.uid && !stu.uid.startsWith('order-') && o.userId === stu.uid) ||
                          (stu.mobile && o.phone === stu.mobile) ||
                          o.studentName.toLowerCase() === stu.name.toLowerCase()
                      );
                      return (
                        <tr key={stu.uid}>
                          <td className="py-3 px-4 font-semibold text-[#0F294A]">
                            {stu.name}
                          </td>
                          <td className="py-3 px-3 text-[#233B57]">
                            <p>{stu.email || 'Guest / Checkout'}</p>
                            <p className="font-mono text-[11px] text-[#5C6F85]">{stu.mobile}</p>
                          </td>
                          <td className="py-3 px-3 text-[#233B57]">
                            <p>{uni?.shortName || stu.universityId}</p>
                            <p className="text-[11px] text-[#5C6F85]">
                              {stu.hostel}{stu.roomNumber ? `, Room ${stu.roomNumber}` : ''}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#0F294A]">
                            {stuOrders.length}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setOrderQuery(stu.mobile || stu.name);
                                setOrderStatusFilter('All');
                                handleSelectSection('orders');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-[#0F294A] font-semibold hover:border-[#15803D]"
                            >
                              View Orders
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. COUPONS */}
          {section === 'coupons' && (
            <div className="space-y-5">
              <h2 className="font-display font-bold text-xl text-[#0F294A]">
                Student Coupons & Promo Codes
              </h2>

              <form
                onSubmit={handleCreateCoupon}
                className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-5 gap-3"
              >
                <input
                  type="text"
                  required
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Code (e.g. FEST20)"
                  className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-mono uppercase"
                />
                <select
                  value={couponType}
                  onChange={(e) => setCouponType(e.target.value as 'flat' | 'percent')}
                  className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
                >
                  <option value="flat">Flat ₹ Off</option>
                  <option value="percent">% Off</option>
                </select>
                <input
                  type="number"
                  required
                  value={couponValue}
                  onChange={(e) => setCouponValue(e.target.value)}
                  placeholder="Value"
                  className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-mono"
                />
                <input
                  type="number"
                  required
                  value={couponMin}
                  onChange={(e) => setCouponMin(e.target.value)}
                  placeholder="Min Cart ₹"
                  className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-mono"
                />
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-[#15803D] text-white text-xs font-semibold"
                >
                  Create Coupon
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {coupons.map((c) => (
                  <div
                    key={c.code}
                    className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-mono font-bold text-sm text-[#0F294A]">
                        {c.code}
                      </span>
                      <p className="text-xs text-[#5C6F85] mt-0.5">{c.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onSaveCoupons(
                          coupons.map((x) =>
                            x.code === c.code ? { ...x, active: !x.active } : x
                          )
                        )
                      }
                      className={`h-8 px-3 rounded-lg text-xs font-semibold ${
                        c.active
                          ? 'bg-[#EAF6EE] text-[#15803D]'
                          : 'bg-[#F3EFE6] text-[#5C6F85]'
                      }`}
                    >
                      {c.active ? 'Active' : 'Paused'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. UNIVERSITIES */}
          {section === 'universities' && (
            <div className="space-y-5">
              <h2 className="font-display font-bold text-xl text-[#0F294A]">
                Multi-University & Hostel Management
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <form
                  onSubmit={handleAddHostel}
                  className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-5 space-y-3"
                >
                  <h3 className="font-display font-semibold text-sm text-[#0F294A]">
                    Add Hostel to Existing University
                  </h3>
                  <select
                    value={targetUniId}
                    onChange={(e) => setTargetUniId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
                  >
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newHostelName}
                      onChange={(e) => setNewHostelName(e.target.value)}
                      placeholder="New Hostel Name (e.g. Tagore Residency)"
                      className="flex-1 h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
                    />
                    <button
                      type="submit"
                      className="h-10 px-4 rounded-xl bg-[#0F294A] text-white text-xs font-semibold"
                    >
                      Add Hostel
                    </button>
                  </div>
                </form>

                <form
                  onSubmit={handleAddUniversity}
                  className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-5 space-y-3"
                >
                  <h3 className="font-display font-semibold text-sm text-[#0F294A]">
                    Onboard New University Campus
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={newUniName}
                      onChange={(e) => setNewUniName(e.target.value)}
                      placeholder="University Full Name"
                      className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
                    />
                    <input
                      type="text"
                      value={newUniShort}
                      onChange={(e) => setNewUniShort(e.target.value)}
                      placeholder="Short Name (e.g. SRM KTR)"
                      className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
                    />
                    <input
                      type="text"
                      required
                      value={newCampusName}
                      onChange={(e) => setNewCampusName(e.target.value)}
                      placeholder="Campus Name"
                      className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
                    />
                    <input
                      type="text"
                      value={newCampusCity}
                      onChange={(e) => setNewCampusCity(e.target.value)}
                      placeholder="City"
                      className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full h-10 rounded-xl bg-[#15803D] text-white text-xs font-semibold"
                  >
                    Add University Hub
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                {universities.map((u) => (
                  <div
                    key={u.id}
                    className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold text-base text-[#0F294A]">
                        {u.name}
                      </h3>
                      <span className="font-mono text-xs text-[#15803D] font-semibold">
                        {u.shortName}
                      </span>
                    </div>
                    {u.campuses.map((c) => (
                      <div key={c.id} className="text-xs text-[#233B57] pt-1">
                        <p className="font-semibold">
                          {c.name} ({c.city}) · Delivery ₹{c.deliveryFee} (Free ≥ ₹{c.freeDeliveryAbove})
                        </p>
                        <p className="text-[#5C6F85] mt-0.5">
                          Hostels: {c.hostels.join(' · ')}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. CSV REPORTS */}
          {section === 'reports' && (
            <div className="space-y-5">
              <h2 className="font-display font-bold text-xl text-[#0F294A]">
                Export Campus CSV Reports
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-5 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="font-display font-bold text-base text-[#0F294A]">
                      Campus Orders CSV
                    </h3>
                    <p className="text-xs text-[#5C6F85] mt-1">
                      Exports all {scopedOrders.length} orders with order IDs, student names, campus, hostel, total INR, and fulfillment status.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        'unimart-orders-report.csv',
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
                      )
                    }
                    className="h-10 rounded-xl bg-[#0F294A] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#1A3A63]"
                  >
                    <Download className="w-4 h-4" />
                    Download Orders CSV
                  </button>
                </div>

                <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-5 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="font-display font-bold text-base text-[#0F294A]">
                      Campus Inventory CSV
                    </h3>
                    <p className="text-xs text-[#5C6F85] mt-1">
                      Exports all {products.length} SKUs with prices, MRP, and live stock counts across every university campus hub.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        'unimart-inventory-report.csv',
                        ['SKU', 'Name', 'Category', 'Price INR', 'MRP INR', ...allCampuses.map((c) => `${c.uniName} - ${c.name}`)],
                        products.map((p) => [
                          p.sku,
                          p.name,
                          p.category,
                          p.price,
                          p.mrp,
                          ...allCampuses.map((c) => p.stockByCampus?.[c.id] ?? 0),
                        ])
                      )
                    }
                    className="h-10 rounded-xl bg-[#15803D] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#166534]"
                  >
                    <Download className="w-4 h-4" />
                    Download Inventory CSV
                  </button>
                </div>

                <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-5 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="font-display font-bold text-base text-[#0F294A]">
                      Student Directory CSV
                    </h3>
                    <p className="text-xs text-[#5C6F85] mt-1">
                      Exports registered student profiles, hostel names, room numbers, and campus assignments.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        'unimart-students-report.csv',
                        ['UID', 'Name', 'Email', 'Mobile', 'University ID', 'Campus ID', 'Hostel', 'Room'],
                        students.map((s) => [
                          s.uid,
                          s.name,
                          s.email,
                          s.mobile,
                          s.universityId,
                          s.campusId,
                          s.hostel,
                          s.roomNumber,
                        ])
                      )
                    }
                    className="h-10 rounded-xl bg-[#0F294A] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#1A3A63]"
                  >
                    <Download className="w-4 h-4" />
                    Download Students CSV
                  </button>
                </div>
              </div>

              <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-sm text-[#0F294A]">
                    Reset Demo Storefront Data
                  </h3>
                  <p className="text-xs text-[#5C6F85] mt-0.5">
                    Restores the 50 seeded campus products, sample orders, coupons, and 4 university hubs to their clean initial state.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onResetDemoData}
                  className="h-9 px-4 rounded-lg border border-[#E5DEC9] text-[#0F294A] hover:bg-[#F3EFE6] text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Demo Data
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
