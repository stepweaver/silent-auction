# Silent Auction - Functionality Testing Checklist

Use this checklist before the event to verify everything works correctly.

---

## 🔐 Prerequisites
- [ ] Site is deployed and accessible at production URL
- [ ] Supabase database is connected and has data
- [ ] Resend email service is configured
- [ ] Admin credentials are set (`BASIC_AUTH_USER` / `BASIC_AUTH_PASS`)

---

## 👤 User Registration Flow

### Landing Page (`/landing`)
- [λ] Page loads without errors
- [λ] Name field accepts input
- [λ] Email field accepts input
- [ ] Email validation catches invalid formats (test: `bad@email`, `missing.com`)
- [ ] Email validation catches fake domains (test: `test@fakexyz123.com`)
- [ ] Typo suggestions work (test: `user@gmial.com` → suggests gmail.com)
- [ ] "Send Verification Email" button works
- [ ] Success message appears after sending
- [ ] Rate limiting works (try sending 6+ times quickly)

### Email Verification (`/verify-email`)
- [ ] Verification email arrives in inbox (check spam too)
- [ ] Email contains correct logo and branding
- [ ] Verification link in email works
- [ ] Link redirects to avatar selection after verification
- [ ] Expired/invalid links show appropriate error

### Avatar/Alias Selection
- [ ] Color picker displays all 20 colors
- [ ] Icon picker displays all 47 icons
- [ ] "Spin" / randomize button works
- [ ] Selected combination shows preview
- [ ] "Confirm" creates the alias
- [ ] User is redirected to catalog after confirmation
- [ ] Alias is saved to localStorage

---

## 🛒 Catalog & Browsing

### Main Catalog (`/`)
- [ ] Page loads and shows all open items
- [ ] Items display: photo, title, current bid, starting bid
- [ ] "Find something you love—every dollar supports our kids!" tagline shows
- [ ] Items link to individual item pages
- [ ] QR codes on cards are scannable
- [ ] Real-time updates work (bid on item, catalog updates)
- [ ] Closed items show "CLOSED" badge (if any)
- [ ] Unenrolled users are redirected to `/landing`

### Individual Item Page (`/i/[slug]`)
- [ ] Page loads with item details
- [ ] Photo displays correctly
- [ ] Description shows
- [ ] Current bid amount is accurate
- [ ] Minimum next bid is calculated correctly (+$1)
- [ ] Bid history shows recent bids with aliases (NOT real names)
- [ ] Bidding deadline countdown shows (if set)
- [ ] Real-time updates work when others bid

---

## 💰 Bidding Flow

### Placing Bids
- [ ] Bid form shows user's alias with "Your secret bidding identity 🕵️"
- [ ] Bid amount field accepts input
- [ ] Minimum bid validation works (can't bid below minimum)
- [ ] "Place Bid" button submits bid
- [ ] Success message appears
- [ ] Bid appears in bid history immediately
- [ ] Current bid updates
- [ ] Rate limiting works (try 25+ bids in 1 minute)

### Bid Confirmation Email (Opt-in)
- [ ] First bid on an item triggers confirmation email (if enabled)
- [ ] Email shows item name, bid amount, link to item
- [ ] Subsequent bids on same item do NOT send emails

### Being Outbid
- [ ] When outbid, the UI updates in real-time
- [ ] New minimum bid reflects the higher bid

---

## 📊 User Dashboard (`/avatar`)

- [ ] Dashboard loads and shows user's alias
- [ ] Avatar preview displays correctly
- [ ] "Your secret bidding identity 🕵️" label shows
- [ ] List of user's bids appears
- [ ] Each bid shows: item name, amount, status (winning/outbid)
- [ ] "Winning" badges show on leading bids
- [ ] "Outbid" indicators show when not leading
- [ ] Links to items work
- [ ] Email preference toggle works (enable/disable bid confirmations)
- [ ] Logout/clear alias works

---

## 🏆 Leaderboard (`/leaderboard`)

- [ ] Page loads with all open items
- [ ] Items sorted by bid count (most active first)
- [ ] Each item shows: title, current bid, leading bidder's ALIAS
- [ ] **NO real names shown** - only aliases like "Red Star", "Blue Cat"
- [ ] Anonymous bidders show as "Anonymous Bidder"
- [ ] Real-time updates when bids placed
- [ ] "HOT" badges appear on recently bid items
- [ ] "WAR" badges appear when multiple bidders active
- [ ] Position animations work when items move up

---

## 🔧 Admin Panel

### Admin Login
- [ ] `/admin` prompts for Basic Auth
- [ ] Correct credentials grant access
- [ ] Wrong credentials are rejected

### Admin Dashboard (`/admin`)
- [ ] Dashboard loads with auction settings
- [ ] Current deadline displays (or "Not set")
- [ ] Auction status shows (Open/Closed)
- [ ] Item count shows
- [ ] "Set Deadline" form works
- [ ] "Extend Deadline" buttons work (+15m, +30m, +1h)
- [ ] "Open Auction" / "Close Auction" toggle works

### Item Management
- [ ] Item list shows all items with current bids
- [ ] "Add New Item" link works
- [ ] Creating new item works:
  - [ ] Title (required)
  - [ ] Description
  - [ ] Category
  - [ ] Starting price
  - [ ] Photo upload OR photo URL
- [ ] Editing existing item works
- [ ] Slug auto-generates from title
- [ ] Photo uploads to Supabase storage

### QR Codes (`/admin/qr-codes`)
- [ ] QR code grid displays all items
- [ ] Individual QR codes are scannable
- [ ] "Download All QR Codes" generates PDF
- [ ] PDF contains all items with:
  - [ ] Item title
  - [ ] Description snippet
  - [ ] Starting bid
  - [ ] Scannable QR code
  - [ ] "Mary Frank PTO Silent Auction" branding

### Vendor Admin Management
- [ ] Can create new vendor admin accounts
- [ ] Vendor receives enrollment email
- [ ] Vendor can login at `/vendor-enroll`
- [ ] Vendor dashboard (`/vendor`) shows their items only

---

## 📧 Email Notifications

### Test Each Email Type
- [ ] **Verification Email** - sent on registration
- [ ] **Bid Confirmation** - sent on first bid (if opted in)
- [ ] **Winner Notification** - sent when auction closes
- [ ] **Security Alert** - sent on suspicious access (optional to test)
- [ ] **Vendor Enrollment** - sent when vendor admin created

### Email Content Check
- [ ] Logo displays correctly
- [ ] "Mary Frank PTO" branding consistent
- [ ] Footer shows "λstepweaver LLC" attribution
- [ ] Reply-to address is correct
- [ ] Links in emails work

---

## 🏁 Auction Close Flow

### Manual Close
- [ ] Admin clicks "Close Auction"
- [ ] All items marked as closed
- [ ] Winner emails sent to all winners
- [ ] Catalog shows all items as "CLOSED"
- [ ] Bidding is disabled on all items

### Deadline Auto-Close (if configured)
- [ ] Auction closes automatically at deadline
- [ ] Winner notifications sent
- [ ] Items marked closed

### Winner Email Content
- [ ] "You won!" subject line
- [ ] "Thanks for supporting Mary Frank—our kids thank you!"
- [ ] Lists all won items with amounts
- [ ] Shows total due
- [ ] Payment instructions (from settings)
- [ ] Pickup instructions (from settings)
- [ ] Link to Payment Instructions page

---

## 📱 Mobile Experience

- [ ] Landing page works on mobile
- [ ] Avatar selection works on touch
- [ ] Catalog is responsive
- [ ] Item pages are readable
- [ ] Bid form is usable on small screens
- [ ] Leaderboard is readable
- [ ] QR codes scan from phone camera

---

## 🔒 Security Checks

- [ ] Unenrolled users cannot access catalog (redirects to `/landing`)
- [ ] Admin pages require authentication
- [ ] Rate limiting blocks excessive requests
- [ ] Real names never shown publicly (only aliases)
- [ ] Email verification required before bidding

---

## 📄 Static Pages

- [ ] `/terms` - Terms & Privacy loads, content is correct
- [ ] `/how-to-bid` - Instructions page loads
- [ ] `/payment-instructions` - Payment page loads (after auction)

---

## 🐛 Edge Cases to Test

- [ ] Bid exactly the starting price (should work)
- [ ] Bid with cents (e.g., $25.50) - verify handling
- [ ] Very long item titles display correctly
- [ ] Items with no photo display placeholder
- [ ] Multiple users bidding simultaneously
- [ ] Refresh page during bid - no duplicate bids
- [ ] Back button behavior after bidding

---

## ✅ Final Pre-Event Checklist

- [ ] All test items deleted or marked appropriately
- [ ] Real auction items added with photos
- [ ] Deadline set to correct date/time
- [ ] Payment instructions set in database
- [ ] Pickup instructions set in database
- [ ] Contact email set in database
- [ ] QR code PDFs printed
- [ ] Admin credentials shared with organizers (securely)
- [ ] Backup plan if site goes down (phone number to call)

---

## 📝 Notes

_Use this space to document any issues found during testing:_

| Issue | Status | Notes |
|-------|--------|-------|
| | | |
| | | |
| | | |

---

**Last tested:** _______________  
**Tested by:** _______________  
**Environment:** Production / Staging
