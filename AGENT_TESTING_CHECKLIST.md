# Silent Auction - Agent Testing Checklist

**Site URL:** https://silent-auction-gray.vercel.app

Use this checklist to systematically test all functionality. Test each item and report pass/fail with any issues found.

---

## 1. USER REGISTRATION FLOW

### 1.1 Landing Page (/landing)
- [ ] Navigate to https://silent-auction-gray.vercel.app/landing
- [ ] Verify page loads with "Bidder Check-In" header
- [ ] Verify Mary Frank PTO logo displays
- [ ] Verify name input field is present
- [ ] Verify email input field is present
- [ ] Test empty form submission - should show error
- [ ] Test invalid email format (e.g., "notanemail") - should show error
- [ ] Test email with typo domain (e.g., "test@gmial.com") - should suggest "gmail.com"
- [ ] Test email with non-existent domain - should show domain error

### 1.2 Email Verification
- [ ] Enter a valid name and email, submit the form
- [ ] Verify "Check Your Email" screen appears
- [ ] Verify the email address displayed is correct
- [ ] Check email inbox for verification email
- [ ] Verify email has Mary Frank PTO branding (green colors, logo if configured)
- [ ] Verify email contains verification link
- [ ] Click verification link
- [ ] Verify redirect to avatar creation screen

### 1.3 Avatar/Alias Creation
- [ ] Verify "Create Your Avatar" modal appears
- [ ] Verify color picker shows multiple color options
- [ ] Verify emoji picker shows emoji options
- [ ] Click "Randomize Selection" button
- [ ] Verify animation spins for ~1.5-2 seconds (not too fast)
- [ ] Verify random color and emoji are selected after spin
- [ ] Select a custom color and emoji combination
- [ ] Click "Create Alias" button
- [ ] Verify alias is created successfully
- [ ] Verify redirect to dashboard or catalog

---

## 2. CATALOG & BROWSING

### 2.1 Main Catalog (/)
- [ ] Navigate to https://silent-auction-gray.vercel.app/
- [ ] Verify page title "Silent Auction Catalog" appears
- [ ] Verify tagline "Find something you love—every dollar supports our kids!" appears
- [ ] Verify auction items are displayed
- [ ] Verify each item shows: photo (or 🎁 Mystery Item placeholder), title, current bid
- [ ] Verify items without photos show gradient placeholder with "Mystery Item!"
- [ ] Verify closed items show "CLOSED" badge
- [ ] Click on an item card
- [ ] Verify navigation to item detail page

### 2.2 Item Detail Page (/i/[slug])
- [ ] Verify item photo displays (or placeholder)
- [ ] Verify item title displays
- [ ] Verify item description displays (if present)
- [ ] Verify current bid amount displays
- [ ] Verify minimum next bid displays
- [ ] Verify "Top Bids" section shows bid history
- [ ] Verify bidder aliases display (e.g., "Red Star", "Blue Cat") - NOT real names
- [ ] Verify "Back to catalog" link works

---

## 3. BIDDING FLOW

### 3.1 Bid Form
- [ ] On an open item page, verify bid form is visible
- [ ] Verify "Your secret bidding identity 🕵️" label shows with your alias
- [ ] Verify your alias avatar (color + emoji) displays
- [ ] Verify bid amount input field is present
- [ ] Verify minimum bid hint displays correct amount

### 3.2 Placing Bids
- [ ] Enter a bid amount below minimum - should show error
- [ ] Enter a valid bid amount at or above minimum
- [ ] Click "Place Bid" button
- [ ] Verify success message appears
- [ ] Verify bid appears in "Top Bids" list
- [ ] Verify current bid updates
- [ ] Verify next minimum bid updates (+$1)

### 3.3 Real-Time Updates
- [ ] Open the same item in two browser tabs/windows
- [ ] Place a bid in one tab
- [ ] Verify the bid appears in the other tab within 10 seconds

---

## 4. USER DASHBOARD (/avatar)

- [ ] Navigate to https://silent-auction-gray.vercel.app/avatar
- [ ] Verify dashboard loads
- [ ] Verify your alias and avatar display
- [ ] Verify "Your secret bidding identity 🕵️" label appears
- [ ] Verify list of your bids appears (if any placed)
- [ ] Verify each bid shows: item name, bid amount, status
- [ ] Verify "Winning" badge shows on leading bids
- [ ] Verify "Outbid" indicator shows when not leading
- [ ] Verify email preference toggle is present
- [ ] Toggle email preference and verify it saves

---

## 5. LEADERBOARD (/leaderboard)

- [ ] Navigate to https://silent-auction-gray.vercel.app/leaderboard
- [ ] Verify "Live Leaderboard" header displays
- [ ] Verify all open items are listed
- [ ] Verify each item shows: title, current bid amount, leading bidder
- [ ] Verify leading bidder shows ALIAS only (e.g., "Green Star") - NOT real names
- [ ] Verify items without bids show "No bids yet" or "Anonymous Bidder"
- [ ] Verify "HOT" badges appear on recently active items
- [ ] Place a new bid and verify leaderboard updates

---

## 6. STATIC PAGES

### 6.1 How to Bid (/how-to-bid)
- [ ] Navigate to https://silent-auction-gray.vercel.app/how-to-bid
- [ ] Verify page loads with instructions
- [ ] Verify "Three taps and you're in" text appears
- [ ] Verify step-by-step bidding instructions display
- [ ] Verify "Browse Catalog" button works

### 6.2 Terms & Privacy (/terms)
- [ ] Navigate to https://silent-auction-gray.vercel.app/terms
- [ ] Verify page loads with terms content
- [ ] Verify "Bidding Agreement & Terms" section exists
- [ ] Verify "Privacy Policy" section exists
- [ ] Verify payment obligation language reflects online payment via official payment methods/links (no requirement to be physically present to pay)
- [ ] Verify "Clear My Local Data" section exists at bottom
- [ ] Click "Clear Local Data" button
- [ ] Verify confirmation prompt appears
- [ ] Click "Cancel" - verify nothing happens
- [ ] Click "Clear Local Data" again, then "Yes, Clear My Data"
- [ ] Verify data cleared message appears
- [ ] Verify redirect to /landing page

### 6.3 Payment Instructions (/payment-instructions)
- [ ] Navigate to https://silent-auction-gray.vercel.app/payment-instructions
- [ ] Verify page loads (may redirect to landing if not enrolled)
- [ ] If enrolled, verify payment instructions display

---

## 7. NAVIGATION & FOOTER

### 7.1 Header Navigation
- [ ] Verify header shows "Mary Frank Silent Auction" with logo
- [ ] Verify "Catalog" link works
- [ ] Verify "Dashboard" link works
- [ ] Verify "How to Bid" link works
- [ ] Verify "Leaderboard" link works
- [ ] On mobile, verify hamburger menu opens/closes

### 7.2 Footer
- [ ] Verify footer shows "© 2026 Mary Frank PTO"
- [ ] Verify "Terms & Privacy" link works
- [ ] Verify "Contact" link has correct email
- [ ] Verify "Crafted by λstepweaver" link works

---

## 8. MOBILE RESPONSIVENESS

Test on mobile viewport (375px width) or actual mobile device:

- [ ] Landing page is usable on mobile
- [ ] Catalog items display properly on mobile
- [ ] Item detail page is readable on mobile
- [ ] Bid form is usable on mobile (inputs not cut off)
- [ ] Dashboard is readable on mobile
- [ ] Leaderboard is readable on mobile
- [ ] Navigation hamburger menu works on mobile

---

## 9. ADMIN PANEL (Requires credentials)

**Note:** These tests require admin Basic Auth credentials.

### 9.1 Admin Login
- [ ] Navigate to https://silent-auction-gray.vercel.app/admin
- [ ] Verify Basic Auth prompt appears
- [ ] Enter wrong credentials - should reject
- [ ] Enter correct credentials - should allow access

### 9.2 Admin Dashboard
- [ ] Verify dashboard loads with auction settings
- [ ] Verify current deadline displays (or "Not set")
- [ ] Verify auction status (Open/Closed) displays
- [ ] Verify item count displays
- [ ] Test "Set Deadline" form
- [ ] Test "Extend Deadline" button
- [ ] Test "Close Auction" / "Open Auction" toggle

### 9.3 Item Management
- [ ] Verify item list displays all items
- [ ] Click "New Item" to create item
- [ ] Fill in: Title, Description, Starting Price, Photo
- [ ] Save and verify item appears in list
- [ ] Click an item to edit
- [ ] Make changes and save
- [ ] Verify changes persisted

### 9.4 QR Codes (/admin/qr-codes)
- [ ] Navigate to QR codes page
- [ ] Verify QR codes display for all items
- [ ] Test "Download All QR Codes" PDF generation
- [ ] Verify PDF contains all items with QR codes

---

## 10. VENDOR PORTAL (Requires vendor account)

### 10.1 Vendor Login (/vendor-enroll)
- [ ] Navigate to https://silent-auction-gray.vercel.app/vendor-enroll
- [ ] Verify "Donor Login" page displays
- [ ] Enter registered vendor email
- [ ] Verify login succeeds and redirects to vendor dashboard

### 10.2 Vendor Dashboard (/vendor)
- [ ] Verify vendor can see their own items
- [ ] Verify vendor can add new items
- [ ] Verify vendor can edit their items
- [ ] Verify vendor CANNOT see/edit other vendors' items

---

## 11. ERROR HANDLING

- [ ] Try to access /avatar without being enrolled - should redirect to /landing
- [ ] Try to access / (catalog) without being enrolled - should redirect to /landing
- [ ] Try to bid on a closed item - should show error
- [ ] Try to create alias with already-taken combination - should show error
- [ ] Navigate to non-existent item (/i/fake-item-slug) - should show "Item not found"

---

## 12. SECURITY CHECKS

- [ ] Verify real names NEVER appear on leaderboard (only aliases)
- [ ] Verify real names NEVER appear in bid history (only aliases)
- [ ] Verify admin pages are protected (require auth)
- [ ] Verify rate limiting works (try rapid repeated actions)

---

## RESULTS SUMMARY

| Section | Passed | Failed | Notes |
|---------|--------|--------|-------|
| 1. Registration | | | |
| 2. Catalog | | | |
| 3. Bidding | | | |
| 4. Dashboard | | | |
| 5. Leaderboard | | | |
| 6. Static Pages | | | |
| 7. Navigation | | | |
| 8. Mobile | | | |
| 9. Admin | | | |
| 10. Vendor | | | |
| 11. Errors | | | |
| 12. Security | | | |

**Total Tests:** 100+
**Passed:** ___
**Failed:** ___

---

## ISSUES FOUND

| # | Section | Description | Severity |
|---|---------|-------------|----------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

**Tested By:** _______________
**Date:** _______________
**Environment:** Production / Staging
