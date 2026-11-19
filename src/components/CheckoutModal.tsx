import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  AddressItem,
  Campus,
  CartItem,
  Coupon,
  Order,
  PaymentMethod,
  PaymentState,
  Product,
  StudentUser,
  University,
} from '../types';
import { computeCartTotals } from './CartDrawer';
import {
  ensureCloudUserProfile,
  firebaseAuth,
  saveCloudOrder,
  signInWithGoogleAccount,
  updateCloudOrderStatus,
} from '../services/firebaseCloud';
import { storeService } from '../services/firebaseReady';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  universities: University[];
  activeUniversityId: string;
  activeCampusId: string;
  currentUser: StudentUser | null;
  savedAddresses: AddressItem[];
  cart: CartItem[];
  products: Product[];
  coupons: Coupon[];
  appliedCouponCode: string;
  onOrderCreated: (
    order: Order,
    serverSync?: { products: Product[]; notifications: import('../types').NotificationItem[] }
  ) => void;
  onTrackOrder: (orderId: string) => void;
  onCloudUserConnected?: (user: StudentUser) => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  universities,
  activeUniversityId,
  activeCampusId,
  currentUser,
  savedAddresses,
  cart,
  products,
  coupons,
  appliedCouponCode,
  onOrderCreated,
  onTrackOrder,
  onCloudUserConnected,
}: CheckoutModalProps) {
  const [step, setStep] = useState<'details' | 'payment' | 'result'>('details');

  const [universityId, setUniversityId] = useState(
    currentUser?.universityId || activeUniversityId
  );
  const selectedUni =
    universities.find((u) => u.id === universityId) ?? universities[0];
  const [campusId, setCampusId] = useState(
    currentUser?.campusId || activeCampusId || selectedUni?.campuses?.[0]?.id || ''
  );
  const selectedCampus: Campus =
    selectedUni?.campuses?.find((c) => c.id === campusId) ??
    selectedUni?.campuses?.[0];

  const [hostel, setHostel] = useState(
    currentUser?.hostel && selectedCampus?.hostels?.includes(currentUser.hostel)
      ? currentUser.hostel
      : selectedCampus?.hostels?.[0] ?? ''
  );
  const [block, setBlock] = useState(selectedCampus?.blocks?.[0] ?? 'Block A');
  const [roomNumber, setRoomNumber] = useState(currentUser?.roomNumber || '');
  const [studentName, setStudentName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.mobile || '');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [formError, setFormError] = useState('');
  const [cloudConnecting, setCloudConnecting] = useState(false);
  const [cloudSyncedEmail, setCloudSyncedEmail] = useState<string>(
    () => firebaseAuth.currentUser?.email || ''
  );

  // Demo Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Campus UPI Demo');
  const [simulating, setSimulating] = useState(false);
  const [paymentOutcome, setPaymentOutcome] = useState<PaymentState | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [cloudOrderSynced, setCloudOrderSynced] = useState(false);
  const [cloudSyncError, setCloudSyncError] = useState('');

  if (!isOpen) return null;

  const totals = computeCartTotals(
    cart,
    products,
    selectedCampus,
    coupons,
    appliedCouponCode
  );

  const handleUniSelect = (nextUniId: string) => {
    setUniversityId(nextUniId);
    const uni = universities.find((u) => u.id === nextUniId);
    const firstCamp = uni?.campuses[0];
    if (firstCamp) {
      setCampusId(firstCamp.id);
      setHostel(firstCamp.hostels[0] ?? '');
      setBlock(firstCamp.blocks[0] ?? 'Block A');
    }
  };

  const handleCampusSelect = (nextCampusId: string) => {
    setCampusId(nextCampusId);
    const camp = selectedUni.campuses.find((c) => c.id === nextCampusId);
    if (camp) {
      setHostel(camp.hostels[0] ?? '');
      setBlock(camp.blocks[0] ?? 'Block A');
    }
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (
      !studentName.trim() ||
      !/^\d{10}$/.test(phone.trim()) ||
      !hostel ||
      !block.trim() ||
      !roomNumber.trim()
    ) {
      setFormError(
        'Please fill student name, valid 10-digit phone number, hostel, block, and room number.'
      );
      return;
    }
    setStep('payment');
  };

  const handleConnectGoogleForOrder = async () => {
    setFormError('');
    setCloudConnecting(true);
    try {
      const { user, firebaseUser } = await signInWithGoogleAccount({
        universityId: selectedUni.id,
        campusId: selectedCampus.id,
        hostel,
        roomNumber: roomNumber.trim(),
        mobile: phone.trim(),
      });
      setCloudSyncedEmail(firebaseUser.email || user.email);
      if (!studentName.trim() && user.name) {
        setStudentName(user.name);
      }
      onCloudUserConnected?.(user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect Google account.';
      if (!msg.includes('popup-closed-by-user') && !msg.includes('cancelled-popup-request')) {
        setFormError(msg);
      }
    } finally {
      setCloudConnecting(false);
    }
  };

  const runDemoPayment = async (outcome: PaymentState) => {
    setFormError('');
    setCloudSyncError('');
    setCloudOrderSynced(false);
    setSimulating(true);
    try {
      // Prompt Google Sign-In directly on user gesture if not yet authenticated in Firebase
      let activeFirebaseUser = firebaseAuth.currentUser;
      let authSyncWarning = '';
      if (outcome !== 'failure' && !activeFirebaseUser) {
        try {
          const authRes = await signInWithGoogleAccount({
            universityId: selectedUni.id,
            campusId: selectedCampus.id,
            hostel,
            roomNumber: roomNumber.trim(),
            mobile: phone.trim(),
          });
          activeFirebaseUser = authRes.firebaseUser;
          setCloudSyncedEmail(authRes.firebaseUser.email || authRes.user.email);
          onCloudUserConnected?.(authRes.user);
        } catch (authErr) {
          const msg = authErr instanceof Error ? authErr.message : 'Google sign-in was skipped or blocked.';
          authSyncWarning = msg.includes('unauthorized-domain')
            ? 'Google Sign-In is not enabled for this custom domain yet in Firebase Auth settings.'
            : msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request')
            ? 'Google sign-in popup was closed before completing.'
            : 'Google sign-in popup was blocked or skipped by browser.';
        }
      }

      await new Promise((r) => setTimeout(r, 400));

      if (outcome === 'failure') {
        setPaymentOutcome('failure');
        setStep('result');
        return;
      }

      const result = await storeService.createOrder({
        userId: activeFirebaseUser?.uid || currentUser?.uid || 'guest-student',
        studentName: studentName.trim(),
        phone: phone.trim(),
        universityId: selectedUni.id,
        campusId: selectedCampus.id,
        hostel,
        block,
        roomNumber: roomNumber.trim(),
        deliveryInstructions:
          deliveryInstructions.trim() || 'Call upon arrival at hostel gate',
        items: cart,
        couponCode: totals.validCoupon?.code,
        paymentMethod,
        paymentStatus: outcome,
      });

      const finalOrder: Order = activeFirebaseUser
        ? { ...result.order, userId: activeFirebaseUser.uid }
        : result.order;

      let syncedToCloud = false;
      if (activeFirebaseUser) {
        try {
          await Promise.all([
            ensureCloudUserProfile(activeFirebaseUser, {
              name: studentName.trim(),
              mobile: phone.trim(),
              universityId: selectedUni.id,
              campusId: selectedCampus.id,
              hostel,
              roomNumber: roomNumber.trim(),
            }),
            saveCloudOrder(activeFirebaseUser, finalOrder),
          ]);
          syncedToCloud = true;
        } catch (cloudErr) {
          authSyncWarning =
            cloudErr instanceof Error ? cloudErr.message : 'Unable to sync order to cloud database.';
        }
      }

      setCreatedOrder(finalOrder);
      setCloudOrderSynced(syncedToCloud);
      setCloudSyncError(syncedToCloud ? '' : authSyncWarning);
      setPaymentOutcome(outcome);
      setStep('result');
      onOrderCreated(finalOrder, {
        products: result.products,
        notifications: result.notifications,
      });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to save order on server. Please retry.'
      );
    } finally {
      setSimulating(false);
    }
  };

  const handleSyncExistingOrderToCloud = async () => {
    if (!createdOrder) return;
    setCloudConnecting(true);
    setCloudSyncError('');
    try {
      let activeFirebaseUser = firebaseAuth.currentUser;
      if (!activeFirebaseUser) {
        const authRes = await signInWithGoogleAccount({
          universityId: createdOrder.universityId,
          campusId: createdOrder.campusId,
          hostel: createdOrder.hostel,
          roomNumber: createdOrder.roomNumber,
          mobile: createdOrder.phone,
        });
        activeFirebaseUser = authRes.firebaseUser;
        setCloudSyncedEmail(authRes.firebaseUser.email || authRes.user.email);
        onCloudUserConnected?.(authRes.user);
      }
      const syncedOrder: Order = { ...createdOrder, userId: activeFirebaseUser.uid };
      await Promise.all([
        ensureCloudUserProfile(activeFirebaseUser, {
          name: createdOrder.studentName,
          mobile: createdOrder.phone,
          universityId: createdOrder.universityId,
          campusId: createdOrder.campusId,
          hostel: createdOrder.hostel,
          roomNumber: createdOrder.roomNumber,
        }),
        saveCloudOrder(activeFirebaseUser, syncedOrder),
      ]);
      setCreatedOrder(syncedOrder);
      setCloudOrderSynced(true);
      onOrderCreated(syncedOrder);
    } catch (err) {
      setCloudSyncError(
        err instanceof Error ? err.message : 'Could not sync order with Google account.'
      );
    } finally {
      setCloudConnecting(false);
    }
  };

  const handleResolvePendingToPaid = async () => {
    if (!createdOrder) return;
    setSimulating(true);
    try {
      let updated: Order = {
        ...createdOrder,
        status: 'Confirmed',
        paymentStatus: 'success',
      };
      if (firebaseAuth.currentUser) {
        await updateCloudOrderStatus(
          createdOrder.id,
          'Confirmed',
          'success',
          createdOrder.campusName
        );
      }
      try {
        updated = await storeService.updateOrderStatus(
          createdOrder.id,
          'Confirmed',
          'success'
        );
      } catch {
        // Cloud update already succeeded
      }
      setCreatedOrder(updated);
      setPaymentOutcome('success');
      onOrderCreated(updated);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Could not update payment status on server.'
      );
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F294A]/55 backdrop-blur-[2px]">
      <div
        className="w-full max-w-3xl bg-[#FAF8F3] border border-[#E5DEC9] rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        role="dialog"
        aria-label="Campus Checkout"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#0F294A] text-white flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl">
              {step === 'details'
                ? 'Hostel Delivery Details'
                : step === 'payment'
                ? 'Demo Payment Simulator'
                : 'Order Status'}
            </h2>
            <p className="text-xs text-[#CBD5E1] mt-0.5">
              {selectedUni.shortName} · {selectedCampus.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
            aria-label="Close checkout"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form onSubmit={handleDetailsSubmit} className="lg:col-span-7 space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
                    {formError}
                  </div>
                )}

                {!cloudSyncedEmail ? (
                  <div className="bg-[#EAF6EE] border border-[#B7DFC4] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="text-xs text-[#0F294A]">
                      <p className="font-semibold">Sync your order live to UNIMART Admin</p>
                      <p className="text-[11px] text-[#14532D]">
                        Sign in with Google so the campus admin sees your name & order immediately.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={cloudConnecting}
                      onClick={() => void handleConnectGoogleForOrder()}
                      className="h-9 px-3.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {cloudConnecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      Sign In with Google
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#EAF6EE] border border-[#B7DFC4] rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs text-[#14532D]">
                    <ShieldCheck className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>
                      Cloud sync active as <strong>{cloudSyncedEmail}</strong>
                    </span>
                  </div>
                )}

                {savedAddresses.length > 0 && (
                  <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-3 space-y-2">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-[#5C6F85] font-semibold">
                      1-Click Fill Saved Hostel Room
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => {
                            setUniversityId(addr.universityId);
                            setCampusId(addr.campusId);
                            setHostel(addr.hostel);
                            setBlock(addr.block);
                            setRoomNumber(addr.roomNumber);
                            if (addr.phone) setPhone(addr.phone);
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-[#0F294A] hover:border-[#15803D] transition-colors"
                        >
                          {addr.label}: {addr.hostel} ({addr.roomNumber})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                      University *
                    </label>
                    <select
                      value={universityId}
                      onChange={(e) => handleUniSelect(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-[#FFFDF9] border border-[#E5DEC9] text-sm"
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
                      Campus *
                    </label>
                    <select
                      value={campusId}
                      onChange={(e) => handleCampusSelect(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-[#FFFDF9] border border-[#E5DEC9] text-sm"
                    >
                      {(selectedUni?.campuses ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                      Hostel *
                    </label>
                    <select
                      value={hostel}
                      onChange={(e) => setHostel(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-[#FFFDF9] border border-[#E5DEC9] text-sm"
                    >
                      {(selectedCampus?.hostels ?? []).map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                      Block / Wing *
                    </label>
                    <select
                      value={block}
                      onChange={(e) => setBlock(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-[#FFFDF9] border border-[#E5DEC9] text-sm"
                    >
                      {(selectedCampus?.blocks ?? []).map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                      Room Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="e.g. B-304"
                      className="w-full h-10 px-3 rounded-xl bg-[#FFFDF9] border border-[#E5DEC9] text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                      Student Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Full name"
                      className="w-full h-10 px-3 rounded-xl bg-[#FFFDF9] border border-[#E5DEC9] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full h-10 px-3 rounded-xl bg-[#FFFDF9] border border-[#E5DEC9] text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F294A] mb-1">
                    Delivery Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="e.g. Call me at the hostel gate after 8 PM"
                    className="w-full p-3 rounded-xl bg-[#FFFDF9] border border-[#E5DEC9] text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white font-semibold text-sm transition-colors"
                >
                  Continue to Demo Payment
                </button>
              </form>

              {/* Complete Order Summary */}
              <div className="lg:col-span-5 bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-5 h-fit space-y-4">
                <h3 className="font-display font-bold text-base text-[#0F294A]">
                  Order Summary ({cart.reduce((s, i) => s + i.quantity, 0)} items)
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 divide-y divide-[#F0EAE0]">
                  {cart.map((item) => {
                    const p = products.find((x) => x.id === item.productId);
                    if (!p) return null;
                    return (
                      <div key={p.id} className="pt-2 first:pt-0 flex justify-between gap-2 text-xs">
                        <span className="text-[#233B57] line-clamp-1">
                          {item.quantity} × {p.name}
                        </span>
                        <span className="font-mono font-semibold text-[#0F294A] shrink-0 tabular-nums">
                          ₹{(p.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-[#E5DEC9] space-y-1.5 text-xs text-[#233B57]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">₹{totals.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {totals.couponDiscount > 0 && (
                    <div className="flex justify-between text-[#15803D]">
                      <span>Coupon Discount</span>
                      <span className="font-mono tabular-nums">-₹{totals.couponDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Campus Delivery</span>
                    <span className="font-mono tabular-nums">
                      {totals.deliveryFee === 0 ? 'FREE' : `₹${totals.deliveryFee}`}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#E5DEC9] flex justify-between text-sm font-bold text-[#0F294A]">
                    <span>Payable Amount</span>
                    <span className="font-mono text-lg tabular-nums">
                      ₹{totals.finalTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-[#5C6F85] flex items-center gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
                  <span>{selectedCampus.dispatchWindow}</span>
                </div>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="max-w-xl mx-auto space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
                  {formError}
                </div>
              )}
              {!cloudSyncedEmail && (
                <div className="bg-[#EAF6EE] border border-[#B7DFC4] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="text-xs text-[#0F294A]">
                    <p className="font-semibold">1-Tap Google Sign-In before Payment</p>
                    <p className="text-[11px] text-[#14532D]">
                      Connect Google so your name and order appear live in the Campus Admin Dashboard.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={cloudConnecting}
                    onClick={() => void handleConnectGoogleForOrder()}
                    className="h-9 px-3.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {cloudConnecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    Continue with Google
                  </button>
                </div>
              )}
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
                <div className="text-xs text-[#78350F] space-y-1">
                  <p className="font-semibold">Simulated Demo Payment Gateway</p>
                  <p>
                    No real money, card numbers, or UPI PINs are collected. Test any outcome below to demonstrate Success, Failure, and Pending flows.
                  </p>
                </div>
              </div>

              <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0EAE0] pb-3">
                  <span className="text-sm font-semibold text-[#0F294A]">Order Total</span>
                  <span className="font-mono font-bold text-2xl text-[#0F294A] tabular-nums">
                    ₹{totals.finalTotal.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#0F294A]">Select Demo Payment Mode</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(['Campus UPI Demo', 'Student Wallet Demo', 'Hostel Gate Pay Demo'] as PaymentMethod[]).map(
                      (method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`p-3 rounded-xl border text-left text-xs font-semibold transition-colors ${
                            paymentMethod === method
                              ? 'bg-[#0F294A] text-white border-[#0F294A]'
                              : 'bg-[#FAF8F3] text-[#0F294A] border-[#E5DEC9] hover:border-[#0F294A]'
                          }`}
                        >
                          <CreditCard className="w-4 h-4 mb-1.5" />
                          {method}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="pt-2 space-y-2.5">
                  <p className="text-xs font-semibold text-[#5C6F85]">
                    Choose Simulated Payment Outcome:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      disabled={simulating}
                      onClick={() => runDemoPayment('success')}
                      className="h-11 px-3 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Simulate Success
                    </button>
                    <button
                      type="button"
                      disabled={simulating}
                      onClick={() => runDemoPayment('pending')}
                      className="h-11 px-3 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      <Clock className="w-4 h-4" />
                      Simulate Pending
                    </button>
                    <button
                      type="button"
                      disabled={simulating}
                      onClick={() => runDemoPayment('failure')}
                      className="h-11 px-3 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Simulate Failure
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('details')}
                className="text-xs font-semibold text-[#5C6F85] hover:text-[#0F294A]"
              >
                ← Edit Hostel Delivery Address
              </button>
            </div>
          )}

          {step === 'result' && (
            <div className="max-w-lg mx-auto bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-6 text-center space-y-4">
              {paymentOutcome === 'success' && createdOrder && (
                <>
                  <div className="w-14 h-14 rounded-full bg-[#EAF6EE] text-[#15803D] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-display font-bold text-2xl text-[#0F294A]">
                    Order Confirmed!
                  </h3>
                  <p className="text-xs text-[#5C6F85]">
                    Simulated {createdOrder.paymentMethod} succeeded. Dispatched to{' '}
                    <strong>{createdOrder.hostel}</strong> ({createdOrder.block}, Room{' '}
                    <span className="font-mono">{createdOrder.roomNumber}</span>).
                  </p>
                  <div className="bg-[#FAF8F3] border border-[#E5DEC9] rounded-xl p-3 font-mono text-sm font-bold text-[#0F294A]">
                    Order ID: {createdOrder.id}
                  </div>
                  {cloudOrderSynced ? (
                    <div className="bg-[#EAF6EE] border border-[#B7DFC4] rounded-xl p-3 text-xs text-[#14532D] font-medium">
                      Synced live to UNIMART Campus Admin ({cloudSyncedEmail || 'Google Account'}).
                    </div>
                  ) : (
                    <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3.5 text-xs text-[#78350F] space-y-2">
                      <p className="font-semibold">
                        Saved on this device only — UNIMART Admin cannot see this order yet.
                      </p>
                      {cloudSyncError && <p className="text-[11px]">{cloudSyncError}</p>}
                      <button
                        type="button"
                        disabled={cloudConnecting}
                        onClick={() => void handleSyncExistingOrderToCloud()}
                        className="w-full h-9 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white font-semibold inline-flex items-center justify-center gap-1.5"
                      >
                        {cloudConnecting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                        Sign In with Google to Send Order to Admin
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onTrackOrder(createdOrder.id);
                        onClose();
                      }}
                      className="h-10 px-5 rounded-xl bg-[#0F294A] text-white text-xs font-semibold hover:bg-[#1A3A63]"
                    >
                      Track Order Timeline
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="h-10 px-5 rounded-xl border border-[#E5DEC9] text-[#0F294A] text-xs font-semibold hover:bg-[#F3EFE6]"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </>
              )}

              {paymentOutcome === 'pending' && createdOrder && (
                <>
                  <div className="w-14 h-14 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8" />
                  </div>
                  <h3 className="font-display font-bold text-2xl text-[#0F294A]">
                    Payment Verification Pending
                  </h3>
                  <p className="text-xs text-[#5C6F85]">
                    Order <span className="font-mono font-semibold">{createdOrder.id}</span> has been logged as Pending while awaiting simulated {createdOrder.paymentMethod} confirmation.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center pt-2">
                    <button
                      type="button"
                      onClick={handleResolvePendingToPaid}
                      className="h-10 px-5 rounded-xl bg-[#15803D] text-white text-xs font-semibold hover:bg-[#166534] inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Verify & Complete Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onTrackOrder(createdOrder.id);
                        onClose();
                      }}
                      className="h-10 px-5 rounded-xl border border-[#E5DEC9] text-[#0F294A] text-xs font-semibold"
                    >
                      View Pending Order
                    </button>
                  </div>
                </>
              )}

              {paymentOutcome === 'failure' && (
                <>
                  <div className="w-14 h-14 rounded-full bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h3 className="font-display font-bold text-2xl text-[#0F294A]">
                    Simulated Payment Failed
                  </h3>
                  <p className="text-xs text-[#5C6F85]">
                    Bank server timeout simulated for {paymentMethod}. No order was charged and your cart items remain intact.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setStep('payment')}
                      className="h-10 px-5 rounded-xl bg-[#0F294A] text-white text-xs font-semibold hover:bg-[#1A3A63]"
                    >
                      Retry Payment
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="h-10 px-5 rounded-xl border border-[#E5DEC9] text-[#0F294A] text-xs font-semibold"
                    >
                      Back to Cart
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
