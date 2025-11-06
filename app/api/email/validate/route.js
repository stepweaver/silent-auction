import { isValidEmailFormat, getEmailDomain, suggestEmailCorrection } from '@/lib/validation';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);

/**
 * Validates an email address by:
 * 1. Checking format validity
 * 2. Checking if the domain exists and can receive email (MX or A records)
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return Response.json(
        { valid: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Step 1: Validate email format
    if (!isValidEmailFormat(trimmedEmail)) {
      const suggestion = suggestEmailCorrection(trimmedEmail);
      return Response.json({
        valid: false,
        error: 'Please enter a valid email address',
        suggestion: suggestion || null,
      });
    }

    // Step 2: Extract and validate domain
    const domain = getEmailDomain(trimmedEmail);
    if (!domain) {
      return Response.json({
        valid: false,
        error: 'Invalid email format',
      });
    }

    // Step 3: Check if domain exists and can receive email
    // We check both MX records (preferred) and A records (fallback for some mail servers)
    let hasMxRecords = false;
    let hasARecords = false;
    let dnsError = null;

    // Check MX records first (preferred method)
    try {
      const mxRecords = await Promise.race([
        resolveMx(domain),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('DNS lookup timeout')), 5000)
        )
      ]);
      
      hasMxRecords = mxRecords && mxRecords.length > 0;
    } catch (mxError) {
      dnsError = mxError;
      // If MX lookup fails, check A records as fallback
      // Some mail servers use A records instead of MX
      try {
        const aRecords = await Promise.race([
          resolve4(domain),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('DNS lookup timeout')), 5000)
          )
        ]);
        hasARecords = aRecords && aRecords.length > 0;
      } catch (aError) {
        // Both MX and A lookups failed - domain doesn't exist
        const suggestion = suggestEmailCorrection(trimmedEmail);
        return Response.json({
          valid: false,
          error: `The domain "${domain}" does not exist or cannot receive email. Please check for typos.`,
          suggestion: suggestion || null,
        });
      }
    }

    // Domain must have either MX or A records to be valid
    if (!hasMxRecords && !hasARecords) {
      const suggestion = suggestEmailCorrection(trimmedEmail);
      return Response.json({
        valid: false,
        error: `The domain "${domain}" does not appear to receive email. Please check for typos.`,
        suggestion: suggestion || null,
      });
    }

    // Domain has MX or A records - email is valid
    return Response.json({
      valid: true,
      domain: domain,
    });
  } catch (error) {
    console.error('Email validation error:', error);
    // On any error, reject the email to be safe
    return Response.json(
      { valid: false, error: 'Unable to verify email address. Please check for typos and try again.' },
      { status: 500 }
    );
  }
}

