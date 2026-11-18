import { useState } from 'react';
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { Campus, CartItem, Coupon, Product } from '../types';
import { ResilientImage } from './ResilientImage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  campus: Campus;
  cart: CartItem[];
  products: Product[];
  coupons: Coupon[];
  appliedCouponCode: string;
  onApplyCoupon: (code: string) => void;
  onUpdateQty: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
}

export function computeCartTotals(
  cart: CartItem[],
  products: Product[],
  campus: Campus,
  coupons: Coupon[],
  appliedCouponCode: string
) {
  let subtotal = 0;
  let mrpTotal = 0;

  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;
    subtotal += product.price * item.quantity;
    mrpTotal += product.mrp * item.quantity;
  }

  const productSavings = Math.max(0, mrpTotal - subtotal);

  let couponDiscount = 0;
  let validCoupon: Coupon | null = null;
  if (appliedCouponCode) {
    const found = coupons.find(
      (c) => c.code.toUpperCase() === appliedCouponCode.toUpperCase() && c.active
    );
    if (found && subtotal >= found.minCartValue) {
      validCoupon = found;
      if (found.discountType === 'flat') {
        couponDiscount = found.discountValue;
      } else {
        const rawPct = Math.round((subtotal * found.discountValue) / 100);
        couponDiscount = found.maxDiscount ? Math.min(rawPct, found.maxDiscount) : rawPct;
      }
      couponDiscount = Math.min(couponDiscount, subtotal);
    }
  }

  const afterDiscount = Math.max(0, subtotal - couponDiscount);
  const deliveryFee =
    cart.length === 0
      ? 0
      : afterDiscount >= campus.freeDeliveryAbove
      ? 0
      : campus.deliveryFee;

  const finalTotal = afterDiscount + deliveryFee;

  return {
    subtotal,
    mrpTotal,
    productSavings,
    couponDiscount,
    validCoupon,
    deliveryFee,
    finalTotal,
  };
}

export function CartDrawer({
  isOpen,
  onClose,
  campus,
  cart,
  products,
  coupons,
  appliedCouponCode,
  onApplyCoupon,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
}: CartDrawerProps) {
  const [couponInput, setCouponInput] = useState(appliedCouponCode);
  const [couponMsg, setCouponMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!isOpen) return null;

  const totals = computeCartTotals(cart, products, campus, coupons, appliedCouponCode);
  const remainingForFreeDelivery = Math.max(
    0,
    campus.freeDeliveryAbove - (totals.subtotal - totals.couponDiscount)
  );

  const handleCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      onApplyCoupon('');
      setCouponMsg(null);
      return;
    }
    const found = coupons.find((c) => c.code.toUpperCase() === code && c.active);
    if (!found) {
      setCouponMsg({ type: 'err', text: 'Invalid or expired promo code.' });
      return;
    }
    if (totals.subtotal < found.minCartValue) {
      setCouponMsg({
        type: 'err',
        text: `Add ₹${found.minCartValue - totals.subtotal} more to use ${found.code}.`,
      });
      return;
    }
    onApplyCoupon(found.code);
    setCouponMsg({ type: 'ok', text: `Coupon ${found.code} applied!` });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0F294A]/45 backdrop-blur-[2px]">
      <div
        className="w-full max-w-md bg-[#FAF8F3] h-full flex flex-col border-l border-[#E5DEC9] shadow-2xl"
        role="dialog"
        aria-label="Shopping Cart"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#FFFDF9] border-b border-[#E5DEC9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#0F294A]" />
            <div>
              <h2 className="font-display font-bold text-lg text-[#0F294A]">
                Hostel Cart
              </h2>
              <p className="text-[11px] text-[#5C6F85]">
                Dispatching from {campus.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-xs font-medium text-[#B91C1C] hover:underline px-2 py-1"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-[#E5DEC9] flex items-center justify-center text-[#0F294A] hover:bg-[#F3EFE6]"
              aria-label="Close cart"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cart Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="w-12 h-12 text-[#8A98A9] stroke-[1.4] mb-3" />
              <h3 className="font-display font-bold text-lg text-[#0F294A]">
                Your hostel cart is empty
              </h3>
              <p className="text-xs text-[#5C6F85] mt-1 max-w-xs">
                Add snacks, Maggi, stationery, or hostel room essentials to get fast campus delivery.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 h-10 px-5 rounded-lg bg-[#0F294A] text-white text-xs font-semibold hover:bg-[#1A3A63]"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <>
              {/* Free Delivery Progress */}
              <div className="bg-[#EAF6EE] border border-[#B7DFC4] rounded-xl p-3 text-xs text-[#14532D]">
                {remainingForFreeDelivery === 0 ? (
                  <span className="font-semibold">
                    Free campus gate delivery unlocked for {campus.name}!
                  </span>
                ) : (
                  <span>
                    Add <strong className="font-mono">₹{remainingForFreeDelivery}</strong> more for{' '}
                    <strong>FREE campus delivery</strong> (save ₹{campus.deliveryFee}).
                  </span>
                )}
              </div>

              {/* Cart Items */}
              <div className="space-y-3">
                {cart.map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  if (!product) return null;
                  const maxStock = product.stockByCampus?.[campus.id] ?? 0;

                  return (
                    <div
                      key={product.id}
                      className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-3 flex gap-3"
                    >
                      <ResilientImage
                        src={product.image}
                        alt={product.name}
                        className="w-16 h-16 rounded-lg object-cover border border-[#E5DEC9] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-display font-semibold text-xs text-[#0F294A] line-clamp-2">
                            {product.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(product.id)}
                            className="text-[#8A98A9] hover:text-[#B91C1C] shrink-0"
                            aria-label={`Remove ${product.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-[#5C6F85] mt-0.5">{product.unitLabel}</p>

                        <div className="mt-2.5 flex items-center justify-between">
                          <div className="inline-flex items-center border border-[#E5DEC9] rounded-lg bg-[#FAF8F3] h-7">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(product.id, -1)}
                              className="px-2 h-full text-[#0F294A] hover:bg-[#EAE3D5] rounded-l-lg"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 font-mono text-xs font-semibold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={item.quantity >= maxStock}
                              onClick={() => onUpdateQty(product.id, 1)}
                              className="px-2 h-full text-[#0F294A] disabled:opacity-35 hover:bg-[#EAE3D5] rounded-r-lg"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="font-mono font-semibold text-sm text-[#0F294A] tabular-nums">
                            ₹{(product.price * item.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Box */}
              <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-3.5 space-y-2.5">
                <form onSubmit={handleCouponSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-[#5C6F85] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Promo code (e.g. UNIFIRST)"
                      className="w-full h-9 pl-8 pr-3 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-mono uppercase text-[#0F294A] focus:outline-none focus:border-[#0F294A]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-9 px-3.5 rounded-lg bg-[#0F294A] text-white text-xs font-semibold hover:bg-[#1A3A63]"
                  >
                    Apply
                  </button>
                </form>

                {couponMsg && (
                  <p
                    className={`text-[11px] font-medium ${
                      couponMsg.type === 'ok' ? 'text-[#15803D]' : 'text-[#B91C1C]'
                    }`}
                  >
                    {couponMsg.text}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {coupons
                    .filter((c) => c.active)
                    .slice(0, 3)
                    .map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCouponInput(c.code);
                          if (totals.subtotal >= c.minCartValue) {
                            onApplyCoupon(c.code);
                            setCouponMsg({ type: 'ok', text: `Coupon ${c.code} applied!` });
                          } else {
                            setCouponMsg({
                              type: 'err',
                              text: `Min order ₹${c.minCartValue} required for ${c.code}.`,
                            });
                          }
                        }}
                        className="text-[10px] font-mono px-2 py-1 rounded border border-dashed border-[#15803D]/50 text-[#15803D] hover:bg-[#EAF6EE]"
                      >
                        {c.code}
                      </button>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bill Summary & Checkout CTA */}
        {cart.length > 0 && (
          <div className="p-5 bg-[#FFFDF9] border-t border-[#E5DEC9] space-y-3">
            <div className="space-y-1.5 text-xs text-[#233B57]">
              <div className="flex justify-between">
                <span>Item Subtotal</span>
                <span className="font-mono tabular-nums">
                  ₹{totals.subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-[#15803D]">
                <span>MRP Student Savings</span>
                <span className="font-mono tabular-nums">
                  -₹{totals.productSavings.toLocaleString('en-IN')}
                </span>
              </div>
              {totals.couponDiscount > 0 && (
                <div className="flex justify-between text-[#15803D] font-semibold">
                  <span>Coupon ({totals.validCoupon?.code})</span>
                  <span className="font-mono tabular-nums">
                    -₹{totals.couponDiscount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Campus Gate Delivery</span>
                <span className="font-mono tabular-nums">
                  {totals.deliveryFee === 0 ? (
                    <span className="text-[#15803D] font-semibold">FREE</span>
                  ) : (
                    `₹${totals.deliveryFee}`
                  )}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E5DEC9] flex justify-between items-baseline text-sm font-bold text-[#0F294A]">
                <span>Final Total</span>
                <span className="font-mono text-lg tabular-nums">
                  ₹{totals.finalTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedToCheckout}
              className="w-full h-11 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors"
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
