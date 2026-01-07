import { isValidEmailFormat, getEmailDomain, suggestEmailCorrection, isValidName } from '@/lib/validation';
import { generateVerificationToken } from '@/lib/emailVerification';
import { sendEmailVerification } from '@/lib/notifications';
import { supabaseServer } from '@/lib/serverSupabase';
import { checkRateLimit } from '@/lib/rateLimit';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);

/**
 * Send verification email to user BEFORE they create an alias
 * This ensures we only allow verified emails to create aliases
 */
export async function POST(req) {
  try {
    // Rate limiting: 5 verification emails per 10 minutes per IP
    // This prevents email spam/abuse
    const rateLimitResult = await checkRateLimit(req, 5, 10 * 60 * 1000);
    if (rateLimitResult) {
      return Response.json(
        { 
          error: 'Too many verification email requests. Please wait before requesting another.',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: { 
            'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString()
          }
        }
      );
    }

    const body = await req.json();
    const { email, name, company_website } = body;

    // Honeypot check: if company_website has any value, it's a bot
    if (company_website && company_website.trim().length > 0) {
      // Silently reject - return success to not reveal the honeypot
      return Response.json({
        success: true,
        message: 'Verification email sent. Please check your inbox.',
      });
    }

    if (!email || typeof email !== 'string') {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate name if provided (required for new users)
    if (name && typeof name === 'string') {
      const nameValidation = isValidName(name);
      if (!nameValidation.valid) {
        return Response.json(
          { error: nameValidation.error || 'Please enter a valid name' },
          { status: 400 }
        );
      }
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Step 1: Validate email format
    if (!isValidEmailFormat(trimmedEmail)) {
      const suggestion = suggestEmailCorrection(trimmedEmail);
      let errorMsg = 'Please enter a valid email address';
      if (suggestion) {
        errorMsg += `. Did you mean ${suggestion}?`;
      }
      return Response.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

    // Step 2: Validate domain exists
    const domain = getEmailDomain(trimmedEmail);
    if (!domain) {
      return Response.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check both MX records (preferred) and A records (fallback)
    let hasMxRecords = false;
    let hasARecords = false;

    try {
      const mxRecords = await Promise.race([
        resolveMx(domain),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('DNS lookup timeout')), 5000)
        )
      ]);
      hasMxRecords = mxRecords && mxRecords.length > 0;
    } catch (mxError) {
      try {
        const aRecords = await Promise.race([
          resolve4(domain),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('DNS lookup timeout')), 5000)
          )
        ]);
        hasARecords = aRecords && aRecords.length > 0;
      } catch (aError) {
        const suggestion = suggestEmailCorrection(trimmedEmail);
        let errorMsg = `The domain "${domain}" does not exist or cannot receive email. Please check for typos.`;
        if (suggestion) {
          errorMsg += ` Did you mean ${suggestion}?`;
        }
        return Response.json(
          { error: errorMsg },
          { status: 400 }
        );
      }
    }

    if (!hasMxRecords && !hasARecords) {
      const suggestion = suggestEmailCorrection(trimmedEmail);
      let errorMsg = `The domain "${domain}" does not appear to receive email. Please check for typos.`;
      if (suggestion) {
        errorMsg += ` Did you mean ${suggestion}?`;
      }
      return Response.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

    // Step 3: Check if email already has a verified alias
    const s = supabaseServer();
    const { data: existingAlias } = await s
      .from('user_aliases')
      .select('email_verified')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (existingAlias && existingAlias.email_verified) {
      return Response.json({
        error: 'This email already has a verified alias. Please use your existing account.',
        hasExistingAlias: true,
      }, { status: 400 });
    }

    // Note: Name is NOT stored in verified_emails table (it doesn't have a name column)
    // Name is passed via localStorage (auction_pending_name) and stored in user_aliases when alias is created
    // The verified_emails table only tracks: email, verified_at, created_at

    // Step 4: Generate verification token and send email
    const verificationToken = generateVerificationToken(trimmedEmail);
    
    // For local development, default to http://localhost:3000
    // In production, use NEXT_PUBLIC_SITE_URL from env
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    
    if (!siteUrl) {
      // Default to localhost for development
      siteUrl = process.env.NODE_ENV === 'production' 
        ? 'https://your-site.com' // Will fail - user must set NEXT_PUBLIC_SITE_URL in production
        : 'http://localhost:3000'; // Default for local dev
    } else {
      // Fix common localhost issues: https://localhost -> http://localhost
      if (siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1')) {
        siteUrl = siteUrl.replace(/^https:/, 'http:');
      }
    }
    
    // Ensure URL doesn't have trailing slash
    siteUrl = siteUrl.replace(/\/$/, '');
    
    const verificationLink = `${siteUrl}/verify-email?token=${encodeURIComponent(verificationToken)}&email=${encodeURIComponent(trimmedEmail)}`;

    // Get contact email from settings
    const { data: settings } = await s
      .from('settings')
      .select('contact_email')
      .eq('id', 1)
      .maybeSingle();

    const contactEmail = settings?.contact_email || process.env.AUCTION_CONTACT_EMAIL || null;

    // Send verification email
    try {
      await sendEmailVerification({
        email: trimmedEmail,
        name: name || trimmedEmail.split('@')[0],
        verificationLink,
        contactEmail,
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return Response.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
      email: trimmedEmail, // Return the email so frontend can display it
    });
  } catch (error) {
    console.error('Send verification error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

