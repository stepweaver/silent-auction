import { headers } from 'next/headers';
import { getVendorAdminIdFromSession } from '@/lib/auth/session';

/**
 * Check if request is from an authenticated vendor admin.
 * Reads session from HttpOnly cookie only. No header fallback.
 * @returns {Promise<string | null>} Vendor admin ID if authenticated, null otherwise
 */
export async function getVendorAdminId() {
  const headersList = await headers();
  const cookieHeader = headersList.get('cookie');
  return getVendorAdminIdFromSession(cookieHeader);
}

/**
 * Check if vendor admin owns an item
 */
export async function vendorAdminOwnsItem(vendorAdminId, itemId, supabase) {
  if (!vendorAdminId || !itemId) return false;

  const { data, error } = await supabase
    .from('items')
    .select('created_by')
    .eq('id', itemId)
    .maybeSingle();

  if (error || !data) return false;
  return String(data.created_by) === String(vendorAdminId);
}
