import { useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  Download,
  FileSpreadsheet,
  FolderKanban,
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
import { authService } from '../services/firebaseReady';
import {
  CategoryId,
  Coupon,
  Order,
  OrderStatus,
  Product,
  University,
} from '../types';
import { ResilientImage } from './ResilientImage';

type AdminSection =
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
  onSaveProducts: (products: Product[]) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onSaveCoupons: (coupons: Coupon[]) => void;
  onSaveUniversities: (universities: University[]) => void;
  onResetDemoData: () => void;
}

export function AdminDashboard({
  products,
  orders,
  universities,
  coupons,
  onSaveProducts,
  onUpdateOrderStatus,
  onSaveCoupons,
  onSaveUniversities,
  onResetDemoData,
}: AdminDashboardProps) {
  const [section, setSection] = useState<AdminSection>('analytics');
  const [campusScope, setCampusScope] = useState<string>('all');
  const [productQuery, setProductQuery] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);

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

  const students = useMemo(
    () => authService.getUsers().filter((u) => u.role === 'student'),
    []
  );

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
          </div>

          <nav className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-2 flex lg:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
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
                    {products.length} / {students.length}
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
          {section === 'orders' && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-xl text-[#0F294A]">
                Campus Orders Management ({scopedOrders.length})
              </h2>
              <div className="space-y-3">
                {scopedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#0F294A]">
                          {order.id}
                        </span>
                        <span className="text-xs text-[#5C6F85]">
                          · {order.studentName} ({order.phone})
                        </span>
                      </div>
                      <p className="text-xs text-[#5C6F85] mt-1">
                        {order.universityName} · {order.campusName} · {order.hostel} ({order.block}, Room {order.roomNumber})
                      </p>
                      <p className="font-mono text-xs font-semibold text-[#15803D] mt-1">
                        ₹{order.total.toLocaleString('en-IN')} · {order.items.length} items · {order.paymentMethod} ({order.paymentStatus})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. CUSTOMERS */}
          {section === 'customers' && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-xl text-[#0F294A]">
                Registered Students ({students.length})
              </h2>
              <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F3EFE6] text-[#5C6F85] font-mono uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-3">Email / Mobile</th>
                      <th className="py-3 px-3">University & Hostel</th>
                      <th className="py-3 px-3 text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAE0]">
                    {students.map((stu) => {
                      const uni = universities.find((u) => u.id === stu.universityId);
                      const stuOrders = orders.filter((o) => o.userId === stu.uid);
                      return (
                        <tr key={stu.uid}>
                          <td className="py-3 px-4 font-semibold text-[#0F294A]">
                            {stu.name}
                          </td>
                          <td className="py-3 px-3 text-[#233B57]">
                            <p>{stu.email}</p>
                            <p className="font-mono text-[11px] text-[#5C6F85]">{stu.mobile}</p>
                          </td>
                          <td className="py-3 px-3 text-[#233B57]">
                            <p>{uni?.shortName || stu.universityId}</p>
                            <p className="text-[11px] text-[#5C6F85]">
                              {stu.hostel}, Room {stu.roomNumber}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#0F294A]">
                            {stuOrders.length}
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
