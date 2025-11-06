# Silent Auction Platform

A real-time silent auction platform built with Next.js 15, Supabase, and Tailwind CSS.

## Features

- **Real-time bidding**: Live updates when bids are placed
- **QR code access**: Per-item QR codes for easy in-room access
- **Admin dashboard**: Create/edit items, manage settings, extend deadlines
- **Deadline enforcement**: Automatic bidding cutoff at auction deadline
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
AUCTION_CONTACT_EMAIL=pto@example.org
PAYMENT_INSTRUCTIONS="Pay at checkout table by 9pm. We accept cash, card, and Venmo @SchoolPTO."
PICKUP_INSTRUCTIONS="Pickup at gym stage tonight or Monday 3–5pm in the office with receipt."

# Notification Settings
# Site URL for links inside emails
NEXT_PUBLIC_SITE_URL=https://your-auction-site.com

# Email notifications via Resend (required for bid confirmations and winner notices)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
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
- **Close all items**: Immediately close bidding on all items
- **Edit items**: Update title, description, prices, photos, and status
- **View QR codes**: See QR codes for each item in the admin dashboard

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

- Admin routes protected with Basic Auth
- Row Level Security (RLS) policies on all tables
- Server-side validation of bids (minimum increment, deadline)
- Service Role key only used server-side

## Realtime Updates

Supabase Realtime is used to automatically update:

- Catalog page when any bid is placed
- Item detail page when bids are placed on that item

**To enable Realtime:**

1. The SQL schema already includes a command to add the `bids` table to Realtime
2. Ensure Realtime is enabled at the project level: **Project Settings → API → Realtime** (should be ON by default)
3. Verify the `bids` table has Realtime enabled: **Database → Tables → `bids` → Enable Realtime toggle**

## Notifications

The platform sends email notifications for bid confirmations and winner notifications. Users should monitor their dashboard for live updates on items they've bid on.

**Email Notifications (Required):**

1. Sign up at [resend.com](https://resend.com) (free tier available - 3,000 emails/month)
2. Get your API key from the dashboard
3. Verify your domain or use Resend's test domain
4. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to your `.env.local`

**What emails are sent:**

- **Bid Confirmation**: Sent immediately when a bid is placed (includes bid amount and link to item)
- **Winner Notification**: Sent when auction closes to the winning bidder (includes payment/pickup instructions)

## Future Enhancements

- Soft-close (extend deadline on late bids)
- Buy-It-Now prices
- Email/SMS notifications to winners (after auction closes)
- CSV export of winners
- Countdown timer component

## License

ISC
