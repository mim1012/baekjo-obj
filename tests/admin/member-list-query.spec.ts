import { test, expect } from '@playwright/test';
import { parseMemberListQuery } from '@/lib/members/listQuery';

test('member search treats punctuation as literal text and supports later pages', () => {
  const params = new URLSearchParams({ search: '  name%,(test)  ', page: '27', role: 'partner', status: 'pending' });
  expect(parseMemberListQuery(params)).toEqual({ page: 27, pageSize: 20, search: 'name%,(test)', role: 'partner', status: 'pending' });
});
for (const query of ['page=0', 'page=1.5', 'page=Infinity', 'pageSize=101', 'role=owner', 'status=invalid']) {
  test(`invalid member query is rejected: ${query}`, () => {
    expect(() => parseMemberListQuery(new URLSearchParams(query))).toThrow('invalid-member-query');
  });
}
