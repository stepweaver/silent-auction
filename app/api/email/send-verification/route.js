import { isValidEmailFormat, getEmailDomain, suggestEmailCorrection } from '@/lib/validation';
import { generateVerificationToken } from '@/lib/emailVerification';
import { sendEmailVerification } from '@/lib/notifications';
import { supabaseServer } from '@/lib/serverSupabase';
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
    const body = await req.json();
    const { email, name } = body;

    if (!email || typeof email !== 'string') {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
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

