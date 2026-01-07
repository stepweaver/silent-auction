import { supabaseServer } from '@/lib/serverSupabase';

/**
 * Check if an email is verified before allowing avatar creation
 * This endpoint helps the frontend pre-check verification status
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return Response.json(
        { verified: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Normalize email consistently
    const normalizedEmail = email.toLowerCase().trim();

    const s = supabaseServer();

    // Check if email is verified in verified_emails table
    const { data: verifiedEmail, error } = await s
      .from('verified_emails')
      .select('verified_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error checking verification:', error);
      }
      return Response.json(
        { verified: false, error: 'Error checking verification status' },
        { status: 500 }
      );
    }

    // Email is verified if verified_at is not null
    const verified = verifiedEmail?.verified_at !== null && verifiedEmail?.verified_at !== undefined;

    return Response.json({
      verified,
      verifiedAt: verifiedEmail?.verified_at || null,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Check verification error:', error);
    }
    return Response.json(
      { verified: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
