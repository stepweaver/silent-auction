import { supabaseServer } from '@/lib/supabaseServer';

// GET /api/categories - Fetch all unique categories from items
export async function GET() {
  try {
    const s = supabaseServer();
    
    // Get distinct categories from items table
    const { data, error } = await s
      .from('items')
      .select('category')
      .not('category', 'is', null)
      .not('category', 'eq', '');
    
    if (error) {
      console.error('Error fetching categories:', error);
      return new Response('Failed to fetch categories', { status: 500 });
    }
    
    // Extract unique categories
    const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))];
    
    return Response.json({ categories: uniqueCategories });
  } catch (error) {
    console.error('Categories error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
