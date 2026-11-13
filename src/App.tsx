import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
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
  Product,
  StudentUser,
  University,
} from './types';

export default function App() {
  const [universities, setUniversities] = useState<University[]>(() =>
    storeService.getUniversities()
  );
  const [activeCampusSel, setActiveCampusSel] = useState(() =>
    storeService.getActiveCampusSelection()
  );
  const [products, setProducts] = useState<Product[]>(() =>
    storeService.getProducts()
  );
  const [orders, setOrders] = useState<Order[]>(() => storeService.getOrders());
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

  // Navigation & View State
  const [activeView, setActiveView] = useState<AppView>('home');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dashboardTab, setDashboardTab] = useState<StudentDashboardTab>('orders');
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState('');

  // Toast Banner
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Persist domain updates
  useEffect(() => storeService.saveProducts(products), [products]);
  useEffect(() => storeService.saveUniversities(universities), [universities]);
  useEffect(() => storeService.saveOrders(orders), [orders]);
  useEffect(() => storeService.saveCoupons(coupons), [coupons]);
  useEffect(() => storeService.saveCart(cart), [cart]);
  useEffect(() => storeService.saveWishlist(wishlistIds), [wishlistIds]);
  useEffect(() => storeService.saveAddresses(addresses), [addresses]);
  useEffect(() => storeService.saveNotifications(notifications), [notifications]);

  const activeUniversity =
    universities.find((u) => u.id === activeCampusSel.universityId) ?? universities[0];
  const activeCampus =
    activeUniversity.campuses.find((c) => c.id === activeCampusSel.campusId) ??
    activeUniversity.campuses[0];

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
    storeService.saveActiveCampusSelection(universityId, campusId);
    const uni = universities.find((u) => u.id === universityId);
    const camp = uni?.campuses.find((c) => c.id === campusId);
    if (uni && camp) {
      showToast(`Switched campus hub to ${uni.shortName} · ${camp.name}`);
    }
  };

  const handleNavigate = (view: AppView, sectionId?: string) => {
    setActiveView(view);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenProductDetail = (product: Product) => {
    setSelectedProduct(product);
    setActiveView('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = (product: Product, qty = 1) => {
    const stock = product.stockByCampus[activeCampus.id] ?? 0;
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
    const maxStock = product?.stockByCampus[activeCampus.id] ?? 99;
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
        const stock = prod?.stockByCampus[activeCampus.id] ?? 0;
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

  const handleOrderCreated = (order: Order) => {
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === order.id);
      if (exists) {
        return prev.map((o) => (o.id === order.id ? order : o));
      }
      return [order, ...prev];
    });

    // Deduct campus inventory only once on initial order creation
    const alreadyExists = orders.some((o) => o.id === order.id);
    if (!alreadyExists) {
      setProducts((prev) =>
        prev.map((prod) => {
          const orderedItem = order.items.find((i) => i.productId === prod.id);
          if (!orderedItem) return prod;
          const currentStock = prod.stockByCampus[order.campusId] ?? 0;
          return {
            ...prod,
            stockByCampus: {
              ...prod.stockByCampus,
              [order.campusId]: Math.max(0, currentStock - orderedItem.quantity),
            },
          };
        })
      );
      setCart([]);
      setAppliedCouponCode('');
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: `Order ${order.id} ${order.paymentStatus === 'success' ? 'Confirmed' : 'Logged (Pending)'}`,
          message: `Delivery to ${order.hostel}, ${order.block} Room ${order.roomNumber}.`,
          timestamp: 'Just now',
          read: false,
          type: 'order',
        },
        ...prev,
      ]);
    }
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              timeline: buildOrderTimeline(status, o.campusName),
            }
          : o
      )
    );
    showToast(`Order ${orderId} updated to ${status}`);
  };

  const handleOpenDashboardTab = (tab: StudentDashboardTab) => {
    setDashboardTab(tab);
    setActiveView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTrackOrder = (orderId: string) => {
    setHighlightedOrderId(orderId);
    setDashboardTab('orders');
    setActiveView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = (user: StudentUser) => {
    setCurrentUser(user);
    setActiveCampusSel({
      universityId: user.universityId,
      campusId: user.campusId,
    });
    storeService.saveActiveCampusSelection(user.universityId, user.campusId);
    showToast(`Signed in as ${user.name}`);
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
            product={selectedProduct}
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
            onLogout={() => {
              authService.logout();
              setCurrentUser(null);
              showToast('Signed out of UNIMART');
            }}
            onUpdateProfile={(u) => {
              const saved = authService.updateProfile(u);
              setCurrentUser(saved);
              showToast('Student profile saved');
            }}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={(p) => {
              handleAddToCart(p, 1);
              setIsCartOpen(true);
            }}
            onOpenProduct={handleOpenProductDetail}
            onSaveAddresses={setAddresses}
            onMarkAllNotificationsRead={() =>
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
            }
            onReorderOrder={(order) => {
              for (const item of order.items) {
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
            onSaveProducts={(next) => {
              setProducts(next);
              showToast('Product inventory updated');
            }}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onSaveCoupons={(next) => {
              setCoupons(next);
              showToast('Coupons updated');
            }}
            onSaveUniversities={(next) => {
              setUniversities(next);
              showToast('University & campus hubs updated');
            }}
            onResetDemoData={() => {
              storeService.resetAllDemoData();
              setUniversities(storeService.getUniversities());
              setProducts(storeService.getProducts());
              setOrders(storeService.getOrders());
              setCoupons(storeService.getCoupons());
              setAddresses(storeService.getAddresses());
              setNotifications(storeService.getNotifications());
              setCart([]);
              showToast('Restored clean 50-product UNIMART demo data');
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
