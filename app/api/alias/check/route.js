import { supabaseServer } from '@/lib/serverSupabase';

export async function POST(req) {
  try {
    const body = await req.json();
    const { alias, email } = body;

    if (!alias || !email) {
      return Response.json(
        { error: 'Alias and email are required' },
        { status: 400 }
      );
    }

    const s = supabaseServer();

    // Check if alias exists (globally unique)
    const { data: existingAlias, error: aliasError } = await s
      .from('user_aliases')
      .select('email')
      .eq('alias', alias)
      .maybeSingle();

    if (aliasError) {
      console.error('Error checking alias:', aliasError);
      // Check if table doesn't exist
      if (aliasError.code === '42P01' || aliasError.message?.includes('does not exist')) {
        return Response.json(
          { error: 'Alias system not initialized. Please run database migration.', available: false },
          { status: 500 }
        );
      }
      return Response.json(
        { error: 'Error checking alias availability', available: false },
        { status: 500 }
      );
    }

    // If alias exists, check if it's the same email
    if (existingAlias) {
      if (existingAlias.email === email) {
        // Same user owns this alias - it's available to them
        return Response.json({ available: true, owned: true });
      } else {
        // Alias is taken by another user
        return Response.json({ available: false, owned: false });
      }
    }

    // Alias doesn't exist - it's available
    return Response.json({ available: true, owned: false });
  } catch (error) {
    console.error('Alias check error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

