import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Heart,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  Zap,
} from 'lucide-react';
import { Campus, Product, University } from '../types';
import { ProductCard } from './ProductCard';
import { ResilientImage } from './ResilientImage';

interface ProductDetailViewProps {
  product: Product;
  university: University;
  campus: Campus;
  relatedProducts: Product[];
  cartMap: Record<string, number>;
  wishlistIds: string[];
  onBack: () => void;
  onOpenDetail: (product: Product) => void;
  onAddQuantityToCart: (product: Product, qty: number) => void;
  onBuyNow: (product: Product, qty: number) => void;
  onUpdateCartQty: (productId: string, delta: number) => void;
  onToggleWishlist: (productId: string) => void;
}

export function ProductDetailView({
  product,
  university,
  campus,
  relatedProducts,
  cartMap,
  wishlistIds,
  onBack,
  onOpenDetail,
  onAddQuantityToCart,
  onBuyNow,
  onUpdateCartQty,
  onToggleWishlist,
}: ProductDetailViewProps) {
  const [quantity, setQuantity] = useState(1);
  const stock = product.stockByCampus?.[campus.id] ?? 0;
  const outOfStock = stock <= 0;
  const discountPct =
    product.mrp > 0 ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  const savings = Math.max(0, product.mrp - product.price);
  const isWishlisted = wishlistIds.includes(product.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-12">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#5C6F85] hover:text-[#0F294A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalogue
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Product Image */}
        <div className="lg:col-span-6 bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl overflow-hidden aspect-[4/3] relative">
          <ResilientImage
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => onToggleWishlist(product.id)}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            className={`absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
              isWishlisted
                ? 'bg-[#0F294A] border-[#0F294A] text-white'
                : 'bg-[#FFFDF9]/95 border-[#E5DEC9] text-[#0F294A] hover:bg-white'
            }`}
          >
            <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Product Info & Actions */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#5C6F85]">
              <span className="text-[#15803D] font-semibold uppercase">{product.category}</span>
              <span>·</span>
              <span>{product.brand}</span>
              <span>·</span>
              <span>SKU {product.sku}</span>
            </div>

            <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0F294A] mt-2 leading-tight">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F294A] tabular-nums">
                <Star className="w-4 h-4 fill-[#15803D] text-[#15803D]" />
                {(product.rating ?? 4.5).toFixed(1)}
                <span className="text-[#5C6F85] font-normal">
                  ({product.reviewCount} verified student reviews)
                </span>
              </span>
              <span className="text-xs font-mono text-[#5C6F85]">{product.unitLabel}</span>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-5 space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="font-mono font-bold text-3xl text-[#0F294A] tabular-nums">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              <span className="font-mono text-base text-[#8A98A9] line-through tabular-nums">
                MRP ₹{product.mrp.toLocaleString('en-IN')}
              </span>
              <span className="font-mono text-xs font-bold text-[#15803D] bg-[#EAF6EE] px-2 py-0.5 rounded">
                SAVE ₹{savings} ({discountPct}% OFF)
              </span>
            </div>
            <p className="text-xs text-[#5C6F85]">
              Inclusive of all taxes · Campus student pricing
            </p>
          </div>

          {/* Campus Inventory Status */}
          <div className="bg-[#F3EFE6] border border-[#E5DEC9] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#15803D] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#0F294A]">
                  {university.shortName} · {campus.name}
                </p>
                <p className="text-xs text-[#5C6F85]">{campus.dispatchWindow}</p>
              </div>
            </div>
            <span
              className={`font-mono text-xs font-semibold tabular-nums ${
                outOfStock ? 'text-[#B91C1C]' : stock <= 8 ? 'text-[#B45309]' : 'text-[#15803D]'
              }`}
            >
              {outOfStock
                ? 'Out of stock here'
                : stock <= 8
                ? `Only ${stock} left at hub`
                : `${stock} units ready`}
            </span>
          </div>

          {/* Description & Highlights */}
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-base text-[#0F294A]">
              About this Hostel Essential
            </h2>
            <p className="text-sm text-[#233B57] leading-relaxed">{product.description}</p>
            <ul className="space-y-1.5 pt-1">
              {(product.highlights ?? []).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-[#233B57]">
                  <Check className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quantity + Add to Cart + Buy Now */}
          <div className="pt-2 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center border border-[#E5DEC9] bg-[#FFFDF9] rounded-xl h-12">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3.5 h-full text-[#0F294A] disabled:opacity-35 hover:bg-[#F3EFE6] rounded-l-xl transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 font-mono text-sm font-semibold text-[#0F294A] tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={outOfStock || quantity >= stock}
                  onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                  className="px-3.5 h-full text-[#0F294A] disabled:opacity-35 hover:bg-[#F3EFE6] rounded-r-xl transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={outOfStock}
                onClick={() => onAddQuantityToCart(product, quantity)}
                className="flex-1 min-w-[160px] h-12 px-5 rounded-xl bg-[#0F294A] hover:bg-[#1A3A63] disabled:bg-[#E5DEC9] disabled:text-[#8A98A9] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                Add to Cart
              </button>

              <button
                type="button"
                disabled={outOfStock}
                onClick={() => onBuyNow(product, quantity)}
                className="flex-1 min-w-[150px] h-12 px-5 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:bg-[#E5DEC9] disabled:text-[#8A98A9] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Buy Now
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs text-[#5C6F85] pt-1">
              <span className="inline-flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#15803D]" />
                Free campus delivery on orders ₹{campus.freeDeliveryAbove}+
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#15803D]" />
                Sealed brand-authentic stock
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="pt-8 border-t border-[#E5DEC9]">
          <h2 className="font-display font-bold text-2xl text-[#0F294A] mb-5">
            More from {product.category} & Hostel Essentials
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {relatedProducts.map((rel) => (
              <ProductCard
                key={rel.id}
                product={rel}
                campusId={campus.id}
                cartQuantity={cartMap[rel.id] ?? 0}
                isWishlisted={wishlistIds.includes(rel.id)}
                onOpenDetail={onOpenDetail}
                onAddToCart={(p) => onAddQuantityToCart(p, 1)}
                onUpdateCartQty={onUpdateCartQty}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
