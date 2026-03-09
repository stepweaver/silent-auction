# Silent Auction Architecture

## Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Email:** Resend
- **Styling:** Tailwind CSS 4, DaisyUI
- **Validation:** Zod

## Route Structure

### Pages
- `/` - Catalog (items, filters, realtime bids)
- `/landing` - Onboarding, alias creation
- `/verify-email` - Email verification
- `/avatar` - Bidder dashboard
- `/donate` - Donation form
- `/leaderboard` - Top bidders
- `/payment-instructions` - Winner payment info
- `/vendor-enroll` - Vendor login
- `/vendor` - Vendor dashboard
- `/vendor/items/[id]`, `/vendor/items/new` - Vendor item management
- `/admin` - Admin dashboard
- `/admin/items/[id]`, `/admin/items/new` - Admin item management
- `/admin/qr-codes`, `/admin/vendor-admins`, `/admin/email-test`
- `/i/[slug]` - Item detail with bid form

### API Routes
- `/api/bid` - Place bid (CSRF, rate limit)
- `/api/donate` - Donation pledge
- `/api/alias/*` - Alias CRUD, verification
- `/api/vendor-auth` - Vendor login (POST), session verify (GET)
- `/api/vendor/item` - Vendor item create
- `/api/vendor/item/[id]` - Vendor item update/delete
- `/api/admin/*` - Admin operations (Basic Auth)

## Data Flow

- **Service-role Supabase:** All API routes, closeAuction, notifications, server components
- **Anon Supabase:** Client components for catalog, item detail, leaderboard, realtime subscriptions

## Auth Model

- **Admin:** Basic Auth on API routes; middleware enforces on `/admin` and `/api/admin`
- **Vendor:** HttpOnly session cookie; `getVendorAdminId()` reads from cookie only
- **Bidder enrollment:** HttpOnly `auction_enrolled` cookie; middleware redirects unenrolled users to `/landing`

## Proxy

The `proxy.js` file at the repo root contains enrollment and admin Basic Auth logic. Next.js 16 runs it automatically before requests. It enforces enrollment cookie for protected paths and Basic Auth for admin routes.

**Note:** Prior to Phase 1, `proxy.js` was never imported; enrollment and admin protection relied on client-side checks and API 401s only. Phase 1 wires `middleware.js` to invoke the proxy.

## Security

- CSRF on bid, donate, alias create, vendor item create/update/delete
- Rate limiting via `lib/rateLimit.js` (in-memory). Upgrade path: `lib/security/rateLimit.js` documents interface for Redis/KV swap.
- No service-role credentials in client paths
- Vendor session in HttpOnly cookie only
