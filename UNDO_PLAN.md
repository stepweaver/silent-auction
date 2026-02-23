# Undo Plan: Code Review Remediation

Use this if the post-push changes cause problems and you need to roll back quickly.

---

## Option A: Full Revert via Git (Preferred)

If the review changes live in one or a few commits:

```bash
# See recent commits
git log --oneline -10

# Revert the specific commit(s) that contain the review work (creates new commits that undo the changes)
git revert <commit-hash> --no-edit

# Or revert a range (oldest first)
git revert <oldest-commit>^..<newest-commit> --no-edit
```

If you haven’t pushed yet and want to drop the last N commits locally:

```bash
git reset --hard HEAD~N   # N = number of commits to drop (destroys those commits)
```

After revert or reset, run `npm run build` and smoke-test (avatar + bid).

---

## Option B: Partial Rollback (CSRF Only)

If the only issue is “users can’t bid / donate / create alias” (403 or “Security token missing”):

**Goal:** Make CSRF optional again so requests without a token are accepted. Leave JSON errors and logger as-is.

1. **`lib/csrf.js`**  
   In `verifyCSRFToken`, restore the old behavior: if no token is provided, return `true` instead of `false`:
   - Change from: `if (!token) return false;` then verify.
   - Change to: if `token` is present, verify and return result; if `token` is missing, `return true;`.

2. **Clients (optional)**  
   You can leave the client code as-is (they’ll keep sending the token when they have it). No need to remove `getJsonHeadersWithCsrf` or the “Security token missing” message unless you want to simplify.

Result: CSRF is again optional; all other review changes (JSON errors, logger, validation, upload, health) stay.

---

## Option C: Full Manual Rollback (No Git)

If you can’t or don’t want to use Git revert, use this as a checklist. Order matters for consistency.

### 1. Remove New Files

Delete these files (they were added during the review remediation):

- `lib/logger.js`
- `lib/apiResponses.js`
- `lib/clientCsrf.js`
- `app/api/health/db/route.js`

(Keep `CODE_REVIEW.md` if you want to retain the review notes.)

### 2. Revert `lib/csrf.js`

- In `verifyCSRFToken`: if no token is provided, return `true`; if token is provided, verify and return that result. Remove the “CSRF is required” comment if you added one.

### 3. Revert `lib/validation.js`

- Remove the `safeSlug` definition.
- In `BidSchema`, set `slug: z.string().optional()` again (no `.max(200)` or regex).

### 4. Revert `lib/rateLimit.js`

- Remove the multi-line comment about Redis/KV and multiple instances (optional; it’s comment-only).

### 5. Revert API Routes to Plain-Text Errors and `console.error`

For every route that now uses `jsonError`, `jsonUnauthorized`, or `logError`:

- Remove imports: `jsonError`, `jsonUnauthorized` from `@/lib/apiResponses` and `logError` (and `logWarn`) from `@/lib/logger`.
- Replace `jsonError('message', status)` with `new Response('message', { status })`.
- Replace `jsonUnauthorized('Unauthorized', { basicRealm: 'Admin Area' })` with  
  `new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' } })`.
- Replace `logError('msg', err)` / `logWarn('msg', err)` with the previous pattern (e.g. `if (process.env.NODE_ENV === 'development') console.error(...)` or unconditional `console.error` where it was before).

**Routes to touch:**

- `app/api/bid/route.js`
- `app/api/donate/route.js`
- `app/api/admin/settings/route.js`
- `app/api/admin/close-all/route.js`
- `app/api/admin/toggle-auction/route.js`
- `app/api/admin/item/route.js`
- `app/api/admin/item/[id]/route.js`
- `app/api/admin/upload/route.js`
- `app/api/admin/vendor-admin/route.js`
- `app/api/admin/qr-codes/download/route.js`
- `app/api/admin/qr-codes/item/[id]/route.js`
- `app/api/admin/close-check/route.js`
- `app/api/vendor-auth/route.js`
- `app/api/vendor/item/route.js`
- `app/api/vendor/item/[id]/route.js`
- `app/api/categories/route.js`
- `app/api/csrf-token/route.js`

For **429** responses (rate limit), keep a JSON body and `Content-Type: application/json` if you had that before; otherwise match whatever the original was.

### 6. Revert `app/api/admin/upload/route.js` Extension Logic

- Use `file.name.split('.').pop()` again for the extension (and remove the `MIME_TO_EXT` map if you added it).
- Keep or revert the `jsonError`/`logError` changes per step 5.

### 7. Revert Client Components to No CSRF Requirement and Plain-Text Errors

**`app/i/[slug]/page.jsx` (bid):**

- Remove the dynamic import of `getJsonHeadersWithCsrf` and the use of `headers` from it.
- Use `headers: { 'Content-Type': 'application/json' }` again.
- In the `!res.ok` branch, use `const text = await res.text(); setMsg(text || 'Error placing bid');` (no JSON parsing).

**`components/DashboardBidForm.jsx`:**  
Same as above: no CSRF helper, plain `res.text()` for errors.

**`components/DonateForm.jsx`:**

- Remove `getJsonHeadersWithCsrf` and the check for `headers['x-csrf-token']`.
- Use the previous pattern: try to get a CSRF token and send it if present; don’t require it.
- On error, use `const text = await res.text(); setMsg(text || '...');` again.

**`components/AliasSelector.jsx`:**  
Remove the CSRF header helper and the “Security token missing” check; use `headers: { 'Content-Type': 'application/json' }` again.

**`components/AvatarGenerator.jsx`:**  
Same: remove CSRF helper and “Security token missing” check.

**`components/IconAliasSelector.jsx`:**  
Same as above.

### 8. Revert `components/DiceBearAvatar.jsx`

- Remove the comment about DiceBear and `dangerouslySetInnerHTML` (optional).

### 9. Alias Create Response Shape (Optional)

- In `app/api/alias/create/route.js`, if you want to restore the old “already registered” response: when the user already has an alias, return `existingAlias: existingUserAlias` again (full object). Only do this if you explicitly want to undo the PII minimization.

### 10. Verify

- Run `npm run build`.
- Smoke-test: create avatar → place bid (and donate if you use it).

---

## Quick Reference: Highest-Impact Single Change

If you need the **smallest possible** rollback to get the site working again:

- **Only revert `lib/csrf.js`** (make CSRF optional again) as in Option B.  
That alone should fix “users can’t bid / donate / create alias” without touching JSON errors, logger, or clients.

---

## Before You Push (Recommended)

Create a tag so you can always get back to “pre-review” state:

```bash
git tag pre-code-review-remediation
```

Then push your branch and the tag:

```bash
git push origin <branch>
git push origin pre-code-review-remediation
```

To restore that state later:  
`git checkout pre-code-review-remediation` (or create a new branch from that tag and deploy it).
