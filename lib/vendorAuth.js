import { headers } from 'next/headers';
import { verifyVendorSessionToken } from '@/lib/jwt';

/**
 * Check if request is from an authenticated vendor admin
 * Supports both JWT (Bearer token) and legacy header-based auth
 * Returns vendor admin ID if authenticated, null otherwise
 */
export async function getVendorAdminId() {
  const headersList = await headers();
  
  // Try JWT token first (new method)
  const authHeader = headersList.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const tokenData = verifyVendorSessionToken(token);
    if (tokenData) {
      return tokenData.vendorAdminId;
    }
  }

  // Fallback to legacy header-based auth for backward compatibility
  const vendorAdminId = headersList.get('x-vendor-admin-id');
  return vendorAdminId;
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

