import { supabaseServer } from '@/lib/serverSupabase';
import { jsonError } from '@/lib/apiResponses';
import { logError } from '@/lib/logger';

export async function GET() {
  try {
    const s = supabaseServer();

    const { data, error } = await s
      .from('items')
      .select('category')
      .not('category', 'is', null)
      .not('category', 'eq', '');

    if (error) {
      logError('Error fetching categories', error);
      return jsonError('Failed to fetch categories', 500);
    }

    const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))];
    return Response.json({ categories: uniqueCategories });
  } catch (error) {
    logError('Categories error', error);
    return jsonError('Internal server error', 500);
  }
}
