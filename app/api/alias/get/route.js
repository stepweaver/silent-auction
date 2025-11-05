import { supabaseServer } from '@/lib/serverSupabase';

export async function POST(req) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const s = supabaseServer();

    // Get user's alias
    const { data: alias, error } = await s
      .from('user_aliases')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error fetching alias:', error);
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return Response.json(
          { error: 'Alias system not initialized. Please run database migration.', alias: null },
          { status: 500 }
        );
      }
      return Response.json(
        { error: 'Error fetching alias', alias: null },
        { status: 500 }
      );
    }

    if (!alias) {
      return Response.json({ alias: null });
    }

    return Response.json({ alias });
  } catch (error) {
    console.error('Get alias error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

