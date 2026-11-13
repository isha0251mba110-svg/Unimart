import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  PackageX,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import { CATEGORIES } from '../data/products';
import { Campus, CategoryId, Product, SortOption, University } from '../types';
import { ProductCard } from './ProductCard';
import { ResilientImage } from './ResilientImage';

interface CatalogViewProps {
  university: University;
  campus: Campus;
  products: Product[];
  selectedCategory: CategoryId | 'All';
  onSelectCategory: (category: CategoryId | 'All') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cartMap: Record<string, number>;
  wishlistIds: string[];
  onOpenDetail: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onUpdateCartQty: (productId: string, delta: number) => void;
  onToggleWishlist: (productId: string) => void;
}

export function CatalogView({
  university,
  campus,
  products,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  cartMap,
  wishlistIds,
  onOpenDetail,
  onAddToCart,
  onUpdateCartQty,
  onToggleWishlist,
}: CatalogViewProps) {
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isLoadingFilter, setIsLoadingFilter] = useState<boolean>(false);

  // Brief simulated loading state when switching categories for smooth UX feedback
  useEffect(() => {
    setIsLoadingFilter(true);
    const timer = setTimeout(() => setIsLoadingFilter(false), 160);
    return () => clearTimeout(timer);
  }, [selectedCategory, campus.id]);

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 1) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [products, searchQuery]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = products.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      const matchesRating = p.rating >= minRating;
      const stock = p.stockByCampus[campus.id] ?? 0;
      const matchesStock = !inStockOnly || stock > 0;
      return matchesCat && matchesQuery && matchesRating && matchesStock;
    });

    if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'discount-desc') {
      list = [...list].sort(
        (a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp
      );
    } else if (sortBy === 'rating-desc') {
      list = [...list].sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [products, selectedCategory, searchQuery, minRating, inStockOnly, campus.id, sortBy]);

  const handleResetFilters = () => {
    onSelectCategory('All');
    onSearchChange('');
    setMinRating(0);
    setInStockOnly(false);
    setSortBy('featured');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-6">
      {/* Header & Search Bar with Live Suggestions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#15803D] font-semibold">
            {university.shortName} · {campus.name}
          </p>
          <h1 className="font-display font-bold text-3xl text-[#0F294A] mt-1">
            Campus Essentials Catalogue
          </h1>
        </div>

        <div className="relative w-full lg:w-[440px]">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#5C6F85] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setShowSuggestions(true);
              }}
              placeholder="Search Maggi, Kurkure, shampoo, bucket, charger..."
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#FFFDF9] border border-[#E5DEC9] text-sm text-[#0F294A] placeholder:text-[#8A98A9] focus:outline-none focus:border-[#0F294A]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 text-[#5C6F85] hover:text-[#0F294A]"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Live Product Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-12 z-30 bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl shadow-xl overflow-hidden divide-y divide-[#F0EAE0]">
              <div className="px-3.5 py-2 text-[11px] font-mono uppercase tracking-wider text-[#5C6F85] bg-[#F3EFE6]">
                Suggested Products
              </div>
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
                      className="w-10 h-10 rounded-lg object-cover shrink-0 border border-[#E5DEC9]"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#0F294A] truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-[#5C6F85]">
                        {item.category} · {item.brand}
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
      </div>

      {/* Category Filter Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => onSelectCategory('All')}
          className={`px-3.5 h-9 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
            selectedCategory === 'All'
              ? 'bg-[#0F294A] text-white border-[#0F294A]'
              : 'bg-[#FFFDF9] text-[#233B57] border-[#E5DEC9] hover:border-[#0F294A]'
          }`}
        >
          All ({products.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = products.filter((p) => p.category === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3.5 h-9 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                selectedCategory === cat.id
                  ? 'bg-[#0F294A] text-white border-[#0F294A]'
                  : 'bg-[#FFFDF9] text-[#233B57] border-[#E5DEC9] hover:border-[#0F294A]'
              }`}
            >
              {cat.id} ({count})
            </button>
          );
        })}
      </div>

      {/* Sorting, Rating & Campus Stock Controls */}
      <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F294A]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#15803D]" />
            Filters:
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { label: 'All Ratings', value: 0 },
              { label: '4.5★ & up', value: 4.5 },
              { label: '4.7★ & up', value: 4.7 },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setMinRating(r.value)}
                className={`h-8 px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 border transition-colors ${
                  minRating === r.value
                    ? 'bg-[#EAF6EE] border-[#15803D] text-[#14532D] font-semibold'
                    : 'border-[#E5DEC9] text-[#5C6F85] hover:text-[#0F294A]'
                }`}
              >
                {r.value > 0 && <Star className="w-3 h-3 fill-current" />}
                {r.label}
              </button>
            ))}
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#233B57] cursor-pointer select-none pl-1">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="rounded border-[#E5DEC9] text-[#15803D] focus:ring-[#15803D]"
            />
            In stock at {campus.name}
          </label>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs font-mono text-[#5C6F85] tabular-nums">
            Showing {filteredProducts.length} products
          </span>
          <div className="inline-flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#5C6F85]" />
            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-8 px-2.5 rounded-lg bg-[#FAF8F3] border border-[#E5DEC9] text-xs font-semibold text-[#0F294A] focus:outline-none"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="discount-desc">Highest Discount</option>
              <option value="rating-desc">Top Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid / Loading / Empty States */}
      {isLoadingFilter ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-xl overflow-hidden animate-pulse"
            >
              <div className="aspect-[4/3] bg-[#EAE3D5]" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-[#EAE3D5] rounded w-1/2" />
                <div className="h-4 bg-[#EAE3D5] rounded w-4/5" />
                <div className="h-8 bg-[#EAE3D5] rounded w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl p-12 text-center max-w-lg mx-auto my-8">
          <PackageX className="w-10 h-10 text-[#5C6F85] mx-auto mb-3 stroke-[1.5]" />
          <h3 className="font-display font-bold text-xl text-[#0F294A]">
            No matching hostel essentials
          </h3>
          <p className="text-sm text-[#5C6F85] mt-1.5">
            Try clearing your search query or adjusting rating/category filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-5 h-10 px-5 rounded-lg bg-[#0F294A] text-white text-xs font-semibold hover:bg-[#1A3A63] transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredProducts.map((product) => (
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
      )}
    </div>
  );
}
