import { supabaseServer } from '@/lib/serverSupabase';

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, alias, color, animal, icon, avatar_style, avatar_seed, name } = body;

    // Support old system (color/animal), new system (color/icon), and avatar system (avatar_style/avatar_seed)
    if (!email || !alias) {
      return Response.json(
        { error: 'Email and alias are required' },
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

    // Create new alias - support old (color/animal), new (color/icon), and avatar systems
    const insertData = {
      email,
      alias,
    };

    // Add name if provided
    if (name) {
      insertData.name = name.trim();
    }

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
      insertData.avatar_seed = avatar_seed || email;
    }

    const { data: newAlias, error: insertError } = await s
      .from('user_aliases')
      .insert(insertData)
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

