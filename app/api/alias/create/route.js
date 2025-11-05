import { supabaseServer } from '@/lib/serverSupabase';

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, alias, color, animal } = body;

    if (!email || !alias || !color || !animal) {
      return Response.json(
        { error: 'Email, alias, color, and animal are required' },
        { status: 400 }
      );
    }

    const s = supabaseServer();

    // Check if user already has an alias
    const { data: existingUserAlias, error: checkError } = await s
      .from('user_aliases')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing alias:', checkError);
      return Response.json(
        { error: 'Error checking existing alias' },
        { status: 500 }
      );
    }

    // If user already has an alias, return it
    if (existingUserAlias) {
      return Response.json({
        alias: existingUserAlias,
        message: 'User already has an alias',
      });
    }

    // Check if alias is already taken
    const { data: existingAlias, error: aliasError } = await s
      .from('user_aliases')
      .select('email')
      .eq('alias', alias)
      .maybeSingle();

    if (aliasError) {
      console.error('Error checking alias:', aliasError);
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

    // Create new alias
    const { data: newAlias, error: insertError } = await s
      .from('user_aliases')
      .insert({
        email,
        alias,
        color,
        animal,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating alias:', insertError);
      
      // Check for unique constraint violation
      if (insertError.code === '23505') {
        return Response.json(
          { error: 'This alias or email is already registered' },
          { status: 400 }
        );
      }

      return Response.json(
        { error: 'Error creating alias' },
        { status: 500 }
      );
    }

    return Response.json({
      alias: newAlias,
      message: 'Alias created successfully',
    });
  } catch (error) {
    console.error('Alias creation error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

