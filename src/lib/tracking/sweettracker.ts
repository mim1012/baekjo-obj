import 'server-only';

import {
  fetchKeyUsageWithApiKey,
  fetchTrackingInfoWithApiKey,
} from '@/lib/tracking/sweettracker-core';
import type { TrackingResult } from '@/types';

export { levelToDeliveryStatus } from '@/lib/tracking/sweettracker-core';
export type { TrackingLevel, TrackingResult, TrackingStep } from '@/lib/tracking/sweettracker-core';

export function fetchTrackingInfo(carrier: string, invoice: string): Promise<TrackingResult> {
  return fetchTrackingInfoWithApiKey(carrier, invoice, process.env.SWEETTRACKER_API_KEY);
}

export function fetchKeyUsage(): Promise<{ readonly total: number; readonly left: number } | null> {
  return fetchKeyUsageWithApiKey(process.env.SWEETTRACKER_API_KEY);
}
