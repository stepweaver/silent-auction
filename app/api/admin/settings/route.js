import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { checkBasicAuth } from '@/lib/auth';
import { SettingsSchema } from '@/lib/validation';

export async function PATCH(req) {
  const headersList = await headers();
  if (!checkBasicAuth(headersList)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const body = await req.json();
    const parsed = SettingsSchema.safeParse(body);

    if (!parsed.success) {
      return new Response('Invalid settings data', { status: 400 });
    }

    const updateData = parsed.data;
    const s = supabaseServer();

    const { data: settings, error } = await s
      .from('settings')
      .update(updateData)
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      // If settings don't exist, create them
      if (error.code === 'PGRST116') {
        const { data: newSettings, error: insertError } = await s
          .from('settings')
          .insert({ id: 1, ...updateData })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          return new Response('Failed to create settings', { status: 500 });
        }
        return Response.json({ ok: true, settings: newSettings });
      }

      console.error('Update error:', error);
      return new Response('Failed to update settings', { status: 500 });
    }

    return Response.json({ ok: true, settings });
  } catch (error) {
    console.error('Update settings error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
