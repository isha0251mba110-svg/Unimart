import { useState } from 'react';
import {
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Heart,
  LogOut,
  MapPin,
  Package,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import {
  AddressItem,
  NotificationItem,
  Order,
  Product,
  StudentUser,
  University,
} from '../types';
import { ResilientImage } from './ResilientImage';

export type StudentDashboardTab =
  | 'profile'
  | 'orders'
  | 'wishlist'
  | 'addresses'
  | 'notifications';

interface StudentDashboardProps {
  activeTab: StudentDashboardTab;
  onTabChange: (tab: StudentDashboardTab) => void;
  currentUser: StudentUser | null;
  universities: University[];
  activeCampusId: string;
  orders: Order[];
  products: Product[];
  wishlistIds: string[];
  addresses: AddressItem[];
  notifications: NotificationItem[];
  highlightedOrderId?: string | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onUpdateProfile: (user: StudentUser) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onOpenProduct: (product: Product) => void;
  onSaveAddresses: (addresses: AddressItem[]) => void;
  onMarkAllNotificationsRead: () => void;
  onReorderOrder: (order: Order) => void;
  onCancelOrder: (orderId: string) => void;
}

export function StudentDashboard({
  activeTab,
  onTabChange,
  currentUser,
  universities,
  activeCampusId,
  orders,
  products,
  wishlistIds,
  addresses,
  notifications,
  highlightedOrderId,
  onOpenAuth,
  onLogout,
  onUpdateProfile,
  onToggleWishlist,
  onAddToCart,
  onOpenProduct,
  onSaveAddresses,
  onMarkAllNotificationsRead,
  onReorderOrder,
  onCancelOrder,
}: StudentDashboardProps) {
  const [orderSearch, setOrderSearch] = useState(highlightedOrderId || '');
  const [profileSavedMsg, setProfileSavedMsg] = useState('');

  // Profile edit local state
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editMobile, setEditMobile] = useState(currentUser?.mobile || '');
  const [editUniId, setEditUniId] = useState(currentUser?.universityId || universities[0]?.id || '');
  const editUni = universities.find((u) => u.id === editUniId) ?? universities[0];
  const [editCampusId, setEditCampusId] = useState(
    currentUser?.campusId || editUni?.campuses[0]?.id || ''
  );
  const editCampus =
    editUni?.campuses.find((c) => c.id === editCampusId) ?? editUni?.campuses[0];
  const [editHostel, setEditHostel] = useState(
    currentUser?.hostel || editCampus?.hostels[0] || ''
  );
  const [editRoom, setEditRoom] = useState(currentUser?.roomNumber || '');

  // New Address form state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addrLabel, setAddrLabel] = useState('Hostel Room');
  const [addrUniId, setAddrUniId] = useState(universities[0]?.id || '');
  const addrUni = universities.find((u) => u.id === addrUniId) ?? universities[0];
  const [addrCampusId, setAddrCampusId] = useState(addrUni?.campuses[0]?.id || '');
  const addrCampus =
    addrUni?.campuses.find((c) => c.id === addrCampusId) ?? addrUni?.campuses[0];
  const [addrHostel, setAddrHostel] = useState(addrCampus?.hostels[0] || '');
  const [addrBlock, setAddrBlock] = useState(addrCampus?.blocks[0] || 'Block A');
  const [addrRoom, setAddrRoom] = useState('');
  const [addrPhone, setAddrPhone] = useState(currentUser?.mobile || '');

  const userOrders = orders.filter((o) => {
    const belongs = currentUser ? o.userId === currentUser.uid || o.userId === 'guest-student' : true;
    const matchesQuery =
      !orderSearch.trim() ||
      o.id.toLowerCase().includes(orderSearch.trim().toLowerCase()) ||
      o.hostel.toLowerCase().includes(orderSearch.trim().toLowerCase());
    return belongs && matchesQuery;
  });

  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    onUpdateProfile({
      ...currentUser,
      name: editName.trim() || currentUser.name,
      mobile: editMobile.trim() || currentUser.mobile,
      universityId: editUniId,
      campusId: editCampusId,
      hostel: editHostel,
      roomNumber: editRoom.trim() || currentUser.roomNumber,
    });
    setProfileSavedMsg('Student profile updated successfully.');
    setTimeout(() => setProfileSavedMsg(''), 3000);
  };

  const handleCreateAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrRoom.trim() || !addrPhone.trim()) return;
    const newAddr: AddressItem = {
      id: `addr-${Date.now()}`,
      label: addrLabel.trim() || 'Hostel Room',
      universityId: addrUniId,
      campusId: addrCampusId,
      hostel: addrHostel,
      block: addrBlock,
      roomNumber: addrRoom.trim(),
      phone: addrPhone.trim(),
      isDefault: addresses.length === 0,
    };
    onSaveAddresses([...addresses, newAddr]);
    setAddrRoom('');
    setShowAddAddress(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0F294A] text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#4ADE80] font-semibold">
            UNIMART Student Hub
          </p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl mt-1">
            {currentUser ? `Welcome, ${currentUser.name}` : 'Student Dashboard (Guest Preview)'}
          </h1>
          <p className="text-xs text-[#CBD5E1] mt-1">
            {currentUser
              ? `${currentUser.hostel} · Room ${currentUser.roomNumber} · ${currentUser.email}`
              : 'Sign in to sync your profile, hostel addresses, and personal orders.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <button
              type="button"
              onClick={onLogout}
              className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="h-10 px-5 rounded-xl bg-[#15803D] hover:bg-[#16A34A] text-xs font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <User className="w-4 h-4" />
              Sign In / Register
            </button>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'orders' as const, label: 'Orders & Tracking', icon: Package, count: userOrders.length },
          { id: 'wishlist' as const, label: 'Saved Wishlist', icon: Heart, count: wishlistProducts.length },
          { id: 'addresses' as const, label: 'Hostel Addresses', icon: MapPin, count: addresses.length },
          { id: 'notifications' as const, label: 'Notifications', icon: Bell, count: unreadCount },
          { id: 'profile' as const, label: 'Student Profile', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`h-10 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap border transition-colors ${
                active
                  ? 'bg-[#0F294A] text-white border-[#0F294A]'
                  : 'bg-[#FFFDF9] text-[#233B57] border-[#E5DEC9] hover:border-[#0F294A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                    active ? 'bg-[#15803D] text-white' : 'bg-[#F3EFE6] text-[#0F294A]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ORDERS & TRACKING */}
      {activeTab === 'orders' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display font-bold text-xl text-[#0F294A]">
              Order History & Live Status Timeline
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#5C6F85] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Track by Order ID (e.g. UNI-2604)"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#FFFDF9] border border-[#E5DEC9] text-xs font-mono focus:outline-none focus:border-[#0F294A]"
              />
            </div>
          </div>

          {userOrders.length === 0 ? (
            <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-10 text-center">
              <Package className="w-10 h-10 text-[#8A98A9] mx-auto mb-3 stroke-[1.5]" />
              <p className="font-display font-bold text-lg text-[#0F294A]">No matching orders found</p>
              <p className="text-xs text-[#5C6F85] mt-1">
                Place an order via checkout or clear the Order ID search box.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {userOrders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-[#FFFDF9] border rounded-2xl p-5 sm:p-6 space-y-5 ${
                    highlightedOrderId === order.id
                      ? 'border-[#15803D] ring-2 ring-[#15803D]/20'
                      : 'border-[#E5DEC9]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#F0EAE0]">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-base text-[#0F294A]">
                          {order.id}
                        </span>
                        <span
                          className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                            order.status === 'Delivered'
                              ? 'bg-[#EAF6EE] text-[#15803D]'
                              : order.status === 'Cancelled'
                              ? 'bg-[#FEF2F2] text-[#B91C1C]'
                              : 'bg-[#FEF3C7] text-[#B45309]'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#5C6F85] mt-1">
                        {order.universityName} · {order.campusName} · {order.hostel} ({order.block}, Room {order.roomNumber})
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-bold text-lg text-[#0F294A] tabular-nums">
                        ₹{order.total.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-[#5C6F85]">
                        {order.paymentMethod} · Payment: <span className="uppercase font-mono">{order.paymentStatus}</span>
                      </p>
                    </div>
                  </div>

                  {/* Order Status Timeline */}
                  <div>
                    <p className="text-xs font-semibold text-[#0F294A] mb-3">
                      Order Status Timeline
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      {order.timeline.map((step, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-xs ${
                            step.completed
                              ? 'bg-[#EAF6EE]/70 border-[#B7DFC4] text-[#0F294A]'
                              : 'bg-[#FAF8F3] border-[#E5DEC9] text-[#8A98A9]'
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
                          <p className="text-[11px] mt-1 line-clamp-2 opacity-85">{step.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Items Snapshot & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap gap-3">
                      {order.items.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center gap-2.5 bg-[#FAF8F3] border border-[#E5DEC9] rounded-xl px-3 py-2"
                        >
                          <ResilientImage
                            src={item.image}
                            alt={item.name}
                            className="w-9 h-9 rounded-lg object-cover"
                          />
                          <div className="text-xs">
                            <p className="font-semibold text-[#0F294A] line-clamp-1 max-w-[180px]">
                              {item.name}
                            </p>
                            <p className="font-mono text-[11px] text-[#5C6F85]">
                              {item.quantity} × ₹{item.price}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {(order.status === 'Pending' || order.status === 'Confirmed') && (
                        <button
                          type="button"
                          onClick={() => onCancelOrder(order.id)}
                          className="h-9 px-3.5 rounded-lg border border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEF2F2] text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel Order
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onReorderOrder(order)}
                        className="h-9 px-3.5 rounded-lg bg-[#0F294A] hover:bg-[#1A3A63] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reorder Items
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WISHLIST */}
      {activeTab === 'wishlist' && (
        <div className="space-y-4">
          <h2 className="font-display font-bold text-xl text-[#0F294A]">
            Saved Hostel Essentials ({wishlistProducts.length})
          </h2>

          {wishlistProducts.length === 0 ? (
            <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-10 text-center">
              <Heart className="w-10 h-10 text-[#8A98A9] mx-auto mb-3 stroke-[1.5]" />
              <p className="font-display font-bold text-lg text-[#0F294A]">
                Your wishlist is empty
              </p>
              <p className="text-xs text-[#5C6F85] mt-1">
                Tap the heart icon on any product to save it for exam week or next month.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {wishlistProducts.map((prod) => {
                const stock = prod.stockByCampus[activeCampusId] ?? 0;
                return (
                  <div
                    key={prod.id}
                    className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl overflow-hidden flex flex-col"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenProduct(prod)}
                      className="aspect-[4/3] bg-[#F3EFE6] overflow-hidden"
                    >
                      <ResilientImage
                        src={prod.image}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    <div className="p-4 flex flex-col flex-1">
                      <p className="text-[11px] text-[#5C6F85]">{prod.category}</p>
                      <h3 className="font-display font-semibold text-sm text-[#0F294A] mt-1 line-clamp-2">
                        {prod.name}
                      </h3>
                      <p className="font-mono font-bold text-base text-[#0F294A] mt-2 tabular-nums">
                        ₹{prod.price}
                      </p>
                      <div className="mt-auto pt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={stock <= 0}
                          onClick={() => onAddToCart(prod)}
                          className="flex-1 h-9 rounded-lg bg-[#15803D] hover:bg-[#166534] disabled:bg-[#E5DEC9] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          Move to Cart
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleWishlist(prod.id)}
                          className="w-9 h-9 rounded-lg border border-[#E5DEC9] text-[#B91C1C] hover:bg-[#FEF2F2] flex items-center justify-center"
                          aria-label="Remove from wishlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HOSTEL ADDRESSES */}
      {activeTab === 'addresses' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-[#0F294A]">
              Saved Hostel Addresses
            </h2>
            <button
              type="button"
              onClick={() => setShowAddAddress((v) => !v)}
              className="h-9 px-4 rounded-xl bg-[#0F294A] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#1A3A63]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Hostel Room
            </button>
          </div>

          {showAddAddress && (
            <form
              onSubmit={handleCreateAddress}
              className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <input
                type="text"
                value={addrLabel}
                onChange={(e) => setAddrLabel(e.target.value)}
                placeholder="Label (e.g. Hostel Room)"
                className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
              />
              <select
                value={addrUniId}
                onChange={(e) => {
                  setAddrUniId(e.target.value);
                  const uni = universities.find((u) => u.id === e.target.value);
                  if (uni?.campuses[0]) {
                    setAddrCampusId(uni.campuses[0].id);
                    setAddrHostel(uni.campuses[0].hostels[0] ?? '');
                    setAddrBlock(uni.campuses[0].blocks[0] ?? 'Block A');
                  }
                }}
                className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
              >
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <select
                value={addrCampusId}
                onChange={(e) => {
                  setAddrCampusId(e.target.value);
                  const c = addrUni?.campuses.find((x) => x.id === e.target.value);
                  if (c) {
                    setAddrHostel(c.hostels[0] ?? '');
                    setAddrBlock(c.blocks[0] ?? 'Block A');
                  }
                }}
                className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
              >
                {addrUni?.campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={addrHostel}
                onChange={(e) => setAddrHostel(e.target.value)}
                className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
              >
                {addrCampus?.hostels.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <select
                value={addrBlock}
                onChange={(e) => setAddrBlock(e.target.value)}
                className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs"
              >
                {addrCampus?.blocks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                value={addrRoom}
                onChange={(e) => setAddrRoom(e.target.value)}
                placeholder="Room No. (e.g. C-102)"
                className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-mono"
              />
              <input
                type="tel"
                required
                value={addrPhone}
                onChange={(e) => setAddrPhone(e.target.value)}
                placeholder="10-digit mobile"
                className="h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-mono"
              />
              <button
                type="submit"
                className="sm:col-span-2 h-10 rounded-xl bg-[#15803D] text-white text-xs font-semibold hover:bg-[#166534]"
              >
                Save Hostel Address
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => {
              const uni = universities.find((u) => u.id === addr.universityId);
              const camp = uni?.campuses.find((c) => c.id === addr.campusId);
              return (
                <div
                  key={addr.id}
                  className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-5 flex justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm text-[#0F294A]">
                        {addr.label}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-mono font-semibold text-[#15803D] bg-[#EAF6EE] px-2 py-0.5 rounded">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#233B57] mt-1">
                      {addr.hostel}, {addr.block}, Room <span className="font-mono">{addr.roomNumber}</span>
                    </p>
                    <p className="text-xs text-[#5C6F85]">
                      {uni?.shortName} · {camp?.name}
                    </p>
                    <p className="text-xs font-mono text-[#5C6F85] mt-1">Ph: {addr.phone}</p>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        onSaveAddresses(addresses.filter((a) => a.id !== addr.id))
                      }
                      className="text-[#8A98A9] hover:text-[#B91C1C]"
                      aria-label="Delete address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() =>
                          onSaveAddresses(
                            addresses.map((a) => ({ ...a, isDefault: a.id === addr.id }))
                          )
                        }
                        className="text-xs font-semibold text-[#15803D] hover:underline"
                      >
                        Set Default
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-[#0F294A]">
              Campus & Order Notifications
            </h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllNotificationsRead}
                className="text-xs font-semibold text-[#15803D] hover:underline inline-flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`border rounded-xl p-4 flex items-start justify-between gap-4 ${
                  n.read
                    ? 'bg-[#FFFDF9] border-[#E5DEC9]'
                    : 'bg-[#EAF6EE]/60 border-[#B7DFC4]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[#15803D]" />}
                    <h3 className="font-display font-semibold text-sm text-[#0F294A]">
                      {n.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[#233B57] mt-1">{n.message}</p>
                </div>
                <span className="font-mono text-[11px] text-[#5C6F85] shrink-0">
                  {n.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PROFILE */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-6 space-y-5">
          <h2 className="font-display font-bold text-xl text-[#0F294A]">
            Student Account Profile
          </h2>

          {!currentUser ? (
            <div className="space-y-3">
              <p className="text-sm text-[#5C6F85]">
                You are browsing in guest preview mode. Sign in or register with your university & hostel room details to save your profile.
              </p>
              <button
                type="button"
                onClick={onOpenAuth}
                className="h-10 px-5 rounded-xl bg-[#0F294A] text-white text-xs font-semibold"
              >
                Sign In / Create Account
              </button>
            </div>
          ) : (
            <form onSubmit={handleProfileSave} className="space-y-4">
              {profileSavedMsg && (
                <div className="p-3 rounded-xl bg-[#EAF6EE] border border-[#B7DFC4] text-xs text-[#14532D] font-semibold">
                  {profileSavedMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                    University
                  </label>
                  <select
                    value={editUniId}
                    onChange={(e) => {
                      setEditUniId(e.target.value);
                      const u = universities.find((x) => x.id === e.target.value);
                      if (u?.campuses[0]) {
                        setEditCampusId(u.campuses[0].id);
                        setEditHostel(u.campuses[0].hostels[0] ?? '');
                      }
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                  >
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                    Campus
                  </label>
                  <select
                    value={editCampusId}
                    onChange={(e) => {
                      setEditCampusId(e.target.value);
                      const c = editUni?.campuses.find((x) => x.id === e.target.value);
                      if (c) setEditHostel(c.hostels[0] ?? '');
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                  >
                    {editUni?.campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                    Hostel
                  </label>
                  <select
                    value={editHostel}
                    onChange={(e) => setEditHostel(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm"
                  >
                    {editCampus?.hostels.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F3] border border-[#E5DEC9] text-sm font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="h-10 px-6 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold"
              >
                Save Profile Changes
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
