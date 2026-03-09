# Migration Notes

## Phase 1: Auth/Session Security (Completed)

### Vendor Auth Changes

**Before:** Vendor identity stored in `localStorage` (`vendor_admin_id`, `vendor_admin_email`, `vendor_admin_name`). API routes trusted `x-vendor-admin-id` header, which was spoofable.

**After:** Vendor session stored in HttpOnly cookie (`vendor_session`). API routes read session from cookie only. No client-side storage of vendor identity.

### Breaking Changes

- **Vendor pages** now require `credentials: 'include'` on all fetch calls to vendor APIs.
- **Vendor item create/update/delete** require CSRF token (via `x-csrf-token` header). Use `getJsonHeadersWithCsrf()` from `@/lib/clientCsrf`.
- **Admin routes** (`/api/admin/item`, `/api/admin/upload`, `/api/admin/item/[id]`) no longer accept `x-vendor-admin-id`. Basic Auth only. Vendors use `/api/vendor/*` exclusively.
- **Vendor upload** moved from `/api/admin/upload` to `/api/vendor/upload` for vendor item forms.

### New Files

- `lib/auth/session.js` - Vendor session cookie helpers
- `app/api/vendor/upload/route.js` - Vendor image upload (replaces admin/upload for vendor flows)
- `proxy.js` - Added matcher config; enforces enrollment and admin Basic Auth (Next.js 16 proxy convention)

### Removed/Deprecated

- `x-vendor-admin-id` header - no longer accepted anywhere
- localStorage keys `vendor_admin_id`, `vendor_admin_email`, `vendor_admin_name` - no longer used

### Logout

Vendor logout: `GET /api/vendor-auth?logout=1` with `credentials: 'include'` clears the session cookie.
