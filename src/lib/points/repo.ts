// points_ledger 접근 계층. 적립금 원장/잔액은 이 파일 밖에서 직접 조회·변경하지 않는다.
import { getSupabase } from '@/lib/supabase/server';
import type { PointsBalance, PointsTransaction, User } from '@/types';

const TRANSACTIONS_CAP = 100;

interface PointsLedgerRow {
  id: string;
  member_id: string;
  order_id: string | null;
  type: PointsTransaction['type'];
  amount: number;
  balance_after: number;
  reason: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function rowToTransaction(row: PointsLedgerRow): PointsTransaction {
  return {
    id: row.id,
    memberId: row.member_id,
    orderId: row.order_id ?? undefined,
    type: row.type,
    amount: row.amount,
    balanceAfter: row.balance_after,
    reason: row.reason,
    createdAt: row.created_at,
    metadata: row.metadata ?? undefined,
  };
}

export function getPointsEligibility(member: Pick<User, 'id' | 'role' | 'status' | 'pointsBalance'> | null): PointsBalance {
  if (!member) {
    return { memberId: '', balance: 0, eligible: false, reason: 'no-session' };
  }
  if (member.role !== 'user') {
    return { memberId: member.id, balance: member.pointsBalance ?? 0, eligible: false, reason: 'ineligible-role' };
  }
  if (member.status !== 'active') {
    return { memberId: member.id, balance: member.pointsBalance ?? 0, eligible: false, reason: 'inactive-status' };
  }
  return { memberId: member.id, balance: member.pointsBalance ?? 0, eligible: true };
}

export async function listPointTransactionsByMember(memberId: string): Promise<PointsTransaction[]> {
  const { data, error } = await getSupabase()
    .from('points_ledger')
    .select('id, member_id, order_id, type, amount, balance_after, reason, metadata, created_at')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(TRANSACTIONS_CAP);
  if (error) throw error;
  return (data as PointsLedgerRow[]).map(rowToTransaction);
}
