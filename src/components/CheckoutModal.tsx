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
import { buildOrderTimeline } from '../services/firebaseReady';

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
  onOrderCreated: (order: Order) => void;
  onTrackOrder: (orderId: string) => void;
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
}: CheckoutModalProps) {
  const [step, setStep] = useState<'details' | 'payment' | 'result'>('details');

  const [universityId, setUniversityId] = useState(
    currentUser?.universityId || activeUniversityId
  );
  const selectedUni =
    universities.find((u) => u.id === universityId) ?? universities[0];
  const [campusId, setCampusId] = useState(
    currentUser?.campusId || activeCampusId || selectedUni.campuses[0].id
  );
  const selectedCampus: Campus =
    selectedUni.campuses.find((c) => c.id === campusId) ??
    selectedUni.campuses[0];

  const [hostel, setHostel] = useState(
    currentUser?.hostel && selectedCampus.hostels.includes(currentUser.hostel)
      ? currentUser.hostel
      : selectedCampus.hostels[0] ?? ''
  );
  const [block, setBlock] = useState(selectedCampus.blocks[0] ?? 'Block A');
  const [roomNumber, setRoomNumber] = useState(currentUser?.roomNumber || '');
  const [studentName, setStudentName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.mobile || '');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [formError, setFormError] = useState('');

  // Demo Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Campus UPI Demo');
  const [simulating, setSimulating] = useState(false);
  const [paymentOutcome, setPaymentOutcome] = useState<PaymentState | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

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

  const createOrderRecord = (paymentStatus: PaymentState): Order => {
    const orderId = `UNI-2604-${Math.floor(1000 + Math.random() * 9000)}`;
    const status = paymentStatus === 'success' ? 'Confirmed' : 'Pending';

    const items = cart
      .map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (!prod) return null;
        return {
          productId: prod.id,
          name: prod.name,
          category: prod.category,
          price: prod.price,
          quantity: item.quantity,
          image: prod.image,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    return {
      id: orderId,
      userId: currentUser?.uid || 'guest-student',
      studentName: studentName.trim(),
      phone: phone.trim(),
      universityId: selectedUni.id,
      universityName: selectedUni.name,
      campusId: selectedCampus.id,
      campusName: selectedCampus.name,
      hostel,
      block,
      roomNumber: roomNumber.trim(),
      deliveryInstructions: deliveryInstructions.trim() || 'Call upon arrival at hostel gate',
      items,
      subtotal: totals.subtotal,
      discount: totals.couponDiscount,
      couponCode: totals.validCoupon?.code,
      deliveryFee: totals.deliveryFee,
      total: totals.finalTotal,
      paymentMethod,
      paymentStatus,
      status,
      createdAt: new Date().toISOString(),
      timeline: buildOrderTimeline(status, selectedCampus.name),
    };
  };

  const runDemoPayment = async (outcome: PaymentState) => {
    setSimulating(true);
    await new Promise((r) => setTimeout(r, 750));
    setSimulating(false);
    setPaymentOutcome(outcome);
    setStep('result');

    if (outcome === 'success' || outcome === 'pending') {
      const order = createOrderRecord(outcome);
      setCreatedOrder(order);
      onOrderCreated(order);
    }
  };

  const handleResolvePendingToPaid = () => {
    if (!createdOrder) return;
    const paidOrder: Order = {
      ...createdOrder,
      paymentStatus: 'success',
      status: 'Confirmed',
      timeline: buildOrderTimeline('Confirmed', createdOrder.campusName),
    };
    setCreatedOrder(paidOrder);
    setPaymentOutcome('success');
    onOrderCreated(paidOrder);
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
                      {selectedUni.campuses.map((c) => (
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
                      {selectedCampus.hostels.map((h) => (
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
                      {selectedCampus.blocks.map((b) => (
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
