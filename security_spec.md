# Security Specification — MAHIR DEV SMM Panel

## 1. Data Invariants
1. **Self-Service Wallet Integrity**: Users can NEVER increase their own `walletBalance`, `totalDeposits`, `referralEarnings`, or `membershipLevel` via client writes.
2. **Order Price & Atomic Debit**: An order can ONLY be created if the referenced service exists and is `enabled == true`, `quantity` is within `[minQty, maxQty]`, `price` matches `(quantity * ratePer1000) / 1000` within `0.01`, the user's account is `active`, their balance covers `price`, AND the same atomic batch deducts `price` from `users/{uid}.walletBalance` and creates a negative `order_debit` transaction.
3. **Deposit Verification**: Users can only create deposits in `pending` status with empty `reviewedBy` and `adminNote`. Only verified admins can transition a `pending` deposit to `approved` or `rejected` (terminal state lock).
4. **PII Isolation**: User documents (`users/{uid}`) contain email and balance data and can ONLY be read by the owner or an admin. Referral code resolution uses a separate PII-free `referralCodes/{code}` index.
5. **Admin Privilege Isolation**: Admin status is strictly derived from `admins/{uid}` existence or verified runtime bootstrap email (`request.auth.token.email == 'mdsalimkhanbosstr@gmail.com' && request.auth.token.email_verified == true`). Self-assignment of admin or membership roles is forbidden.
6. **Referral Anti-Abuse**: Self-referrals (`referrerUid == referredUid`) are denied. Duplicate referrals are prevented by keying `referrals/{referredUid}`.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Self-Credit Wallet**: User updates `users/{uid}` setting `walletBalance: 999999`.
2. **Ghost Field Injection**: User creates `users/{uid}` with extra field `isAdmin: true`.
3. **Zero-Price Order**: User creates `orders/{id}` with `price: 0` for a paid service.
4. **Order Without Balance Debit**: User creates `orders/{id}` without atomically deducting `users/{uid}.walletBalance`.
5. **Self-Approve Deposit**: User updates `deposits/{id}` from `pending` to `approved`.
6. **Re-Approve Terminal Deposit**: Admin attempts to update an already `approved` deposit again.
7. **Fake Deposit Transaction**: User creates `transactions/{id}` with `type: 'deposit_credit', amount: 5000`.
8. **Email Spoofing Admin**: Unverified token (`email_verified: false`) with admin email attempts to read `auditLogs`.
9. **ID Poisoning**: User attempts to write `orders/{1500_char_junk_id}`.
10. **Self-Referral**: User creates `referrals/{uid}` with `referrerUid == uid`.
11. **PII Scraping**: User A attempts `list` or `get` on `users/{userB}`.
12. **Client Timestamp Forgery**: User creates `orders/{id}` with backdated `createdAt` not equal to `request.time`.
