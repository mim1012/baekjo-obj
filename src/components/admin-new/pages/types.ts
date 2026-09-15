import type {
  CmsFieldDefinition,
  CmsItemFieldDefinition,
  CmsLinkItem,
  CmsPageDefinition,
} from '@/lib/cms/pageDefinitions';

export type CmsContent = Record<string, unknown>;

export interface CmsPageState {
  readonly key: string;
  readonly title: string;
  readonly route: string;
  readonly group: CmsPageDefinition['group'];
  readonly description: string;
  readonly draftRevision: number | null;
  readonly publishedRevision: number | null;
  readonly publishedAt: string | null;
  readonly hasUnpublishedChanges: boolean;
  readonly available: boolean;
  /** published_content.__managedVersion === 1 — 최초 활성화("현재 값 가져오기") 이후에만 true. */
  readonly managed: boolean;
}

export interface CmsVersionSummary {
  readonly revision: number;
  readonly publishedAt: string;
}

export interface CmsEditorResponse {
  readonly definition: CmsPageDefinition;
  readonly content: CmsContent;
  readonly draftRevision: number;
  readonly publishedRevision: number | null;
  readonly publishedAt: string | null;
  readonly hasUnpublishedChanges: boolean;
  readonly versions: readonly CmsVersionSummary[];
}

export interface CmsDraftResponse {
  readonly ok?: boolean;
  readonly content?: CmsContent;
  readonly draftRevision?: number;
  readonly message?: string;
}

export interface CmsPublishResponse {
  readonly ok?: boolean;
  readonly publishedRevision?: number;
  readonly publishedAt?: string;
  readonly message?: string;
}

export type { CmsFieldDefinition, CmsItemFieldDefinition, CmsLinkItem, CmsPageDefinition };
