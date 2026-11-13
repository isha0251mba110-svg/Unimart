import {
  ChevronDown,
  Heart,
  Home,
  LayoutGrid,
  MapPin,
  PackageCheck,
  Shield,
  ShoppingBag,
  User,
} from 'lucide-react';
import { AppView, StudentUser, University } from '../types';

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView, section?: string) => void;
  universities: University[];
  activeUniversityId: string;
  activeCampusId: string;
  onChangeCampus: (universityId: string, campusId: string) => void;
  cartCount: number;
  wishlistCount: number;
  currentUser: StudentUser | null;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  onOpenDashboardTab: (tab: 'profile' | 'orders' | 'wishlist' | 'addresses' | 'notifications') => void;
  unreadNotifications: number;
}

export function Navbar({
  activeView,
  onNavigate,
  universities,
  activeUniversityId,
  activeCampusId,
  onChangeCampus,
  cartCount,
  wishlistCount,
  currentUser,
  onOpenCart,
  onOpenAuth,
  onOpenDashboardTab,
  unreadNotifications,
}: NavbarProps) {
  const activeUniversity =
    universities.find((u) => u.id === activeUniversityId) ?? universities[0];
  const activeCampus =
    activeUniversity?.campuses.find((c) => c.id === activeCampusId) ??
    activeUniversity?.campuses[0];

  const handleCampusSelectChange = (val: string) => {
    const [uniId, campId] = val.split('::');
    if (uniId && campId) {
      onChangeCampus(uniId, campId);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E5DEC9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Zone 1: Brand + Compact Campus Switcher */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 shrink-0 focus:outline-none group"
            >
              <span className="w-8 h-8 rounded-lg bg-[#0F294A] text-[#FAF8F3] font-display font-bold text-base flex items-center justify-center group-hover:bg-[#15803D] transition-colors">
                U
              </span>
              <span className="font-display font-bold text-lg tracking-tight text-[#0F294A]">
                UNIMART
              </span>
            </button>

            <div className="hidden sm:flex items-center h-6 w-px bg-[#E5DEC9]" />

            <div className="relative flex items-center min-w-0 max-w-[190px] sm:max-w-[235px]">
              <MapPin className="w-3.5 h-3.5 text-[#15803D] shrink-0 mr-1" />
              <select
                aria-label="Select University and Campus"
                value={`${activeUniversity?.id ?? ''}::${activeCampus?.id ?? ''}`}
                onChange={(e) => handleCampusSelectChange(e.target.value)}
                className="appearance-none bg-transparent pr-5 py-1 text-xs font-semibold text-[#0F294A] truncate cursor-pointer focus:outline-none"
              >
                {universities.map((uni) => (
                  <optgroup key={uni.id} label={uni.name}>
                    {uni.campuses.map((campus) => (
                      <option key={campus.id} value={`${uni.id}::${campus.id}`}>
                        {uni.shortName} · {campus.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#5C6F85] pointer-events-none -ml-4 shrink-0" />
            </div>
          </div>

          {/* Zone 2: Center Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={`transition-colors ${
                activeView === 'home'
                  ? 'text-[#0F294A] font-semibold underline decoration-[#15803D] decoration-2 underline-offset-8'
                  : 'text-[#5C6F85] hover:text-[#0F294A]'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className={`transition-colors ${
                activeView === 'catalog' || activeView === 'product'
                  ? 'text-[#0F294A] font-semibold underline decoration-[#15803D] decoration-2 underline-offset-8'
                  : 'text-[#5C6F85] hover:text-[#0F294A]'
              }`}
            >
              Catalogue
            </button>
            <button
              type="button"
              onClick={() => onNavigate('home', 'deals-section')}
              className="text-[#5C6F85] hover:text-[#0F294A] transition-colors"
            >
              Student Deals
            </button>
            <button
              type="button"
              onClick={() => onOpenDashboardTab('orders')}
              className={`relative transition-colors ${
                activeView === 'dashboard'
                  ? 'text-[#0F294A] font-semibold underline decoration-[#15803D] decoration-2 underline-offset-8'
                  : 'text-[#5C6F85] hover:text-[#0F294A]'
              }`}
            >
              Student Hub
              {unreadNotifications > 0 && (
                <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-[#15803D] align-middle" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className={`inline-flex items-center gap-1 transition-colors ${
                activeView === 'admin'
                  ? 'text-[#0F294A] font-semibold underline decoration-[#15803D] decoration-2 underline-offset-8'
                  : 'text-[#5C6F85] hover:text-[#0F294A]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
          </nav>

          {/* Zone 3: Primary Action + Account */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenDashboardTab('wishlist')}
              className="hidden sm:inline-flex relative items-center justify-center w-9 h-9 rounded-lg border border-[#E5DEC9] text-[#0F294A] hover:bg-[#F3EFE6] transition-colors"
              aria-label="Saved Wishlist"
            >
              <Heart className="w-4 h-4" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#15803D] text-white text-[10px] font-mono font-semibold flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={currentUser ? () => onOpenDashboardTab('profile') : onOpenAuth}
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E5DEC9] text-xs font-semibold text-[#0F294A] hover:bg-[#F3EFE6] transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span className="max-w-[96px] truncate">
                {currentUser ? currentUser.name.split(' ')[0] : 'Sign In'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className={`md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${
                activeView === 'admin'
                  ? 'bg-[#0F294A] border-[#0F294A] text-white'
                  : 'border-[#E5DEC9] text-[#0F294A] hover:bg-[#F3EFE6]'
              }`}
              aria-label="Open Admin Dashboard"
              title="Admin Console"
            >
              <Shield className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenCart}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-[#0F294A] text-[#FAF8F3] text-xs font-semibold hover:bg-[#1A3A63] transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Cart</span>
              <span className="font-mono bg-[#15803D] text-white px-1.5 py-0.5 rounded text-[11px] tabular-nums">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-[#FFFDF9]/98 backdrop-blur-md border-t border-[#E5DEC9] grid grid-cols-5"
      >
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            activeView === 'home' ? 'text-[#0F294A] font-semibold' : 'text-[#5C6F85]'
          }`}
        >
          <Home className={`w-4 h-4 ${activeView === 'home' ? 'text-[#15803D]' : ''}`} />
          Home
        </button>

        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            activeView === 'catalog' || activeView === 'product'
              ? 'text-[#0F294A] font-semibold'
              : 'text-[#5C6F85]'
          }`}
        >
          <LayoutGrid
            className={`w-4 h-4 ${
              activeView === 'catalog' || activeView === 'product' ? 'text-[#15803D]' : ''
            }`}
          />
          Shop
        </button>

        <button
          type="button"
          onClick={() => onOpenDashboardTab('wishlist')}
          className="relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[#5C6F85]"
        >
          <Heart className="w-4 h-4" />
          Saved
          {wishlistCount > 0 && (
            <span className="absolute top-1.5 right-4 w-3.5 h-3.5 rounded-full bg-[#15803D] text-white text-[9px] font-mono flex items-center justify-center">
              {wishlistCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onOpenDashboardTab('orders')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            activeView === 'dashboard' ? 'text-[#0F294A] font-semibold' : 'text-[#5C6F85]'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          Orders
        </button>

        <button
          type="button"
          onClick={currentUser ? () => onOpenDashboardTab('profile') : onOpenAuth}
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[#5C6F85]"
        >
          <User className="w-4 h-4" />
          {currentUser ? 'Profile' : 'Login'}
        </button>
      </nav>
    </>
  );
}
