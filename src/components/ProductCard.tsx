import { Heart, Minus, Plus, ShoppingBag, Star } from 'lucide-react';
import { Product } from '../types';
import { ResilientImage } from './ResilientImage';

interface ProductCardProps {
  product: Product;
  campusId: string;
  cartQuantity: number;
  isWishlisted: boolean;
  onOpenDetail: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onUpdateCartQty: (productId: string, delta: number) => void;
  onToggleWishlist: (productId: string) => void;
}

export function ProductCard({
  product,
  campusId,
  cartQuantity,
  isWishlisted,
  onOpenDetail,
  onAddToCart,
  onUpdateCartQty,
  onToggleWishlist,
}: ProductCardProps) {
  const stock = product.stockByCampus[campusId] ?? 0;
  const discountPct = Math.round(((product.mrp - product.price) / product.mrp) * 100);
  const outOfStock = stock <= 0;

  return (
    <article className="group bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:border-[#0F294A]/35 hover:shadow-[0_12px_28px_-12px_rgba(15,41,74,0.14)]">
      {/* Product Image */}
      <div className="relative aspect-[4/3] bg-[#F3EFE6] overflow-hidden">
        <button
          type="button"
          onClick={() => onOpenDetail(product)}
          className="w-full h-full block text-left focus:outline-none"
          aria-label={`View details for ${product.name}`}
        >
          <ResilientImage
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </button>

        {/* Wishlist toggle */}
        <button
          type="button"
          onClick={() => onToggleWishlist(product.id)}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
            isWishlisted
              ? 'bg-[#0F294A] border-[#0F294A] text-white'
              : 'bg-[#FFFDF9]/92 border-[#E5DEC9] text-[#0F294A] hover:bg-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {outOfStock && (
          <div className="absolute inset-0 bg-[#FAF8F3]/80 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#B91C1C] bg-[#FFFDF9] px-3 py-1.5 border border-[#FCA5A5] rounded-md">
              Out of Stock at Campus
            </span>
          </div>
        )}
      </div>

      {/* Card Content — Zero-pill editorial metadata */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-[#5C6F85]">
          <span className="truncate">
            {product.category} · {product.unitLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-[#0F294A] font-semibold shrink-0 tabular-nums">
            <Star className="w-3 h-3 fill-[#15803D] text-[#15803D]" />
            {product.rating.toFixed(1)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpenDetail(product)}
          className="mt-1.5 text-left focus:outline-none group/title"
        >
          <h3 className="font-display font-semibold text-[15px] leading-snug text-[#0F294A] line-clamp-2 group-hover/title:text-[#15803D] transition-colors">
            {product.name}
          </h3>
        </button>

        <p className="mt-1.5 text-xs text-[#5C6F85] line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        {/* Bottom Pricing + Action */}
        <div className="mt-auto pt-3.5 border-t border-[#F0EAE0] flex items-end justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono font-semibold text-lg text-[#0F294A] tabular-nums">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              <span className="font-mono text-xs text-[#8A98A9] line-through tabular-nums">
                ₹{product.mrp.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[11px] font-mono font-medium text-[#15803D] tabular-nums">
              {discountPct}% off · {outOfStock ? 'Restocking soon' : `${stock} in campus hub`}
            </p>
          </div>

          {cartQuantity > 0 ? (
            <div className="inline-flex items-center border border-[#0F294A] bg-[#0F294A] text-white rounded-lg overflow-hidden h-9 shrink-0">
              <button
                type="button"
                onClick={() => onUpdateCartQty(product.id, -1)}
                className="px-2.5 h-full hover:bg-[#1A3A63] transition-colors flex items-center justify-center"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-xs font-semibold tabular-nums min-w-[24px] text-center">
                {cartQuantity}
              </span>
              <button
                type="button"
                disabled={cartQuantity >= stock}
                onClick={() => onUpdateCartQty(product.id, 1)}
                className="px-2.5 h-full hover:bg-[#1A3A63] disabled:opacity-40 transition-colors flex items-center justify-center"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => onAddToCart(product)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold bg-[#15803D] text-white hover:bg-[#166534] disabled:bg-[#E5DEC9] disabled:text-[#8A98A9] transition-colors shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
