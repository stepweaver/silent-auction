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
    // Rate limiting: 5 alias creations per hour per IP
    const rateLimitResult = await checkRateLimit(req, 5, 60 * 60 * 1000);
    if (rateLimitResult) {
      return Response.json(
        { 
          error: 'Too many alias creation requests. Please try again later.',
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

    // Support old system (color/animal), new system (color/icon), and avatar system (avatar_style/avatar_seed)
    if (!email || !alias) {
      return Response.json(
        { error: 'Email and alias are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const trimmedEmail = email.trim().toLowerCase();
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
    const { data: verifiedEmail } = await s
      .from('verified_emails')
      .select('email, name, verified_at')
      .eq('email', trimmedEmail)
      .maybeSingle();

    // CRITICAL: Email must be verified before creating alias
    if (!verifiedEmail) {
      return Response.json(
        { error: 'Please verify your email address before creating an alias. Check your email for the verification link.' },
        { status: 400 }
      );
    }

    if (!verifiedEmail.verified_at) {
      return Response.json(
        { error: 'Please verify your email address before creating an alias. Check your email for the verification link.' },
        { status: 400 }
      );
    }

    const verifiedName = typeof verifiedEmail.name === 'string' ? verifiedEmail.name.trim() : '';
    const fallbackName = typeof requestName === 'string' ? requestName.trim() : '';
    const finalName = verifiedName || fallbackName;

    if (!finalName) {
      return Response.json(
        { error: 'We could not find your name for this email. Please restart the registration flow so we can capture it.' },
        { status: 400 }
      );
    }

    if (!verifiedName && finalName) {
      try {
        await s
          .from('verified_emails')
          .update({ name: finalName })
          .eq('email', trimmedEmail);
      } catch (namePersistError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to persist verified name metadata:', namePersistError);
        }
      }
    }

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
      console.error('Alias creation error:', error);
    }
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

