'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { formatDate } from '@/lib/format';
import type { User } from '@/types';

const PROVIDER_LABELS: Record<NonNullable<User['provider']>, string> = {
  kakao: '카카오',
  naver: '네이버',
  email: '이메일',
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; showLoginLink: boolean }
  | { status: 'success'; users: User[] };

export default function AdminMembersPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetch('/api/admin/members')
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 401 || response.status === 403) {
          setState({ status: 'error', message: '관리자 로그인이 필요합니다.', showLoginLink: true });
          return;
        }
        if (!response.ok) {
          setState({ status: 'error', message: '목록을 불러오지 못했습니다.', showLoginLink: false });
          return;
        }
        const { users } = (await response.json()) as { users: User[] };
        setState({ status: 'success', users });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', message: '목록을 불러오지 못했습니다.', showLoginLink: false });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return <p className="p-12 text-center text-sm text-[#7B827C]">회원 목록 불러오는 중…</p>;
  }

  if (state.status === 'error') {
    return (
      <div className="p-12 text-center text-sm text-[#7B827C]">
        <p>{state.message}</p>
        {state.showLoginLink && (
          <Link href="/login" className="mt-3 inline-block font-semibold text-[#2F3B34] hover:underline">
            로그인하러 가기
          </Link>
        )}
      </div>
    );
  }

  const rows = state.users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    provider: PROVIDER_LABELS[user.provider ?? 'email'],
    role: user.role === 'admin' ? '관리자' : '일반회원',
    status: user.status === 'inactive' ? '휴면' : '활성',
    joinedAt: formatDate(user.createdAt),
  }));

  return (
    <AdminResourcePage
      title="회원 관리"
      // 회원 등록/수정을 받는 쓰기 API가 아직 없다 — 베타에선 조회 전용임을 명확히
      // 하기 위해 actionLabel/createFields를 넘기지 않아 등록 버튼을 숨긴다.
      description="회원 상태와 가입 경로, 등급을 한 화면에서 확인합니다. (조회 전용)"
      searchPlaceholder="이름, 이메일, 연락처 검색"
      filters={['전체 회원', '활성 회원', '휴면 회원']}
      columns={[
        { key: 'name', label: '회원명' },
        { key: 'email', label: '이메일' },
        { key: 'phone', label: '연락처' },
        { key: 'provider', label: '구분' },
        { key: 'role', label: '등급' },
        { key: 'status', label: '상태' },
        { key: 'joinedAt', label: '가입일' },
      ]}
      rows={rows}
    />
  );
}
