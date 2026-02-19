# Silent Auction Platform

A real-time silent auction platform built with Next.js 15, Supabase, and Tailwind CSS.

## Features

- **Real-time bidding**: Live updates when bids are placed
- **QR code access**: Per-item QR codes for easy in-room access
- **Admin dashboard**: Create/edit items, manage settings, extend deadlines
- **Manual closing**: Close all items from the admin dashboard and trigger winner notifications
- **Winner display**: Shows winning bids and pickup/payment instructions after close

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

## Setup

### 1. Clone and Install

```bash
npm install
```

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. **Create Storage Bucket for Photos:**

   - Go to **Storage** in your Supabase dashboard
   - Click **"New bucket"**
   - Name it `item-photos`
   - Make it **Public** (so images can be accessed)
   - Click **Create bucket**
   - Go to **Policies** tab and create:
     - **SELECT policy**: Allow public read (for `authenticated` and `anon` roles)
     - The upload API uses Service Role key, so no INSERT policy needed in UI

3. Go to **SQL Editor** in your Supabase dashboard
4. **If this is a NEW database**: Run the contents of `supabase-schema.sql` to create tables, views, and policies
   - The SQL already includes enabling Realtime for the `bids` table
5. **If you have an EXISTING database**: Run `supabase-migration.sql` first to update the bids table schema, then run the rest of `supabase-schema.sql` for any missing tables/views
6. Verify Realtime is enabled:

   - Go to **Database → Tables**
   - Click on the `bids` table
   - Check that "Enable Realtime" is toggled ON in the table settings
   - Alternatively, ensure Realtime is enabled for your project: **Project Settings → API → Realtime**

7. **Optional: Auction open time** – To set when bidding opens (admin-configurable):
   - Run the contents of `supabase-auction-start-migration.sql` in the SQL Editor
   - This adds an `auction_start` column to the settings table

8. **Set up Supabase Keep-Alive (Prevent Free Tier Pausing):**
   - Go to **SQL Editor** in your Supabase dashboard
   - Run the contents of `supabase-heartbeat-migration.sql` to create the heartbeat table
   - This creates a simple table that GitHub Actions can ping to keep your Supabase project active
   - See the [Keep-Alive Setup](#keep-alive-setup) section below for GitHub Actions configuration

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Basic Auth for Admin
BASIC_AUTH_USER=admin
BASIC_AUTH_PASS=some-strong-pass

# Auction Settings (optional - can also be set in admin)
NEXT_PUBLIC_CONTACT_EMAIL=pto@example.org
PAYMENT_INSTRUCTIONS="Pay at checkout table by 9pm. We accept cash and check only."
PICKUP_INSTRUCTIONS="Pickup at gym stage tonight or Monday 3–5pm in the office with receipt."

# Notification Settings
# Site URL for links inside emails
NEXT_PUBLIC_SITE_URL=https://your-auction-site.com

# Email notifications via Resend (required for bid confirmations and winner notices)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Admin emails (comma-separated) - will receive winners list when auction closes
ADMIN_EMAILS=admin1@example.org,admin2@example.org

# Security Secrets (REQUIRED for production)
# Generate strong random strings for these (at least 32 characters)
VERIFICATION_SECRET=your-strong-random-secret-for-email-verification
ENROLLMENT_SECRET=your-strong-random-secret-for-vendor-enrollment
JWT_SECRET=your-strong-random-secret-for-jwt-sessions
CSRF_SECRET=your-strong-random-secret-for-csrf-protection
```

**Where to find Supabase keys:**

- Go to your Supabase project → Settings → API
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `anon` `public` key
- `SUPABASE_SERVICE_ROLE_KEY` = `service_role` `secret` key (keep this secure!)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

### Public Routes

- `/` - Catalog of all items with current bids and QR codes
- `/i/[slug]` - Individual item page with bid form
- `/health` - Health check endpoint

### Admin Routes (Basic Auth Protected)

Access with the username/password from your `.env.local`:

- `/admin` - Dashboard with deadline management and item list
- `/admin/items/new` - Create a new item
- `/admin/items/[id]` - Edit an existing item

### Admin Features

- **Extend deadline**: Add 30 minutes to the auction deadline
- **Close all items**: Immediately close bidding on all items (required when the deadline passes)
- **Edit items**: Update title, description, prices, photos, and status
- **View QR codes**: See QR codes for each item in the admin dashboard

### Closing the Auction

1. Wait until the bidding deadline you configured.
2. Log into `/admin` with the Basic Auth credentials.
3. Click **Close all items now**.
4. Confirm the prompt; the system will mark every item as closed, email winners, and send the admin summary.
5. If any items remain open (for example, if new items were added later), resolve them and run **Close all items now** again.

## Deployment

### Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables on Vercel

Make sure to add all environment variables from `.env.local` in the Vercel project settings.

## Database Schema

The schema includes:

- **settings**: Global auction settings (deadline, contact info, instructions)
- **items**: Auction items with prices, photos, and status
- **bids**: All bids placed on items
- **item_leaders**: View showing current high bid and next minimum bid per item

See `supabase-schema.sql` for full schema and RLS policies.

## Security

### Authentication & Authorization

- Admin routes protected with Basic Auth
- Vendor admin authentication uses JWT-based sessions (secure token-based auth)
- Email verification required before alias creation and bidding
- Row Level Security (RLS) policies on all tables
- Service Role key only used server-side

### Rate Limiting

- Bid placement: 20 requests per minute per IP
- Email verification: 3 requests per 10 minutes per IP
- Alias creation: 5 requests per hour per IP
- Vendor authentication: 5 requests per 15 minutes per IP

### CSRF Protection

- CSRF tokens required for all state-changing operations (bids, alias creation)
- Tokens are signed and time-limited (1 hour expiration)
- Prevents cross-site request forgery attacks

### Input Validation

- Server-side validation of bids (minimum increment, deadline)
- Zod schema validation on all API routes
- Email format and domain validation
- File upload type and size validation

### Error Handling

- No sensitive error details exposed to clients
- Errors logged server-side only in development mode
- Secure error messages for production

## Realtime Updates

Supabase Realtime is used to automatically update:

- Catalog page when any bid is placed
- Item detail page when bids are placed on that item

**To enable Realtime:**

1. The SQL schema already includes a command to add the `bids` table to Realtime
2. Ensure Realtime is enabled at the project level: **Project Settings → API → Realtime** (should be ON by default)
3. Verify the `bids` table has Realtime enabled: **Database → Tables → `bids` → Enable Realtime toggle**

## Notifications

The platform uses an opt-in email system powered by Resend to send notifications. Users should monitor their dashboard for live updates on items they've bid on.

**Email Notifications Setup (Required):**

1. Sign up at [resend.com](https://resend.com) (free tier available - 3,000 emails/month)
2. Get your API key from the dashboard
3. Verify your domain or use Resend's test domain
4. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to your `.env.local`

**What emails are sent:**

- **Bid Confirmation** (Opt-in only): Sent only for a user's initial bid on each item (not subsequent bids on the same item). Users must explicitly opt-in through their dashboard to receive these emails. Includes bid amount and link to item.
- **Winner Notification** (Required): Sent automatically when auction closes to the winning bidder. Includes payment/pickup instructions. Cannot be opted out of.
- **Email Verification** (Required): Sent during registration to verify email addresses and prevent fraud. Cannot be opted out of.
- **Security Alerts** (Required): Sent if a user's alias is accessed from a new device or location. Cannot be opted out of.
- **Admin Winners List**: Sent to all admins (configured in `ADMIN_EMAILS`) when auction closes, containing a list of all winners with names, emails, and winning bid amounts

**Opt-In System Details:**

- Bid confirmation emails are **disabled by default** and require explicit opt-in
- Users can enable/disable bid confirmations at any time through their dashboard (avatar/profile page)
- Only initial bids on each item trigger confirmation emails (not every bid)
- Winner notifications and other essential emails are sent automatically and cannot be opted out of
- The system monitors opt-in rates and can alert administrators if rates exceed 50%

## Keep-Alive Setup

To prevent your Supabase Free tier project from pausing due to inactivity, this project includes a GitHub Actions workflow that pings Supabase every 6 hours.

### Why This Matters

Supabase Free tier projects can be paused after periods of inactivity. While pings don't guarantee prevention, they significantly reduce the chance of pausing. The only guaranteed way to avoid pausing is to upgrade to a paid plan.

### Setup Steps

1. **Create the heartbeat table** (if you haven't already):

   - Go to **Supabase Dashboard → SQL Editor**
   - Run the contents of `supabase-heartbeat-migration.sql`
   - This creates a simple table with anonymous read access

2. **Push your code to GitHub**:

   - Make sure your repository is on GitHub (public repos are free for GitHub Actions)
   - The workflow file is already in `.github/workflows/supabase-keepalive.yml`

3. **Add GitHub Secrets**:

   - Go to your GitHub repository → **Settings → Secrets and variables → Actions**
   - The workflow uses these secrets (you may already have them):
     - `SUPABASE_URL`: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key (found in **Project Settings → API**)
   - If you don't have these secrets yet, click **New repository secret** to add them

4. **Test the workflow**:

   - Go to **Actions** tab in your GitHub repository
   - Find "Supabase Keepalive" workflow
   - Click **Run workflow** to manually trigger it
   - Verify it completes successfully

5. **Verify it's running**:
   - The workflow runs automatically every 6 hours (at 00:00, 06:00, 12:00, and 18:00 UTC)
   - You can check the **Actions** tab to see run history
   - Each run should show "Ping OK" if successful

### How It Works

- The workflow uses GitHub Actions cron to run every 6 hours
- It makes a simple GET request to your Supabase REST API (`/rest/v1/heartbeat`)
- Uses only the public anon key (safe to expose)
- Only reads from the heartbeat table (no write permissions needed)

### Adjusting the Schedule

To change how often it pings, edit `.github/workflows/supabase-keepalive.yml` and modify the cron schedule:

- `"0 */6 * * *"` = Every 6 hours
- `"0 */4 * * *"` = Every 4 hours
- `"0 */12 * * *"` = Every 12 hours

See [GitHub Actions cron syntax](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions#onschedule) for more options.

## Future Enhancements

- Soft-close (extend deadline on late bids)
- Buy-It-Now prices
- CSV export of winners
- Countdown timer component

## License

ISC
