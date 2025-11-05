import { headers } from 'next/headers';

/**
 * Check if request is from an authenticated vendor admin
 * Returns vendor admin ID if authenticated, null otherwise
 */
export async function getVendorAdminId() {
  const headersList = await headers();
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

