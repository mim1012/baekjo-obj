import { expect, test } from '@playwright/test';
import {
  createCmsCompatibilityEnvelope,
  parseCmsCompatibilityEnvelope,
  publishCmsCompatibilityDraft,
  saveCmsCompatibilityDraft,
} from '@/lib/cms/compatibility';

test.describe('CMS 표 미적용 환경의 기존 DB 호환 저장', () => {
  test('기존 홈페이지 값으로 편집본과 게시본을 시작한다', () => {
    const content = { title: '현재 홈페이지 제목' };
    const envelope = createCmsCompatibilityEnvelope(content, '2026-09-01T00:00:00.000Z');

    expect(envelope.draftContent).toEqual(content);
    expect(envelope.publishedContent).toEqual(content);
    expect(envelope.draftRevision).toBe(1);
    expect(envelope.publishedRevision).toBe(1);
    expect(parseCmsCompatibilityEnvelope(envelope)).toEqual(envelope);
  });

  test('임시저장은 공개본을 바꾸지 않고 게시할 때만 고객값을 바꾼다', () => {
    const initial = createCmsCompatibilityEnvelope(
      { title: '기존 제목' },
      '2026-09-01T00:00:00.000Z',
    );
    const draft = saveCmsCompatibilityDraft({
      current: initial,
      expectedRevision: 1,
      content: { title: '수정 제목' },
      actorId: '00000000-0000-0000-0000-000000000001',
      now: '2026-09-01T01:00:00.000Z',
    });

    expect(draft?.draftRevision).toBe(2);
    expect(draft?.draftContent).toEqual({ title: '수정 제목' });
    expect(draft?.publishedContent).toEqual({ title: '기존 제목' });

    const published = publishCmsCompatibilityDraft({
      current: draft!,
      expectedRevision: 2,
      actorId: '00000000-0000-0000-0000-000000000001',
      now: '2026-09-01T02:00:00.000Z',
    });
    expect(published?.publishedRevision).toBe(2);
    expect(published?.publishedContent).toEqual({ title: '수정 제목' });
    expect(published?.versions[0]).toEqual(expect.objectContaining({ revision: 2 }));
  });

  test('오래된 화면에서 저장하거나 게시하면 충돌로 막는다', () => {
    const initial = createCmsCompatibilityEnvelope({}, '2026-09-01T00:00:00.000Z');
    expect(saveCmsCompatibilityDraft({
      current: initial,
      expectedRevision: 9,
      content: {},
      actorId: '00000000-0000-0000-0000-000000000001',
      now: '2026-09-01T01:00:00.000Z',
    })).toBeNull();
    expect(publishCmsCompatibilityDraft({
      current: initial,
      expectedRevision: 9,
      actorId: '00000000-0000-0000-0000-000000000001',
      now: '2026-09-01T01:00:00.000Z',
    })).toBeNull();
  });
});
