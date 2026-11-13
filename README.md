# UNIMART — Campus shopping. Made simple.

A responsive multi-university Indian hostel and campus essentials e-commerce web application built with **React**, **TypeScript**, **Tailwind CSS**, **Lucide Icons**, and a **Firebase-ready** service architecture.

---

## Key Features

- **Multi-University & Campus Support**: Live switcher across 4 Indian university hubs (*DBS Global University — Dehradun*, *IIT Delhi*, *MIT Manipal*, and *VIT Vellore*) with campus-specific stock counts, hostel lists, delivery fees, and dispatch windows.
- **50 Hostel Essentials Across 10 Categories** (`5 products per category` with unique studio product photos):
  - Snacks, Beverages, Instant food, Personal care, Stationery, Room essentials, Laundry, Electronics, Hygiene, Bags and accessories.
- **Search, Filtering & Product Detail Pages**: Live search suggestions from both the homepage and catalogue, category filters, rating filters, campus in-stock toggle, price/discount sorting, and dedicated Product Detail Pages (`Add to Cart`, `Buy Now`, quantity stepper).
- **Persistent Cart, Coupons & Wishlist**: Real-time INR (`₹`) totals, MRP savings, campus delivery threshold progress, promo codes (`UNIFIRST`, `HOSTEL10`, `EXAMFUEL`), and wishlist saving persisted in `localStorage`.
- **Hostel Checkout & Demo Payment Simulator**: Collects university, campus, hostel, block, room number, student name, mobile, and delivery instructions, with 1-click saved hostel address autofill and a simulated payment flow supporting **Success**, **Pending**, and **Failure** states (without collecting real payment credentials).
- **Student Hub & Order Tracking**: Profile editor, unique `UNI-2604-xxxx` order IDs, interactive 5-step order status timeline, reorder/cancel controls, saved wishlist, hostel address manager, and campus notifications.
- **Admin Operations Console**: Campus-scoped sales analytics, product & per-campus stock CRUD, inline price editing, order status management, registered student directory, coupon manager, university/hostel onboarding, and client-side **CSV report downloads** (Orders, Inventory, Students).

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8
- **Styling**: Tailwind CSS v4 (`Bricolage Grotesque`, `Plus Jakarta Sans`, `JetBrains Mono`)
- **Icons**: Lucide React
- **State & Persistence**: Modular Firebase-ready service layer (`src/services/firebaseReady.ts`) with `localStorage` demo persistence

---

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start the development server** (runs on port `3000`):
   ```bash
   npm run dev
   ```
3. **Type-check and build for production**:
   ```bash
   npm run lint
   npm run build
   ```

---

## Demo Accounts (Login Modal)

| Role | Email | Password |
| :--- | :--- | :--- |
| **Student** | `aarav.sharma@dgu.ac.in` | `Campus@123` |
| **Admin** | `admin@unimart.in` | `Admin@123` |

*Quick-fill buttons are also available directly inside the Sign In modal.*

---

## Firebase Integration Guide

Authentication and store operations are abstracted in `src/services/firebaseReady.ts`:
- `authService`: Login, 8-field student registration, password reset, and profile updates (`firebase/auth` ready).
- `storeService`: Campus-scoped products, orders, coupons, addresses, wishlist, and notifications (`firebase/firestore` ready).

To connect a live Firebase project, configure `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, and `VITE_FIREBASE_PROJECT_ID` in `.env` and swap the `localStorage` calls inside `src/services/firebaseReady.ts` for Firebase SDK calls.
