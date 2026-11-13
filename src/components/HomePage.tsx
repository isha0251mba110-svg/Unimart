import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Backpack,
  BookOpen,
  CheckCircle2,
  Coffee,
  Cookie,
  LampDesk,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  Truck,
  Utensils,
  Zap,
} from 'lucide-react';
import { CATEGORIES, COMBO_OFFERS, HERO_BANNER_IMAGE, TESTIMONIALS } from '../data/products';
import { Campus, CategoryId, ComboOffer, Product, University } from '../types';
import { ProductCard } from './ProductCard';
import { ResilientImage } from './ResilientImage';

interface HomePageProps {
  university: University;
  campus: Campus;
  products: Product[];
  cartMap: Record<string, number>;
  wishlistIds: string[];
  onShopNow: () => void;
  onSearchSubmit: (query: string) => void;
  onSelectCategory: (category: CategoryId) => void;
  onOpenDetail: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onUpdateCartQty: (productId: string, delta: number) => void;
  onToggleWishlist: (productId: string) => void;
  onAddComboToCart: (combo: ComboOffer) => void;
  onOpenAdmin: () => void;
  onOpenAuth: () => void;
}

const ICON_MAP: Record<string, typeof Cookie> = {
  Cookie,
  Coffee,
  Utensils,
  Sparkles,
  BookOpen,
  LampDesk,
  Shirt,
  Zap,
  ShieldCheck,
  Backpack,
};

export function HomePage({
  university,
  campus,
  products,
  cartMap,
  wishlistIds,
  onShopNow,
  onSearchSubmit,
  onSelectCategory,
  onOpenDetail,
  onAddToCart,
  onUpdateCartQty,
  onToggleWishlist,
  onAddComboToCart,
  onOpenAdmin,
  onOpenAuth,
}: HomePageProps) {
  const [homeQuery, setHomeQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    const q = homeQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [products, homeQuery]);

  const trendingProducts = products.filter((p) => p.isTrending).slice(0, 4);
  const bestsellerProducts = products.filter((p) => p.isBestseller).slice(0, 4);
  const studentDealProducts = products.filter((p) => p.isStudentDeal).slice(0, 4);

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    onSearchSubmit(homeQuery);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* 1. Hero Banner */}
      <section className="relative border-b border-[#E5DEC9] bg-[#0F294A] text-[#FAF8F3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#A7F3D0] tracking-wide">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                Serving {university.shortName} · {campus.name} ({campus.dispatchWindow})
              </span>
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-[54px] leading-[1.06] tracking-tight text-white">
              Campus shopping. <span className="text-[#4ADE80]">Made simple.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#CBD5E1] max-w-xl leading-relaxed">
              {products.length} hostel essentials across 10 categories—snacks, Maggi, stationery, laundry, room setup, and electronics delivered to your hostel gate.
            </p>

            {/* Quick Hero Search with Live Product Suggestions */}
            <div className="relative max-w-lg">
              <form onSubmit={handleSearchFormSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#5C6F85] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={homeQuery}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                    onChange={(e) => {
                      setHomeQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    placeholder="Search Maggi, Kurkure, power bank, bucket, pillow..."
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#FFFDF9] text-[#0F294A] placeholder:text-[#8A98A9] text-sm focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="h-11 px-4 rounded-xl bg-[#15803D] hover:bg-[#16A34A] text-white text-xs font-semibold shrink-0 transition-colors"
                >
                  Search
                </button>
              </form>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-12 z-30 bg-[#FFFDF9] text-[#0F294A] border border-[#E5DEC9] rounded-xl shadow-2xl overflow-hidden divide-y divide-[#F0EAE0]">
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={() => {
                        setShowSuggestions(false);
                        onOpenDetail(item);
                      }}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#F3EFE6] text-left transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ResilientImage
                          src={item.image}
                          alt={item.name}
                          className="w-9 h-9 rounded-lg object-cover shrink-0 border border-[#E5DEC9]"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#0F294A] truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-[#5C6F85]">
                            {item.category} · {item.unitLabel}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#15803D] tabular-nums shrink-0">
                        ₹{item.price}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onShopNow}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-[#15803D] hover:bg-[#16A34A] text-white font-semibold text-sm transition-colors shadow-sm"
              >
                Shop Now
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#combos-section"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-xl border border-white/25 text-white hover:bg-white/10 font-semibold text-sm transition-colors"
              >
                Explore Hostel Combos
              </a>
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#CBD5E1]">
              <span className="inline-flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#4ADE80]" />
                Free delivery above ₹{campus.freeDeliveryAbove}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
                Live campus-specific inventory
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#4ADE80]" />
                {campus.hostels.length} hostels covered
              </span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-2xl aspect-[16/10] bg-[#16345B]">
              <ResilientImage
                src={HERO_BANNER_IMAGE}
                alt="UNIMART Indian campus hostel essentials flatlay"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. All 10 Product Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[#15803D] font-semibold">
              10 Campus Aisles
            </p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#0F294A] mt-1">
              Shop by Hostel Category
            </h2>
          </div>
          <button
            type="button"
            onClick={onShopNow}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F294A] hover:text-[#15803D] transition-colors self-start sm:self-auto"
          >
            Browse all {products.length} products
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {CATEGORIES.map((cat) => {
            const IconComponent = ICON_MAP[cat.iconKey] || Package;
            const count = products.filter((p) => p.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className="group text-left bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-4 hover:border-[#0F294A] hover:shadow-sm transition-all flex flex-col justify-between min-h-[112px]"
              >
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-lg bg-[#F3EFE6] text-[#0F294A] group-hover:bg-[#0F294A] group-hover:text-white flex items-center justify-center transition-colors">
                    <IconComponent className="w-4 h-4" />
                  </span>
                  <span className="font-mono text-[11px] text-[#5C6F85] tabular-nums">
                    {count} items
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="font-display font-semibold text-sm text-[#0F294A] group-hover:text-[#15803D] transition-colors">
                    {cat.id}
                  </h3>
                  <p className="text-xs text-[#5C6F85] mt-0.5 line-clamp-1">
                    {cat.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Trending Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[#15803D] font-semibold">
              Popular at {university.shortName}
            </p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#0F294A] mt-1">
              Trending on Campus
            </h2>
          </div>
          <button
            type="button"
            onClick={onShopNow}
            className="text-sm font-semibold text-[#0F294A] hover:text-[#15803D] inline-flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {trendingProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              campusId={campus.id}
              cartQuantity={cartMap[product.id] ?? 0}
              isWishlisted={wishlistIds.includes(product.id)}
              onOpenDetail={onOpenDetail}
              onAddToCart={onAddToCart}
              onUpdateCartQty={onUpdateCartQty}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      </section>

      {/* 4. Combo Offers */}
      <section id="combos-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-mono uppercase tracking-wider text-[#15803D] font-semibold">
            Curated Hostel Bundles
          </p>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#0F294A] mt-1">
            Value Combo Offers
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {COMBO_OFFERS.map((combo) => {
            const comboItems = combo.productIds
              .map((id) => products.find((p) => p.id === id))
              .filter((p): p is Product => Boolean(p));

            return (
              <div
                key={combo.id}
                className={`rounded-2xl p-6 flex flex-col justify-between border ${
                  combo.accentColor === 'green'
                    ? 'bg-[#EAF6EE] border-[#B7DFC4] text-[#0F294A]'
                    : 'bg-[#0F294A] border-[#0F294A] text-[#FAF8F3]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-mono text-xs font-semibold uppercase tracking-wider ${
                        combo.accentColor === 'green' ? 'text-[#15803D]' : 'text-[#4ADE80]'
                      }`}
                    >
                      {combo.badge}
                    </span>
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        combo.accentColor === 'green' ? 'text-[#5C6F85]' : 'text-[#CBD5E1]'
                      }`}
                    >
                      {comboItems.length} products
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-xl mt-2">
                    {combo.title}
                  </h3>
                  <p
                    className={`text-xs mt-1.5 leading-relaxed ${
                      combo.accentColor === 'green' ? 'text-[#233B57]' : 'text-[#CBD5E1]'
                    }`}
                  >
                    {combo.subtitle}
                  </p>

                  {/* Preview Thumbnails */}
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {comboItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenDetail(item)}
                        className="aspect-square rounded-lg overflow-hidden border border-black/10 bg-white hover:opacity-90 transition-opacity"
                        title={item.name}
                      >
                        <ResilientImage
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={`mt-5 pt-4 border-t flex items-center justify-between gap-3 ${
                    combo.accentColor === 'green' ? 'border-[#C5E4CF]' : 'border-white/15'
                  }`}
                >
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono font-bold text-xl tabular-nums">
                        ₹{combo.comboPrice.toLocaleString('en-IN')}
                      </span>
                      <span
                        className={`font-mono text-xs line-through tabular-nums ${
                          combo.accentColor === 'green' ? 'text-[#5C6F85]' : 'text-[#94A3B8]'
                        }`}
                      >
                        ₹{combo.originalPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddComboToCart(combo)}
                    className={`h-10 px-4 rounded-lg text-xs font-semibold transition-colors ${
                      combo.accentColor === 'green'
                        ? 'bg-[#0F294A] text-white hover:bg-[#1A3A63]'
                        : 'bg-[#15803D] text-white hover:bg-[#16A34A]'
                    }`}
                  >
                    Add Bundle to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Bestsellers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[#15803D] font-semibold">
              Most Reordered
            </p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#0F294A] mt-1">
              Hostel Bestsellers
            </h2>
          </div>
          <button
            type="button"
            onClick={onShopNow}
            className="text-sm font-semibold text-[#0F294A] hover:text-[#15803D] inline-flex items-center gap-1"
          >
            Explore all
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {bestsellerProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              campusId={campus.id}
              cartQuantity={cartMap[product.id] ?? 0}
              isWishlisted={wishlistIds.includes(product.id)}
              onOpenDetail={onOpenDetail}
              onAddToCart={onAddToCart}
              onUpdateCartQty={onUpdateCartQty}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      </section>

      {/* 6. Student Deals */}
      <section id="deals-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#F3EFE6] border border-[#E5DEC9] rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-[#15803D] font-semibold">
                Up to 50% Off MRP · Use Code UNIFIRST
              </p>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#0F294A] mt-1">
                Student Deals of the Week
              </h2>
            </div>
            <button
              type="button"
              onClick={onShopNow}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F294A] hover:text-[#15803D]"
            >
              See all discounts
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {studentDealProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                campusId={campus.id}
                cartQuantity={cartMap[product.id] ?? 0}
                isWishlisted={wishlistIds.includes(product.id)}
                onOpenDetail={onOpenDetail}
                onAddToCart={onAddToCart}
                onUpdateCartQty={onUpdateCartQty}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 7. Student Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-mono uppercase tracking-wider text-[#15803D] font-semibold">
            Across 4 Partner Universities
          </p>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#0F294A] mt-1">
            Trusted by Hostel Residents
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-0.5 text-[#15803D] mb-3">
                  {Array.from({ length: t.rating }).map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-[#233B57] leading-relaxed">
                  “{t.quote}”
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-[#F0EAE0]">
                <p className="font-display font-semibold text-sm text-[#0F294A]">
                  {t.name}
                </p>
                <p className="text-xs text-[#5C6F85]">
                  {t.program} · {t.hostel}, {t.universityShort}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="border-t border-[#E5DEC9] bg-[#0F294A] text-[#CBD5E1] pt-12 pb-20 md:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <span className="w-8 h-8 rounded-lg bg-[#15803D] text-white font-display font-bold text-base flex items-center justify-center">
                U
              </span>
              <span className="font-display font-bold text-lg tracking-tight">UNIMART</span>
            </div>
            <p className="text-xs leading-relaxed text-[#CBD5E1]">
              Campus shopping. Made simple. Built for Indian university students living in campus hostels—snacks, stationery, laundry, and room setup delivered fast.
            </p>
            <p className="text-[11px] font-mono text-[#94A3B8]">
              Architecture: Firebase Auth & Firestore ready (Demo persistence active).
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold text-sm text-white mb-3">
              Popular Categories
            </h4>
            <ul className="space-y-2 text-xs">
              {CATEGORIES.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCategory(c.id)}
                    className="hover:text-[#4ADE80] transition-colors"
                  >
                    {c.id}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-sm text-white mb-3">
              Hostel Living
            </h4>
            <ul className="space-y-2 text-xs">
              {CATEGORIES.slice(5).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCategory(c.id)}
                    className="hover:text-[#4ADE80] transition-colors"
                  >
                    {c.id}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-sm text-white mb-3">
              Student & Ops Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button type="button" onClick={onShopNow} className="hover:text-[#4ADE80] transition-colors">
                  Browse Full Catalogue
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenAuth} className="hover:text-[#4ADE80] transition-colors">
                  Student Login / Register
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenAdmin} className="hover:text-[#4ADE80] transition-colors">
                  UNIMART Admin Console
                </button>
              </li>
              <li className="pt-2 text-[11px] text-[#94A3B8]">
                Promo codes: <span className="font-mono text-white">UNIFIRST</span> ·{' '}
                <span className="font-mono text-white">HOSTEL10</span> ·{' '}
                <span className="font-mono text-white">EXAMFUEL</span>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
