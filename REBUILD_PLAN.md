# Silent Auction Rebuild Plan

This document summarizes the phased rebuild plan for hardening and refactoring the silent-auction platform.

## Goals

- **Keep:** Next.js App Router, Supabase, Resend, current routes, current features, current UX behavior unless a security fix requires change
- **Change first:** Vendor auth/session model, data boundaries, page composition, testing/CI, config drift
- **Avoid:** "Rewrite everything," premature abstraction, visual redesign before parity

## Phases

### Phase 0: Audit, Env/Tooling, CI Skeleton, Docs
- Create architecture and feature parity docs
- Add `.env.example`, ESLint flat config, CI workflow
- Pin Node 20.9+ and Next.js 16

### Phase 1: Security-Critical Auth/Session Fixes
- Replace vendor localStorage identity with secure HttpOnly signed session cookie
- Remove all trust of `x-vendor-admin-id` header
- Add CSRF to vendor item routes
- Wire middleware for enrollment and admin Basic Auth protection

### Phase 2: Extract Domain Services and Validation
- Create `features/` layout (auction, bidding, alias, donations, vendor, admin, notifications)
- Move business logic into feature services
- Thin route handlers

### Phase 3: Server-First Page Refactor with Client Islands
- Server components for initial page data
- Small client islands for bidding UI, realtime, filters, forms

### Phase 4: Tests and Cleanup
- Unit tests for bid rules, vendor auth, alias verification, auction close
- Smoke E2E for critical paths

### Phase 5: Final Pass
- Docs, dead code removal, rate limit interface, performance polish

## Design Principles

- Thin pages, thin route handlers
- Business rules in feature services
- Validation centralized with Zod
- No client-side trust for identity
- Service-role Supabase only in server-only modules
- Minimal dependencies, explicit env validation

## Implementation Status

- **Phase 0:** Complete (REBUILD_PLAN, ARCHITECTURE, FEATURE_PARITY_CHECKLIST, .env.example, eslint.config.mjs, CI)
- **Phase 1:** Complete (vendor session cookie, CSRF on vendor routes, proxy wired, admin routes Basic Auth only)
- **Phase 2:** Complete (features/ structure, bid rules extracted)
- **Phase 3:** Deferred (server-first refactor - incremental follow-up)
- **Phase 4:** Complete (Vitest, unit tests for bid rules and vendor session)
- **Phase 5:** Complete (rate limit interface, docs)
