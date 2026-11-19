export type CategoryId =
  | 'Snacks'
  | 'Beverages'
  | 'Instant food'
  | 'Personal care'
  | 'Stationery'
  | 'Room essentials'
  | 'Laundry'
  | 'Electronics'
  | 'Hygiene'
  | 'Bags and accessories';

export type AppView =
  | 'home'
  | 'catalog'
  | 'product'
  | 'dashboard'
  | 'admin';

export type SortOption =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'discount-desc'
  | 'rating-desc';

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Packed'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type PaymentState = 'success' | 'failure' | 'pending';

export type PaymentMethod =
  | 'Campus UPI Demo'
  | 'Student Wallet Demo'
  | 'Hostel Gate Pay Demo';

export interface Campus {
  id: string;
  name: string;
  city: string;
  hostels: string[];
  blocks: string[];
  deliveryFee: number;
  freeDeliveryAbove: number;
  dispatchWindow: string;
}

export interface University {
  id: string;
  name: string;
  shortName: string;
  campuses: Campus[];
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: CategoryId;
  price: number;
  mrp: number;
  rating: number;
  reviewCount: number;
  description: string;
  highlights: string[];
  unitLabel: string;
  image: string;
  stockByCampus: Record<string, number>;
  isTrending?: boolean;
  isBestseller?: boolean;
  isStudentDeal?: boolean;
}

export interface ComboOffer {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  productIds: string[];
  comboPrice: number;
  originalPrice: number;
  accentColor: 'navy' | 'green';
}

export interface Testimonial {
  id: string;
  name: string;
  program: string;
  universityShort: string;
  hostel: string;
  rating: number;
  quote: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Coupon {
  code: string;
  description: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  minCartValue: number;
  maxDiscount?: number;
  active: boolean;
}

export interface AddressItem {
  id: string;
  label: string;
  universityId: string;
  campusId: string;
  hostel: string;
  block: string;
  roomNumber: string;
  phone: string;
  isDefault: boolean;
}

export interface StudentUser {
  uid: string;
  name: string;
  email: string;
  mobile: string;
  universityId: string;
  campusId: string;
  hostel: string;
  roomNumber: string;
  role: 'student' | 'admin';
  createdAt: string;
}

export interface OrderItemSnapshot {
  productId: string;
  name: string;
  category: CategoryId;
  price: number;
  quantity: number;
  image: string;
}

export interface OrderTimelineStep {
  status: OrderStatus;
  label: string;
  timestamp: string;
  note: string;
  completed: boolean;
}

export interface Order {
  id: string;
  userId: string;
  studentName: string;
  studentEmail?: string;
  phone: string;
  universityId: string;
  universityName: string;
  campusId: string;
  campusName: string;
  hostel: string;
  block: string;
  roomNumber: string;
  deliveryInstructions: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentState;
  status: OrderStatus;
  createdAt: string;
  timeline: OrderTimelineStep[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'order' | 'deal' | 'campus';
}
