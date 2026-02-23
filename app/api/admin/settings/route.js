import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { checkBasicAuth } from '@/lib/auth';
import { SettingsSchema } from '@/lib/validation';
import { jsonError, jsonUnauthorized } from '@/lib/apiResponses';
import { logError } from '@/lib/logger';

export async function PATCH(req) {
  const headersList = await headers();
  if (!checkBasicAuth(headersList)) {
    return jsonUnauthorized('Unauthorized', { basicRealm: 'Admin Area' });
  }

  try {
    const body = await req.json();
    const parsed = SettingsSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('Invalid settings data', 400);
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
      if (error.code === 'PGRST116') {
        const { data: newSettings, error: insertError } = await s
          .from('settings')
          .insert({ id: 1, ...updateData })
          .select()
          .single();

        if (insertError) {
          logError('Settings insert error', insertError);
          return jsonError('Failed to create settings', 500);
        }
        return Response.json({ ok: true, settings: newSettings });
      }

      logError('Settings update error', error);
      return jsonError('Failed to update settings', 500);
    }

    return Response.json({ ok: true, settings });
  } catch (error) {
    logError('Update settings error', error);
    return jsonError('Internal server error', 500);
  }
}
