import { supabaseServer } from '@/lib/serverSupabase';
import { isValidEmailFormat, getEmailDomain, suggestEmailCorrection } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyCSRFToken } from '@/lib/csrf';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);

export async function POST(req) {
  try {
    // Rate limiting disabled for testing
    // const rateLimitResult = await checkRateLimit(req, 5, 60 * 60 * 1000);
    // if (rateLimitResult) {
    //   return Response.json(
    //     { 
    //       error: 'Too many alias creation requests. Please try again later.',
    //       retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
    //     },
    //     { 
    //       status: 429,
    //       headers: { 
    //         'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
    //         'X-RateLimit-Limit': '5',
    //         'X-RateLimit-Remaining': '0',
    //         'X-RateLimit-Reset': rateLimitResult.resetAt.toString()
    //       }
    //     }
    //   );
    // }

    // CSRF protection for state-changing operations
    const csrfValid = await verifyCSRFToken(req);
    if (!csrfValid) {
      return Response.json(
        { error: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      email,
      alias,
      color,
      animal,
      icon,
      avatar_style,
      avatar_seed,
      name: requestName,
    } = body;

    // Always log request (for debugging)
    console.log('[ALIAS CREATE] Request received:', {
      email: email,
      alias,
      hasColor: !!color,
      hasAnimal: !!animal,
      hasIcon: !!icon,
      hasAvatarStyle: !!avatar_style,
      timestamp: new Date().toISOString()
    });

    // Support old system (color/animal), new system (color/icon), and avatar system (avatar_style/avatar_seed)
    if (!email || !alias) {
      return Response.json(
        { error: 'Email and alias are required' },
        { status: 400 }
      );
    }

    // Validate email format - normalize consistently
    const trimmedEmail = email.toLowerCase().trim();
    
    console.log('[ALIAS CREATE] Normalized email:', trimmedEmail);
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

    // Validate email domain (check if it can receive email)
    // This is CRITICAL - we must verify the domain exists before allowing registration
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
      // Check MX records first with timeout
      const mxRecords = await Promise.race([
        resolveMx(domain),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('DNS lookup timeout')), 5000)
        )
      ]);
      hasMxRecords = mxRecords && mxRecords.length > 0;
    } catch (mxError) {
      // If MX lookup fails, check A records as fallback
      try {
        const aRecords = await Promise.race([
          resolve4(domain),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('DNS lookup timeout')), 5000)
          )
        ]);
        hasARecords = aRecords && aRecords.length > 0;
      } catch (aError) {
        // Both lookups failed - domain doesn't exist
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

    // Domain must have either MX or A records to be valid
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

    // If using avatar system, don't require color/animal/icon
    if (!avatar_style && !color) {
      return Response.json(
        { error: 'Color is required' },
        { status: 400 }
      );
    }

    // Require either animal (old) or icon (new) or avatar_style
    if (!avatar_style && !animal && !icon) {
      return Response.json(
        { error: 'Either animal (old), icon (new), or avatar_style is required' },
        { status: 400 }
      );
    }

    const s = supabaseServer();

    // Check if user already has an alias (use trimmed email)
    const { data: existingUserAlias, error: checkError } = await s
      .from('user_aliases')
      .select('*')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (checkError) {
      // Log error server-side only, don't expose details to client
      if (process.env.NODE_ENV === 'development') {
        console.error('Error checking existing alias:', checkError);
      }
      return Response.json(
        { error: 'Error checking existing alias' },
        { status: 500 }
      );
    }

    // If user already has an alias, return error with existing alias info
    if (existingUserAlias) {
      return Response.json(
        {
          error: 'This email already has an alias. Please use your existing alias or contact support to change it.',
          existingAlias: existingUserAlias,
        },
        { status: 400 }
      );
    }

    // Check if alias is already taken
    const { data: existingAlias, error: aliasError } = await s
      .from('user_aliases')
      .select('email')
      .eq('alias', alias)
      .maybeSingle();

    if (aliasError) {
      // Log error server-side only, don't expose details to client
      if (process.env.NODE_ENV === 'development') {
        console.error('Error checking alias:', aliasError);
      }
      return Response.json(
        { error: 'Error checking alias availability' },
        { status: 500 }
      );
    }

    if (existingAlias) {
      return Response.json(
        { error: 'This alias is already taken. Please choose another.' },
        { status: 400 }
      );
    }

    // BEST PRACTICE: Check verified_emails table, NOT user_aliases
    // This ensures we only create aliases for verified emails
    // Check if record exists (we'll verify verified_at is not null after)
    let emailRecord = null;
    let emailRecordError = null;
    
    try {
      const result = await s
        .from('verified_emails')
        .select('email, verified_at')
        .eq('email', trimmedEmail)
        .maybeSingle();
      
      emailRecord = result.data;
      emailRecordError = result.error;
    } catch (err) {
      console.error('[ALIAS CREATE] Exception checking email verification record:', {
        error: err,
        message: err?.message,
        stack: err?.stack,
        email: trimmedEmail,
        timestamp: new Date().toISOString()
      });
      return Response.json(
        { error: `Error checking email verification status: ${err?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    if (emailRecordError) {
      console.error('[ALIAS CREATE] Supabase error checking email verification record:', {
        error: emailRecordError,
        code: emailRecordError?.code,
        message: emailRecordError?.message,
        details: emailRecordError?.details,
        hint: emailRecordError?.hint,
        email: trimmedEmail,
        timestamp: new Date().toISOString()
      });
      return Response.json(
        { error: `Error checking email verification status: ${emailRecordError?.message || 'Database error'}` },
        { status: 500 }
      );
    }

    // CRITICAL: Email must be verified before creating alias
    // Log details for debugging (always log, not just in dev)
    console.log('[ALIAS CREATE] Verification check:', {
      email: trimmedEmail,
      found: !!emailRecord,
      emailInDB: emailRecord?.email,
      verified_at: emailRecord?.verified_at,
      verified: !!(emailRecord?.verified_at),
      timestamp: new Date().toISOString()
    });

    if (!emailRecord) {
      console.error(`[ALIAS CREATE] No verification record found for email: ${trimmedEmail} at ${new Date().toISOString()}`);
      return Response.json(
        { error: 'Please verify your email address before creating an alias. Check your email for the verification link.' },
        { status: 400 }
      );
    }

    if (!emailRecord.verified_at || emailRecord.verified_at === null) {
      console.error(`[ALIAS CREATE] Email record exists but not verified. Email: ${trimmedEmail}, verified_at: ${emailRecord.verified_at} at ${new Date().toISOString()}`);
      return Response.json(
        { error: 'Please verify your email address before creating an alias. Check your email for the verification link.' },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[ALIAS CREATE] Verification check passed. Email: ${trimmedEmail}, verified_at: ${emailRecord.verified_at}`);
    }

    // Use the verified email record
    const verifiedEmail = emailRecord;

    // verified_emails table doesn't have a name column - use name from request
    // If no name provided, generate one from email or alias
    const fallbackName = typeof requestName === 'string' ? requestName.trim() : '';
    let finalName = fallbackName;
    
    // If no name provided, use alias or email username as fallback
    if (!finalName) {
      if (alias) {
        finalName = alias; // Use alias as name if no name provided
      } else {
        // Generate name from email
        const emailUsername = trimmedEmail.split('@')[0];
        finalName = emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
      }
    }

    // Note: verified_emails table doesn't store name, so we just use the request name

    // Email is verified and no alias exists (we already checked existingUserAlias above) - create the alias
    // This is the FIRST and ONLY time we write to user_aliases
    const insertData = {
      email: trimmedEmail,
      alias,
      name: finalName,
      email_verified: true, // Mark as verified since we checked verified_emails
    };

    // Add color (required for all systems)
    if (color) {
      insertData.color = color;
    }

    // Add old system field if provided
    if (animal) {
      insertData.animal = animal;
    }

    // Add new icon system field if provided
    if (icon) {
      insertData.icon = icon;
    }

    // Add avatar system fields if provided
    if (avatar_style) {
      insertData.avatar_style = avatar_style;
      insertData.avatar_seed = avatar_seed || trimmedEmail;
    }

    // Create the alias (FIRST write to user_aliases - only after verification)
    const { data: newAlias, error: insertError } = await s
      .from('user_aliases')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      // Log error server-side only, don't expose details to client
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating alias:', insertError);
      }

      // Check for unique constraint violation (alias already taken)
      if (insertError.code === '23505') {
        return Response.json(
          { error: 'This alias is already taken. Please choose another.' },
          { status: 400 }
        );
      }

      return Response.json(
        { error: 'Error creating alias' },
        { status: 500 }
      );
    }

    // Alias created successfully - email was verified, alias is now created
    return Response.json({
      alias: newAlias,
      message: 'Alias created successfully!',
    });
  } catch (error) {
    // Log error server-side only, don't expose details to client
    if (process.env.NODE_ENV === 'development') {
      console.error('[ALIAS CREATE] Error:', error);
      console.error('[ALIAS CREATE] Error stack:', error.stack);
    }
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

