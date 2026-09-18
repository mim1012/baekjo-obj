import type { CustomerServiceRequestStatus } from '@/types';

const NEXT_STATUSES: Record<CustomerServiceRequestStatus, readonly CustomerServiceRequestStatus[]> = {
  received: ['reviewing'],
  reviewing: ['approved', 'rejected'],
  approved: ['completed'],
  rejected: ['completed'],
  completed: [],
};

export function nextCustomerServiceRequestStatuses(
  status: CustomerServiceRequestStatus,
): readonly CustomerServiceRequestStatus[] {
  return NEXT_STATUSES[status];
}

export function isCustomerServiceRequestTransitionAllowed(
  from: CustomerServiceRequestStatus,
  to: CustomerServiceRequestStatus,
): boolean {
  return from === to || NEXT_STATUSES[from].includes(to);
}
