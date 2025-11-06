import { supabaseServer } from '@/lib/serverSupabase';
import { verifyVerificationToken } from '@/lib/emailVerification';

export async function POST(req) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return Response.json(
        { verified: false, error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Verify the token
    const tokenData = verifyVerificationToken(token);
    if (!tokenData) {
      return Response.json(
        { verified: false, error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    const { email } = tokenData;
    const trimmedEmail = email.toLowerCase().trim();
    const s = supabaseServer();

    // BEST PRACTICE: Only write to verified_emails table, NOT user_aliases
    // This ensures we never create user records until they actually create an alias
    
    // Check if already verified
    const { data: existingVerification } = await s
      .from('verified_emails')
      .select('*')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (existingVerification) {
      // Already verified - update timestamp to extend validity
      const { error: updateError } = await s
        .from('verified_emails')
        .update({ verified_at: new Date().toISOString() })
        .eq('email', trimmedEmail);

      if (updateError) {
        console.error('Error updating verification timestamp:', updateError);
        // Continue anyway - verification still valid
      }

      // Check if user already has an alias
      const { data: existingAlias } = await s
        .from('user_aliases')
        .select('*')
        .eq('email', trimmedEmail)
        .maybeSingle();

      return Response.json({
        verified: true,
        message: existingAlias 
          ? 'Email already verified. You can use your existing alias.'
          : 'Email already verified. You can now create your alias.',
        alias: existingAlias || null,
      });
    }

    // Mark email as verified in verified_emails table (NOT user_aliases)
    const { error: insertError } = await s
      .from('verified_emails')
      .insert({
        email: trimmedEmail,
        verified_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error recording email verification:', insertError);
      // Check if it's a unique constraint violation (already exists)
      if (insertError.code === '23505') {
        // Already verified, return success
        const { data: existingAlias } = await s
          .from('user_aliases')
          .select('*')
          .eq('email', trimmedEmail)
          .maybeSingle();

        return Response.json({
          verified: true,
          message: 'Email verified successfully. You can now create your alias.',
          alias: existingAlias || null,
        });
      }

      return Response.json(
        { verified: false, error: 'Error recording verification' },
        { status: 500 }
      );
    }

    // Check if user already has an alias (for existing users)
    const { data: existingAlias } = await s
      .from('user_aliases')
      .select('*')
      .eq('email', trimmedEmail)
      .maybeSingle();

    return Response.json({
      verified: true,
      message: existingAlias
        ? 'Email verified successfully. You can use your existing alias.'
        : 'Email verified successfully. You can now create your alias.',
      alias: existingAlias || null,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return Response.json(
      { verified: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

