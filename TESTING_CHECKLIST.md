# Silent Auction - Functionality Testing Checklist

Use this checklist before the event to verify everything works correctly.

---

## 🔐 Prerequisites
- [λ] Site is deployed and accessible at production URL
- [λ] Supabase database is connected and has data
- [λ] Resend email service is configured
- [λ] Admin credentials are set (`BASIC_AUTH_USER` / `BASIC_AUTH_PASS`)

---

## 👤 User Registration Flow

### Landing Page (`/landing`)
- [λ] Page loads without errors
- [λ] Name field accepts input
- [λ] Email field accepts input
- [λ] Email validation catches invalid formats (test: `bad@email`, `missing.com`)
- [λ] Email validation catches fake domains (test: `test@fakexyz123.com`)
- [ ] Typo suggestions work (test: `user@gmial.com` → suggests gmail.com) - Didn't work, or I couldn't get it to trigger. I entered 'gmial'. No suggestions ever appeared.
- [λ] "Send Verification Email" button works
- [λ] Success message appears after sending
- [λ] Rate limiting works (try sending 6+ times quickly)

### Email Verification (`/verify-email`)
- [λ] Verification email arrives in inbox (check spam too)
- [ ] Email contains correct logo and branding - I don't see a logo in the email?
- [λ] Verification link in email works
- [λ] Link redirects to avatar selection after verification
- [λ] Expired/invalid links show appropriate error

### Avatar/Alias Selection
- [λ] Color picker displays all 20 colors
- [λ] Icon picker displays all 47 icons
- [ ] "Spin" / randomize button works - Works, but make the spinning animation just a little longer? The emoji spins around once. Maybe do it twice?
- [λ] Selected combination shows preview
- [λ] "Confirm" creates the alias
- [ ] User is redirected to catalog after confirmation - No user is redirected to dashboard. This is prefered, though. Change nothing.
- [λ] Alias is saved to localStorage

---

## 🛒 Catalog & Browsing

### Main Catalog (`/`)
- [λ] Page loads and shows all open items
- [λ] Items display: photo, title, current bid, starting bid
- [λ] "Find something you love—every dollar supports our kids!" tagline shows
- [λ] Items link to individual item pages
- [λ] QR codes on cards are scannable
- [λ] Real-time updates work (bid on item, catalog updates)
- [λ] Closed items show "CLOSED" badge (if any)
- [λ] Unenrolled users are redirected to `/landing`

### Individual Item Page (`/i/[slug]`)
- [λ] Page loads with item details
- [λ] Photo displays correctly
- [λ] Description shows
- [λ] Current bid amount is accurate
- [λ] Minimum next bid is calculated correctly (+$1)
- [λ] Bid history shows recent bids with aliases (NOT real names)
- [λ] Bidding deadline countdown shows (if set)
- [λ] Real-time updates work when others bid

---

## 💰 Bidding Flow

### Placing Bids
- [λ] Bid form shows user's alias with "Your secret bidding identity 🕵️"
- [λ] Bid amount field accepts input
- [λ] Minimum bid validation works (can't bid below minimum)
- [λ] "Place Bid" button submits bid
- [λ] Success message appears
- [λ] Bid appears in bid history immediately
- [λ] Current bid updates
- [λ] Rate limiting works (try 25+ bids in 1 minute)

### Bid Confirmation Email (Opt-in)
- [λ] First bid on an item triggers confirmation email (if enabled)
- [ ] Email shows item name, bid amount, link to item - Works, but needs to be styled consistently with our colors. currently, it's blue. 
- [λ] Subsequent bids on same item do NOT send emails

### Being Outbid
- [λ] When outbid, the UI updates in real-time
- [λ] New minimum bid reflects the higher bid

---

## 📊 User Dashboard (`/avatar`)

- [λ] Dashboard loads and shows user's alias
- [λ] Avatar preview displays correctly
- [λ] "Your secret bidding identity 🕵️" label shows
- [λ] List of user's bids appears
- [λ] Each bid shows: item name, amount, status (winning/outbid)
- [λ] "Winning" badges show on leading bids
- [λ] "Outbid" indicators show when not leading
- [λ] Links to items work
- [λ] Email preference toggle works (enable/disable bid confirmations)
- [ ] Logout/clear alias works - Where is this option? Should we have this option to "wipe all user data" from within the terms and/or privacy policy page?

---

## 🏆 Leaderboard (`/leaderboard`)

- [λ] Page loads with all open items
- [λ] Items sorted by bid count (most active first)
- [λ] Each item shows: title, current bid, leading bidder's ALIAS
- [λ] **NO real names shown** - only aliases like "Red Star", "Blue Cat"
- [λ] Anonymous bidders show as "Anonymous Bidder"
- [λ] Real-time updates when bids placed
- [λ] "HOT" badges appear on recently bid items
- [λ] "WAR" badges appear when multiple bidders active
- [λ] Position animations work when items move up

---

## 🔧 Admin Panel

### Admin Login
- [λ] `/admin` prompts for Basic Auth
- [λ] Correct credentials grant access
- [λ] Wrong credentials are rejected

### Admin Dashboard (`/admin`)
- [λ] Dashboard loads with auction settings
- [λ] Current deadline displays (or "Not set")
- [λ] Auction status shows (Open/Closed)
- [λ] Item count shows
- [λ] "Set Deadline" form works
- [λ] "Extend Deadline" buttons work (+15m, +30m, +1h)
- [λ] "Open Auction" / "Close Auction" toggle works

### Item Management
- [λ] Item list shows all items with current bids
- [λ] "Add New Item" link works
- [λ] Creating new item works:
  - [λ] Title (required)
  - [λ] Description
  - [λ] Category
  - [λ] Starting price
  - [λ] Photo upload OR photo URL
- [λ] Editing existing item works
- [λ] Slug auto-generates from title
- [λ] Photo uploads to Supabase storage

### QR Codes (`/admin/qr-codes`)
- [λ] QR code grid displays all items
- [λ] Individual QR codes are scannable
- [λ] "Download All QR Codes" generates PDF
- [λ] PDF contains all items with:
  - [λ] Item title
  - [λ] Description snippet
  - [λ] Starting bid
  - [λ] Scannable QR code
  - [ ] "Mary Frank PTO Silent Auction" branding - should there be a logo?

### Vendor Admin Management
- [λ] Can create new vendor admin accounts
- [λ] Vendor receives enrollment email
- [λ] Vendor can login at `/vendor-enroll`
- [λ] Vendor dashboard (`/vendor`) shows their items only

---

## 📧 Email Notifications

### Test Each Email Type
- [λ] **Verification Email** - sent on registration
- [λ] **Bid Confirmation** - sent on first bid (if opted in)
- [ ] **Winner Notification** - sent when auction closes - I closed the auction but didn't get the admin email list of winners?
- [λ] **Security Alert** - sent on suspicious access (optional to test)
- [λ] **Vendor Enrollment** - sent when vendor admin created

### Email Content Check
- [ ] Logo displays correctly - Again, I'm not seeing any logos in any emails. It would be nice if our emails contained the logo, but it's not working if it's supposed to.
- [λ] "Mary Frank PTO" branding consistent - Please check?
- [λ] Footer shows "λstepweaver LLC" attribution - It does
- [λ] Reply-to address is correct
- [λ] Links in emails work

---

## 🏁 Auction Close Flow

### Manual Close
- [λ] Admin clicks "Close Auction"
- [λ] All items marked as closed
- [ ] Winner emails sent to all winners - Should the admin users have received a list of the winners?
- [λ] Catalog shows all items as "CLOSED"
- [λ] Bidding is disabled on all items

### Deadline Auto-Close (if configured) - How do we configure this without having a server? I couldn't figure it out. We tried, before.
- [ ] Auction closes automatically at deadline
- [ ] Winner notifications sent
- [ ] Items marked closed

### Winner Email Content
- [λ] "You won!" subject line
- [λ] "Thanks for supporting Mary Frank—our kids thank you!"
- [λ] Lists all won items with amounts
- [λ] Shows total due
- [λ] Payment instructions (from settings)
- [λ] Pickup instructions (from settings)
- [λ] Link to Payment Instructions page

---

## 📱 Mobile Experience

- [λ] Landing page works on mobile
- [λ] Avatar selection works on touch
- [λ] Catalog is responsive
- [λ] Item pages are readable
- [λ] Bid form is usable on small screens
- [λ] Leaderboard is readable
- [λ] QR codes scan from phone camera

---

## 🔒 Security Checks

- [λ] Unenrolled users cannot access catalog (redirects to `/landing`)
- [λ] Admin pages require authentication
- [λ] Rate limiting blocks excessive requests
- [λ] Real names never shown publicly (only aliases)
- [λ] Email verification required before bidding

---

## 📄 Static Pages

- [λ] `/terms` - Terms & Privacy loads, content is correct
- [λ] `/how-to-bid` - Instructions page loads
- [λ] `/payment-instructions` - Payment page loads (after auction)

---

## 🐛 Edge Cases to Test

- [λ] Bid exactly the starting price (should work)
- [λ] Bid with cents (e.g., $25.50) - verify handling
- [λ] Very long item titles display correctly
- [ ] Items with no photo display placeholder - We need a placeholder. Currently just says "No Photo". What can we reach for, creative or fun, here?
- [λ] Multiple users bidding simultaneously - I haven't actually tested this, but it should work, right? I've logged in with two registered users and outbid each other. It all works very well thus far.
- [λ] Refresh page during bid - no duplicate bids
- [λ] Back button behavior after bidding

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
