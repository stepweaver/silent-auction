# Feature Parity Checklist

All features must be preserved during the rebuild unless a security fix requires change.

| Feature | Route/Component | Status |
|---------|-----------------|--------|
| Catalog with filters, realtime | `app/page.jsx`, ItemCard, GoalMeter | Preserve |
| Landing / alias creation | `app/landing/page.jsx`, AliasSelector | Preserve |
| Email verification | `app/verify-email/page.jsx`, api/alias/verify-email | Preserve |
| Avatar/dashboard | `app/avatar/page.jsx` | Preserve |
| Item detail + bid form | `app/i/[slug]/page.jsx`, BidForm | Preserve |
| Donate | `app/donate/page.jsx`, DonateForm | Preserve |
| Leaderboard | `app/leaderboard/page.jsx` | Preserve |
| Payment instructions | `app/payment-instructions/page.jsx` | Preserve |
| Vendor enrollment | `app/vendor-enroll/page.jsx` | Preserve |
| Vendor dashboard + items | `app/vendor/page.jsx`, items/[id], items/new | Preserve |
| Admin dashboard | `app/admin/page.jsx` | Preserve |
| Admin items, settings, QR, upload | `app/admin/*`, api/admin/* | Preserve |
| Auction open/close, winner emails | `lib/closeAuction.js`, api/admin/close-* | Preserve |
| Realtime bidding | Supabase channels in catalog, item page | Preserve |
| QR/item access | `app/i/[slug]`, admin/qr-codes | Preserve |
| Two alias systems | alias.js (color+animal), iconAlias.js (color+icon) | Preserve |
