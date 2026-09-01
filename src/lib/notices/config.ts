import type { Notice } from '@/types';

export interface NoticesConfig {
  items: Notice[];
}

export const emptyNoticesConfig: NoticesConfig = { items: [] };
