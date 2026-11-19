# UNIMART Firestore Security Spec (Phase 0 TDD)

## 1. Data Invariants
1. Every document ID (`userId`, `adminUid`, `orderId`) must match `^[a-zA-Z0-9_\-]+$` and be at most 128 characters.
2. Only verified authenticated users (`request.auth != null && request.auth.token.email_verified == true`) may create or read user-scoped records.
3. Self-assigned admin privilege escalation is blocked: on `/users/{userId}` creation by a non-admin, `role` MUST equal `'student'`, `uid` MUST equal `request.auth.uid`, and `role` CANNOT be altered on update by a non-admin.
4. Orders on `/orders/{orderId}` can only be created with `userId == request.auth.uid`, `status in ['Pending', 'Confirmed']`, bounded `items.size() <= 50` and `timeline.size() <= 10`, and server timestamps (`createdAt == request.time`, `updatedAt == request.time`).
5. PII isolation: `/users/{userId}` and `/orders/{orderId}` are strictly readable only by the record owner (`userId == request.auth.uid`) or a verified admin (`isha.0251mba110@dgu.ac.in` or `/admins/{uid}`). `allow list` never uses `get()` or `exists()` and enforces `isEmailAdmin() || resource.data.userId == request.auth.uid`.
6. Terminal state locking: Once an order reaches `Delivered` or `Cancelled`, non-admins cannot update it.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read/list on `/orders`**: `request.auth == null` -> Rejected (`isSignedIn()`).
2. **Unverified email admin spoof**: `request.auth.token.email == 'isha.0251mba110@dgu.ac.in'` with `email_verified == false` -> Rejected (`request.auth.token.email_verified == true`).
3. **Cross-user order read (`get`)**: Student B requests `get /orders/order-of-A` -> Rejected (`resource.data.userId == request.auth.uid`).
4. **Blanket order list scrape**: Student B runs unfiltered `collection('orders')` query without `where('userId', '==', uid)` -> Rejected by `allow list` evaluating `resource.data.userId == request.auth.uid`.
5. **Privilege escalation on `/users/{uid}` create**: Student sets `role: 'admin'` -> Rejected (`incoming().role == 'student' || isAdmin()`).
6. **Privilege escalation on `/users/{uid}` update**: Student updates their doc adding `role: 'admin'` -> Rejected (`incoming().role == existing().role`).
7. **Shadow/ghost field injection**: Payload includes unexpected `isSuperUser: true` on `/orders/{id}` or `/users/{id}` -> Rejected by `keys().hasOnly(...)`.
8. **Order identity spoofing**: Student A creates order with `userId: 'student-B'` -> Rejected (`incoming().userId == request.auth.uid`).
9. **Client timestamp forgery**: Order `create` passes fake past `createdAt` instead of `request.time` -> Rejected (`incoming().createdAt == request.time`).
10. **Terminal state bypass**: Student updates an already `'Delivered'` order to `'Pending'` -> Rejected (`existing().status != 'Delivered' && existing().status != 'Cancelled'`).
11. **ID poisoning / Resource exhaustion**: Student creates `/orders/` with 500-char ID or 10KB `studentName` -> Rejected (`isValidId()` + `.size() <= 100`).
12. **Status shortcutting by student**: Student updates their order directly from `'Pending'` to `'Delivered'` -> Rejected (only `'Cancelled'` or pending-to-paid `'Confirmed'` actions allowed for non-admins).
