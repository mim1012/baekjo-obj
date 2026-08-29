'use client';

import { useEffect, useState } from 'react';
import { checkEmailAvailable } from '@/lib/storage';

export type EmailCheckStatus = 'idle' | 'checking' | 'available' | 'duplicate';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 가입 폼 공용 이메일 중복 선체크 훅. 입력을 500ms 디바운스로 보고
 * check-email API로 판정한다. 판정은 "어떤 이메일에 대한 결과인지"를 함께
 * 보관해 파생 값으로 계산한다 — 이펙트 본문에서 동기 setState를 하지 않고도
 * 입력이 바뀌면 즉시 checking/idle 로 전환된다. 형식이 맞지 않거나 판정
 * 보류(idle)인 경우엔 메시지를 숨기고, 최종 중복 판정은 가입 API의 409가 담당한다.
 */
export function useEmailAvailability(email: string, delayMs = 500): EmailCheckStatus {
  const [result, setResult] = useState<{ email: string; status: EmailCheckStatus }>({
    email: '',
    status: 'idle',
  });

  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !EMAIL_PATTERN.test(trimmed)) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const available = await checkEmailAvailable(trimmed);
      if (cancelled) return;
      setResult({
        email: trimmed,
        status: available === null ? 'idle' : available ? 'available' : 'duplicate',
      });
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [email, delayMs]);

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) return 'idle';
  // 현재 입력에 대한 판정이 아직 없으면(입력 중·디바운스 대기) 확인 중으로 표시한다.
  if (result.email !== trimmed) return 'checking';
  return result.status;
}

const MESSAGE_CLASS = 'mt-2 text-xs';

/** useEmailAvailability 상태를 이메일 필드 바로 아래 인라인 메시지로 렌더링한다. */
export function EmailCheckMessage({ status }: { status: EmailCheckStatus }) {
  if (status === 'idle') return null;
  if (status === 'checking') {
    return <p className={`${MESSAGE_CLASS} text-[#8B928C]`}>이메일 중복 여부를 확인하고 있어요…</p>;
  }
  if (status === 'available') {
    return <p className={`${MESSAGE_CLASS} text-[#2F7A4F]`}>사용 가능한 이메일입니다.</p>;
  }
  return (
    <p className={`${MESSAGE_CLASS} text-[#A65348]`} role="alert">
      이미 가입된 이메일입니다. 가입하신 계정으로 로그인해 주세요.
    </p>
  );
}
