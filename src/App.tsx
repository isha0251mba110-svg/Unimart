import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { AdminDashboard, AdminSection } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { CatalogView } from './components/CatalogView';
import { CheckoutModal } from './components/CheckoutModal';
import { HomePage } from './components/HomePage';
import { Navbar } from './components/Navbar';
import { ProductDetailView } from './components/ProductDetailView';
import {
  StudentDashboard,
  StudentDashboardTab,
} from './components/StudentDashboard';
import {
  ensureCloudUserProfile,
  firebaseAuth,
  isAdminEmail,
  signInWithGoogleAccount,
  signOutFirebaseAccount,
  subscribeFirebaseAuth,
  subscribeToCloudCustomers,
  subscribeToCloudOrders,
  updateCloudOrderStatus,
} from './services/firebaseCloud';
import {
  authService,
  buildOrderTimeline,
  storeService,
} from './services/firebaseReady';
import {
  AddressItem,
  AppView,
  CartItem,
  CategoryId,
  ComboOffer,
  Coupon,
  NotificationItem,
  Order,
  OrderStatus,
  PaymentState,
  Product,
  StudentUser,
  University,
} from './types';

const ADMIN_SECTIONS: AdminSection[] = [
  'analytics',
  'products',
  'categories',
  'orders',
  'customers',
  'coupons',
  'universities',
  'reports',
];

const DASHBOARD_TABS: StudentDashboardTab[] = [
  'orders',
  'wishlist',
  'addresses',
  'notifications',
  'profile',
];

interface ParsedRoute {
  activeView: AppView;
  adminSection: AdminSection;
  adminOrderId: string | null;
  dashboardTab: StudentDashboardTab;
  studentOrderId: string | null;
  productId: string | null;
}

function parseRouteFromLocation(): ParsedRoute {
  if (typeof window === 'undefined') {
    return {
      activeView: 'home',
      adminSection: 'analytics',
      adminOrderId: null,
      dashboardTab: 'orders',
      studentOrderId: null,
      productId: null,
    };
  }

  const rawPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const segments = rawPath.split('/').filter(Boolean);
  const params = new URLSearchParams(window.location.search);
  const orderQueryParam = params.get('order')?.trim() || null;

  if (segments[0] === 'admin') {
    const sub = segments[1] as AdminSection | undefined;
    if (sub === 'orders') {
      const pathOrderId = segments[2] ? decodeURIComponent(segments[2]) : null;
      return {
        activeView: 'admin',
        adminSection: 'orders',
        adminOrderId: pathOrderId || orderQueryParam,
        dashboardTab: 'orders',
        studentOrderId: null,
        productId: null,
      };
    }
    if (sub && ADMIN_SECTIONS.includes(sub)) {
      return {
        activeView: 'admin',
        adminSection: sub,
        adminOrderId: null,
        dashboardTab: 'orders',
        studentOrderId: null,
        productId: null,
      };
    }
    return {
      activeView: 'admin',
      adminSection: orderQueryParam ? 'orders' : 'analytics',
      adminOrderId: orderQueryParam,
      dashboardTab: 'orders',
      studentOrderId: null,
      productId: null,
    };
  }

  if (segments[0] === 'catalog' || segments[0] === 'catalogue') {
    return {
      activeView: 'catalog',
      adminSection: 'analytics',
      adminOrderId: null,
      dashboardTab: 'orders',
      studentOrderId: null,
      productId: null,
    };
  }

  if (segments[0] === 'product' && segments[1]) {
    return {
      activeView: 'product',
      adminSection: 'analytics',
      adminOrderId: null,
      dashboardTab: 'orders',
      studentOrderId: null,
      productId: decodeURIComponent(segments[1]),
    };
  }

  if (segments[0] === 'dashboard') {
    return {
      activeView: 'dashboard',
      adminSection: 'orders',
      adminOrderId: null,
      dashboardTab: 'orders',
      studentOrderId: orderQueryParam,
      productId: null,
    };
  }

  if (segments[0] && DASHBOARD_TABS.includes(segments[0] as StudentDashboardTab)) {
    return {
      activeView: 'dashboard',
      adminSection: 'analytics',
      adminOrderId: null,
      dashboardTab: segments[0] as StudentDashboardTab,
      studentOrderId: segments[0] === 'orders' ? orderQueryParam : null,
      productId: null,
    };
  }

  return {
    activeView: 'home',
    adminSection: 'analytics',
    adminOrderId: null,
    dashboardTab: 'orders',
    studentOrderId: null,
    productId: null,
  };
}

function pushRoute(path: string, replace = false): void {
  if (typeof window === 'undefined') return;
  try {
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === path) return;
    if (replace) {
      window.history.replaceState(null, '', path);
    } else {
      window.history.pushState(null, '', path);
    }
  } catch {
    // Ignore history restrictions in sandboxed environments
  }
}

function buildAdminPath(section: AdminSection, orderId?: string | null): string {
  if (section === 'orders' && orderId) {
    return `/admin/orders/${encodeURIComponent(orderId)}`;
  }
  if (section === 'analytics') {
    return '/admin';
  }
  return `/admin/${section}`;
}

export default function App() {
  const initialRoute = useMemo(() => parseRouteFromLocation(), []);

  const [universities, setUniversities] = useState<University[]>(() =>
    storeService.getUniversities()
  );
  const [activeCampusSel, setActiveCampusSel] = useState(() =>
    storeService.getActiveCampusSelection()
  );
  const [products, setProducts] = useState<Product[]>(() =>
    storeService.getProducts()
  );
  const [expressOrders, setExpressOrders] = useState<Order[]>(() => storeService.getOrders());
  const [cloudOrders, setCloudOrders] = useState<Order[]>([]);
  const [cloudCustomers, setCloudCustomers] = useState<StudentUser[]>([]);
  const [cloudAdminEmail, setCloudAdminEmail] = useState<string | null>(() =>
    isAdminEmail(firebaseAuth.currentUser?.email) ? firebaseAuth.currentUser?.email ?? null : null
  );
  const [coupons, setCoupons] = useState<Coupon[]>(() => storeService.getCoupons());
  const [cart, setCart] = useState<CartItem[]>(() => storeService.getCart());
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    storeService.getWishlist()
  );
  const [addresses, setAddresses] = useState<AddressItem[]>(() =>
    storeService.getAddresses()
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    storeService.getNotifications()
  );
  const [currentUser, setCurrentUser] = useState<StudentUser | null>(() =>
    authService.getCurrentUser()
  );

  const orders = useMemo(() => {
    const byId = new Map<string, Order>();
    for (const o of expressOrders) byId.set(o.id, o);
    for (const o of cloudOrders) byId.set(o.id, o);
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [expressOrders, cloudOrders]);

  // Navigation & View State
  const [activeView, setActiveView] = useState<AppView>(initialRoute.activeView);
  const [adminSection, setAdminSection] = useState<AdminSection>(initialRoute.adminSection);
  const [adminOrderId, setAdminOrderId] = useState<string | null>(initialRoute.adminOrderId);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingProductId, setPendingProductId] = useState<string | null>(initialRoute.productId);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(() =>
    initialRoute.productId
      ? storeService.getProducts().find((p) => p.id === initialRoute.productId) ?? null
      : null
  );
  const [dashboardTab, setDashboardTab] = useState<StudentDashboardTab>(
    initialRoute.dashboardTab
  );
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(
    initialRoute.studentOrderId
  );

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState('');

  // Toast Banner
  const [toast, setToast] = useState<string | null>(null);
  const hasBootstrapped = useRef(false);

  const showToast = (message: string) => {
    setToast(message);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Sync browser Back/Forward navigation with SPA state
  useEffect(() => {
    const handlePopState = () => {
      const next = parseRouteFromLocation();
      setActiveView(next.activeView);
      setAdminSection(next.adminSection);
      setAdminOrderId(next.adminOrderId);
      setDashboardTab(next.dashboardTab);
      setHighlightedOrderId(next.studentOrderId);
      setPendingProductId(next.productId);
      if (next.productId) {
        const match = products.find((p) => p.id === next.productId) ?? null;
        if (match) setSelectedProduct(match);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [products]);

  // Resolve deep-linked product once backend products hydrate
  useEffect(() => {
    if (activeView === 'product' && pendingProductId) {
      const match = products.find((p) => p.id === pendingProductId);
      if (match) {
        setSelectedProduct(match);
      }
    }
  }, [activeView, pendingProductId, products]);

  // Hydrate complete storefront & session from Express backend on mount
  useEffect(() => {
    let active = true;
    storeService
      .bootstrap()
      .then((data) => {
        if (!active) return;
        setUniversities(data.universities);
        setActiveCampusSel(data.activeCampus);
        setProducts(data.products);
        setExpressOrders(data.orders);
        setCoupons(data.coupons);
        setCart(data.cart);
        setWishlistIds(data.wishlist);
        setAddresses(data.addresses);
        setNotifications(data.notifications);
        if (!firebaseAuth.currentUser) {
          setCurrentUser(data.currentUser);
        }
        if (
          data.currentUser?.role === 'admin' &&
          !window.location.pathname.startsWith('/admin')
        ) {
          setActiveView('admin');
          setAdminSection('orders');
          setAdminOrderId(null);
          pushRoute('/admin/orders', true);
        }
        hasBootstrapped.current = true;
      })
      .catch(() => {
        hasBootstrapped.current = true;
      });
    return () => {
      active = false;
    };
  }, []);

  // Subscribe to Firebase Auth & live Firestore orders / customer names across all devices
  useEffect(() => {
    let unsubOrders: (() => void) | null = null;
    let unsubCustomers: (() => void) | null = null;
    let cancelled = false;

    const cleanupListeners = () => {
      unsubOrders?.();
      unsubOrders = null;
      unsubCustomers?.();
      unsubCustomers = null;
    };

    const unsubAuth = subscribeFirebaseAuth((fbUser) => {
      cleanupListeners();
      if (!fbUser) {
        setCloudOrders([]);
        setCloudCustomers([]);
        setCloudAdminEmail(null);
        return;
      }

      const emailAdmin = isAdminEmail(fbUser.email);
      setCloudAdminEmail(emailAdmin ? fbUser.email ?? null : null);

      void ensureCloudUserProfile(fbUser)
        .then((profile) => {
          if (cancelled) return;
          setCurrentUser(profile);
          if (profile.role === 'admin' && !window.location.pathname.startsWith('/admin')) {
            setActiveView('admin');
            setAdminSection('orders');
            setAdminOrderId(null);
            pushRoute('/admin/orders', true);
          }
        })
        .catch(() => {});

      unsubOrders = subscribeToCloudOrders(
        fbUser,
        emailAdmin,
        (nextOrders) => {
          if (!cancelled) setCloudOrders(nextOrders);
        },
        (err) => {
          console.warn('[UNIMART Cloud Orders]', err.message);
        }
      );

      if (emailAdmin) {
        unsubCustomers = subscribeToCloudCustomers(
          (nextCustomers) => {
            if (!cancelled) setCloudCustomers(nextCustomers);
          },
          (err) => {
            console.warn('[UNIMART Cloud Customers]', err.message);
          }
        );
      }
    });

    return () => {
      cancelled = true;
      cleanupListeners();
      unsubAuth();
    };
  }, []);

  // Auto-refresh Express orders while Admin Dashboard is open
  useEffect(() => {
    if (activeView !== 'admin') return;
    let cancelled = false;
    const syncOrders = () => {
      void storeService
        .fetchOrders()
        .then((latestOrders) => {
          if (!cancelled) setExpressOrders(latestOrders);
        })
        .catch(() => {});
    };
    syncOrders();
    const timer = setInterval(syncOrders, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeView]);

  // Sync user-scoped cart, wishlist & addresses to backend after bootstrap
  useEffect(() => {
    if (!hasBootstrapped.current) return;
    void storeService.saveCart(cart).catch(() => {});
  }, [cart]);

  useEffect(() => {
    if (!hasBootstrapped.current) return;
    void storeService.saveWishlist(wishlistIds).catch(() => {});
  }, [wishlistIds]);

  useEffect(() => {
    if (!hasBootstrapped.current) return;
    void storeService.saveAddresses(addresses).catch(() => {});
  }, [addresses]);

  const activeUniversity =
    universities.find((u) => u.id === activeCampusSel.universityId) ?? universities[0];
  const activeCampus =
    activeUniversity?.campuses?.find((c) => c.id === activeCampusSel.campusId) ??
    activeUniversity?.campuses?.[0];

  const cartMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart) map[item.productId] = item.quantity;
    return map;
  }, [cart]);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const handleChangeCampus = (universityId: string, campusId: string) => {
    setActiveCampusSel({ universityId, campusId });
    void storeService.saveActiveCampusSelection(universityId, campusId).catch(() => {});
    const uni = universities.find((u) => u.id === universityId);
    const camp = uni?.campuses.find((c) => c.id === campusId);
    if (uni && camp) {
      showToast(`Switched campus hub to ${uni.shortName} · ${camp.name}`);
    }
  };

  const handleNavigate = (view: AppView, sectionId?: string) => {
    setActiveView(view);
    if (view === 'home') pushRoute('/');
    else if (view === 'catalog') pushRoute('/catalog');
    else if (view === 'dashboard') {
      pushRoute(dashboardTab === 'orders' ? '/orders' : `/${dashboardTab}`);
    } else if (view === 'admin') {
      pushRoute(buildAdminPath(adminSection, adminOrderId));
    } else if (view === 'product') {
      pushRoute(
        selectedProduct ? `/product/${encodeURIComponent(selectedProduct.id)}` : '/catalog'
      );
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (sectionId) {
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleSelectCategory = (cat: CategoryId | 'All') => {
    setSelectedCategory(cat);
    setActiveView('catalog');
    pushRoute('/catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenProductDetail = (product: Product) => {
    setSelectedProduct(product);
    setPendingProductId(product.id);
    setActiveView('product');
    pushRoute(`/product/${encodeURIComponent(product.id)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = (product: Product, qty = 1) => {
    const stock = product.stockByCampus?.[activeCampus.id] ?? 0;
    if (stock <= 0) {
      showToast(`Sorry, ${product.name} is out of stock at ${activeCampus.name}.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        const nextQty = Math.min(stock, existing.quantity + qty);
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: nextQty } : i
        );
      }
      return [...prev, { productId: product.id, quantity: Math.min(stock, qty) }];
    });
    showToast(`Added ${product.name} to cart`);
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    const maxStock = product?.stockByCampus?.[activeCampus.id] ?? 99;
    setCart((prev) =>
      prev
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.min(maxStock, i.quantity + delta) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleBuyNow = (product: Product, qty: number) => {
    handleAddToCart(product, qty);
    setIsCheckoutOpen(true);
  };

  const handleAddComboToCart = (combo: ComboOffer) => {
    let addedCount = 0;
    setCart((prev) => {
      let next = [...prev];
      for (const pid of combo.productIds) {
        const prod = products.find((p) => p.id === pid);
        const stock = prod?.stockByCampus?.[activeCampus.id] ?? 0;
        if (!prod || stock <= 0) continue;
        addedCount++;
        const existing = next.find((i) => i.productId === pid);
        if (existing) {
          next = next.map((i) =>
            i.productId === pid
              ? { ...i, quantity: Math.min(stock, i.quantity + 1) }
              : i
          );
        } else {
          next.push({ productId: pid, quantity: 1 });
        }
      }
      return next;
    });
    showToast(`Added ${addedCount} items from ${combo.title} to cart!`);
    setIsCartOpen(true);
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlistIds((prev) => {
      const exists = prev.includes(productId);
      const next = exists
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      showToast(exists ? 'Removed from wishlist' : 'Saved to wishlist');
      return next;
    });
  };

  const handleOrderCreated = (
    order: Order,
    serverSync?: { products: Product[]; notifications: NotificationItem[] }
  ) => {
    setExpressOrders((prev) => {
      const exists = prev.some((o) => o.id === order.id);
      if (exists) {
        return prev.map((o) => (o.id === order.id ? order : o));
      }
      return [order, ...prev];
    });

    if (serverSync) {
      setProducts(serverSync.products);
      setNotifications(serverSync.notifications);
      setCart([]);
      setAppliedCouponCode('');
    }
  };

  const handleUpdateOrderStatus = (
    orderId: string,
    status: OrderStatus,
    paymentStatus?: PaymentState
  ) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    const applyLocalUpdate = (list: Order[]) =>
      list.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              paymentStatus: paymentStatus ?? o.paymentStatus,
              timeline: buildOrderTimeline(status, o.campusName),
            }
          : o
      );

    setExpressOrders(applyLocalUpdate);
    setCloudOrders(applyLocalUpdate);

    void (async () => {
      let cloudUpdated = false;
      if (firebaseAuth.currentUser) {
        try {
          cloudUpdated = await updateCloudOrderStatus(
            orderId,
            status,
            paymentStatus,
            targetOrder?.campusName || 'Campus'
          );
        } catch (err) {
          if (!expressOrders.some((o) => o.id === orderId)) {
            showToast(err instanceof Error ? err.message : 'Failed to update cloud order');
            return;
          }
        }
      }

      try {
        const updated = await storeService.updateOrderStatus(orderId, status, paymentStatus);
        setExpressOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
        showToast(
          paymentStatus === 'success'
            ? `Order ${orderId} marked paid & updated to ${status}`
            : `Order ${orderId} updated to ${status}`
        );
      } catch (err) {
        if (cloudUpdated) {
          showToast(
            paymentStatus === 'success'
              ? `Order ${orderId} marked paid & updated to ${status}`
              : `Order ${orderId} updated to ${status}`
          );
        } else {
          showToast(err instanceof Error ? err.message : 'Failed to update order status');
        }
      }
    })();
  };

  const handleAdminSectionChange = (
    nextSection: AdminSection,
    orderId?: string | null
  ) => {
    setAdminSection(nextSection);
    setAdminOrderId(orderId ?? null);
    pushRoute(buildAdminPath(nextSection, orderId));
  };

  const handleOpenDashboardTab = (tab: StudentDashboardTab) => {
    setDashboardTab(tab);
    setActiveView('dashboard');
    pushRoute(tab === 'orders' ? '/orders' : `/${tab}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTrackOrder = (orderId: string) => {
    setHighlightedOrderId(orderId);
    setDashboardTab('orders');
    setActiveView('dashboard');
    pushRoute(`/orders?order=${encodeURIComponent(orderId)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = (
    user: StudentUser,
    synced?: { cart?: CartItem[]; wishlist?: string[]; addresses?: AddressItem[] }
  ) => {
    setCurrentUser(user);
    setActiveCampusSel({
      universityId: user.universityId,
      campusId: user.campusId,
    });
    if (synced?.cart) setCart(synced.cart);
    if (synced?.wishlist) setWishlistIds(synced.wishlist);
    if (synced?.addresses) setAddresses(synced.addresses);
    void storeService.saveActiveCampusSelection(user.universityId, user.campusId).catch(() => {});
    if (user.role === 'admin') {
      setActiveView('admin');
      if (!window.location.pathname.startsWith('/admin')) {
        setAdminSection('orders');
        setAdminOrderId(null);
        pushRoute('/admin/orders');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(`Signed in as ${user.name} · Admin Dashboard opened`);
    } else {
      showToast(`Signed in as ${user.name}`);
    }
  };

  const handleConnectCloudAdmin = async () => {
    try {
      const { user } = await signInWithGoogleAccount();
      handleAuthSuccess(user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect Google Admin account.';
      if (!msg.includes('popup-closed-by-user') && !msg.includes('cancelled-popup-request')) {
        showToast(msg);
      }
    }
  };

  const handleLogout = () => {
    void authService.logout();
    void signOutFirebaseAccount().catch(() => {});
    setCurrentUser(null);
    setCloudAdminEmail(null);
    showToast('Signed out of UNIMART');
  };

  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];
    return products
      .filter(
        (p) =>
          p.id !== selectedProduct.id &&
          (p.category === selectedProduct.category || p.isBestseller)
      )
      .slice(0, 4);
  }, [products, selectedProduct]);

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#0F294A] flex flex-col">
      <Navbar
        activeView={activeView}
        onNavigate={handleNavigate}
        universities={universities}
        activeUniversityId={activeUniversity.id}
        activeCampusId={activeCampus.id}
        onChangeCampus={handleChangeCampus}
        cartCount={cartCount}
        wishlistCount={wishlistIds.length}
        currentUser={currentUser}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenDashboardTab={handleOpenDashboardTab}
        unreadNotifications={unreadNotifications}
      />

      <main className="flex-1">
        {activeView === 'home' && (
          <HomePage
            university={activeUniversity}
            campus={activeCampus}
            products={products}
            cartMap={cartMap}
            wishlistIds={wishlistIds}
            onShopNow={() => {
              setSelectedCategory('All');
              handleNavigate('catalog');
            }}
            onSearchSubmit={(query) => {
              setSearchQuery(query);
              setSelectedCategory('All');
              handleNavigate('catalog');
            }}
            onSelectCategory={handleSelectCategory}
            onOpenDetail={handleOpenProductDetail}
            onAddToCart={(p) => handleAddToCart(p, 1)}
            onUpdateCartQty={handleUpdateCartQty}
            onToggleWishlist={handleToggleWishlist}
            onAddComboToCart={handleAddComboToCart}
            onOpenAdmin={() => handleNavigate('admin')}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {activeView === 'catalog' && (
          <CatalogView
            university={activeUniversity}
            campus={activeCampus}
            products={products}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            cartMap={cartMap}
            wishlistIds={wishlistIds}
            onOpenDetail={handleOpenProductDetail}
            onAddToCart={(p) => handleAddToCart(p, 1)}
            onUpdateCartQty={handleUpdateCartQty}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {activeView === 'product' && selectedProduct && (
          <ProductDetailView
            key={selectedProduct.id}
            product={products.find((p) => p.id === selectedProduct.id) ?? selectedProduct}
            university={activeUniversity}
            campus={activeCampus}
            relatedProducts={relatedProducts}
            cartMap={cartMap}
            wishlistIds={wishlistIds}
            onBack={() => handleNavigate('catalog')}
            onOpenDetail={handleOpenProductDetail}
            onAddQuantityToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onUpdateCartQty={handleUpdateCartQty}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {activeView === 'dashboard' && (
          <StudentDashboard
            key={currentUser?.uid || 'guest'}
            activeTab={dashboardTab}
            onTabChange={setDashboardTab}
            currentUser={currentUser}
            universities={universities}
            activeCampusId={activeCampus.id}
            orders={orders}
            products={products}
            wishlistIds={wishlistIds}
            addresses={addresses}
            notifications={notifications}
            highlightedOrderId={highlightedOrderId}
            onOpenAuth={() => setIsAuthOpen(true)}
            onLogout={handleLogout}
            onUpdateProfile={(u) => {
              void (async () => {
                if (firebaseAuth.currentUser) {
                  try {
                    const cloudSaved = await ensureCloudUserProfile(
                      firebaseAuth.currentUser,
                      u
                    );
                    setCurrentUser(cloudSaved);
                    showToast('Student profile saved to cloud');
                    return;
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : 'Failed to save profile');
                    return;
                  }
                }
                try {
                  const saved = await authService.updateProfile(u);
                  setCurrentUser(saved);
                  showToast('Student profile saved');
                } catch (err) {
                  showToast(err instanceof Error ? err.message : 'Failed to save profile');
                }
              })();
            }}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={(p) => {
              handleAddToCart(p, 1);
              setIsCartOpen(true);
            }}
            onOpenProduct={handleOpenProductDetail}
            onSaveAddresses={setAddresses}
            onMarkAllNotificationsRead={() => {
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              void storeService.markAllNotificationsRead().catch(() => {});
            }}
            onReorderOrder={(order) => {
              for (const item of order.items ?? []) {
                const prod = products.find((p) => p.id === item.productId);
                if (prod) handleAddToCart(prod, item.quantity);
              }
              setIsCartOpen(true);
            }}
            onCancelOrder={(orderId) => handleUpdateOrderStatus(orderId, 'Cancelled')}
          />
        )}

        {activeView === 'admin' && (
          <AdminDashboard
            products={products}
            orders={orders}
            universities={universities}
            coupons={coupons}
            initialSection={adminSection}
            highlightedOrderId={adminOrderId}
            cloudCustomers={cloudCustomers}
            cloudOrdersCount={cloudOrders.length}
            cloudAdminEmail={cloudAdminEmail}
            onConnectCloudAdmin={() => void handleConnectCloudAdmin()}
            onSignOut={handleLogout}
            onSectionChange={handleAdminSectionChange}
            onSaveProducts={(next) => {
              setProducts(next);
              void storeService.saveProducts(next).catch(() => {});
              showToast('Product inventory updated');
            }}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onSaveCoupons={(next) => {
              setCoupons(next);
              void storeService.saveCoupons(next).catch(() => {});
              showToast('Coupons updated');
            }}
            onSaveUniversities={(next) => {
              setUniversities(next);
              void storeService.saveUniversities(next).catch(() => {});
              showToast('University & campus hubs updated');
            }}
            onResetDemoData={() => {
              void storeService
                .resetAllDemoData()
                .then((data) => {
                  setUniversities(data.universities);
                  setProducts(data.products);
                  setExpressOrders(data.orders);
                  setCoupons(data.coupons);
                  setAddresses(data.addresses);
                  setNotifications(data.notifications);
                  setWishlistIds(data.wishlist);
                  setCart([]);
                  showToast('Restored clean 50-product UNIMART backend data');
                })
                .catch(() => {
                  showToast('Failed to reset backend demo data');
                });
            }}
          />
        )}
      </main>

      {/* Slide-over Cart */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        campus={activeCampus}
        cart={cart}
        products={products}
        coupons={coupons}
        appliedCouponCode={appliedCouponCode}
        onApplyCoupon={setAppliedCouponCode}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Auth Modal */}
      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          universities={universities}
          defaultUniversityId={activeUniversity.id}
          defaultCampusId={activeCampus.id}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* Checkout & Demo Payment Simulator */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          universities={universities}
          activeUniversityId={activeUniversity.id}
          activeCampusId={activeCampus.id}
          currentUser={currentUser}
          savedAddresses={addresses}
          cart={cart}
          products={products}
          coupons={coupons}
          appliedCouponCode={appliedCouponCode}
          onOrderCreated={handleOrderCreated}
          onTrackOrder={handleTrackOrder}
          onCloudUserConnected={(user) => setCurrentUser(user)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-16 md:bottom-6 right-4 z-50 bg-[#0F294A] text-white px-4 py-3 rounded-xl shadow-xl border border-white/15 flex items-center gap-2.5 text-xs font-medium max-w-sm"
        >
          <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
          <span className="flex-1">{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/70 hover:text-white"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
