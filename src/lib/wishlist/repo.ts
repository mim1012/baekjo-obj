import { getSupabase } from '@/lib/supabase/server';

interface WishlistRow {
  product_id: string;
}

export async function listWishlistProductIds(memberId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('member_wishlist')
    .select('product_id')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as WishlistRow[]).map((row) => row.product_id);
}

export async function toggleWishlistProduct(memberId: string, productId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data: existing, error: findError } = await supabase
    .from('member_wishlist')
    .select('product_id')
    .eq('member_id', memberId)
    .eq('product_id', productId)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { error } = await supabase
      .from('member_wishlist')
      .delete()
      .eq('member_id', memberId)
      .eq('product_id', productId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from('member_wishlist')
    .upsert({ member_id: memberId, product_id: productId });
  if (error) throw error;
  return true;
}

export async function removeWishlistProduct(memberId: string, productId: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from('member_wishlist')
    .delete()
    .eq('member_id', memberId)
    .eq('product_id', productId);
  if (error) throw error;
  return false;
}
